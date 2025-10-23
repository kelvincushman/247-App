const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { connectDB } = require('./config/database');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const swaggerSpec = require('./config/swagger');
const { initializeSocket } = require('./config/socket');
const { initializeFirebase } = require('./config/firebase');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerProfileRoutes = require('./routes/customerProfileRoutes');
const tradespersonProfileRoutes = require('./routes/tradespersonProfileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoutes = require('./routes/jobRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const locationRoutes = require('./routes/locationRoutes');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

// Initialize Firebase
initializeFirebase();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later'
});

app.use('/api', limiter);

// Webhook routes (must be before body parser for raw body)
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/webhooks`, express.raw({ type: 'application/json' }), webhookRoutes);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '247 Trades API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
// Swagger documentation
app.use(`/api/${API_VERSION}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '247 Trades API Documentation'
}));

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/profiles/customer`, customerProfileRoutes);
app.use(`/api/${API_VERSION}/profiles/tradesperson`, tradespersonProfileRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/jobs`, jobRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/messages`, messageRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/reviews`, reviewRoutes);
app.use(`/api/${API_VERSION}/availability`, availabilityRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);
app.use(`/api/${API_VERSION}/locations`, locationRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to 247 Trades Services Platform API',
    version: API_VERSION,
    documentation: `/api/${API_VERSION}/docs`
  });
});

// Error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}/api/${API_VERSION}`);
  logger.info(`🔌 Socket.io listening for real-time connections`);
  logger.info(`📱 Push notifications enabled via Firebase Cloud Messaging`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
