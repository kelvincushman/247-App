const analyticsService = require('../services/analyticsService');
const logger = require('../config/logger');

/**
 * @desc    Get dashboard overview
 * @route   GET /api/v1/dashboard/overview
 * @access  Private (Tradesperson)
 */
const getOverview = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const overview = await analyticsService.getDashboardOverview(req.user.id, period);

    res.status(200).json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Error in getOverview controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get earnings breakdown
 * @route   GET /api/v1/dashboard/earnings
 * @access  Private (Tradesperson)
 */
const getEarnings = async (req, res) => {
  try {
    const { period = 'month', limit = 12 } = req.query;

    const earnings = await analyticsService.getEarningsBreakdown(
      req.user.id,
      period,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: earnings
    });
  } catch (error) {
    logger.error('Error in getEarnings controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get job analytics
 * @route   GET /api/v1/dashboard/jobs
 * @access  Private (Tradesperson)
 */
const getJobAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const analytics = await analyticsService.getJobAnalytics(req.user.id, period);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error in getJobAnalytics controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get customer insights
 * @route   GET /api/v1/dashboard/customers
 * @access  Private (Tradesperson)
 */
const getCustomerInsights = async (req, res) => {
  try {
    const insights = await analyticsService.getCustomerInsights(req.user.id);

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error in getCustomerInsights controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get performance trends
 * @route   GET /api/v1/dashboard/trends
 * @access  Private (Tradesperson)
 */
const getPerformanceTrends = async (req, res) => {
  try {
    const { periods = 6 } = req.query;

    const trends = await analyticsService.getPerformanceTrends(
      req.user.id,
      parseInt(periods)
    );

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Error in getPerformanceTrends controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get recent activity feed
 * @route   GET /api/v1/dashboard/activity
 * @access  Private (Tradesperson)
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const activities = await analyticsService.getRecentActivity(
      req.user.id,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: activities
    });
  } catch (error) {
    logger.error('Error in getRecentActivity controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get popular service times
 * @route   GET /api/v1/dashboard/popular-times
 * @access  Private (Tradesperson)
 */
const getPopularTimes = async (req, res) => {
  try {
    const times = await analyticsService.getPopularServiceTimes(req.user.id);

    res.status(200).json({
      success: true,
      data: times
    });
  } catch (error) {
    logger.error('Error in getPopularTimes controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getOverview,
  getEarnings,
  getJobAnalytics,
  getCustomerInsights,
  getPerformanceTrends,
  getRecentActivity,
  getPopularTimes
};
