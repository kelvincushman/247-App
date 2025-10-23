const { CustomerProfile, TradespersonProfile, User } = require('../models');
const {
  createCustomer,
  createConnectAccount,
  createAccountLink,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  listPaymentMethods,
  detachPaymentMethod,
  getAccountBalance
} = require('../config/stripe');
const {
  createJobPaymentHold,
  captureJobPayment,
  cancelJobPayment,
  refundJobPayment,
  getJobPaymentSummary
} = require('../services/paymentService');
const logger = require('../config/logger');

// @desc    Set up Stripe customer
// @route   POST /api/v1/payments/setup-customer
// @access  Private (Customer)
const setupStripeCustomer = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    if (profile.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe customer already set up'
      });
    }

    const stripeCustomerId = await createCustomer({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role
    });

    await profile.update({ stripe_customer_id: stripeCustomerId });

    logger.info(`Stripe customer set up for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Stripe customer account created',
      data: { stripeCustomerId }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add payment method
// @route   POST /api/v1/payments/payment-methods
// @access  Private (Customer)
const addPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile || !profile.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe customer not set up. Please set up your payment account first.'
      });
    }

    // Attach payment method to customer
    await attachPaymentMethod(profile.stripe_customer_id, paymentMethodId);

    // If this is the first payment method, set it as default
    if (!profile.default_payment_method) {
      await setDefaultPaymentMethod(profile.stripe_customer_id, paymentMethodId);
      await profile.update({ default_payment_method: paymentMethodId });
    }

    logger.info(`Payment method added for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Payment method added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment methods
// @route   GET /api/v1/payments/payment-methods
// @access  Private (Customer)
const getPaymentMethods = async (req, res, next) => {
  try {
    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile || !profile.stripe_customer_id) {
      return res.json({
        success: true,
        data: { paymentMethods: [] }
      });
    }

    const paymentMethods = await listPaymentMethods(profile.stripe_customer_id);

    res.json({
      success: true,
      data: {
        paymentMethods,
        defaultPaymentMethod: profile.default_payment_method
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove payment method
// @route   DELETE /api/v1/payments/payment-methods/:paymentMethodId
// @access  Private (Customer)
const removePaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    await detachPaymentMethod(paymentMethodId);

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    // If removed method was default, clear it
    if (profile.default_payment_method === paymentMethodId) {
      await profile.update({ default_payment_method: null });
    }

    logger.info(`Payment method removed for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Payment method removed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default payment method
// @route   PUT /api/v1/payments/payment-methods/:paymentMethodId/default
// @access  Private (Customer)
const setDefaultPayment = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.params;

    const profile = await CustomerProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile || !profile.stripe_customer_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe customer not set up'
      });
    }

    await setDefaultPaymentMethod(profile.stripe_customer_id, paymentMethodId);
    await profile.update({ default_payment_method: paymentMethodId });

    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set up Stripe Connect account for tradesperson
// @route   POST /api/v1/payments/setup-connect
// @access  Private (Tradesperson)
const setupStripeConnect = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tradesperson profile not found'
      });
    }

    if (profile.stripe_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Connect account already set up'
      });
    }

    const stripeAccountId = await createConnectAccount({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    });

    await profile.update({ stripe_account_id: stripeAccountId });

    // Create onboarding link
    const refreshUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/payments/connect/refresh`;
    const returnUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/payments/connect/return`;

    const onboardingUrl = await createAccountLink(stripeAccountId, refreshUrl, returnUrl);

    logger.info(`Stripe Connect account created for user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Stripe Connect account created',
      data: {
        stripeAccountId,
        onboardingUrl
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Connect account balance
// @route   GET /api/v1/payments/balance
// @access  Private (Tradesperson)
const getBalance = async (req, res, next) => {
  try {
    const profile = await TradespersonProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile || !profile.stripe_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Stripe Connect account not set up'
      });
    }

    const balance = await getAccountBalance(profile.stripe_account_id);

    res.json({
      success: true,
      data: { balance }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create payment hold for job
// @route   POST /api/v1/payments/jobs/:jobId/hold
// @access  Private (Customer)
const holdJobPayment = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await createJobPaymentHold(jobId, req.user.id);

    res.json({
      success: true,
      message: 'Payment hold created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Capture payment for completed job
// @route   POST /api/v1/payments/jobs/:jobId/capture
// @access  Private (Tradesperson)
const captureJobPaymentHandler = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { finalCost } = req.body;

    const result = await captureJobPayment(jobId, finalCost);

    res.json({
      success: true,
      message: 'Payment captured successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel job payment
// @route   POST /api/v1/payments/jobs/:jobId/cancel
// @access  Private (Customer or Tradesperson)
const cancelJobPaymentHandler = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await cancelJobPayment(jobId);

    res.json({
      success: true,
      message: 'Payment cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refund job payment
// @route   POST /api/v1/payments/jobs/:jobId/refund
// @access  Private (Admin or Customer with valid reason)
const refundJobPaymentHandler = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { amount, reason } = req.body;

    const result = await refundJobPayment(jobId, amount, reason);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get job payment summary
// @route   GET /api/v1/payments/jobs/:jobId
// @access  Private
const getJobPayment = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const summary = await getJobPaymentSummary(jobId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setupStripeCustomer,
  addPaymentMethod,
  getPaymentMethods,
  removePaymentMethod,
  setDefaultPayment,
  setupStripeConnect,
  getBalance,
  holdJobPayment,
  captureJobPaymentHandler,
  cancelJobPaymentHandler,
  refundJobPaymentHandler,
  getJobPayment
};
