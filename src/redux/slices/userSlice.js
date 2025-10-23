import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../api/services';

/**
 * Initial State
 */
const initialState = {
  profile: null,
  isLoading: false,
  error: null,
  availability: null,
  notificationPreferences: null,
  privacySettings: null,
  verificationStatus: null,
  stats: null,
};

/**
 * Async Thunks
 */

// Get Profile
export const getProfile = createAsyncThunk(
  'user/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getProfile();
      return response.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// Update Profile
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (updates, { rejectWithValue }) => {
    try {
      const response = await userService.updateProfile(updates);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

// Upload Profile Picture
export const uploadProfilePicture = createAsyncThunk(
  'user/uploadProfilePicture',
  async (image, { rejectWithValue }) => {
    try {
      const response = await userService.uploadProfilePicture(image);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload picture');
    }
  }
);

// Update Tradesperson Profile
export const updateTradesPersonProfile = createAsyncThunk(
  'user/updateTradesPersonProfile',
  async (updates, { rejectWithValue }) => {
    try {
      const response = await userService.updateTradesPersonProfile(updates);
      return response.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update tradesperson profile'
      );
    }
  }
);

// Get Verification Status
export const getVerificationStatus = createAsyncThunk(
  'user/getVerificationStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getVerificationStatus();
      return response.verificationStatus;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch verification status'
      );
    }
  }
);

// Update Availability
export const updateAvailability = createAsyncThunk(
  'user/updateAvailability',
  async (availability, { rejectWithValue }) => {
    try {
      const response = await userService.updateAvailability(availability);
      return response.availability;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update availability');
    }
  }
);

// Get Availability
export const getAvailability = createAsyncThunk(
  'user/getAvailability',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getAvailability();
      return response.availability;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch availability');
    }
  }
);

// Update Notification Preferences
export const updateNotificationPreferences = createAsyncThunk(
  'user/updateNotificationPreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await userService.updateNotificationPreferences(preferences);
      return response.preferences;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update preferences');
    }
  }
);

// Get Notification Preferences
export const getNotificationPreferences = createAsyncThunk(
  'user/getNotificationPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getNotificationPreferences();
      return response.preferences;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch preferences');
    }
  }
);

// Update Privacy Settings
export const updatePrivacySettings = createAsyncThunk(
  'user/updatePrivacySettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await userService.updatePrivacySettings(settings);
      return response.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

// Get Account Stats
export const getAccountStats = createAsyncThunk(
  'user/getAccountStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await userService.getAccountStats();
      return response.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

/**
 * User Slice
 */
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearProfile: (state) => {
      return initialState;
    },
    updateLocalProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Profile
      .addCase(getProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(getProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Upload Profile Picture
      .addCase(uploadProfilePicture.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(uploadProfilePicture.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(uploadProfilePicture.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Update Tradesperson Profile
      .addCase(updateTradesPersonProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      })

      // Verification Status
      .addCase(getVerificationStatus.fulfilled, (state, action) => {
        state.verificationStatus = action.payload;
      })

      // Availability
      .addCase(updateAvailability.fulfilled, (state, action) => {
        state.availability = action.payload;
      })
      .addCase(getAvailability.fulfilled, (state, action) => {
        state.availability = action.payload;
      })

      // Notification Preferences
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.notificationPreferences = action.payload;
      })
      .addCase(getNotificationPreferences.fulfilled, (state, action) => {
        state.notificationPreferences = action.payload;
      })

      // Privacy Settings
      .addCase(updatePrivacySettings.fulfilled, (state, action) => {
        state.privacySettings = action.payload;
      })

      // Stats
      .addCase(getAccountStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearError, clearProfile, updateLocalProfile } = userSlice.actions;

// Selectors
export const selectUserProfile = (state) => state.user.profile;
export const selectUserLoading = (state) => state.user.isLoading;
export const selectUserError = (state) => state.user.error;
export const selectAvailability = (state) => state.user.availability;
export const selectNotificationPreferences = (state) => state.user.notificationPreferences;
export const selectPrivacySettings = (state) => state.user.privacySettings;
export const selectVerificationStatus = (state) => state.user.verificationStatus;
export const selectAccountStats = (state) => state.user.stats;

export default userSlice.reducer;
