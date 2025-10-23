import apiClient from '../client';

/**
 * Message Service
 * Handles all messaging and conversation API calls
 */

const messageService = {
  /**
   * Get all conversations for the current user
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   */
  getConversations: async (params = {}) => {
    const response = await apiClient.get('/messages/conversations', { params });
    return response.data;
  },

  /**
   * Get messages for a specific job
   * @param {string} jobId
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {string} params.before - Get messages before this message ID (for pagination)
   */
  getMessages: async (jobId, params = {}) => {
    const response = await apiClient.get(`/messages/job/${jobId}`, { params });
    return response.data;
  },

  /**
   * Send a text message
   * @param {string} jobId
   * @param {string} content - Message text content
   */
  sendMessage: async (jobId, content) => {
    const response = await apiClient.post('/messages', {
      jobId,
      content,
      type: 'text',
    });
    return response.data;
  },

  /**
   * Send an image message
   * @param {string} jobId
   * @param {Object} image - Image file
   * @param {string} caption - Optional image caption
   */
  sendImage: async (jobId, image, caption = null) => {
    const formData = new FormData();

    formData.append('jobId', jobId);
    formData.append('type', 'image');

    formData.append('image', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'message_image.jpg',
    });

    if (caption) {
      formData.append('caption', caption);
    }

    const response = await apiClient.post('/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Send location message
   * @param {string} jobId
   * @param {Object} location
   * @param {number} location.latitude
   * @param {number} location.longitude
   * @param {string} location.address - Optional address
   */
  sendLocation: async (jobId, location) => {
    const response = await apiClient.post('/messages', {
      jobId,
      type: 'location',
      location,
    });
    return response.data;
  },

  /**
   * Mark messages as read
   * @param {string} jobId
   * @param {Array<string>} messageIds - Array of message IDs to mark as read
   */
  markAsRead: async (jobId, messageIds) => {
    const response = await apiClient.post('/messages/read', {
      jobId,
      messageIds,
    });
    return response.data;
  },

  /**
   * Mark entire conversation as read
   * @param {string} jobId
   */
  markConversationAsRead: async (jobId) => {
    const response = await apiClient.post(`/messages/job/${jobId}/read`);
    return response.data;
  },

  /**
   * Delete a message (soft delete)
   * @param {string} messageId
   */
  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/messages/${messageId}`);
    return response.data;
  },

  /**
   * Get unread message count
   */
  getUnreadCount: async () => {
    const response = await apiClient.get('/messages/unread/count');
    return response.data;
  },

  /**
   * Search messages
   * @param {Object} params
   * @param {string} params.query - Search query
   * @param {string} params.jobId - Optional: filter by job
   */
  searchMessages: async (params) => {
    const response = await apiClient.get('/messages/search', { params });
    return response.data;
  },

  /**
   * Report a message
   * @param {string} messageId
   * @param {Object} data
   * @param {string} data.reason - Report reason
   * @param {string} data.details - Additional details
   */
  reportMessage: async (messageId, data) => {
    const response = await apiClient.post(`/messages/${messageId}/report`, data);
    return response.data;
  },
};

export default messageService;
