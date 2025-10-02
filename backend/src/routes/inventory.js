const express = require('express');
const router = express.Router();
const {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventory,
  getInventoryStats
} = require('../controllers/inventoryController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateInventory,
  sanitizeBody,
  handleValidationErrors
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas accesibles para todos los usuarios autenticados
router.get('/', getInventory);
router.get('/:id', getInventoryItem);

// Rutas solo para administradores
router.post('/', authorize('administrador'), sanitizeBody, validateInventory, handleValidationErrors, createInventoryItem);
router.put('/:id', authorize('administrador'), sanitizeBody, updateInventoryItem);
router.delete('/:id', authorize('administrador'), deleteInventoryItem);
router.patch('/:id/adjust', authorize('administrador'), sanitizeBody, adjustInventory);
router.get('/admin/stats', authorize('administrador'), getInventoryStats);

module.exports = router;