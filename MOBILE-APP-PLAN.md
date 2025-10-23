# Mobile App Development Plan - 247 Trades Platform

## Overview
This document outlines the complete mobile app development plan with **full backend integration**, ensuring all features are connected and functional, not just UI shells.

---

## 🎯 Development Principles

1. **API-First Development** - Every screen must connect to real backend endpoints
2. **Real-time by Default** - Socket.io integration for live updates
3. **Redux Toolkit State Management** - Single source of truth
4. **Custom Components** - No heavy UI libraries, custom-built for performance
5. **Notifications Everywhere** - Push notifications + in-app notifications for all events
6. **Test on Real Devices** - iOS and Android testing throughout development

---

## 📦 Phase 11: Foundation & Infrastructure (Week 1-2)

### Dependencies to Install

```bash
# State Management
npm install @reduxjs/toolkit react-redux redux-persist

# API & Networking
npm install axios socket.io-client

# Storage
npm install @react-native-async-storage/async-storage

# Forms & Validation
npm install formik yup

# Navigation (already installed, may need updates)
npm install @react-navigation/bottom-tabs @react-navigation/material-top-tabs

# Notifications
npm install expo-notifications

# Payments
npm install @stripe/stripe-react-native

# Image Handling
npm install expo-image-picker react-native-image-crop-picker

# UI Utilities
npm install react-native-toast-message
npm install date-fns

# Icons (additional)
npm install @expo/vector-icons
```

### File Structure

```
src/
├── api/
│   ├── client.js                 # Axios instance with interceptors
│   ├── endpoints.js              # API endpoint constants
│   └── services/
│       ├── authService.js        # Authentication API calls
│       ├── jobService.js         # Job management API calls
│       ├── messageService.js     # Messaging API calls
│       ├── notificationService.js # Notification API calls
│       ├── paymentService.js     # Stripe/payment API calls
│       ├── locationService.js    # GPS tracking API calls
│       ├── reviewService.js      # Review system API calls
│       └── userService.js        # User profile API calls
├── redux/
│   ├── store.js                  # Redux Toolkit store configuration
│   └── slices/
│       ├── authSlice.js          # Authentication state
│       ├── userSlice.js          # User profile state
│       ├── jobsSlice.js          # Jobs state (customer & tradesperson)
│       ├── messagesSlice.js      # Messages/conversations state
│       ├── notificationsSlice.js # Notifications state
│       └── locationSlice.js      # GPS tracking state
├── socket/
│   ├── socketClient.js           # Socket.io client setup
│   └── socketHandlers.js         # Event handlers
├── components/
│   ├── ui/                       # Custom UI components
│   │   ├── Button.js
│   │   ├── Input.js
│   │   ├── Card.js
│   │   ├── Avatar.js
│   │   ├── Badge.js
│   │   ├── LoadingSpinner.js
│   │   ├── ErrorMessage.js
│   │   ├── EmptyState.js
│   │   └── Toast.js
│   ├── forms/                    # Form components
│   │   ├── LoginForm.js
│   │   ├── RegisterForm.js
│   │   └── JobCreationForm.js
│   ├── maps/                     # Map components
│   │   ├── JobMap.js
│   │   ├── TrackingMap.js
│   │   └── LocationPicker.js
│   ├── notifications/
│   │   ├── NotificationBell.js
│   │   ├── NotificationItem.js
│   │   └── PushNotificationHandler.js
│   └── messaging/
│       ├── ChatBubble.js
│       ├── MessageInput.js
│       └── ConversationItem.js
├── screens/
│   ├── auth/
│   │   ├── WelcomeScreen.js
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── RegisterTradespersonScreen.js
│   │   └── ForgotPasswordScreen.js
│   ├── customer/
│   │   ├── CustomerHomeScreen.js
│   │   ├── CreateJobScreen.js
│   │   ├── MyJobsScreen.js
│   │   ├── JobDetailsScreen.js
│   │   ├── TrackTradespersonScreen.js
│   │   ├── ConversationsScreen.js
│   │   ├── ChatScreen.js
│   │   └── CustomerProfileScreen.js
│   ├── tradesperson/
│   │   ├── TradespersonHomeScreen.js
│   │   ├── AvailableJobsScreen.js
│   │   ├── MyJobsScreen.js
│   │   ├── JobManagementScreen.js
│   │   ├── ScheduleScreen.js
│   │   ├── EarningsScreen.js
│   │   └── TradespersonProfileScreen.js
│   ├── shared/
│   │   ├── NotificationsScreen.js
│   │   ├── ReviewScreen.js
│   │   ├── PaymentHistoryScreen.js
│   │   ├── SettingsScreen.js
│   │   └── HelpScreen.js
│   └── modals/
│       ├── ReviewModal.js
│       ├── PaymentMethodModal.js
│       └── JobCancelModal.js
├── navigation/
│   ├── AuthNavigator.js          # Auth stack
│   ├── CustomerNavigator.js      # Customer bottom tabs + nested stacks
│   ├── TradespersonNavigator.js  # Tradesperson bottom tabs + nested stacks
│   └── RootNavigator.js          # Main navigator with role routing
├── utils/
│   ├── validation.js             # Yup validation schemas
│   ├── formatters.js             # Date, currency formatters
│   ├── permissions.js            # Location, notification permissions
│   └── constants.js              # App constants
└── hooks/
    ├── useAuth.js                # Authentication hook
    ├── useSocket.js              # Socket.io hook
    ├── useNotifications.js       # Notifications hook
    └── useLocation.js            # Location tracking hook
```

