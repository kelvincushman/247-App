# API Endpoints Documentation - 247 Trades Platform

Complete REST API documentation for the backend server.

## Base URL

Development: `http://localhost:3000/api`

## Authentication

All protected routes require JWT authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

---

## Authentication Routes

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+447700900000",
  "role": "customer"  // or "tradesperson"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

**Implementation:**
```javascript
// src/controllers/authController.js
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'customer',
    });

    // Generate tokens
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### POST /api/auth/login

User login.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Implementation:**
```javascript
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY }
    );

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### POST /api/auth/refresh

Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

---

## Job Routes

### POST /api/jobs

Create a new job (Customer only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Fix leaking kitchen sink"
description: "The kitchen sink has been leaking..."
category: "plumber"
estimatedPrice: 150.00
address: "123 Main Street, London"
city: "London"
postcode: "SW1A 1AA"
latitude: 51.5074
longitude: -0.1278
urgency: "medium"
scheduledDate: "2025-11-01T10:00:00Z"
images[]: <File>  // Up to 5 images
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "title": "Fix leaking kitchen sink",
      "description": "The kitchen sink has been leaking...",
      "category": "plumber",
      "status": "requested",
      "estimatedPrice": 150.00,
      "location": {
        "type": "Point",
        "coordinates": [-0.1278, 51.5074]
      },
      "address": "123 Main Street, London",
      "urgency": "medium",
      "images": [
        {
          "id": "uuid",
          "imageUrl": "https://...",
          "thumbnailUrl": "https://..."
        }
      ],
      "createdAt": "2025-10-23T12:00:00Z"
    }
  }
}
```

**Implementation:**
```javascript
// src/controllers/jobController.js
const { Job, JobImage, User } = require('../models');
const { uploadToS3 } = require('../services/uploadService');

exports.createJob = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      estimatedPrice,
      address,
      city,
      postcode,
      latitude,
      longitude,
      urgency,
      scheduledDate,
    } = req.body;

    const customerId = req.user.id;

    // Create job
    const job = await Job.create({
      customerId,
      title,
      description,
      category,
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : null,
      address,
      city,
      postcode,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      urgency: urgency || 'medium',
      scheduledDate: scheduledDate || null,
      status: 'requested',
    });

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        const imageUrl = await uploadToS3(file, 'jobs');
        const thumbnailUrl = await uploadToS3(file, 'jobs/thumbnails', true);

        return JobImage.create({
          jobId: job.id,
          imageUrl,
          thumbnailUrl,
          uploadedBy: customerId,
          orderIndex: index,
        });
      });

      await Promise.all(imagePromises);
    }

    // Fetch complete job with images
    const completeJob = await Job.findByPk(job.id, {
      include: [
        { model: JobImage, as: 'images' },
        { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });

    res.status(201).json({
      success: true,
      data: { job: completeJob },
    });
  } catch (error) {
    next(error);
  }
};
```

### GET /api/jobs

Get all jobs (with filters).

**Query Parameters:**
- `status` - Filter by status (requested, assigned, in_progress, completed, cancelled)
- `category` - Filter by category
- `customerId` - Filter by customer
- `tradespersonId` - Filter by tradesperson
- `latitude` - For location-based search
- `longitude` - For location-based search
- `radius` - Search radius in kilometers (default: 50)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

**Implementation:**
```javascript
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

