import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/customer/HomeScreen';
import JobsScreen from '../screens/customer/JobsScreen';
import MessagesScreen from '../screens/customer/MessagesScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();

/**
 * Customer Navigator
 * Bottom tab navigation for customer app
 */
const CustomerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Jobs':
              iconName = focused ? 'briefcase' : 'briefcase-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0080FF',
        tabBarInactiveTintColor: '#999999',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#333333',
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Find Tradespeople' }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{ title: 'My Jobs' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default CustomerNavigator;
