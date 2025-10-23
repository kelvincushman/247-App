const express = require('express');
const { body } = require('express-validator');
const {
  createJob,
  getJobs,
  getJobById,
  getAvailableJobs,
  acceptJob,
  declineJob,
  updateJobStatus,
  cancelJob,
  updateJobEstimate,
  completeJob
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Job creation validation
const createJobValidation = [
  body('tradeCategory').notEmpty().withMessage('Trade category is required'),
  body('title').notEmpty().withMessage('Job title is required'),
  body('description').notEmpty().withMessage('Job description is required'),
  body('location').isObject().withMessage('Location object is required'),
  body('location.street').notEmpty().withMessage('Street address is required'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.state').notEmpty().withMessage('State is required'),
  body('location.zipCode').notEmpty().withMessage('Zip code is required'),
  body('location.lat').isFloat().withMessage('Latitude is required'),
  body('location.lng').isFloat().withMessage('Longitude is required'),
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'emergency'])
    .withMessage('Invalid urgency level'),
  body('scheduledTime')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid date')
];

// Status update validation
const statusUpdateValidation = [
  body('status')
    .isIn(['in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid status')
];

// Estimate validation
const estimateValidation = [
  body('estimatedCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated cost must be a positive number'),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated duration must be a positive integer')
];

// Complete job validation
const completeJobValidation = [
  body('finalCost')
    .isFloat({ min: 0 })
    .withMessage('Final cost is required and must be a positive number')
];

// Cancel job validation
const cancelJobValidation = [
  body('reason').notEmpty().withMessage('Cancellation reason is required')
];

// Routes

// Create job (customers only)
router.post('/',
  authorize('customer'),
  createJobValidation,
  validate,
  createJob
);

// Get all jobs for current user
router.get('/', getJobs);

// Get available jobs (tradespeople only)
router.get('/available',
  authorize('tradesperson'),
  getAvailableJobs
);

// Get job by ID
router.get('/:id', getJobById);

// Accept job (tradespeople only)
router.post('/:id/accept',
  authorize('tradesperson'),
  acceptJob
);

// Decline job (tradespeople only)
router.post('/:id/decline',
  authorize('tradesperson'),
  declineJob
);

// Update job status (tradespeople only)
router.put('/:id/status',
  authorize('tradesperson'),
  statusUpdateValidation,
  validate,
  updateJobStatus
);

// Cancel job (customer or tradesperson)
router.post('/:id/cancel',
  cancelJobValidation,
  validate,
  cancelJob
);

// Update job estimate (tradespeople only)
router.put('/:id/estimate',
  authorize('tradesperson'),
  estimateValidation,
  validate,
  updateJobEstimate
);

// Complete job (tradespeople only)
router.put('/:id/complete',
  authorize('tradesperson'),
  completeJobValidation,
  validate,
  completeJob
);

module.exports = router;
