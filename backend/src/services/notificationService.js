const { Notification, User } = require('../models');
const { sendPushNotification, sendMulticastPushNotification } = require('../config/firebase');
const logger = require('../config/logger');

/**
 * Create a notification in the database
 * @param {object} notificationData - Notification data
 * @returns {Promise<Notification>} Created notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Send notification with optional push notification
 * @param {string} userId - User ID to send notification to
 * @param {object} notificationData - Notification data
 * @param {boolean} sendPush - Whether to send push notification
 * @returns {Promise<Notification>} Created notification
 */
const sendNotification = async (userId, notificationData, sendPush = true) => {
  try {
    // Create notification in database
    const notification = await createNotification({
      user_id: userId,
      ...notificationData
    });

    // Send push notification if enabled
    if (sendPush) {
      const user = await User.findByPk(userId);

      if (user && user.fcm_token) {
        try {
          await sendPushNotification(
            user.fcm_token,
            {
              title: notificationData.title,
              body: notificationData.message,
              image: notificationData.data?.image_url
            },
            {
              notification_id: notification.id,
              type: notificationData.type,
              action_url: notificationData.action_url || '',
              ...notificationData.data
            }
          );

          await notification.markPushSent();
        } catch (pushError) {
          logger.error('Error sending push notification:', pushError);
          await notification.markPushFailed();
        }
      } else {
        // User doesn't have FCM token, mark as not required
        notification.push_status = 'not_required';
        await notification.save();
      }
    } else {
      notification.push_status = 'not_required';
      await notification.save();
    }

    return notification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {object} notificationData - Notification data
 * @param {boolean} sendPush - Whether to send push notification
 * @returns {Promise<Array<Notification>>} Created notifications
 */
const sendBulkNotification = async (userIds, notificationData, sendPush = true) => {
  try {
    // Create notifications for all users
    const notifications = await Promise.all(
      userIds.map(userId =>
        createNotification({
          user_id: userId,
          ...notificationData
        })
      )
    );

    // Send push notifications if enabled
    if (sendPush) {
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'fcm_token']
      });

      const usersWithTokens = users.filter(u => u.fcm_token);

      if (usersWithTokens.length > 0) {
        const tokens = usersWithTokens.map(u => u.fcm_token);

        try {
          const response = await sendMulticastPushNotification(
            tokens,
            {
              title: notificationData.title,
              body: notificationData.message
            },
            {
              type: notificationData.type,
              ...notificationData.data
            }
          );

          // Update notification statuses based on response
          const successTokens = [];
          const failedTokens = [];

          response.responses.forEach((resp, idx) => {
            if (resp.success) {
              successTokens.push(tokens[idx]);
            } else {
              failedTokens.push(tokens[idx]);
            }
          });

          // Mark notifications as sent or failed
          for (const notification of notifications) {
            const user = users.find(u => u.id === notification.user_id);
            if (user && user.fcm_token) {
              if (successTokens.includes(user.fcm_token)) {
                await notification.markPushSent();
              } else if (failedTokens.includes(user.fcm_token)) {
                await notification.markPushFailed();
              }
            }
          }
        } catch (pushError) {
          logger.error('Error sending bulk push notifications:', pushError);
        }
      }
    }

    return notifications;
  } catch (error) {
    logger.error('Error sending bulk notifications:', error);
    throw error;
  }
};

/**
 * Job-related notification helpers
 */
const notifyJobRequested = async (tradespersonId, jobData) => {
  return sendNotification(tradespersonId, {
    type: 'job_requested',
    title: '🔔 New Job Request',
    message: `New ${jobData.tradeCategory} job near you! Tap to view details.`,
    priority: jobData.urgency === 'emergency' ? 'urgent' : 'high',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      trade_category: jobData.tradeCategory,
      urgency: jobData.urgency
    }
  });
};

const notifyJobAccepted = async (customerId, jobData, tradespersonData) => {
  return sendNotification(customerId, {
    type: 'job_accepted',
    title: '✅ Job Accepted',
    message: `${tradespersonData.businessName} accepted your ${jobData.tradeCategory} request!`,
    priority: 'high',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      tradesperson_id: tradespersonData.id,
      tradesperson_name: tradespersonData.businessName
    }
  });
};

const notifyJobDeclined = async (customerId, jobData) => {
  return sendNotification(customerId, {
    type: 'job_declined',
    title: 'Job Declined',
    message: `Your ${jobData.tradeCategory} request was declined. Finding another tradesperson...`,
    priority: 'medium',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id
    }
  });
};

const notifyJobStarted = async (customerId, jobData, tradespersonData) => {
  return sendNotification(customerId, {
    type: 'job_started',
    title: '🔧 Job Started',
    message: `${tradespersonData.businessName} has started working on your job.`,
    priority: 'medium',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      tradesperson_id: tradespersonData.id
    }
  });
};

