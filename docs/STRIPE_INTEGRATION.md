# Stripe Integration Guide - 247 Trades Platform

Complete guide for implementing Stripe payment processing with escrow functionality for the 247 Trades platform.

## Overview

The platform uses Stripe for:
- **Customer payments** - Customers pay for jobs upfront
- **Payment escrow** - Funds held until job completion
- **Platform fees** - 15% commission on all jobs
- **Tradesperson payouts** - Transfers to tradesperson bank accounts via Stripe Connect

## Payment Flow

```
1. Customer creates job
2. Customer pays upfront → Funds held in escrow (Payment Intent)
3. Tradesperson accepts and completes job
4. Tradesperson marks job complete
5. Customer confirms completion
6. Platform releases payment to tradesperson (minus 15% fee)
7. Tradesperson can request payout to bank account
```

## Stripe Setup

### 1. Install Stripe SDK

```bash
npm install stripe
```

### 2. Stripe Configuration

File: `src/config/stripe.js`

```javascript
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

module.exports = stripe;
```

### 3. Environment Variables

Add to `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_FEE_PERCENT=15
```

## Stripe Service Implementation

File: `src/services/stripeService.js`

```javascript
const stripe = require('../config/stripe');
const { Payment, User, UserPaymentMethod } = require('../models');
const logger = require('../utils/logger');

const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT) || 15;

class StripeService {
  /**
   * Create or retrieve Stripe customer for user
   */
  async createCustomer(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check if customer already exists
      if (user.stripeCustomerId) {
        return user.stripeCustomerId;
      }

      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone,
        metadata: {
          userId: user.id,
          role: user.role,
        },
      });

      // Save customer ID
      await user.update({ stripeCustomerId: customer.id });

      logger.info(`Created Stripe customer ${customer.id} for user ${userId}`);

      return customer.id;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Create Stripe Connect account for tradesperson
   */
  async createConnectAccount(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role !== 'tradesperson') {
        throw new Error('Only tradespeople can have Connect accounts');
      }

      // Check if Connect account already exists
      if (user.stripeConnectId) {
        return user.stripeConnectId;
      }

      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId: user.id,
        },
      });

      // Save Connect account ID
      await user.update({ stripeConnectId: account.id });

      logger.info(`Created Stripe Connect account ${account.id} for user ${userId}`);

      return account.id;
    } catch (error) {
      logger.error('Error creating Connect account:', error);
      throw error;
    }
  }

  /**
   * Create account link for Connect onboarding
   */
  async createAccountLink(connectAccountId, returnUrl, refreshUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: connectAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      logger.error('Error creating account link:', error);
      throw error;
    }
  }

  /**
   * Add payment method to customer
   */
  async addPaymentMethod(userId, paymentMethodId) {
    try {
      const user = await User.findByPk(userId);

      // Ensure customer exists
      const customerId = await this.createCustomer(userId);

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Save to database
      const userPaymentMethod = await UserPaymentMethod.create({
        userId,
        stripePaymentMethodId: paymentMethodId,
        type: paymentMethod.type,
        cardBrand: paymentMethod.card?.brand,
        cardLast4: paymentMethod.card?.last4,
        cardExpMonth: paymentMethod.card?.exp_month,
        cardExpYear: paymentMethod.card?.exp_year,
        isDefault: false,
      });

      // Set as default if it's the first payment method
      const count = await UserPaymentMethod.count({ where: { userId } });
      if (count === 1) {
        await userPaymentMethod.update({ isDefault: true });
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      logger.info(`Added payment method ${paymentMethodId} for user ${userId}`);

      return userPaymentMethod;
    } catch (error) {
      logger.error('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Create payment intent (hold funds in escrow)
   * CRITICAL: This is called when customer creates a job
   */
  async createPaymentIntent(jobId, customerId, amount, paymentMethodId = null) {
    try {
      const user = await User.findByPk(customerId);

      // Ensure customer exists
      const stripeCustomerId = await this.createCustomer(customerId);

      // Calculate platform fee (15%)
      const amountInCents = Math.round(amount * 100);
      const platformFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100));
      const tradespersonAmountInCents = amountInCents - platformFeeInCents;

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'gbp',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        capture_method: 'manual',  // CRITICAL: Manual capture for escrow
        confirmation_method: 'automatic',
        confirm: paymentMethodId ? true : false,  // Confirm immediately if payment method provided
        metadata: {
          jobId,
          customerId,
          platformFee: platformFeeInCents,
          tradespersonAmount: tradespersonAmountInCents,
        },
        description: `Job payment - Job ID: ${jobId}`,
      });

      // Create payment record
      const payment = await Payment.create({
        jobId,
        customerId,
        tradespersonId: null,  // Set later when job is accepted
        amount: amount,
        platformFee: platformFeeInCents / 100,
        tradespersonAmount: tradespersonAmountInCents / 100,
        currency: 'gbp',
        status: paymentIntent.status === 'requires_capture' ? 'authorized' : 'pending',
        stripePaymentIntentId: paymentIntent.id,
        paymentMethodId: paymentMethodId,
        authorizedAt: paymentIntent.status === 'requires_capture' ? new Date() : null,
      });

      logger.info(`Created payment intent ${paymentIntent.id} for job ${jobId}`);

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Capture payment and transfer to tradesperson
   * CRITICAL: This is called when customer confirms job completion
   */
  async releasePayment(paymentId) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [
          { model: User, as: 'tradesperson' },
          { model: User, as: 'customer' },
        ],
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'released') {
        logger.warn(`Payment ${paymentId} already released`);
        return payment;
      }

      if (payment.status !== 'authorized' && payment.status !== 'held') {
        throw new Error(`Cannot release payment with status: ${payment.status}`);
      }

      if (!payment.tradespersonId) {
        throw new Error('No tradesperson assigned to this payment');
      }

      // Ensure tradesperson has Connect account
      const tradesperson = payment.tradesperson;
      if (!tradesperson.stripeConnectId) {
        throw new Error('Tradesperson has not set up payout account');
      }

      // 1. Capture the payment intent (collect funds from customer)
      const paymentIntent = await stripe.paymentIntents.capture(
        payment.stripePaymentIntentId
      );

      logger.info(`Captured payment intent ${paymentIntent.id}`);

      // 2. Transfer funds to tradesperson (minus platform fee)
      const transfer = await stripe.transfers.create({
        amount: Math.round(payment.tradespersonAmount * 100),
        currency: 'gbp',
        destination: tradesperson.stripeConnectId,
        transfer_group: `job_${payment.jobId}`,
        metadata: {
          jobId: payment.jobId,
          paymentId: payment.id,
          tradespersonId: payment.tradespersonId,
        },
      });

      logger.info(`Created transfer ${transfer.id} to tradesperson ${payment.tradespersonId}`);

      // 3. Update payment record
      await payment.update({
        status: 'released',
        stripeChargeId: paymentIntent.latest_charge,
        stripeTransferId: transfer.id,
        releasedAt: new Date(),
      });

      logger.info(`Released payment ${paymentId} for job ${payment.jobId}`);

      return payment;
    } catch (error) {
      logger.error('Error releasing payment:', error);
      throw error;
    }
  }

  /**
   * Refund payment to customer
   */
  async refundPayment(paymentId, reason = null) {
    try {
      const payment = await Payment.findByPk(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'refunded') {
        logger.warn(`Payment ${paymentId} already refunded`);
        return payment;
      }

      // Create refund
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: reason || 'requested_by_customer',
        metadata: {
          jobId: payment.jobId,
          paymentId: payment.id,
        },
      });

      // Update payment record
      await payment.update({
        status: 'refunded',
        refundedAt: new Date(),
        refundReason: reason,
      });

      logger.info(`Refunded payment ${paymentId} - Refund ID: ${refund.id}`);

      return payment;
    } catch (error) {
      logger.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Get tradesperson balance
   */
  async getTradespersonBalance(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user.stripeConnectId) {
        return {
          available: 0,
          pending: 0,
          total: 0,
        };
      }

      const balance = await stripe.balance.retrieve({
        stripeAccount: user.stripeConnectId,
      });

      const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
      const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

      return {
        available,
        pending,
        total: available + pending,
      };
    } catch (error) {
      logger.error('Error getting tradesperson balance:', error);
      throw error;
    }
  }

  /**
   * Create payout to tradesperson bank account
   */
  async createPayout(userId, amount) {
    try {
      const user = await User.findByPk(userId);

      if (!user.stripeConnectId) {
        throw new Error('Tradesperson has not set up payout account');
      }

      const payout = await stripe.payouts.create(
        {
          amount: Math.round(amount * 100),
          currency: 'gbp',
          metadata: {
            userId,
          },
        },
        {
          stripeAccount: user.stripeConnectId,
        }
      );

      logger.info(`Created payout ${payout.id} for user ${userId}`);

      return payout;
    } catch (error) {
      logger.error('Error creating payout:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(event) {
    try {
      logger.info(`Processing webhook: ${event.type}`);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object);
          break;

        case 'transfer.created':
          logger.info('Transfer created:', event.data.object.id);
          break;

        case 'transfer.failed':
          logger.error('Transfer failed:', event.data.object);
          break;

        case 'payout.paid':
          logger.info('Payout completed:', event.data.object.id);
          break;

        case 'payout.failed':
          logger.error('Payout failed:', event.data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object);
          break;

        default:
          logger.debug(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  async handlePaymentIntentSucceeded(paymentIntent) {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment && payment.status === 'pending') {
      await payment.update({
        status: 'authorized',
        authorizedAt: new Date(),
      });

      logger.info(`Payment intent succeeded: ${paymentIntent.id}`);
    }
  }

  async handlePaymentIntentFailed(paymentIntent) {
    const payment = await Payment.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (payment) {
      await payment.update({
        status: 'failed',
      });

      logger.error(`Payment intent failed: ${paymentIntent.id}`);
    }
  }

  async handleChargeSucceeded(charge) {
    logger.info(`Charge succeeded: ${charge.id}`);
  }

  async handleAccountUpdated(account) {
    const user = await User.findOne({
      where: { stripeConnectId: account.id },
    });

    if (user) {
      logger.info(`Connect account updated for user ${user.id}: ${account.id}`);
    }
  }
}

module.exports = new StripeService();
```

