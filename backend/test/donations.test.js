const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');
const User = require('../src/models/User');
const Donation = require('../src/models/Donation');

describe('Donation Endpoints', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  beforeAll(async () => {
    const testDbUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/patitas-felices-test';
    await mongoose.connect(testDbUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Donation.deleteMany({});

    // Crear usuario normal
    const user = await User.create({
      nombre: 'Usuario Test',
      email: 'user@example.com',
      password: 'Password123',
      rol: 'usuario'
    });
    userId = user._id;

    // Crear admin
    const admin = await User.create({
      nombre: 'Admin Test',
      email: 'admin@example.com',
      password: 'Password123',
      rol: 'administrador'
    });
    adminId = admin._id;

    // Obtener tokens
    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'Password123' });
    userToken = userRes.body.token;

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123' });
    adminToken = adminRes.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
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
  });

  describe('GET /api/donations', () => {
    beforeEach(async () => {
      // Crear donaciones de prueba
      await Donation.create([
        {
          usuario: userId,
          articulo: 'Alimento perros',
          categoria: 'alimento_perros',
          cantidad: 5,
          unidad: 'kg'
        },
        {
          usuario: adminId,
          articulo: 'Juguetes',
          categoria: 'juguetes',
          cantidad: 10,
          unidad: 'unidades'
        }
      ]);
    });

    it('usuario debe ver solo sus donaciones', async () => {
      const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.donations[0].usuario._id.toString()).toBe(userId.toString());
    });

    it('admin debe ver todas las donaciones', async () => {
      const res = await request(app)
        .get('/api/donations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });
  });

  describe('PATCH /api/donations/:id/status', () => {
    let donationId;

    beforeEach(async () => {
      const donation = await Donation.create({
        usuario: userId,
        articulo: 'Alimento perros',
        categoria: 'alimento_perros',
        cantidad: 5,
        unidad: 'kg'
      });
      donationId = donation._id;
    });

    it('admin debe poder actualizar estado', async () => {
      const res = await request(app)
        .patch(`/api/donations/${donationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.donation.estado).toBe('aceptada');
    });

    it('usuario normal no debe poder actualizar estado', async () => {
      const res = await request(app)
        .patch(`/api/donations/${donationId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(403);
    });
  });
});