exports.getJobs = async (req, res, next) => {
  try {
    const {
      status,
      category,
      customerId,
      tradespersonId,
      latitude,
      longitude,
      radius = 50,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (status) {
      where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    }
    if (category) where.category = category;
    if (customerId) where.customerId = customerId;
    if (tradespersonId) where.tradespersonId = tradespersonId;

    // Location-based filtering
    if (latitude && longitude) {
      where.location = sequelize.where(
        sequelize.fn(
          'ST_DWithin',
          sequelize.col('location'),
          sequelize.fn('ST_MakePoint', parseFloat(longitude), parseFloat(latitude)),
          radius * 1000  // Convert km to meters
        ),
        true
      );
    }

    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'tradesperson', attributes: ['id', 'firstName', 'lastName'] },
        { model: JobImage, as: 'images' },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### GET /api/jobs/:jobId

Get job details by ID.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "title": "Fix leaking kitchen sink",
      "description": "...",
      "status": "in_progress",
      "customer": { ... },
      "tradesperson": { ... },
      "images": [...],
      "payment": {
        "status": "held",
        "amount": 150.00
      },
      "review": null
    }
  }
}
```

### PUT /api/jobs/:jobId/accept

Accept a job and submit quote (Tradesperson only).

**Request Body:**
```json
{
  "estimatedPrice": 175.00,
  "estimatedDuration": "2 hours",
  "notes": "I can start tomorrow morning"
}
```

**Response:** `200 OK`

**Implementation:**
```javascript
exports.acceptJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { estimatedPrice, estimatedDuration, notes } = req.body;
    const tradespersonId = req.user.id;

    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'requested') {
      return res.status(400).json({ error: 'Job is not available' });
    }

    await job.update({
      tradespersonId,
      status: 'accepted',
      estimatedPrice: estimatedPrice ? parseFloat(estimatedPrice) : job.estimatedPrice,
    });

    // Create notification for customer
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: job.customerId,
      type: 'job_accepted',
      title: 'Job Accepted',
      body: `A tradesperson has accepted your job: ${job.title}`,
      data: { jobId: job.id },
    });

    io.to(`user:${job.customerId}`).emit('notification:new', notification);

    res.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    next(error);
  }
};
```

### PUT /api/jobs/:jobId/start

Start working on a job (Tradesperson only).

**Request Body:**
```json
{
  "startedAt": "2025-10-23T09:00:00Z"
}
```

**Response:** `200 OK`

### PUT /api/jobs/:jobId/complete

Mark job as complete (Tradesperson only).

**Request Body:**
```json
{
  "finalPrice": 150.00,
  "completionNotes": "Fixed the leak, replaced washer",
  "completedAt": "2025-10-23T11:30:00Z"
}
```

**Response:** `200 OK`

**Implementation:**
```javascript
exports.markJobComplete = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { finalPrice, completionNotes, completedAt } = req.body;

    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.tradespersonId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({ error: 'Job is not in progress' });
    }

    await job.update({
      status: 'completed',
      finalPrice: finalPrice ? parseFloat(finalPrice) : job.estimatedPrice,
      completionNotes,
      completedAt: completedAt || new Date(),
    });

    // Notify customer to confirm completion
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: job.customerId,
      type: 'job_completed',
      title: 'Job Completed',
      body: `The tradesperson has marked your job as complete. Please confirm to release payment.`,
      data: { jobId: job.id },
    });

    io.to(`user:${job.customerId}`).emit('notification:new', notification);

    res.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    next(error);
  }
};
```

### POST /api/jobs/:jobId/confirm-completion

Confirm job completion and release payment (Customer only) - **CRITICAL**

**Request Body:**
```json
{
  "satisfied": true,
  "confirmationNotes": "Great work, very happy with the result"
}
```

**Response:** `200 OK`

**Implementation:**
```javascript
const stripeService = require('../services/stripeService');

