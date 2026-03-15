/**
 * Validates bid payload against on-chain auction state.
 * Used by POST /api/auctions/:id/bids when the auction has a deployed contract.
 * Delegates contract-state checks to contractValidator.js.
 */

const { logger } = require('../utils/logger');
const { validateBidAgainstContractState } = require('./contractValidator');

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

  try {
    return await validateBidAgainstContractState(
      contractAddress,
      auction.type,
      amountWei,
      options
    );
  } catch (err) {
    logger.warn('Bid validation against contract failed', { auctionId: auction.id, error: err.message });
    return {
      valid: false,
      error: err.message || 'Could not validate bid against contract state'
    };
  }
}

module.exports = {
  validateBidAgainstContract
};
