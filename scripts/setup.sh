#!/bin/bash

# Auction dApp Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Auction dApp development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Docker $(docker --version) detected"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install contracts dependencies
echo "📦 Installing contracts dependencies..."
cd contracts
npm install
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "📝 Creating environment files..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env"
else
    echo "⚠️  backend/.env already exists"
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_ETHEREUM_RPC_URL=http://localhost:8545
EOF
    echo "✅ Created frontend/.env.local"
else
    echo "⚠️  frontend/.env.local already exists"
fi

# Contracts .env
if [ ! -f "contracts/.env" ]; then
    cp contracts/env.example contracts/.env
    echo "✅ Created contracts/.env"
else
    echo "⚠️  contracts/.env already exists"
fi

# Create logs directory
mkdir -p backend/logs
echo "✅ Created logs directory"

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if ! docker-compose ps | grep -q "postgres.*Up"; then
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

if ! docker-compose ps | grep -q "redis.*Up"; then
    echo "❌ Redis failed to start"
    exit 1
fi

echo "✅ Database services are running"

# Run database migrations
echo "🗄️  Running database migrations..."
cd backend
npx prisma generate
npx prisma migrate dev --name init
cd ..

echo "✅ Database migrations completed"

# Compile contracts
echo "📜 Compiling smart contracts..."
cd contracts
npx hardhat compile
cd ..

echo "✅ Smart contracts compiled"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Start the development servers:"
echo "   npm run dev"
echo ""
echo "2. Or start individual services:"
echo "   npm run dev:backend    # Backend API on http://localhost:3001"
echo "   npm run dev:frontend   # Frontend on http://localhost:3000"
echo "   npm run dev:contracts  # Hardhat node on http://localhost:8545"
echo ""
echo "3. Deploy contracts to local network:"
echo "   cd contracts && npm run deploy:local"
echo ""
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "Happy coding! 🚀"
