/**
 * Validates bid payload against on-chain auction state.
 * Used by POST /api/auctions/:id/bids when the auction has a deployed contract.
 */

const { ethers } = require('ethers');
const { getProvider } = require('./contractDeployment');
const { getAuctionABI } = require('../contracts');
const { logger } = require('../utils/logger');

/** @type {ethers.Provider|null} */
let _provider = null;

function getReadProvider() {
  if (_provider) return _provider;
  _provider = getProvider();
  return _provider;
}

/**
 * Fetch current block timestamp (seconds).
 * @returns {Promise<number>}
 */
async function getBlockTimestamp() {
  const provider = getReadProvider();
  const block = await provider.getBlock('latest');
  return block?.timestamp ?? Math.floor(Date.now() / 1000);
}

/**
 * Get Dutch auction state for validation.
 */
async function getDutchState(contractAddress) {
  const abi = getAuctionABI('DUTCH');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [currentPrice, ended] = await Promise.all([
    contract.getCurrentPrice(),
    contract.ended()
  ]);
  return { currentPrice: BigInt(currentPrice.toString()), ended };
}

/**
 * Get English auction state for validation.
 */
async function getEnglishState(contractAddress) {
  const abi = getAuctionABI('ENGLISH');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [auctionEndTime, highestBid, ended] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBid(),
    contract.ended()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    highestBid: BigInt(highestBid.toString()),
    ended
  };
}

/**
 * Get SealedBid auction state (bidding/reveal phase and ended).
 */
async function getSealedBidState(contractAddress) {
  const abi = getAuctionABI('SEALED_BID');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [biddingEnd, auctionEnded] = await Promise.all([
    contract.biddingEnd(),
    contract.auctionEnded()
  ]);
  return {
    biddingEnd: Number(biddingEnd.toString()),
    auctionEnded
  };
}

/**
 * Get Hold-to-Compete auction state.
 */
async function getHoldToCompeteState(contractAddress) {
  const abi = getAuctionABI('HOLD_TO_COMPETE');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [auctionEndTime, highestBid] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBid()
  ]);
  const endTime = Number(auctionEndTime.toString());
  return {
    auctionEndTime: endTime,
    highestBid: BigInt(highestBid.toString())
  };
}

/**
 * Get Playable auction state.
 */
async function getPlayableState(contractAddress) {
  const abi = getAuctionABI('PLAYABLE');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [currentPrice, highestBid, auctionEnded, endTime] = await Promise.all([
    contract.getCurrentPrice?.() ?? contract.currentPrice?.() ?? Promise.resolve(0n),
    contract.highestBid(),
    contract.auctionEnded(),
    contract.endTime?.() ?? Promise.resolve(0)
  ]);
  return {
    currentPrice: BigInt((currentPrice ?? 0n).toString()),
    highestBid: BigInt((highestBid ?? 0n).toString()),
    auctionEnded: !!auctionEnded,
    endTime: Number((endTime ?? 0).toString())
  };
}

/**
 * Get Random Selection auction state.
 */
async function getRandomSelectionState(contractAddress) {
  const abi = getAuctionABI('RANDOM_SELECTION');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [auctionEndTime, auctionEnded] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    auctionEnded: !!auctionEnded
  };
}

/**
 * Get Order Book auction state.
 */
async function getOrderBookState(contractAddress) {
  const abi = getAuctionABI('ORDER_BOOK');
  if (!abi) return null;
  const contract = new ethers.Contract(contractAddress, abi, getReadProvider());
  const [auctionEndTime, auctionEnded] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    auctionEnded: !!auctionEnded
  };
}

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
