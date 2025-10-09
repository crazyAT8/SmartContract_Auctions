const express = require('express');
const { ethers } = require('ethers');
const { prisma } = require('../config/database');
const { authenticateUser } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Initialize provider
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');

// Get contract addresses
router.get('/contracts', async (req, res) => {
  try {
    // Load contract addresses from deployments.json
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

// Get auction contract state
router.get('/auction/:contractAddress/state', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({ error: 'Auction type is required' });
    }

    let contractState = {};

    switch (type) {
      case 'DUTCH':
        contractState = await getDutchAuctionState(contractAddress);
        break;
      case 'ENGLISH':
        contractState = await getEnglishAuctionState(contractAddress);
        break;
      case 'SEALED_BID':
        contractState = await getSealedBidAuctionState(contractAddress);
        break;
      case 'HOLD_TO_COMPETE':
        contractState = await getHoldToCompeteAuctionState(contractAddress);
        break;
      case 'PLAYABLE':
        contractState = await getPlayableAuctionState(contractAddress);
        break;
      case 'RANDOM_SELECTION':
        contractState = await getRandomSelectionAuctionState(contractAddress);
        break;
      case 'ORDER_BOOK':
        contractState = await getOrderBookAuctionState(contractAddress);
        break;
      default:
        return res.status(400).json({ error: 'Invalid auction type' });
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
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Helper functions for different auction types
async function getDutchAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function getCurrentPrice() view returns (uint256)',
    'function ended() view returns (bool)',
    'function winner() view returns (address)',
    'function seller() view returns (address)',
    'function startPrice() view returns (uint256)',
    'function reservePrice() view returns (uint256)',
    'function startTime() view returns (uint256)',
    'function duration() view returns (uint256)'
  ], provider);

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
    currentPrice: currentPrice.toString(),
    ended,
    winner,
    seller,
    startPrice: startPrice.toString(),
    reservePrice: reservePrice.toString(),
    startTime: startTime.toString(),
    duration: duration.toString()
  };
}

async function getEnglishAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function auctionEndTime() view returns (uint256)',
    'function highestBid() view returns (uint256)',
    'function highestBidder() view returns (address)',
    'function ended() view returns (bool)',
    'function seller() view returns (address)'
  ], provider);

  const [auctionEndTime, highestBid, highestBidder, ended, seller] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBid(),
    contract.highestBidder(),
    contract.ended(),
    contract.seller()
  ]);

  return {
    auctionEndTime: auctionEndTime.toString(),
    highestBid: highestBid.toString(),
    highestBidder,
    ended,
    seller
  };
}

async function getSealedBidAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function biddingEnd() view returns (uint256)',
    'function revealEnd() view returns (uint256)',
    'function auctionEnded() view returns (bool)',
    'function highestBidder() view returns (address)',
    'function highestBid() view returns (uint256)',
    'function auctioneer() view returns (address)'
  ], provider);

  const [biddingEnd, revealEnd, auctionEnded, highestBidder, highestBid, auctioneer] = await Promise.all([
    contract.biddingEnd(),
    contract.revealEnd(),
    contract.auctionEnded(),
    contract.highestBidder(),
    contract.highestBid(),
    contract.auctioneer()
  ]);

  return {
    biddingEnd: biddingEnd.toString(),
    revealEnd: revealEnd.toString(),
    auctionEnded,
    highestBidder,
    highestBid: highestBid.toString(),
    auctioneer
  };
}

async function getHoldToCompeteAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function auctionEndTime() view returns (uint256)',
    'function highestBidder() view returns (address)',
    'function highestBid() view returns (uint256)',
    'function minHoldAmount() view returns (uint256)',
    'function biddingToken() view returns (address)',
    'function seller() view returns (address)'
  ], provider);

  const [auctionEndTime, highestBidder, highestBid, minHoldAmount, biddingToken, seller] = await Promise.all([
    contract.auctionEndTime(),
    contract.highestBidder(),
    contract.highestBid(),
    contract.minHoldAmount(),
    contract.biddingToken(),
    contract.seller()
  ]);

  return {
    auctionEndTime: auctionEndTime.toString(),
    highestBidder,
    highestBid: highestBid.toString(),
    minHoldAmount: minHoldAmount.toString(),
    biddingToken,
    seller
  };
}

async function getPlayableAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function getCurrentPrice() view returns (uint256)',
    'function highestBidder() view returns (address)',
    'function highestBid() view returns (uint256)',
    'function auctionEnded() view returns (bool)',
    'function startTime() view returns (uint256)',
    'function endTime() view returns (uint256)'
  ], provider);

  const [currentPrice, highestBidder, highestBid, auctionEnded, startTime, endTime] = await Promise.all([
    contract.getCurrentPrice(),
    contract.highestBidder(),
    contract.highestBid(),
    contract.auctionEnded(),
    contract.startTime(),
    contract.endTime()
  ]);

  return {
    currentPrice: currentPrice.toString(),
    highestBidder,
    highestBid: highestBid.toString(),
    auctionEnded,
    startTime: startTime.toString(),
    endTime: endTime.toString()
  };
}

async function getRandomSelectionAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function auctionEndTime() view returns (uint256)',
    'function auctionEnded() view returns (bool)',
    'function owner() view returns (address)'
  ], provider);

  const [auctionEndTime, auctionEnded, owner] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded(),
    contract.owner()
  ]);

  return {
    auctionEndTime: auctionEndTime.toString(),
    auctionEnded,
    owner
  };
}

async function getOrderBookAuctionState(contractAddress) {
  const contract = new ethers.Contract(contractAddress, [
    'function auctionEndTime() view returns (uint256)',
    'function auctionEnded() view returns (bool)',
    'function clearingPrice() view returns (uint256)',
    'function admin() view returns (address)'
  ], provider);

  const [auctionEndTime, auctionEnded, clearingPrice, admin] = await Promise.all([
    contract.auctionEndTime(),
    contract.auctionEnded(),
    contract.clearingPrice(),
    contract.admin()
  ]);

  return {
    auctionEndTime: auctionEndTime.toString(),
    auctionEnded,
    clearingPrice: clearingPrice.toString(),
    admin
  };
}

// Place bid functions (simplified - would need proper wallet integration)
async function placeDutchAuctionBid(contractAddress, amount) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placeEnglishAuctionBid(contractAddress, amount) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placeSealedBidAuctionBid(contractAddress, bidData) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placeHoldToCompeteAuctionBid(contractAddress, amount) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placePlayableAuctionBid(contractAddress, amount) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placeRandomSelectionAuctionBid(contractAddress, amount) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

async function placeOrderBookAuctionOrder(contractAddress, orderData) {
  // This would require wallet integration
  throw new Error('Wallet integration not implemented');
}

module.exports = router;
