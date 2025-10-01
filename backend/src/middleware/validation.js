const { body, param, validationResult } = require('express-validator');

// Sanitizar entrada para prevenir XSS e inyecciones
const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  
  // Eliminar scripts y caracteres peligrosos
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Middleware para sanitizar body
exports.sanitizeBody = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  next();
};

// Validaciones para registro
exports.validateRegister = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  body('telefono')
    .optional()
    .matches(/^[0-9]{10}$/).withMessage('El teléfono debe tener 10 dígitos'),
];

// Validaciones para login
exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
];

// Validaciones para donaciones
exports.validateDonation = [
  body('articulo')
    .trim()
    .notEmpty().withMessage('El artículo es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El artículo debe tener entre 2 y 100 caracteres'),
  
  body('categoria')
    .notEmpty().withMessage('La categoría es requerida')
    .isIn(['alimento_perros', 'alimento_gatos', 'juguetes', 'medicamentos', 'accesorios', 'mantas', 'otros'])
    .withMessage('Categoría no válida'),
  
  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un número mayor a 0'),
  
  body('unidad')
    .notEmpty().withMessage('La unidad es requerida')
    .isIn(['kg', 'unidades', 'litros', 'paquetes']).withMessage('Unidad no válida')
];

// Validaciones para solicitudes
exports.validateRequest = [
  body('articulo')
    .notEmpty().withMessage('El artículo es requerido')
    .isMongoId().withMessage('ID de artículo no válido'),
  
  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isInt({ min: 1 }).withMessage('La cantidad debe ser un número mayor a 0')
];

// Validaciones para inventario
exports.validateInventory = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('categoria')
    .notEmpty().withMessage('La categoría es requerida')
    .isIn(['alimento_perros', 'alimento_gatos', 'juguetes', 'medicamentos', 'accesorios', 'mantas', 'otros'])
    .withMessage('Categoría no válida'),
  
  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isInt({ min: 0 }).withMessage('La cantidad debe ser un número mayor o igual a 0'),
  
  body('unidad')
    .notEmpty().withMessage('La unidad es requerida')
    .isIn(['kg', 'unidades', 'litros', 'paquetes']).withMessage('Unidad no válida')
];

// Middleware para manejar errores de validación
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  
  next();
};