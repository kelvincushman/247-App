import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  WelcomeScreen,
  LoginScreen,
  RegisterChoiceScreen,
  RegisterCustomerScreen,
  RegisterTradespersonScreen,
  ForgotPasswordScreen,
} from '../screens/auth';

const Stack = createNativeStackNavigator();

/**
 * Auth Navigator
 * Navigation for unauthenticated users
 */
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterChoiceScreen}
        options={{ title: 'Choose Account Type' }}
      />
      <Stack.Screen
        name="RegisterCustomer"
        component={RegisterCustomerScreen}
        options={{
          title: 'Customer Registration',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="RegisterTradesperson"
        component={RegisterTradespersonScreen}
        options={{
          title: 'Tradesperson Registration',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
