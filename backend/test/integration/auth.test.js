require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../../src/server');
const { connectDB, disconnectDB, clearDB } = require('../setup/testDb');
const { createTestUser, generateTestToken } = require('../helpers/testHelpers');

describe('Auth Endpoints - Integration Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('POST /api/auth/register', () => {
    it('debe registrar un nuevo usuario exitosamente', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123',
        telefono: '5551234567',
        direccion: 'Calle Test 123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(userData.email);
      expect(res.body.user.rol).toBe('usuario');
      expect(res.body.user.id).toBeDefined();
      expect(res.body.message).toBe('Usuario registrado exitosamente');
    });

    it('debe fallar con email duplicado', async () => {
      await createTestUser({ email: 'juan@example.com' });

      const userData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'Password123',
        telefono: '5551234567'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('El email ya está registrado');
    });

    it('debe fallar con nombre muy corto', async () => {
      const userData = {
        nombre: 'J',
        email: 'test@example.com',
        password: 'Password123',
        telefono: '5551234567'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con email inválido', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'invalid-email',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con contraseña débil', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'test@example.com',
        password: '123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe sanitizar entrada para prevenir XSS', async () => {
      const userData = {
        nombre: '<script>alert("xss")</script>Juan',
        email: 'juan@example.com',
        password: 'Password123',
        telefono: '5551234567'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.user.nombre).not.toContain('<script>');
      expect(res.body.user.nombre).toContain('Juan');
    });

    it('debe fallar si falta campo requerido (nombre)', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar si falta campo requerido (email)', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar si falta campo requerido (password)', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'test@example.com'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con teléfono inválido', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'test@example.com',
        password: 'Password123',
        telefono: '123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe registrar usuario sin teléfono (campo opcional)', async () => {
      const userData = {
        nombre: 'Juan Pérez',
        email: 'test@example.com',
        password: 'Password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({ 
        email: 'test@example.com', 
        password: 'Password123' 
      });
    });

    it('debe iniciar sesión exitosamente', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'test@example.com', 
          password: 'Password123' 
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.message).toBe('Login exitoso');
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
      expect(res.body.message).toBe('Credenciales inválidas');
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
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('debe fallar si el usuario está inactivo', async () => {
      await createTestUser({ 
        email: 'inactive@example.com',
        password: 'Password123',
        activo: false 
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'inactive@example.com', 
          password: 'Password123' 
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('inactivo');
    });

    it('debe fallar sin email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          password: 'Password123' 
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar sin password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'test@example.com' 
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con email en formato incorrecto', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'not-an-email', 
          password: 'Password123' 
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe normalizar email a lowercase', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ 
          email: 'TEST@EXAMPLE.COM', 
          password: 'Password123' 
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;
    let user;

    beforeEach(async () => {
      user = await createTestUser({ 
        email: 'profile@example.com',
        nombre: 'Usuario Profile',
        telefono: '5551234567',
        direccion: 'Calle Test 123'
      });
      token = generateTestToken(user._id);
    });

    it('debe obtener perfil con token válido', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('profile@example.com');
      expect(res.body.user.nombre).toBe('Usuario Profile');
      expect(res.body.user.telefono).toBe('5551234567');
      expect(res.body.user.direccion).toBe('Calle Test 123');
      expect(res.body.user.rol).toBeDefined();
      expect(res.body.user.createdAt).toBeDefined();
    });

    it('debe fallar sin token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('No autorizado para acceder a esta ruta');
    });

    it('debe fallar con token inválido', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Token inválido o expirado');
    });

    it('debe fallar con token sin Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', token);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con header Authorization vacío', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', '');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    let token;
    let user;

    beforeEach(async () => {
      user = await createTestUser({ 
        email: 'update@example.com',
        nombre: 'Usuario Original',
        telefono: '5551234567',
        direccion: 'Dirección Original'
      });
      token = generateTestToken(user._id);
    });

    it('debe actualizar perfil exitosamente', async () => {
      const updateData = {
        nombre: 'Nuevo Nombre',
        telefono: '9876543210',
        direccion: 'Nueva Dirección 456'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.nombre).toBe(updateData.nombre);
      expect(res.body.user.telefono).toBe(updateData.telefono);
      expect(res.body.user.direccion).toBe(updateData.direccion);
      expect(res.body.message).toBe('Perfil actualizado exitosamente');
    });

    it('debe actualizar solo nombre', async () => {
      const updateData = {
        nombre: 'Solo Nombre Actualizado'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.nombre).toBe(updateData.nombre);
    });

    it('debe actualizar solo teléfono', async () => {
      const updateData = {
        telefono: '1112223333'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.telefono).toBe(updateData.telefono);
    });

    it('debe actualizar solo dirección', async () => {
      const updateData = {
        direccion: 'Solo Dirección Nueva'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.direccion).toBe(updateData.direccion);
    });

    it('debe fallar sin autenticación', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .send({ nombre: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debe fallar con token inválido', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .send({ nombre: 'Test' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('no debe permitir actualizar email', async () => {
      const updateData = {
        nombre: 'Nuevo Nombre',
        email: 'nuevo@email.com'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('update@example.com');
    });

    it('no debe permitir actualizar rol', async () => {
      const updateData = {
        nombre: 'Nuevo Nombre',
        rol: 'administrador'
      };

      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.user.rol).toBe('usuario');
    });
  });
});