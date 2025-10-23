# Backend Setup Guide - 247 Trades Platform

This document provides complete instructions for setting up the Node.js + PostgreSQL backend for the 247 Trades mobile application.

## Prerequisites

- Node.js v16+ installed
- PostgreSQL 13+ installed and running locally
- npm or yarn package manager
- Stripe account (test mode for development)
- Basic understanding of Express.js and PostgreSQL

## Environment Setup

### 1. Create Backend Directory Structure

```bash
mkdir 247-trades-backend
cd 247-trades-backend
npm init -y
```

### 2. Install Required Dependencies

```bash
# Core dependencies
npm install express cors dotenv helmet morgan
npm install pg pg-hstore sequelize
npm install socket.io
npm install bcryptjs jsonwebtoken
npm install stripe
npm install multer aws-sdk
npm install express-validator
npm install date-fns
npm install nodemailer
npm install winston

# Development dependencies
npm install --save-dev nodemon jest supertest
npm install --save-dev sequelize-cli
npm install --save-dev @types/node @types/express
```

### 3. Environment Variables

Create `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=247_trades
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_DIALECT=postgres

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRY=30d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PLATFORM_FEE_PERCENT=15

# AWS S3 Configuration (for image uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-2
AWS_S3_BUCKET=247-trades-uploads

# Email Configuration (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=247 Trades <noreply@247trades.com>

# Socket.io Configuration
SOCKET_CORS_ORIGIN=*
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# File Upload Configuration
MAX_FILE_SIZE=10485760
MAX_FILES_PER_JOB=5
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/jpg

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
```

### 4. Project Structure

Create the following directory structure:

```
247-trades-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── stripe.js
│   │   ├── aws.js
│   │   └── email.js
│   ├── models/
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── Review.js
│   │   ├── Payment.js
│   │   └── Location.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── jobs.js
│   │   ├── messages.js
│   │   ├── notifications.js
│   │   ├── reviews.js
│   │   ├── payments.js
│   │   └── users.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── jobController.js
│   │   ├── messageController.js
│   │   ├── notificationController.js
│   │   ├── reviewController.js
│   │   ├── paymentController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── validation.js
│   │   ├── upload.js
│   │   └── rateLimit.js
│   ├── services/
│   │   ├── stripeService.js
│   │   ├── notificationService.js
│   │   ├── emailService.js
│   │   ├── uploadService.js
│   │   └── locationService.js
│   ├── sockets/
│   │   ├── index.js
│   │   ├── messageHandlers.js
│   │   ├── notificationHandlers.js
│   │   └── jobHandlers.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   └── app.js
├── migrations/
├── seeders/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── logs/
├── uploads/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

### 5. Database Configuration

Create `src/config/database.js`:

```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
```

### 6. Main Application File

Create `src/app.js`:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimit');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
```

### 7. Server Entry Point

Create `server.js`:

```javascript
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { sequelize, testConnection } = require('./src/config/database');
const { initializeSocket } = require('./src/sockets');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Attach io to app for use in routes
app.set('io', io);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database (use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 Socket.io ready for connections`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();
```

### 8. Logger Configuration

Create `src/utils/logger.js`:

```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

module.exports = logger;
```

### 9. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE 247_trades;

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE 247_trades TO postgres;

# Exit
\q
```

### 10. Run the Application

Add scripts to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo",
    "db:seed": "sequelize-cli db:seed:all",
    "lint": "eslint ."
  }
}
```

Start development server:

```bash
npm run dev
```

The server should start on http://localhost:3000

## Next Steps

1. Review `DATABASE_SCHEMA.md` for complete database models
2. Review `API_ENDPOINTS.md` for all API route implementations
3. Review `SOCKET_SERVER.md` for Socket.io setup
4. Review `STRIPE_INTEGRATION.md` for payment processing
5. Review `TESTING_GUIDE.md` for testing setup

## Troubleshooting

### Database Connection Fails
- Verify PostgreSQL is running: `sudo service postgresql status`
- Check credentials in `.env` file
- Ensure database exists: `psql -U postgres -l`

### Port Already in Use
- Change PORT in `.env` file
- Kill process using port 3000: `lsof -ti:3000 | xargs kill`

### Module Not Found Errors
- Delete node_modules: `rm -rf node_modules`
- Delete package-lock.json: `rm package-lock.json`
- Reinstall: `npm install`

### Socket.io Connection Issues
- Verify CORS settings in `.env`
- Check firewall settings
- Ensure WebSocket transport is enabled
