const { User, TradespersonProfile, Review, Job } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../config/aws');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// @desc    Get tradesperson profile
// @route   GET /api/v1/profiles/tradesperson
// @access  Private (Tradesperson)
const getTradespersonProfile = async (req, res, next) => {
  try {
    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'profile_image_url', 'is_verified']
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

// @desc    Get public tradesperson profile (for customers)
// @route   GET /api/v1/profiles/tradesperson/:id
// @access  Public
const getPublicTradespersonProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'first_name', 'last_name', 'profile_image_url']
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson not found'
      });
    }

    // Only show verified tradespeople to public
    if (profile.verification_status !== 'verified') {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson not available'
      });
    }

    // Get recent reviews
    const reviews = await Review.findAll({
      where: { reviewee_id: id, moderation_status: 'approved' },
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'reviewer',
        attributes: ['first_name', 'last_name', 'profile_image_url']
      }]
    });

    res.json({
      success: true,
      data: {
        profile: {
          ...profile.toJSON(),
          // Hide sensitive information
          stripe_account_id: undefined,
          insurance_documents: undefined,
          verification_notes: undefined
        },
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update tradesperson profile
// @route   PUT /api/v1/profiles/tradesperson
// @access  Private (Tradesperson)
const updateTradespersonProfile = async (req, res, next) => {
  try {
    const {
      businessName,
      bio,
      hourlyRate,
      tradeSpecializations,
      serviceAreas
    } = req.body;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    const updateData = {};
    if (businessName) updateData.business_name = businessName;
    if (bio) updateData.bio = bio;
    if (hourlyRate !== undefined) updateData.hourly_rate = hourlyRate;
    if (tradeSpecializations) updateData.trade_specializations = tradeSpecializations;
    if (serviceAreas) updateData.service_areas = serviceAreas;

    await profile.update(updateData);

    logger.info(`Tradesperson profile updated: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle availability
// @route   PUT /api/v1/profiles/tradesperson/availability
// @access  Private (Tradesperson)
const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    await profile.update({ is_available: isAvailable });

    logger.info(`Availability toggled for tradesperson ${req.user.id}: ${isAvailable}`);

    res.json({
      success: true,
      message: `You are now ${isAvailable ? 'available' : 'unavailable'} for work`,
      data: { is_available: isAvailable }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add certification
// @route   POST /api/v1/profiles/tradesperson/certifications
// @access  Private (Tradesperson)
const addCertification = async (req, res, next) => {
  try {
    const { name, issuer, issueDate, expiryDate, certificateNumber } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Certification document is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Upload document to S3
    const documentUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      'certifications',
      req.file.mimetype
    );

    const newCertification = {
      name,
      issuer,
      issueDate,
      expiryDate,
      certificateNumber,
      documentUrl,
      uploadedAt: new Date()
    };

    const certifications = [...(profile.certifications || []), newCertification];

    await profile.update({ certifications });

    logger.info(`Certification added for tradesperson: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Certification added successfully',
      data: { certifications }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add license
// @route   POST /api/v1/profiles/tradesperson/licenses
// @access  Private (Tradesperson)
const addLicense = async (req, res, next) => {
  try {
    const { licenseNumber, state, issueDate, expiryDate, licenseType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'License document is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Upload document to S3
    const documentUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      'licenses',
      req.file.mimetype
    );

    const newLicense = {
      licenseNumber,
      state,
      issueDate,
      expiryDate,
      licenseType,
      documentUrl,
      uploadedAt: new Date()
    };

    const licenses = [...(profile.licenses || []), newLicense];

    await profile.update({ licenses });

    logger.info(`License added for tradesperson: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'License added successfully',
      data: { licenses }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add insurance document
// @route   POST /api/v1/profiles/tradesperson/insurance
// @access  Private (Tradesperson)
const addInsurance = async (req, res, next) => {
  try {
    const { provider, policyNumber, coverageAmount, expiryDate, insuranceType } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Insurance document is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Upload document to S3
    const documentUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      'insurance',
      req.file.mimetype
    );

    const newInsurance = {
      provider,
      policyNumber,
      coverageAmount,
      expiryDate,
      insuranceType,
      documentUrl,
      uploadedAt: new Date()
    };

    const insuranceDocuments = [...(profile.insurance_documents || []), newInsurance];

    await profile.update({ insurance_documents: insuranceDocuments });

    logger.info(`Insurance document added for tradesperson: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Insurance document added successfully',
      data: { insurance_documents: insuranceDocuments }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add portfolio image
// @route   POST /api/v1/profiles/tradesperson/portfolio
// @access  Private (Tradesperson)
const addPortfolioImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required'
      });
    }

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Check portfolio image limit (max 20 images)
    if ((profile.portfolio_images || []).length >= 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 portfolio images allowed'
      });
    }

    // Upload image to S3
    const imageUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      'portfolio',
      req.file.mimetype
    );

    const portfolioImages = [...(profile.portfolio_images || []), imageUrl];

    await profile.update({ portfolio_images: portfolioImages });

    logger.info(`Portfolio image added for tradesperson: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Portfolio image added successfully',
      data: { portfolio_images: portfolioImages }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete portfolio image
// @route   DELETE /api/v1/profiles/tradesperson/portfolio/:index
// @access  Private (Tradesperson)
const deletePortfolioImage = async (req, res, next) => {
  try {
    const { index } = req.params;

    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    const portfolioImages = [...(profile.portfolio_images || [])];
    const imageIndex = parseInt(index);

    if (imageIndex < 0 || imageIndex >= portfolioImages.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image index'
      });
    }

    const imageUrl = portfolioImages[imageIndex];

    // Delete from S3
    try {
      await deleteFromS3(imageUrl);
    } catch (error) {
      logger.warn('Failed to delete portfolio image from S3:', error);
    }

    portfolioImages.splice(imageIndex, 1);

    await profile.update({ portfolio_images: portfolioImages });

    res.json({
      success: true,
      message: 'Portfolio image deleted successfully',
      data: { portfolio_images: portfolioImages }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tradesperson statistics
// @route   GET /api/v1/profiles/tradesperson/stats
// @access  Private (Tradesperson)
const getTradespersonStats = async (req, res, next) => {
  try {
    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    // Get job statistics
    const totalJobs = await Job.count({
      where: { tradesperson_id: req.user.id }
    });

    const completedJobs = await Job.count({
      where: {
        tradesperson_id: req.user.id,
        status: 'completed'
      }
    });

    const activeJobs = await Job.count({
      where: {
        tradesperson_id: req.user.id,
        status: { [Op.in]: ['accepted', 'in_progress'] }
      }
    });

    // Get earnings (simplified - would need payment records in production)
    const jobs = await Job.findAll({
      where: {
        tradesperson_id: req.user.id,
        status: 'completed'
      },
      attributes: ['final_cost']
    });

    const totalEarnings = jobs.reduce((sum, job) => {
      return sum + (parseFloat(job.final_cost) || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        profile: {
          average_rating: profile.average_rating,
          total_reviews: profile.total_reviews,
          total_jobs_completed: profile.total_jobs_completed,
          verification_status: profile.verification_status
        },
        jobs: {
          total: totalJobs,
          completed: completedJobs,
          active: activeJobs
        },
        earnings: {
          total: totalEarnings.toFixed(2),
          average_per_job: completedJobs > 0 ? (totalEarnings / completedJobs).toFixed(2) : '0.00'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTradespersonProfile,
  getPublicTradespersonProfile,
  updateTradespersonProfile,
  toggleAvailability,
  addCertification,
  addLicense,
  addInsurance,
  addPortfolioImage,
  deletePortfolioImage,
  getTradespersonStats
};
