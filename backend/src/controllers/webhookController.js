const { constructWebhookEvent } = require('../config/stripe');
const { Job } = require('../models');
const logger = require('../config/logger');

// @desc    Handle Stripe webhooks
// @route   POST /api/v1/webhooks/stripe
// @access  Public (verified by Stripe signature)
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = constructWebhookEvent(req.body, sig);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    logger.error(`Error processing webhook: ${error.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Handle successful payment
async function handlePaymentIntentSucceeded(paymentIntent) {
  const jobId = paymentIntent.metadata.job_id;

  if (jobId) {
    const job = await Job.findByPk(jobId);
    if (job) {
      logger.info(`Payment succeeded for job ${jobId}: ${paymentIntent.id}`);
      // Payment status already updated in the service layer
      // TODO: Send notification to tradesperson
    }
  }
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent) {
  const jobId = paymentIntent.metadata.job_id;

  if (jobId) {
    const job = await Job.findByPk(jobId);
    if (job) {
      await job.update({ payment_status: 'failed' });
      logger.error(`Payment failed for job ${jobId}: ${paymentIntent.id}`);
      // TODO: Send notification to customer about payment failure
      // TODO: Possibly cancel the job automatically
    }
  }
}

// Handle canceled payment
async function handlePaymentIntentCanceled(paymentIntent) {
  const jobId = paymentIntent.metadata.job_id;

  if (jobId) {
    const job = await Job.findByPk(jobId);
    if (job) {
      logger.info(`Payment canceled for job ${jobId}: ${paymentIntent.id}`);
      // Payment status should already be updated
    }
  }
}

// Handle refund
async function handleChargeRefunded(charge) {
  logger.info(`Charge refunded: ${charge.id}`);
  // The refund handling is already done in the service layer
  // This is for additional logging or notifications
}

// Handle Connect account updates
async function handleAccountUpdated(account) {
  logger.info(`Stripe Connect account updated: ${account.id}`);
  // TODO: Update tradesperson profile with account status
  // TODO: Check if account is fully onboarded
}

// Handle successful payout
async function handlePayoutPaid(payout) {
  logger.info(`Payout successful: ${payout.id} - Amount: ${payout.amount / 100}`);
  // TODO: Send notification to tradesperson
}

// Handle failed payout
async function handlePayoutFailed(payout) {
  logger.error(`Payout failed: ${payout.id} - ${payout.failure_message}`);
  // TODO: Send notification to tradesperson
  // TODO: Alert admin about failed payout
}

module.exports = {
  handleStripeWebhook
};
