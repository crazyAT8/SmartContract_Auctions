/**
 * Validates bid parameters against on-chain auction contract state.
 * Used by bidValidationService before persisting bids in POST /api/auctions/:id/bids.
 * Reads state via contractReadService; no writes.
 */

const { ethers } = require('ethers');
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
 * Validate a bid against the contract's current on-chain state.
 * @param {string} contractAddress - Deployed auction contract address
 * @param {string} type - Auction type (DUTCH, ENGLISH, SEALED_BID, etc.)
 * @param {string} amountWei - Bid amount in wei (string or bigint)
 * @param {object} [options] - Optional: { orderType, price, quantity } for ORDER_BOOK
 * @param {number} [now] - Current block timestamp (seconds). If omitted, fetched from chain.
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
async function validateBidAgainstContractState(contractAddress, type, amountWei, options = {}, now = null) {
  const address = contractAddress?.trim();
  if (!address || address === '0x') {
    return { valid: true };
  }

  const amount = BigInt(amountWei);
  const timestamp = now != null ? now : await getBlockTimestamp();

  switch (type) {
    case 'DUTCH': {
      const state = await getDutchState(address);
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
      const state = await getEnglishState(address);
      if (!state) return { valid: true };
      if (state.ended) return { valid: false, error: 'Auction has ended' };
      if (timestamp >= state.auctionEndTime) return { valid: false, error: 'Bidding period has ended' };
      if (amount <= state.highestBid) {
        return {
          valid: false,
          error: `Bid must be higher than current highest bid (${ethers.formatEther(state.highestBid)} ETH)`
        };
      }
      return { valid: true };
    }

    case 'SEALED_BID': {
      const state = await getSealedBidState(address);
      if (!state) return { valid: true };
      if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
      if (timestamp >= state.biddingEnd) return { valid: false, error: 'Bidding phase has ended' };
      return { valid: true };
    }

    case 'HOLD_TO_COMPETE': {
      const state = await getHoldToCompeteState(address);
      if (!state) return { valid: true };
      if (timestamp >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
      if (amount <= state.highestBid) {
        return {
          valid: false,
          error: `Bid must be higher than current highest bid (${ethers.formatEther(state.highestBid)} ETH)`
        };
      }
      return { valid: true };
    }

    case 'PLAYABLE': {
      const state = await getPlayableState(address);
      if (!state) return { valid: true };
      if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
      if (state.endTime && timestamp >= state.endTime) return { valid: false, error: 'Auction time has ended' };
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
      const state = await getRandomSelectionState(address);
      if (!state) return { valid: true };
      if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
      if (timestamp >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
      return { valid: true };
    }

    case 'ORDER_BOOK': {
      const state = await getOrderBookState(address);
      if (!state) return { valid: true };
      if (state.auctionEnded) return { valid: false, error: 'Auction has ended' };
      if (timestamp >= state.auctionEndTime) return { valid: false, error: 'Auction time has ended' };
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

module.exports = {
  validateBidAgainstContractState
};
