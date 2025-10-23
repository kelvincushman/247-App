import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { selectIsAuthenticated } from '../redux/slices/authSlice';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../utils/notifications';

/**
 * Navigation Setup Component
 * Handles notification registration and deep linking
 * Must be inside NavigationContainer to access navigation
 */
const NavigationSetup = ({ children }) => {
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    let notificationListener;
    let responseListener;

    if (isAuthenticated) {
      // Register for push notifications
      registerForPushNotifications();

      // Listen for user tapping on notifications
      responseListener = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, navigation);
      });
    } else {
      unregisterPushNotifications();
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
    };
  }, [isAuthenticated, navigation]);

  return children;
};

/**
 * Handle navigation based on notification data
 */
const handleNotificationNavigation = (data, navigation) => {
  if (!data) return;

  try {
    switch (data.type) {
      case 'job_update':
        if (data.jobId) {
          navigation.navigate('JobDetails', { jobId: data.jobId });
        }
        break;
      case 'new_message':
        if (data.jobId) {
          navigation.navigate('Messages');
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Navigation error:', error);
  }
};

export default NavigationSetup;
