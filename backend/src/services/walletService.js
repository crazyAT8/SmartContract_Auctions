/**
 * Backend wallet service: provides a configured wallet and signed contract instances
 * for placing bids and other write operations. Uses ABIs from backend/src/contracts/
 * and wallet/provider from contractDeployment (PRIVATE_KEY, ETHEREUM_RPC_URL).
 */

const { ethers } = require('ethers');
const { getWallet, getProvider, isDeploymentConfigured } = require('./contractDeployment');
const { getAuctionABI } = require('../contracts');

/**
 * Parse amount to wei (accepts ETH string or wei string).
 * @param {string|number|null|undefined} value - Amount in ETH (e.g. "1.5") or wei string
 * @returns {bigint}
 */
function toWei(value) {
  if (value == null || value === '') throw new Error('Amount is required');
  const s = String(value).trim();
  if (s.includes('.') || (/^\d+$/.test(s) && s.length <= 18)) return ethers.parseEther(s);
  return BigInt(s);
}

/**
 * Get contract instance connected to the backend wallet for signing transactions.
 * @param {string} contractAddress - Contract address
 * @param {string} type - Auction type (DUTCH, ENGLISH, SEALED_BID, HOLD_TO_COMPETE, PLAYABLE, RANDOM_SELECTION, ORDER_BOOK)
 * @returns {ethers.Contract}
 */
function getSignedContract(contractAddress, type) {
  if (!isDeploymentConfigured()) {
    throw new Error('Backend wallet not configured: set PRIVATE_KEY and ETHEREUM_RPC_URL in .env');
  }
  const abi = getAuctionABI(type);
  if (!abi) throw new Error(`ABI not found for auction type: ${type}`);
  const wallet = getWallet();
  return new ethers.Contract(contractAddress, abi, wallet);
}

/**
 * Send a transaction and wait for confirmation; returns transaction hash.
 * @param {ethers.Contract} contract - Contract instance (from getSignedContract)
 * @param {string} method - Method name (e.g. 'bid', 'buy', 'placeBid')
 * @param {Array} args - Method arguments (excluding overrides)
 * @param {{ value?: bigint }} [overrides] - Optional { value: valueWei } for payable calls
 * @returns {Promise<string>} Transaction hash
 */
async function sendAndWait(contract, method, args = [], overrides = {}) {
  const tx = await contract[method](...args, overrides);
  const receipt = await tx.wait();
  return receipt.hash;
}

module.exports = {
  getWallet,
  getProvider,
  isDeploymentConfigured,
  getSignedContract,
  toWei,
  sendAndWait,
};
