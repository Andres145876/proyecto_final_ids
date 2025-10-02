require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conectado a MongoDB');

        // Verificar si ya existe
        const existingAdmin = await User.findOne({ email: 'admin@patitasfelices.com' });
        if (existingAdmin) {
            console.log('El admin ya existe. Eliminando...');
            await User.deleteOne({ email: 'admin@patitasfelices.com' });
        }

        // Crear nuevo admin con password hasheado automáticamente
        const admin = await User.create({
            nombre: 'Admin Principal',
            email: 'admin@patitasfelices.com',
            password: 'Hola1234', // Se hasheará automáticamente por el pre-save hook
            rol: 'administrador',
            activo: true,
            telefono: '1234567890',
            direccion: 'Dirección del refugio'
        });

        console.log('✅ Admin creado exitosamente:');
        console.log('Email:', admin.email);
        console.log('Password:', 'Hola1234');
        console.log('Rol:', admin.rol);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createAdmin();