const logger = require('../config/logger');

// Track request metrics
const requestMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  averageResponseTime: 0,
  requestsByEndpoint: {},
  errorsByType: {},
  startTime: Date.now()
};

/**
 * Middleware to monitor API performance
 */
const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Track request
  requestMetrics.totalRequests++;

  // Capture original res.json to track response
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (data) {
    trackResponse(req, res, startTime, data);
    return originalJson.call(this, data);
  };

  res.send = function (data) {
    trackResponse(req, res, startTime, data);
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Track response metrics
 */
const trackResponse = (req, res, startTime, data) => {
  const duration = Date.now() - startTime;
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  // Update average response time
  const totalTime = requestMetrics.averageResponseTime * (requestMetrics.totalRequests - 1) + duration;
  requestMetrics.averageResponseTime = totalTime / requestMetrics.totalRequests;

  // Track by endpoint
  if (!requestMetrics.requestsByEndpoint[endpoint]) {
    requestMetrics.requestsByEndpoint[endpoint] = {
      count: 0,
      avgResponseTime: 0,
      errors: 0
    };
  }

  const endpointMetrics = requestMetrics.requestsByEndpoint[endpoint];
  endpointMetrics.count++;

  const endpointTotalTime = endpointMetrics.avgResponseTime * (endpointMetrics.count - 1) + duration;
  endpointMetrics.avgResponseTime = endpointTotalTime / endpointMetrics.count;

  // Track success/failure
  if (res.statusCode >= 200 && res.statusCode < 400) {
    requestMetrics.successfulRequests++;
  } else {
    requestMetrics.failedRequests++;
    endpointMetrics.errors++;

    // Track error types
    const errorType = `${res.statusCode}`;
    requestMetrics.errorsByType[errorType] = (requestMetrics.errorsByType[errorType] || 0) + 1;
  }

  // Log slow requests (over 1 second)
  if (duration > 1000) {
    logger.warn(`Slow request detected: ${endpoint} took ${duration}ms`, {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      userId: req.user?.id
    });
  }

  // Log errors
  if (res.statusCode >= 500) {
    logger.error(`Server error: ${endpoint}`, {
      method: req.method,
      path: req.path,
      duration,
      statusCode: res.statusCode,
      userId: req.user?.id,
      body: req.body
    });
  }
};

/**
 * Get current metrics
 */
const getMetrics = () => {
  const uptime = Date.now() - requestMetrics.startTime;
  const requestsPerMinute = (requestMetrics.totalRequests / (uptime / 60000)).toFixed(2);

  return {
    uptime_ms: uptime,
    uptime_formatted: formatUptime(uptime),
    total_requests: requestMetrics.totalRequests,
    successful_requests: requestMetrics.successfulRequests,
    failed_requests: requestMetrics.failedRequests,
    success_rate: ((requestMetrics.successfulRequests / requestMetrics.totalRequests) * 100).toFixed(2) + '%',
    average_response_time_ms: Math.round(requestMetrics.averageResponseTime),
    requests_per_minute: parseFloat(requestsPerMinute),
    memory_usage: process.memoryUsage(),
    top_endpoints: getTopEndpoints(),
    error_breakdown: requestMetrics.errorsByType
  };
};

/**
 * Get top endpoints by request count
 */
const getTopEndpoints = (limit = 10) => {
  return Object.entries(requestMetrics.requestsByEndpoint)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)
    .map(([endpoint, metrics]) => ({
      endpoint,
      count: metrics.count,
      avg_response_time_ms: Math.round(metrics.avgResponseTime),
      error_count: metrics.errors,
      error_rate: ((metrics.errors / metrics.count) * 100).toFixed(2) + '%'
    }));
};

/**
 * Format uptime to human readable
 */
const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Reset metrics (for testing)
 */
const resetMetrics = () => {
  requestMetrics.totalRequests = 0;
  requestMetrics.successfulRequests = 0;
  requestMetrics.failedRequests = 0;
  requestMetrics.averageResponseTime = 0;
  requestMetrics.requestsByEndpoint = {};
  requestMetrics.errorsByType = {};
  requestMetrics.startTime = Date.now();
};

/**
 * Health check endpoint data
 */
const getHealthStatus = async () => {
  const { sequelize } = require('../models');

  // Check database connection
  let dbStatus = 'healthy';
  let dbLatency = 0;

  try {
    const startTime = Date.now();
    await sequelize.authenticate();
    dbLatency = Date.now() - startTime;
  } catch (error) {
    dbStatus = 'unhealthy';
    logger.error('Database health check failed:', error);
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  const memoryStatus = memoryPercentage > 90 ? 'warning' : 'healthy';

  // Overall status
  const overallStatus = dbStatus === 'healthy' && memoryStatus === 'healthy' ? 'healthy' : 'degraded';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: formatUptime(Date.now() - requestMetrics.startTime),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      database: {
        status: dbStatus,
        latency_ms: dbLatency
      },
      memory: {
        status: memoryStatus,
        heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heap_percentage: Math.round(memoryPercentage)
      },
      api: {
        status: 'healthy',
        total_requests: requestMetrics.totalRequests,
        success_rate: ((requestMetrics.successfulRequests / requestMetrics.totalRequests) * 100).toFixed(2) + '%'
      }
    }
  };
};

module.exports = {
  performanceMonitoring,
  getMetrics,
  getHealthStatus,
  resetMetrics
};
