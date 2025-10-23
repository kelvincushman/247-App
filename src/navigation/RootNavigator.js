import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../redux/slices/authSlice';
import { LoadingSpinner } from '../components/ui';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import TradespersonNavigator from './TradespersonNavigator';
import NavigationSetup from './NavigationSetup';
import socketClient from '../socket/client';

/**
 * Root Navigator
 * Main navigation container that switches based on auth state and user role
 */
const RootNavigator = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketClient.connect();
    } else {
      socketClient.disconnect();
    }
  }, [isAuthenticated]);

  // Set up global navigation reference for logout from axios interceptor
  useEffect(() => {
    global.navigateToLogin = () => {
      // This will be handled automatically by auth state change
    };

    return () => {
      delete global.navigateToLogin;
    };
  }, []);

  const renderNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    // Determine user role
    const role = user?.role;

    if (role === 'customer') {
      return <CustomerNavigator />;
    }

    if (role === 'tradesperson') {
      return <TradespersonNavigator />;
    }

    // Fallback: If authenticated but no role, show loading
    // This shouldn't happen in production
    return <LoadingSpinner text="Loading..." />;
  };

  return (
    <NavigationContainer>
      <NavigationSetup>{renderNavigator()}</NavigationSetup>
    </NavigationContainer>
  );
};

export default RootNavigator;
