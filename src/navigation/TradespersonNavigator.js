import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/tradesperson/DashboardScreen';
import AvailableJobsScreen from '../screens/tradesperson/AvailableJobsScreen';
import MyJobsScreen from '../screens/tradesperson/MyJobsScreen';
import MessagesScreen from '../screens/tradesperson/MessagesScreen';
import ProfileScreen from '../screens/tradesperson/ProfileScreen';

const Tab = createBottomTabNavigator();

/**
 * Tradesperson Navigator
 * Bottom tab navigation for tradesperson app
 */
const TradespersonNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'AvailableJobs':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'MyJobs':
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
        tabBarActiveTintColor: '#FF9500',
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
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="AvailableJobs"
        component={AvailableJobsScreen}
        options={{ title: 'Find Jobs' }}
      />
      <Tab.Screen
        name="MyJobs"
        component={MyJobsScreen}
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

export default TradespersonNavigator;
