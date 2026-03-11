# Smart Contract Integration Plan

## Overview

This document outlines the step-by-step process to integrate the Factory and HomeTransaction smart contracts with the backend API.

---

## Phase 1: Environment & Configuration Setup

### Step 1.1: Install Required Dependencies

- [ ] Verify `ethers` package is installed (already in package.json v5.6.9)
- [ ] Install additional dependencies if needed:

  ```bash
  npm install @truffle/hdwallet-provider hardhat @nomiclabs/hardhat-ethers
  ```

- [ ] Or use existing ethers.js for contract interaction

### Step 1.2: Configure Environment Variables

- [ ] Create/update `.env` file in server directory with:

  ```
  BLOCKCHAIN_NETWORK=localhost|ropsten|mainnet|sepolia
  RPC_URL=http://localhost:8545 (or Infura/Alchemy URL)
  FACTORY_CONTRACT_ADDRESS=0x... (deployed Factory contract address)
  PRIVATE_KEY=0x... (private key for backend wallet - keep secure!)
  CHAIN_ID=1337 (for local) or 1 (mainnet) or 11155111 (sepolia)
  GAS_LIMIT=500000
  GAS_PRICE=20000000000 (or use automatic)
  ```

### Step 1.3: Update Config File

- [ ] Add blockchain configuration to `server/config/config.js`:

  ```javascript
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
    rpcUrl: process.env.RPC_URL,
    factoryAddress: process.env.FACTORY_CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY,
    chainId: parseInt(process.env.CHAIN_ID || '1337'),
    gasLimit: process.env.GAS_LIMIT || 500000,
    gasPrice: process.env.GAS_PRICE || '20000000000'
  }
  ```

---

## Phase 2: Database Schema Updates

### Step 2.1: Update Property Model

- [ ] Add blockchain-related fields to `server/models/property.js`:

  ```javascript
  blockchain: {
    contractAddress: { type: String }, // HomeTransaction contract address
    factoryAddress: { type: String },   // Factory contract address
    transactionHash: { type: String }, // Deployment transaction hash
    contractState: { 
      type: String, 
      enum: ['WaitingSellerSignature', 'WaitingBuyerSignature', 
             'WaitingRealtorReview', 'WaitingFinalization', 
             'Finalized', 'Rejected'],
      default: null
    },
    deployed: { type: Boolean, default: false },
    deployedAt: { type: Date }
  },
  participants: {
    seller: { type: String },    // Ethereum address
    buyer: { type: String },      // Ethereum address
    realtor: { type: String }     // Ethereum address
  },
  contractDetails: {
    price: { type: String },      // Price in Wei (as string for large numbers)
    realtorFee: { type: String }, // Realtor fee in Wei
    deposit: { type: String },    // Deposit amount in Wei
    finalizeDeadline: { type: Date }
  }
  ```

### Step 2.2: Update User Model

- [ ] Add Ethereum address field to `server/models/users.js`:

  ```javascript
  ethereumAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  walletVerified: { type: Boolean, default: false }
  ```

### Step 2.3: Create Transaction History Model (Optional)

- [ ] Create `server/models/transaction.js` to track blockchain transactions:

  ```javascript
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'property' },
    contractAddress: { type: String, required: true },
    transactionHash: { type: String, required: true },
    functionName: { type: String }, // e.g., 'sellerSignContract'
    from: { type: String }, // User's Ethereum address
    status: { type: String, enum: ['pending', 'confirmed', 'failed'] },
    gasUsed: { type: Number },
    blockNumber: { type: Number },
    createdAt: { type: Date, default: Date.now }
  }
  ```

---

## Phase 3: Backend Service Layer

### Step 3.1: Create Blockchain Service Provider

- [ ] Create `server/providers/blockchain.provider.js`:
  - Initialize ethers.js provider (JsonRpcProvider or WebSocketProvider)
  - Create wallet instance from private key
  - Load Factory contract ABI and create contract instance
  - Implement helper functions:
    - `getProvider()` - Returns configured provider
    - `getWallet()` - Returns wallet instance
    - `getFactoryContract()` - Returns Factory contract instance
    - `getHomeTransactionContract(address)` - Returns HomeTransaction contract instance

### Step 3.2: Create Contract ABI Files

- [ ] Create `server/contracts/Factory.json` with compiled ABI
- [ ] Create `server/contracts/HomeTransaction.json` with compiled ABI
- [ ] Or use `@truffle/contract` to load from build artifacts
- [ ] Note: You'll need to compile the Solidity contracts first using Hardhat, Truffle, or Remix

### Step 3.3: Create Smart Contract Service

