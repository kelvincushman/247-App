import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/constants';

/**
 * Axios client instance with interceptors for authentication
 * Handles token refresh automatically on 401 errors
 * FIXED: Uses SecureStore for tokens (hardware-backed encryption)
 */

/**
 * Secure Token Storage Helpers
 * Uses SecureStore for tokens (encrypted) and AsyncStorage for non-sensitive data
 */
const secureStorage = {
  // Get token from secure storage
  getToken: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Failed to get ${key} from SecureStore:`, error);
      return null;
    }
  },

  // Set token in secure storage
  setToken: async (key, value) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to set ${key} in SecureStore:`, error);
      throw error;
    }
  },

  // Delete token from secure storage
  deleteToken: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Failed to delete ${key} from SecureStore:`, error);
    }
  },

  // Clear all tokens
  clearTokens: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        AsyncStorage.removeItem('user'), // User data can stay in AsyncStorage
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  },
};

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Track if we're currently refreshing to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * Sanitize sensitive data before logging
 * Prevents passwords, tokens, and other sensitive data from appearing in logs
 */
const sanitizeForLogging = (data) => {
  if (!data || typeof data !== 'object') return data;

  const sensitive = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'cardNumber',
    'cvv',
    'cvc',
    'pin',
    'ssn',
    'socialSecurity',
  ];

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();

      // Check if key matches sensitive fields
      if (sensitive.some(s => lowerKey.includes(s.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        // Recursively sanitize nested objects
        obj[key] = redact(obj[key]);
      }
    });

    return obj;
  };

  return redact(sanitized);
};

/**
 * Request Interceptor
 * Automatically adds JWT token to all requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // FIXED: Use SecureStore for tokens (hardware-backed encryption)
      const token = await secureStorage.getToken('accessToken');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development (with sanitization)
      if (__DEV__) {
        console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`, {
          params: sanitizeForLogging(config.params),
          data: sanitizeForLogging(config.data),
        });
      }

      return config;
    } catch (error) {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('[API Request Interceptor Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh on 401 errors
 * Logs responses in development
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development (with sanitization)
    if (__DEV__) {
      console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: sanitizeForLogging(response.data),
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log error in development (with sanitization)
    if (__DEV__) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: sanitizeForLogging(error.response?.data),
      });
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // FIXED: Get refresh token from SecureStore
        const refreshToken = await secureStorage.getToken('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Request new access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // FIXED: Store new tokens in SecureStore (hardware-backed encryption)
        await secureStorage.setToken('accessToken', accessToken);
        if (newRefreshToken) {
          await secureStorage.setToken('refreshToken', newRefreshToken);
        }

        // Update authorization header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Process queued requests
        processQueue(null, accessToken);

        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError, null);

        // FIXED: Clear tokens from SecureStore
        await secureStorage.clearTokens();

        // Emit event for navigation to login
        // This will be handled by the app's navigation listener
        if (typeof global.navigateToLogin === 'function') {
          global.navigateToLogin();
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your internet connection.',
        type: 'NETWORK_ERROR',
        originalError: error,
      });
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

/**
 * Helper function to set auth token manually
 * Used after login/register
 */
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

/**
 * Helper function to clear auth token
 * Used on logout
 */
export const clearAuthToken = () => {
  delete apiClient.defaults.headers.common['Authorization'];
};

/**
 * Export secure storage helper for use in other modules
 * Use this for storing/retrieving tokens throughout the app
 */
export { secureStorage };

export default apiClient;
