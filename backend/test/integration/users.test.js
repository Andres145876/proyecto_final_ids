require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../../src/server');
const { connectDB, disconnectDB, clearDB } = require('../setup/testDb');
const { 
  createTestUser, 
  createTestAdmin, 
  generateTestToken
} = require('../helpers/testHelpers');

describe('User Endpoints', () => {
  let userToken;
  let adminToken;
  let user;
  let admin;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();
    user = await createTestUser({ email: 'user@test.com' });
    admin = await createTestAdmin({ email: 'admin@test.com' });
    userToken = generateTestToken(user._id);
    adminToken = generateTestToken(admin._id);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET /api/users', () => {
    it('admin debe obtener todos los usuarios', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
    });

    it('usuario normal no debe acceder', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('debe fallar sin autenticación', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:id', () => {
    it('admin debe obtener usuario por ID', async () => {
      const res = await request(app)
        .get(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('user@test.com');
    });

    it('usuario normal no debe acceder', async () => {
      const res = await request(app)
        .get(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('debe fallar con ID inexistente', async () => {
      const res = await request(app)
        .get('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('admin debe actualizar usuario', async () => {
      const updateData = {
        nombre: 'Nombre Actualizado',
        telefono: '9876543210'
      };

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.user.nombre).toBe(updateData.nombre);
    });

    it('admin no debe desactivar su propia cuenta', async () => {
      const res = await request(app)
        .put(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ activo: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('propia cuenta');
    });

    it('usuario normal no debe actualizar otros usuarios', async () => {
      const res = await request(app)
        .put(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ nombre: 'Hacker' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('admin debe eliminar usuario', async () => {
      const res = await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('admin no debe eliminarse a sí mismo', async () => {
      const res = await request(app)
        .delete(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('propia cuenta');
    });

    it('usuario normal no debe eliminar usuarios', async () => {
      const res = await request(app)
        .delete(`/api/users/${admin._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('admin debe cambiar rol de usuario', async () => {
      const res = await request(app)
        .patch(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'administrador' });

      expect(res.status).toBe(200);
      expect(res.body.user.rol).toBe('administrador');
    });

    it('admin no debe cambiar su propio rol', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'usuario' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('propio rol');
    });

    it('debe fallar con rol inválido', async () => {
      const res = await request(app)
        .patch(`/api/users/${user._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ rol: 'superadmin' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/users/:id/status', () => {
    it('admin debe activar/desactivar usuario', async () => {
      const res = await request(app)
        .patch(`/api/users/${user._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.activo).toBe(false);
    });

    it('admin no debe cambiar su propio estado', async () => {
      const res = await request(app)
        .patch(`/api/users/${admin._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/stats', () => {
    beforeEach(async () => {
      await createTestUser({ email: 'user2@test.com', activo: false });
    });

    it('admin debe obtener estadísticas', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toHaveProperty('total');
      expect(res.body.stats).toHaveProperty('active');
      expect(res.body.stats).toHaveProperty('admins');
    });

    it('usuario normal no debe acceder', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});