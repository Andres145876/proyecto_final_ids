const jwt = require('jsonwebtoken');
const { protect, authorize, generateToken } = require('../../src/middleware/auth');
const User = require('../../src/models/User');

jest.mock('jsonwebtoken');
jest.mock('../../src/models/User');

describe('Auth Middleware - Pruebas Unitarias', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      headers: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('protect middleware', () => {
    it('debe permitir acceso con token válido', async () => {
      const mockUser = {
        _id: 'userId123',
        nombre: 'Test User',
        email: 'test@test.com',
        rol: 'usuario',
        activo: true
      };

      req.headers.authorization = 'Bearer validToken123';

      jwt.verify.mockReturnValue({ id: mockUser._id });
      User.findById.mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('validToken123', process.env.JWT_SECRET);
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe rechazar request sin token', async () => {
      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar token inválido', async () => {
      req.headers.authorization = 'Bearer invalidToken';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido o expirado'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar token expirado', async () => {
      req.headers.authorization = 'Bearer expiredToken';

      jwt.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token inválido o expirado'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar si usuario no existe', async () => {
      req.headers.authorization = 'Bearer validToken123';

      jwt.verify.mockReturnValue({ id: 'nonExistentUserId' });
      User.findById.mockResolvedValue(null);

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario no encontrado'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar si usuario está inactivo', async () => {
      const mockUser = {
        _id: 'userId123',
        nombre: 'Test User',
        email: 'test@test.com',
        rol: 'usuario',
        activo: false
      };

      req.headers.authorization = 'Bearer validToken123';

      jwt.verify.mockReturnValue({ id: mockUser._id });
      User.findById.mockResolvedValue(mockUser);

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Usuario inactivo'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe manejar formato de authorization incorrecto', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No autorizado para acceder a esta ruta'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe manejar authorization sin Bearer prefix', async () => {
      req.headers.authorization = 'tokenWithoutBearer';

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      req.user = {
        _id: 'userId123',
        nombre: 'Test User',
        email: 'test@test.com',
        rol: 'usuario'
      };
    });

    it('debe permitir acceso si usuario tiene rol autorizado', () => {
      const middleware = authorize('usuario', 'administrador');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe rechazar si usuario no tiene rol autorizado', () => {
      const middleware = authorize('administrador');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'El rol usuario no está autorizado para acceder a esta ruta'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir acceso a administrador', () => {
      req.user.rol = 'administrador';
      const middleware = authorize('administrador');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe manejar múltiples roles autorizados', () => {
      const middleware = authorize('usuario', 'administrador', 'moderador');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('debe rechazar si no se especifican roles', () => {
      const middleware = authorize();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('generateToken function', () => {
    it('debe generar token válido', () => {
      const userId = 'userId123';
      const mockToken = 'generatedToken123';

      jwt.sign.mockReturnValue(mockToken);

      const token = generateToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      expect(token).toBe(mockToken);
    });

    it('debe usar configuración de entorno correcta', () => {
      const userId = 'testUser456';
      
      generateToken(userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: userId },
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: process.env.JWT_EXPIRES_IN
        })
      );
    });
  });
});