# Deployment Guide

This guide covers deploying the Auction dApp to various environments.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for production)
- Redis 7+ (for production)

## Local Development

### Quick Start with Docker

1. **Clone the repository:**
```bash
git clone <repository-url>
cd auction-dapp
```

2. **Start all services:**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Backend API on port 3001
- Frontend on port 3000
- Hardhat local network on port 8545

3. **Initialize the database:**
```bash
# Run database migrations
docker-compose exec backend npx prisma migrate dev

# Seed initial data (optional)
docker-compose exec backend npm run seed
```

4. **Deploy contracts:**
```bash
# Deploy to local network
docker-compose exec hardhat npx hardhat run scripts/deploy.js --network localhost
```

### Manual Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
# Backend
cp backend/env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your configuration

# Contracts
cp contracts/env.example contracts/.env
# Edit contracts/.env with your configuration
```

3. **Start services:**
```bash
# Terminal 1: Start database
docker run -d --name postgres -e POSTGRES_DB=auction_dapp -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15

# Terminal 2: Start Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Terminal 3: Start Hardhat node
cd contracts
npm install
npx hardhat node

# Terminal 4: Deploy contracts
cd contracts
npx hardhat run scripts/deploy.js --network localhost

# Terminal 5: Start backend
cd backend
npm install
npm run dev

# Terminal 6: Start frontend
cd frontend
npm install
npm run dev
```

## Production Deployment

### Using Docker Compose

1. **Set up production environment:**
```bash
# Create production environment file
cp docker-compose.yml docker-compose.prod.yml
```

2. **Configure production settings:**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@postgres:5432/auction_dapp
      - REDIS_HOST=redis
      - JWT_SECRET=your_secure_jwt_secret
      - ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
    restart: unless-stopped

  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
      - NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
      - NEXT_PUBLIC_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
    restart: unless-stopped
```

3. **Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Production Setup

1. **Set up server:**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Redis
sudo apt-get install redis-server

# Install PM2 for process management
sudo npm install -g pm2
```

2. **Set up database:**
```bash
# Create database
sudo -u postgres createdb auction_dapp

# Run migrations
cd backend
npm run migrate:prod
```

3. **Deploy contracts:**
```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network mainnet
```

4. **Start services:**
```bash
# Start backend
cd backend
pm2 start ecosystem.config.js

# Start frontend
cd frontend
pm2 start ecosystem.config.js
```

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/auction_dapp"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# JWT
JWT_SECRET=your_secure_jwt_secret_here
JWT_EXPIRES_IN=7d

# Blockchain
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESSES_JSON=./contracts/deployments.json

# Logging
LOG_LEVEL=info
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

### Contracts (.env)
```env
# Network Configuration
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Private Key (for deployment)
PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check backend health
curl http://localhost:3001/health

# Check database connection
docker-compose exec backend npx prisma db pull

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Backups
```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres auction_dapp > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres auction_dapp < backup.sql
```

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Redis connection failed:**
   - Check if Redis is running
   - Verify REDIS_HOST and REDIS_PORT

3. **Contract deployment failed:**
   - Check RPC URL and private key
   - Ensure sufficient ETH for gas fees
   - Verify network connectivity

4. **Frontend build failed:**
   - Check Node.js version (18+)
   - Clear .next directory and rebuild
   - Verify environment variables

### Performance Optimization

1. **Database:**
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Monitor query performance

2. **Redis:**
   - Configure memory limits
   - Use Redis clustering for high availability
   - Monitor cache hit rates

3. **Frontend:**
   - Enable Next.js optimizations
   - Use CDN for static assets
   - Implement proper caching strategies

## Security Considerations

1. **Environment Variables:**
   - Never commit .env files
   - Use strong, unique secrets
   - Rotate keys regularly

2. **Database:**
   - Use strong passwords
   - Enable SSL connections
   - Regular security updates

3. **Blockchain:**
   - Secure private key storage
   - Use hardware wallets for production
   - Monitor for suspicious activity

4. **API:**
   - Implement rate limiting
   - Use HTTPS in production
   - Validate all inputs
