const express = require('express');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { getRedis } = require('../config/redis');
const { logger } = require('../utils/logger');
const router = express.Router();

// POST /api/auth/nonce - Get nonce for signing
router.post('/nonce', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    // Normalize address to checksum format
    const normalizedAddress = ethers.getAddress(address);

    // Generate a random nonce (32 bytes = 64 hex characters)
    const nonce = '0x' + crypto.randomBytes(32).toString('hex');

    // Store nonce in Redis with 5 minute expiration
    const redis = getRedis();
    await redis.setex(`auth:nonce:${normalizedAddress}`, 300, nonce);

    logger.info(`Nonce generated for address: ${normalizedAddress}`);

    res.json({ 
      nonce,
      message: `Sign in to Auction dApp\n\nAddress: ${normalizedAddress}\nNonce: ${nonce}`
    });
  } catch (error) {
    logger.error('Error generating nonce:', error);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// POST /api/auth/login - Wallet signature authentication
router.post('/login', async (req, res) => {
  try {
    const { address, signature, nonce } = req.body;

    if (!address || !signature || !nonce) {
      return res.status(400).json({ error: 'Address, signature, and nonce are required' });
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    // Normalize address to checksum format
    const normalizedAddress = ethers.getAddress(address);

    // Verify nonce exists in Redis
    const redis = getRedis();
    const storedNonce = await redis.get(`auth:nonce:${normalizedAddress}`);

    if (!storedNonce || storedNonce !== nonce) {
      return res.status(401).json({ error: 'Invalid or expired nonce' });
    }

    // Construct the message that should have been signed
    const message = `Sign in to Auction dApp\n\nAddress: ${normalizedAddress}\nNonce: ${nonce}`;

    // Recover address from signature
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      logger.error('Error verifying signature:', error);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Verify recovered address matches provided address
    if (ethers.getAddress(recoveredAddress) !== normalizedAddress) {
      return res.status(401).json({ error: 'Signature does not match address' });
    }

    // Delete used nonce from Redis
    await redis.del(`auth:nonce:${normalizedAddress}`);

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { address: normalizedAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          address: normalizedAddress
        }
      });
      logger.info(`New user created: ${normalizedAddress}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        address: normalizedAddress,
        userId: user.id
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    logger.info(`User authenticated: ${normalizedAddress}`);

    res.json({
      token,
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;

