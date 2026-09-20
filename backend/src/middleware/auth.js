const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');
const { prisma } = require('../config/database');

/** @type {import('socket.io').Server | null} */
let ioRef = null;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.warn('JWT_SECRET is not set; authentication will fail');
  }
  return secret;
}

/**
 * Resolve a Prisma user from a JWT (shared by HTTP auth and Socket.IO).
 * @param {string} token
 * @param {{ createIfMissing?: boolean }} [options]
 * @returns {Promise<object|null>}
 */
async function resolveUserFromToken(token, options = {}) {
  const { createIfMissing = false } = options;
  if (!token || typeof token !== 'string') {
    return null;
  }

  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }

  const decoded = jwt.verify(token, secret);

  let user = await prisma.user.findUnique({
    where: { address: decoded.address }
  });

  if (!user && createIfMissing) {
    user = await prisma.user.create({
      data: {
        address: decoded.address,
        username: decoded.username || null,
        email: decoded.email || null
      }
    });
  }

  return user;
}

const authenticateUser = async (req, res, next) => {
  try {
    const secret = getJwtSecret();
    if (!secret) {
      return res.status(503).json({ error: 'Authentication not configured' });
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const user = await resolveUserFromToken(token, { createIfMissing: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const secret = getJwtSecret();
    if (!secret) {
      req.user = null;
      return next();
    }
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }

    const user = await resolveUserFromToken(token, { createIfMissing: false });
    req.user = user;
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateUser,
  optionalAuth,
  resolveUserFromToken
};
