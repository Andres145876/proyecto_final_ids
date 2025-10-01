const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');

describe('Auth Endpoints', () => {
  // Conectar a base de datos de prueba antes de todos los tests
  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/patitas-felices-test';
    await mongoose.connect(testDbUri);
  });

  // Limpiar base de datos después de cada test
  afterEach(async () => {
    await User.deleteMany({});
  });

  // Desconectar después de todos los tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123',
        telefono: '5551234567'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.rol).toBe('usuario');
    });

    it('debe fallar al registrar usuario con email duplicado', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123'
      };

      await User.create(userData);

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('email ya está registrado');
    });

    it('debe fallar con datos inválidos', async () => {
      const userData = {
        nombre: 'J',
        email: 'invalid-email',
        password: '123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('debe sanitizar entrada para prevenir XSS', async () => {
      const userData = {
        nombre: '<script>alert("xss")</script>Juan',
        email: 'juan@example.com',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.user.nombre).not.toContain('<script>');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        rol: 'usuario'
      });
    });

    it('debe iniciar sesión exitosamente con credenciales válidas', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('debe fallar con contraseña incorrecta', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Credenciales inválidas');
    });

    it('debe fallar con email no registrado', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'noexiste@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar si el usuario está inactivo', async () => {
      await User.findOneAndUpdate(
        { email: 'test@example.com' },
        { activo: false }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('inactivo');
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;
    let userId;

    beforeEach(async () => {
      const user = await User.create({
        nombre: 'Test User',
        email: 'test@example.com',
        password: 'Password123'
      });
      userId = user._id;

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123'
        });

      token = res.body.token;
    });

    it('debe obtener perfil con token válido', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('debe fallar sin token', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con token inválido', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});