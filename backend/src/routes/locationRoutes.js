const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticate, requireTradesperson } = require('../middleware/auth');
const { body, query, param } = require('express-validator');

// Validation rules
const locationValidation = [
  body('job_id').notEmpty().isUUID().withMessage('Valid job ID is required'),
  body('latitude').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('longitude').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('accuracy').optional().isFloat({ min: 0 }).withMessage('Accuracy must be a positive number'),
  body('heading').optional().isFloat({ min: 0, max: 360 }).withMessage('Heading must be between 0 and 360'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
  body('altitude').optional().isFloat().withMessage('Altitude must be a number')
];

const statusValidation = [
  ...locationValidation,
  body('status').notEmpty().isIn(['arrived', 'on_site', 'departed']).withMessage('Status must be arrived, on_site, or departed')
];

const distanceValidation = [
  body('lat1').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Valid lat1 is required'),
  body('lon1').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Valid lon1 is required'),
  body('lat2').notEmpty().isFloat({ min: -90, max: 90 }).withMessage('Valid lat2 is required'),
  body('lon2').notEmpty().isFloat({ min: -180, max: 180 }).withMessage('Valid lon2 is required')
];

const historyValidation = [
  param('jobId').notEmpty().isUUID().withMessage('Valid job ID is required'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('start_time').optional().isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
  query('end_time').optional().isISO8601().withMessage('End time must be a valid ISO 8601 date')
];

// Tradesperson-only routes (for recording location)
router.post('/start', authenticate, requireTradesperson, locationValidation, locationController.startTracking);
router.post('/update', authenticate, requireTradesperson, locationValidation, locationController.updateLocation);
router.post('/stop', authenticate, requireTradesperson, locationValidation, locationController.stopTracking);
router.post('/status', authenticate, requireTradesperson, statusValidation, locationController.updateJobSiteStatus);
router.get('/active', authenticate, requireTradesperson, locationController.getActiveTracking);

// Routes accessible by both customers and tradespeople (for viewing location)
router.get('/latest/:jobId', authenticate, locationController.getLatestLocation);
router.get('/history/:jobId', authenticate, historyValidation, locationController.getLocationHistory);
router.get('/summary/:jobId', authenticate, locationController.getRouteSummary);

// Utility route
router.post('/calculate-distance', authenticate, distanceValidation, locationController.calculateDistance);

module.exports = router;
