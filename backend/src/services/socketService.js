const { logger } = require('../utils/logger');
const { prisma } = require('../config/database');

const setupSocketHandlers = (io) => {
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

    // Join user room for notifications
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      logger.info(`Client ${socket.id} joined user room ${userId}`);
    });

    // Leave user room
    socket.on('leave_user', (userId) => {
      socket.leave(`user_${userId}`);
      logger.info(`Client ${socket.id} left user room ${userId}`);
    });

    // Handle bid placement
    socket.on('place_bid', async (data) => {
      try {
        const { auctionId, amount, bidderId } = data;
        
        // Create bid in database
        const bid = await prisma.bid.create({
          data: {
            auctionId,
            bidderId,
            amount: amount.toString(),
            status: 'PENDING'
          },
          include: {
            bidder: {
              select: { id: true, address: true, username: true, avatar: true }
            }
          }
        });

        // Update auction stats
        await prisma.auction.update({
          where: { id: auctionId },
          data: {
            totalBids: { increment: 1 },
            totalVolume: { increment: amount.toString() }
          }
        });

        // Broadcast bid to auction room
        io.to(`auction_${auctionId}`).emit('new_bid', bid);
        
        // Send notification to auction creator
        const auction = await prisma.auction.findUnique({
          where: { id: auctionId },
          select: { creatorId: true, title: true }
        });

        if (auction) {
          await prisma.notification.create({
            data: {
              userId: auction.creatorId,
              title: 'New Bid Placed',
              message: `A new bid of ${amount} ETH was placed on "${auction.title}"`,
              type: 'BID_PLACED'
            }
          });

          io.to(`user_${auction.creatorId}`).emit('notification', {
            title: 'New Bid Placed',
            message: `A new bid of ${amount} ETH was placed on "${auction.title}"`,
            type: 'BID_PLACED'
          });
        }

        logger.info(`Bid placed: ${bid.id} for auction ${auctionId}`);
      } catch (error) {
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

  // Broadcast user notification
  const broadcastUserNotification = (userId, notification) => {
    io.to(`user_${userId}`).emit('notification', notification);
  };

  return {
    broadcastAuctionEvent,
    broadcastUserNotification
  };
};

module.exports = { setupSocketHandlers };
