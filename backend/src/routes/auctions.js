const express = require('express');
const { prisma } = require('../config/database');
const { validateAuction, validateBid } = require('../middleware/validation');
const { authenticateUser } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { getRedis } = require('../config/redis');

const router = express.Router();

// Get all auctions with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      creator,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (creator) where.creatorId = creator;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          creator: {
            select: { id: true, address: true, username: true, avatar: true }
          },
          _count: {
            select: { bids: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take
      }),
      prisma.auction.count({ where })
    ]);

    res.json({
      auctions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching auctions:', error);
    res.status(500).json({ error: 'Failed to fetch auctions' });
  }
});

// Get single auction by ID
router.get('/:id', async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: { id: true, address: true, username: true, avatar: true }
        },
        bids: {
          include: {
            bidder: {
              select: { id: true, address: true, username: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json(auction);
  } catch (error) {
    logger.error('Error fetching auction:', error);
    res.status(500).json({ error: 'Failed to fetch auction' });
  }
});

// Create new auction
router.post('/', authenticateUser, validateAuction, async (req, res) => {
  try {
    const auctionData = {
      ...req.body,
      creatorId: req.user.id
    };

    const auction = await prisma.auction.create({
      data: auctionData,
      include: {
        creator: {
          select: { id: true, address: true, username: true, avatar: true }
        }
      }
    });

    // Cache auction data
    const redis = getRedis();
    await redis.setex(`auction:${auction.id}`, 3600, JSON.stringify(auction));

    logger.info(`Auction created: ${auction.id} by ${req.user.address}`);
    res.status(201).json(auction);
  } catch (error) {
    logger.error('Error creating auction:', error);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

// Update auction
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this auction' });
    }

    if (auction.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Cannot update active or ended auction' });
    }

    const updatedAuction = await prisma.auction.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        creator: {
          select: { id: true, address: true, username: true, avatar: true }
        }
      }
    });

    // Update cache
    const redis = getRedis();
    await redis.setex(`auction:${updatedAuction.id}`, 3600, JSON.stringify(updatedAuction));

    res.json(updatedAuction);
  } catch (error) {
    logger.error('Error updating auction:', error);
    res.status(500).json({ error: 'Failed to update auction' });
  }
});

// Start auction (deploy contract and activate)
router.post('/:id/start', authenticateUser, async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.creatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to start this auction' });
    }

    if (auction.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Auction is not in draft status' });
    }

    // TODO: Deploy contract based on auction type
    // This would integrate with the Web3 service
    const contractAddress = '0x...'; // Placeholder

    const updatedAuction = await prisma.auction.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        contractAddress,
        startTime: new Date()
      }
    });

    logger.info(`Auction started: ${auction.id} with contract ${contractAddress}`);
    res.json(updatedAuction);
  } catch (error) {
    logger.error('Error starting auction:', error);
    res.status(500).json({ error: 'Failed to start auction' });
  }
});

// Place bid
router.post('/:id/bids', authenticateUser, validateBid, async (req, res) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id }
    });

    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Auction is not active' });
    }

    // TODO: Validate bid against contract
    // This would integrate with the Web3 service

    const bid = await prisma.bid.create({
      data: {
        auctionId: req.params.id,
        bidderId: req.user.id,
        amount: req.body.amount,
        ...req.body // Include blindedBid, secret, etc. for sealed bids
      },
      include: {
        bidder: {
          select: { id: true, address: true, username: true, avatar: true }
        }
      }
    });

    // Update auction stats
    await prisma.auction.update({
      where: { id: req.params.id },
      data: {
        totalBids: { increment: 1 },
        totalVolume: { increment: req.body.amount }
      }
    });

    logger.info(`Bid placed: ${bid.id} for auction ${req.params.id} by ${req.user.address}`);
    res.status(201).json(bid);
  } catch (error) {
    logger.error('Error placing bid:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Get auction bids
router.get('/:id/bids', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: { auctionId: req.params.id },
        include: {
          bidder: {
            select: { id: true, address: true, username: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.bid.count({ where: { auctionId: req.params.id } })
    ]);

    res.json({
      bids,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

module.exports = router;
