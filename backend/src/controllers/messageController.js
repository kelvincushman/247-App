const messagingService = require('../services/messagingService');
const logger = require('../config/logger');

/**
 * @desc    Send a text message
 * @route   POST /api/v1/messages/text
 * @access  Private
 */
const sendTextMessage = async (req, res) => {
  try {
    const { job_id, receiver_id, content } = req.body;
    const sender_id = req.user.id;

    // Get Socket.io instance from app
    const io = req.app.get('io');

    const message = await messagingService.sendTextMessage(
      sender_id,
      receiver_id,
      job_id,
      content,
      io
    );

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error in sendTextMessage controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Send an image message
 * @route   POST /api/v1/messages/image
 * @access  Private
 */
const sendImageMessage = async (req, res) => {
  try {
    const { job_id, receiver_id } = req.body;
    const sender_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Get Socket.io instance from app
    const io = req.app.get('io');

    const message = await messagingService.sendImageMessage(
      sender_id,
      receiver_id,
      job_id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      io
    );

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error in sendImageMessage controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get conversation messages for a job
 * @route   GET /api/v1/messages/jobs/:jobId
 * @access  Private
 */
const getJobMessages = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const result = await messagingService.getConversation(jobId, userId, limit, offset);

    res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error in getJobMessages controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get all conversations for current user
 * @route   GET /api/v1/messages/conversations
 * @access  Private
 */
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await messagingService.getUserConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    logger.error('Error in getUserConversations controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/v1/messages/jobs/:jobId/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const updatedCount = await messagingService.markMessagesAsRead(jobId, userId);

    // Emit read receipt event
    const io = req.app.get('io');
    if (io) {
      io.to(`job_${jobId}`).emit('messages_read', {
        job_id: jobId,
        user_id: userId,
        count: updatedCount
      });
    }

    res.status(200).json({
      success: true,
      data: {
        marked_read: updatedCount
      }
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
 * @desc    Get unread message count
 * @route   GET /api/v1/messages/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await messagingService.getUnreadCount(userId);

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
 * @desc    Delete a message
 * @route   DELETE /api/v1/messages/:messageId
 * @access  Private
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await messagingService.deleteMessage(messageId, userId);

    // Emit delete event
    const io = req.app.get('io');
    if (io) {
      io.to(`job_${message.job_id}`).emit('message_deleted', {
        message_id: messageId,
        job_id: message.job_id
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Error in deleteMessage controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Update FCM token for push notifications
 * @route   PUT /api/v1/messages/fcm-token
 * @access  Private
 */
const updateFcmToken = async (req, res) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    // Update user's FCM token
    const { User } = require('../models');
    await User.update(
      { fcm_token },
      { where: { id: userId } }
    );

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    logger.error('Error in updateFcmToken controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  sendTextMessage,
  sendImageMessage,
  getJobMessages,
  getUserConversations,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  updateFcmToken
};
