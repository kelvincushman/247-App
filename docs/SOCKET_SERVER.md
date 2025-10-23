# Socket.io Server Documentation - 247 Trades Platform

Complete implementation guide for Socket.io real-time features including messaging, notifications, and job updates.

## Overview

The Socket.io server handles all real-time communication between clients:
- **Real-time messaging** between customers and tradespeople
- **Typing indicators** for chat conversations
- **Read receipts** for messages
- **Push notifications** for job updates, payments, and reviews
- **Job status updates** broadcast to relevant users

## Installation

```bash
npm install socket.io
npm install socket.io-redis  # For multi-server scaling
```

## Socket.io Server Setup

### Main Socket Initialization

File: `src/sockets/index.js`

```javascript
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const messageHandlers = require('./messageHandlers');
const notificationHandlers = require('./notificationHandlers');
const jobHandlers = require('./jobHandlers');
const logger = require('../utils/logger');

/**
 * Initialize Socket.io server
 * @param {http.Server} server - HTTP server instance
 * @returns {socketIO.Server} Socket.io instance
 */
function initializeSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      socket.user = user;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userId})`);

    // Join user-specific room for notifications
    socket.join(`user:${socket.userId}`);

    // Register event handlers
    messageHandlers(io, socket);
    notificationHandlers(io, socket);
    jobHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });
  });

  return io;
}

module.exports = { initializeSocket };
```

## Message Handlers

File: `src/sockets/messageHandlers.js`

```javascript
const { Message, Conversation, User } = require('../models');
const logger = require('../utils/logger');

/**
 * Message event handlers
 */
