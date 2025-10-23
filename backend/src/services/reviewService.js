const { Review, Job, User, TradespersonProfile, sequelize } = require('../models');
const { Op } = require('sequelize');
const { uploadToS3, deleteFromS3 } = require('../config/aws');
const { notifyReviewReceived } = require('./notificationService');
const logger = require('../config/logger');

/**
 * Create a review for a completed job
 * @param {object} reviewData - Review data
 * @returns {Promise<Review>} Created review
 */
const createReview = async (reviewData) => {
  try {
    const { job_id, reviewer_id, rating, comment, images } = reviewData;

    // Verify job exists and is completed
    const job = await Job.findByPk(job_id);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Cannot review a job that is not completed');
    }

    // Determine reviewer and reviewee
    let reviewee_id;
    if (job.customer_id === reviewer_id) {
      // Customer reviewing tradesperson
      reviewee_id = job.tradesperson_id;
    } else if (job.tradesperson_id === reviewer_id) {
      // Tradesperson reviewing customer
      reviewee_id = job.customer_id;
    } else {
      throw new Error('User is not part of this job');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      where: {
        job_id,
        reviewer_id
      }
    });

    if (existingReview) {
      throw new Error('You have already reviewed this job');
    }

    // Create review
    const review = await Review.create({
      job_id,
      reviewer_id,
      reviewee_id,
      rating,
      comment,
      images: images || [],
      is_verified: true, // Verified because it's from a completed job
      moderation_status: 'approved' // Auto-approve for now (can add moderation queue)
    });

    // Update tradesperson stats if reviewee is tradesperson
    const reviewee = await User.findByPk(reviewee_id);
    if (reviewee.role === 'tradesperson') {
      await updateTradespersonRating(reviewee_id);
    }

    // Send notification
    const reviewer = await User.findByPk(reviewer_id);
    await notifyReviewReceived(
      reviewee_id,
      `${reviewer.first_name} ${reviewer.last_name}`,
      rating
    );

    // Load full review with relationships
    const fullReview = await Review.findByPk(review.id, {
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
          attributes: ['id', 'trade_category', 'title', 'status']
        }
      ]
    });

    return fullReview;
  } catch (error) {
    logger.error('Error creating review:', error);
    throw error;
  }
};

/**
 * Upload review images to S3
 * @param {Array<Buffer>} imageBuffers - Array of image buffers
 * @param {Array<string>} fileNames - Array of file names
 * @param {Array<string>} mimeTypes - Array of MIME types
 * @returns {Promise<Array<string>>} Array of S3 URLs
 */
const uploadReviewImages = async (imageBuffers, fileNames, mimeTypes) => {
  try {
    const uploadPromises = imageBuffers.map((buffer, index) =>
      uploadToS3(buffer, fileNames[index], 'reviews', mimeTypes[index])
    );

    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    logger.error('Error uploading review images:', error);
    throw error;
  }
};

/**
 * Get reviews for a user (as reviewee)
 * @param {string} userId - User ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Reviews and pagination
 */
const getUserReviews = async (userId, options = {}) => {
  try {
    const {
      limit = 20,
      offset = 0,
      sort = 'recent', // recent, highest, lowest
      minRating = 0,
      maxRating = 5
    } = options;

    const where = {
      reviewee_id: userId,
      moderation_status: 'approved'
    };

    if (minRating > 0 || maxRating < 5) {
      where.rating = {
        [Op.gte]: minRating,
        [Op.lte]: maxRating
      };
    }

    let order;
    switch (sort) {
      case 'highest':
        order = [['rating', 'DESC'], ['created_at', 'DESC']];
        break;
      case 'lowest':
        order = [['rating', 'ASC'], ['created_at', 'DESC']];
        break;
      case 'recent':
      default:
        order = [['created_at', 'DESC']];
    }

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'trade_category', 'title']
        }
      ]
    });

    return {
      reviews,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit
      }
    };
  } catch (error) {
    logger.error('Error fetching user reviews:', error);
    throw error;
  }
};

/**
 * Get reviews given by a user (as reviewer)
 * @param {string} userId - User ID
 * @param {number} limit - Limit
 * @param {number} offset - Offset
 * @returns {Promise<object>} Reviews and pagination
 */
