const { logger } = require('../utils/logger');
const { prisma } = require('../config/database');
const { resolveUserFromToken } = require('../middleware/auth');

/** @type {import('socket.io').Server | null} */
let ioRef = null;

function broadcastNewBid(auctionId, bid) {
  if (!ioRef) return;
  ioRef.to(`auction_${auctionId}`).emit('new_bid', bid);
}

function broadcastUserNotification(userId, notification) {
  if (!ioRef) return;
  ioRef.to(`user_${userId}`).emit('notification', notification);
}

/**
 * Authenticate socket from handshake.auth.token (optional — rooms stay public).
 * place_bid still requires a resolved user (handshake or per-event token).
 */
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      socket.user = await resolveUserFromToken(token, { createIfMissing: true });
    } else {
      socket.user = null;
    }
    next();
  } catch (error) {
    logger.warn('Socket auth failed:', error.message);
    socket.user = null;
    next();
  }
}

const setupSocketHandlers = (io) => {
  ioRef = io;
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join auction room
    socket.on('join_auction', async (auctionId) => {
      try {
        socket.join(`auction_${auctionId}`);
        logger.info(`Client ${socket.id} joined auction ${auctionId}`);
        
        // Send current auction state
        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
          include: {
            creator: {
              select: { id: true, address: true, username: true, avatar: true }
            },
            bids: {
              include: {
                bidder: {
                  select: { id: true, address: true, username: true, avatar: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });

        if (auction) {
          socket.emit('auction_state', auction);
        }
      } catch (error) {
        logger.error('Error joining auction room:', error);
        socket.emit('error', { message: 'Failed to join auction room' });
      }
    });

    // Leave auction room
    socket.on('leave_auction', (auctionId) => {
      socket.leave(`auction_${auctionId}`);
      logger.info(`Client ${socket.id} left auction ${auctionId}`);
    });

    // Join user room for notifications (must be authenticated as that user)
    socket.on('join_user', (userId) => {
      if (!socket.user) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      if (socket.user.id !== userId) {
        socket.emit('error', { message: 'Cannot join another user room' });
        return;
      }
      socket.join(`user_${userId}`);
      logger.info(`Client ${socket.id} joined user room ${userId}`);
    });

    // Leave user room
    socket.on('leave_user', (userId) => {
      socket.leave(`user_${userId}`);
      logger.info(`Client ${socket.id} left user room ${userId}`);
    });

    // Handle bid placement — same auth/validation strength as REST
    socket.on('place_bid', async (data) => {
      try {
        const { placeBid } = require('./bidService');

        let user = socket.user;
        if (!user && data?.token) {
          try {
            user = await resolveUserFromToken(data.token, { createIfMissing: true });
            socket.user = user;
          } catch (authErr) {
            socket.emit('bid_error', { message: 'Invalid or expired token' });
            return;
          }
        }

        if (!user) {
          socket.emit('bid_error', { message: 'Authentication required' });
          return;
        }

        const auctionId = data?.auctionId;
        if (!auctionId || typeof auctionId !== 'string') {
          socket.emit('bid_error', { message: 'auctionId is required' });
          return;
        }

        // Ignore client-supplied bidderId — always use authenticated user
        const { auctionId: _a, bidderId: _b, token: _t, ...payload } = data || {};

        await placeBid({
          auctionId,
          bidderId: user.id,
          payload
        });
      } catch (error) {
        if (error.name === 'BidPlacementError') {
          socket.emit('bid_error', {
            message: error.message,
            details: error.details
          });
          return;
        }
        logger.error('Error placing bid:', error);
        socket.emit('bid_error', { message: 'Failed to place bid' });
      }
    });

    // Handle auction state updates
    socket.on('update_auction_state', async (auctionId) => {
      try {
        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
          include: {
            creator: {
              select: { id: true, address: true, username: true, avatar: true }
            },
            bids: {
              include: {
                bidder: {
                  select: { id: true, address: true, username: true, avatar: true }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });

        if (auction) {
          io.to(`auction_${auctionId}`).emit('auction_state', auction);
        }
      } catch (error) {
        logger.error('Error updating auction state:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  // Broadcast auction events
  const broadcastAuctionEvent = (auctionId, eventType, data) => {
    io.to(`auction_${auctionId}`).emit('auction_event', {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });
  };

  return {
    broadcastAuctionEvent,
    broadcastUserNotification,
    broadcastNewBid
  };
};

module.exports = {
  setupSocketHandlers,
  broadcastNewBid,
  broadcastUserNotification
};
