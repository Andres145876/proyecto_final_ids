const express = require('express');
const router = express.Router();
const {
  createRequest,
  getRequests,
  getRequest,
  updateRequest,
  updateRequestStatus,
  deleteRequest
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateRequest,
  sanitizeBody,
  handleValidationErrors
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas para usuarios y administradores
router.post('/', sanitizeBody, validateRequest, handleValidationErrors, createRequest);
router.get('/', getRequests);
router.get('/:id', getRequest);
router.put('/:id', sanitizeBody, updateRequest);
router.delete('/:id', deleteRequest);

// Rutas solo para administradores
router.patch('/:id/status', authorize('administrador'), sanitizeBody, updateRequestStatus);

module.exports = router;