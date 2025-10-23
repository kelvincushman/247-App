import apiClient from '../client';

/**
 * Review Service
 * Handles ratings and reviews for tradespeople and customers
 */

const reviewService = {
  /**
   * Submit a review for a completed job
   * @param {string} jobId
   * @param {Object} reviewData
   * @param {number} reviewData.rating - Rating (1-5)
   * @param {string} reviewData.comment - Review comment
   * @param {Array<string>} reviewData.tags - Optional review tags (e.g., "Professional", "On time")
   */
  submitReview: async (jobId, reviewData) => {
    const response = await apiClient.post(`/reviews/job/${jobId}`, reviewData);
    return response.data;
  },

  /**
   * Get reviews for a tradesperson
   * @param {string} tradespersonId
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   * @param {number} params.minRating - Filter by minimum rating
   */
  getTradesPersonReviews: async (tradespersonId, params = {}) => {
    const response = await apiClient.get(`/reviews/tradesperson/${tradespersonId}`, {
      params,
    });
    return response.data;
  },

  /**
   * Get reviews given by a customer
   * @param {string} customerId
   * @param {Object} params
   */
  getCustomerReviews: async (customerId, params = {}) => {
    const response = await apiClient.get(`/reviews/customer/${customerId}`, {
      params,
    });
    return response.data;
  },

  /**
   * Get review for a specific job
   * @param {string} jobId
   */
  getJobReview: async (jobId) => {
    const response = await apiClient.get(`/reviews/job/${jobId}`);
    return response.data;
  },

  /**
   * Get my reviews (reviews received)
   * @param {Object} params
   */
  getMyReviews: async (params = {}) => {
    const response = await apiClient.get('/reviews/my-reviews', { params });
    return response.data;
  },

  /**
   * Get reviews I've written
   * @param {Object} params
   */
  getReviewsWritten: async (params = {}) => {
    const response = await apiClient.get('/reviews/written-by-me', { params });
    return response.data;
  },

  /**
   * Update a review
   * @param {string} reviewId
   * @param {Object} updates
   * @param {number} updates.rating
   * @param {string} updates.comment
   */
  updateReview: async (reviewId, updates) => {
    const response = await apiClient.put(`/reviews/${reviewId}`, updates);
    return response.data;
  },

  /**
   * Delete a review
   * @param {string} reviewId
   */
  deleteReview: async (reviewId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  /**
   * Report a review
   * @param {string} reviewId
   * @param {Object} data
   * @param {string} data.reason - Report reason
   * @param {string} data.details - Additional details
   */
  reportReview: async (reviewId, data) => {
    const response = await apiClient.post(`/reviews/${reviewId}/report`, data);
    return response.data;
  },

  /**
   * Respond to a review (Tradesperson can respond to reviews they received)
   * @param {string} reviewId
   * @param {string} response - Response text
   */
  respondToReview: async (reviewId, responseText) => {
    const response = await apiClient.post(`/reviews/${reviewId}/respond`, {
      response: responseText,
    });
    return response.data;
  },

  /**
   * Get rating statistics for a tradesperson
   * @param {string} tradespersonId
   */
  getRatingStats: async (tradespersonId) => {
    const response = await apiClient.get(`/reviews/tradesperson/${tradespersonId}/stats`);
    return response.data;
  },

  /**
   * Get available review tags
   */
  getReviewTags: async () => {
    const response = await apiClient.get('/reviews/tags');
    return response.data;
  },
};

export default reviewService;
