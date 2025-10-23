import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService } from '../../api/services';

/**
 * Initial State
 */
const initialState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  settings: null,
  pagination: {
    page: 1,
    limit: 20,
    hasMore: true,
  },
};

/**
 * Async Thunks
 */

// Get Notifications
export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (params, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(params);
      return response;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch notifications'
      );
    }
  }
);

// Mark as Read
export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

// Mark Multiple as Read
export const markMultipleAsRead = createAsyncThunk(
  'notifications/markMultipleAsRead',
  async (notificationIds, { rejectWithValue }) => {
    try {
      await notificationService.markMultipleAsRead(notificationIds);
      return notificationIds;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

// Mark All as Read
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead();
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark all as read');
    }
  }
);

// Delete Notification
export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete notification');
    }
  }
);

// Clear All Notifications
export const clearAll = createAsyncThunk(
  'notifications/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.clearAll();
      return null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear notifications');
    }
  }
);

// Get Unread Count
export const getUnreadCount = createAsyncThunk(
  'notifications/getUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getUnreadCount();
      return response.count;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch unread count'
      );
    }
  }
);

// Get Settings
export const getSettings = createAsyncThunk(
  'notifications/getSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getSettings();
      return response.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

// Update Settings
export const updateSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (settings, { rejectWithValue }) => {
    try {
      const response = await notificationService.updateSettings(settings);
      return response.settings;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

/**
 * Notifications Slice
 */
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Receive notification (from Socket.io or push notification)
    receiveNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    // Mark notification as read locally
    markAsReadLocally: (state, action) => {
      const notification = state.notifications.find(
        (notif) => notif.id === action.payload
      );
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    // Update unread count
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    // Remove notification locally
    removeNotificationLocally: (state, action) => {
      const index = state.notifications.findIndex(
        (notif) => notif.id === action.payload
      );
      if (index !== -1) {
        const wasUnread = !state.notifications[index].read;
        state.notifications.splice(index, 1);
        if (wasUnread) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },
    resetPagination: (state) => {
      state.pagination = {
        page: 1,
        limit: 20,
        hasMore: true,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Get Notifications
      .addCase(getNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.pagination = action.payload.pagination;
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (notif) => notif.id === action.payload
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })

      // Mark Multiple as Read
      .addCase(markMultipleAsRead.fulfilled, (state, action) => {
        const notificationIds = action.payload;
        let readCount = 0;

        state.notifications.forEach((notification) => {
          if (notificationIds.includes(notification.id) && !notification.read) {
            notification.read = true;
            readCount += 1;
          }
        });

        state.unreadCount = Math.max(0, state.unreadCount - readCount);
      })

      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach((notification) => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })

      // Delete Notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          (notif) => notif.id === action.payload
        );
        if (index !== -1) {
          const wasUnread = !state.notifications[index].read;
          state.notifications.splice(index, 1);
          if (wasUnread) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        }
      })

      // Clear All
      .addCase(clearAll.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      })

      // Get Unread Count
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // Get Settings
      .addCase(getSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })

      // Update Settings
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      });
  },
});

export const {
  clearError,
  receiveNotification,
  markAsReadLocally,
  updateUnreadCount,
  removeNotificationLocally,
  resetPagination,
} = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsLoading = (state) => state.notifications.isLoading;
export const selectNotificationsError = (state) => state.notifications.error;
export const selectNotificationSettings = (state) => state.notifications.settings;
export const selectNotificationsPagination = (state) => state.notifications.pagination;

export default notificationsSlice.reducer;
