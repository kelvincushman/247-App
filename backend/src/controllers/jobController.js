const { Job, User, TradespersonProfile, CustomerProfile, sequelize } = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

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

    // TODO: Trigger job matching algorithm
    // TODO: Send notifications to matched tradespeople

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

    // TODO: Send notification to customer

    res.json({
      success: true,
      message: 'Job accepted successfully',
      data: { job }
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

    // TODO: Send notification to customer

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
