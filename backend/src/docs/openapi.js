const swaggerJsdoc = require('swagger-jsdoc');
const {
  authNonceSchema,
  authLoginSchema,
  auctionSchema,
  bidSchema
} = require('../middleware/validation');
const { joiToOpenApi } = require('./joiToOpenApi');

const ethAddress = {
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$',
  example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
};

const weiAmount = {
  type: 'string',
  pattern: '^\\d+$',
  description: 'Amount in wei (integer string)',
  example: '1000000000000000000'
};

const auctionTypeEnum = [
  'DUTCH',
  'ENGLISH',
  'SEALED_BID',
  'HOLD_TO_COMPETE',
  'PLAYABLE',
  'RANDOM_SELECTION',
  'ORDER_BOOK'
];

const auctionStatusEnum = ['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED'];

const components = {
  securitySchemes: {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT from POST /api/auth/login. Send as `Authorization: Bearer <token>`.'
    }
  },
  schemas: {
    Error: {
      type: 'object',
      required: ['error'],
      properties: {
        error: { type: 'string', example: 'Validation error' },
        details: {
          type: 'array',
          items: { type: 'string' },
          description: 'Present on Joi validation failures'
        },
        detail: {
          type: 'string',
          description: 'Optional extra context (e.g. deployment failures)'
        }
      }
    },
    Pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        total: { type: 'integer', example: 42 },
        pages: { type: 'integer', example: 5 }
      }
    },
    UserSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'clxyz...' },
        address: ethAddress,
        username: { type: 'string', nullable: true },
        avatar: { type: 'string', nullable: true }
      }
    },
    User: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        address: ethAddress,
        username: { type: 'string', nullable: true },
        email: { type: 'string', format: 'email', nullable: true },
        avatar: { type: 'string', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        _count: {
          type: 'object',
          properties: {
            createdAuctions: { type: 'integer' },
            bids: { type: 'integer' }
          }
        }
      }
    },
    UpdateProfileRequest: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        avatar: { type: 'string', format: 'uri' }
      }
    },
    AuthNonceRequest: joiToOpenApi(authNonceSchema),
    AuthLoginRequest: joiToOpenApi(authLoginSchema),
    AuthNonceResponse: {
      type: 'object',
      required: ['nonce', 'message'],
      properties: {
        nonce: {
          type: 'string',
          example: '0xabc123...'
        },
        message: {
          type: 'string',
          description: 'Exact message the wallet must sign',
          example: 'Sign in to Auction dApp\n\nAddress: 0x...\nNonce: 0x...'
        }
      }
    },
    AuthLoginResponse: {
      type: 'object',
      required: ['token', 'user'],
      properties: {
        token: { type: 'string', description: 'JWT for Bearer auth' },
        user: { $ref: '#/components/schemas/User' }
      }
    },
    CreateAuctionRequest: joiToOpenApi(auctionSchema),
    PlaceBidRequest: joiToOpenApi(bidSchema),
    Auction: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        imageUrl: { type: 'string', nullable: true },
        type: { type: 'string', enum: auctionTypeEnum },
        status: { type: 'string', enum: auctionStatusEnum },
        contractAddress: { type: 'string', nullable: true },
        creatorId: { type: 'string' },
        creator: { $ref: '#/components/schemas/UserSummary' },
        startTime: { type: 'string', format: 'date-time', nullable: true },
        endTime: { type: 'string', format: 'date-time', nullable: true },
        startPrice: { type: 'string', nullable: true },
        reservePrice: { type: 'string', nullable: true },
        duration: { type: 'integer', nullable: true },
        priceDropInterval: { type: 'integer', nullable: true },
        priceDropAmount: { type: 'string', nullable: true },
        minHoldAmount: { type: 'string', nullable: true },
        tokenAddress: { type: 'string', nullable: true },
        biddingTime: { type: 'integer', nullable: true },
        revealTime: { type: 'integer', nullable: true },
        currentPrice: { type: 'string', nullable: true },
        highestBid: { type: 'string', nullable: true },
        highestBidder: { type: 'string', nullable: true },
        winner: { type: 'string', nullable: true },
        totalBids: { type: 'integer' },
        totalVolume: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        _count: {
          type: 'object',
          properties: {
            bids: { type: 'integer' }
          }
        }
      }
    },
    Bid: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        auctionId: { type: 'string' },
        bidderId: { type: 'string' },
        amount: weiAmount,
        status: {
          type: 'string',
          enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']
        },
        isHighest: { type: 'boolean' },
        blindedBid: { type: 'string', nullable: true },
        secret: { type: 'string', nullable: true },
        revealed: { type: 'boolean' },
        orderType: { type: 'string', enum: ['BUY', 'SELL'], nullable: true },
        price: { type: 'string', nullable: true },
        quantity: { type: 'string', nullable: true },
        transactionHash: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$',
          nullable: true
        },
        bidder: { $ref: '#/components/schemas/UserSummary' },
        auction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            type: { type: 'string', enum: auctionTypeEnum },
            status: { type: 'string', enum: auctionStatusEnum },
            imageUrl: { type: 'string', nullable: true }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    },
    Notification: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: {
          type: 'string',
          description: 'e.g. BID_PLACED, AUCTION_ENDED, BID_OUTBID'
        },
        read: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    Web3BidRequest: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: auctionTypeEnum },
        amount: {
          type: 'string',
          description: 'ETH amount or wei string (DUTCH, ENGLISH, HOLD_TO_COMPETE, PLAYABLE, RANDOM_SELECTION)'
        },
        blindedBid: {
          type: 'string',
          description: 'bytes32 hex — required for SEALED_BID'
        },
        deposit: {
          type: 'string',
          description: 'Deposit for SEALED_BID (ETH or wei)'
        },
        side: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: 'ORDER_BOOK only'
        },
        price: {
          type: 'string',
          description: 'ORDER_BOOK price (ETH or wei)'
        }
      },
      description:
        'On-chain bid via backend wallet. Fields beyond type/amount depend on auction type.'
    },
    Web3RevealRequest: {
      type: 'object',
      required: ['value', 'secret'],
      properties: {
        value: {
          type: 'string',
          description: 'Bid value (ETH or wei) to reveal'
        },
        secret: {
          type: 'string',
          description: 'bytes32 hex (0x + 64 hex chars)',
          pattern: '^(0x)?[0-9a-fA-F]{64}$'
        }
      }
    },
    TransactionResponse: {
      type: 'object',
      required: ['transactionHash'],
      properties: {
        transactionHash: {
          type: 'string',
          pattern: '^0x[a-fA-F0-9]{64}$'
        }
      }
    },
    HealthResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: 'Process uptime in seconds' }
      }
    }
  },
  responses: {
    BadRequest: {
      description: 'Validation or business-rule error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    Unauthorized: {
      description: 'Missing or invalid JWT',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    Forbidden: {
      description: 'Authenticated but not allowed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    NotFound: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    },
    ServerError: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' }
        }
      }
    }
  }
};

