import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Import reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import jobsReducer from './slices/jobsSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import locationReducer from './slices/locationSlice';

/**
 * FIXED: SecureStore adapter for redux-persist
 * Uses hardware-backed encryption for sensitive auth data
 */
const createSecureStorage = () => {
  return {
    setItem: async (key, value) => {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.error('SecureStore setItem error:', error);
        throw error;
      }
    },
    getItem: async (key) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.error('SecureStore getItem error:', error);
        return null;
      }
    },
    removeItem: async (key) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.error('SecureStore removeItem error:', error);
      }
    },
  };
};

/**
 * Redux Persist Configuration
 * FIXED: Uses SecureStore for auth tokens (hardware-backed encryption)
 * User data uses AsyncStorage (not sensitive)
 */
const authPersistConfig = {
  key: 'auth',
  storage: createSecureStorage(), // FIXED: Use SecureStore instead of AsyncStorage
  whitelist: ['token', 'refreshToken', 'isAuthenticated'], // Only persist these fields
};

const userPersistConfig = {
  key: 'user',
  storage: AsyncStorage,
};

/**
 * Configure Redux Store
 */
const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    user: persistReducer(userPersistConfig, userReducer),
    jobs: jobsReducer,
    messages: messagesReducer,
    notifications: notificationsReducer,
    location: locationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: __DEV__, // Enable Redux DevTools only in development
});

/**
 * Persistor for redux-persist
 */
export const persistor = persistStore(store);

export default store;
