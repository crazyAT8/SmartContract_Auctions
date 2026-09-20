# Issues List & Todo List

## Application overview (current)

**Primary product:** `frontend/` (Next.js) + `backend/` (Express/Prisma) + `contracts/` (Hardhat).  
**Legacy:** root `app/` / Wagmi–RainbowKit demo — not the day-to-day target.

| Area | Status |
|------|--------|
| Wallet auth (nonce → sign → JWT) | Implemented |
| Auction CRUD + start (on-chain deploy) | Implemented (needs artifacts + RPC/key) |
| Bidding — all 7 types on-chain | Implemented (frontend + backend wallet) |
| Bid validation + `transactionHash` | Implemented |
| Sealed reveal + end-processing cron | Implemented |
| In-app notifications + Socket.IO | Implemented (no email/push) |
| Env files + Prisma migrations | Present |
| Tests | Baseline exists; not full E2E |
| Admin / fiat payments / OpenAPI | Not built |

**Stack snapshot:** Frontend uses custom MetaMask/`Web3Context` (ethers), not RainbowKit. Backend: PostgreSQL, Redis, Socket.IO. Money is on-chain ETH (ERC20 for hold-to-compete).

**Local blockers to watch**

- ~~Backend deploy needs `backend/src/contracts/artifacts/`~~ → run `npm run compile:artifacts` in `contracts/` (done locally; dir is gitignored)
- `web3` deployments path expects `backend/contracts/deployments.json`; file lives at repo-root `contracts/deployments.json`

---

## Issues List

### Critical (blocking / high impact)

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 1 | ~~**Missing authentication endpoint**~~ | `backend/src/routes/auth.js` | Resolved: nonce/login/me/logout + frontend wire-up. |
| 2 | ~~**Contract deployment placeholder**~~ | `backend/src/services/contractDeployment.js` | Resolved: real deploy on start (needs artifacts + env). |
| 3 | ~~**Backend wallet not implemented**~~ | `backend/src/services/walletService.js`, `web3.js` | Resolved: `place*Bid` / reveal use backend wallet. |
| 4 | ~~**Bid validation not implemented**~~ | `bidValidationService.js` | Resolved: validated against contract on POST bids. |
| 5 | ~~**Bid model missing `transactionHash`**~~ | `backend/prisma/schema.prisma` | Resolved: field stored on create. |
| 6 | ~~**Auth middleware syntax error**~~ | `backend/src/middleware/auth.js` | Resolved: `optionalAuth` fixed; server starts. |
| 7 | ~~**Contract ABIs not used**~~ | `frontend/` & `backend/` `src/contracts/abis/` | Resolved: ABIs exported and wired. |
| 8 | ~~**Frontend contract integration partial**~~ | `BiddingInterface.tsx` | Resolved: all 7 types use contracts. |
| 9 | ~~**Backend artifacts missing**~~ | `backend/src/contracts/artifacts/` | Resolved: 8 artifacts exported (ABI + bytecode); export script path fixed to `artifacts/src/`. |
| 10 | **deployments.json path mismatch** | `backend/src/routes/web3.js` | `GET /api/web3/contracts` reads wrong relative path vs repo-root `contracts/deployments.json`. |

### Medium priority

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 11 | ~~Missing env files~~ | Root packages | Resolved: `backend/.env`, `frontend/.env.local`, `contracts/.env` present (still need real secrets per machine). |
| 12 | ~~Migrations not run~~ | `backend/prisma/migrations/` | Resolved: init migration exists; apply with `prisma migrate`. |
| 13 | **Local deploy / address wiring fragile** | `contracts/deployments.json` | File may exist, but backend path + artifacts must be fixed for a reliable smoke path. |
| 14 | ~~Sealed bid reveal incomplete~~ | Frontend + backend | Resolved: reveal endpoint + UI + contract reveal. |
| 15 | ~~No auction end processing~~ | `auctionEndProcessor.js` | Resolved: cron marks ENDED and runs winner/payout hooks. |
| 16 | **Notifications incomplete** | Backend | In-app + socket only; no email/push. |
| 17 | ~~**REST bids skip Socket.IO emit**~~ | Auctions vs socket | Resolved: shared `bidService` emits `new_bid` + creator notification after REST/socket place. |
| 18 | ~~**Socket `place_bid` weaker than REST**~~ | `socketService` | Resolved: JWT auth, same Joi + contract validation via `bidService`; ignores client `bidderId`. |

### Low priority / enhancements

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 19 | **Test coverage thin** | All dirs | Route/unit tests exist; limited E2E; HoldToCompete now covered in `contracts/test/`. |
| 20 | **No API docs** | Root | No Swagger/OpenAPI. |
| 21 | **No error boundaries** | Frontend | Full app crash on uncaught React errors. |
| 22 | **Incomplete types** | `frontend/src/` | Remaining `any` reduces type safety. |
| 23 | ~~**Missing loading states**~~ | Various frontend | Resolved: AsyncState + toast loading/retry on fetches and tx/API actions. |
| 24 | **Root README / demo drift** | Root `README.md`, `app/` | Docs and root demo describe Wagmi/RainbowKit; product UI is `frontend/`. |
| 25 | **No admin / fiat** | — | Out of current scope. |

---

## Todo List (prioritized)

### Phase 1 – Unblock & fix critical

- [x] **Fix auth middleware** – `optionalAuth` brace; backend starts.
- [x] **Add Bid.transactionHash** – Schema, migration, persist on create.
- [x] **Implement auth endpoints** – `/api/auth/nonce`, `/login`; frontend in `api.ts` / `Web3Context`.
- [x] **Export and wire contract ABIs** – Frontend + backend copies used in calls.
- [x] **Implement contract deployment service** – Deploy on auction start (replace `0x...` placeholder).
- [x] **Implement backend wallet** – Env key; `place*Bid` / reveal in web3 routes.
- [x] **Complete frontend contract integration** – All 7 types in `BiddingInterface.tsx`.
- [x] **Add bid validation** – Contract state checks on POST `/:id/bids`.

### Phase 2 – Environment & data

- [x] **Create env files** – Backend, contracts, frontend local env present.
- [x] **Run Prisma migrations** – Init migration under `backend/prisma/migrations/`.
- [x] **Compile backend artifacts** – `npm run compile:artifacts` in `contracts/` (export path fixed to `artifacts/src/`).
- [ ] **Fix deployments.json path** – Align `web3.js` with repo-root (or copy file).
- [ ] **Deploy contracts locally** – Hardhat node + deploy; verify backend can resolve addresses and start auctions.

### Phase 3 – Missing features

- [x] **Sealed bid reveal** – Backend + frontend + contract.
- [x] **Auction end processing** – Cron / `auctionEndProcessor`.
- [x] **Bid validation against contract** – Shared read/validation services.
- [x] **Align Socket.IO with REST bids** – Emit on REST path; harden socket bid path.

### Phase 4 – Quality & docs

- [x] **Write baseline tests** – Backend routes, frontend components, most contract types.
- [x] **Expand tests** – BiddingInterface, AuctionCreationForm, SealedBidReveal. (E2E still open; HoldToCompete contract tests done)
- [ ] **Add API documentation** – Swagger/OpenAPI.
- [ ] **Add error boundaries** – React error boundaries in frontend.
- [ ] **Tighten TypeScript** – Replace remaining `any`.
- [x] **Add loading states** – Remaining async operations.
- [ ] **Update root README** – Point to `frontend/` + Express as primary app.
- [ ] **Email/push notifications** (optional) – Beyond in-app.

---

*Source: codebase review vs prior APPLICATION_STATUS / TODO docs. Last updated: 2026-09-20.*
