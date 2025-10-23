const socketio = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');
const { User } = require('../models');
const locationService = require('../services/locationService');

// Store active socket connections
const activeConnections = new Map();

/**
 * Initialize Socket.io with Express server
 * @param {object} server - HTTP server instance
 * @returns {object} Socket.io instance
 */
const initializeSocket = (server) => {
  const io = socketio(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Load user
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket
      socket.userId = user.id;
      socket.user = user;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`User ${userId} connected via Socket.io: ${socket.id}`);

    // Store connection
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId).add(socket.id);

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Emit connection success
    socket.emit('connected', {
      message: 'Successfully connected to real-time server',
      user_id: userId,
      socket_id: socket.id
    });

    /**
     * Join a job room for real-time updates
     */
    socket.on('join_job', (data) => {
      const { job_id } = data;
      socket.join(`job_${job_id}`);
      logger.info(`User ${userId} joined job room: ${job_id}`);

      socket.emit('joined_job', {
        job_id,
        message: `Joined job ${job_id} room`
      });
    });

    /**
     * Leave a job room
     */
    socket.on('leave_job', (data) => {
      const { job_id } = data;
      socket.leave(`job_${job_id}`);
      logger.info(`User ${userId} left job room: ${job_id}`);

      socket.emit('left_job', {
        job_id,
        message: `Left job ${job_id} room`
      });
    });

    /**
     * Typing indicator for messages
     */
    socket.on('typing_start', (data) => {
      const { job_id, receiver_id } = data;

      io.to(`user_${receiver_id}`).emit('user_typing', {
        job_id,
        user_id: userId,
        user_name: `${socket.user.first_name} ${socket.user.last_name}`,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { job_id, receiver_id } = data;

      io.to(`user_${receiver_id}`).emit('user_typing', {
        job_id,
        user_id: userId,
        user_name: `${socket.user.first_name} ${socket.user.last_name}`,
        typing: false
      });
    });

    /**
     * Real-time location updates (for job tracking)
     * Enhanced to save to database and calculate ETA
     */
    socket.on('location_update', async (data) => {
      try {
        const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = data;

        // Save location to database and calculate distance/ETA
        const location = await locationService.recordLocation(job_id, userId, {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          altitude
        });

        // Broadcast enhanced location data to all users in job room
        io.to(`job_${job_id}`).emit('tradesperson_location', {
          job_id,
          tradesperson_id: userId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            heading: location.heading,
            speed: location.speed,
            altitude: location.altitude
          },
          distance_to_destination_km: location.distance_to_destination,
          estimated_arrival_time: location.estimated_arrival_time,
          status: location.status,
          timestamp: location.timestamp
        });

        logger.info(`Location updated for job ${job_id} by user ${userId}`);
      } catch (error) {
        logger.error(`Location update error for job ${data.job_id}:`, error);
        socket.emit('location_update_error', {
          message: error.message || 'Failed to update location'
        });
      }
    });

    /**
     * Start location tracking for a job
     */
    socket.on('start_tracking', async (data) => {
      try {
        const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = data;

        const location = await locationService.startTracking(job_id, userId, {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          altitude
        });

        // Notify all users in job room
        io.to(`job_${job_id}`).emit('tracking_started', {
          job_id,
          tradesperson_id: userId,
          location,
          message: 'Tradesperson is on the way'
        });

        socket.emit('tracking_started_success', {
          job_id,
          location
        });

        logger.info(`Tracking started for job ${job_id} by user ${userId}`);
      } catch (error) {
        logger.error(`Start tracking error for job ${data.job_id}:`, error);
        socket.emit('tracking_error', {
          message: error.message || 'Failed to start tracking'
        });
      }
    });

    /**
     * Stop location tracking for a job
     */
    socket.on('stop_tracking', async (data) => {
      try {
        const { job_id, latitude, longitude, accuracy, heading, speed, altitude } = data;

        const location = await locationService.stopTracking(job_id, userId, {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          altitude
        });

        // Notify all users in job room
        io.to(`job_${job_id}`).emit('tracking_stopped', {
          job_id,
          tradesperson_id: userId,
          location,
          message: 'Location tracking ended'
        });

        socket.emit('tracking_stopped_success', {
          job_id,
          location
        });

        logger.info(`Tracking stopped for job ${job_id} by user ${userId}`);
      } catch (error) {
        logger.error(`Stop tracking error for job ${data.job_id}:`, error);
        socket.emit('tracking_error', {
          message: error.message || 'Failed to stop tracking'
        });
      }
    });

    /**
     * Update job site status (arrived, on_site, departed)
     */
    socket.on('update_job_site_status', async (data) => {
      try {
        const { job_id, status, latitude, longitude, accuracy, heading, speed, altitude } = data;

        const location = await locationService.updateJobSiteStatus(job_id, userId, status, {
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          altitude
        });

        // Notify all users in job room
        io.to(`job_${job_id}`).emit('job_site_status_updated', {
          job_id,
          tradesperson_id: userId,
          status,
          location,
          timestamp: new Date()
        });

        socket.emit('status_update_success', {
          job_id,
          status,
          location
        });

        logger.info(`Job site status updated to ${status} for job ${job_id} by user ${userId}`);
      } catch (error) {
        logger.error(`Job site status update error for job ${data.job_id}:`, error);
        socket.emit('status_update_error', {
          message: error.message || 'Failed to update job site status'
        });
      }
    });

    /**
     * Mark user as online/active
     */
    socket.on('update_status', async (data) => {
      const { status } = data; // 'online', 'away', 'busy', 'offline'

      // Broadcast status to relevant users
      // This could be improved to only notify users in active conversations
      socket.broadcast.emit('user_status_changed', {
        user_id: userId,
        status,
        timestamp: new Date()
      });

      logger.info(`User ${userId} status changed to: ${status}`);
    });

    /**
     * Request for online status of specific users
     */
    socket.on('check_online_status', (data) => {
      const { user_ids } = data;
      const onlineStatuses = {};

      user_ids.forEach(uid => {
        onlineStatuses[uid] = activeConnections.has(uid);
      });

      socket.emit('online_status_response', {
        statuses: onlineStatuses
      });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', (reason) => {
      logger.info(`User ${userId} disconnected: ${socket.id} - Reason: ${reason}`);

      // Remove connection
      if (activeConnections.has(userId)) {
        activeConnections.get(userId).delete(socket.id);

        // If no more connections, remove user from map
        if (activeConnections.get(userId).size === 0) {
          activeConnections.delete(userId);

          // Broadcast offline status
          socket.broadcast.emit('user_status_changed', {
            user_id: userId,
            status: 'offline',
            timestamp: new Date()
          });
        }
      }
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  // Helper function to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Helper function to emit to specific job
  io.emitToJob = (jobId, event, data) => {
    io.to(`job_${jobId}`).emit(event, data);
  };

  // Helper function to check if user is online
  io.isUserOnline = (userId) => {
    return activeConnections.has(userId);
  };

  // Helper function to get online users count
  io.getOnlineCount = () => {
    return activeConnections.size;
  };

  logger.info('Socket.io initialized successfully');

  return io;
};

module.exports = {
  initializeSocket,
  activeConnections
};
