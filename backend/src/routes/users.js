const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole,
  toggleUserStatus,
  getUserStats
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { sanitizeBody } = require('../middleware/validation');

// Todas las rutas requieren autenticación y rol de administrador
router.use(protect);
router.use(authorize('administrador'));

router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.put('/:id', sanitizeBody, updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/role', sanitizeBody, changeUserRole);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;