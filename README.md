# Auction dApp - Full-Stack Implementation

A comprehensive full-stack decentralized application for managing and participating in various types of smart contract auctions.

## 🏗️ Project Structure

```
auction-dapp/
├── contracts/          # Smart contracts (Solidity)
├── backend/           # Node.js/Express API server
├── frontend/          # React/Next.js web application
├── shared/            # Shared utilities and types
└── docs/              # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd auction-dapp
npm install
```

2. **Set up environment variables:**
```bash
# Copy environment files
cp contracts/.env.example contracts/.env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. **Start development servers:**
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend web app on http://localhost:3000
- Hardhat local network on http://localhost:8545

## 📋 Available Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run test` - Run all tests
- `npm run deploy:contracts` - Deploy contracts to network

## 🔧 Technology Stack

### Smart Contracts
- Solidity ^0.8.20
- Hardhat
- OpenZeppelin Contracts
- Ethers.js

### Backend
- Node.js
- Express.js
- PostgreSQL
- Redis
- WebSocket (Socket.io)
- Prisma ORM

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- Web3.js
- React Query
- Socket.io Client

## 🎯 Features

- **7 Auction Types**: Dutch, English, Sealed Bid, Hold-to-Compete, Playable, Random Selection, Order Book
- **Real-time Updates**: Live bidding and price updates
- **Wallet Integration**: MetaMask and WalletConnect support
- **Responsive Design**: Mobile-first approach
- **Admin Dashboard**: Auction management and analytics
- **User Profiles**: Bidding history and preferences

## 📚 Documentation

- [Smart Contracts](./contracts/README.md)
- [Backend API](./backend/README.md)
- [Frontend Guide](./frontend/README.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.