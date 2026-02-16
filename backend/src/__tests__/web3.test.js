const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockGetAuctionABI = jest.fn().mockReturnValue([]);
const mockGetProvider = jest.fn().mockReturnValue({});
const mockGetWallet = jest.fn().mockReturnValue({});
const mockIsDeploymentConfigured = jest.fn().mockReturnValue(false);

jest.mock('../contracts', () => ({
  getAuctionABI: (...args) => mockGetAuctionABI(...args),
}));

jest.mock('../services/contractDeployment', () => ({
  getProvider: () => mockGetProvider(),
  getWallet: () => mockGetWallet(),
  isDeploymentConfigured: () => mockIsDeploymentConfigured(),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => JSON.stringify({ contracts: {} })),
}));

const web3Routes = require('../routes/web3');

const app = express();
app.use(express.json());
app.use('/api/web3', web3Routes);

const testAddress = '0x1234567890123456789012345678901234567890';
const mockUser = {
  id: 'user-1',
  address: testAddress,
  username: null,
  email: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Web3 API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  describe('GET /api/web3/contracts', () => {
    it('returns contract addresses (or empty)', async () => {
      const res = await request(app).get('/api/web3/contracts').expect(200);
      expect(res.body).toEqual(expect.any(Object));
    });
  });

  describe('GET /api/web3/auction/:contractAddress/state', () => {
    it('returns 400 when type is missing', async () => {
      const res = await request(app)
        .get('/api/web3/auction/0xabc/state')
        .expect(400);
      expect(res.body.error).toContain('type');
    });

    it('returns 400 for invalid auction type', async () => {
      const res = await request(app)
        .get('/api/web3/auction/0xabc/state')
        .query({ type: 'INVALID' })
        .expect(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('POST /api/web3/auction/:contractAddress/bid', () => {
    it('returns 401 when no auth token', async () => {
      await request(app)
        .post('/api/web3/auction/0xabc/bid')
        .send({ amount: '1', type: 'DUTCH' })
        .expect(401);
    });

    it('returns 400 when type is missing', async () => {
      const token = jwt.sign(
        { address: testAddress, userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/web3/auction/0xabc/bid')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: '1' })
        .expect(400);

      expect(res.body.error).toContain('type');
    });
  });
});
