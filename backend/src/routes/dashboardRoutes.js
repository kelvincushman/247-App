const express = require('express');
const { query } = require('express-validator');
const {
  getOverview,
  getEarnings,
  getJobAnalytics,
  getCustomerInsights,
  getPerformanceTrends,
  getRecentActivity,
  getPopularTimes
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All dashboard routes require tradesperson authentication
router.use(protect);
router.use(authorize('tradesperson'));

// Dashboard overview
router.get('/overview',
  [
    query('period').optional().isIn(['today', 'week', 'month', 'year', 'all'])
      .withMessage('Period must be one of: today, week, month, year, all')
  ],
  validate,
  getOverview
);

// Earnings breakdown
router.get('/earnings',
  [
    query('period').optional().isIn(['day', 'week', 'month', 'year'])
      .withMessage('Period must be one of: day, week, month, year'),
    query('limit').optional().isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  getEarnings
);

// Job analytics
router.get('/jobs',
  [
    query('period').optional().isIn(['week', 'month', 'year', 'all'])
      .withMessage('Period must be one of: week, month, year, all')
  ],
  validate,
  getJobAnalytics
);

// Customer insights
router.get('/customers', getCustomerInsights);

// Performance trends
router.get('/trends',
  [
    query('periods').optional().isInt({ min: 1, max: 24 })
      .withMessage('Periods must be between 1 and 24')
  ],
  validate,
  getPerformanceTrends
);

// Recent activity feed
router.get('/activity',
  [
    query('limit').optional().isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  validate,
  getRecentActivity
);

// Popular service times
router.get('/popular-times', getPopularTimes);

module.exports = router;