- [ ] Create `server/services/contract.service.js` with methods:
  - `createHomeTransaction(propertyData, sellerAddress, buyerAddress, realtorAddress)`
    - Calls Factory.create() to deploy new HomeTransaction contract
    - Returns contract address and transaction hash
  - `getContractState(contractAddress)`
    - Reads current state from HomeTransaction contract
  - `sellerSignContract(contractAddress, sellerAddress)`
    - Calls sellerSignContract() on HomeTransaction
  - `buyerSignAndPayDeposit(contractAddress, buyerAddress, depositAmount)`
    - Calls buyerSignContractAndPayDeposit() with ETH value
  - `realtorReviewClosingConditions(contractAddress, realtorAddress, accepted)`
    - Calls realtorReviewedClosingConditions()
  - `buyerFinalizeTransaction(contractAddress, buyerAddress, remainingAmount)`
    - Calls buyerFinalizeTransaction() with remaining ETH
  - `withdrawFromTransaction(contractAddress, userAddress)`
    - Calls anyWithdrawFromTransaction()
  - `getContractDetails(contractAddress)`
    - Reads all public variables from contract

---

## Phase 4: API Endpoints

### Step 4.1: Create Contract Routes

- [ ] Create `server/routes/contract.js`:

  ```javascript
  POST /api/contract/create/:propertyId
    - Creates new HomeTransaction contract via Factory
    - Requires: seller, buyer, realtor addresses, price, realtorFee
    - Updates property with contract address
  
  GET /api/contract/:contractAddress/state
    - Returns current contract state
  
  GET /api/contract/:contractAddress/details
    - Returns all contract details (price, deposit, participants, etc.)
  
  POST /api/contract/:contractAddress/seller-sign
    - Seller signs the contract
    - Requires: seller's signature verification
  
  POST /api/contract/:contractAddress/buyer-sign
    - Buyer signs and pays deposit
    - Requires: deposit amount in ETH/Wei
  
  POST /api/contract/:contractAddress/realtor-review
    - Realtor reviews closing conditions
    - Requires: accepted (boolean)
  
  POST /api/contract/:contractAddress/finalize
    - Buyer finalizes transaction with remaining payment
  
  POST /api/contract/:contractAddress/withdraw
    - Withdraw from transaction (buyer or after deadline)
  
  GET /api/contract/property/:propertyId
    - Get contract info for a specific property
  ```

### Step 4.2: Create Contract Controller

- [ ] Create `server/controllers/contract.controller.js`:
  - Implement all route handlers
  - Validate inputs (addresses, amounts, etc.)
  - Call contract service methods
  - Update database with transaction results
  - Handle errors and return appropriate responses
  - Include transaction receipt in response

### Step 4.3: Update Property Controller

- [ ] Modify `server/controllers/property.controller.js`:
  - Update `addNewProperty` to optionally create contract
  - Add endpoint to link existing property to contract
  - Update `getSingleProperty` to include contract state if exists
  - Add validation for Ethereum addresses when creating contracts

---

## Phase 5: Authentication & Authorization

### Step 5.1: Add Wallet Signature Verification

- [ ] Create `server/middleware/walletAuth.js`:
  - Verify Ethereum message signatures
  - Match signature to user's registered Ethereum address
  - Add to routes that require wallet authentication

### Step 5.2: Update Auth Controller

- [ ] Add endpoint to link Ethereum address to user account:

  ```javascript
  POST /api/auth/link-wallet
    - Verify signature of message containing user ID
    - Link Ethereum address to user account
    - Set walletVerified = true
  ```

### Step 5.3: Add Role-Based Access Control

- [ ] Verify user is seller/buyer/realtor before allowing contract actions
- [ ] Check contract state before allowing state transitions
- [ ] Validate user's Ethereum address matches contract participant

---

## Phase 6: Error Handling & Validation

### Step 6.1: Create Blockchain Error Handler

- [ ] Create `server/middleware/blockchainErrorHandler.js`:
  - Handle common blockchain errors:
    - Insufficient funds
    - Transaction reverted
    - Wrong contract state
    - Invalid address
    - Gas estimation failures
  - Convert Solidity errors to user-friendly messages
  - Log transaction failures for debugging

### Step 6.2: Add Input Validation

- [ ] Validate Ethereum addresses format (0x + 40 hex chars)
- [ ] Validate amounts are positive numbers
- [ ] Validate price >= realtorFee
- [ ] Validate deposit is between 10% and 100% of price
- [ ] Validate contract state transitions are valid

### Step 6.3: Add Transaction Monitoring

- [ ] Implement transaction status polling
- [ ] Store pending transactions in database
- [ ] Update transaction status when confirmed
- [ ] Notify users of transaction status changes (via email/websocket)

---

## Phase 7: Event Listening & Synchronization

### Step 7.1: Create Event Listener Service

- [ ] Create `server/services/eventListener.service.js`:
  - Listen to Factory contract events (ContractCreated)
  - Listen to HomeTransaction contract events:
    - StateChanged
    - DepositPaid
    - TransactionFinalized
  - Update database when events are emitted
  - Handle event processing errors

### Step 7.2: Implement Event Processing

- [ ] Process events in background worker/queue
- [ ] Update property contract state in database
- [ ] Send notifications to relevant users
- [ ] Log all events for audit trail

