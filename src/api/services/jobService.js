import apiClient from '../client';

/**
 * Job Service
 * Handles all job-related API calls
 */

const jobService = {
  /**
   * Create a new job request (Customer)
   * @param {Object} jobData
   * @param {string} jobData.category - Trade category
   * @param {string} jobData.title - Job title
   * @param {string} jobData.description - Job description
   * @param {string} jobData.urgency - low, medium, high, emergency
   * @param {Object} jobData.location - { address, latitude, longitude }
   * @param {Array} jobData.images - Array of image URIs
   * @param {Date} jobData.preferredDate - Optional preferred date
   * @param {string} jobData.preferredTime - Optional preferred time slot
   */
  createJob: async (jobData) => {
    const formData = new FormData();

    // Append text fields
    Object.keys(jobData).forEach(key => {
      if (key !== 'images' && key !== 'location') {
        formData.append(key, jobData[key]);
      }
    });

    // Append location as JSON string
    if (jobData.location) {
      formData.append('location', JSON.stringify(jobData.location));
    }

    // Append images
    if (jobData.images && jobData.images.length > 0) {
      jobData.images.forEach((image, index) => {
        formData.append('images', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${index}.jpg`,
        });
      });
    }

    const response = await apiClient.post('/jobs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get jobs list with filters
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.category - Filter by category
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   */
  getJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs', { params });
    return response.data;
  },

  /**
   * Get single job by ID
   * @param {string} jobId
   */
  getJob: async (jobId) => {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get jobs assigned to tradesperson
   * @param {Object} params - Query parameters
   */
  getMyJobs: async (params = {}) => {
    const response = await apiClient.get('/jobs/my-jobs', { params });
    return response.data;
  },

  /**
   * Get available jobs for tradesperson (nearby, matching category)
   * @param {Object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {number} params.radius - Radius in km
   */
  getAvailableJobs: async (params) => {
    const response = await apiClient.get('/jobs/available', { params });
    return response.data;
  },

  /**
   * Update job details (Customer)
   * @param {string} jobId
   * @param {Object} updates
   */
  updateJob: async (jobId, updates) => {
    const response = await apiClient.put(`/jobs/${jobId}`, updates);
    return response.data;
  },

  /**
   * Cancel a job
   * @param {string} jobId
   * @param {string} reason - Cancellation reason
   */
  cancelJob: async (jobId, reason) => {
    const response = await apiClient.post(`/jobs/${jobId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Accept a job (Tradesperson)
   * @param {string} jobId
   * @param {Object} data
   * @param {number} data.estimatedPrice - Quoted price
   * @param {string} data.estimatedDuration - Estimated duration
   * @param {Date} data.proposedDate - Proposed start date
   */
  acceptJob: async (jobId, data) => {
    const response = await apiClient.post(`/jobs/${jobId}/accept`, data);
    return response.data;
  },

  /**
   * Reject a job (Tradesperson)
   * @param {string} jobId
   * @param {string} reason
   */
  rejectJob: async (jobId, reason) => {
    const response = await apiClient.post(`/jobs/${jobId}/reject`, { reason });
    return response.data;
  },

  /**
   * Start working on a job (Tradesperson)
   * @param {string} jobId
   */
  startJob: async (jobId) => {
    const response = await apiClient.post(`/jobs/${jobId}/start`);
    return response.data;
  },

  /**
   * Mark job as completed (Tradesperson)
   * @param {string} jobId
   * @param {Object} data
   * @param {number} data.finalPrice - Final price (may differ from estimate)
   * @param {string} data.notes - Completion notes
   * @param {Array} data.completionImages - Optional completion photos
   */
  completeJob: async (jobId, data) => {
    const formData = new FormData();

    // Append text fields
    formData.append('finalPrice', data.finalPrice);
    if (data.notes) formData.append('notes', data.notes);

    // Append completion images
    if (data.completionImages && data.completionImages.length > 0) {
      data.completionImages.forEach((image, index) => {
        formData.append('completionImages', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `completion_${index}.jpg`,
        });
      });
    }

    const response = await apiClient.post(`/jobs/${jobId}/complete`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Confirm job completion (Customer)
   * @param {string} jobId
   */
  confirmCompletion: async (jobId) => {
    const response = await apiClient.post(`/jobs/${jobId}/confirm`);
    return response.data;
  },

  /**
   * Dispute a job
   * @param {string} jobId
   * @param {Object} data
   * @param {string} data.reason - Dispute reason
   * @param {string} data.details - Detailed explanation
   * @param {Array} data.evidence - Optional evidence images
   */
  disputeJob: async (jobId, data) => {
    const formData = new FormData();

    formData.append('reason', data.reason);
    formData.append('details', data.details);

    if (data.evidence && data.evidence.length > 0) {
      data.evidence.forEach((image, index) => {
        formData.append('evidence', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `evidence_${index}.jpg`,
        });
      });
    }

    const response = await apiClient.post(`/jobs/${jobId}/dispute`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get job history
   * @param {Object} params
   * @param {number} params.page
   * @param {number} params.limit
   */
  getJobHistory: async (params = {}) => {
    const response = await apiClient.get('/jobs/history', { params });
    return response.data;
  },

  /**
   * Get job statistics (for analytics)
   */
  getJobStats: async () => {
    const response = await apiClient.get('/jobs/stats');
    return response.data;
  },
};

export default jobService;
