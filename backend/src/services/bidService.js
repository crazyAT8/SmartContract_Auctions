/**
 * Shared bid placement used by REST POST /auctions/:id/bids and Socket.IO place_bid.
 * Auth is the caller's responsibility; this service enforces auction state, payload,
 * and contract validation, then emits live Socket.IO updates.
 */

const { prisma } = require('../config/database');
const { bidSchema } = require('../middleware/validation');
const { validateBidAgainstContract } = require('./bidValidationService');
const { logger } = require('../utils/logger');
const {
  broadcastNewBid,
  broadcastUserNotification
} = require('./socketService');

class BidPlacementError extends Error {
  /**
   * @param {number} status - HTTP-style status for REST / client mapping
   * @param {string} message
   * @param {string[]} [details]
   */
  constructor(status, message, details) {
    super(message);
    this.name = 'BidPlacementError';
    this.status = status;
    this.details = details;
  }
}

/**
 * @param {object} params
 * @param {string} params.auctionId
 * @param {string} params.bidderId - Authenticated user id (never trust client-supplied bidder)
 * @param {object} params.payload - Bid fields (amount, transactionHash, …)
 * @returns {Promise<object>} Created bid with bidder include
 */
async function placeBid({ auctionId, bidderId, payload }) {
  const { error, value } = bidSchema.validate(payload || {});
  if (error) {
    throw new BidPlacementError(
      400,
      'Validation error',
      error.details.map((d) => d.message)
    );
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId }
  });

  if (!auction) {
    throw new BidPlacementError(404, 'Auction not found');
  }

  if (auction.status !== 'ACTIVE') {
    throw new BidPlacementError(400, 'Auction is not active');
  }

  if (auction.contractAddress) {
    const validation = await validateBidAgainstContract(auction, value.amount, {
      orderType: value.orderType,
      price: value.price,
      quantity: value.quantity
    });
    if (!validation.valid) {
      throw new BidPlacementError(400, validation.error || 'Bid validation failed');
    }
  }

  const bid = await prisma.bid.create({
    data: {
      auctionId,
      bidderId,
      amount: value.amount,
      ...(value.transactionHash && { transactionHash: value.transactionHash }),
      ...(value.blindedBid && { blindedBid: value.blindedBid }),
      ...(value.secret && { secret: value.secret }),
      ...(value.orderType && { orderType: value.orderType }),
      ...(value.price && { price: value.price }),
      ...(value.quantity && { quantity: value.quantity })
    },
    include: {
      bidder: {
        select: { id: true, address: true, username: true, avatar: true }
      }
    }
  });

  const current = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { totalVolume: true, creatorId: true, title: true }
  });
  const newVolume = (BigInt(current?.totalVolume ?? '0') + BigInt(value.amount)).toString();
  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      totalBids: { increment: 1 },
      totalVolume: newVolume
    }
  });

  broadcastNewBid(auctionId, bid);

  if (current?.creatorId) {
    const notification = {
      title: 'New Bid Placed',
      message: `A new bid of ${value.amount} wei was placed on "${current.title}"`,
      type: 'BID_PLACED'
    };

    await prisma.notification.create({
      data: {
        userId: current.creatorId,
        ...notification
      }
    });

    broadcastUserNotification(current.creatorId, notification);
  }

  logger.info(`Bid placed: ${bid.id} for auction ${auctionId} by ${bidderId}`);
  return bid;
}

module.exports = {
  placeBid,
  BidPlacementError
};
