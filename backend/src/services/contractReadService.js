/**
 * Shared contract read logic for auction state.
 * Used by:
 * - bidValidationService: raw state for bid validation (min bid, end times, etc.)
 * - web3 routes: GET /auction/:contractAddress/state (API-shaped response)
 * Single source of truth for all read-only contract calls.
 */

const { ethers } = require('ethers');
const { getProvider } = require('./contractDeployment');
const { getAuctionABI } = require('../contracts');

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
 * Get contract instance for read-only calls.
 * @param {string} contractAddress
 * @param {string} type - Auction type (DUTCH, ENGLISH, etc.)
 * @returns {ethers.Contract|null}
 */
function getReadContract(contractAddress, type) {
  const abi = getAuctionABI(type);
  if (!abi) return null;
  return new ethers.Contract(contractAddress, abi, getReadProvider());
}

// ---- Raw state getters (return bigint/number/bool for validation + API) ----

async function getDutchState(contractAddress) {
  const contract = getReadContract(contractAddress, 'DUTCH');
  if (!contract) return null;
  const [currentPrice, ended, winner, seller, startPrice, reservePrice, startTime, duration] = await Promise.all([
    contract.getCurrentPrice(),
    contract.ended(),
    contract.winner(),
    contract.seller(),
    contract.startPrice(),
    contract.reservePrice(),
    contract.startTime(),
    contract.duration()
  ]);
  return {
    currentPrice: BigInt(currentPrice.toString()),
    ended: !!ended,
    winner,
    seller,
    startPrice: BigInt(startPrice.toString()),
    reservePrice: BigInt(reservePrice.toString()),
    startTime: BigInt(startTime.toString()),
    duration: BigInt(duration.toString())
  };
}

async function getEnglishState(contractAddress) {
  const contract = getReadContract(contractAddress, 'ENGLISH');
  if (!contract) return null;
  const [auctionEndTime, highestBid, highestBidder, ended, seller] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBid(),
    contract.highestBidder(),
    contract.ended(),
    contract.seller()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    highestBid: BigInt(highestBid.toString()),
    highestBidder,
    ended: !!ended,
    seller
  };
}

async function getSealedBidState(contractAddress) {
  const contract = getReadContract(contractAddress, 'SEALED_BID');
  if (!contract) return null;
  const [biddingEnd, revealEnd, auctionEnded, highestBidder, highestBid, auctioneer] = await Promise.all([
    contract.biddingEnd(),
    contract.revealEnd(),
    contract.auctionEnded(),
    contract.highestBidder(),
    contract.highestBid(),
    contract.auctioneer()
  ]);
  return {
    biddingEnd: Number(biddingEnd.toString()),
    revealEnd: Number(revealEnd.toString()),
    auctionEnded: !!auctionEnded,
    highestBidder,
    highestBid: BigInt(highestBid.toString()),
    auctioneer
  };
}

async function getHoldToCompeteState(contractAddress) {
  const contract = getReadContract(contractAddress, 'HOLD_TO_COMPETE');
  if (!contract) return null;
  const [auctionEndTime, highestBidder, highestBid, minHoldAmount, biddingToken, seller] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBidder(),
    contract.highestBid(),
    contract.minHoldAmount(),
    contract.biddingToken(),
    contract.seller()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    highestBidder,
    highestBid: BigInt(highestBid.toString()),
    minHoldAmount: BigInt(minHoldAmount.toString()),
    biddingToken,
    seller
  };
}

async function getPlayableState(contractAddress) {
  const contract = getReadContract(contractAddress, 'PLAYABLE');
  if (!contract) return null;
  const [currentPrice, highestBidder, highestBid, auctionEnded, startTime, endTime] = await Promise.all([
    contract.getCurrentPrice?.() ?? contract.currentPrice?.() ?? Promise.resolve(0n),
    contract.highestBidder(),
    contract.highestBid(),
    contract.auctionEnded(),
    contract.startTime?.() ?? Promise.resolve(0),
    contract.endTime?.() ?? Promise.resolve(0)
  ]);
  return {
    currentPrice: BigInt((currentPrice ?? 0n).toString()),
    highestBidder,
    highestBid: BigInt((highestBid ?? 0n).toString()),
    auctionEnded: !!auctionEnded,
    startTime: Number((startTime ?? 0).toString()),
    endTime: Number((endTime ?? 0).toString())
  };
}

