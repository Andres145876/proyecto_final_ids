const Request = require('../models/Request');
const Inventory = require('../models/Inventory');

// Crear nueva solicitud
exports.createRequest = async (req, res) => {
  try {
    const { articulo, cantidad, descripcion } = req.body;

    // Verificar que el usuario no tenga una solicitud activa
    const activeRequest = await Request.findOne({
      usuario: req.user.id,
      estado: { $in: ['pendiente', 'aceptada', 'enviada'] }
    });

    if (activeRequest) {
      return res.status(400).json({
        success: false,
        message: 'Ya tienes una solicitud activa. Puedes modificarla o esperar a que sea completada.'
      });
    }

    // Verificar que el artículo existe en inventario
    const inventoryItem = await Inventory.findById(articulo);

    if (!inventoryItem) {
      return res.status(404).json({
        success: false,
        message: 'Artículo no encontrado en inventario'
      });
    }

    // Verificar disponibilidad
    if (!inventoryItem.disponible) {
      return res.status(400).json({
        success: false,
        message: 'Este artículo no está disponible actualmente'
      });
    }

    // Verificar que hay suficiente cantidad
    if (inventoryItem.cantidad < cantidad) {
      return res.status(400).json({
        success: false,
        message: `Solo hay ${inventoryItem.cantidad} ${inventoryItem.unidad} disponibles`
      });
    }

    const request = await Request.create({
      usuario: req.user.id,
      articulo,
      cantidad,
      descripcion,
      estado: 'pendiente'
    });

    await request.populate([
      { path: 'usuario', select: 'nombre email' },
      { path: 'articulo', select: 'nombre categoria cantidad unidad' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud',
      error: error.message
    });
  }
};

// Obtener todas las solicitudes (admin) o solo las del usuario
exports.getRequests = async (req, res) => {
  try {
    let query = {};

    // Si es usuario normal, solo ver sus solicitudes
    if (req.user.rol === 'usuario') {
      query.usuario = req.user.id;
    }

    const requests = await Request.find(query)
      .populate('usuario', 'nombre email telefono')
      .populate('articulo', 'nombre categoria cantidad unidad')
      .sort({ fechaSolicitud: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes',
      error: error.message
    });
  }
};

// Obtener una solicitud por ID
exports.getRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('usuario', 'nombre email telefono direccion')
      .populate('articulo', 'nombre categoria cantidad unidad descripcion');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Verificar que el usuario solo pueda ver sus propias solicitudes (si no es admin)
    if (req.user.rol === 'usuario' && request.usuario._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para ver esta solicitud'
      });
    }

    res.status(200).json({
      success: true,
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitud',
      error: error.message
    });
  }
};

// Actualizar solicitud (usuario puede modificar cantidad si está pendiente)
exports.updateRequest = async (req, res) => {
  try {
    const { cantidad, descripcion } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('articulo');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Verificar propiedad si es usuario normal
    if (req.user.rol === 'usuario' && request.usuario.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado para modificar esta solicitud'
      });
    }

    // Solo se puede modificar si está pendiente
    if (request.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes modificar solicitudes pendientes'
      });
    }

    // Verificar disponibilidad en inventario
    if (cantidad && cantidad > request.articulo.cantidad) {
      return res.status(400).json({
        success: false,
        message: `Solo hay ${request.articulo.cantidad} ${request.articulo.unidad} disponibles`
      });
    }

    if (cantidad) request.cantidad = cantidad;
    if (descripcion) request.descripcion = descripcion;
    
    // Resetear a pendiente al modificar
    request.estado = 'pendiente';
    await request.save();

    await request.populate([
      { path: 'usuario', select: 'nombre email' },
      { path: 'articulo', select: 'nombre categoria cantidad unidad' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Solicitud actualizada. Vuelve a estar pendiente de aprobación.',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar solicitud',
      error: error.message
    });
  }
};

// Actualizar estado de solicitud (solo admin)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { estado, motivoRechazo, notas } = req.body;

    const request = await Request.findById(req.params.id)
      .populate('articulo');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const oldStatus = request.estado;
    request.estado = estado;
    
    if (motivoRechazo) request.motivoRechazo = motivoRechazo;
    if (notas) request.notas = notas;

    // Si se acepta la solicitud, reducir del inventario
    if (estado === 'aceptada' && oldStatus === 'pendiente') {
      const inventoryItem = await Inventory.findById(request.articulo._id);
      
      if (inventoryItem.cantidad < request.cantidad) {
        return res.status(400).json({
          success: false,
          message: 'No hay suficiente cantidad en inventario'
        });
      }

      inventoryItem.cantidad -= request.cantidad;
      await inventoryItem.save();
    }

    // Si se rechaza después de aceptada, devolver al inventario
    if (estado === 'rechazada' && oldStatus === 'aceptada') {
      const inventoryItem = await Inventory.findById(request.articulo._id);
      inventoryItem.cantidad += request.cantidad;
      await inventoryItem.save();
    }

    await request.save();

    await request.populate([
      { path: 'usuario', select: 'nombre email' },
      { path: 'articulo', select: 'nombre categoria cantidad unidad' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Estado de solicitud actualizado',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar estado',
      error: error.message
    });
  }
};

// Eliminar solicitud
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    // Usuario solo puede eliminar sus propias solicitudes pendientes
    if (req.user.rol === 'usuario') {
      if (request.usuario.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'No autorizado para eliminar esta solicitud'
        });
      }
      
      if (request.estado !== 'pendiente') {
        return res.status(400).json({
          success: false,
          message: 'Solo puedes eliminar solicitudes pendientes'
        });
      }
    }

    // Si está aceptada, devolver al inventario
    if (request.estado === 'aceptada') {
      const inventoryItem = await Inventory.findById(request.articulo);
      if (inventoryItem) {
        inventoryItem.cantidad += request.cantidad;
        await inventoryItem.save();
      }
    }

    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Solicitud eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar solicitud',
      error: error.message
    });
  }
};