// Enrich Joi-derived schemas with examples / descriptions
components.schemas.AuthNonceRequest.properties.address.example = ethAddress.example;
components.schemas.AuthLoginRequest.properties.address.example = ethAddress.example;
components.schemas.AuthLoginRequest.properties.signature.example = '0x...';
components.schemas.AuthLoginRequest.properties.nonce.example = '0xabc123...';
components.schemas.CreateAuctionRequest.properties.title.example = 'Rare NFT drop';
components.schemas.PlaceBidRequest.properties.amount.example = '1000000000000000000';

const paths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check',
      responses: {
        200: {
          description: 'Service is up',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthResponse' }
            }
          }
        }
      }
    }
  },

  // —— Auth ——
  '/api/auth/nonce': {
    get: {
      tags: ['Auth'],
      summary: 'Get signing nonce (query)',
      description: 'Returns a short-lived nonce for wallet SIWE-style login. Pass `address` as a query param.',
      parameters: [
        {
          name: 'address',
          in: 'query',
          required: true,
          schema: ethAddress
        }
      ],
      responses: {
        200: {
          description: 'Nonce and message to sign',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthNonceResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    },
    post: {
      tags: ['Auth'],
      summary: 'Get signing nonce (body)',
      description: 'Same as GET, with address in the JSON body.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthNonceRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Nonce and message to sign',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthNonceResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with wallet signature',
      description:
        'Verifies the signed nonce message, upserts the user, and returns a JWT.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/AuthLoginRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'JWT and user profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthLoginResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        503: {
          description: 'JWT_SECRET not configured',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Authenticated user profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        503: {
          description: 'JWT_SECRET not configured',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },
  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout',
      description: 'Stateless JWT — client should discard the token. Endpoint exists for API consistency.',
      responses: {
        200: {
          description: 'Logged out',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Logged out' }
                }
              }
            }
          }
        }
      }
    }
  },

  // —— Auctions ——
  '/api/auctions': {
    get: {
      tags: ['Auctions'],
      summary: 'List auctions',
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: auctionTypeEnum }
        },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: auctionStatusEnum }
        },
        {
          name: 'creator',
          in: 'query',
          schema: { type: 'string' },
          description: 'Creator user id'
        },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string' },
          description: 'Case-insensitive title/description search'
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string', default: 'createdAt' }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      ],
      responses: {
        200: {
          description: 'Paginated auction list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  auctions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Auction' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/ServerError' }
      }
    },
    post: {
      tags: ['Auctions'],
      summary: 'Create auction',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateAuctionRequest' }
          }
        }
      },
      responses: {
        201: {
          description: 'Auction created (DRAFT)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Auction' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/auctions/{id}': {
    get: {
      tags: ['Auctions'],
      summary: 'Get auction by id',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Auction with bids',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Auction' }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    },
    put: {
      tags: ['Auctions'],
      summary: 'Update draft auction',
      description: 'Only the creator can update; auction must be DRAFT.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateAuctionRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Updated auction',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Auction' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/auctions/{id}/start': {
    post: {
      tags: ['Auctions'],
      summary: 'Start auction (deploy contract)',
      description:
        'Deploys the on-chain auction contract and sets status to ACTIVE. Requires ETHEREUM_RPC_URL, PRIVATE_KEY, and compiled artifacts.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Auction started',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Auction' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
        503: {
          description: 'Contract deployment not configured',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/auctions/{id}/bids': {
    get: {
      tags: ['Auctions'],
      summary: 'List bids for an auction',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
      ],
      responses: {
        200: {
          description: 'Paginated bids',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bids: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Bid' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/ServerError' }
      }
    },
    post: {
      tags: ['Auctions'],
      summary: 'Place bid (persist off-chain)',
      description:
        'Records a bid in the database. When the auction has a contractAddress, amount is validated against on-chain state first. Prefer also submitting the on-chain tx via /api/web3 or the frontend.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/PlaceBidRequest' }
          }
        }
      },
      responses: {
        201: {
          description: 'Bid created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Bid' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  // —— Users ——
  '/api/users/profile': {
    get: {
      tags: ['Users'],
      summary: 'Get profile',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'Current user with counts',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    },
    put: {
      tags: ['Users'],
      summary: 'Update profile',
      security: [{ BearerAuth: [] }],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateProfileRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Updated user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/User' }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/users/auctions': {
    get: {
      tags: ['Users'],
      summary: 'My created auctions',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: auctionStatusEnum }
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
      ],
      responses: {
        200: {
          description: 'Paginated auctions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  auctions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Auction' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/users/bids': {
    get: {
      tags: ['Users'],
      summary: 'My bids',
      security: [{ BearerAuth: [] }],
      parameters: [
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
      ],
      responses: {
        200: {
          description: 'Paginated bids with auction summary',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bids: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Bid' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/users/notifications': {
    get: {
      tags: ['Users'],
      summary: 'My notifications',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'unreadOnly',
          in: 'query',
          schema: { type: 'string', enum: ['true', 'false'], default: 'false' }
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
      ],
      responses: {
        200: {
          description: 'Paginated notifications',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  notifications: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Notification' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/users/notifications/{id}/read': {
    put: {
      tags: ['Users'],
      summary: 'Mark notification as read',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Updated notification',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Notification' }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/users/notifications/read-all': {
    put: {
      tags: ['Users'],
      summary: 'Mark all notifications as read',
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: 'All marked read',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'All notifications marked as read'
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },

  // —— Web3 ——
  '/api/web3/contracts': {
    get: {
      tags: ['Web3'],
      summary: 'Deployed contract addresses',
      description: 'Reads repo-root `contracts/deployments.json`.',
      responses: {
        200: {
          description: 'Map of contract name → address (may be empty if file missing)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: { type: 'string' },
                example: {
                  MockERC20: '0x...',
                  DutchAuction: '0x...'
                }
              }
            }
          }
        },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/web3/auction/{contractAddress}/state': {
    get: {
      tags: ['Web3'],
      summary: 'On-chain auction state',
      parameters: [
        {
          name: 'contractAddress',
          in: 'path',
          required: true,
          schema: ethAddress
        },
        {
          name: 'type',
          in: 'query',
          required: true,
          schema: { type: 'string', enum: auctionTypeEnum }
        }
      ],
      responses: {
        200: {
          description: 'Type-specific contract state',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
                description: 'Fields vary by auction type'
              }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/web3/auction/{contractAddress}/bid': {
    post: {
      tags: ['Web3'],
      summary: 'Place on-chain bid (backend wallet)',
      description:
        'Signs and sends a bid transaction with the backend wallet. Body shape depends on `type` (see Web3BidRequest).',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'contractAddress',
          in: 'path',
          required: true,
          schema: ethAddress
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Web3BidRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Transaction submitted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransactionResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  },
  '/api/web3/auction/{contractAddress}/reveal': {
    post: {
      tags: ['Web3'],
      summary: 'Reveal sealed bid (backend wallet)',
      description:
        'Calls SEALED_BID reveal on-chain. For user-initiated reveal, prefer a frontend contract call.',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'contractAddress',
          in: 'path',
          required: true,
          schema: ethAddress
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Web3RevealRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Reveal transaction submitted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransactionResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        500: { $ref: '#/components/responses/ServerError' }
      }
    }
  }
};

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Auction dApp API',
      version: '1.0.0',
      description:
        'REST API for wallet auth, auctions, users, and on-chain web3 helpers. Use **Authorize** with a JWT from `POST /api/auth/login`.'
    },
    servers: [
      {
        url: process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`,
        description: process.env.NODE_ENV === 'production' ? 'API' : 'Local'
      }
    ],
    tags: [
      { name: 'Health', description: 'Liveness' },
      { name: 'Auth', description: 'Wallet nonce / login / session' },
      { name: 'Auctions', description: 'CRUD, start (deploy), bids' },
      { name: 'Users', description: 'Profile, my auctions/bids, notifications' },
      { name: 'Web3', description: 'Contracts, state, on-chain bid/reveal' }
    ],
    components,
    paths
  },
  // Paths are defined above; keep apis empty so we don't require JSDoc on routes.
  // swagger-jsdoc still merges definition into a valid OpenAPI document.
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec, components, paths };