exports.confirmCompletion = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { satisfied, confirmationNotes } = req.body;
    const customerId = req.user.id;

    const job = await Job.findByPk(jobId, {
      include: [{ model: Payment, as: 'payment' }],
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.customerId !== customerId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Job is not marked as complete' });
    }

    if (!satisfied) {
      // Handle dispute
      await job.update({ status: 'disputed' });
      return res.json({
        success: true,
        data: { job, disputed: true },
      });
    }

    // Release payment via Stripe
    const payment = job.payment;
    if (payment && payment.status === 'held') {
      await stripeService.releasePayment(payment.id);

      await payment.update({
        status: 'released',
        releasedAt: new Date(),
      });
    }

    // Notify tradesperson
    const io = req.app.get('io');
    const notification = await Notification.create({
      userId: job.tradespersonId,
      type: 'payment_released',
      title: 'Payment Released',
      body: `Payment of £${job.finalPrice} has been released for job: ${job.title}`,
      data: { jobId: job.id, paymentId: payment.id },
    });

    io.to(`user:${job.tradespersonId}`).emit('notification:new', notification);

    // Update tradesperson stats
    const profile = await TradespersonProfile.findOne({
      where: { userId: job.tradespersonId },
    });

    if (profile) {
      await profile.update({
        totalJobsCompleted: profile.totalJobsCompleted + 1,
      });
    }

    res.json({
      success: true,
      data: {
        job,
        payment,
        message: 'Payment released successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### POST /api/jobs/:jobId/location

Update job location (Tradesperson only) - GPS tracking.

**Request Body:**
```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "accuracy": 10.5,
  "timestamp": "2025-10-23T10:15:00Z"
}
```

**Response:** `200 OK`

---

## Message Routes

### GET /api/messages/conversations

Get all conversations for current user.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "job": {
          "id": "uuid",
          "title": "Fix leaking sink"
        },
        "otherUser": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "lastMessageAt": "2025-10-23T12:00:00Z",
        "lastMessageText": "I'll be there at 10am",
        "unreadCount": 2
      }
    ]
  }
}
```

**Implementation:**
```javascript
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const conversations = await Conversation.findAll({
      where: userRole === 'customer'
        ? { customerId: userId }
        : { tradespersonId: userId },
      include: [
        { model: Job, as: 'job', attributes: ['id', 'title', 'status'] },
        {
          model: User,
          as: userRole === 'customer' ? 'tradesperson' : 'customer',
          attributes: ['id', 'firstName', 'lastName', 'profileImage'],
        },
      ],
      order: [['lastMessageAt', 'DESC']],
    });

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      jobId: conv.jobId,
      job: conv.job,
      otherUser: userRole === 'customer' ? conv.tradesperson : conv.customer,
      lastMessageAt: conv.lastMessageAt,
      lastMessageText: conv.lastMessageText,
      unreadCount:
        userRole === 'customer'
          ? conv.unreadCountCustomer
          : conv.unreadCountTradesperson,
    }));

    res.json({
      success: true,
      data: { conversations: formattedConversations },
    });
  } catch (error) {
    next(error);
  }
};
```

### GET /api/messages/job/:jobId

Get messages for a specific job.

**Query Parameters:**
- `page` - Page number
- `limit` - Messages per page (default: 50)
- `before` - Get messages before this message ID (for pagination)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversationId": "uuid",
        "sender": {
          "id": "uuid",
          "firstName": "John",
          "lastName": "Doe"
        },
        "type": "text",
        "text": "I'll be there at 10am",
        "isRead": true,
        "createdAt": "2025-10-23T12:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### POST /api/messages

Send a message.

**Request Body (Text):**
```json
{
  "jobId": "uuid",
  "type": "text",
  "content": "I'll be there at 10am"
}
```

**Request Body (Image):**
```
Content-Type: multipart/form-data

jobId: uuid
type: image
image: <File>
caption: "Before photo"
```

**Response:** `201 Created`

**Implementation:**
```javascript
exports.sendMessage = async (req, res, next) => {
  try {
    const { jobId, type, content } = req.body;
    const senderId = req.user.id;

    // Find or create conversation
    let conversation = await Conversation.findOne({ where: { jobId } });

    if (!conversation) {
      const job = await Job.findByPk(jobId);
      conversation = await Conversation.create({
        jobId,
        customerId: job.customerId,
        tradespersonId: job.tradespersonId,
      });
    }

    const receiverId =
      senderId === conversation.customerId
        ? conversation.tradespersonId
        : conversation.customerId;

    let messageData = {
      conversationId: conversation.id,
      senderId,
      receiverId,
      type: type || 'text',
    };

    if (type === 'image' && req.file) {
      const imageUrl = await uploadToS3(req.file, 'messages');
      messageData.imageUrl = imageUrl;
      if (content) messageData.text = content;  // Caption
    } else {
      messageData.text = content;
    }

    const message = await Message.create(messageData);

    // Update conversation
    await conversation.update({
      lastMessageAt: new Date(),
      lastMessageText: messageData.text || '[Image]',
      ...(senderId === conversation.customerId
        ? { unreadCountTradesperson: conversation.unreadCountTradesperson + 1 }
        : { unreadCountCustomer: conversation.unreadCountCustomer + 1 }),
    });

    // Emit via Socket.io
    const io = req.app.get('io');
    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] }],
    });

    io.to(`conversation:${conversation.id}`).emit('message:new', fullMessage);

    res.status(201).json({
      success: true,
      data: { message: fullMessage },
    });
  } catch (error) {
    next(error);
  }
};
```

### POST /api/messages/read

Mark messages as read.

**Request Body:**
```json
{
  "jobId": "uuid",
  "messageIds": ["uuid1", "uuid2"]
}
```

**Response:** `200 OK`

---

## Notification Routes

### GET /api/notifications

Get all notifications for current user.

**Query Parameters:**
- `read` - Filter by read status (true/false)
- `type` - Filter by notification type
- `page` - Page number
- `limit` - Items per page

**Response:** `200 OK`

### PUT /api/notifications/:notificationId/read

Mark notification as read.

**Response:** `200 OK`

### PUT /api/notifications/mark-all-read

Mark all notifications as read.

**Response:** `200 OK`

### DELETE /api/notifications/clear

Clear all notifications.

**Response:** `200 OK`

---

## Review Routes

### POST /api/reviews

Submit a review.

**Request Body:**
```json
{
  "jobId": "uuid",
  "rating": 5,
  "comment": "Excellent service, very professional",
  "tags": ["professional", "on-time", "quality-work"]
}
```

**Response:** `201 Created`

### GET /api/reviews/tradesperson/:tradespersonId

Get all reviews for a tradesperson.

**Response:** `200 OK`

---

## Payment Routes

### POST /api/payments/create-intent

Create payment intent (Customer only).

**Request Body:**
```json
{
  "jobId": "uuid",
  "amount": 150.00,
  "paymentMethodId": "pm_xxxx"
}
```

**Response:** `201 Created`

### POST /api/payments/:paymentId/release

Release payment to tradesperson (System/Admin).

**Response:** `200 OK`

### GET /api/payments/tradesperson/earnings

Get tradesperson earnings summary.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "available": 450.00,
    "pending": 150.00,
    "total": 3200.00
  }
}
```

