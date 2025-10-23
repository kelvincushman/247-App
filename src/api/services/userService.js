import apiClient from '../client';

/**
 * User Service
 * Handles user profile, settings, and account management
 */

const userService = {
  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} updates
   * @param {string} updates.firstName
   * @param {string} updates.lastName
   * @param {string} updates.phoneNumber
   * @param {string} updates.bio
   * @param {Object} updates.address
   */
  updateProfile: async (updates) => {
    const response = await apiClient.put('/users/profile', updates);
    return response.data;
  },

  /**
   * Upload profile picture
   * @param {Object} image
   */
  uploadProfilePicture: async (image) => {
    const formData = new FormData();

    formData.append('profilePicture', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'profile.jpg',
    });

    const response = await apiClient.post('/users/profile/picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Delete profile picture
   */
  deleteProfilePicture: async () => {
    const response = await apiClient.delete('/users/profile/picture');
    return response.data;
  },

  /**
   * Get user by ID
   * @param {string} userId
   */
  getUser: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  /**
   * Get tradesperson profile (public view)
   * @param {string} tradespersonId
   */
  getTradesPersonProfile: async (tradespersonId) => {
    const response = await apiClient.get(`/users/tradesperson/${tradespersonId}`);
    return response.data;
  },

  /**
   * Update tradesperson professional details
   * @param {Object} updates
   * @param {string} updates.businessName
   * @param {string} updates.businessAddress
   * @param {string} updates.licenseNumber
   * @param {string} updates.insuranceNumber
   * @param {string} updates.bio
   * @param {Array<string>} updates.specializations
   */
  updateTradesPersonProfile: async (updates) => {
    const response = await apiClient.put('/users/tradesperson/profile', updates);
    return response.data;
  },

  /**
   * Upload tradesperson verification documents
   * @param {Object} documents
   * @param {Object} documents.license - License document
   * @param {Object} documents.insurance - Insurance certificate
   * @param {Object} documents.idProof - ID proof
   */
  uploadVerificationDocuments: async (documents) => {
    const formData = new FormData();

    Object.keys(documents).forEach(key => {
      if (documents[key]) {
        formData.append(key, {
          uri: documents[key].uri,
          type: documents[key].type || 'application/pdf',
          name: documents[key].fileName || `${key}.pdf`,
        });
      }
    });

    const response = await apiClient.post('/users/tradesperson/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get verification status (Tradesperson)
   */
  getVerificationStatus: async () => {
    const response = await apiClient.get('/users/tradesperson/verification-status');
    return response.data;
  },

  /**
   * Update availability settings (Tradesperson)
   * @param {Object} availability
   * @param {boolean} availability.isAvailable - Currently accepting jobs
   * @param {Array} availability.workingHours - Working hours by day
   * @param {Array} availability.unavailableDates - Dates unavailable
   */
  updateAvailability: async (availability) => {
    const response = await apiClient.put('/users/tradesperson/availability', availability);
    return response.data;
  },

  /**
   * Get availability settings (Tradesperson)
   */
  getAvailability: async () => {
    const response = await apiClient.get('/users/tradesperson/availability');
    return response.data;
  },

  /**
   * Update notification preferences
   * @param {Object} preferences
   * @param {boolean} preferences.pushNotifications
   * @param {boolean} preferences.emailNotifications
   * @param {boolean} preferences.smsNotifications
   * @param {Object} preferences.notificationTypes - Preferences by type
   */
  updateNotificationPreferences: async (preferences) => {
    const response = await apiClient.put('/users/preferences/notifications', preferences);
    return response.data;
  },

  /**
   * Get notification preferences
   */
  getNotificationPreferences: async () => {
    const response = await apiClient.get('/users/preferences/notifications');
    return response.data;
  },

  /**
   * Update privacy settings
   * @param {Object} settings
   * @param {boolean} settings.showPhoneNumber
   * @param {boolean} settings.showEmail
   * @param {boolean} settings.showAddress
   * @param {boolean} settings.allowLocationTracking
   */
  updatePrivacySettings: async (settings) => {
    const response = await apiClient.put('/users/settings/privacy', settings);
    return response.data;
  },

  /**
   * Get privacy settings
   */
  getPrivacySettings: async () => {
    const response = await apiClient.get('/users/settings/privacy');
    return response.data;
  },

  /**
   * Delete account
   * @param {string} password - Current password for confirmation
   * @param {string} reason - Optional deletion reason
   */
  deleteAccount: async (password, reason = null) => {
    const response = await apiClient.post('/users/delete-account', {
      password,
      reason,
    });
    return response.data;
  },

  /**
   * Get account statistics
   */
  getAccountStats: async () => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },

  /**
   * Search tradespeople
   * @param {Object} params
   * @param {string} params.category - Trade category
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {number} params.radius - Search radius in km
   * @param {number} params.minRating - Minimum rating
   * @param {boolean} params.verifiedOnly - Show only verified tradespeople
   */
  searchTradespeople: async (params) => {
    const response = await apiClient.get('/users/search/tradespeople', { params });
    return response.data;
  },

  /**
   * Block a user
   * @param {string} userId
   */
  blockUser: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/block`);
    return response.data;
  },

  /**
   * Unblock a user
   * @param {string} userId
   */
  unblockUser: async (userId) => {
    const response = await apiClient.post(`/users/${userId}/unblock`);
    return response.data;
  },

  /**
   * Get blocked users list
   */
  getBlockedUsers: async () => {
    const response = await apiClient.get('/users/blocked');
    return response.data;
  },

  /**
   * Report a user
   * @param {string} userId
   * @param {Object} data
   * @param {string} data.reason
   * @param {string} data.details
   */
  reportUser: async (userId, data) => {
    const response = await apiClient.post(`/users/${userId}/report`, data);
    return response.data;
  },
};

export default userService;
