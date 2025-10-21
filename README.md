# AuctionDApp - Decentralized Auction Platform

A comprehensive auction platform built on Ethereum featuring multiple auction mechanisms including English, Dutch, Sealed Bid, Hold-to-Compete, Order Book, Playable, and Random Selection auctions.

## 🚀 Features

- **Multiple Auction Types**: 7 different auction mechanisms for various use cases
- **Modern UI/UX**: Beautiful, responsive interface with smooth animations
- **Web3 Integration**: Seamless wallet connection with RainbowKit
- **Real-time Updates**: Live auction data and price updates
- **Security**: Built with OpenZeppelin contracts and best practices
- **TypeScript**: Full type safety throughout the application

## 🏗️ Auction Types

### 1. English Auction 📈

Traditional ascending bid auction where participants bid against each other.

### 2. Dutch Auction 📉

Descending price auction where the price drops until someone buys.

### 3. Sealed Bid Auction 🔒

Two-phase confidential bidding with blind submission and reveal phases.

### 4. Hold to Compete 🔐

Requires token locking before bidding to prevent frivolous bids.

### 5. Order Book Auction 📊

Matching engine for buy and sell orders with clearing price determination.

### 6. Playable Auction 🎮

Gamified auction with price drops and partial refunds for engagement.

### 7. Random Selection 🎲

Lottery-based winner selection weighted by bid amount for fair distribution.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Web3**: Wagmi, RainbowKit, Ethers.js
- **Blockchain**: Ethereum, Hardhat
- **Smart Contracts**: Solidity ^0.8.20, OpenZeppelin

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd auction-dapp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   
   ```env
   NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_api_key
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id
   ```

4. **Compile and deploy contracts**

   ```bash
   npm run compile
   npm run deploy
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Local Development

1. Start Hardhat node: `npx hardhat node`
2. Deploy contracts: `npm run deploy`
3. Update contract addresses in `app/page.tsx`
4. Start the app: `npm run dev`

### Production

1. Build the app: `npm run build`
2. Deploy contracts to your target network
3. Update contract addresses and network configuration
4. Deploy to your hosting platform

## 📁 Project Structure

```
auction-dapp/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── auctions/         # Auction-specific components
│   ├── Header.tsx        # Navigation header
│   └── AuctionTypeSelector.tsx
├── contracts/            # Smart contracts
│   ├── *.sol            # Auction contracts
│   └── MockERC20.sol    # Test token
├── lib/                  # Utilities and configuration
│   ├── contracts.ts     # Contract ABIs and helpers
│   ├── providers.tsx    # Web3 providers
│   ├── types.ts         # TypeScript types
│   └── wagmi.ts         # Wagmi configuration
├── scripts/              # Deployment scripts
│   └── deploy.ts        # Contract deployment
└── hardhat.config.ts     # Hardhat configuration
```

## 🔧 Configuration

### Contract Addresses

Update the `MOCK_CONTRACTS` object in `app/page.tsx` with your deployed contract addresses:

```typescript
const MOCK_CONTRACTS = {
  english: '0x...',
  dutch: '0x...',
  // ... other contracts
}
```

### Network Configuration

Modify `lib/wagmi.ts` to add your target networks:

```typescript
const { chains, publicClient } = configureChains(
  [mainnet, polygon, arbitrum, optimism, localhost],
  // ... providers
)
```

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run compile` - Compile smart contracts
- `npm run deploy` - Deploy contracts
- `npm run test` - Run tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract libraries
- RainbowKit for wallet connection
- Wagmi for React hooks
- Framer Motion for animations
- Tailwind CSS for styling

## 📞 Support

If you have any questions or need help, please open an issue or contact the development team.

---

Built with ❤️ for the decentralized web
