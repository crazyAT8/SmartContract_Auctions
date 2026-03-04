/**
 * Validates bid payload against on-chain auction state.
 * Used by POST /api/auctions/:id/bids when the auction has a deployed contract.
 * Contract read logic is centralized in contractReadService.
 */

const { ethers } = require('ethers');
const { logger } = require('../utils/logger');
const {
  getBlockTimestamp,
  getDutchState,
  getEnglishState,
  getSealedBidState,
  getHoldToCompeteState,
  getPlayableState,
  getRandomSelectionState,
  getOrderBookState
} = require('./contractReadService');

/**
 * Validate a bid against the auction's on-chain state.
 * @param {object} auction - Prisma auction record (id, type, contractAddress, ...)
 * @param {string} amountWei - Bid amount in wei (string)
 * @param {object} [options] - Optional: { orderType, price, quantity } for ORDER_BOOK
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function validateBidAgainstContract(auction, amountWei, options = {}) {
  const contractAddress = auction.contractAddress?.trim();
  if (!contractAddress || contractAddress === '0x') {
    return { valid: true };
  }

  const type = auction.type;
  const amount = BigInt(amountWei);

  try {
    const now = await getBlockTimestamp();

    switch (type) {
      case 'DUTCH': {
        const state = await getDutchState(contractAddress);
        if (!state) return { valid: true };
        if (state.ended) return { valid: false, error: 'Auction has ended' };
        if (amount < state.currentPrice) {
          return {
            valid: false,
            error: `Bid must be at least current price (${ethers.formatEther(state.currentPrice)} ETH)`
          };
        }
        return { valid: true };
      }

      case 'ENGLISH': {
        const state = await getEnglishState(contractAddress);
        if (!state) return { valid: true };
        if (state.ended) return { valid: false, error: 'Auction has ended' };
        if (now >= state.auctionEndTime) return { valid: false, error: 'Bidding period has ended' };
        if (amount <= state.highestBid) {
          return {
            valid: false,
            error: `Bid must be higher than current highest bid (${ethers.formatEther(state.highestBid)} ETH)`
          };
        }
        return { valid: true };
      }

      case 'SEALED_BID': {
        const state = await getSealedBidState(contractAddress);
        if (!state) return { valid: true };
        if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
        if (now >= state.biddingEnd) return { valid: false, error: 'Bidding phase has ended' };
        return { valid: true };
      }

      case 'HOLD_TO_COMPETE': {
        const state = await getHoldToCompeteState(contractAddress);
        if (!state) return { valid: true };
        if (now >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
        if (amount <= state.highestBid) {
          return {
            valid: false,
            error: `Bid must be higher than current highest bid (${ethers.formatEther(state.highestBid)} ETH)`
          };
        }
        return { valid: true };
      }

      case 'PLAYABLE': {
        const state = await getPlayableState(contractAddress);
        if (!state) return { valid: true };
        if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
        if (state.endTime && now >= state.endTime) return { valid: false, error: 'Auction time has ended' };
        const minBid = state.currentPrice > state.highestBid ? state.currentPrice : state.highestBid;
        if (amount < minBid) {
          return {
            valid: false,
            error: `Bid must be at least ${ethers.formatEther(minBid)} ETH`
          };
        }
        return { valid: true };
      }

      case 'RANDOM_SELECTION': {
        const state = await getRandomSelectionState(contractAddress);
        if (!state) return { valid: true };
        if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
        if (now >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
        return { valid: true };
      }

      case 'ORDER_BOOK': {
        const state = await getOrderBookState(contractAddress);
        if (!state) return { valid: true };
        if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
        if (now >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  } catch (err) {
    logger.warn('Bid validation against contract failed', { auctionId: auction.id, error: err.message });
    return {
      valid: false,
      error: err.message || 'Could not validate bid against contract state'
    };
  }
}

module.exports = {
  validateBidAgainstContract,
  getBlockTimestamp,
};
