const express = require('express');
const { body } = require('express-validator');
const {
  getPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  requestAdditionalDocuments,
  getAllUsers,
  deactivateUser,
  reactivateUser,
  getPlatformStats
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validator');

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// Platform statistics
router.get('/stats', getPlatformStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:userId/deactivate', [
  body('reason').notEmpty().withMessage('Deactivation reason is required')
], validate, deactivateUser);
router.put('/users/:userId/reactivate', reactivateUser);

// Verification management
router.get('/verifications/pending', getPendingVerifications);
router.get('/verifications/:userId', getVerificationDetails);
router.post('/verifications/:userId/approve', approveVerification);
router.post('/verifications/:userId/reject', [
  body('reason').notEmpty().withMessage('Rejection reason is required')
], validate, rejectVerification);
router.post('/verifications/:userId/request-documents', [
  body('message').notEmpty().withMessage('Request message is required')
], validate, requestAdditionalDocuments);

module.exports = router;
