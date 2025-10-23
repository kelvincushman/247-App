const express = require('express');
const { body, param } = require('express-validator');
const {
  createReview,
  getUserReviews,
  getMyReviews,
  getUserRatingStats,
  addResponse,
  updateResponse,
  flagReview,
  getFlaggedReviews,
  moderateReview,
  canReviewJob,
  getPendingReviews,
  getReviewById
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const validate = require('../middleware/validator');

const router = express.Router();

// Public routes

// Get reviews for a specific user
router.get('/user/:userId',
  [
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validate,
  getUserReviews
);

// Get rating statistics for a user
router.get('/user/:userId/stats',
  [
    param('userId').isUUID().withMessage('Valid user ID is required')
  ],
  validate,
  getUserRatingStats
);

// Get review by ID
router.get('/:reviewId',
  [
    param('reviewId').isUUID().withMessage('Valid review ID is required')
  ],
  validate,
  getReviewById
);

// Protected routes
router.use(protect);

// Create a review
router.post('/',
  uploadMultiple('images', 5), // Allow up to 5 images
  [
    body('job_id').isUUID().withMessage('Valid job ID is required'),
    body('rating').isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
    body('comment').optional().trim().isLength({ max: 2000 }).withMessage('Comment too long (max 2000 characters)')
  ],
  validate,
  createReview
);

// Get reviews given by current user
router.get('/my-reviews', getMyReviews);

// Get jobs pending review
router.get('/pending', getPendingReviews);

// Check if user can review a job
router.get('/can-review/:jobId',
  [
    param('jobId').isUUID().withMessage('Valid job ID is required')
  ],
  validate,
  canReviewJob
);

// Add response to a review
router.post('/:reviewId/response',
  [
    param('reviewId').isUUID().withMessage('Valid review ID is required'),
    body('response').trim().notEmpty().withMessage('Response is required')
      .isLength({ max: 1000 }).withMessage('Response too long (max 1000 characters)')
  ],
  validate,
  addResponse
);

// Update response to a review
router.put('/:reviewId/response',
  [
    param('reviewId').isUUID().withMessage('Valid review ID is required'),
    body('response').trim().notEmpty().withMessage('Response is required')
      .isLength({ max: 1000 }).withMessage('Response too long (max 1000 characters)')
  ],
  validate,
  updateResponse
);

// Flag a review for moderation
router.post('/:reviewId/flag',
  [
    param('reviewId').isUUID().withMessage('Valid review ID is required'),
    body('reason').trim().notEmpty().withMessage('Reason is required')
      .isLength({ max: 500 }).withMessage('Reason too long (max 500 characters)')
  ],
  validate,
  flagReview
);

// Admin routes
router.get('/flagged',
  authorize('admin'),
  getFlaggedReviews
);

router.put('/:reviewId/moderate',
  authorize('admin'),
  [
    param('reviewId').isUUID().withMessage('Valid review ID is required'),
    body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long (max 500 characters)')
  ],
  validate,
  moderateReview
);

module.exports = router;
