const { User, TradespersonProfile } = require('../models');
const logger = require('../config/logger');

// @desc    Get all pending verifications
// @route   GET /api/v1/admin/verifications/pending
// @access  Private (Admin)
const getPendingVerifications = async (req, res, next) => {
  try {
    const pendingProfiles = await TradespersonProfile.findAll({
      where: { verification_status: 'pending' },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'created_at']
      }],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        count: pendingProfiles.length,
        profiles: pendingProfiles
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tradesperson verification details
// @route   GET /api/v1/admin/verifications/:userId
// @access  Private (Admin)
const getVerificationDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: userId },
      include: [{
        model: User,
        as: 'user',
        attributes: { exclude: ['password_hash'] }
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve tradesperson verification
// @route   POST /api/v1/admin/verifications/:userId/approve
// @access  Private (Admin)
const approveVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    await profile.update({
      verification_status: 'verified',
      verification_notes: notes || 'Approved by admin'
    });

    // Update user verification status
    await User.update(
      { is_verified: true },
      { where: { id: userId } }
    );

    logger.info(`Tradesperson verified by admin ${req.user.id}: ${userId}`);

    // TODO: Send notification to tradesperson

    res.json({
      success: true,
      message: 'Tradesperson verification approved',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject tradesperson verification
// @route   POST /api/v1/admin/verifications/:userId/reject
// @access  Private (Admin)
const rejectVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    await profile.update({
      verification_status: 'rejected',
      verification_notes: reason
    });

    logger.info(`Tradesperson verification rejected by admin ${req.user.id}: ${userId}`);

    // TODO: Send notification to tradesperson with rejection reason

    res.json({
      success: true,
      message: 'Tradesperson verification rejected',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request additional documents
// @route   POST /api/v1/admin/verifications/:userId/request-documents
// @access  Private (Admin)
const requestAdditionalDocuments = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: userId }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    await profile.update({
      verification_notes: `Additional documents requested: ${message}`
    });

    logger.info(`Additional documents requested by admin ${req.user.id} for tradesperson: ${userId}`);

    // TODO: Send notification to tradesperson

    res.json({
      success: true,
      message: 'Document request sent to tradesperson'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (with filtering)
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, isActive, isVerified, page = 1, limit = 50 } = req.query;

    const where = {};
    if (role) where.role = role;
    if (isActive !== undefined) where.is_active = isActive === 'true';
    if (isVerified !== undefined) where.is_verified = isVerified === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user account
// @route   PUT /api/v1/admin/users/:userId/deactivate
// @access  Private (Admin)
const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating other admins
    if (user.role === 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate admin accounts'
      });
    }

    await user.update({ is_active: false });

    logger.info(`User deactivated by admin ${req.user.id}: ${userId} - Reason: ${reason}`);

    // TODO: Send notification to user

    res.json({
      success: true,
      message: 'User account deactivated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reactivate user account
// @route   PUT /api/v1/admin/users/:userId/reactivate
// @access  Private (Admin)
const reactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ is_active: true });

    logger.info(`User reactivated by admin ${req.user.id}: ${userId}`);

    // TODO: Send notification to user

    res.json({
      success: true,
      message: 'User account reactivated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform statistics
// @route   GET /api/v1/admin/stats
// @access  Private (Admin)
const getPlatformStats = async (req, res, next) => {
  try {
    const { Job } = require('../models');

    // User statistics
    const totalUsers = await User.count();
    const totalCustomers = await User.count({ where: { role: 'customer' } });
    const totalTradespeople = await User.count({ where: { role: 'tradesperson' } });
    const verifiedTradespeople = await TradespersonProfile.count({
      where: { verification_status: 'verified' }
    });
    const pendingVerifications = await TradespersonProfile.count({
      where: { verification_status: 'pending' }
    });

    // Job statistics
    const totalJobs = await Job.count();
    const completedJobs = await Job.count({ where: { status: 'completed' } });
    const activeJobs = await Job.count({
      where: { status: ['accepted', 'in_progress'] }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          customers: totalCustomers,
          tradespeople: totalTradespeople,
          verified_tradespeople: verifiedTradespeople
        },
        verifications: {
          pending: pendingVerifications
        },
        jobs: {
          total: totalJobs,
          completed: completedJobs,
          active: activeJobs
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  requestAdditionalDocuments,
  getAllUsers,
  deactivateUser,
  reactivateUser,
  getPlatformStats
};
