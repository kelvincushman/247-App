const { Job, User, TradespersonProfile, CustomerProfile, sequelize } = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const notificationService = require('../services/notificationService');
const messagingService = require('../services/messagingService');

// @desc    Create a new job
// @route   POST /api/v1/jobs
// @access  Private (Customer)
const createJob = async (req, res, next) => {
  try {
    const {
      tradeCategory,
      title,
      description,
      images,
      location,
      scheduledTime,
      urgency,
      estimatedDuration
    } = req.body;

    const job = await Job.create({
      customer_id: req.user.id,
      trade_category: tradeCategory,
      title,
      description,
      images: images || [],
      location,
      scheduled_time: scheduledTime || null,
      urgency: urgency || 'medium',
      estimated_duration: estimatedDuration,
      status: 'requested'
    });

    // Update customer's job count
    await CustomerProfile.increment('total_jobs_requested', {
      where: { user_id: req.user.id }
    });

    logger.info(`Job created by customer ${req.user.id}: ${job.id}`);

    // Get Socket.io instance
    const io = req.app.get('io');

    // Send system message to customer
    await messagingService.sendSystemMessage(
      req.user.id,
      job.id,
      'Your job request has been created. We are finding the best tradespeople for you!',
      io
    );

    // Emit real-time event
    if (io) {
      io.emitToUser(req.user.id, 'job_created', {
        job_id: job.id,
        status: 'requested'
      });
    }

    // TODO: Trigger job matching algorithm to find and notify tradespeople

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all jobs for current user
// @route   GET /api/v1/jobs
// @access  Private
const getJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    // Filter by user role
    if (req.user.role === 'customer') {
      where.customer_id = req.user.id;
    } else if (req.user.role === 'tradesperson') {
      where.tradesperson_id = req.user.id;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone']
        },
        {
          model: User,
          as: 'tradesperson',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
        jobs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job by ID
// @route   GET /api/v1/jobs/:id
// @access  Private
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone', 'email']
        },
        {
          model: User,
          as: 'tradesperson',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone']
        }
      ]
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      job.customer_id !== req.user.id &&
      job.tradesperson_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job'
      });
    }

    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search available jobs for tradespeople
