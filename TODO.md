# Auction DApp – TODO List

Actionable finish-the-app list for the **primary stack**: `frontend/` + `backend/` + `contracts/`.  
(The root Next.js demo under `app/` / `components/` is legacy and is not the target product.)

---

## Application overview (current)

A full-stack Ethereum auction platform with seven auction types, wallet auth, on-chain bidding, and live updates.

| Layer | Stack | Role |
|-------|--------|------|
| **Frontend** (`frontend/`) | Next.js 14, React 18, TypeScript, Tailwind, Framer Motion, ethers v6, Socket.IO, React Query | UI, MetaMask wallet, contract txs |
| **Backend** (`backend/`) | Express, Prisma + PostgreSQL, Redis, Socket.IO, JWT, ethers | REST API, deploy-on-start, end processing, validation |
| **Contracts** (`contracts/`) | Hardhat, Solidity, OpenZeppelin | 7 auction contracts + ERC20 mock |

**Working today**

- Wallet SIWE-style auth: `/api/auth/nonce`, `/login`, `/me`, `/logout` + JWT on protected routes
- Auction CRUD, filters, create/start; start deploys via `contractDeployment` service
- On-chain bidding for all 7 types (frontend `BiddingInterface` + backend wallet / web3 routes)
- Bid validation against contract state; `Bid.transactionHash` persisted
- Sealed-bid reveal (API + UI); auction end cron (`auctionEndProcessor`)
- In-app notifications + Socket.IO rooms; env files and Prisma migrations in place
- Route/unit tests for backend auth/auctions/web3, some frontend components, contract tests (6 of 7 types)

**Not in scope / not built**

- Admin UI, fiat payments, email/push notifications
- Full E2E coverage; HoldToCompete contract tests still thin

**Ops gotchas (local)**

1. Run `npm run compile:artifacts` in `contracts/` — `backend/src/contracts/artifacts/` is required for deploy-on-start
2. `GET /api/web3/contracts` reads repo-root `contracts/deployments.json`
3. Prefer `frontend/` over the root Wagmi/RainbowKit demo

See also: `ISSUES_AND_TODO.md`, `QUICK_TEST.md`, `TESTING_GUIDE.md`, `backend/SETUP_GUIDE.md`.

---

## Done (Phase 1–3)

- [x] Fix auth middleware; implement auth endpoints; wire frontend nonce → sign → login
- [x] Add `Bid.transactionHash`; Prisma migrate; persist on bid create
- [x] Export/wire ABIs; contract deployment service; backend wallet `place*Bid`
- [x] Frontend contract bidding for all 7 auction types
- [x] Bid validation against contract (`bidValidationService` / `contractValidator`)
- [x] Env files (`backend/.env`, `frontend/.env.local`, `contracts/.env`)
- [x] Sealed bid reveal; auction end processing cron
- [x] Baseline tests (backend routes, frontend components, most contract types)

---

## Remaining work

### Ops & wiring (do next)

- [x] **Compile artifacts for backend** – `cd contracts && npm run compile:artifacts` so deploy-on-start finds bytecode under `backend/src/contracts/artifacts/`
- [x] **Fix deployments path** – Point `backend/src/routes/web3.js` at repo-root `contracts/deployments.json`
- [x] **Local chain smoke** – Hardhat node → deploy → create/start auction → bid → end; confirm addresses resolve (`contracts/scripts/local-chain-smoke.js`)

### Quality & UX

- [x] **API docs** – Swagger/OpenAPI for auth, auctions, users, web3 (`GET /api/docs`, `GET /api/docs.json`)
- [x] **React error boundaries** – Prevent full-app crash on component failures (`error.tsx`, `global-error.tsx`, section `ErrorBoundary`)
- [ ] **Tighten TypeScript** – Replace remaining `any` in `frontend/src/`
- [ ] **Loading / retry** – Fill gaps on async actions; clear toasts + optional retry for failed tx/API calls
- [ ] **Socket vs REST bids** – Align live updates: REST bid path should emit Socket.IO events; socket `place_bid` should match REST auth/validation strength

### Testing

- [ ] **HoldToCompete contract tests** – Cover in `contracts/test/`
- [ ] **Deeper frontend tests** – BiddingInterface, AuctionCreationForm, sealed reveal
- [ ] **Integration / E2E** – Create → start (deploy) → bid → end for at least Dutch + English, then others

### Docs & deploy prep

- [ ] **Production env** – Prod DB, Redis, RPC, contract addresses; no dev keys in prod
- [ ] **Build & smoke** – Frontend build + prod-mode backend/frontend
- [ ] **Docker** – Verify `docker-compose` (DB, Redis, backend, frontend; optional chain)
- [ ] **Clarify README** – Document `frontend/` + Express as the primary app (root demo is legacy)

### Optional enhancements

- [ ] **Email/push notifications** – Hook into existing notification model (SendGrid/SES or similar)
- [ ] **Admin tooling** – Moderate auctions / users if needed
- [ ] **Security review** – Contracts + API auth checks + no secrets in client

---

## Quick reference – local run order

1. **Backend:** `cd backend && npm install && npx prisma migrate dev && npx prisma generate && npm run dev`
2. **Contracts:** `cd contracts && npm run compile && npm run compile:artifacts` (and `npm run export-abis` / compile abis if needed). Local chain: `npx hardhat node`, then `npx hardhat run scripts/deploy.js --network localhost`
3. **Frontend:** `cd frontend && npm install && npm run dev`
4. **Browser:** http://localhost:3000 → connect wallet → create auction → place bid

---

*Last updated: 2026-09-20. Keep in sync with `ISSUES_AND_TODO.md`.*
