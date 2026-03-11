/**
 * Contract ABIs loaded from backend/src/contracts/abis/.
 * Populated by contracts/scripts/export-abis.js (run from contracts/: npm run compile:abis).
 */

const path = require('path');
const fs = require('fs');

const ABIS_DIR = path.join(__dirname, 'abis');

const TYPE_TO_CONTRACT = {
  DUTCH: 'DutchAuction',
  ENGLISH: 'EnglishAuction',
  SEALED_BID: 'SealedBidAuction',
  HOLD_TO_COMPETE: 'HoldToCompeteAuction',
  PLAYABLE: 'PlayableAuction',
  RANDOM_SELECTION: 'RandomSelectionAuction',
  ORDER_BOOK: 'OrderBookAuction',
};

const cache = {};

/**
 * Load ABI array for a contract by name (e.g. 'DutchAuction').
 * @param {string} contractName
 * @returns {Array|null} ABI or null if file missing
 */
function loadABI(contractName) {
  if (cache[contractName] !== undefined) return cache[contractName];
  const file = path.join(ABIS_DIR, `${contractName}.json`);
  try {
    const abi = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache[contractName] = abi;
    return abi;
  } catch (err) {
    cache[contractName] = null;
    return null;
  }
}

/**
 * Get ABI for an auction type (e.g. 'DUTCH', 'ENGLISH').
 * @param {string} type - Auction type from API
 * @returns {Array|null} ABI or null
 */
function getAuctionABI(type) {
  const contractName = TYPE_TO_CONTRACT[type];
  if (!contractName) return null;
  return loadABI(contractName);
}

module.exports = {
  loadABI,
  getAuctionABI,
  TYPE_TO_CONTRACT,
};
