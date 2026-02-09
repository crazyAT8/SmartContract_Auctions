/**
 * Contract deployment service: deploys auction contracts to the chain
 * when an auction is started. Requires PRIVATE_KEY and ETHEREUM_RPC_URL,
 * and artifacts in backend/src/contracts/artifacts/ (run npm run compile:artifacts in contracts/).
 */

const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const { logger } = require('../utils/logger');

const ARTIFACTS_DIR = path.join(__dirname, '..', 'contracts', 'artifacts');

const TYPE_TO_CONTRACT = {
  DUTCH: 'DutchAuction',
  ENGLISH: 'EnglishAuction',
  SEALED_BID: 'SealedBidAuction',
  HOLD_TO_COMPETE: 'HoldToCompeteAuction',
  PLAYABLE: 'PlayableAuction',
  RANDOM_SELECTION: 'RandomSelectionAuction',
  ORDER_BOOK: 'OrderBookAuction',
};

/** @type {ethers.Provider|null} */
let _provider = null;
/** @type {ethers.Wallet|null} */
let _wallet = null;

/**
 * Get ethers provider from ETHEREUM_RPC_URL.
 * @returns {ethers.JsonRpcProvider}
 */
function getProvider() {
  if (_provider) return _provider;
  const rpc = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
  _provider = new ethers.JsonRpcProvider(rpc);
  return _provider;
}

/**
 * Get deployer wallet from PRIVATE_KEY. Throws if not set.
 * @returns {ethers.Wallet}
 */
function getWallet() {
  if (_wallet) return _wallet;
  const pk = process.env.PRIVATE_KEY;
  if (!pk || pk === 'your_private_key_here') {
    throw new Error('Contract deployment requires PRIVATE_KEY in environment (backend .env).');
  }
  _wallet = new ethers.Wallet(pk.trim(), getProvider());
  return _wallet;
}

/**
 * Load artifact (abi + bytecode) for a contract name.
 * @param {string} contractName - e.g. 'DutchAuction'
 * @returns {{ abi: Array, bytecode: string }}
 */
function loadArtifact(contractName) {
  const file = path.join(ARTIFACTS_DIR, `${contractName}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Contract artifact not found: ${file}. Run "npm run compile:artifacts" in the contracts/ directory.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bytecode = raw.bytecode || raw.data?.bytecode?.object;
  if (!raw.abi || !bytecode) {
    throw new Error(`Invalid artifact for ${contractName}: missing abi or bytecode.`);
  }
  return { abi: raw.abi, bytecode };
}

/**
 * Parse a string to wei (BigInt). Accepts decimal or integer string.
 * @param {string|null|undefined} value
 * @param {string} defaultEth - default value in ETH (e.g. '1')
 * @returns {bigint}
 */
function toWei(value, defaultEth = '0') {
  if (value == null || value === '') return ethers.parseEther(defaultEth);
  const s = String(value).trim();
  if (s.includes('.')) return ethers.parseEther(s);
  return BigInt(s);
}

/**
 * Parse integer from auction field with default.
 * @param {number|string|null|undefined} value
 * @param {number} def
 * @returns {number}
 */
function toInt(value, def) {
  if (value == null || value === '') return def;
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? def : n;
}

/**
 * Build constructor arguments for the given auction type and record.
 * Uses DB fields when set, otherwise sensible defaults.
 * @param {object} auction - Prisma auction record
 * @returns {Array<unknown>} Constructor args for ethers ContractFactory
 */
function buildConstructorArgs(auction) {
  const type = auction.type;
  const duration = toInt(auction.duration, 3600);
  const biddingTime = toInt(auction.biddingTime, 3600);
  const startPrice = toWei(auction.startPrice, '10');
  const reservePrice = toWei(auction.reservePrice, '1');
  const priceDropInterval = toInt(auction.priceDropInterval, 60);
  const priceDropAmount = toWei(auction.priceDropAmount, '0.1');
  const revealTime = toInt(auction.revealTime, 1800);
  const minHoldAmount = toWei(auction.minHoldAmount, '100');

  switch (type) {
    case 'DUTCH':
      return [startPrice, reservePrice, duration, priceDropInterval];
    case 'ENGLISH':
      return [biddingTime, reservePrice];
    case 'SEALED_BID':
      return [biddingTime, revealTime];
    case 'HOLD_TO_COMPETE': {
      const tokenAddress = auction.tokenAddress?.trim() || null;
      if (!tokenAddress) {
        return [ethers.ZeroAddress, duration, minHoldAmount];
      }
      return [tokenAddress, duration, minHoldAmount];
    }
    case 'PLAYABLE':
      return [startPrice, reservePrice, duration, priceDropInterval, priceDropAmount];
    case 'RANDOM_SELECTION':
      return [duration];
    case 'ORDER_BOOK':
      return [duration];
    default:
      throw new Error(`Unknown auction type: ${type}`);
  }
}

/**
 * Deploy a single contract by name with constructor args.
 * @param {string} contractName
 * @param {Array<unknown>} args
 * @returns {Promise<string>} Deployed contract address
 */
async function deployContract(contractName, args) {
  const wallet = getWallet();
  const { abi, bytecode } = loadArtifact(contractName);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  logger.info(`Deployed ${contractName} at ${address}`);
  return address;
}

/**
 * Deploy ERC20Mock and return its address (for Hold-to-Compete when no token is set).
 * @returns {Promise<string>}
 */
async function deployERC20Mock() {
  const name = 'Auction Token';
  const symbol = 'AUCT';
  const initialSupply = ethers.parseEther('1000000');
  return deployContract('ERC20Mock', [name, symbol, initialSupply]);
}

/**
 * Deploy the appropriate auction contract for the given auction.
 * For HOLD_TO_COMPETE without tokenAddress, deploys ERC20Mock first.
 * @param {object} auction - Prisma auction record (must include type and relevant fields)
 * @returns {Promise<{ contractAddress: string, tokenAddress?: string }>}
 */
async function deployAuctionContract(auction) {
  const type = auction.type;
  const contractName = TYPE_TO_CONTRACT[type];
  if (!contractName) {
    throw new Error(`Unsupported auction type for deployment: ${type}`);
  }

  let args = buildConstructorArgs(auction);
  let deployedTokenAddress = null;

  const needsMockToken = type === 'HOLD_TO_COMPETE' && (!auction.tokenAddress || !auction.tokenAddress.trim());
  if (needsMockToken) {
    deployedTokenAddress = await deployERC20Mock();
    const duration = toInt(auction.duration, 3600);
    const minHoldAmount = toWei(auction.minHoldAmount, '100');
    args = [deployedTokenAddress, duration, minHoldAmount];
    logger.info(`Deployed ERC20Mock for Hold-to-Compete at ${deployedTokenAddress}`);
  }

  const contractAddress = await deployContract(contractName, args);
  const result = { contractAddress };
  if (deployedTokenAddress) result.tokenAddress = deployedTokenAddress;
  return result;
}

/**
 * Check if deployment is configured (RPC and private key set).
 * @returns {boolean}
 */
function isDeploymentConfigured() {
  const rpc = process.env.ETHEREUM_RPC_URL;
  const pk = process.env.PRIVATE_KEY;
  return !!(rpc && pk && pk !== 'your_private_key_here');
}

module.exports = {
  getProvider,
  getWallet,
  loadArtifact,
  buildConstructorArgs,
  deployContract,
  deployAuctionContract,
  deployERC20Mock,
  isDeploymentConfigured,
  TYPE_TO_CONTRACT,
};