module.exports = (io, socket) => {

  /**
   * Join a conversation room
   */
  socket.on('conversation:join', async ({ conversationId }) => {
    try {
      // Verify user is part of conversation
      const conversation = await Conversation.findByPk(conversationId);

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      if (
        conversation.customerId !== socket.userId &&
        conversation.tradespersonId !== socket.userId
      ) {
        return socket.emit('error', { message: 'Not authorized to join this conversation' });
      }

      socket.join(`conversation:${conversationId}`);

      logger.info(`User ${socket.userId} joined conversation ${conversationId}`);

      socket.emit('conversation:joined', {
        conversationId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  /**
   * Leave a conversation room
   */
  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);

    logger.info(`User ${socket.userId} left conversation ${conversationId}`);
  });

  /**
   * Send a message
   */
  socket.on('message:send', async (data, acknowledgment) => {
    try {
      const { conversationId, text, type = 'text' } = data;

      // Verify user is part of conversation
      const conversation = await Conversation.findByPk(conversationId);

      if (!conversation) {
        return acknowledgment({ error: 'Conversation not found' });
      }

      if (
        conversation.customerId !== socket.userId &&
        conversation.tradespersonId !== socket.userId
      ) {
        return acknowledgment({ error: 'Not authorized' });
      }

      const receiverId =
        socket.userId === conversation.customerId
          ? conversation.tradespersonId
          : conversation.customerId;

      // Create message
      const message = await Message.create({
        conversationId,
        senderId: socket.userId,
        receiverId,
        type,
        text,
        isRead: false,
      });

      // Update conversation
      await conversation.update({
        lastMessageAt: new Date(),
        lastMessageText: text,
        ...(socket.userId === conversation.customerId
          ? { unreadCountTradesperson: conversation.unreadCountTradesperson + 1 }
          : { unreadCountCustomer: conversation.unreadCountCustomer + 1 }),
      });

      // Get full message with sender info
      const fullMessage = await Message.findByPk(message.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'profileImage'] },
        ],
      });

      // Broadcast to conversation room
      io.to(`conversation:${conversationId}`).emit('message:new', fullMessage);

      // Send acknowledgment to sender
      acknowledgment({ message: fullMessage });

      logger.info(`Message sent in conversation ${conversationId} by user ${socket.userId}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      acknowledgment({ error: 'Failed to send message' });
    }
  });

  /**
   * Typing indicator
   */
  socket.on('typing:update', async ({ conversationId, isTyping }) => {
    try {
      // Verify user is part of conversation
      const conversation = await Conversation.findByPk(conversationId);

      if (!conversation) {
        return;
      }

      if (
        conversation.customerId !== socket.userId &&
        conversation.tradespersonId !== socket.userId
      ) {
        return;
      }

      // Broadcast typing status to others in the conversation
      socket.to(`conversation:${conversationId}`).emit('typing:status', {
        conversationId,
        userId: socket.userId,
        isTyping,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`User ${socket.userId} typing status: ${isTyping} in conversation ${conversationId}`);
    } catch (error) {
      logger.error('Error updating typing status:', error);
    }
  });

  /**
   * Mark message as read
   */
  socket.on('message:mark-read', async ({ conversationId, messageId }) => {
    try {
      const message = await Message.findByPk(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (message.receiverId !== socket.userId) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      if (!message.isRead) {
        await message.update({
          isRead: true,
          readAt: new Date(),
        });

        // Update conversation unread count
        const conversation = await Conversation.findByPk(conversationId);
        if (conversation) {
          const isCustomer = socket.userId === conversation.customerId;
          await conversation.update({
            ...(isCustomer
              ? {
                  unreadCountCustomer: Math.max(0, conversation.unreadCountCustomer - 1),
                }
              : {
                  unreadCountTradesperson: Math.max(0, conversation.unreadCountTradesperson - 1),
                }),
          });
        }

        // Notify sender that message was read
        io.to(`conversation:${conversationId}`).emit('message:read', {
          messageId,
          conversationId,
          readBy: socket.userId,
          readAt: message.readAt,
        });

        logger.debug(`Message ${messageId} marked as read by user ${socket.userId}`);
      }
    } catch (error) {
      logger.error('Error marking message as read:', error);
    }
  });

  /**
   * Get online status
   */
  socket.on('user:check-online', async ({ userId }) => {
    try {
      const userSockets = await io.in(`user:${userId}`).fetchSockets();
      const isOnline = userSockets.length > 0;

      socket.emit('user:online-status', {
        userId,
        isOnline,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error checking online status:', error);
    }
  });
};
```

## Notification Handlers

File: `src/sockets/notificationHandlers.js`

```javascript
const { Notification } = require('../models');
const logger = require('../utils/logger');

/**
 * Notification event handlers
 */
module.exports = (io, socket) => {

  /**
   * Send notification to user
   * This is typically called from API routes, not from client
   */
  socket.on('notification:send', async (data) => {
    try {
      const { userId, type, title, body, data: notificationData } = data;

      // Only allow admins to send arbitrary notifications
      if (socket.userRole !== 'admin') {
        return socket.emit('error', { message: 'Not authorized' });
      }

      const notification = await Notification.create({
        userId,
        type,
        title,
        body,
        data: notificationData,
      });

      // Broadcast to user
      io.to(`user:${userId}`).emit('notification:new', notification);

      logger.info(`Notification sent to user ${userId}: ${type}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  });

  /**
   * Mark notification as read
   */
  socket.on('notification:mark-read', async ({ notificationId }) => {
    try {
      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        return socket.emit('error', { message: 'Notification not found' });
      }

      if (notification.userId !== socket.userId) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      if (!notification.isRead) {
        await notification.update({
          isRead: true,
          readAt: new Date(),
        });

        socket.emit('notification:read', {
          notificationId,
          readAt: notification.readAt,
        });

        logger.debug(`Notification ${notificationId} marked as read by user ${socket.userId}`);
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  });
};
```

## Job Handlers

File: `src/sockets/jobHandlers.js`

```javascript
const { Job } = require('../models');
const logger = require('../utils/logger');

/**
 * Job event handlers
 */
module.exports = (io, socket) => {

  /**
   * Join job room (for real-time job updates)
   */
  socket.on('job:join', async ({ jobId }) => {
    try {
      const job = await Job.findByPk(jobId);

      if (!job) {
        return socket.emit('error', { message: 'Job not found' });
      }

      // Only customer and assigned tradesperson can join
      if (
        job.customerId !== socket.userId &&
        job.tradespersonId !== socket.userId
      ) {
        return socket.emit('error', { message: 'Not authorized to join this job' });
      }

      socket.join(`job:${jobId}`);

      logger.info(`User ${socket.userId} joined job room ${jobId}`);

      socket.emit('job:joined', {
        jobId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error joining job room:', error);
    }
  });

  /**
   * Leave job room
   */
  socket.on('job:leave', ({ jobId }) => {
    socket.leave(`job:${jobId}`);

    logger.info(`User ${socket.userId} left job room ${jobId}`);
  });

  /**
   * Subscribe to job status updates
   * Jobs are broadcast from API routes when status changes
   */
  // This is handled by API controllers, not directly by socket events
};
```

## Broadcasting from API Routes

When job status changes or important events occur, broadcast from API controllers:

### Example: Broadcasting Job Updates

```javascript
// In src/controllers/jobController.js

exports.acceptJob = async (req, res, next) => {
  try {
    // ... job acceptance logic ...

    await job.update({
      tradespersonId,
      status: 'accepted',
    });

    // Get Socket.io instance
    const io = req.app.get('io');

    // Broadcast to job room
    io.to(`job:${job.id}`).emit('job:updated', {
      jobId: job.id,
      status: 'accepted',
      tradespersonId,
      timestamp: new Date().toISOString(),
    });

    // Send notification to customer
    const notification = await Notification.create({
      userId: job.customerId,
      type: 'job_accepted',
      title: 'Job Accepted',
      body: `A tradesperson has accepted your job: ${job.title}`,
      data: { jobId: job.id },
    });

    io.to(`user:${job.customerId}`).emit('notification:new', notification);

    res.json({ success: true, data: { job } });
  } catch (error) {
    next(error);
  }
};
```

### Example: Broadcasting Payment Released

```javascript
// In src/controllers/jobController.js

exports.confirmCompletion = async (req, res, next) => {
  try {
    // ... payment release logic ...

    await stripeService.releasePayment(payment.id);

    // Get Socket.io instance
    const io = req.app.get('io');

    // Notify tradesperson
    const notification = await Notification.create({
      userId: job.tradespersonId,
      type: 'payment_released',
      title: 'Payment Released',
      body: `Payment of £${job.finalPrice} has been released for job: ${job.title}`,
      data: { jobId: job.id, paymentId: payment.id },
    });

    io.to(`user:${job.tradespersonId}`).emit('notification:new', notification);

    // Broadcast job update
    io.to(`job:${job.id}`).emit('job:updated', {
      jobId: job.id,
      status: job.status,
      paymentStatus: 'released',
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, data: { job, payment } });
  } catch (error) {
    next(error);
  }
};
```

## Event Reference

### Client → Server Events

| Event | Data | Description |
|-------|------|-------------|
| `conversation:join` | `{ conversationId }` | Join a conversation room |
| `conversation:leave` | `{ conversationId }` | Leave a conversation room |
| `message:send` | `{ conversationId, text, type }` | Send a message |
| `typing:update` | `{ conversationId, isTyping }` | Update typing status |
| `message:mark-read` | `{ conversationId, messageId }` | Mark message as read |
| `notification:mark-read` | `{ notificationId }` | Mark notification as read |
| `job:join` | `{ jobId }` | Join a job room |
| `job:leave` | `{ jobId }` | Leave a job room |
| `user:check-online` | `{ userId }` | Check if user is online |

### Server → Client Events

| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{ socketId, userId, timestamp }` | Connection established |
| `message:new` | `Message` object | New message received |
| `message:read` | `{ messageId, readBy, readAt }` | Message was read |
| `typing:status` | `{ conversationId, userId, isTyping }` | Typing indicator |
| `notification:new` | `Notification` object | New notification |
| `job:updated` | `{ jobId, status, ... }` | Job status changed |
| `job:assigned` | `Job` object | Job assigned to tradesperson |
| `job:completed` | `Job` object | Job marked complete |
| `user:online-status` | `{ userId, isOnline }` | User online status |
| `error` | `{ message }` | Error occurred |

## Testing Socket.io

### Testing with Socket.io Client

```javascript
// test-socket.js
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token_here',
  },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);

  // Join conversation
  socket.emit('conversation:join', { conversationId: 'uuid-here' });

  // Send message
  socket.emit('message:send', {
    conversationId: 'uuid-here',
    text: 'Hello from test client',
  }, (response) => {
    console.log('Message sent:', response);
  });
});

socket.on('message:new', (message) => {
  console.log('New message:', message);
});

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

Run test:
```bash
node test-socket.js
```

## Scaling with Redis Adapter

For multi-server deployments, use Redis adapter:

```javascript
// src/sockets/index.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

function initializeSocket(server) {
  const io = socketIO(server, { /* ... */ });

  // Redis adapter for horizontal scaling
  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter connected');
    });
  }

  // ... rest of setup
}
```

## Security Best Practices

1. **Always authenticate** sockets with JWT tokens
2. **Verify room membership** before allowing joins
3. **Validate all input** from socket events
4. **Rate limit** socket events per user
5. **Log all critical events** for audit trails
6. **Use HTTPS/WSS** in production
7. **Implement timeout** for long-running operations

## Monitoring

### Socket.io Admin UI

```bash
npm install @socket.io/admin-ui
```

```javascript
const { instrument } = require('@socket.io/admin-ui');

if (process.env.NODE_ENV === 'development') {
  instrument(io, {
    auth: false,  // Set to true with credentials in production
  });
}
```

Access at: `http://localhost:3000/admin`

### Custom Metrics

```javascript
// Track active connections
io.engine.on('connection_error', (err) => {
  logger.error('Connection error:', err);
});

setInterval(() => {
  const socketCount = io.engine.clientsCount;
  logger.info(`Active sockets: ${socketCount}`);
}, 60000);
```

## Troubleshooting

### Connection Refused
- Check CORS settings
- Verify JWT token is valid
- Ensure server is running

### Messages Not Received
- Verify user joined conversation room
- Check socket connection status
- Confirm event names match exactly

### High Latency
- Enable compression
- Use WebSocket transport only
- Implement Redis adapter for scaling

## Next Steps

1. Implement push notifications with FCM
2. Add presence system for online/offline status
3. Implement message delivery receipts
4. Add file upload via Socket.io
5. Set up monitoring and alerting
