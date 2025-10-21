#!/bin/bash

# Auction dApp Setup Script
# This script creates missing environment files and initializes the application

echo "🚀 Setting up Auction dApp..."

# Create backend .env file
echo "📝 Creating backend environment file..."
cat > backend/.env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auction_dapp?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_EXPIRES_IN=7d

# Blockchain
ETHEREUM_RPC_URL=http://localhost:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESSES_JSON=./contracts/deployments.json

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Create frontend .env.local file
echo "📝 Creating frontend environment file..."
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_ETHEREUM_RPC_URL=http://localhost:8545
EOF

# Create contracts .env file
echo "📝 Creating contracts environment file..."
cat > contracts/.env << 'EOF'
# Network Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# Private Key (for deployment) - Using Hardhat default for local development
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Gas Reporting
REPORT_GAS=true
EOF

# Create deployments.json placeholder
echo "📝 Creating contract deployments file..."
cat > contracts/deployments.json << 'EOF'
{
  "localhost": {
    "DutchAuction": "0x0000000000000000000000000000000000000000",
    "EnglishAuction": "0x0000000000000000000000000000000000000000",
    "SealedBidAuction": "0x0000000000000000000000000000000000000000",
    "HoldToCompeteAuction": "0x0000000000000000000000000000000000000000",
    "PlayableAuction": "0x0000000000000000000000000000000000000000",
    "RandomSelectionAuction": "0x0000000000000000000000000000000000000000",
    "OrderBookAuction": "0x0000000000000000000000000000000000000000",
    "ERC20Mock": "0x0000000000000000000000000000000000000000"
  }
}
EOF

echo "✅ Environment files created successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Start PostgreSQL and Redis services"
echo "2. Run: cd backend && npm run migrate"
echo "3. Run: cd contracts && npm run deploy:local"
echo "4. Start the backend: cd backend && npm run dev"
echo "5. Start the frontend: cd frontend && npm run dev"
echo ""
echo "📚 For detailed setup instructions, see docs/deployment.md"
