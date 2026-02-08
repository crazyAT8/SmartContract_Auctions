const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { logger } = require('../utils/logger');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.warn('JWT_SECRET is not set; authentication will fail');
  }
  return secret;
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

    const decoded = jwt.verify(token, secret);
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { address: decoded.address }
    });

    if (!user) {
      // Create new user if they don't exist
      user = await prisma.user.create({
        data: {
          address: decoded.address,
          username: decoded.username || null,
          email: decoded.email || null
        }
      });
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

    const decoded = jwt.verify(token, secret);
    
    const user = await prisma.user.findUnique({
      where: { address: decoded.address }
    });

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
  optionalAuth
};
