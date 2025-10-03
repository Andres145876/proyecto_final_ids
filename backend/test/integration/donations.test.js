require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../../src/server');
const { connectDB, disconnectDB, clearDB } = require('../setup/testDb');
const { 
  createTestUser, 
  createTestAdmin, 
  generateTestToken,
  createTestDonation 
} = require('../helpers/testHelpers');

describe('Donation Endpoints', () => {
  let userToken;
  let adminToken;
  let user;
  let admin;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Crear usuario y admin
    user = await createTestUser({ email: 'user@test.com' });
    admin = await createTestAdmin({ email: 'admin@test.com' });

    // Generar tokens
    userToken = generateTestToken(user._id);
    adminToken = generateTestToken(admin._id);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('POST /api/donations', () => {
    it('debe crear una donación exitosamente', async () => {
      const donationData = {
        articulo: 'Alimento para perros',
        categoria: 'alimento_perros',
        cantidad: 10,
        unidad: 'kg',
        descripcion: 'Alimento premium'
      };

      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(donationData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.donation).toHaveProperty('_id');
      expect(res.body.donation.estado).toBe('pendiente');
      expect(res.body.donation.articulo).toBe(donationData.articulo);
    });

    it('debe fallar sin autenticación', async () => {
      const donationData = {
        articulo: 'Alimento para perros',
        categoria: 'alimento_perros',
        cantidad: 10,
        unidad: 'kg'
      };

      const res = await request(app)
        .post('/api/donations')
        .send(donationData);

      expect(res.status).toBe(401);
    });

    it('debe fallar con datos inválidos', async () => {
      const donationData = {
        articulo: 'A',
        categoria: 'categoria_invalida',
        cantidad: -5,
        unidad: 'unidad_invalida'
      };

      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(donationData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('debe crear donación con campos opcionales', async () => {
      const donationData = {
        articulo: 'Mantas',
        categoria: 'mantas',
        cantidad: 5,
        unidad: 'unidades',
        descripcion: 'Mantas de invierno'
      };

      const res = await request(app)
        .post('/api/donations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(donationData);

      expect(res.status).toBe(201);
      expect(res.body.donation.descripcion).toBe(donationData.descripcion);
    });
  });

  describe('GET /api/donations', () => {
    beforeEach(async () => {
      // Crear donaciones de prueba
      await createTestDonation(user._id, {
        articulo: 'Alimento perros',
        categoria: 'alimento_perros'
      });
      await createTestDonation(admin._id, {
        articulo: 'Juguetes',
        categoria: 'juguetes'
      });
    });

    it('usuario debe ver solo sus donaciones', async () => {
      const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('admin debe ver todas las donaciones', async () => {
      const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('debe fallar sin autenticación', async () => {
      const res = await request(app).get('/api/donations');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/donations/:id', () => {
    let donation;

    beforeEach(async () => {
      donation = await createTestDonation(user._id);
    });

    it('debe obtener una donación por ID', async () => {
      const res = await request(app)
        .get(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.donation._id.toString()).toBe(donation._id.toString());
    });

    it('debe fallar con ID inválido', async () => {
      const res = await request(app)
        .get('/api/donations/123invalid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(500);
    });

    it('debe fallar si usuario intenta ver donación de otro', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherToken = generateTestToken(otherUser._id);

      const res = await request(app)
        .get(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('admin debe poder ver cualquier donación', async () => {
      const res = await request(app)
        .get(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/donations/:id/status', () => {
    let donation;

    beforeEach(async () => {
      donation = await createTestDonation(user._id);
    });

    it('admin debe poder actualizar estado', async () => {
      const res = await request(app)
        .patch(`/api/donations/${donation._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.donation.estado).toBe('aceptada');
    });

    it('usuario normal no debe poder actualizar estado', async () => {
      const res = await request(app)
        .patch(`/api/donations/${donation._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(403);
    });

    it('debe agregar al inventario cuando estado es recibida', async () => {
      const res = await request(app)
        .patch(`/api/donations/${donation._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'recibida' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('inventario');
    });
  });

  describe('DELETE /api/donations/:id', () => {
    let donation;

    beforeEach(async () => {
      donation = await createTestDonation(user._id);
    });

    it('admin debe poder eliminar donación', async () => {
      const res = await request(app)
        .delete(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('usuario no debe poder eliminar donación', async () => {
      const res = await request(app)
        .delete(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('no debe poder eliminar donación ya recibida', async () => {
      donation.estado = 'recibida';
      await donation.save();

      const res = await request(app)
        .delete(`/api/donations/${donation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/donations/stats', () => {
    beforeEach(async () => {
      await createTestDonation(user._id, { estado: 'pendiente' });
      await createTestDonation(user._id, { estado: 'aceptada' });
      await createTestDonation(admin._id, { estado: 'recibida' });
    });

    it('admin debe obtener estadísticas', async () => {
      const res = await request(app)
        .get('/api/donations/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.total).toBe(3);
    });

    it('usuario no debe acceder a estadísticas', async () => {
      const res = await request(app)
        .get('/api/donations/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });
});