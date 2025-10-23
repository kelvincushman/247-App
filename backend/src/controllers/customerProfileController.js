const { User, CustomerProfile } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../config/aws');
const logger = require('../config/logger');

// @desc    Get customer profile
// @route   GET /api/v1/profiles/customer
// @access  Private (Customer)
const getCustomerProfile = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'profile_image_url']
      }]
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
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

// @desc    Update customer profile
// @route   PUT /api/v1/profiles/customer
// @access  Private (Customer)
const updateCustomerProfile = async (req, res, next) => {
  try {
    const { notificationPreferences } = req.body;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    // Update notification preferences if provided
    if (notificationPreferences) {
      await profile.update({
        notification_preferences: {
          ...profile.notification_preferences,
          ...notificationPreferences
        }
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add address to customer profile
// @route   POST /api/v1/profiles/customer/addresses
// @access  Private (Customer)
const addAddress = async (req, res, next) => {
  try {
    const { label, street, city, state, zipCode, lat, lng } = req.body;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    const newAddress = {
      label,
      street,
      city,
      state,
      zipCode,
      coordinates: { lat, lng }
    };

    const addresses = [...(profile.addresses || []), newAddress];

    await profile.update({ addresses });

    logger.info(`Address added for customer: ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: {
        addresses,
        addressIndex: addresses.length - 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/v1/profiles/customer/addresses/:index
// @access  Private (Customer)
const updateAddress = async (req, res, next) => {
  try {
    const { index } = req.params;
    const { label, street, city, state, zipCode, lat, lng } = req.body;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    const addresses = [...(profile.addresses || [])];
    const addressIndex = parseInt(index);

    if (addressIndex < 0 || addressIndex >= addresses.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    addresses[addressIndex] = {
      label,
      street,
      city,
      state,
      zipCode,
      coordinates: { lat, lng }
    };

    await profile.update({ addresses });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: { addresses }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/v1/profiles/customer/addresses/:index
// @access  Private (Customer)
const deleteAddress = async (req, res, next) => {
  try {
    const { index } = req.params;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    const addresses = [...(profile.addresses || [])];
    const addressIndex = parseInt(index);

    if (addressIndex < 0 || addressIndex >= addresses.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    addresses.splice(addressIndex, 1);

    // Update default address index if necessary
    let defaultIndex = profile.default_address_index;
    if (defaultIndex >= addresses.length) {
      defaultIndex = Math.max(0, addresses.length - 1);
    }

    await profile.update({
      addresses,
      default_address_index: defaultIndex
    });

    res.json({
      success: true,
      message: 'Address deleted successfully',
      data: { addresses }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default address
// @route   PUT /api/v1/profiles/customer/addresses/:index/default
// @access  Private (Customer)
const setDefaultAddress = async (req, res, next) => {
  try {
    const { index } = req.params;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    const addressIndex = parseInt(index);

    if (addressIndex < 0 || addressIndex >= (profile.addresses || []).length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address index'
      });
    }

    await profile.update({ default_address_index: addressIndex });

    res.json({
      success: true,
      message: 'Default address set successfully',
      data: { default_address_index: addressIndex }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile image
// @route   POST /api/v1/profiles/customer/image
// @access  Private (Customer)
const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Delete old image if exists
    if (user.profile_image_url) {
      try {
        await deleteFromS3(user.profile_image_url);
      } catch (error) {
        logger.warn('Failed to delete old profile image:', error);
      }
    }

    // Upload new image to S3
    const imageUrl = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      'profiles',
      req.file.mimetype
    );

    // Update user profile image URL
    await user.update({ profile_image_url: imageUrl });

    logger.info(`Profile image uploaded for user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { profile_image_url: imageUrl }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  uploadProfileImage
};
