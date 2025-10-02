const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del artículo es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: ['alimento_perros', 'alimento_gatos', 'juguetes', 'medicamentos', 'accesorios', 'mantas', 'otros'],
    default: 'otros'
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [0, 'La cantidad no puede ser negativa'],
    default: 0
  },
  unidad: {
    type: String,
    required: [true, 'La unidad es requerida'],
    enum: ['kg', 'unidades', 'litros', 'paquetes'],
    default: 'unidades'
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  disponible: {
    type: Boolean,
    default: true
  },
  ultimaActualizacion: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Actualizar fecha de última actualización antes de guardar
inventorySchema.pre('save', function(next) {
  this.ultimaActualizacion = Date.now();
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);