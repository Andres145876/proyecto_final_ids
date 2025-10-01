const Inventory = require('../models/Inventory');

// Obtener el inventario
exports.getInventory = async (req, res) => {
  try {
    const { disponible, categoria } = req.query;
    let query = {};

    // Filtrar por disponibilidad
    if (disponible !== undefined) {
      query.disponible = disponible === 'true';
    }

    // Filtrar por categoría
    if (categoria) {
      query.categoria = categoria;
    }

    const inventory = await Inventory.find(query).sort({ nombre: 1 });

    res.status(200).json({
      success: true,
      count: inventory.length,
      inventory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener inventario',
      error: error.message
    });
  }
};

// Obtener un artículo del inventario por ID
exports.getInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener artículo',
      error: error.message
    });
  }
};

// Crear nuevo artículo en inventario (solo admin)
exports.createInventoryItem = async (req, res) => {
  try {
    const { nombre, categoria, cantidad, unidad, descripcion } = req.body;

    // Verificar si ya existe un artículo similar
    const existingItem = await Inventory.findOne({
      nombre: { $regex: new RegExp('^' + nombre + '$', 'i') },
      categoria,
      unidad
    });

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un artículo similar en el inventario. Considera actualizar la cantidad del existente.',
        existingItem: {
          id: existingItem._id,
          nombre: existingItem.nombre,
          cantidad: existingItem.cantidad
        }
      });
    }

    const item = await Inventory.create({
      nombre,
      categoria,
      cantidad,
      unidad,
      descripcion
    });

    res.status(201).json({
      success: true,
      message: 'Artículo agregado al inventario',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear artículo',
      error: error.message
    });
  }
};

// Actualizar artículo del inventario (solo admin)
exports.updateInventoryItem = async (req, res) => {
  try {
    const { nombre, categoria, cantidad, unidad, descripcion, disponible } = req.body;

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado'
      });
    }

    // Actualizar campos
    if (nombre) item.nombre = nombre;
    if (categoria) item.categoria = categoria;
    if (cantidad !== undefined) item.cantidad = cantidad;
    if (unidad) item.unidad = unidad;
    if (descripcion !== undefined) item.descripcion = descripcion;
    if (disponible !== undefined) item.disponible = disponible;

    await item.save();

    res.status(200).json({
      success: true,
      message: 'Artículo actualizado',
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar artículo',
      error: error.message
    });
  }
};

// Eliminar artículo del inventario (solo admin)
exports.deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado'
      });
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Artículo eliminado del inventario'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar artículo',
      error: error.message
    });
  }
};

// Ajustar cantidad del inventario (solo admin)
exports.adjustInventory = async (req, res) => {
  try {
    const { cantidad, operacion } = req.body; // operacion: 'add' o 'subtract'

    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado'
      });
    }

    if (operacion === 'add') {
      item.cantidad += cantidad;
    } else if (operacion === 'subtract') {
      if (item.cantidad < cantidad) {
        return res.status(400).json({
          success: false,
          message: 'No hay suficiente cantidad para restar'
        });
      }
      item.cantidad -= cantidad;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Operación inválida. Usa "add" o "subtract"'
      });
    }

    await item.save();

    res.status(200).json({
      success: true,
      message: `Cantidad ${operacion === 'add' ? 'agregada' : 'restada'} exitosamente`,
      item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al ajustar inventario',
      error: error.message
    });
  }
};

// Obtener estadísticas del inventario (admin)
exports.getInventoryStats = async (req, res) => {
  try {
    const totalItems = await Inventory.countDocuments();
    const availableItems = await Inventory.countDocuments({ disponible: true, cantidad: { $gt: 0 } });
    const outOfStock = await Inventory.countDocuments({ cantidad: 0 });

    const categoryStats = await Inventory.aggregate([
      {
        $group: {
          _id: '$categoria',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$cantidad' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalItems,
        available: availableItems,
        outOfStock: outOfStock,
        byCategory: categoryStats
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