const notifyJobCompleted = async (customerId, jobData) => {
  return sendNotification(customerId, {
    type: 'job_completed',
    title: '✨ Job Completed',
    message: 'Your job has been marked as complete. Please review the work.',
    priority: 'high',
    action_url: `/jobs/${jobData.id}/review`,
    data: {
      job_id: jobData.id
    }
  });
};

const notifyJobCancelled = async (userId, jobData, reason) => {
  return sendNotification(userId, {
    type: 'job_cancelled',
    title: '❌ Job Cancelled',
    message: `Job cancelled: ${reason}`,
    priority: 'medium',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      reason
    }
  });
};

/**
 * Payment-related notification helpers
 */
const notifyPaymentHeld = async (customerId, jobData, amount) => {
  return sendNotification(customerId, {
    type: 'payment_held',
    title: '💳 Payment Held',
    message: `$${amount.toFixed(2)} has been held for your job. Will be charged upon completion.`,
    priority: 'medium',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      amount: amount.toString()
    }
  });
};

const notifyPaymentCaptured = async (tradespersonId, jobData, amount) => {
  return sendNotification(tradespersonId, {
    type: 'payment_captured',
    title: '💰 Payment Received',
    message: `You've received $${amount.toFixed(2)} for completing the job!`,
    priority: 'high',
    action_url: `/earnings`,
    data: {
      job_id: jobData.id,
      amount: amount.toString()
    }
  });
};

const notifyPaymentFailed = async (customerId, jobData) => {
  return sendNotification(customerId, {
    type: 'payment_failed',
    title: '⚠️ Payment Failed',
    message: 'Payment failed. Please update your payment method.',
    priority: 'urgent',
    action_url: `/payment-methods`,
    data: {
      job_id: jobData.id
    }
  });
};

const notifyPaymentRefunded = async (customerId, jobData, amount) => {
  return sendNotification(customerId, {
    type: 'payment_refunded',
    title: '💵 Refund Processed',
    message: `$${amount.toFixed(2)} has been refunded to your account.`,
    priority: 'high',
    action_url: `/jobs/${jobData.id}`,
    data: {
      job_id: jobData.id,
      amount: amount.toString()
    }
  });
};

/**
 * Message notification helper
 */
const notifyNewMessage = async (userId, senderName, messagePreview, jobId) => {
  return sendNotification(userId, {
    type: 'new_message',
    title: `💬 Message from ${senderName}`,
    message: messagePreview,
    priority: 'medium',
    action_url: `/jobs/${jobId}/messages`,
    data: {
      job_id: jobId,
      sender_name: senderName
    }
  });
};

/**
 * Review notification helper
 */
const notifyReviewReceived = async (userId, reviewerName, rating) => {
  return sendNotification(userId, {
    type: 'review_received',
    title: '⭐ New Review',
    message: `${reviewerName} left you a ${rating}-star review!`,
    priority: 'medium',
    action_url: `/profile/reviews`,
    data: {
      reviewer_name: reviewerName,
      rating: rating.toString()
    }
  });
};

/**
 * Verification notification helpers
 */
const notifyVerificationApproved = async (userId) => {
  return sendNotification(userId, {
    type: 'verification_approved',
    title: '✅ Verification Approved',
    message: 'Congratulations! Your tradesperson profile has been verified. You can now start accepting jobs.',
    priority: 'high',
    action_url: `/profile`,
    data: {}
  });
};

const notifyVerificationRejected = async (userId, reason) => {
  return sendNotification(userId, {
    type: 'verification_rejected',
    title: '⚠️ Verification Required',
    message: `Your verification was not approved: ${reason}`,
    priority: 'high',
    action_url: `/profile/verification`,
    data: {
      reason
    }
  });
};

/**
 * Payout notification helpers
 */
const notifyPayoutCompleted = async (userId, amount) => {
  return sendNotification(userId, {
    type: 'payout_completed',
    title: '💸 Payout Sent',
    message: `$${amount.toFixed(2)} has been sent to your bank account!`,
    priority: 'high',
    action_url: `/earnings`,
    data: {
      amount: amount.toString()
    }
  });
};

const notifyPayoutFailed = async (userId, amount) => {
  return sendNotification(userId, {
    type: 'payout_failed',
    title: '⚠️ Payout Failed',
    message: `Payout of $${amount.toFixed(2)} failed. Please check your bank details.`,
    priority: 'urgent',
    action_url: `/settings/payment`,
    data: {
      amount: amount.toString()
    }
  });
};

module.exports = {
  createNotification,
  sendNotification,
  sendBulkNotification,
  // Job notifications
  notifyJobRequested,
  notifyJobAccepted,
  notifyJobDeclined,
  notifyJobStarted,
  notifyJobCompleted,
  notifyJobCancelled,
  // Payment notifications
  notifyPaymentHeld,
  notifyPaymentCaptured,
  notifyPaymentFailed,
  notifyPaymentRefunded,
  // Message notifications
  notifyNewMessage,
  // Review notifications
  notifyReviewReceived,
  // Verification notifications
  notifyVerificationApproved,
  notifyVerificationRejected,
  // Payout notifications
  notifyPayoutCompleted,
  notifyPayoutFailed
};
