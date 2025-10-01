// testDonationInventory.js
require('dotenv').config(); // Cargar variables de entorno
const mongoose = require('mongoose');
const Donation = require('./src/models/Donation');
const Inventory = require('./src/models/Inventory');

// Usar la URI del .env
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function diagnosticar() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // 1. Ver todas las donaciones
    console.log('=== DONACIONES ===');
    const donations = await Donation.find().populate('usuario', 'nombre email');
    console.log(`Total de donaciones: ${donations.length}`);
    donations.forEach((don, i) => {
      console.log(`\n${i + 1}. ${don.articulo}`);
      console.log(`   ID: ${don._id}`);
      console.log(`   Categoría: ${don.categoria}`);
      console.log(`   Cantidad: ${don.cantidad} ${don.unidad}`);
      console.log(`   Estado: ${don.estado}`);
      console.log(`   Usuario: ${don.usuario?.nombre || 'N/A'}`);
    });

    // 2. Ver todo el inventario
    console.log('\n\n=== INVENTARIO ===');
    const inventory = await Inventory.find();
    console.log(`Total de artículos: ${inventory.length}`);
    inventory.forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.nombre}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   Categoría: ${item.categoria}`);
      console.log(`   Cantidad: ${item.cantidad} ${item.unidad}`);
      console.log(`   Disponible: ${item.disponible}`);
    });

    // 3. Buscar donaciones "recibidas" que NO estén en inventario
    console.log('\n\n=== ANÁLISIS ===');
    const donacionesRecibidas = donations.filter(d => d.estado === 'recibida');
    console.log(`Donaciones con estado "recibida": ${donacionesRecibidas.length}`);

    for (const don of donacionesRecibidas) {
      const enInventario = inventory.find(
        inv => inv.nombre === don.articulo && 
               inv.categoria === don.categoria &&
               inv.unidad === don.unidad
      );

      if (!enInventario) {
        console.log(`\n⚠️  PROBLEMA: Donación recibida NO está en inventario:`);
        console.log(`   Artículo: ${don.articulo}`);
        console.log(`   Categoría: ${don.categoria}`);
        console.log(`   Cantidad: ${don.cantidad} ${don.unidad}`);
        console.log(`   ID Donación: ${don._id}`);
      }
    }

    // 4. Intentar agregar manualmente una donación al inventario
    console.log('\n\n=== PRUEBA MANUAL ===');
    if (donacionesRecibidas.length > 0) {
      const primeraRecibida = donacionesRecibidas[0];
      console.log(`Intentando agregar: ${primeraRecibida.articulo}`);

      let inventoryItem = await Inventory.findOne({
        nombre: primeraRecibida.articulo,
        categoria: primeraRecibida.categoria,
        unidad: primeraRecibida.unidad
      });

      if (inventoryItem) {
        console.log(`✅ Ya existe en inventario (ID: ${inventoryItem._id})`);
        console.log(`   Cantidad actual: ${inventoryItem.cantidad}`);
        console.log(`   Sumando: ${primeraRecibida.cantidad}`);
        inventoryItem.cantidad += primeraRecibida.cantidad;
        await inventoryItem.save();
        console.log(`   Nueva cantidad: ${inventoryItem.cantidad}`);
      } else {
        console.log(`⚠️  No existe, creando nuevo...`);
        const nuevoItem = await Inventory.create({
          nombre: primeraRecibida.articulo,
          categoria: primeraRecibida.categoria,
          cantidad: primeraRecibida.cantidad,
          unidad: primeraRecibida.unidad,
          descripcion: primeraRecibida.descripcion || `Donación de ${primeraRecibida.articulo}`,
          disponible: true
        });
        console.log(`✅ Creado en inventario (ID: ${nuevoItem._id})`);
      }
    } else {
      console.log('No hay donaciones con estado "recibida" para probar');
    }

    console.log('\n\n✅ Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

diagnosticar();