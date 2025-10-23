const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getAvailability,
  updateAvailability,
  toggleAvailability,
  setWeeklySchedule,
  addExceptionDate,
  removeExceptionDate,
  getAvailableSlots,
  checkAvailability,
  bookSlot,
  getBookedSlots,
  blockSlot
} = require('../controllers/availabilityController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// Public routes

// Get available slots for a tradesperson
router.get('/slots/:tradespersonId',
  [
    param('tradespersonId').isUUID().withMessage('Valid tradesperson ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required')
  ],
  validate,
  getAvailableSlots
);

// Check availability for specific time
router.post('/check',
  [
    body('tradespersonId').isUUID().withMessage('Valid tradesperson ID is required'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required')
  ],
  validate,
  checkAvailability
);

// Protected routes
router.use(protect);

// Get own availability settings (tradesperson only)
router.get('/',
  authorize('tradesperson'),
  getAvailability
);

// Update availability settings
router.put('/',
  authorize('tradesperson'),
  updateAvailability
);

// Toggle availability status
router.put('/toggle',
  authorize('tradesperson'),
  toggleAvailability
);

// Set weekly schedule
router.put('/schedule',
  authorize('tradesperson'),
  setWeeklySchedule
);

// Add exception date
router.post('/exceptions',
  authorize('tradesperson'),
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
      .isLength({ max: 200 }).withMessage('Reason too long (max 200 characters)')
  ],
  validate,
  addExceptionDate
);

// Remove exception date
router.delete('/exceptions/:date',
  authorize('tradesperson'),
  [
    param('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in YYYY-MM-DD format')
  ],
  validate,
  removeExceptionDate
);

// Get booked slots for own calendar
router.get('/booked',
  authorize('tradesperson'),
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required')
  ],
  validate,
  getBookedSlots
);

// Block time slot
router.post('/block',
  authorize('tradesperson'),
  [
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
      .isLength({ max: 200 }).withMessage('Reason too long (max 200 characters)')
  ],
  validate,
  blockSlot
);

// Book a time slot (customer)
router.post('/book',
  [
    body('tradespersonId').isUUID().withMessage('Valid tradesperson ID is required'),
    body('jobId').isUUID().withMessage('Valid job ID is required'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required')
  ],
  validate,
  bookSlot
);

module.exports = router;