---

## 🔌 API Client Architecture

### axios Client Configuration (src/api/client.js)

```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data.data;
        await AsyncStorage.setItem('accessToken', access_token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // Dispatch logout action
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Example Service (src/api/services/jobService.js)

```javascript
import apiClient from '../client';

export const jobService = {
  // Create a new job
  createJob: async (jobData) => {
    const response = await apiClient.post('/jobs', jobData);
    return response.data;
  },

  // Get customer's jobs
  getMyJobs: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/jobs', { params });
    return response.data;
  },

  // Get available jobs for tradesperson
  getAvailableJobs: async (filters = {}) => {
    const response = await apiClient.get('/jobs/available', { params: filters });
    return response.data;
  },

  // Accept a job
  acceptJob: async (jobId) => {
    const response = await apiClient.post(`/jobs/${jobId}/accept`);
    return response.data;
  },

  // Update job status
  updateJobStatus: async (jobId, status, notes = '') => {
    const response = await apiClient.patch(`/jobs/${jobId}/status`, { status, notes });
    return response.data;
  },

  // Upload job images
  uploadJobImages: async (jobId, images) => {
    const formData = new FormData();
    images.forEach((image, index) => {
      formData.append('images', {
        uri: image.uri,
        type: 'image/jpeg',
        name: `job_${jobId}_${index}.jpg`,
      });
    });

    const response = await apiClient.post(`/jobs/${jobId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
```

---

## 🔄 Redux Toolkit Setup

### Store Configuration (src/redux/store.js)

```javascript
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import jobsReducer from './slices/jobsSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import locationReducer from './slices/locationSlice';

// Persist config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user'], // Only persist auth and user
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    user: userReducer,
    jobs: jobsReducer,
    messages: messagesReducer,
    notifications: notificationsReducer,
    location: locationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export const persistor = persistStore(store);
```

### Example Slice (src/redux/slices/jobsSlice.js)

```javascript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobService } from '../../api/services/jobService';

// Async thunks
export const fetchMyJobs = createAsyncThunk(
  'jobs/fetchMyJobs',
  async (status, { rejectWithValue }) => {
    try {
      const response = await jobService.getMyJobs(status);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData, { rejectWithValue }) => {
    try {
      const response = await jobService.createJob(jobData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {
    myJobs: [],
    availableJobs: [],
    currentJob: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentJob: (state, action) => {
      state.currentJob = action.payload;
    },
    updateJobInList: (state, action) => {
      const index = state.myJobs.findIndex(job => job.id === action.payload.id);
      if (index !== -1) {
        state.myJobs[index] = action.payload;
      }
    },
    // Real-time update from Socket.io
    jobStatusUpdated: (state, action) => {
      const index = state.myJobs.findIndex(job => job.id === action.payload.job_id);
      if (index !== -1) {
        state.myJobs[index].status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.myJobs = action.payload;
      })
      .addCase(fetchMyJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.myJobs.unshift(action.payload);
      });
  },
});

export const { setCurrentJob, updateJobInList, jobStatusUpdated } = jobsSlice.actions;
export default jobsSlice.reducer;
```

---

## 📡 Socket.io Client Setup

### Socket Client (src/socket/socketClient.js)

```javascript
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../utils/constants';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('accessToken');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) return;

    this.socket.on(event, callback);

    // Track listeners for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }

  // Emit events
  emit(event, data) {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  // Join rooms
  joinJob(jobId) {
    this.emit('join_job', { job_id: jobId });
  }

  leaveJob(jobId) {
    this.emit('leave_job', { job_id: jobId });
  }

  // Send location update
  sendLocation(jobId, locationData) {
    this.emit('location_update', {
      job_id: jobId,
      ...locationData,
    });
  }

  // Send message
  sendMessage(jobId, message) {
    this.emit('send_message', {
      job_id: jobId,
      message,
    });
  }

  // Typing indicators
  startTyping(jobId, receiverId) {
    this.emit('typing_start', { job_id: jobId, receiver_id: receiverId });
  }

  stopTyping(jobId, receiverId) {
    this.emit('typing_stop', { job_id: jobId, receiver_id: receiverId });
  }
}

export default new SocketClient();
```

### Socket Handlers (src/socket/socketHandlers.js)

```javascript
import socketClient from './socketClient';
import { store } from '../redux/store';
import { jobStatusUpdated } from '../redux/slices/jobsSlice';
import { addMessage } from '../redux/slices/messagesSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import { updateTradespersonLocation } from '../redux/slices/locationSlice';
import Toast from 'react-native-toast-message';

export const setupSocketHandlers = () => {
  // Job status updates
  socketClient.on('job_status_updated', (data) => {
    store.dispatch(jobStatusUpdated(data));
    Toast.show({
      type: 'info',
      text1: 'Job Updated',
      text2: `Job status changed to ${data.status}`,
    });
  });

  // New message received
  socketClient.on('new_message', (data) => {
    store.dispatch(addMessage(data));
    Toast.show({
      type: 'info',
      text1: 'New Message',
      text2: data.message.substring(0, 50),
    });
  });

  // Location updates
  socketClient.on('tradesperson_location', (data) => {
    store.dispatch(updateTradespersonLocation(data));
  });

  // Notifications
  socketClient.on('notification', (data) => {
    store.dispatch(addNotification(data));
    Toast.show({
      type: 'info',
      text1: data.title,
      text2: data.message,
    });
  });

  // Tracking started
  socketClient.on('tracking_started', (data) => {
    Toast.show({
      type: 'success',
      text1: 'Tradesperson On The Way',
      text2: data.message,
    });
  });

  // Job site status
  socketClient.on('job_site_status_updated', (data) => {
    Toast.show({
      type: 'info',
      text1: 'Status Update',
      text2: `Tradesperson has ${data.status}`,
    });
  });
};
```

---

## 🔔 Push Notifications Setup

### Notification Service (src/services/NotificationService.js)

```javascript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService as apiNotificationService } from '../api/services/notificationService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Request permissions and get FCM token
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission for push notifications denied');
        return null;
      }

      // Get FCM token
      const token = (await Notifications.getExpoPushTokenAsync()).data;

      // Register token with backend
      await apiNotificationService.registerFCMToken(token);

      // Save token locally
      await AsyncStorage.setItem('fcmToken', token);

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Setup notification listeners
  setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    // Foreground notification listener
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Notification tap listener
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (onNotificationTapped) {
          onNotificationTapped(response);
        }
      }
    );
  }

  // Remove listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Schedule local notification (for testing or reminders)
  async scheduleLocalNotification(title, body, data = {}, delay = 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: delay > 0 ? { seconds: delay } : null,
    });
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Get badge count
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }
}

export default new NotificationService();
```

### Deep Linking Handler (src/navigation/DeepLinkingConfig.js)

```javascript
import * as Linking from 'expo-linking';

export const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      CustomerStack: {
        screens: {
          JobDetails: 'jobs/:jobId',
          Chat: 'chat/:jobId',
          Notifications: 'notifications',
        },
      },
      TradespersonStack: {
        screens: {
          JobManagement: 'manage-job/:jobId',
          Chat: 'chat/:jobId',
        },
      },
    },
  },
};

// Handle notification tap deep link
export const handleNotificationDeepLink = (notification) => {
  const data = notification.request.content.data;
  const type = data.type;

  let url = '';

  switch (type) {
    case 'job_update':
      url = `jobs/${data.job_id}`;
      break;
    case 'new_message':
      url = `chat/${data.job_id}`;
      break;
    case 'payment':
      url = 'payment-history';
      break;
    case 'review':
      url = `review/${data.job_id}`;
      break;
    default:
      url = 'notifications';
  }

  return url;
};
```

---

## 📱 Example Screen with Full Integration

### Job Details Screen (Customer)

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import socketClient from '../socket/socketClient';
import { fetchJobDetails } from '../redux/slices/jobsSlice';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

const JobDetailsScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { jobId } = route.params;

  const { currentJob, loading, error } = useSelector((state) => state.jobs);
  const [jobStatus, setJobStatus] = useState(null);

  useEffect(() => {
    // Fetch job details from API
    dispatch(fetchJobDetails(jobId));

    // Join Socket.io room for real-time updates
    socketClient.joinJob(jobId);

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      if (data.job_id === jobId) {
        setJobStatus(data.status);
      }
    };

    socketClient.on('job_status_updated', handleStatusUpdate);

    // Cleanup
    return () => {
      socketClient.leaveJob(jobId);
      socketClient.off('job_status_updated', handleStatusUpdate);
    };
  }, [jobId]);

  const handleTrackTradesperson = () => {
    navigation.navigate('TrackTradesperson', { jobId });
  };

  const handleSendMessage = () => {
    navigation.navigate('Chat', { jobId });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!currentJob) return <ErrorMessage message="Job not found" />;

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>{currentJob.title}</Text>
        <Text style={styles.status}>Status: {jobStatus || currentJob.status}</Text>

        {/* Tradesperson info */}
        {currentJob.tradesperson && (
          <View style={styles.tradespersonInfo}>
            <Text>{currentJob.tradesperson.name}</Text>
            <Text>{currentJob.tradesperson.rating} ⭐</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {currentJob.status === 'in_progress' && (
            <Button
              title="Track Tradesperson"
              onPress={handleTrackTradesperson}
            />
          )}

          <Button
            title="Send Message"
            onPress={handleSendMessage}
            variant="outline"
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default JobDetailsScreen;
```

---

## ✅ Verification Checklist

Before marking any screen as "complete", ensure:

- [ ] **API Integration**: All data comes from/goes to backend API
- [ ] **Redux Connection**: Uses Redux for state management
- [ ] **Socket.io**: Real-time updates implemented where needed
- [ ] **Loading States**: Shows spinner while loading
- [ ] **Error Handling**: Displays user-friendly error messages
- [ ] **Form Validation**: All inputs validated with formik + yup
- [ ] **Navigation**: Proper navigation with back buttons
- [ ] **Notifications**: Triggers notifications for relevant actions
- [ ] **Permissions**: Handles location/camera/notification permissions
- [ ] **Tested**: Works on both iOS and Android

---

## 🎯 Success Criteria

The mobile app is complete when:

1. ✅ Users can register, login, and logout
2. ✅ Customers can create jobs and track them
3. ✅ Tradespeople can accept jobs and update status
4. ✅ Real-time messaging works between customer and tradesperson
5. ✅ GPS tracking shows tradesperson location with ETA
6. ✅ Push notifications arrive for all events
7. ✅ In-app notifications display in notification center
8. ✅ Payments work end-to-end with Stripe
9. ✅ Reviews can be left and viewed
10. ✅ All screens load data from API, not mock data
11. ✅ Socket.io provides real-time updates everywhere
12. ✅ App works on both iOS and Android physical devices

---

**This is a complete, production-ready mobile app with full backend integration!**
