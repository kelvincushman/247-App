const express = require('express');
const { body } = require('express-validator');
const {
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
} = require('../controllers/tradespersonProfileController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validator');

const router = express.Router();

// Public routes
router.get('/:id/public', optionalAuth, getPublicTradespersonProfile);

// Protected routes - require authentication
router.use(protect);
router.use(authorize('tradesperson', 'admin'));

// Profile routes
router.get('/', getTradespersonProfile);
router.put('/', updateTradespersonProfile);
router.get('/stats', getTradespersonStats);

// Availability toggle
router.put('/availability', [
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean')
], validate, toggleAvailability);

// Certification management
const certificationValidation = [
  body('name').notEmpty().withMessage('Certification name is required'),
  body('issuer').notEmpty().withMessage('Issuer is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required')
];

router.post('/certifications',
  uploadSingle('document'),
  certificationValidation,
  validate,
  addCertification
);

// License management
const licenseValidation = [
  body('licenseNumber').notEmpty().withMessage('License number is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('licenseType').notEmpty().withMessage('License type is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('expiryDate').optional().isISO8601().withMessage('Valid expiry date is required')
];

router.post('/licenses',
  uploadSingle('document'),
  licenseValidation,
  validate,
  addLicense
);

// Insurance management
const insuranceValidation = [
  body('provider').notEmpty().withMessage('Insurance provider is required'),
  body('policyNumber').notEmpty().withMessage('Policy number is required'),
  body('coverageAmount').isNumeric().withMessage('Coverage amount must be numeric'),
  body('insuranceType').notEmpty().withMessage('Insurance type is required'),
  body('expiryDate').isISO8601().withMessage('Valid expiry date is required')
];

router.post('/insurance',
  uploadSingle('document'),
  insuranceValidation,
  validate,
  addInsurance
);

// Portfolio management
router.post('/portfolio', uploadSingle('image'), addPortfolioImage);
router.delete('/portfolio/:index', deletePortfolioImage);

module.exports = router;
