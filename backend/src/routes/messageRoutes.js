const express = require('express');
const { body } = require('express-validator');
const {
  sendTextMessage,
  sendImageMessage,
  getJobMessages,
  getUserConversations,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  updateFcmToken
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Send text message
router.post('/text',
  [
    body('job_id').isUUID().withMessage('Valid job ID is required'),
    body('receiver_id').isUUID().withMessage('Valid receiver ID is required'),
    body('content').trim().notEmpty().withMessage('Message content is required')
      .isLength({ max: 2000 }).withMessage('Message too long (max 2000 characters)')
  ],
  validate,
  sendTextMessage
);

// Send image message
router.post('/image',
  uploadSingle('image'),
  [
    body('job_id').isUUID().withMessage('Valid job ID is required'),
    body('receiver_id').isUUID().withMessage('Valid receiver ID is required')
  ],
  validate,
  sendImageMessage
);

// Get conversation messages for a job
router.get('/jobs/:jobId', getJobMessages);

// Get all conversations for current user
router.get('/conversations', getUserConversations);

// Mark messages as read for a job
router.put('/jobs/:jobId/read', markAsRead);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Delete a message
router.delete('/:messageId', deleteMessage);

// Update FCM token for push notifications
router.put('/fcm-token',
  [
    body('fcm_token').notEmpty().withMessage('FCM token is required')
  ],
  validate,
  updateFcmToken
);

module.exports = router;
