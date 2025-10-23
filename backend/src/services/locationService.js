const { Location, Job } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate ETA based on distance and speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} speedMps - Speed in meters per second (null for average)
 * @returns {Date} Estimated arrival time
 */
const calculateETA = (distanceKm, speedMps = null) => {
  // If no speed provided, use average city driving speed (30 km/h = 8.33 m/s)
  const effectiveSpeedMps = speedMps && speedMps > 0 ? speedMps : 8.33;

  // Convert speed from m/s to km/h
  const speedKmh = effectiveSpeedMps * 3.6;

  // Calculate time in hours
  const timeHours = distanceKm / speedKmh;

  // Convert to milliseconds and add to current time
  const etaMilliseconds = timeHours * 60 * 60 * 1000;
  const eta = new Date(Date.now() + etaMilliseconds);

  return eta;
};

/**
 * Record a new location update for a tradesperson
 * @param {string} jobId - Job ID
 * @param {string} tradespersonId - Tradesperson ID
 * @param {object} locationData - Location data (latitude, longitude, accuracy, heading, speed, altitude)
 * @returns {Promise<Location>} Created location record
 */
const recordLocation = async (jobId, tradespersonId, locationData) => {
  const { latitude, longitude, accuracy, heading, speed, altitude, status } = locationData;

  // Get job destination
  const job = await Job.findByPk(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  const { lat: destLat, lng: destLng } = job.location;

  // Calculate distance to destination
  const distanceToDestination = calculateDistance(
    parseFloat(latitude),
    parseFloat(longitude),
    parseFloat(destLat),
    parseFloat(destLng)
  );

  // Calculate ETA
  const estimatedArrivalTime = calculateETA(distanceToDestination, speed);

  // Determine status if not provided
  let locationStatus = status || 'en_route';

  // Auto-detect arrival (within 50 meters)
  if (distanceToDestination < 0.05) {
    locationStatus = 'arrived';
  }

  // Create location record
  const location = await Location.create({
    job_id: jobId,
    tradesperson_id: tradespersonId,
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
    altitude,
    distance_to_destination: distanceToDestination,
    estimated_arrival_time: estimatedArrivalTime,
    status: locationStatus,
    timestamp: new Date()
  });

  return location;
};

/**
 * Get the latest location for a tradesperson on a specific job
 * @param {string} jobId - Job ID
 * @param {string} tradespersonId - Tradesperson ID
 * @returns {Promise<Location|null>} Latest location or null
 */
const getLatestLocation = async (jobId, tradespersonId) => {
  const location = await Location.findOne({
    where: {
      job_id: jobId,
      tradesperson_id: tradespersonId
    },
    order: [['timestamp', 'DESC']]
  });

  return location;
};

/**
 * Get location history for a job
 * @param {string} jobId - Job ID
 * @param {object} options - Options (limit, startTime, endTime)
 * @returns {Promise<Array<Location>>} Location history
 */
const getLocationHistory = async (jobId, options = {}) => {
  const { limit = 100, startTime, endTime } = options;

  const whereClause = { job_id: jobId };

  if (startTime || endTime) {
    whereClause.timestamp = {};
    if (startTime) whereClause.timestamp[Op.gte] = startTime;
    if (endTime) whereClause.timestamp[Op.lte] = endTime;
  }

  const locations = await Location.findAll({
    where: whereClause,
    order: [['timestamp', 'ASC']],
    limit
  });

  return locations;
};

/**
 * Get all active tracking sessions for a tradesperson
 * @param {string} tradespersonId - Tradesperson ID
 * @returns {Promise<Array<object>>} Active tracking sessions with latest location
 */
const getActiveTracking = async (tradespersonId) => {
  // Get all jobs where tradesperson is en_route or on_site
  const activeJobs = await Job.findAll({
    where: {
      tradesperson_id: tradespersonId,
      status: {
        [Op.in]: ['accepted', 'in_progress']
      }
    }
  });

  // For each job, get the latest location
  const activeSessions = await Promise.all(
    activeJobs.map(async (job) => {
      const latestLocation = await getLatestLocation(job.id, tradespersonId);
      return {
        job_id: job.id,
        job_title: job.title,
        job_status: job.status,
        destination: job.location,
        latest_location: latestLocation,
        tracking_active: latestLocation !== null
      };
    })
  );

  return activeSessions;
};

/**
 * Start location tracking for a job
 * @param {string} jobId - Job ID
 * @param {string} tradespersonId - Tradesperson ID
 * @param {object} initialLocation - Initial location data
 * @returns {Promise<Location>} Initial location record
 */
const startTracking = async (jobId, tradespersonId, initialLocation) => {
  // Verify job exists and belongs to tradesperson
  const job = await Job.findOne({
    where: {
      id: jobId,
      tradesperson_id: tradespersonId
    }
  });

  if (!job) {
    throw new Error('Job not found or not assigned to this tradesperson');
  }

  // Record initial location with status 'en_route'
  const location = await recordLocation(jobId, tradespersonId, {
    ...initialLocation,
    status: 'en_route'
  });

  return location;
};

/**
 * Stop location tracking for a job
 * @param {string} jobId - Job ID
 * @param {string} tradespersonId - Tradesperson ID
 * @param {object} finalLocation - Final location data
 * @returns {Promise<Location>} Final location record
 */
const stopTracking = async (jobId, tradespersonId, finalLocation) => {
  // Record final location with status 'departed'
  const location = await recordLocation(jobId, tradespersonId, {
    ...finalLocation,
    status: 'departed'
  });

  return location;
};

/**
 * Update tradesperson status at job site
 * @param {string} jobId - Job ID
 * @param {string} tradespersonId - Tradesperson ID
 * @param {string} status - Status ('arrived', 'on_site', 'departed')
 * @param {object} currentLocation - Current location data
 * @returns {Promise<Location>} Updated location record
 */
const updateJobSiteStatus = async (jobId, tradespersonId, status, currentLocation) => {
  const location = await recordLocation(jobId, tradespersonId, {
    ...currentLocation,
    status
  });

  return location;
};

/**
 * Get route summary for a completed job
 * @param {string} jobId - Job ID
 * @returns {Promise<object>} Route summary with statistics
 */
const getRouteSummary = async (jobId) => {
  const locations = await getLocationHistory(jobId);

  if (locations.length === 0) {
    return null;
  }

  const firstLocation = locations[0];
  const lastLocation = locations[locations.length - 1];

  // Calculate total distance traveled
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    const dist = calculateDistance(
      parseFloat(locations[i - 1].latitude),
      parseFloat(locations[i - 1].longitude),
      parseFloat(locations[i].latitude),
      parseFloat(locations[i].longitude)
    );
    totalDistance += dist;
  }

  // Calculate average speed (excluding stopped periods)
  const movingLocations = locations.filter(loc => loc.speed && loc.speed > 0.5);
  const avgSpeed = movingLocations.length > 0
    ? movingLocations.reduce((sum, loc) => sum + parseFloat(loc.speed), 0) / movingLocations.length
    : 0;

  // Calculate duration
  const durationMs = lastLocation.timestamp - firstLocation.timestamp;
  const durationMinutes = durationMs / (1000 * 60);

  return {
    job_id: jobId,
    start_time: firstLocation.timestamp,
    end_time: lastLocation.timestamp,
    duration_minutes: Math.round(durationMinutes),
    total_distance_km: parseFloat(totalDistance.toFixed(2)),
    average_speed_mps: parseFloat(avgSpeed.toFixed(2)),
    average_speed_kmh: parseFloat((avgSpeed * 3.6).toFixed(2)),
    location_updates: locations.length,
    start_location: {
      latitude: firstLocation.latitude,
      longitude: firstLocation.longitude
    },
    end_location: {
      latitude: lastLocation.latitude,
      longitude: lastLocation.longitude
    },
    statuses: {
      en_route: locations.filter(l => l.status === 'en_route').length,
      arrived: locations.filter(l => l.status === 'arrived').length,
      on_site: locations.filter(l => l.status === 'on_site').length,
      departed: locations.filter(l => l.status === 'departed').length
    }
  };
};

module.exports = {
  calculateDistance,
  calculateETA,
  recordLocation,
  getLatestLocation,
  getLocationHistory,
  getActiveTracking,
  startTracking,
  stopTracking,
  updateJobSiteStatus,
  getRouteSummary
};
