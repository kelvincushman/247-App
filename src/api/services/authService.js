import apiClient, { secureStorage } from '../client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 * FIXED: Uses SecureStore for tokens (hardware-backed encryption)
 */

const authService = {
  /**
   * Register a new customer
   * @param {Object} data - Registration data
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} data.firstName
   * @param {string} data.lastName
   * @param {string} data.phoneNumber
   */
  registerCustomer: async (data) => {
    const response = await apiClient.post('/auth/register/customer', data);

    if (response.data.accessToken) {
      // FIXED: Use SecureStore for tokens (hardware-backed encryption)
      await secureStorage.setToken('accessToken', response.data.accessToken);
      await secureStorage.setToken('refreshToken', response.data.refreshToken);
      // User data can stay in AsyncStorage (not sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Register a new tradesperson
   * @param {Object} data - Registration data
   * @param {string} data.email
   * @param {string} data.password
   * @param {string} data.firstName
   * @param {string} data.lastName
   * @param {string} data.phoneNumber
   * @param {string} data.category - Trade category
   * @param {string} data.businessName
   * @param {string} data.businessAddress
   * @param {string} data.licenseNumber
   * @param {string} data.insuranceNumber
   * @param {string} data.bio
   */
  registerTradesperson: async (data) => {
    const response = await apiClient.post('/auth/register/tradesperson', data);

    if (response.data.accessToken) {
      // FIXED: Use SecureStore for tokens (hardware-backed encryption)
      await secureStorage.setToken('accessToken', response.data.accessToken);
      await secureStorage.setToken('refreshToken', response.data.refreshToken);
      // User data can stay in AsyncStorage (not sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Login user
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);

    if (response.data.accessToken) {
      // FIXED: Use SecureStore for tokens (hardware-backed encryption)
      await secureStorage.setToken('accessToken', response.data.accessToken);
      await secureStorage.setToken('refreshToken', response.data.refreshToken);
      // User data can stay in AsyncStorage (not sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      // FIXED: Get refresh token from SecureStore
      const refreshToken = await secureStorage.getToken('refreshToken');

      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // FIXED: Clear tokens from SecureStore and user from AsyncStorage
      await secureStorage.clearTokens();
    }
  },

  /**
   * Refresh access token
   * @param {string} refreshToken
   */
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });

    if (response.data.accessToken) {
      // FIXED: Use SecureStore for tokens (hardware-backed encryption)
      await secureStorage.setToken('accessToken', response.data.accessToken);
      if (response.data.refreshToken) {
        await secureStorage.setToken('refreshToken', response.data.refreshToken);
      }
    }

    return response.data;
  },

  /**
   * Send password reset email
   * @param {string} email
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {Object} data
   * @param {string} data.token - Reset token from email
   * @param {string} data.password - New password
   */
  resetPassword: async (data) => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Verify email with token
   * @param {string} token - Verification token from email
   */
  verifyEmail: async (token) => {
    const response = await apiClient.post('/auth/verify-email', { token });

    if (response.data.user) {
      // User data can stay in AsyncStorage (not sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Resend verification email
   */
  resendVerification: async () => {
    const response = await apiClient.post('/auth/resend-verification');
    return response.data;
  },

  /**
   * Change password (when logged in)
   * @param {Object} data
   * @param {string} data.currentPassword
   * @param {string} data.newPassword
   */
  changePassword: async (data) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');

    if (response.data.user) {
      // User data can stay in AsyncStorage (not sensitive)
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  /**
   * Register device for push notifications
   * @param {string} fcmToken - Firebase Cloud Messaging token
   */
  registerDevice: async (fcmToken) => {
    const response = await apiClient.post('/auth/device/register', {
      fcmToken,
      platform: Platform.OS,
    });
    return response.data;
  },

  /**
   * Unregister device for push notifications
   * @param {string} fcmToken
   */
  unregisterDevice: async (fcmToken) => {
    const response = await apiClient.post('/auth/device/unregister', {
      fcmToken,
    });
    return response.data;
  },
};

export default authService;
