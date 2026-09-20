const mockPrisma = {
  auction: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockPlaceBid = jest.fn();
const mockResolveUserFromToken = jest.fn();

jest.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('../middleware/auth', () => ({
  resolveUserFromToken: (...args) => mockResolveUserFromToken(...args),
}));

jest.mock('../services/bidService', () => ({
  placeBid: (...args) => mockPlaceBid(...args),
  BidPlacementError: class BidPlacementError extends Error {
    constructor(status, message, details) {
      super(message);
      this.name = 'BidPlacementError';
      this.status = status;
      this.details = details;
    }
  },
}));

const { setupSocketHandlers } = require('../services/socketService');

function createMockSocket(user = null) {
  const handlers = {};
  const socket = {
    id: 'sock-1',
    user,
    handshake: { auth: {} },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
  };
  return { socket, handlers };
}

describe('socketService place_bid', () => {
  let io;
  let connectionHandler;
  let middleware;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';

    const middlewares = [];
    io = {
      use: jest.fn((fn) => {
        middlewares.push(fn);
        middleware = fn;
      }),
      on: jest.fn((event, handler) => {
        if (event === 'connection') connectionHandler = handler;
      }),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    };

    setupSocketHandlers(io);
    expect(connectionHandler).toBeDefined();
  });

  it('rejects place_bid without authentication', async () => {
    const { socket, handlers } = createMockSocket(null);
    connectionHandler(socket);

    await handlers.place_bid({
      auctionId: 'auc-1',
      amount: '1000000000000000000',
      bidderId: 'spoofed-user',
    });

    expect(mockPlaceBid).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('bid_error', {
      message: 'Authentication required',
    });
  });

  it('uses authenticated user id and ignores client bidderId', async () => {
    const user = { id: 'real-user', address: '0xabc' };
    const { socket, handlers } = createMockSocket(user);
    connectionHandler(socket);
    mockPlaceBid.mockResolvedValue({ id: 'bid-1' });

    await handlers.place_bid({
      auctionId: 'auc-1',
      amount: '1000000000000000000',
      bidderId: 'spoofed-user',
    });

    expect(mockPlaceBid).toHaveBeenCalledWith({
      auctionId: 'auc-1',
      bidderId: 'real-user',
      payload: { amount: '1000000000000000000' },
    });
  });

  it('accepts per-event token when socket has no user', async () => {
    const user = { id: 'token-user', address: '0xdef' };
    mockResolveUserFromToken.mockResolvedValue(user);
    const { socket, handlers } = createMockSocket(null);
    connectionHandler(socket);
    mockPlaceBid.mockResolvedValue({ id: 'bid-2' });

    await handlers.place_bid({
      auctionId: 'auc-1',
      amount: '1000000000000000000',
      token: 'jwt-here',
    });

    expect(mockResolveUserFromToken).toHaveBeenCalledWith('jwt-here', {
      createIfMissing: true,
    });
    expect(mockPlaceBid).toHaveBeenCalledWith({
      auctionId: 'auc-1',
      bidderId: 'token-user',
      payload: { amount: '1000000000000000000' },
    });
  });

  it('maps BidPlacementError to bid_error', async () => {
    const { BidPlacementError } = require('../services/bidService');
    const user = { id: 'real-user', address: '0xabc' };
    const { socket, handlers } = createMockSocket(user);
    connectionHandler(socket);
    mockPlaceBid.mockRejectedValue(new BidPlacementError(400, 'Auction is not active'));

    await handlers.place_bid({
      auctionId: 'auc-1',
      amount: '1000000000000000000',
    });

    expect(socket.emit).toHaveBeenCalledWith('bid_error', {
      message: 'Auction is not active',
      details: undefined,
    });
  });
});
