import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectIsAuthenticated } from '../redux/slices/authSlice';
import { receiveNotification } from '../redux/slices/notificationsSlice';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setBadgeCount,
} from '../utils/notifications';

/**
 * Custom hook for managing push notifications
 * Automatically registers/unregisters based on auth state
 * Handles notification events and navigation
 */
export const useNotifications = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  // Register/unregister for notifications based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      // Register for push notifications
      registerForPushNotifications();

      // Listen for notifications received while app is in foreground
      notificationListener.current = addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);

          // Add to Redux store
          dispatch(
            receiveNotification({
              id: notification.request.identifier,
              type: notification.request.content.data?.type || 'system',
              title: notification.request.content.title,
              message: notification.request.content.body,
              data: notification.request.content.data,
              read: false,
              createdAt: new Date().toISOString(),
            })
          );

          // Update badge count
          const badgeCount = notification.request.content.badge || 0;
          setBadgeCount(badgeCount);
        }
      );

      // Listen for user tapping on notifications
      responseListener.current = addNotificationResponseListener(
        (response) => {
          console.log('Notification tapped:', response);

          const data = response.notification.request.content.data;

          // Handle deep linking based on notification type
          handleNotificationNavigation(data, navigation);
        }
      );
    } else {
      // Unregister when logged out
      unregisterPushNotifications();
    }

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, dispatch, navigation]);
};

/**
 * Handle navigation based on notification data
 * @param {Object} data - Notification data
 * @param {Object} navigation - Navigation object
 */
const handleNotificationNavigation = (data, navigation) => {
  if (!data) return;

  try {
    switch (data.type) {
      case 'job_update':
        // Navigate to job details
        if (data.jobId) {
          navigation.navigate('JobDetails', { jobId: data.jobId });
        }
        break;

      case 'new_message':
        // Navigate to messages/conversation
        if (data.jobId) {
          navigation.navigate('Messages', {
            screen: 'Conversation',
            params: { jobId: data.jobId },
          });
        }
        break;

      case 'payment':
        // Navigate to payment details or history
        if (data.paymentId) {
          navigation.navigate('PaymentDetails', { paymentId: data.paymentId });
        }
        break;

      case 'review':
        // Navigate to reviews
        if (data.reviewId) {
          navigation.navigate('ReviewDetails', { reviewId: data.reviewId });
        }
        break;

      default:
        // Navigate to notifications list for other types
        navigation.navigate('Notifications');
        break;
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Fallback to notifications screen
    navigation.navigate('Notifications');
  }
};

export default useNotifications;
