const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole,
  toggleUserStatus,
  getUserStats
} = require('../controllers/userController');

// Todas las rutas requieren autenticación y rol de administrador
router.use(protect);
router.use(authorize('administrador'));

// Rutas de usuarios
router.get('/', getAllUsers);
router.get('/stats', getUserStats);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/role', changeUserRole);
router.patch('/:id/status', toggleUserStatus);

module.exports = router;