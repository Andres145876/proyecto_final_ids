const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  articulo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'El artículo es requerido']
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es requerida'],
    min: [1, 'La cantidad debe ser al menos 1']
  },
  estado: {
    type: String,
    enum: ['pendiente', 'aceptada', 'rechazada', 'enviada', 'recibida'],
    default: 'pendiente'
  },
  motivoRechazo: {
    type: String,
    trim: true,
    maxlength: [500, 'El motivo de rechazo no puede exceder 500 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  fechaSolicitud: {
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
requestSchema.pre('save', function(next) {
  this.fechaActualizacion = Date.now();
  next();
});

// Solo permitir una solicitud activa por usuario
requestSchema.index({ usuario: 1, estado: 1 });

module.exports = mongoose.model('Request', requestSchema);