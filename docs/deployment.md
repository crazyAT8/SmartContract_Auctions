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

2. **Start core services** (Postgres, Redis, backend, frontend):
```bash
docker compose up -d --build
```

Migrations run automatically on backend start (`prisma migrate deploy`).

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 3001 (`GET /health`)
- Frontend on port 3000

3. **Optional local chain** (Hardhat on :8545):
```bash
docker compose --profile local-chain up -d --build

# Deploy factory contracts into the container chain, then refresh deployments.json on the host
docker compose --profile local-chain exec hardhat \
  npx hardhat run scripts/deploy.js --network localhost
```

Backend defaults to `ETHEREUM_RPC_URL=http://hardhat:8545` and Hardhat account #0.
Override `ETHEREUM_RPC_URL` / `PRIVATE_KEY` when pointing at Sepolia or another network instead of the profile.

4. **Smoke checks:**
```bash
curl http://localhost:3001/health
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/
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

Production must use **real** DB, Redis, RPC, and contract addresses — never Hardhat defaults,
`localhost` RPC, or placeholder JWT/private keys. The backend refuses to start in
`NODE_ENV=production` if those slip through (`validateEnv`).

### Checklist

1. **Copy production templates** (do not commit filled files):
   ```bash
   cp backend/env.production.example backend/.env.production
   cp frontend/env.production.example frontend/.env.production
   cp contracts/env.production.example contracts/.env
   ```
2. **Provision Postgres + Redis** with strong passwords (managed or self-hosted).
3. **Create a dedicated deployer wallet**, fund it on the target network, set `PRIVATE_KEY`
   (backend + contracts). Never use Hardhat account #0–9 keys.
4. **Set RPC** to Infura/Alchemy/etc. for Sepolia (staging) or mainnet — not `:8545`.
5. **Deploy contracts** to that network and update `contracts/deployments.json`:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network sepolia   # or mainnet
   ```
6. **Validate** before start:
   ```bash
   cd backend
   NODE_ENV=production npm run check:prod-env
   ```
7. **Migrate + run**:
   ```bash
   cd backend && npm run migrate:prod && NODE_ENV=production npm start
   cd frontend && npm run build && npm start
   ```

### Local build & smoke (laptop)

Confirms the **production entrypoints** work before Docker/real deploy. Uses local
Postgres/Redis/Hardhat via `ALLOW_LOCAL_PROD_SMOKE=1` (never set on a real host).

```bash
# Frontend: production build + next start → GET /
cd frontend && npm run build && npm run smoke:prod

# Backend: NODE_ENV=production + npm start → GET /health
# (requires DB/Redis up; uses backend/.env)
cd backend && npm run smoke:prod
```

Real go-live still needs filled `env.production.example` values and
`NODE_ENV=production npm run check:prod-env` **without** `ALLOW_LOCAL_PROD_SMOKE`.

### Using Docker Compose (production overlay)

```bash
# Fill backend/.env.production and frontend/.env.production first
export POSTGRES_USER=appuser
export POSTGRES_PASSWORD='...'
export REDIS_PASSWORD='...'

# Also set public URLs used at frontend image build time:
export NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
export NEXT_PUBLIC_WS_URL=https://api.yourdomain.com
export NEXT_PUBLIC_ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Migrations run on backend container start. The prod overlay loads secrets from
`env_file`, requires strong Postgres/Redis passwords, and does not start Hardhat
(Hardhat stays behind the `local-chain` profile on the base compose file).

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

### Backend (development — `env.example`)
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
CONTRACT_ADDRESSES_JSON=../contracts/deployments.json

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
docker compose exec backend npx prisma db pull

# Check Redis connection
docker compose exec redis redis-cli ping
```

### Logs
```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Database Backups
```bash
# Create backup
docker compose exec postgres pg_dump -U postgres auction_dapp > backup.sql

# Restore backup
docker compose exec -T postgres psql -U postgres auction_dapp < backup.sql
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
   - Never commit `.env` / `.env.production` files
   - Use `backend/env.production.example` templates; fill secrets only on the host/CI
   - Run `cd backend && NODE_ENV=production npm run check:prod-env` before go-live
   - Backend `validateEnv` blocks Hardhat private keys, localhost RPC, placeholder JWT, and local `deployments.json` when `NODE_ENV=production`
   - Rotate keys regularly

2. **Database:**
   - Use strong passwords
   - Enable SSL connections
   - Regular security updates

3. **Blockchain:**
   - Secure private key storage (dedicated deployer; never Hardhat defaults)
   - Prefer a hardware wallet / KMS for high-value mainnet ops
   - Monitor for suspicious activity

4. **API:**
   - Implement rate limiting
   - Use HTTPS in production
   - Validate all inputs
