const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  auction: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  bid: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
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

jest.mock('../services/contractDeployment', () => ({
  deployAuctionContract: jest.fn().mockResolvedValue({ contractAddress: '0xContract123', tokenAddress: null }),
  isDeploymentConfigured: jest.fn().mockReturnValue(true),
}));

jest.mock('../services/bidValidationService', () => ({
  validateBidAgainstContract: jest.fn().mockResolvedValue({ valid: true }),
}));

const auctionRoutes = require('../routes/auctions');

const app = express();
app.use(express.json());
app.use('/api/auctions', auctionRoutes);

const mockUser = {
  id: 'user-1',
  address: '0x1234567890123456789012345678901234567890',
  username: null,
  email: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreator = {
  id: mockUser.id,
  address: mockUser.address,
  username: mockUser.username,
  avatar: mockUser.avatar,
};

function authHeader() {
  const token = jwt.sign(
    { address: mockUser.address, userId: mockUser.id },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '7d' }
  );
  return { Authorization: `Bearer ${token}` };
}

describe('Auctions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  describe('GET /api/auctions', () => {
    it('returns paginated auctions', async () => {
      const mockAuctions = [
        {
          id: 'auc-1',
          title: 'Test Auction',
          type: 'DUTCH',
          status: 'ACTIVE',
          creator: mockCreator,
          _count: { bids: 5 },
        },
      ];
      mockPrisma.auction.findMany.mockResolvedValue(mockAuctions);
      mockPrisma.auction.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/auctions')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.auctions).toHaveLength(1);
      expect(res.body.auctions[0].title).toBe('Test Auction');
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.pages).toBe(1);
    });

    it('filters by type and status when provided', async () => {
      mockPrisma.auction.findMany.mockResolvedValue([]);
      mockPrisma.auction.count.mockResolvedValue(0);

      await request(app)
        .get('/api/auctions')
        .query({ type: 'ENGLISH', status: 'ACTIVE' })
        .expect(200);

      expect(mockPrisma.auction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'ENGLISH', status: 'ACTIVE' },
        })
      );
    });
  });

  describe('GET /api/auctions/:id', () => {
    it('returns 404 when auction not found', async () => {
      mockPrisma.auction.findUnique.mockResolvedValue(null);

      await request(app).get('/api/auctions/nonexistent').expect(404);
    });

    it('returns auction when found', async () => {
      const mockAuction = {
        id: 'auc-1',
        title: 'Single Auction',
        creator: mockCreator,
        bids: [],
      };
      mockPrisma.auction.findUnique.mockResolvedValue(mockAuction);

      const res = await request(app).get('/api/auctions/auc-1').expect(200);
      expect(res.body.title).toBe('Single Auction');
    });
  });

  describe('POST /api/auctions (create)', () => {
    it('returns 401 when no auth token', async () => {
      await request(app)
        .post('/api/auctions')
        .send({ title: 'New', type: 'DUTCH' })
        .expect(401);
    });
  });

  describe('POST /api/auctions/:id/bids', () => {
    it('returns 401 when no auth token', async () => {
      await request(app)
        .post('/api/auctions/auc-1/bids')
        .send({ amount: '1000000000000000000' })
        .expect(401);
    });

    it('persists transactionHash when placing a bid', async () => {
      const txHash = '0x' + 'ab'.repeat(32);
      mockPrisma.auction.findUnique
        .mockResolvedValueOnce({
          id: 'auc-1',
          status: 'ACTIVE',
          contractAddress: null,
        })
        .mockResolvedValueOnce({ totalVolume: '0' });
      mockPrisma.bid.create.mockResolvedValue({
        id: 'bid-1',
        auctionId: 'auc-1',
        bidderId: mockUser.id,
        amount: '1000000000000000000',
        transactionHash: txHash,
        bidder: mockCreator,
      });
      mockPrisma.auction.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auctions/auc-1/bids')
        .set(authHeader())
        .send({
          amount: '1000000000000000000',
          transactionHash: txHash,
        })
        .expect(201);

      expect(mockPrisma.bid.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            auctionId: 'auc-1',
            bidderId: mockUser.id,
            amount: '1000000000000000000',
            transactionHash: txHash,
          }),
        })
      );
      expect(res.body.transactionHash).toBe(txHash);
    });
  });

  describe('GET /api/auctions/:id/bids', () => {
    it('returns paginated bids', async () => {
      mockPrisma.bid.findMany.mockResolvedValue([]);
      mockPrisma.bid.count.mockResolvedValue(0);

      const res = await request(app)
        .get('/api/auctions/auc-1/bids')
        .query({ page: 1, limit: 20 })
        .expect(200);

      expect(res.body.bids).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });
  });
});