// @route   GET /api/v1/jobs/available
// @access  Private (Tradesperson)
const getAvailableJobs = async (req, res, next) => {
  try {
    const { tradeCategory, urgency, location, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get tradesperson profile to check specializations and service areas
    const tradespersonProfile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!tradespersonProfile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Build query
    let where = {
      status: 'requested',
      tradesperson_id: null // Unassigned jobs only
    };

    // Filter by trade category (must match tradesperson's specializations)
    if (tradeCategory) {
      where.trade_category = tradeCategory;
    } else {
      // Show only jobs matching tradesperson's specializations
      where.trade_category = {
        [Op.in]: tradespersonProfile.trade_specializations
      };
    }

    // Filter by urgency
    if (urgency) {
      where.urgency = urgency;
    }

    // TODO: Filter by location/service areas
    // This would require geographic calculations

    const { count, rows: jobs } = await Job.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [
        ['urgency', 'DESC'], // Prioritize urgent jobs
        ['created_at', 'ASC'] // First come, first served
      ],
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
        jobs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a job
// @route   POST /api/v1/jobs/:id/accept
// @access  Private (Tradesperson)
const acceptJob = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const job = await Job.findByPk(id, { transaction });

    if (!job) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check if job is still available
    if (job.status !== 'requested') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Job is no longer available'
      });
    }

    if (job.tradesperson_id && job.tradesperson_id !== req.user.id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Job has already been accepted by another tradesperson'
      });
    }

    // Update job
    await job.update({
      tradesperson_id: req.user.id,
      status: 'accepted'
    }, { transaction });

    await transaction.commit();

    logger.info(`Job ${job.id} accepted by tradesperson ${req.user.id}`);

    // Get Socket.io instance
    const io = req.app.get('io');

    // Load full job details with relationships
    const jobWithDetails = await Job.findByPk(job.id, {
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone']
        },
        {
          model: User,
          as: 'tradesperson',
          attributes: ['id', 'first_name', 'last_name', 'profile_image_url', 'phone']
        }
      ]
    });

    // Get tradesperson profile
    const tradespersonProfile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    // Send notification to customer
    await notificationService.notifyJobAccepted(
      job.customer_id,
      {
        id: job.id,
        tradeCategory: job.trade_category
      },
      {
        id: req.user.id,
        businessName: tradespersonProfile?.business_name || `${req.user.first_name} ${req.user.last_name}`
      }
    );

    // Send system message
    await messagingService.sendSystemMessage(
      job.customer_id,
      job.id,
      `${tradespersonProfile?.business_name || req.user.first_name} has accepted your job request!`,
      io
    );

    // Emit real-time event to both parties
    if (io) {
      io.emitToUser(job.customer_id, 'job_accepted', {
        job_id: job.id,
        tradesperson_id: req.user.id,
        status: 'accepted'
      });

      io.emitToJob(job.id, 'job_status_changed', {
        job_id: job.id,
        status: 'accepted',
        updated_by: req.user.id
      });
    }

    res.json({
      success: true,
      message: 'Job accepted successfully',
      data: { job: jobWithDetails }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// @desc    Decline a job
// @route   POST /api/v1/jobs/:id/decline
// @access  Private (Tradesperson)
const declineJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Log the decline (could store in a separate table for analytics)
    logger.info(`Job ${job.id} declined by tradesperson ${req.user.id}: ${reason || 'No reason provided'}`);

    // TODO: Continue matching with other tradespeople
    // TODO: Notify customer if no matches found

    res.json({
      success: true,
      message: 'Job declined'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job status
// @route   PUT /api/v1/jobs/:id/status
// @access  Private (Tradesperson)
const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.tradesperson_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    // Validate status transitions
    const validTransitions = {
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [], // Cannot change from completed
      cancelled: [] // Cannot change from cancelled
    };

    if (!validTransitions[job.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${job.status} to ${status}`
      });
    }

    const updateData = { status };

    // Set timestamps
    if (status === 'in_progress' && !job.actual_start_time) {
      updateData.actual_start_time = new Date();
    } else if (status === 'completed' && !job.actual_end_time) {
      updateData.actual_end_time = new Date();

      // Update tradesperson's completed jobs count
      await TradespersonProfile.increment('total_jobs_completed', {
        where: { user_id: req.user.id }
      });
    }

    if (notes) {
      updateData.notes = notes;
    }

    await job.update(updateData);

    logger.info(`Job ${job.id} status updated to ${status} by tradesperson ${req.user.id}`);

    // Get Socket.io instance
    const io = req.app.get('io');

    // Get tradesperson profile
    const tradespersonProfile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    const tradespersonName = tradespersonProfile?.business_name || `${req.user.first_name} ${req.user.last_name}`;

    // Send notifications based on status
    if (status === 'in_progress') {
      await notificationService.notifyJobStarted(
        job.customer_id,
        { id: job.id },
        { id: req.user.id, businessName: tradespersonName }
      );

      await messagingService.sendSystemMessage(
        job.customer_id,
        job.id,
        `${tradespersonName} has started working on your job.`,
        io
      );
    } else if (status === 'completed') {
      // Notify customer of completion
      await notificationService.notifyJobCompleted(
        job.customer_id,
        { id: job.id }
      );

      await messagingService.sendSystemMessage(
        job.customer_id,
        job.id,
        'Your job has been marked as complete! Please review the work and confirm completion.',
        io
      );

      // Send review prompts to both parties
      await notificationService.sendNotification(
        job.customer_id,
        {
          type: 'system',
          title: '⭐ Leave a Review',
          message: `How was your experience with ${tradespersonName}? Share your feedback to help others.`,
          priority: 'medium',
          action_url: `/jobs/${job.id}/review`,
          data: {
            job_id: job.id,
            tradesperson_id: req.user.id
          }
        },
        true
      );

      await notificationService.sendNotification(
        req.user.id,
        {
          type: 'system',
          title: '⭐ Leave a Review',
          message: 'How was your experience with this customer? Your feedback is valuable.',
          priority: 'medium',
          action_url: `/jobs/${job.id}/review`,
          data: {
            job_id: job.id,
            customer_id: job.customer_id
          }
        },
        true
      );
    } else if (status === 'cancelled') {
      await notificationService.notifyJobCancelled(
        job.customer_id,
        { id: job.id },
        notes || 'Job cancelled by tradesperson'
      );

      await messagingService.sendSystemMessage(
        job.customer_id,
        job.id,
        `Job cancelled: ${notes || 'No reason provided'}`,
        io
      );
    }

    // Emit real-time event
    if (io) {
      io.emitToJob(job.id, 'job_status_changed', {
        job_id: job.id,
        status,
        updated_by: req.user.id,
        timestamp: new Date()
      });

      io.emitToUser(job.customer_id, 'job_updated', {
        job_id: job.id,
        status
      });
    }

    res.json({
      success: true,
      message: 'Job status updated successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel job
// @route   POST /api/v1/jobs/:id/cancel
// @access  Private (Customer or Tradesperson)
const cancelJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.customer_id !== req.user.id && job.tradesperson_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this job'
      });
    }

    // Cannot cancel completed jobs
    if (job.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed job'
      });
    }

    await job.update({
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_by: req.user.id
    });

    logger.info(`Job ${job.id} cancelled by user ${req.user.id}`);

    // TODO: Handle refunds if payment was made
    // TODO: Send notification to other party

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update job estimate
// @route   PUT /api/v1/jobs/:id/estimate
// @access  Private (Tradesperson)
const updateJobEstimate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estimatedCost, estimatedDuration, notes } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.tradesperson_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this job'
      });
    }

    const updateData = {};
    if (estimatedCost !== undefined) updateData.estimated_cost = estimatedCost;
    if (estimatedDuration !== undefined) updateData.estimated_duration = estimatedDuration;
    if (notes) updateData.notes = notes;

    await job.update(updateData);

    logger.info(`Job ${job.id} estimate updated by tradesperson ${req.user.id}`);

    // TODO: Notify customer of estimate

    res.json({
      success: true,
      message: 'Job estimate updated successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete job and set final cost
// @route   PUT /api/v1/jobs/:id/complete
// @access  Private (Tradesperson)
const completeJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { finalCost, notes } = req.body;

    if (!finalCost) {
      return res.status(400).json({
        success: false,
        message: 'Final cost is required'
      });
    }

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Check authorization
    if (job.tradesperson_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this job'
      });
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Job must be in progress to complete'
      });
    }

    await job.update({
      status: 'completed',
      final_cost: finalCost,
      actual_end_time: new Date(),
      notes: notes || job.notes
    });

    // Update tradesperson stats
    await TradespersonProfile.increment('total_jobs_completed', {
      where: { user_id: req.user.id }
    });

    logger.info(`Job ${job.id} completed by tradesperson ${req.user.id} with final cost ${finalCost}`);

    // TODO: Process payment
    // TODO: Notify customer to review

    res.json({
      success: true,
      message: 'Job completed successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
