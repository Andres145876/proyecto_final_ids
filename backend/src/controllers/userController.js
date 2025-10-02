const User = require('../models/User');

// Obtener todos los usuarios (solo admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// Obtener un usuario por ID (solo admin)
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message
    });
  }
};

// Actualizar usuario (solo admin)
exports.updateUser = async (req, res) => {
  try {
    const { nombre, email, telefono, direccion, rol, activo } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir que un admin se desactive a sí mismo
    if (req.user.id === req.params.id && activo === false) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Actualizar campos
    if (nombre) user.nombre = nombre;
    if (email) user.email = email;
    if (telefono) user.telefono = telefono;
    if (direccion) user.direccion = direccion;
    if (rol) user.rol = rol;
    if (activo !== undefined) user.activo = activo;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        direccion: user.direccion,
        rol: user.rol,
        activo: user.activo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// Eliminar usuario (solo admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir que un admin se elimine a sí mismo
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Cambiar rol de usuario (solo admin)
exports.changeUserRole = async (req, res) => {
  try {
    const { rol } = req.body;

    if (!['usuario', 'administrador'].includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir que un admin cambie su propio rol
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    user.rol = rol;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Rol actualizado a ${rol}`,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar rol',
      error: error.message
    });
  }
};

// Activar/Desactivar usuario (solo admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // No permitir que un admin se desactive a sí mismo
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar el estado de tu propia cuenta'
      });
    }

    user.activo = !user.activo;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Usuario ${user.activo ? 'activado' : 'desactivado'}`,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        activo: user.activo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cambiar estado',
      error: error.message
    });
  }
};

// Obtener estadísticas de usuarios (admin)
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ activo: true });
    const adminUsers = await User.countDocuments({ rol: 'administrador' });
    const regularUsers = await User.countDocuments({ rol: 'usuario' });

    res.status(200).json({
      success: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        admins: adminUsers,
        users: regularUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};