const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Customer payment setup
router.post('/setup-customer',
  authorize('customer'),
  setupStripeCustomer
);

// Payment methods management (customers)
router.post('/payment-methods',
  authorize('customer'),
  [body('paymentMethodId').notEmpty().withMessage('Payment method ID is required')],
  validate,
  addPaymentMethod
);

router.get('/payment-methods',
  authorize('customer'),
  getPaymentMethods
);

router.delete('/payment-methods/:paymentMethodId',
  authorize('customer'),
  removePaymentMethod
);

router.put('/payment-methods/:paymentMethodId/default',
  authorize('customer'),
  setDefaultPayment
);

// Tradesperson Connect setup
router.post('/setup-connect',
  authorize('tradesperson'),
  setupStripeConnect
);

router.get('/balance',
  authorize('tradesperson'),
  getBalance
);

// Job payments
router.post('/jobs/:jobId/hold',
  authorize('customer'),
  holdJobPayment
);

router.post('/jobs/:jobId/capture',
  authorize('tradesperson', 'admin'),
  [body('finalCost').isFloat({ min: 0 }).withMessage('Valid final cost is required')],
  validate,
  captureJobPaymentHandler
);

router.post('/jobs/:jobId/cancel',
  authorize('customer', 'tradesperson', 'admin'),
  cancelJobPaymentHandler
);

router.post('/jobs/:jobId/refund',
  authorize('admin', 'customer'),
  [body('reason').notEmpty().withMessage('Refund reason is required')],
  validate,
  refundJobPaymentHandler
);

router.get('/jobs/:jobId',
  getJobPayment
);

module.exports = router;
