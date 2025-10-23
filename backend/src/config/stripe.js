const Stripe = require('stripe');
const logger = require('./logger');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

/**
 * Create Stripe customer
 * @param {Object} userData - User data
 * @returns {Promise<string>} Stripe customer ID
 */
const createCustomer = async (userData) => {
  try {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: `${userData.first_name} ${userData.last_name}`,
      phone: userData.phone,
      metadata: {
        user_id: userData.id,
        role: userData.role
      }
    });

    logger.info(`Stripe customer created: ${customer.id}`);
    return customer.id;
  } catch (error) {
    logger.error('Error creating Stripe customer:', error);
    throw error;
  }
};

/**
 * Create Stripe Connect account for tradesperson
 * @param {Object} userData - User data
 * @returns {Promise<string>} Stripe account ID
 */
const createConnectAccount = async (userData) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: userData.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      metadata: {
        user_id: userData.id
      }
    });

    logger.info(`Stripe Connect account created: ${account.id}`);
    return account.id;
  } catch (error) {
    logger.error('Error creating Stripe Connect account:', error);
    throw error;
  }
};

/**
 * Create account link for Connect onboarding
 * @param {string} accountId - Stripe account ID
 * @param {string} refreshUrl - URL to redirect on refresh
 * @param {string} returnUrl - URL to redirect on completion
 * @returns {Promise<string>} Account link URL
 */
const createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    return accountLink.url;
  } catch (error) {
    logger.error('Error creating account link:', error);
    throw error;
  }
};

/**
 * Add payment method to customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Payment method
 */
const attachPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });

    logger.info(`Payment method attached: ${paymentMethodId} to customer ${customerId}`);
    return paymentMethod;
  } catch (error) {
    logger.error('Error attaching payment method:', error);
    throw error;
  }
};

/**
 * Set default payment method for customer
 * @param {string} customerId - Stripe customer ID
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Updated customer
 */
const setDefaultPaymentMethod = async (customerId, paymentMethodId) => {
  try {
    const customer = await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    logger.info(`Default payment method set for customer ${customerId}`);
    return customer;
  } catch (error) {
    logger.error('Error setting default payment method:', error);
    throw error;
  }
};

/**
 * List customer payment methods
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Array>} Payment methods
 */
const listPaymentMethods = async (customerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    return paymentMethods.data;
  } catch (error) {
    logger.error('Error listing payment methods:', error);
    throw error;
  }
};

/**
 * Detach payment method
 * @param {string} paymentMethodId - Stripe payment method ID
 * @returns {Promise<Object>} Detached payment method
 */
const detachPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
    logger.info(`Payment method detached: ${paymentMethodId}`);
    return paymentMethod;
  } catch (error) {
    logger.error('Error detaching payment method:', error);
    throw error;
  }
};

/**
 * Create payment intent
 * @param {Object} params - Payment parameters
 * @returns {Promise<Object>} Payment intent
 */
const createPaymentIntent = async (params) => {
  const {
    amount,
    customerId,
    paymentMethodId,
    jobId,
    tradespersonAccountId,
    platformFee
  } = params;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      capture_method: 'manual', // Hold funds until job completion
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: tradespersonAccountId
      },
      metadata: {
        job_id: jobId
      }
    });

    logger.info(`Payment intent created: ${paymentIntent.id} for job ${jobId}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Confirm payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Confirmed payment intent
 */
const confirmPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    logger.info(`Payment intent confirmed: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Error confirming payment intent:', error);
    throw error;
  }
};

/**
 * Capture payment (release held funds)
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Captured payment intent
 */
const capturePayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    logger.info(`Payment captured: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Error capturing payment:', error);
    throw error;
  }
};

/**
 * Cancel payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {Promise<Object>} Cancelled payment intent
 */
const cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    logger.info(`Payment intent cancelled: ${paymentIntentId}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Error cancelling payment intent:', error);
    throw error;
  }
};

/**
 * Create refund
 * @param {string} paymentIntentId - Payment intent ID
 * @param {number} amount - Refund amount (optional, defaults to full refund)
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund
 */
const createRefund = async (paymentIntentId, amount = null, reason = 'requested_by_customer') => {
  try {
    const refundParams = {
      payment_intent: paymentIntentId,
      reason
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);
    logger.info(`Refund created: ${refund.id} for payment ${paymentIntentId}`);
    return refund;
  } catch (error) {
    logger.error('Error creating refund:', error);
    throw error;
  }
};

/**
 * Get account balance
 * @param {string} accountId - Stripe account ID
 * @returns {Promise<Object>} Account balance
 */
const getAccountBalance = async (accountId) => {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId
    });
    return balance;
  } catch (error) {
    logger.error('Error retrieving account balance:', error);
    throw error;
  }
};

/**
 * Construct webhook event
 * @param {string} payload - Request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Stripe event
 */
const constructWebhookEvent = (payload, signature) => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    logger.error('Webhook signature verification failed:', error);
    throw error;
  }
};

module.exports = {
  stripe,
  createCustomer,
  createConnectAccount,
  createAccountLink,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  listPaymentMethods,
  detachPaymentMethod,
  createPaymentIntent,
  confirmPaymentIntent,
  capturePayment,
  cancelPaymentIntent,
  createRefund,
  getAccountBalance,
  constructWebhookEvent
};
