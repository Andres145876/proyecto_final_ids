const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  sanitizeBody,
  handleValidationErrors
} = require('../middleware/validation');

// Rutas públicas
router.post('/register', sanitizeBody, validateRegister, handleValidationErrors, register);
router.post('/login', sanitizeBody, validateLogin, handleValidationErrors, login);

// Rutas protegidas
router.get('/profile', protect, getProfile);
router.put('/profile', protect, sanitizeBody, updateProfile);

module.exports = router;