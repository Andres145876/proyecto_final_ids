const Donation = require('../models/Donation');
const Inventory = require('../models/Inventory');

// Crear nueva donación
exports.createDonation = async (req, res) => {
  try {
    const { articulo, categoria, cantidad, unidad, descripcion } = req.body;

    const donation = await Donation.create({
      usuario: req.user.id,
      articulo,
      categoria,
      cantidad,
      unidad,
      descripcion,
      estado: 'pendiente'
    });

    await donation.populate('usuario', 'nombre email');

    res.status(201).json({
      success: true,
      message: 'Donación creada exitosamente',
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear donación',
      error: error.message
    });
  }
};

// Obtener todas las donaciones (admin) o solo las del usuario
exports.getDonations = async (req, res) => {
  try {
    let query = {};

    // Si es usuario normal, solo ver sus donaciones
    if (req.user.rol === 'usuario') {
      query.usuario = req.user.id;
    }

    const donations = await Donation.find(query)
      .populate('usuario', 'nombre email')
      .sort({ fechaDonacion: -1 });

    res.status(200).json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener donaciones',
      error: error.message
    });
  }
};

// Obtener una donación por ID
exports.getDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('usuario', 'nombre email telefono');

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donación no encontrada'
      });
    }

    // Verificar que el usuario solo pueda ver sus propias donaciones (si no es admin)
    if (req.user.rol === 'usuario' && donation.usuario._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para ver esta donación'
      });
    }

    res.status(200).json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener donación',
      error: error.message
    });
  }
};

// Actualizar estado de donación (solo admin)
exports.updateDonationStatus = async (req, res) => {
  try {
    const { estado, notas } = req.body;

    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donación no encontrada'
      });
    }

    donation.estado = estado;
    if (notas) donation.notas = notas;
    await donation.save();

    // Si la donación es aceptada y recibida, agregar al inventario
    if (estado === 'recibida') {
      // Buscar si ya existe un artículo similar en el inventario
      let inventoryItem = await Inventory.findOne({
        nombre: donation.articulo,
        categoria: donation.categoria,
        unidad: donation.unidad
      });

      if (inventoryItem) {
        // Si existe, aumentar la cantidad
        inventoryItem.cantidad += donation.cantidad;
        await inventoryItem.save();
      } else {
        // Si no existe, crear nuevo item en inventario
        await Inventory.create({
          nombre: donation.articulo,
          categoria: donation.categoria,
          cantidad: donation.cantidad,
          unidad: donation.unidad,
          descripcion: donation.descripcion || ''
        });
      }
    }

    await donation.populate('usuario', 'nombre email');

    res.status(200).json({
      success: true,
      message: 'Estado de donación actualizado',
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
};

// Eliminar donación (solo admin)
exports.deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donación no encontrada'
      });
    }

    await donation.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Donación eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar donación',
      error: error.message
    });
  }
};

// Obtener estadísticas de donaciones (admin)
exports.getDonationStats = async (req, res) => {
  try {
    const stats = await Donation.aggregate([
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalDonations = await Donation.countDocuments();
    
    const categoriesStats = await Donation.aggregate([
      {
        $group: {
          _id: '$categoria',
          count: { $sum: 1 },
          totalCantidad: { $sum: '$cantidad' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalDonations,
        byStatus: stats,
        byCategory: categoriesStats
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