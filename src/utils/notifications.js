import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authService } from '../api/services';

/**
 * Notification Configuration
 * Handles push notification setup and permissions
 */

// Configure how notifications should be displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} - Whether permission was granted
 */
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If permission not yet determined, ask user
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Get Expo Push Token (FCM token)
 * @returns {Promise<string|null>} - Push token or null
 */
export const getExpoPushToken = async () => {
  if (!Device.isDevice) {
    return null;
  }

  try {
    // Set notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0080FF',
      });
    }

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Replace with your actual Expo project ID
    });

    return tokenData.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
};

/**
 * Register device for push notifications
 * Gets token and registers it with backend
 * @returns {Promise<boolean>} - Whether registration was successful
 */
export const registerForPushNotifications = async () => {
  try {
    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return false;
    }

    // Get push token
    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    // Register token with backend
    await authService.registerDevice(token);

    console.log('Push notification token registered:', token);
    return true;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return false;
  }
};

/**
 * Unregister device from push notifications
 * @returns {Promise<boolean>}
 */
export const unregisterPushNotifications = async () => {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await authService.unregisterDevice(token);
    }
    return true;
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
    return false;
  }
};

/**
 * Add notification received listener
 * Called when notification is received while app is in foreground
 * @param {Function} callback - Callback function
 * @returns {Subscription}
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener
 * Called when user taps on a notification
 * @param {Function} callback - Callback function
 * @returns {Subscription}
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Schedule a local notification
 * @param {Object} notification - Notification content
 * @param {Object} trigger - When to trigger notification
 */
export const scheduleNotification = async (notification, trigger) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: notification,
      trigger,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Set notification badge count
 * @param {number} count - Badge count
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
};

/**
 * Get notification badge count
 * @returns {Promise<number>}
 */
export const getBadgeCount = async () => {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
};

export default {
  requestNotificationPermissions,
  getExpoPushToken,
  registerForPushNotifications,
  unregisterPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  scheduleNotification,
  cancelAllNotifications,
  setBadgeCount,
  getBadgeCount,
};
