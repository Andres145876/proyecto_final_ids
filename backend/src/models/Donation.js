const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  articulo: {
    type: String,
    required: [true, 'El artículo es requerido'],
    trim: true,
    minlength: [2, 'El artículo debe tener al menos 2 caracteres'],
    maxlength: [100, 'El artículo no puede exceder 100 caracteres']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: ['alimento_perros', 'alimento_gatos', 'juguetes', 'medicamentos', 'accesorios', 'mantas', 'otros']
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [1, 'La cantidad debe ser al menos 1']
  },
  unidad: {
    type: String,
    required: [true, 'La unidad es requerida'],
    enum: ['kg', 'unidades', 'litros', 'paquetes']
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aceptada', 'rechazada', 'recibida'],
    default: 'aceptada'
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  fechaDonacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  notas: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Actualizar fecha de actualización antes de guardar
donationSchema.pre('save', function(next) {
  this.fechaActualizacion = Date.now();
  next();
});

module.exports = mongoose.model('Donation', donationSchema);