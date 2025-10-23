import apiClient from '../client';

/**
 * Location Service
 * Handles GPS tracking, location updates, and ETA calculations
 */

const locationService = {
  /**
   * Update current location (Tradesperson during active job)
   * @param {string} jobId
   * @param {Object} location
   * @param {number} location.latitude
   * @param {number} location.longitude
   * @param {number} location.accuracy - Location accuracy in meters
   * @param {number} location.heading - Direction in degrees (0-359)
   * @param {number} location.speed - Speed in m/s
   */
  updateLocation: async (jobId, location) => {
    const response = await apiClient.post('/location/update', {
      jobId,
      ...location,
    });
    return response.data;
  },

  /**
   * Get tradesperson's current location for a job (Customer view)
   * @param {string} jobId
   */
  getTradesPersonLocation: async (jobId) => {
    const response = await apiClient.get(`/location/job/${jobId}`);
    return response.data;
  },

  /**
   * Get ETA for tradesperson arrival
   * @param {string} jobId
   */
  getETA: async (jobId) => {
    const response = await apiClient.get(`/location/job/${jobId}/eta`);
    return response.data;
  },

  /**
   * Start location tracking for a job (Tradesperson)
   * @param {string} jobId
   */
  startTracking: async (jobId) => {
    const response = await apiClient.post(`/location/job/${jobId}/start-tracking`);
    return response.data;
  },

  /**
   * Stop location tracking for a job (Tradesperson)
   * @param {string} jobId
   */
  stopTracking: async (jobId) => {
    const response = await apiClient.post(`/location/job/${jobId}/stop-tracking`);
    return response.data;
  },

  /**
   * Mark arrival at job location (Tradesperson)
   * @param {string} jobId
   */
  markArrival: async (jobId) => {
    const response = await apiClient.post(`/location/job/${jobId}/arrived`);
    return response.data;
  },

  /**
   * Get location history for a job
   * @param {string} jobId
   */
  getLocationHistory: async (jobId) => {
    const response = await apiClient.get(`/location/job/${jobId}/history`);
    return response.data;
  },

  /**
   * Get nearby tradesperson (for admin/analytics)
   * @param {Object} params
   * @param {number} params.latitude
   * @param {number} params.longitude
   * @param {number} params.radius - Radius in km
   * @param {string} params.category - Optional trade category filter
   */
  getNearbyTradesperson: async (params) => {
    const response = await apiClient.get('/location/nearby', { params });
    return response.data;
  },

  /**
   * Calculate distance between two points
   * @param {Object} origin
   * @param {number} origin.latitude
   * @param {number} origin.longitude
   * @param {Object} destination
   * @param {number} destination.latitude
   * @param {number} destination.longitude
   */
  calculateDistance: async (origin, destination) => {
    const response = await apiClient.post('/location/calculate-distance', {
      origin,
      destination,
    });
    return response.data;
  },

  /**
   * Get route directions
   * @param {Object} origin
   * @param {Object} destination
   */
  getDirections: async (origin, destination) => {
    const response = await apiClient.post('/location/directions', {
      origin,
      destination,
    });
    return response.data;
  },
};

export default locationService;
