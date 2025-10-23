import apiClient from '../client';

/**
 * Notification Service
 * Handles all notification-related API calls
 */

const notificationService = {
  /**
   * Get user notifications
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {boolean} params.unreadOnly - Get only unread notifications
   */
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * Get notification by ID
   * @param {string} notificationId
   */
  getNotification: async (notificationId) => {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Mark notification as read
   * @param {string} notificationId
   */
  markAsRead: async (notificationId) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Mark multiple notifications as read
   * @param {Array<string>} notificationIds
   */
  markMultipleAsRead: async (notificationIds) => {
    const response = await apiClient.post('/notifications/mark-read', {
      notificationIds,
    });
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Delete a notification
   * @param {string} notificationId
   */
  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  /**
   * Clear all notifications
   */
  clearAll: async () => {
    const response = await apiClient.delete('/notifications/clear-all');
    return response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread/count');
    return response.data;
  },

  /**
   * Get notification settings/preferences
   */
  getSettings: async () => {
    const response = await apiClient.get('/notifications/settings');
    return response.data;
  },

  /**
   * Update notification settings
   * @param {Object} settings
   * @param {boolean} settings.pushEnabled
   * @param {boolean} settings.emailEnabled
   * @param {boolean} settings.smsEnabled
   * @param {Object} settings.preferences - Notification type preferences
   */
  updateSettings: async (settings) => {
    const response = await apiClient.put('/notifications/settings', settings);
    return response.data;
  },

  /**
   * Test push notification
   */
  testPushNotification: async () => {
    const response = await apiClient.post('/notifications/test');
    return response.data;
  },
};

export default notificationService;