const getReviewsGivenByUser = async (userId, limit = 20, offset = 0) => {
  try {
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        reviewer_id: userId
      },
      limit,
      offset,
      order: [['created_at', 'DESC']],
      include: [
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

    return {
      reviews,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit
      }
    };
  } catch (error) {
    logger.error('Error fetching reviews given by user:', error);
    throw error;
  }
};

/**
 * Calculate rating statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} Rating statistics
 */
const calculateRatingStats = async (userId) => {
  try {
    const reviews = await Review.findAll({
      where: {
        reviewee_id: userId,
        moderation_status: 'approved'
      },
      attributes: ['rating']
    });

    if (reviews.length === 0) {
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_distribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        },
        recent_trend: null
      };
    }

    // Calculate average
    const totalRating = reviews.reduce((sum, r) => sum + parseFloat(r.rating), 0);
    const averageRating = totalRating / reviews.length;

    // Calculate distribution
    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    reviews.forEach(review => {
      const ratingFloor = Math.floor(parseFloat(review.rating));
      distribution[ratingFloor]++;
    });

    // Calculate recent trend (last 10 reviews vs previous)
    let recentTrend = null;
    if (reviews.length >= 20) {
      const recentReviews = reviews.slice(0, 10);
      const olderReviews = reviews.slice(10, 20);

      const recentAvg = recentReviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / recentReviews.length;
      const olderAvg = olderReviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / olderReviews.length;

      const diff = recentAvg - olderAvg;
      if (diff > 0.2) {
        recentTrend = 'improving';
      } else if (diff < -0.2) {
        recentTrend = 'declining';
      } else {
        recentTrend = 'stable';
      }
    }

    return {
      average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      total_reviews: reviews.length,
      rating_distribution: distribution,
      recent_trend: recentTrend
    };
  } catch (error) {
    logger.error('Error calculating rating stats:', error);
    throw error;
  }
};

/**
 * Update tradesperson rating in profile
 * @param {string} userId - User ID
 */
const updateTradespersonRating = async (userId) => {
  try {
    const stats = await calculateRatingStats(userId);

    await TradespersonProfile.update(
      {
        average_rating: stats.average_rating,
        total_reviews: stats.total_reviews
      },
      {
        where: { user_id: userId }
      }
    );

    logger.info(`Updated rating for tradesperson ${userId}: ${stats.average_rating} (${stats.total_reviews} reviews)`);
  } catch (error) {
    logger.error('Error updating tradesperson rating:', error);
    throw error;
  }
};

/**
 * Add response to a review (reviewee responding)
 * @param {string} reviewId - Review ID
 * @param {string} userId - User ID (must be reviewee)
 * @param {string} responseText - Response text
 * @returns {Promise<Review>} Updated review
 */
const addReviewResponse = async (reviewId, userId, responseText) => {
  try {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewee_id !== userId) {
      throw new Error('Only the reviewee can respond to this review');
    }

    if (review.response) {
      throw new Error('Review already has a response');
    }

    review.response = responseText;
    review.response_date = new Date();
    await review.save();

    // Reload with relationships
    const updatedReview = await Review.findByPk(reviewId, {
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
        }
      ]
    });

    return updatedReview;
  } catch (error) {
    logger.error('Error adding review response:', error);
    throw error;
  }
};

/**
 * Update review response
 * @param {string} reviewId - Review ID
 * @param {string} userId - User ID (must be reviewee)
 * @param {string} responseText - Updated response text
 * @returns {Promise<Review>} Updated review
 */
const updateReviewResponse = async (reviewId, userId, responseText) => {
  try {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.reviewee_id !== userId) {
      throw new Error('Only the reviewee can update this response');
    }

    if (!review.response) {
      throw new Error('No response to update. Use addReviewResponse instead.');
    }

    review.response = responseText;
    review.response_date = new Date();
    await review.save();

    return review;
  } catch (error) {
    logger.error('Error updating review response:', error);
    throw error;
  }
};

/**
 * Flag a review for moderation
 * @param {string} reviewId - Review ID
 * @param {string} reason - Reason for flagging
 * @returns {Promise<Review>} Updated review
 */
