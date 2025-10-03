const authController = require('../../src/controllers/authController');
const User = require('../../src/models/User');
const { generateToken } = require('../../src/middleware/auth');

// Mockear dependencias
jest.mock('../../src/models/User');
jest.mock('../../src/middleware/auth');

describe('AuthController - Pruebas Unitarias', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock request y response
    req = {
      body: {},
      user: { id: 'mockUserId123' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('register', () => {
    const validUserData = {
      nombre: 'Juan Pérez',
      email: 'juan@test.com',
      password: 'Password123',
      telefono: '5551234567',
      direccion: 'Calle Test 123'
    };

    it('debe registrar usuario exitosamente', async () => {
      req.body = validUserData;

      const mockUser = {
        _id: 'userId123',
        nombre: validUserData.nombre,
        email: validUserData.email,
        rol: 'usuario'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      generateToken.mockReturnValue('mockToken123');

      await authController.register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: validUserData.email });
      expect(User.create).toHaveBeenCalledWith({
        nombre: validUserData.nombre,
        email: validUserData.email,
        password: validUserData.password,
        telefono: validUserData.telefono,
        direccion: validUserData.direccion,
        rol: 'usuario'
      });
      expect(generateToken).toHaveBeenCalledWith(mockUser._id);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario registrado exitosamente',
        token: 'mockToken123',
        user: {
          id: mockUser._id,
          nombre: mockUser.nombre,
          email: mockUser.email,
          rol: mockUser.rol
        }
      });
    });

    it('debe rechazar email duplicado', async () => {
      req.body = validUserData;

      User.findOne.mockResolvedValue({ email: validUserData.email });

      await authController.register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: validUserData.email });
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'El email ya está registrado'
      });
    });

    it('debe manejar errores de base de datos', async () => {
      req.body = validUserData;

      const dbError = new Error('Database connection failed');
      User.findOne.mockRejectedValue(dbError);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al registrar usuario',
        error: dbError.message
      });
    });

    it('debe manejar error al crear usuario', async () => {
      req.body = validUserData;

      User.findOne.mockResolvedValue(null);
      const createError = new Error('User validation failed');
      User.create.mockRejectedValue(createError);

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al registrar usuario',
        error: createError.message
      });
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@test.com',
      password: 'Password123'
    };

    it('debe iniciar sesión exitosamente', async () => {
      req.body = loginData;

      const mockUser = {
        _id: 'userId123',
        nombre: 'Test User',
        email: loginData.email,
        rol: 'usuario',
        activo: true,
        compararPassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });
      generateToken.mockReturnValue('mockToken123');

      await authController.login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(mockUser.compararPassword).toHaveBeenCalledWith(loginData.password);
      expect(generateToken).toHaveBeenCalledWith(mockUser._id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login exitoso',
        token: 'mockToken123',
        user: {
          id: mockUser._id,
          nombre: mockUser.nombre,
          email: mockUser.email,
          rol: mockUser.rol
        }
      });
    });

    it('debe rechazar usuario no encontrado', async () => {
      req.body = loginData;

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Credenciales inválidas'
      });
    });

    it('debe rechazar usuario inactivo', async () => {
      req.body = loginData;

      const mockUser = {
        _id: 'userId123',
        email: loginData.email,
        activo: false
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario inactivo. Contacta al administrador.'
      });
    });

    it('debe rechazar contraseña incorrecta', async () => {
      req.body = loginData;

      const mockUser = {
        _id: 'userId123',
        email: loginData.email,
        activo: true,
        compararPassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      await authController.login(req, res);

      expect(mockUser.compararPassword).toHaveBeenCalledWith(loginData.password);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Credenciales inválidas'
      });
    });

    it('debe manejar errores de base de datos', async () => {
      req.body = loginData;

      const dbError = new Error('Database error');
      User.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(dbError)
      });

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al iniciar sesión',
        error: dbError.message
      });
    });
  });

  describe('getProfile', () => {
    it('debe obtener perfil exitosamente', async () => {
      const mockUser = {
        _id: 'userId123',
        nombre: 'Test User',
        email: 'test@test.com',
        telefono: '1234567890',
        direccion: 'Test Address',
        rol: 'usuario',
        createdAt: new Date()
      };

      User.findById.mockResolvedValue(mockUser);

      await authController.getProfile(req, res);

      expect(User.findById).toHaveBeenCalledWith(req.user.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        user: {
          id: mockUser._id,
          nombre: mockUser.nombre,
          email: mockUser.email,
          telefono: mockUser.telefono,
          direccion: mockUser.direccion,
          rol: mockUser.rol,
          createdAt: mockUser.createdAt
        }
      });
    });

    it('debe manejar error al buscar usuario', async () => {
      const dbError = new Error('User not found');
      User.findById.mockRejectedValue(dbError);

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al obtener perfil',
        error: dbError.message
      });
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      nombre: 'Nuevo Nombre',
      telefono: '9876543210',
      direccion: 'Nueva Dirección'
    };

    it('debe actualizar perfil exitosamente', async () => {
      req.body = updateData;

      const mockUpdatedUser = {
        _id: 'userId123',
        nombre: updateData.nombre,
        email: 'test@test.com',
        telefono: updateData.telefono,
        direccion: updateData.direccion,
        rol: 'usuario'
      };

      User.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

      await authController.updateProfile(req, res);

      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        req.user.id,
        { nombre: updateData.nombre, telefono: updateData.telefono, direccion: updateData.direccion },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: {
          id: mockUpdatedUser._id,
          nombre: mockUpdatedUser.nombre,
          email: mockUpdatedUser.email,
          telefono: mockUpdatedUser.telefono,
          direccion: mockUpdatedUser.direccion,
          rol: mockUpdatedUser.rol
        }
      });
    });

    it('debe manejar error de validación', async () => {
      req.body = updateData;

      const validationError = new Error('Validation failed');
      User.findByIdAndUpdate.mockRejectedValue(validationError);

      await authController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error al actualizar perfil',
        error: validationError.message
      });
    });
  });
});