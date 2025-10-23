const locationService = require('../services/locationService');
const { validationResult } = require('express-validator');

/**
 * Start tracking location for a job
 * POST /api/v1/locations/start
 */
const startTracking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tradespersonId = req.user.id;
    const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = req.body;

    const location = await locationService.startTracking(job_id, tradespersonId, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude
    });

    res.status(201).json({
      success: true,
      message: 'Location tracking started',
      data: location
    });
  } catch (error) {
    console.error('Start tracking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to start location tracking'
    });
  }
};

/**
 * Update location during tracking
 * POST /api/v1/locations/update
 */
const updateLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tradespersonId = req.user.id;
    const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = req.body;

    const location = await locationService.recordLocation(job_id, tradespersonId, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude
    });

    res.status(200).json({
      success: true,
      message: 'Location updated',
      data: location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update location'
    });
  }
};

/**
 * Stop tracking location for a job
 * POST /api/v1/locations/stop
 */
const stopTracking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tradespersonId = req.user.id;
    const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = req.body;

    const location = await locationService.stopTracking(job_id, tradespersonId, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude
    });

    res.status(200).json({
      success: true,
      message: 'Location tracking stopped',
      data: location
    });
  } catch (error) {
    console.error('Stop tracking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to stop location tracking'
    });
  }
};

/**
 * Update job site status (arrived, on_site, departed)
 * POST /api/v1/locations/status
 */
const updateJobSiteStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tradespersonId = req.user.id;
    const { job_id, status, latitude, longitude, accuracy, heading, speed, altitude } = req.body;

    const location = await locationService.updateJobSiteStatus(job_id, tradespersonId, status, {
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      altitude
    });

    res.status(200).json({
      success: true,
      message: `Job site status updated to ${status}`,
      data: location
    });
  } catch (error) {
    console.error('Update job site status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update job site status'
    });
  }
};

/**
 * Get latest location for a job
 * GET /api/v1/locations/latest/:jobId
 */
const getLatestLocation = async (req, res) => {
  try {
    const { jobId } = req.params;

    // For customers, only allow viewing their own jobs
    // For tradespeople, only allow viewing their assigned jobs
    // This will be handled by job service validation

    const location = await locationService.getLatestLocation(jobId, req.query.tradesperson_id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this job'
      });
    }

    res.status(200).json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Get latest location error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve latest location'
    });
  }
};

/**
 * Get location history for a job
 * GET /api/v1/locations/history/:jobId
 */
const getLocationHistory = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { limit, start_time, end_time } = req.query;

    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (start_time) options.startTime = new Date(start_time);
    if (end_time) options.endTime = new Date(end_time);

    const locations = await locationService.getLocationHistory(jobId, options);

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve location history'
    });
  }
};

/**
 * Get active tracking sessions for a tradesperson
 * GET /api/v1/locations/active
 */
const getActiveTracking = async (req, res) => {
  try {
    const tradespersonId = req.user.id;

    const activeSessions = await locationService.getActiveTracking(tradespersonId);

    res.status(200).json({
      success: true,
      count: activeSessions.length,
      data: activeSessions
    });
  } catch (error) {
    console.error('Get active tracking error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve active tracking sessions'
    });
  }
};

/**
 * Get route summary for a completed job
 * GET /api/v1/locations/summary/:jobId
 */
const getRouteSummary = async (req, res) => {
  try {
    const { jobId } = req.params;

    const summary = await locationService.getRouteSummary(jobId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this job'
      });
    }

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get route summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve route summary'
    });
  }
};

/**
 * Calculate distance between two points
 * POST /api/v1/locations/calculate-distance
 */
const calculateDistance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat1, lon1, lat2, lon2 } = req.body;

    const distance = locationService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lon1),
      parseFloat(lat2),
      parseFloat(lon2)
    );

    res.status(200).json({
      success: true,
      data: {
        distance_km: parseFloat(distance.toFixed(2)),
        distance_miles: parseFloat((distance * 0.621371).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate distance'
    });
  }
};

module.exports = {
  startTracking,
  updateLocation,
  stopTracking,
  updateJobSiteStatus,
  getLatestLocation,
  getLocationHistory,
  getActiveTracking,
  getRouteSummary,
  calculateDistance
};