## Webhook Handler

File: `src/routes/webhooks.js`

```javascript
const express = require('express');
const stripe = require('../config/stripe');
const stripeService = require('../services/stripeService');
const logger = require('../utils/logger');

const router = express.Router();

router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await stripeService.handleWebhook(event);
      res.json({ received: true });
    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

module.exports = router;
```

## Payment Controller

File: `src/controllers/paymentController.js`

```javascript
const stripeService = require('../services/stripeService');
const { Payment, Job } = require('../models');
const logger = require('../utils/logger');

/**
 * Create payment for job
 */
exports.createPayment = async (req, res, next) => {
  try {
    const { jobId, amount, paymentMethodId } = req.body;
    const customerId = req.user.id;

    // Verify job belongs to customer
    const job = await Job.findByPk(jobId);
    if (!job || job.customerId !== customerId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Create payment intent
    const result = await stripeService.createPaymentIntent(
      jobId,
      customerId,
      amount,
      paymentMethodId
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tradesperson earnings
 */
exports.getTradespersonEarnings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const balance = await stripeService.getTradespersonBalance(userId);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request payout
 */
exports.requestPayout = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const payout = await stripeService.createPayout(userId, amount);

    res.json({
      success: true,
      data: { payout },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add payment method
 */
exports.addPaymentMethod = async (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;
    const userId = req.user.id;

    const userPaymentMethod = await stripeService.addPaymentMethod(
      userId,
      paymentMethodId
    );

    res.status(201).json({
      success: true,
      data: { paymentMethod: userPaymentMethod },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Connect account link for onboarding
 */
exports.createConnectAccountLink = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Create or get Connect account
    const connectAccountId = await stripeService.createConnectAccount(userId);

    // Create onboarding link
    const returnUrl = `${process.env.API_URL}/tradesperson/onboarding/complete`;
    const refreshUrl = `${process.env.API_URL}/tradesperson/onboarding/refresh`;

    const accountLinkUrl = await stripeService.createAccountLink(
      connectAccountId,
      returnUrl,
      refreshUrl
    );

    res.json({
      success: true,
      data: { url: accountLinkUrl },
    });
  } catch (error) {
    next(error);
  }
};
```