async function getRandomSelectionState(contractAddress) {
  const contract = getReadContract(contractAddress, 'RANDOM_SELECTION');
  if (!contract) return null;
  const [auctionEndTime, auctionEnded, owner] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded(),
    contract.owner()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    auctionEnded: !!auctionEnded,
    owner
  };
}

async function getOrderBookState(contractAddress) {
  const contract = getReadContract(contractAddress, 'ORDER_BOOK');
  if (!contract) return null;
  const [auctionEndTime, auctionEnded, clearingPrice, admin] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded(),
    contract.clearingPrice(),
    contract.admin()
  ]);
  return {
    auctionEndTime: Number(auctionEndTime.toString()),
    auctionEnded: !!auctionEnded,
    clearingPrice: BigInt(clearingPrice.toString()),
    admin
  };
}

/** Dispatch to type-specific raw state getter. */
async function getRawState(contractAddress, type) {
  switch (type) {
    case 'DUTCH': return getDutchState(contractAddress);
    case 'ENGLISH': return getEnglishState(contractAddress);
    case 'SEALED_BID': return getSealedBidState(contractAddress);
    case 'HOLD_TO_COMPETE': return getHoldToCompeteState(contractAddress);
    case 'PLAYABLE': return getPlayableState(contractAddress);
    case 'RANDOM_SELECTION': return getRandomSelectionState(contractAddress);
    case 'ORDER_BOOK': return getOrderBookState(contractAddress);
    default: return null;
  }
}

/**
 * Convert raw state to API response shape (strings for numbers, same as GET /auction/:addr/state).
 * @param {string} type - Auction type
 * @param {object} raw - Raw state from get*State
 * @returns {object|null}
 */
function toApiShape(type, raw) {
  if (!raw) return null;
  switch (type) {
    case 'DUTCH':
      return {
        currentPrice: raw.currentPrice.toString(),
        ended: raw.ended,
        winner: raw.winner,
        seller: raw.seller,
        startPrice: raw.startPrice.toString(),
        reservePrice: raw.reservePrice.toString(),
        startTime: raw.startTime.toString(),
        duration: raw.duration.toString()
      };
    case 'ENGLISH':
      return {
        auctionEndTime: raw.auctionEndTime.toString(),
        highestBid: raw.highestBid.toString(),
        highestBidder: raw.highestBidder,
        ended: raw.ended,
        seller: raw.seller
      };
    case 'SEALED_BID':
      return {
        biddingEnd: raw.biddingEnd.toString(),
        revealEnd: raw.revealEnd.toString(),
        auctionEnded: raw.auctionEnded,
        highestBidder: raw.highestBidder,
        highestBid: raw.highestBid.toString(),
        auctioneer: raw.auctioneer
      };
    case 'HOLD_TO_COMPETE':
      return {
        auctionEndTime: raw.auctionEndTime.toString(),
        highestBidder: raw.highestBidder,
        highestBid: raw.highestBid.toString(),
        minHoldAmount: raw.minHoldAmount.toString(),
        biddingToken: raw.biddingToken,
        seller: raw.seller
      };
    case 'PLAYABLE':
      return {
        currentPrice: raw.currentPrice.toString(),
        highestBidder: raw.highestBidder,
        highestBid: raw.highestBid.toString(),
        auctionEnded: raw.auctionEnded,
        startTime: raw.startTime.toString(),
        endTime: raw.endTime.toString()
      };
    case 'RANDOM_SELECTION':
      return {
        auctionEndTime: raw.auctionEndTime.toString(),
        auctionEnded: raw.auctionEnded,
        owner: raw.owner
      };
    case 'ORDER_BOOK':
      return {
        auctionEndTime: raw.auctionEndTime.toString(),
        auctionEnded: raw.auctionEnded,
        clearingPrice: raw.clearingPrice.toString(),
        admin: raw.admin
      };
    default:
      return null;
  }
}

/**
 * Get auction state in API response shape (for GET /web3/auction/:contractAddress/state).
 * @param {string} contractAddress
 * @param {string} type - DUTCH, ENGLISH, etc.
 * @returns {Promise<object>}
 */
async function getAuctionStateForApi(contractAddress, type) {
  const raw = await getRawState(contractAddress, type);
  return toApiShape(type, raw);
}

module.exports = {
  getReadProvider,
  getBlockTimestamp,
  getDutchState,
  getEnglishState,
  getSealedBidState,
  getHoldToCompeteState,
  getPlayableState,
  getRandomSelectionState,
  getOrderBookState,
  getRawState,
  getAuctionStateForApi
};
