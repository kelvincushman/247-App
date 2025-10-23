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

// Import reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import jobsReducer from './slices/jobsSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import locationReducer from './slices/locationSlice';

/**
 * Redux Persist Configuration
 * Persists auth and user data for auto-login
 */
const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
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