### Step 7.3: Add State Synchronization

- [ ] Create periodic job to sync contract states
- [ ] Compare on-chain state with database state
- [ ] Resolve discrepancies
- [ ] Alert on state mismatches

---

## Phase 8: Testing

### Step 8.1: Unit Tests

- [ ] Test blockchain provider initialization
- [ ] Test contract service methods with mocked contracts
- [ ] Test validation functions
- [ ] Test error handling

### Step 8.2: Integration Tests

- [ ] Test contract creation flow
- [ ] Test complete transaction lifecycle
- [ ] Test with local blockchain (Hardhat/Ganache)
- [ ] Test error scenarios (insufficient funds, wrong state, etc.)

### Step 8.3: End-to-End Tests

- [ ] Test full property purchase flow:
  1. Create property
  2. Deploy contract
  3. Seller signs
  4. Buyer signs and pays deposit
  5. Realtor reviews
  6. Buyer finalizes
  7. Verify funds distributed correctly

---

## Phase 9: Security Considerations

### Step 9.1: Secure Private Key Storage

- [ ] Never commit private keys to version control
- [ ] Use environment variables or secure key management service
- [ ] Consider using hardware wallet or key management service (AWS KMS, HashiCorp Vault)
- [ ] Implement key rotation strategy

### Step 9.2: Add Rate Limiting

- [ ] Limit contract creation requests per user
- [ ] Prevent spam transactions
- [ ] Implement cooldown periods for certain actions

### Step 9.3: Add Transaction Validation

- [ ] Verify transaction parameters before sending
- [ ] Implement gas price limits to prevent overpayment
- [ ] Add transaction timeouts
- [ ] Validate contract addresses before interaction

### Step 9.4: Audit & Review

- [ ] Review smart contract code for vulnerabilities
- [ ] Consider professional smart contract audit
- [ ] Test with small amounts first
- [ ] Implement circuit breakers for emergency stops

---

## Phase 10: Deployment

### Step 10.1: Contract Deployment

- [ ] Deploy Factory contract to testnet (Sepolia/Ropsten)
- [ ] Verify contract on Etherscan
- [ ] Test all functions on testnet
- [ ] Deploy to mainnet after thorough testing
- [ ] Store deployment addresses securely

### Step 10.2: Backend Deployment

- [ ] Update environment variables for production
- [ ] Configure production RPC endpoint (Infura/Alchemy)
- [ ] Set up monitoring and logging
- [ ] Configure backup RPC endpoints for redundancy
- [ ] Set up alerts for failed transactions

### Step 10.3: Database Migration

- [ ] Run migration to add new schema fields
- [ ] Backfill existing properties if needed
- [ ] Create indexes on new fields (contractAddress, ethereumAddress)

---

## Phase 11: Documentation & Monitoring

### Step 11.1: API Documentation

- [ ] Document all new contract endpoints
- [ ] Include request/response examples
- [ ] Document error codes and messages
- [ ] Add integration examples

### Step 11.2: Monitoring Setup

- [ ] Monitor transaction success rates
- [ ] Track gas usage
- [ ] Monitor contract state changes
- [ ] Set up alerts for failed transactions
- [ ] Log all blockchain interactions

### Step 11.3: User Documentation

- [ ] Create user guide for wallet linking
- [ ] Document transaction flow
- [ ] Explain gas fees
- [ ] Provide troubleshooting guide

---

## Additional Considerations

### Frontend Integration (Future)

- [ ] Update frontend to call new contract endpoints
- [ ] Add wallet connection (MetaMask, WalletConnect)
- [ ] Display contract state in UI
- [ ] Show transaction status and confirmations
- [ ] Add transaction history view

### Gas Optimization

- [ ] Optimize contract calls to reduce gas usage
- [ ] Batch transactions where possible
- [ ] Implement gas price estimation
- [ ] Allow users to set custom gas prices

### Multi-Chain Support (Future)

- [ ] Abstract blockchain provider to support multiple chains
- [ ] Add chain selection in configuration
- [ ] Support for Polygon, BSC, etc.

---

## Quick Start Checklist

**Minimum Viable Integration:**

1. ✅ Set up environment variables
2. ✅ Update property model with contract fields
3. ✅ Create blockchain provider
4. ✅ Create contract service with createContract method
5. ✅ Add POST /api/contract/create endpoint
6. ✅ Test contract creation on local blockchain
7. ✅ Update property with contract address after deployment

**Full Integration:**

- Complete all phases above
- Implement all contract functions
- Add event listening
- Full testing suite
- Production deployment

---

## Notes

- The contracts use Solidity version <0.6.0, which is quite old. Consider upgrading to a newer version (0.8.x) for better security and features.
- The `now` keyword in Solidity is deprecated; use `block.timestamp` in newer versions.
- Consider adding events to contracts for better off-chain tracking.
- Implement proper access control and consider using OpenZeppelin libraries for security.
