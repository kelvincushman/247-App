const { Message, User, Job } = require('../models');
const { Op } = require('sequelize');
const { uploadToS3, deleteFromS3 } = require('../config/aws');
const { notifyNewMessage } = require('./notificationService');
const logger = require('../config/logger');

/**
 * Send a text message
 * @param {string} senderId - Sender user ID
 * @param {string} receiverId - Receiver user ID
 * @param {string} jobId - Job ID
 * @param {string} content - Message content
 * @param {object} io - Socket.io instance (optional)
 * @returns {Promise<Message>} Created message
 */
const sendTextMessage = async (senderId, receiverId, jobId, content, io = null) => {
  try {
    // Create message
    const message = await Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      job_id: jobId,
      content,
      message_type: 'text',
      delivered_at: new Date()
    });

    // Load message with sender info
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ]
    });

    // Emit real-time event if Socket.io instance provided
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', messageWithSender);
    }

    // Send push notification
    const sender = await User.findByPk(senderId);
    const senderName = `${sender.first_name} ${sender.last_name}`;
    const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;

    await notifyNewMessage(receiverId, senderName, messagePreview, jobId);

    return messageWithSender;
  } catch (error) {
    logger.error('Error sending text message:', error);
    throw error;
  }
};

/**
 * Send an image message
 * @param {string} senderId - Sender user ID
 * @param {string} receiverId - Receiver user ID
 * @param {string} jobId - Job ID
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - Image MIME type
 * @param {object} io - Socket.io instance (optional)
 * @returns {Promise<Message>} Created message
 */
const sendImageMessage = async (senderId, receiverId, jobId, imageBuffer, fileName, mimeType, io = null) => {
  try {
    // Upload image to S3
    const imageUrl = await uploadToS3(imageBuffer, fileName, 'messages', mimeType);

    // Create message
    const message = await Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      job_id: jobId,
      message_type: 'image',
      image_url: imageUrl,
      delivered_at: new Date(),
      metadata: {
        file_name: fileName,
        mime_type: mimeType,
        file_size: imageBuffer.length
      }
    });

    // Load message with sender info
    const messageWithSender = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ]
    });

    // Emit real-time event if Socket.io instance provided
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', messageWithSender);
    }

    // Send push notification
    const sender = await User.findByPk(senderId);
    const senderName = `${sender.first_name} ${sender.last_name}`;

    await notifyNewMessage(receiverId, senderName, '📷 Sent a photo', jobId);

    return messageWithSender;
  } catch (error) {
    logger.error('Error sending image message:', error);
    throw error;
  }
};

/**
 * Send a system message (automated)
 * @param {string} receiverId - Receiver user ID
 * @param {string} jobId - Job ID
 * @param {string} content - Message content
 * @param {object} io - Socket.io instance (optional)
 * @returns {Promise<Message>} Created message
 */
const sendSystemMessage = async (receiverId, jobId, content, io = null) => {
  try {
    // For system messages, sender_id is the same as receiver_id
    const message = await Message.create({
      sender_id: receiverId, // System messages don't have a real sender
      receiver_id: receiverId,
      job_id: jobId,
      content,
      message_type: 'system',
      delivered_at: new Date(),
      read_at: new Date() // Auto-mark as read
    });

    // Emit real-time event if Socket.io instance provided
    if (io) {
      io.to(`user_${receiverId}`).emit('new_message', message);
    }

    return message;
  } catch (error) {
    logger.error('Error sending system message:', error);
    throw error;
  }
};

/**
 * Get conversation messages for a job
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID (for authorization)
 * @param {number} limit - Number of messages to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<object>} Messages and pagination info
 */
const getConversation = async (jobId, userId, limit = 50, offset = 0) => {
  try {
    // Verify user is part of this job
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.customer_id !== userId && job.tradesperson_id !== userId) {
      throw new Error('Unauthorized access to this conversation');
    }

    // Fetch messages
    const { count, rows: messages } = await Message.findAndCountAll({
      where: { job_id: jobId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ],
      order: [['created_at', 'ASC']],
      limit,
      offset
    });

    return {
      messages,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit
      }
    };
  } catch (error) {
    logger.error('Error fetching conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of conversations with last message
 */
const getUserConversations = async (userId) => {
  try {
    // Get all jobs where user is involved
    const jobs = await Job.findAll({
      where: {
        [Op.or]: [
          { customer_id: userId },
          { tradesperson_id: userId }
        ],
        status: {
          [Op.in]: ['accepted', 'in_progress', 'completed']
        }
      },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: User,
          as: 'tradesperson',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    // For each job, get the last message
    const conversations = await Promise.all(
      jobs.map(async (job) => {
        const lastMessage = await Message.findOne({
          where: { job_id: job.id },
          order: [['created_at', 'DESC']],
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'first_name', 'last_name']
            }
          ]
        });

        // Count unread messages for this user
        const unreadCount = await Message.count({
          where: {
            job_id: job.id,
            receiver_id: userId,
            read_at: null
          }
        });

        // Determine the other party
        const otherParty = job.customer_id === userId ? job.tradesperson : job.customer;

        return {
          job_id: job.id,
          job_title: `${job.trade_category} - ${job.status}`,
          other_party: otherParty,
          last_message: lastMessage,
          unread_count: unreadCount,
          updated_at: lastMessage ? lastMessage.created_at : job.updated_at
        };
      })
    );

    // Sort by most recent activity
    conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return conversations;
  } catch (error) {
    logger.error('Error fetching user conversations:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID (receiver)
 * @returns {Promise<number>} Number of messages marked as read
 */
const markMessagesAsRead = async (jobId, userId) => {
  try {
    const [updatedCount] = await Message.update(
      {
        read_at: new Date()
      },
      {
        where: {
          job_id: jobId,
          receiver_id: userId,
          read_at: null
        }
      }
    );

    return updatedCount;
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    throw error;
  }
};

/**
 * Mark a specific message as delivered
 * @param {string} messageId - Message ID
 * @returns {Promise<Message>} Updated message
 */
const markMessageAsDelivered = async (messageId) => {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    await message.markAsDelivered();
    return message;
  } catch (error) {
    logger.error('Error marking message as delivered:', error);
    throw error;
  }
};

/**
 * Get unread message count for user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Unread message count
 */
const getUnreadCount = async (userId) => {
  try {
    const count = await Message.count({
      where: {
        receiver_id: userId,
        read_at: null,
        message_type: {
          [Op.ne]: 'system' // Don't count system messages
        }
      }
    });

    return count;
  } catch (error) {
    logger.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Delete a message (soft delete by clearing content)
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID (must be sender)
 * @returns {Promise<Message>} Updated message
 */
const deleteMessage = async (messageId, userId) => {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new Error('Only sender can delete message');
    }

    // If image message, delete from S3
    if (message.message_type === 'image' && message.image_url) {
      try {
        await deleteFromS3(message.image_url);
      } catch (s3Error) {
        logger.error('Error deleting image from S3:', s3Error);
        // Continue with message deletion even if S3 deletion fails
      }
    }

    // Clear message content
    message.content = '[Message deleted]';
    message.image_url = null;
    message.metadata = { ...message.metadata, deleted: true, deleted_at: new Date() };
    await message.save();

    return message;
  } catch (error) {
    logger.error('Error deleting message:', error);
    throw error;
  }
};

module.exports = {
  sendTextMessage,
  sendImageMessage,
  sendSystemMessage,
  getConversation,
  getUserConversations,
  markMessagesAsRead,
  markMessageAsDelivered,
  getUnreadCount,
  deleteMessage
};
