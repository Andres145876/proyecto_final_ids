require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const app = require('../../src/server');
const { connectDB, disconnectDB, clearDB } = require('../setup/testDb');
const { 
  createTestUser, 
  createTestAdmin, 
  generateTestToken,
  createTestInventoryItem 
} = require('../helpers/testHelpers');

describe('Inventory Endpoints', () => {
  let userToken;
  let adminToken;
  let user;
  let admin;

  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await clearDB();
    user = await createTestUser();
    admin = await createTestAdmin();
    userToken = generateTestToken(user._id);
    adminToken = generateTestToken(admin._id);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET /api/inventory', () => {
    beforeEach(async () => {
      await createTestInventoryItem({ nombre: 'Alimento perros', cantidad: 50 });
      await createTestInventoryItem({ nombre: 'Juguetes', cantidad: 0, disponible: false });
    });

    it('debe obtener todo el inventario', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
    });

    it('debe filtrar por disponibilidad', async () => {
      const res = await request(app)
        .get('/api/inventory?disponible=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('debe filtrar por categoría', async () => {
      await createTestInventoryItem({ 
        nombre: 'Medicamentos',
        categoria: 'medicamentos'
      });

      const res = await request(app)
        .get('/api/inventory?categoria=medicamentos')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.inventory[0].categoria).toBe('medicamentos');
    });
  });

  describe('GET /api/inventory/:id', () => {
    let item;

    beforeEach(async () => {
      item = await createTestInventoryItem();
    });

    it('debe obtener item por ID', async () => {
      const res = await request(app)
        .get(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item._id.toString()).toBe(item._id.toString());
    });

    it('debe fallar con ID inválido', async () => {
      const res = await request(app)
        .get('/api/inventory/invalid-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/inventory', () => {
    it('admin debe crear item en inventario', async () => {
      const itemData = {
        nombre: 'Collares',
        categoria: 'accesorios',
        cantidad: 20,
        unidad: 'unidades',
        descripcion: 'Collares variados'
      };

      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(itemData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.item.nombre).toBe(itemData.nombre);
    });

    it('usuario no debe crear item', async () => {
      const itemData = {
        nombre: 'Test',
        categoria: 'otros',
        cantidad: 10,
        unidad: 'unidades'
      };

      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send(itemData);

      expect(res.status).toBe(403);
    });

    it('debe fallar al crear item duplicado', async () => {
      await createTestInventoryItem({ nombre: 'Item Duplicado' });

      const itemData = {
        nombre: 'Item Duplicado',
        categoria: 'alimento_perros',
        cantidad: 10,
        unidad: 'kg'
      };

      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(itemData);

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/inventory/:id', () => {
    let item;

    beforeEach(async () => {
      item = await createTestInventoryItem();
    });

    it('admin debe actualizar item', async () => {
      const updateData = {
        nombre: 'Nuevo Nombre',
        cantidad: 100
      };

      const res = await request(app)
        .put(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.item.nombre).toBe(updateData.nombre);
      expect(res.body.item.cantidad).toBe(updateData.cantidad);
    });

    it('usuario no debe actualizar item', async () => {
      const res = await request(app)
        .put(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ cantidad: 50 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    let item;

    beforeEach(async () => {
      item = await createTestInventoryItem();
    });

    it('admin debe eliminar item', async () => {
      const res = await request(app)
        .delete(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('usuario no debe eliminar item', async () => {
      const res = await request(app)
        .delete(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/inventory/:id/adjust', () => {
    let item;

    beforeEach(async () => {
      item = await createTestInventoryItem({ cantidad: 50 });
    });

    it('admin debe agregar cantidad', async () => {
      const res = await request(app)
        .patch(`/api/inventory/${item._id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cantidad: 20, operacion: 'add' });

      expect(res.status).toBe(200);
      expect(res.body.item.cantidad).toBe(70);
    });

    it('admin debe restar cantidad', async () => {
      const res = await request(app)
        .patch(`/api/inventory/${item._id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cantidad: 10, operacion: 'subtract' });

      expect(res.status).toBe(200);
      expect(res.body.item.cantidad).toBe(40);
    });

    it('debe fallar al restar más de lo disponible', async () => {
      const res = await request(app)
        .patch(`/api/inventory/${item._id}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cantidad: 100, operacion: 'subtract' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/inventory/stats', () => {
    beforeEach(async () => {
      await createTestInventoryItem({ cantidad: 50, disponible: true });
      await createTestInventoryItem({ cantidad: 0, disponible: false });
    });

    it('admin debe obtener estadísticas', async () => {
      const res = await request(app)
        .get('/api/inventory/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toHaveProperty('total');
    });
  });
});