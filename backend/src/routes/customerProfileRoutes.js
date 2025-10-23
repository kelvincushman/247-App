const express = require('express');
const { body } = require('express-validator');
const {
  getCustomerProfile,
  updateCustomerProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  uploadProfileImage
} = require('../controllers/customerProfileController');
const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require authentication and customer role
router.use(protect);
router.use(authorize('customer', 'admin'));

// Profile routes
router.get('/', getCustomerProfile);
router.put('/', updateCustomerProfile);

// Profile image
router.post('/image', uploadSingle('image'), uploadProfileImage);

// Address management
const addressValidation = [
  body('label').notEmpty().withMessage('Address label is required'),
  body('street').notEmpty().withMessage('Street address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zipCode').notEmpty().withMessage('Zip code is required'),
  body('lat').isFloat().withMessage('Valid latitude is required'),
  body('lng').isFloat().withMessage('Valid longitude is required')
];

router.post('/addresses', addressValidation, validate, addAddress);
router.put('/addresses/:index', addressValidation, validate, updateAddress);
router.delete('/addresses/:index', deleteAddress);
router.put('/addresses/:index/default', setDefaultAddress);

module.exports = router;
