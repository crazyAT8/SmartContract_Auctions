const jwt = require('jsonwebtoken');
const { authenticateUser, optionalAuth } = require('../auth');
const { prisma } = require('../../config/database');
const { logger } = require('../../utils/logger');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should return 401 if no authorization header', async () => {
      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Invalid token';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is empty after Bearer', async () => {
      req.headers.authorization = 'Bearer ';

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      await authenticateUser(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(logger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(logger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate user with valid token and existing user', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const decoded = { address: '0x123', username: 'testuser' };
      const mockUser = { id: 1, address: '0x123', username: 'testuser' };

      jwt.verify.mockReturnValue(decoded);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateUser(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { address: '0x123' },
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should create user if not exists and authenticate', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const decoded = { address: '0x123', username: 'testuser', email: 'test@test.com' };
      const newUser = { id: 1, address: '0x123', username: 'testuser', email: 'test@test.com' };

      jwt.verify.mockReturnValue(decoded);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(newUser);

      await authenticateUser(req, res, next);

      expect(prisma.user.findUnique).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          address: '0x123',
          username: 'testuser',
          email: 'test@test.com',
        },
      });
      expect(req.user).toEqual(newUser);
      expect(next).toHaveBeenCalled();
    });

    it('should return 500 for unexpected errors', async () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Database error');
      });

      await authenticateUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
      expect(logger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set req.user to null and continue if no authorization header', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user to null and continue if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Invalid token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user to null and continue if token is empty', async () => {
      req.headers.authorization = 'Bearer ';

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user to null and continue if token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should authenticate user with valid token', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const decoded = { address: '0x123' };
      const mockUser = { id: 1, address: '0x123', username: 'testuser' };

      jwt.verify.mockReturnValue(decoded);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await optionalAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { address: '0x123' },
      });
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should set req.user to null if user not found in database', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const decoded = { address: '0x123' };

      jwt.verify.mockReturnValue(decoded);
      prisma.user.findUnique.mockResolvedValue(null);

      await optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

