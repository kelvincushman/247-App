const admin = require('firebase-admin');
const logger = require('./logger');

// Initialize Firebase Admin SDK
let firebaseApp;

const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    // Initialize with service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
      });
      logger.info('Firebase Admin SDK initialized successfully');
    } else {
      logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
      firebaseApp = null;
    }

    return firebaseApp;
  } catch (error) {
    logger.error('Error initializing Firebase:', error);
    firebaseApp = null;
    return null;
  }
};

/**
 * Send a push notification to a single device
 * @param {string} fcmToken - Firebase Cloud Messaging token
 * @param {object} notification - Notification payload
 * @param {object} data - Additional data payload
 * @returns {Promise<string>} Message ID if sent successfully
 */
const sendPushNotification = async (fcmToken, notification, data = {}) => {
  try {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Skipping push notification.');
      return null;
    }

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: notification.title,
              body: notification.body
            }
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent successfully: ${response}`);
    return response;
  } catch (error) {
    logger.error('Error sending push notification:', error);
    throw error;
  }
};

/**
 * Send push notifications to multiple devices
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {object} notification - Notification payload
 * @param {object} data - Additional data payload
 * @returns {Promise<object>} Batch response with success and failure counts
 */
const sendMulticastPushNotification = async (fcmTokens, notification, data = {}) => {
  try {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Skipping push notification.');
      return { successCount: 0, failureCount: fcmTokens.length };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const message = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image || undefined
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    logger.info(`Multicast notification sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    // Log failed tokens for debugging
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
          logger.error(`Failed to send to token ${fcmTokens[idx]}: ${resp.error}`);
        }
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    logger.error('Error sending multicast push notification:', error);
    throw error;
  }
};

/**
 * Subscribe tokens to a topic for group messaging
 * @param {Array<string>} tokens - FCM tokens to subscribe
 * @param {string} topic - Topic name
 * @returns {Promise<object>} Subscription response
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Cannot subscribe to topic.');
      return null;
    }

    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    logger.info(`Subscribed ${response.successCount} tokens to topic: ${topic}`);
    return response;
  } catch (error) {
    logger.error(`Error subscribing to topic ${topic}:`, error);
    throw error;
  }
};

/**
 * Unsubscribe tokens from a topic
 * @param {Array<string>} tokens - FCM tokens to unsubscribe
 * @param {string} topic - Topic name
 * @returns {Promise<object>} Unsubscription response
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Cannot unsubscribe from topic.');
      return null;
    }

    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    logger.info(`Unsubscribed ${response.successCount} tokens from topic: ${topic}`);
    return response;
  } catch (error) {
    logger.error(`Error unsubscribing from topic ${topic}:`, error);
    throw error;
  }
};

/**
 * Send notification to a topic
 * @param {string} topic - Topic name
 * @param {object} notification - Notification payload
 * @param {object} data - Additional data payload
 * @returns {Promise<string>} Message ID
 */
const sendToTopic = async (topic, notification, data = {}) => {
  try {
    if (!firebaseApp) {
      logger.warn('Firebase not initialized. Skipping topic notification.');
      return null;
    }

    const message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        ...data,
        timestamp: Date.now().toString()
      }
    };

    const response = await admin.messaging().send(message);
    logger.info(`Topic notification sent to ${topic}: ${response}`);
    return response;
  } catch (error) {
    logger.error(`Error sending to topic ${topic}:`, error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  sendPushNotification,
  sendMulticastPushNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendToTopic
};
