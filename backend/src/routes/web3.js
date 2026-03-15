const express = require('express');
const { authenticateUser } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { getAuctionStateForApi } = require('../services/contractReadService');
const { getSignedContract, toWei } = require('../services/walletService');

const router = express.Router();

// Get contract addresses
router.get('/contracts', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    let contractAddresses = {};
    try {
      const deploymentsPath = path.join(__dirname, '../../contracts/deployments.json');
      const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
      contractAddresses = deployments.contracts;
    } catch (error) {
      logger.warn('Could not load contract addresses:', error.message);
    }

    res.json(contractAddresses);
  } catch (error) {
    logger.error('Error fetching contract addresses:', error);
    res.status(500).json({ error: 'Failed to fetch contract addresses' });
  }
});

// Get auction contract state (uses shared contractReadService)
router.get('/auction/:contractAddress/state', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Auction type is required' });
    }

    const validTypes = ['DUTCH', 'ENGLISH', 'SEALED_BID', 'HOLD_TO_COMPETE', 'PLAYABLE', 'RANDOM_SELECTION', 'ORDER_BOOK'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid auction type' });
    }

    const contractState = await getAuctionStateForApi(contractAddress, type);
    if (!contractState) {
      return res.status(500).json({ error: 'Failed to fetch auction state (ABI or contract unavailable)' });
    }

    res.json(contractState);
  } catch (error) {
    logger.error('Error fetching auction state:', error);
    res.status(500).json({ error: 'Failed to fetch auction state' });
  }
});

// Place bid on contract
router.post('/auction/:contractAddress/bid', authenticateUser, async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { amount, type, ...bidData } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Auction type is required' });
    }

    let txHash;

    switch (type) {
      case 'DUTCH':
        txHash = await placeDutchAuctionBid(contractAddress, amount);
        break;
      case 'ENGLISH':
        txHash = await placeEnglishAuctionBid(contractAddress, amount);
        break;
      case 'SEALED_BID':
        txHash = await placeSealedBidAuctionBid(contractAddress, bidData);
        break;
      case 'HOLD_TO_COMPETE':
        txHash = await placeHoldToCompeteAuctionBid(contractAddress, amount);
        break;
      case 'PLAYABLE':
        txHash = await placePlayableAuctionBid(contractAddress, amount);
        break;
      case 'RANDOM_SELECTION':
        txHash = await placeRandomSelectionAuctionBid(contractAddress, amount);
        break;
      case 'ORDER_BOOK':
        txHash = await placeOrderBookAuctionOrder(contractAddress, bidData);
        break;
      default:
        return res.status(400).json({ error: 'Invalid auction type' });
    }

    res.json({ transactionHash: txHash });
  } catch (error) {
    logger.error('Error placing bid:', error);
    const msg = error.message || 'Failed to place bid';
    const status =
      msg.includes('not configured') ||
      msg.includes('is required') ||
      msg.includes('must be') ||
      msg.includes('Invalid')
        ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
});

// Sealed bid reveal (contract phase: biddingEnd <= now < revealEnd)
// Body: { value: string (ETH or wei), secret: string (bytes32 hex, 0x + 64 chars) }
// Uses backend wallet to sign; for user-initiated reveal use frontend contract call.
router.post('/auction/:contractAddress/reveal', authenticateUser, async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { value, secret } = req.body;

    if (value == null || value === '') {
      return res.status(400).json({ error: 'Reveal requires value (ETH or wei)' });
    }
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ error: 'Reveal requires secret (bytes32 hex string)' });
    }

    const valueWei = toWei(value);
    const secretHex = secret.startsWith('0x') ? secret : `0x${secret}`;
    if (secretHex.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(secretHex)) {
      return res.status(400).json({ error: 'Secret must be 32 bytes (64 hex chars)' });
    }

    const txHash = await revealSealedBid(contractAddress, valueWei, secretHex);
    res.json({ transactionHash: txHash });
  } catch (error) {
    logger.error('Error revealing sealed bid:', error);
    const msg = error.message || 'Failed to reveal bid';
    const status =
      msg.includes('not configured') ||
      msg.includes('is required') ||
      msg.includes('Not in reveal phase') ||
      msg.includes('Invalid') ||
      msg.includes('No bid found') ||
      msg.includes('Deposit insufficient')
        ? 400
        : 500;
    res.status(status).json({ error: msg });
  }
});

// Place bid functions (backend wallet signs transactions)
async function placeDutchAuctionBid(contractAddress, amount) {
  const contract = getSignedContract(contractAddress, 'DUTCH');
  const valueWei = toWei(amount);
  const tx = await contract.buy({ value: valueWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placeEnglishAuctionBid(contractAddress, amount) {
  const contract = getSignedContract(contractAddress, 'ENGLISH');
  const valueWei = toWei(amount);
  const tx = await contract.bid({ value: valueWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placeSealedBidAuctionBid(contractAddress, bidData) {
  const { blindedBid, deposit } = bidData || {};
  if (!blindedBid) throw new Error('Sealed bid requires blindedBid (bytes32 hex string)');
  const contract = getSignedContract(contractAddress, 'SEALED_BID');
  const depositWei = deposit != null && deposit !== '' ? toWei(deposit) : 0n;
  const tx = await contract.bid(blindedBid, { value: depositWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function revealSealedBid(contractAddress, valueWei, secretBytes32Hex) {
  const contract = getSignedContract(contractAddress, 'SEALED_BID');
  const tx = await contract.reveal(valueWei, secretBytes32Hex);
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placeHoldToCompeteAuctionBid(contractAddress, amount) {
  const contract = getSignedContract(contractAddress, 'HOLD_TO_COMPETE');
  const amountWei = toWei(amount);
  const tx = await contract.placeBid(amountWei);
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placePlayableAuctionBid(contractAddress, amount) {
  const contract = getSignedContract(contractAddress, 'PLAYABLE');
  const valueWei = toWei(amount);
  const tx = await contract.placeBid({ value: valueWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placeRandomSelectionAuctionBid(contractAddress, amount) {
  const contract = getSignedContract(contractAddress, 'RANDOM_SELECTION');
  const valueWei = toWei(amount);
  const tx = await contract.placeBid({ value: valueWei });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function placeOrderBookAuctionOrder(contractAddress, orderData) {
  const { side, price, amount } = orderData || {};
  if (!side || price == null || amount == null) {
    throw new Error('OrderBook order requires side ("buy"|"sell"), price, and amount');
  }
  const contract = getSignedContract(contractAddress, 'ORDER_BOOK');
  const priceWei = toWei(price);
  const amountUnits = BigInt(String(amount).trim());
  if (amountUnits <= 0n) throw new Error('OrderBook amount must be positive');
  let tx;
  if (side === 'buy') {
    const valueWei = priceWei * amountUnits;
    tx = await contract.placeBuyOrder(priceWei, amountUnits, { value: valueWei });
  } else if (side === 'sell') {
    tx = await contract.placeSellOrder(priceWei, amountUnits);
  } else {
    throw new Error('OrderBook side must be "buy" or "sell"');
  }
  const receipt = await tx.wait();
  return receipt.hash;
}

module.exports = router;
