const {
  createPaymentIntent,
  confirmPaymentIntent,
  capturePayment,
  cancelPaymentIntent,
  createRefund
} = require('../config/stripe');
const { Job, CustomerProfile, TradespersonProfile } = require('../models');
const logger = require('../config/logger');

// Platform commission rate (15%)
const PLATFORM_FEE_RATE = 0.15;

/**
 * Calculate platform fee
 * @param {number} amount - Job amount
 * @returns {number} Platform fee
 */
const calculatePlatformFee = (amount) => {
  return amount * PLATFORM_FEE_RATE;
};

/**
 * Create payment hold for job
 * @param {string} jobId - Job ID
 * @param {string} customerId - User ID of customer
 * @returns {Promise<Object>} Payment result
 */
const createJobPaymentHold = async (jobId, customerId) => {
  try {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (!job.estimated_cost) {
      throw new Error('Job must have an estimated cost');
    }

    if (job.customer_id !== customerId) {
      throw new Error('Unauthorized');
    }

    // Get customer profile with Stripe customer ID
    const customerProfile = await CustomerProfile.findOne({
      where: { user_id: customerId }
    });

    if (!customerProfile || !customerProfile.stripe_customer_id) {
      throw new Error('Customer not found or Stripe customer not set up');
    }

    if (!customerProfile.default_payment_method) {
      throw new Error('No default payment method set');
    }

    // Get tradesperson's Stripe account
    const tradespersonProfile = await TradespersonProfile.findOne({
      where: { user_id: job.tradesperson_id }
    });

    if (!tradespersonProfile || !tradespersonProfile.stripe_account_id) {
      throw new Error('Tradesperson Stripe account not set up');
    }

    const amount = parseFloat(job.estimated_cost);
    const platformFee = calculatePlatformFee(amount);

    // Create payment intent (hold funds)
    const paymentIntent = await createPaymentIntent({
      amount,
      customerId: customerProfile.stripe_customer_id,
      paymentMethodId: customerProfile.default_payment_method,
      jobId: job.id,
      tradespersonAccountId: tradespersonProfile.stripe_account_id,
      platformFee
    });

    // Confirm payment intent
    const confirmedIntent = await confirmPaymentIntent(paymentIntent.id);

    // Update job with payment intent ID
    await job.update({
      payment_intent_id: confirmedIntent.id,
      payment_status: 'held'
    });

    logger.info(`Payment hold created for job ${jobId}: ${confirmedIntent.id}`);

    return {
      paymentIntentId: confirmedIntent.id,
      amount,
      platformFee,
      status: confirmedIntent.status
    };
  } catch (error) {
    logger.error('Error creating job payment hold:', error);
    throw error;
  }
};

/**
 * Capture payment when job is completed
 * @param {string} jobId - Job ID
 * @param {number} finalCost - Final job cost
 * @returns {Promise<Object>} Payment result
 */
const captureJobPayment = async (jobId, finalCost) => {
  try {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Job must be completed to capture payment');
    }

    if (!job.payment_intent_id) {
      throw new Error('No payment intent found for this job');
    }

    // If final cost is different from estimated, we need to adjust
    // For simplicity, we'll capture the held amount
    // In production, you might want to handle cost differences

    const capturedIntent = await capturePayment(job.payment_intent_id);

    // Update job payment status
    await job.update({
      payment_status: 'completed',
      final_cost: finalCost
    });

    logger.info(`Payment captured for job ${jobId}: ${capturedIntent.id}`);

    return {
      paymentIntentId: capturedIntent.id,
      amount: capturedIntent.amount / 100,
      status: capturedIntent.status
    };
  } catch (error) {
    logger.error('Error capturing job payment:', error);
    throw error;
  }
};

/**
 * Cancel payment hold (when job is cancelled)
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Cancellation result
 */
const cancelJobPayment = async (jobId) => {
  try {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (!job.payment_intent_id) {
      // No payment to cancel
      return { message: 'No payment to cancel' };
    }

    if (job.payment_status === 'completed') {
      throw new Error('Cannot cancel completed payment');
    }

    const cancelledIntent = await cancelPaymentIntent(job.payment_intent_id);

    // Update job payment status
    await job.update({
      payment_status: 'cancelled'
    });

    logger.info(`Payment cancelled for job ${jobId}: ${cancelledIntent.id}`);

    return {
      paymentIntentId: cancelledIntent.id,
      status: cancelledIntent.status
    };
  } catch (error) {
    logger.error('Error cancelling job payment:', error);
    throw error;
  }
};

/**
 * Process refund for cancelled job
 * @param {string} jobId - Job ID
 * @param {number} amount - Refund amount (optional)
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund result
 */
const refundJobPayment = async (jobId, amount = null, reason = 'requested_by_customer') => {
  try {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (!job.payment_intent_id) {
      throw new Error('No payment found for this job');
    }

    if (job.payment_status !== 'completed') {
      throw new Error('Can only refund completed payments');
    }

    const refund = await createRefund(job.payment_intent_id, amount, reason);

    // Update job payment status
    await job.update({
      payment_status: 'refunded'
    });

    logger.info(`Refund processed for job ${jobId}: ${refund.id}`);

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    logger.error('Error processing refund:', error);
    throw error;
  }
};

/**
 * Get payment summary for job
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Payment summary
 */
const getJobPaymentSummary = async (jobId) => {
  try {
    const job = await Job.findByPk(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const estimatedCost = parseFloat(job.estimated_cost) || 0;
    const finalCost = parseFloat(job.final_cost) || estimatedCost;
    const platformFee = calculatePlatformFee(finalCost);
    const tradespersonEarnings = finalCost - platformFee;

    return {
      jobId: job.id,
      estimatedCost,
      finalCost,
      platformFee: platformFee.toFixed(2),
      platformFeeRate: `${(PLATFORM_FEE_RATE * 100).toFixed(0)}%`,
      tradespersonEarnings: tradespersonEarnings.toFixed(2),
      paymentStatus: job.payment_status,
      paymentIntentId: job.payment_intent_id
    };
  } catch (error) {
    logger.error('Error getting payment summary:', error);
    throw error;
  }
};

module.exports = {
  PLATFORM_FEE_RATE,
  calculatePlatformFee,
  createJobPaymentHold,
  captureJobPayment,
  cancelJobPayment,
  refundJobPayment,
  getJobPaymentSummary
};