## Testing with Stripe Test Cards

Use these test cards in development:

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Authentication (3D Secure): 4000 0025 0000 3155

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

## Stripe CLI for Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test webhook
stripe trigger payment_intent.succeeded
```

## Security Best Practices

1. **Never expose secret key** - Keep in environment variables
2. **Verify webhook signatures** - Always validate webhook events
3. **Use HTTPS** - Required for production
4. **Validate amounts** - Always validate on server, never trust client
5. **Log all transactions** - Keep audit trail
6. **Handle errors gracefully** - Provide clear error messages
7. **Test thoroughly** - Use Stripe test mode extensively

## Production Checklist

- [ ] Switch to live API keys
- [ ] Configure webhook endpoints in Stripe Dashboard
- [ ] Set up Stripe Connect for tradespeople
- [ ] Configure payout schedules
- [ ] Set up fraud detection
- [ ] Enable Stripe Radar
- [ ] Configure email receipts
- [ ] Test refund flow
- [ ] Set up monitoring and alerts
- [ ] Review Terms of Service compliance

## Common Issues

### Payment Intent Requires Capture
**Issue**: Payment stuck in `requires_capture` status
**Solution**: Call `stripe.paymentIntents.capture()` when ready to collect funds

### Transfer Failed
**Issue**: Transfer to Connect account fails
**Solution**: Verify Connect account is fully onboarded and has capabilities enabled

### Webhook Not Received
**Issue**: Webhook events not triggering
**Solution**: Check webhook endpoint URL and signature verification

## Next Steps

1. Set up Stripe Dashboard account
2. Complete KYC for Connect accounts
3. Configure payout settings
4. Set up monitoring
5. Review compliance requirements
