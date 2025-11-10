# Testing Guide for Auction dApp

## Prerequisites

Before testing, ensure you have:

1. **Node.js** (v18 or higher)
2. **MetaMask** browser extension installed
3. **Backend server** running (if testing with real API)
4. **Local blockchain** (Hardhat) running (optional, for contract testing)

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_ETHEREUM_RPC_URL=http://localhost:8545
```

### 3. Start the Development Server

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`

## Testing Checklist

### ✅ Home Page (`/`)

- [ ] Page loads without errors
- [ ] Hero section displays correctly
- [ ] Auction types section shows all 7 types
- [ ] Featured auctions section displays (may show mock data)
- [ ] Stats section displays
- [ ] Wallet connect button works
- [ ] Navigation links work

### ✅ Auctions Listing Page (`/auctions`)

- [ ] Page loads and displays auction cards
- [ ] Search functionality works
- [ ] Filter by type works
- [ ] Filter by status works
- [ ] Sort options work
- [ ] Pagination works (if more than 12 auctions)
- [ ] Clicking "View Auction" navigates to detail page
- [ ] Mock data displays if API is unavailable

**Test Data:**
- Try searching for "Rare"
- Filter by "ENGLISH" type
- Filter by "ACTIVE" status
- Sort by "Most Bids"

### ✅ Create Auction Page (`/create`)

**Step 1: Wallet Connection**
- [ ] Page shows warning if wallet not connected
- [ ] After connecting wallet, form appears

**Step 2: Type Selection**
- [ ] All 7 auction types display as cards
- [ ] Each card shows icon, title, and description
- [ ] Clicking a type navigates to details form

**Step 3: Form Validation**

Test each auction type:

#### Dutch Auction
- [ ] Title field required
- [ ] Start price must be > reserve price
- [ ] All required fields validated
- [ ] Form submits successfully

**Test Values:**
```
Title: Test Dutch Auction
Description: This is a test auction
Start Price: 10.0 ETH
Reserve Price: 1.0 ETH
Duration: 24 hours
Price Drop Interval: 60 minutes
```

#### English Auction
- [ ] Bidding time required
- [ ] Reserve price required
- [ ] Form submits successfully

**Test Values:**
```
Title: Test English Auction
Bidding Time: 48 hours
Reserve Price: 0.5 ETH
```

#### Sealed Bid Auction
- [ ] Bidding time required
- [ ] Reveal time required
- [ ] Form submits successfully

**Test Values:**
```
Title: Test Sealed Bid Auction
Bidding Time: 72 hours
Reveal Time: 24 hours
```

#### Hold-to-Compete Auction
- [ ] Token address validation (must be valid Ethereum address)
- [ ] Minimum hold amount required
- [ ] Bidding time required
- [ ] Form submits successfully

**Test Values:**
```
Title: Test Hold-to-Compete Auction
Token Address: 0x1234567890123456789012345678901234567890
Minimum Hold Amount: 100 tokens
Bidding Time: 24 hours
```

#### Playable Auction
- [ ] Start price required
- [ ] Reserve price required
- [ ] Duration required
- [ ] Form submits successfully

#### Random Selection Auction
- [ ] Bidding time required
- [ ] Form submits successfully

#### Order Book Auction
- [ ] Bidding time required
- [ ] Form submits successfully

**Step 4: Submission**
- [ ] Form validates all fields
- [ ] Loading state shows during submission
- [ ] Success message appears
- [ ] Redirects to auction detail page after creation

### ✅ Auction Detail Page (`/auctions/[id]`)

**Page Elements:**
- [ ] Auction image displays
- [ ] Title and description show correctly
- [ ] Auction type badge displays
- [ ] Status badge displays
- [ ] Current price shows
- [ ] Highest bid shows (if applicable)
- [ ] Total bids count shows
- [ ] Time remaining displays (if active)
- [ ] Creator information shows
- [ ] Bid history section displays

**Bidding Interface:**
- [ ] Shows "Connect wallet" message if not connected
- [ ] Shows "You are creator" message if viewing own auction
- [ ] Bid amount input works
- [ ] Minimum bid hint displays correctly
- [ ] Balance check works
- [ ] Bid validation works (must be higher than current)
- [ ] Place bid button disabled when invalid
- [ ] Transaction flow works (if contracts deployed)

**Real-time Updates:**
- [ ] Socket.IO connects (check browser console)
- [ ] New bids update in real-time
- [ ] Auction state updates automatically

**Bid History:**
- [ ] Bids display in chronological order
- [ ] Bidder addresses show (truncated)
- [ ] Bid amounts formatted correctly
- [ ] Transaction links work (if available)
- [ ] Status badges show correctly

### ✅ Navigation & User Flow

**Complete User Journey:**
1. [ ] Land on home page
2. [ ] Connect wallet
3. [ ] Navigate to "Create" page
4. [ ] Create a Dutch auction
5. [ ] View created auction
6. [ ] Navigate to "Auctions" page
7. [ ] Find and click on auction
8. [ ] View auction details
9. [ ] Place a bid (if not creator)

## Common Issues & Solutions

### Issue: TypeScript Errors About Missing Components

**Solution:** These are likely false positives. The files exist. Try:
1. Restart TypeScript server in your IDE
2. Run `npm run type-check` to verify
3. The app should still work despite the warnings

### Issue: API Connection Errors

**Solution:** The app has fallback mock data. If backend is not running:
- Auction listing will show 3 mock auctions
- Auction detail page will show mock data
- Form submission will fail (expected without backend)

### Issue: Wallet Connection Fails

**Solution:**
1. Ensure MetaMask is installed
2. Ensure you're on a supported network
3. Check browser console for errors
4. Try refreshing the page

### Issue: Socket.IO Connection Fails

**Solution:**
- This is expected if backend is not running
- Socket errors won't break the app
- Real-time features will work once backend is running

### Issue: Contract Interaction Fails

**Solution:**
- Contracts need to be deployed first
- Ensure you're on the correct network
- Check that contract addresses are set
- For testing, use mock data mode

## Testing Without Backend

The app is designed to work with mock data when the backend is unavailable:

- ✅ Home page works
- ✅ Auctions listing shows mock data
- ✅ Auction detail page shows mock data
- ✅ Form validation works
- ❌ Form submission will fail (needs backend)
- ❌ Real-time updates won't work (needs backend)
- ❌ Contract interactions won't work (needs contracts)

## Testing With Backend

1. Start the backend server:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. Ensure database is set up:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

3. Test API endpoints:
   - `GET /api/auctions` - Should return auctions
   - `POST /api/auctions` - Should create auction (needs auth)
   - `GET /api/auctions/:id` - Should return auction details

## Browser Console Checks

Open browser DevTools (F12) and check:

1. **No Red Errors** - Should see minimal errors
2. **Socket Connection** - Check for "Socket connected" message
3. **API Calls** - Check Network tab for API requests
4. **Web3 Connection** - Check for wallet connection logs

## Next Steps After Testing

Once basic testing is complete:

1. ✅ Fix any UI/UX issues found
2. ✅ Implement proper authentication
3. ✅ Connect to deployed smart contracts
4. ✅ Test with real blockchain transactions
5. ✅ Test all 7 auction types end-to-end

## Reporting Issues

When reporting issues, include:
- Browser and version
- Steps to reproduce
- Console errors (screenshot)
- Network tab errors (screenshot)
- Expected vs actual behavior