---

## User Routes

### GET /api/users/me

Get current user profile.

**Response:** `200 OK`

### PUT /api/users/me

Update current user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe Updated",
  "phone": "+447700900000"
}
```

**Response:** `200 OK`

### POST /api/users/payment-methods

Add payment method.

**Request Body:**
```json
{
  "stripePaymentMethodId": "pm_xxxx",
  "isDefault": true
}
```

**Response:** `201 Created`

### DELETE /api/users/payment-methods/:methodId

Remove payment method.

**Response:** `200 OK`

---

## Middleware

### Authentication Middleware

File: `src/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### File Upload Middleware

File: `src/middleware/upload.js`

```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,  // 10MB
  },
  fileFilter,
});

module.exports = upload;
```

### Error Handler Middleware

File: `src/middleware/errorHandler.js`

```javascript
const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'Duplicate entry',
      details: err.errors.map((e) => ({
        field: e.path,
        message: `${e.path} already exists`,
      })),
    });
  }

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
  });
};
```

---

## Route Files

### Auth Routes

File: `src/routes/auth.js`

```javascript
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').notEmpty().trim(),
    body('lastName').notEmpty().trim(),
    body('role').isIn(['customer', 'tradesperson']),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  authController.login
);

router.post('/refresh', authController.refreshToken);

module.exports = router;
```

### Job Routes

File: `src/routes/jobs.js`

```javascript
const express = require('express');
const jobController = require('../controllers/jobController');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post(
  '/',
  authenticate,
  requireRole('customer'),
  upload.array('images', 5),
  jobController.createJob
);

router.get('/', authenticate, jobController.getJobs);

router.get('/:jobId', authenticate, jobController.getJobById);

router.put(
  '/:jobId/accept',
  authenticate,
  requireRole('tradesperson'),
  jobController.acceptJob
);

router.put(
  '/:jobId/start',
  authenticate,
  requireRole('tradesperson'),
  jobController.startJob
);

router.put(
  '/:jobId/complete',
  authenticate,
  requireRole('tradesperson'),
  jobController.markJobComplete
);

router.post(
  '/:jobId/confirm-completion',
  authenticate,
  requireRole('customer'),
  jobController.confirmCompletion
);

router.post(
  '/:jobId/location',
  authenticate,
  requireRole('tradesperson'),
  jobController.updateJobLocation
);

module.exports = router;
```

## Next Steps

1. Implement all controller methods
2. Add request validation for all endpoints
3. Implement rate limiting
4. Add API versioning
5. Set up API documentation (Swagger/OpenAPI)
