const mockPrisma = {
  auction: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  bid: {
    create: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};

const mockBroadcastNewBid = jest.fn();
const mockBroadcastUserNotification = jest.fn();
const mockValidateBidAgainstContract = jest.fn();

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../services/socketService', () => ({
  broadcastNewBid: (...args) => mockBroadcastNewBid(...args),
  broadcastUserNotification: (...args) => mockBroadcastUserNotification(...args),
}));

jest.mock('../services/bidValidationService', () => ({
  validateBidAgainstContract: (...args) => mockValidateBidAgainstContract(...args),
}));

const { placeBid, BidPlacementError } = require('../services/bidService');

describe('bidService.placeBid', () => {
  const bidderId = 'user-1';
  const auctionId = 'auc-1';
  const amount = '1000000000000000000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateBidAgainstContract.mockResolvedValue({ valid: true });
  });

  it('rejects invalid payload', async () => {
    await expect(
      placeBid({ auctionId, bidderId, payload: { amount: 'not-a-number' } })
    ).rejects.toMatchObject({ name: 'BidPlacementError', status: 400 });
  });

  it('rejects missing auction', async () => {
    mockPrisma.auction.findUnique.mockResolvedValue(null);
    await expect(
      placeBid({ auctionId, bidderId, payload: { amount } })
    ).rejects.toMatchObject({ name: 'BidPlacementError', status: 404 });
  });

  it('rejects inactive auction', async () => {
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: auctionId,
      status: 'PENDING',
      contractAddress: null,
    });
    await expect(
      placeBid({ auctionId, bidderId, payload: { amount } })
    ).rejects.toMatchObject({ name: 'BidPlacementError', status: 400, message: 'Auction is not active' });
  });

  it('rejects when contract validation fails', async () => {
    mockPrisma.auction.findUnique.mockResolvedValue({
      id: auctionId,
      status: 'ACTIVE',
      contractAddress: '0xabc',
      type: 'ENGLISH',
    });
    mockValidateBidAgainstContract.mockResolvedValue({ valid: false, error: 'Bid too low' });

    await expect(
      placeBid({ auctionId, bidderId, payload: { amount } })
    ).rejects.toMatchObject({ name: 'BidPlacementError', status: 400, message: 'Bid too low' });
  });

  it('creates bid, updates volume, and emits socket events', async () => {
    const bid = {
      id: 'bid-1',
      auctionId,
      bidderId,
      amount,
      bidder: { id: bidderId, address: '0x123', username: null, avatar: null },
    };

    mockPrisma.auction.findUnique
      .mockResolvedValueOnce({
        id: auctionId,
        status: 'ACTIVE',
        contractAddress: null,
        title: 'My Auction',
        creatorId: 'creator-1',
      })
      .mockResolvedValueOnce({
        totalVolume: '0',
        creatorId: 'creator-1',
        title: 'My Auction',
      });
    mockPrisma.bid.create.mockResolvedValue(bid);
    mockPrisma.auction.update.mockResolvedValue({});
    mockPrisma.notification.create.mockResolvedValue({});

    const result = await placeBid({ auctionId, bidderId, payload: { amount } });

    expect(result).toEqual(bid);
    expect(mockPrisma.auction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalBids: { increment: 1 }, totalVolume: amount },
      })
    );
    expect(mockBroadcastNewBid).toHaveBeenCalledWith(auctionId, bid);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'creator-1',
          type: 'BID_PLACED',
        }),
      })
    );
    expect(mockBroadcastUserNotification).toHaveBeenCalledWith(
      'creator-1',
      expect.objectContaining({ type: 'BID_PLACED' })
    );
    expect(BidPlacementError).toBeDefined();
  });
});
