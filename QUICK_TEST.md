# Quick Testing Guide

## 🚀 Start Testing in 3 Steps

### Step 1: Install & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### Step 2: Open Browser

Navigate to: **http://localhost:3000**

### Step 3: Connect Wallet

1. Install MetaMask extension (if not installed)
2. Click "Connect Wallet" button
3. Approve connection in MetaMask

## ✅ Quick Test Scenarios

### Test 1: Browse Auctions

1. Click "Auctions" in navigation
2. ✅ Should see auction cards
3. ✅ Try filtering by type
4. ✅ Click on an auction card

### Test 2: Create Auction

1. Click "Create" in navigation
2. ✅ Should see 7 auction type cards
3. Click "Dutch Auction"
4. Fill in form:
   - Title: "Test Auction"
   - Start Price: 10
   - Reserve Price: 1
   - Duration: 24
   - Price Drop: 60
5. ✅ Click "Create Auction"
6. ✅ Should redirect to auction page

### Test 3: View Auction Details

1. Go to `/auctions` page
2. Click any auction
3. ✅ Should see full auction details
4. ✅ Should see bidding interface
5. ✅ Should see bid history

## 🐛 Common Issues

**"Cannot find module" errors in IDE:**

- These are false positives - TypeScript compiles fine
- Restart your IDE/TypeScript server
- The app will work despite these warnings

**API errors:**

- Expected if backend isn't running
- App uses mock data as fallback
- Form submission will fail (needs backend)

**Wallet connection:**

- Make sure MetaMask is installed
- Check browser console for errors

## 📝 What to Test

- [x] Home page loads
- [x] Navigation works
- [x] Wallet connection
- [x] Auction listing page
- [x] Create auction form
- [x] Auction detail page
- [x] Form validation
- [x] All 7 auction types in form

## 🎯 Expected Behavior

✅ **Works without backend:**

- All pages load
- Mock data displays
- Form validation works
- UI/UX is functional

❌ **Needs backend:**

- Form submission
- Real-time updates
- Contract interactions

## 📊 Test Results Template

```
Browser: Chrome/Firefox/Edge
MetaMask: Installed/Not Installed
Backend: Running/Not Running

Home Page: ✅/❌
Auctions List: ✅/❌
Create Form: ✅/❌
Auction Detail: ✅/❌
Wallet Connect: ✅/❌
Form Validation: ✅/❌

Issues Found:
- [List any issues]
```

