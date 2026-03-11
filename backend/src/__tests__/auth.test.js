const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockRedis = {
  setex: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../config/redis', () => ({
  getRedis: jest.fn(() => mockRedis),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const testAddress = '0x1234567890123456789012345678901234567890';
const testNonce = '0x' + 'a'.repeat(64);
const testMessage = `Sign in to Auction dApp\n\nAddress: ${testAddress}\nNonce: ${testNonce}`;

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('POST /api/auth/nonce', () => {
    it('returns 400 for invalid address', async () => {
      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ address: 'invalid' })
        .expect(400);
      expect(res.body.error).toBe('Validation error');
    });

    it('returns nonce and message for valid address', async () => {
      mockRedis.setex.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ address: testAddress })
        .expect(200);

      expect(res.body).toHaveProperty('nonce');
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain(testAddress);
      expect(res.body.nonce).toMatch(/^0x[a-f0-9]+$/);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining(testAddress),
        300,
        expect.any(String)
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when body is invalid', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ address: testAddress })
        .expect(400);
    });

    it('returns 401 when nonce is missing or wrong', async () => {
      mockRedis.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          address: testAddress,
          signature: '0xsignature',
          nonce: testNonce,
        })
        .expect(401);

      expect(res.body.error).toBe('Invalid or expired nonce');
    });

    it('returns 503 when JWT_SECRET is not set', async () => {
      const orig = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      mockRedis.get.mockResolvedValue(testNonce);

      const ethers = require('ethers');
      jest.spyOn(ethers, 'verifyMessage').mockReturnValue(testAddress);
      jest.spyOn(ethers, 'getAddress').mockImplementation((a) => a);

      await request(app)
        .post('/api/auth/login')
        .send({
          address: testAddress,
          signature: '0xsig',
          nonce: testNonce,
        })
        .expect(503);

      process.env.JWT_SECRET = orig;
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no token', async () => {
      await request(app).get('/api/auth/me').expect(401);
    });

    it('returns user when valid token', async () => {
      const mockUser = {
        id: 'user-1',
        address: testAddress,
        username: null,
        email: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const token = jwt.sign(
        { address: testAddress, userId: mockUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.address).toBe(testAddress);
      expect(res.body.id).toBe('user-1');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns success message', async () => {
      const res = await request(app).post('/api/auth/logout').expect(200);
      expect(res.body.message).toBe('Logged out');
    });
  });
});
