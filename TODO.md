# Auction DApp – Finish-the-App TODO List

Use this list to complete the app. Order follows priority (critical → enhancements). Check off items as you go.

---

## Phase 1: Critical Fixes (Must Do First)

### Backend startup & auth

- [ ] **Fix auth middleware** – Ensure `backend/src/middleware/auth.js` has no syntax errors (opening brace in `optionalAuth`); confirm server starts.
- [ ] **Add `/api/auth/nonce`** – Endpoint that returns a nonce for the wallet to sign.
- [x] **Add `/api/auth/login`** – Accept `address` + `signature`, verify with ethers, find/create user, issue JWT; wire route in `server.js`.
- [ ] **Use real auth in frontend** – Replace placeholder token logic in `frontend/src/utils/api.ts` with nonce → sign → login flow.

### Database & bid tracking

- [ ] **Add `transactionHash` to Bid** – Update `backend/prisma/schema.prisma` Bid model; run migration; persist `transactionHash` in `backend/src/routes/auctions.js` when creating bids.
- [ ] **Run Prisma setup** – Create DB, set `DATABASE_URL` in `backend/.env`, run `npx prisma migrate dev` and `npx prisma generate`.

### Contract integration (backend)

- [ ] **Export contract ABIs** – Script or copy from `contracts/artifacts` to `contracts/abis/`; make ABIs available to `frontend/src/contracts/abis/` and `backend/src/contracts/abis/`.
- [ ] **Contract deployment service** – Implement `backend/src/services/contractDeployment.js` (deploy by auction type using env private key); replace placeholder in `backend/src/routes/auctions.js` (~line 190) with real deployment and save contract address.
- [ ] **Backend wallet service** – Implement `backend/src/services/walletService.js`; replace "Wallet integration not implemented" in all `place*Bid` handlers in `backend/src/routes/web3.js` with real contract calls using ABIs.

### Contract integration (frontend)

- [ ] **Frontend bidding for all types** – In `frontend/src/components/auctions/BiddingInterface.tsx`, add contract interaction (using ABIs) for all 7 auction types, not just Dutch/English.

### Validation & correctness

- [ ] **Bid validation against contract** – Implement validation in backend (e.g. `contractValidator.js`) and use it in `backend/src/routes/auctions.js` (~line 226) so bids are checked against contract state before persisting.

---

## Phase 2: Environment & Deployment

### Local env and services

- [ ] **Backend `.env`** – Copy `backend/env.example` to `backend/.env`; set `DATABASE_URL`, JWT secret, Redis, RPC URL, `PRIVATE_KEY` for deployment/bidding.
- [ ] **Frontend `.env.local`** – Add `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, `NEXT_PUBLIC_ALCHEMY_ID` (or similar).
- [ ] **Contracts `.env`** – Copy `contracts/env.example` to `contracts/.env`; set network and keys.
- [ ] **Redis** – Install/start Redis; add connection settings to `backend/.env`; confirm backend connects.

### Blockchain and contracts
- [ ] **Local chain** – Run Hardhat node (`npx hardhat node` in `contracts`); deploy with `npx hardhat run scripts/deploy.js --network localhost`.
- [ ] **Deployment output** – Ensure `contracts/deployments.json` (or equivalent) exists and backend reads contract addresses from config (e.g. `backend/src/routes/web3.js`).

---

## Phase 3: Missing Features

- [ ] **Sealed bid reveal** – Backend endpoint + frontend UI + contract flow for reveal phase; test full sealed-bid lifecycle.
- [ ] **Auction end processing** – Cron or scheduler (e.g. `backend/src/services/auctionScheduler.js`) to detect ended auctions, update status, determine winners, optionally trigger payouts.
- [ ] **Bid validation** – Already listed in Phase 1; ensure it’s wired and tested.

---

## Phase 4: Reliability & UX

- [ ] **React error boundaries** – Add error boundaries so one component failure doesn’t crash the whole app.
- [ ] **Loading states** – Add loading/disabled states for all async actions (create auction, place bid, auth, etc.).
- [ ] **Retry/feedback** – Clear error toasts and optional retry for failed tx/API calls.

---

## Phase 5: Testing

- [ ] **Backend tests** – Implement tests for auth, auctions, web3 routes (e.g. Jest); run `npm test` in `backend`.
- [ ] **Contract tests** – Tests for all 7 auction types in `contracts/test/`; run Hardhat tests.
- [ ] **Frontend tests** – Component/unit tests for critical flows (e.g. BiddingInterface, AuctionCreationForm); run frontend test script.
- [ ] **Integration** – Manually or via E2E: create auction → start (deploy) → bid → end; verify for at least Dutch and English, then others.

---

## Phase 6: Documentation & Deploy Prep

- [ ] **API docs** – Add Swagger/OpenAPI for backend routes; document auth, auctions, web3.
- [ ] **Production env** – Production `DATABASE_URL`, Redis, RPC, contract addresses; no dev keys in prod.
- [ ] **Build & run** – `npm run build` for frontend; run backend and frontend in prod mode; smoke test.
- [ ] **Docker** – Ensure `docker-compose` includes DB, Redis, backend, frontend (and optionally chain); test `docker-compose up`.

---

## Phase 7: Enhancements (Optional)

- [ ] **Notifications** – Email/push (e.g. SendGrid/SES) for auction and bid events; hook into existing notification model.
- [ ] **TypeScript** – Replace remaining `any` types in frontend with proper types.
- [ ] **Security** – Smart contract review, API auth checks, and frontend best practices (no secrets in client).

---

## Quick reference – run order for local dev

1. Backend: `cd backend && npm install && npx prisma migrate dev && npx prisma generate && npm run dev`
2. Contracts: `cd contracts && npx hardhat node` (separate terminal), then `npx hardhat run scripts/deploy.js --network localhost`
3. Frontend: `cd frontend && npm install && npm run dev`
4. Browser: http://localhost:3000 → connect wallet → create auction → place bid

---

*Based on `APPLICATION_STATUS.md`. Update this file as you complete items.*
