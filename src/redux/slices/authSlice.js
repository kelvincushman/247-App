import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../api/services';
import { setAuthToken, clearAuthToken } from '../../api/client';

/**
 * Initial State
 */
const initialState = {
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
};

/**
 * FIXED: Sanitize auth error messages to prevent user enumeration
 * Returns generic messages instead of specific backend errors
 */
const sanitizeAuthError = (error) => {
  const errorMessage = typeof error === 'string' ? error.toLowerCase() : '';

  // Authentication errors - return generic message
  if (
    errorMessage.includes('user not found') ||
    errorMessage.includes('invalid password') ||
    errorMessage.includes('incorrect password') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('authentication failed') ||
    errorMessage.includes('login failed')
  ) {
    return 'Invalid email or password';
  }

  // Registration errors - return generic message
  if (
    errorMessage.includes('email already exists') ||
    errorMessage.includes('user already exists') ||
    errorMessage.includes('email is already registered') ||
    errorMessage.includes('duplicate')
  ) {
    return 'Registration failed. Please check your information and try again';
  }

  // Email verification errors
  if (
    errorMessage.includes('email not verified') ||
    errorMessage.includes('account not verified')
  ) {
    return 'Please verify your email address before logging in';
  }

  // Account status errors
  if (
    errorMessage.includes('account suspended') ||
    errorMessage.includes('account disabled') ||
    errorMessage.includes('account locked')
  ) {
    return 'Unable to access account. Please contact support';
  }

  // For all other errors, return a generic message
  return 'An error occurred. Please try again';
};

/**
 * Async Thunks
 */

// Login
export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      setAuthToken(response.accessToken);
      return response;
    } catch (error) {
      // FIXED: Sanitize error to prevent user enumeration
      const errorMessage = error.response?.data?.message || 'Login failed';
      return rejectWithValue(sanitizeAuthError(errorMessage));
    }
  }
);

// Register Customer
export const registerCustomer = createAsyncThunk(
  'auth/registerCustomer',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.registerCustomer(data);
      setAuthToken(response.accessToken);
      return response;
    } catch (error) {
      // FIXED: Sanitize error to prevent user enumeration
      const errorMessage = error.response?.data?.message || 'Registration failed';
      return rejectWithValue(sanitizeAuthError(errorMessage));
    }
  }
);

// Register Tradesperson
export const registerTradesperson = createAsyncThunk(
  'auth/registerTradesperson',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.registerTradesperson(data);
      setAuthToken(response.accessToken);
      return response;
    } catch (error) {
      // FIXED: Sanitize error to prevent user enumeration
      const errorMessage = error.response?.data?.message || 'Registration failed';
      return rejectWithValue(sanitizeAuthError(errorMessage));
    }
  }
);

// Logout
export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authService.logout();
    clearAuthToken();
    return null;
  } catch (error) {
    clearAuthToken(); // Clear token even if API call fails
    return rejectWithValue(error.response?.data?.message || 'Logout failed');
  }
});

// Refresh Token
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const response = await authService.refreshToken(auth.refreshToken);
      setAuthToken(response.accessToken);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

// Forgot Password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authService.forgotPassword(email);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Request failed');
    }
  }
);

// Reset Password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.resetPassword(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

// Verify Email
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await authService.verifyEmail(token);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
    }
  }
);

// Change Password
export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (data, { rejectWithValue }) => {
    try {
      const response = await authService.changePassword(data);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password change failed');
    }
  }
);

/**
 * Auth Slice
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    // Update user data (from other sources)
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    // Manual logout (no API call)
    forceLogout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      clearAuthToken();
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Register Customer
      .addCase(registerCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(registerCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Register Tradesperson
      .addCase(registerTradesperson.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerTradesperson.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(registerTradesperson.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.user = null;
        state.isLoading = false;
        state.error = null;
      })

      // Refresh Token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
      })
      .addCase(refreshToken.rejected, (state) => {
        // Token refresh failed - logout user
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.user = null;
      })

      // Verify Email
      .addCase(verifyEmail.fulfilled, (state, action) => {
        if (action.payload.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
      })

      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, updateUser, forceLogout } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
