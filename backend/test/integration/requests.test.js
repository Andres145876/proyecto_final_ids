require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../../src/server');
const { connectDB, disconnectDB, clearDB } = require('../setup/testDb');
const { 
  createTestUser, 
  createTestAdmin, 
  generateTestToken,
  createTestInventoryItem,
  createTestRequest
} = require('../helpers/testHelpers');

describe('Request Endpoints', () => {
  let userToken;
  let adminToken;
  let user;
  let admin;
  let inventoryItem;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();
    user = await createTestUser();
    admin = await createTestAdmin();
    userToken = generateTestToken(user._id);
    adminToken = generateTestToken(admin._id);
    inventoryItem = await createTestInventoryItem({ cantidad: 100 });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('POST /api/requests', () => {
    it('debe crear una solicitud exitosamente', async () => {
      const requestData = {
        articulo: inventoryItem._id,
        cantidad: 10,
        descripcion: 'Necesito alimento para mi refugio'
      };

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.request).toHaveProperty('_id');
      expect(res.body.request.estado).toBe('pendiente');
      expect(res.body.request.cantidad).toBe(requestData.cantidad);
    });

    it('debe fallar sin autenticación', async () => {
      const requestData = {
        articulo: inventoryItem._id,
        cantidad: 10
      };

      const res = await request(app)
        .post('/api/requests')
        .send(requestData);

      expect(res.status).toBe(401);
    });

    it('debe fallar si ya tiene solicitud activa', async () => {
      await createTestRequest(user._id, inventoryItem._id, { estado: 'pendiente' });

      const requestData = {
        articulo: inventoryItem._id,
        cantidad: 5
      };

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('solicitud activa');
    });

    it('debe fallar si artículo no disponible', async () => {
      const unavailableItem = await createTestInventoryItem({ 
        disponible: false,
        cantidad: 50
      });

      const requestData = {
        articulo: unavailableItem._id,
        cantidad: 10
      };

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('no está disponible');
    });

    it('debe fallar si cantidad insuficiente', async () => {
      const limitedItem = await createTestInventoryItem({ cantidad: 5 });

      const requestData = {
        articulo: limitedItem._id,
        cantidad: 10
      };

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('disponibles');
    });

    it('debe fallar con artículo inexistente', async () => {
      const requestData = {
        articulo: '507f1f77bcf86cd799439011', // ID válido pero inexistente
        cantidad: 10
      };

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${userToken}`)
        .send(requestData);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/requests', () => {
    beforeEach(async () => {
      await createTestRequest(user._id, inventoryItem._id);
      await createTestRequest(admin._id, inventoryItem._id);
    });

    it('usuario debe ver solo sus solicitudes', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('admin debe ver todas las solicitudes', async () => {
      const res = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('debe fallar sin autenticación', async () => {
      const res = await request(app).get('/api/requests');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/requests/:id', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await createTestRequest(user._id, inventoryItem._id);
    });

    it('debe obtener solicitud por ID', async () => {
      const res = await request(app)
        .get(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request._id.toString()).toBe(testRequest._id.toString());
    });

    it('debe fallar si usuario intenta ver solicitud de otro', async () => {
      const otherUser = await createTestUser({ email: 'other@test.com' });
      const otherToken = generateTestToken(otherUser._id);

      const res = await request(app)
        .get(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('admin debe poder ver cualquier solicitud', async () => {
      const res = await request(app)
        .get(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/requests/:id', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await createTestRequest(user._id, inventoryItem._id, {
        cantidad: 10,
        estado: 'pendiente'
      });
    });

    it('usuario debe actualizar su solicitud pendiente', async () => {
      const updateData = {
        cantidad: 15,
        descripcion: 'Descripción actualizada'
      };

      const res = await request(app)
        .put(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.request.cantidad).toBe(updateData.cantidad);
      expect(res.body.request.estado).toBe('pendiente');
    });

    it('debe fallar al actualizar solicitud no pendiente', async () => {
      testRequest.estado = 'aceptada';
      await testRequest.save();

      const res = await request(app)
        .put(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 20 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('pendientes');
    });

    it('debe fallar si solicita más de lo disponible', async () => {
      const res = await request(app)
        .put(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 200 });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/requests/:id/status', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await createTestRequest(user._id, inventoryItem._id, {
        cantidad: 10
      });
    });

    it('admin debe aceptar solicitud', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(200);
      expect(res.body.request.estado).toBe('aceptada');
    });

    it('debe reducir inventario al aceptar', async () => {
      const cantidadOriginal = inventoryItem.cantidad;

      await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aceptada' });

      const Inventory = require('../../src/models/Inventory');
      const updatedItem = await Inventory.findById(inventoryItem._id);
      
      expect(updatedItem.cantidad).toBe(cantidadOriginal - testRequest.cantidad);
    });

    it('admin debe rechazar solicitud con motivo', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          estado: 'rechazada',
          motivoRechazo: 'No hay suficiente stock'
        });

      expect(res.status).toBe(200);
      expect(res.body.request.estado).toBe('rechazada');
      expect(res.body.request.motivoRechazo).toBeDefined();
    });

    it('usuario no debe cambiar estado', async () => {
      const res = await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ estado: 'aceptada' });

      expect(res.status).toBe(403);
    });

    it('debe devolver al inventario si se rechaza después de aceptada', async () => {
      // Primero aceptar
      await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'aceptada' });

      // Luego rechazar
      await request(app)
        .patch(`/api/requests/${testRequest._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estado: 'rechazada' });

      const Inventory = require('../../src/models/Inventory');
      const updatedItem = await Inventory.findById(inventoryItem._id);
      
      expect(updatedItem.cantidad).toBe(inventoryItem.cantidad);
    });
  });

  describe('DELETE /api/requests/:id', () => {
    let testRequest;

    beforeEach(async () => {
      testRequest = await createTestRequest(user._id, inventoryItem._id);
    });

    it('usuario debe eliminar su solicitud pendiente', async () => {
      const res = await request(app)
        .delete(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('debe fallar al eliminar solicitud no pendiente', async () => {
      testRequest.estado = 'aceptada';
      await testRequest.save();

      const res = await request(app)
        .delete(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    it('admin debe eliminar cualquier solicitud', async () => {
      testRequest.estado = 'aceptada';
      await testRequest.save();

      const res = await request(app)
        .delete(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('debe devolver al inventario si estaba aceptada', async () => {
      testRequest.estado = 'aceptada';
      await testRequest.save();

      // Reducir inventario manualmente para simular aceptación
      inventoryItem.cantidad -= testRequest.cantidad;
      await inventoryItem.save();

      await request(app)
        .delete(`/api/requests/${testRequest._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const Inventory = require('../../src/models/Inventory');
      const updatedItem = await Inventory.findById(inventoryItem._id);
      
      expect(updatedItem.cantidad).toBeGreaterThan(inventoryItem.cantidad);
    });
  });
});