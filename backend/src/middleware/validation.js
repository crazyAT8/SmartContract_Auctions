const Joi = require('joi');

// Auth: nonce request
const authNonceSchema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
});

// Auth: login request (wallet signature)
const authLoginSchema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  signature: Joi.string().min(1).required(),
  nonce: Joi.string().min(1).required()
});

const validateAuthNonce = (req, res, next) => {
  const { error, value } = authNonceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }
  req.body = value;
  next();
};

const validateAuthLogin = (req, res, next) => {
  const { error, value } = authLoginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }
  req.body = value;
  next();
};

const auctionSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  imageUrl: Joi.string().uri().optional(),
  type: Joi.string().valid(
    'DUTCH',
    'ENGLISH',
    'SEALED_BID',
    'HOLD_TO_COMPETE',
    'PLAYABLE',
    'RANDOM_SELECTION',
    'ORDER_BOOK'
  ).required(),
  startPrice: Joi.string().pattern(/^\d+$/).optional(),
  reservePrice: Joi.string().pattern(/^\d+$/).optional(),
  duration: Joi.number().integer().min(1).optional(),
  priceDropInterval: Joi.number().integer().min(1).optional(),
  priceDropAmount: Joi.string().pattern(/^\d+$/).optional(),
  minHoldAmount: Joi.string().pattern(/^\d+$/).optional(),
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional(),
  biddingTime: Joi.number().integer().min(1).optional(),
  revealTime: Joi.number().integer().min(1).optional()
});

const bidSchema = Joi.object({
  amount: Joi.string().pattern(/^\d+$/).required(),
  blindedBid: Joi.string().optional(),
  secret: Joi.string().optional(),
  orderType: Joi.string().valid('BUY', 'SELL').optional(),
  price: Joi.string().pattern(/^\d+$/).optional(),
  quantity: Joi.string().pattern(/^\d+$/).optional(),
  transactionHash: Joi.string().optional()
});

const validateAuction = (req, res, next) => {
  const { error, value } = auctionSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  req.body = value;
  next();
};

const validateBid = (req, res, next) => {
  const { error, value } = bidSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateAuthNonce,
  validateAuthLogin,
  validateAuction,
  validateBid
};