const flagReview = async (reviewId, reason) => {
  try {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    review.moderation_status = 'flagged';
    review.moderation_notes = reason;
    await review.save();

    logger.info(`Review ${reviewId} flagged for moderation: ${reason}`);

    return review;
  } catch (error) {
    logger.error('Error flagging review:', error);
    throw error;
  }
};

/**
 * Get flagged reviews for moderation
 * @param {number} limit - Limit
 * @param {number} offset - Offset
 * @returns {Promise<object>} Flagged reviews and pagination
 */
const getFlaggedReviews = async (limit = 20, offset = 0) => {
  try {
    const { count, rows: reviews } = await Review.findAndCountAll({
      where: {
        moderation_status: 'flagged'
      },
      limit,
      offset,
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: User,
          as: 'reviewee',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: Job,
          as: 'job',
          attributes: ['id', 'trade_category', 'title']
        }
      ]
    });

    return {
      reviews,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count > offset + limit
      }
    };
  } catch (error) {
    logger.error('Error fetching flagged reviews:', error);
    throw error;
  }
};

/**
 * Moderate a review (admin action)
 * @param {string} reviewId - Review ID
 * @param {string} action - Action: 'approve', 'reject'
 * @param {string} notes - Admin notes
 * @returns {Promise<Review>} Updated review
 */
const moderateReview = async (reviewId, action, notes) => {
  try {
    const review = await Review.findByPk(reviewId);

    if (!review) {
      throw new Error('Review not found');
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid moderation action');
    }

    review.moderation_status = action === 'approve' ? 'approved' : 'rejected';
    review.moderation_notes = notes;
    await review.save();

    // Update ratings if status changed to approved
    if (action === 'approve') {
      const reviewee = await User.findByPk(review.reviewee_id);
      if (reviewee.role === 'tradesperson') {
        await updateTradespersonRating(review.reviewee_id);
      }
    }

    logger.info(`Review ${reviewId} moderated: ${action} - ${notes}`);

    return review;
  } catch (error) {
    logger.error('Error moderating review:', error);
    throw error;
  }
};

/**
 * Check if user can review a job
 * @param {string} jobId - Job ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Can review and reason
 */
const canUserReviewJob = async (jobId, userId) => {
  try {
    const job = await Job.findByPk(jobId);

    if (!job) {
      return { canReview: false, reason: 'Job not found' };
    }

    if (job.status !== 'completed') {
      return { canReview: false, reason: 'Job is not completed yet' };
    }

    if (job.customer_id !== userId && job.tradesperson_id !== userId) {
      return { canReview: false, reason: 'You are not part of this job' };
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      where: {
        job_id: jobId,
        reviewer_id: userId
      }
    });

    if (existingReview) {
      return { canReview: false, reason: 'You have already reviewed this job' };
    }

    return { canReview: true, reason: null };
  } catch (error) {
    logger.error('Error checking if user can review job:', error);
    throw error;
  }
};

/**
 * Get jobs pending review for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Jobs pending review
 */
const getPendingReviewJobs = async (userId) => {
  try {
    // Get all completed jobs where user is involved
    const jobs = await Job.findAll({
      where: {
        [Op.or]: [
          { customer_id: userId },
          { tradesperson_id: userId }
        ],
        status: 'completed'
      },
      order: [['updated_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        },
        {
          model: User,
          as: 'tradesperson',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ]
    });

    // Filter out jobs already reviewed by this user
    const pendingJobs = [];
    for (const job of jobs) {
      const existingReview = await Review.findOne({
        where: {
          job_id: job.id,
          reviewer_id: userId
        }
      });

      if (!existingReview) {
        pendingJobs.push(job);
      }
    }

    return pendingJobs;
  } catch (error) {
    logger.error('Error fetching pending review jobs:', error);
    throw error;
  }
};

module.exports = {
  createReview,
  uploadReviewImages,
  getUserReviews,
  getReviewsGivenByUser,
  calculateRatingStats,
  updateTradespersonRating,
  addReviewResponse,
  updateReviewResponse,
  flagReview,
  getFlaggedReviews,
  moderateReview,
  canUserReviewJob,
  getPendingReviewJobs
};
