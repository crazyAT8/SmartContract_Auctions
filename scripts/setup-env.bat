@echo off
REM Auction dApp Setup Script for Windows
REM This script creates missing environment files and initializes the application

echo 🚀 Setting up Auction dApp...

REM Create backend .env file
echo 📝 Creating backend environment file...
(
echo # Database
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auction_dapp?schema=public"
echo.
echo # Redis
echo REDIS_HOST=localhost
echo REDIS_PORT=6379
echo REDIS_PASSWORD=
echo.
echo # Server
echo PORT=3001
echo NODE_ENV=development
echo FRONTEND_URL=http://localhost:3000
echo.
echo # JWT
echo JWT_SECRET=dev_jwt_secret_change_in_production
echo JWT_EXPIRES_IN=7d
echo.
echo # Blockchain
echo ETHEREUM_RPC_URL=http://localhost:8545
echo PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo CONTRACT_ADDRESSES_JSON=./contracts/deployments.json
echo.
echo # Logging
echo LOG_LEVEL=info
echo.
echo # Rate Limiting
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
) > backend\.env

REM Create frontend .env.local file
echo 📝 Creating frontend environment file...
(
echo NEXT_PUBLIC_API_URL=http://localhost:3001
echo NEXT_PUBLIC_WS_URL=http://localhost:3001
echo NEXT_PUBLIC_ETHEREUM_RPC_URL=http://localhost:8545
) > frontend\.env.local

REM Create contracts .env file
echo 📝 Creating contracts environment file...
(
echo # Network Configuration
echo SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
echo MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
echo.
echo # Private Key ^(for deployment^) - Using Hardhat default for local development
echo PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo # Etherscan API Key ^(for contract verification^)
echo ETHERSCAN_API_KEY=your_etherscan_api_key
echo.
echo # Gas Reporting
echo REPORT_GAS=true
) > contracts\.env

REM Create deployments.json placeholder
echo 📝 Creating contract deployments file...
(
echo {
echo   "localhost": {
echo     "DutchAuction": "0x0000000000000000000000000000000000000000",
echo     "EnglishAuction": "0x0000000000000000000000000000000000000000",
echo     "SealedBidAuction": "0x0000000000000000000000000000000000000000",
echo     "HoldToCompeteAuction": "0x0000000000000000000000000000000000000000",
echo     "PlayableAuction": "0x0000000000000000000000000000000000000000",
echo     "RandomSelectionAuction": "0x0000000000000000000000000000000000000000",
echo     "OrderBookAuction": "0x0000000000000000000000000000000000000000",
echo     "ERC20Mock": "0x0000000000000000000000000000000000000000"
echo   }
echo }
) > contracts\deployments.json

echo ✅ Environment files created successfully!
echo.
echo 🔧 Next steps:
echo 1. Start PostgreSQL and Redis services
echo 2. Run: cd backend ^&^& npm run migrate
echo 3. Run: cd contracts ^&^& npm run deploy:local
echo 4. Start the backend: cd backend ^&^& npm run dev
echo 5. Start the frontend: cd frontend ^&^& npm run dev
echo.
echo 📚 For detailed setup instructions, see docs/deployment.md
