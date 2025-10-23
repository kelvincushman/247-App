const reviewService = require('../services/reviewService');
const logger = require('../config/logger');

/**
 * @desc    Create a review for a completed job
 * @route   POST /api/v1/reviews
 * @access  Private
 */
const createReview = async (req, res) => {
  try {
    const { job_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;

    // Check if user can review this job
    const canReview = await reviewService.canUserReviewJob(job_id, reviewer_id);
    if (!canReview.canReview) {
      return res.status(400).json({
        success: false,
        error: canReview.reason
      });
    }

    // Handle image uploads if present
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const buffers = req.files.map(f => f.buffer);
      const names = req.files.map(f => f.originalname);
      const mimeTypes = req.files.map(f => f.mimetype);

      imageUrls = await reviewService.uploadReviewImages(buffers, names, mimeTypes);
    }

    // Create review
    const review = await reviewService.createReview({
      job_id,
      reviewer_id,
      rating,
      comment,
      images: imageUrls
    });

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error in createReview controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get reviews for a user (as reviewee)
 * @route   GET /api/v1/reviews/user/:userId
 * @access  Public
 */
const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 20,
      offset = 0,
      sort = 'recent',
      minRating = 0,
      maxRating = 5
    } = req.query;

    const result = await reviewService.getUserReviews(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
      minRating: parseFloat(minRating),
      maxRating: parseFloat(maxRating)
    });

    res.status(200).json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error in getUserReviews controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get reviews given by current user
 * @route   GET /api/v1/reviews/my-reviews
 * @access  Private
 */
const getMyReviews = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await reviewService.getReviewsGivenByUser(userId, limit, offset);

    res.status(200).json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error in getMyReviews controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get rating statistics for a user
 * @route   GET /api/v1/reviews/user/:userId/stats
 * @access  Public
 */
const getUserRatingStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await reviewService.calculateRatingStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error in getUserRatingStats controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Add response to a review
 * @route   POST /api/v1/reviews/:reviewId/response
 * @access  Private
 */
const addResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    const review = await reviewService.addReviewResponse(reviewId, userId, response);

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error in addResponse controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Update response to a review
 * @route   PUT /api/v1/reviews/:reviewId/response
 * @access  Private
 */
const updateResponse = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    const review = await reviewService.updateReviewResponse(reviewId, userId, response);

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error in updateResponse controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Flag a review for moderation
 * @route   POST /api/v1/reviews/:reviewId/flag
 * @access  Private
 */
const flagReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await reviewService.flagReview(reviewId, reason);

    res.status(200).json({
      success: true,
      message: 'Review flagged for moderation',
      data: review
    });
  } catch (error) {
    logger.error('Error in flagReview controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get flagged reviews (admin only)
 * @route   GET /api/v1/reviews/flagged
 * @access  Private (Admin)
 */
const getFlaggedReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await reviewService.getFlaggedReviews(limit, offset);

    res.status(200).json({
      success: true,
      data: result.reviews,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error in getFlaggedReviews controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Moderate a review (admin only)
 * @route   PUT /api/v1/reviews/:reviewId/moderate
 * @access  Private (Admin)
 */
const moderateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { action, notes } = req.body;

    const review = await reviewService.moderateReview(reviewId, action, notes);

    res.status(200).json({
      success: true,
      message: `Review ${action}ed successfully`,
      data: review
    });
  } catch (error) {
    logger.error('Error in moderateReview controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Check if user can review a job
 * @route   GET /api/v1/reviews/can-review/:jobId
 * @access  Private
 */
const canReviewJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const result = await reviewService.canUserReviewJob(jobId, userId);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in canReviewJob controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get jobs pending review for current user
 * @route   GET /api/v1/reviews/pending
 * @access  Private
 */
const getPendingReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const jobs = await reviewService.getPendingReviewJobs(userId);

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error('Error in getPendingReviews controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * @desc    Get review by ID
 * @route   GET /api/v1/reviews/:reviewId
 * @access  Public
 */
const getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { Review, User, Job } = require('../models');

    const review = await Review.findByPk(reviewId, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: User,
          as: 'reviewee',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'trade_category', 'title']
        }
      ]
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Error in getReviewById controller:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
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
};
