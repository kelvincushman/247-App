const { Notification } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');

/**
 * @desc    Get all notifications for current user
 * @route   GET /api/v1/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const unreadOnly = req.query.unread_only === 'true';

    const whereClause = {
      user_id: userId
    };

    if (unreadOnly) {
      whereClause.read_at = null;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit
      }
    });
  } catch (error) {
    logger.error('Error in getNotifications controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get notification by ID
 * @route   GET /api/v1/notifications/:id
 * @access  Private
 */
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error in getNotificationById controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/v1/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.markAsRead();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification_read', {
        notification_id: id
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Error in markAsRead controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/v1/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const [updatedCount] = await Notification.update(
      {
        read_at: new Date()
      },
      {
        where: {
          user_id: userId,
          read_at: null
        }
      }
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('all_notifications_read');
    }

    res.status(200).json({
      success: true,
      data: {
        marked_read: updatedCount
      }
    });
  } catch (error) {
    logger.error('Error in markAllAsRead controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/v1/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.count({
      where: {
        user_id: userId,
        read_at: null
      }
    });

    res.status(200).json({
      success: true,
      data: {
        unread_count: count
      }
    });
  } catch (error) {
    logger.error('Error in getUnreadCount controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/v1/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: {
        id,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    await notification.destroy();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('notification_deleted', {
        notification_id: id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteNotification controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/v1/notifications/clear-read
 * @access  Private
 */
const clearReadNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const deletedCount = await Notification.destroy({
      where: {
        user_id: userId,
        read_at: {
          [Op.ne]: null
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        deleted_count: deletedCount
      }
    });
  } catch (error) {
    logger.error('Error in clearReadNotifications controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get notification preferences
 * @route   GET /api/v1/notifications/preferences
 * @access  Private
 */
const getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { User } = require('../models');

    const user = await User.findByPk(userId);

    // Return notification preferences (would be stored in user metadata)
    const preferences = user.notification_preferences || {
      job_updates: true,
      payment_updates: true,
      messages: true,
      reviews: true,
      marketing: false,
      push_enabled: true,
      email_enabled: true
    };

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error in getPreferences controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Update notification preferences
 * @route   PUT /api/v1/notifications/preferences
 * @access  Private
 */
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;
    const { User } = require('../models');

    await User.update(
      {
        notification_preferences: preferences
      },
      {
        where: { id: userId }
      }
    );

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error in updatePreferences controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences
};
