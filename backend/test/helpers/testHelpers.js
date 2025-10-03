const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Donation = require('../../src/models/Donation');
const Request = require('../../src/models/Request');
const Inventory = require('../../src/models/Inventory');

// Crear usuario de prueba
const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    nombre: 'Usuario Test',
    email: 'test@test.com',
    password: 'Test123',
    telefono: '1234567890',
    direccion: 'Calle Test 123',
    rol: 'usuario',
    activo: true
  };

  const user = await User.create({ ...defaultUser, ...overrides });
  return user;
};

// Crear admin de prueba
const createTestAdmin = async (overrides = {}) => {
  return await createTestUser({ 
    nombre: 'Admin Test',
    email: 'admin@test.com',
    rol: 'administrador',
    ...overrides 
  });
};

// Generar token JWT
const generateTestToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Crear donación de prueba
const createTestDonation = async (userId, overrides = {}) => {
  const defaultDonation = {
    usuario: userId,
    articulo: 'Alimento para perros',
    categoria: 'alimento_perros',
    cantidad: 10,
    unidad: 'kg',
    descripcion: 'Donación de prueba',
    estado: 'pendiente'
  };

  const donation = await Donation.create({ ...defaultDonation, ...overrides });
  return donation;
};

// Crear item de inventario de prueba
const createTestInventoryItem = async (overrides = {}) => {
  const defaultItem = {
    nombre: 'Alimento para perros',
    categoria: 'alimento_perros',
    cantidad: 50,
    unidad: 'kg',
    descripcion: 'Item de prueba',
    disponible: true
  };

  const item = await Inventory.create({ ...defaultItem, ...overrides });
  return item;
};

// Crear solicitud de prueba
const createTestRequest = async (userId, itemId, overrides = {}) => {
  const defaultRequest = {
    usuario: userId,
    articulo: itemId,
    cantidad: 5,
    descripcion: 'Solicitud de prueba',
    estado: 'pendiente'
  };

  const request = await Request.create({ ...defaultRequest, ...overrides });
  return request;
};

module.exports = {
  createTestUser,
  createTestAdmin,
  generateTestToken,
  createTestDonation,
  createTestInventoryItem,
  createTestRequest
};