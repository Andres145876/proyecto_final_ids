const express = require('express');
const router = express.Router();
const {
  createDonation,
  getDonations,
  getDonation,
  updateDonationStatus,
  deleteDonation,
  getDonationStats
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateDonation,
  sanitizeBody,
  handleValidationErrors
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para usuarios y administradores
router.post('/', sanitizeBody, validateDonation, handleValidationErrors, createDonation);
router.get('/', getDonations);
router.get('/:id', getDonation);

// Rutas solo para administradores
router.patch('/:id/status', authorize('administrador'), sanitizeBody, updateDonationStatus);
router.delete('/:id', authorize('administrador'), deleteDonation);
router.get('/admin/stats', authorize('administrador'), getDonationStats);

module.exports = router;