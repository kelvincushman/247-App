const express = require('express');
const {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all notifications
router.get('/', getNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Get notification preferences
router.get('/preferences', getPreferences);

// Update notification preferences
router.put('/preferences', updatePreferences);

// Mark all notifications as read
router.put('/read-all', markAllAsRead);

// Clear all read notifications
router.delete('/clear-read', clearReadNotifications);

// Get notification by ID
router.get('/:id', getNotificationById);

// Mark notification as read
router.put('/:id/read', markAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

module.exports = router;
