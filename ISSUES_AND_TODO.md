# Issues List & Todo List

## Issues List

### Critical (blocking / high impact)

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 1 | **Missing authentication endpoint** | `backend/src/routes/` | No `/api/auth/login`; frontend uses placeholder token. Users can't authenticate. |
| 2 | **Contract deployment placeholder** | `backend/src/routes/auctions.js:190` | Auction start uses `'0x...'`; auctions never deploy to chain. |
| 3 | **Backend wallet not implemented** | `backend/src/routes/web3.js:318-351` | All `place*Bid` throw "Wallet integration not implemented". |
| 4 | **Bid validation not implemented** | `backend/src/routes/auctions.js:226` | Bids not validated against contract state. |
| 5 | **Bid model missing `transactionHash`** | `backend/prisma/schema.prisma` | Frontend sends it but it's not stored. |
| 6 | **Auth middleware syntax error** | `backend/src/middleware/auth.js:54` | Missing `{` in `optionalAuth`; backend won't start. |
| 7 | ~~**Contract ABIs not used**~~ | `frontend/src/contracts/`, `backend/src/contracts/` | Resolved: ABIs exported and wired in contract calls. |
| 8 | **Frontend contract integration partial** | `frontend/.../BiddingInterface.tsx:120-158` | Only Dutch & English use contracts; others API-only. |

### Medium priority

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 9 | Missing env files | Root, `backend/`, `contracts/`, `frontend/` | Only `.env.example`; app needs manual setup. |
| 10 | Migrations not run | `backend/prisma/` | No migration files; schema not applied. |
| 11 | No deployments.json | `contracts/deployments.json` | Backend can't resolve contract addresses. |
| 12 | Sealed bid reveal incomplete | Frontend + backend | Sealed bid auctions can't complete reveal. |
| 13 | No auction end processing | Backend | No cron/listener; auctions don't auto-transition to ENDED. |
| 14 | Notifications incomplete | Backend | No email/push; in-app only. |

### Low priority / enhancements

| # | Issue | Location | Impact |
|---|--------|----------|--------|
| 15 | Missing tests | All dirs | Test files exist but no real test implementations. |
| 16 | No API docs | Root | No Swagger/OpenAPI. |
| 17 | No error boundaries | Frontend | Full app crash on errors. |
| 18 | Incomplete types | `frontend/src/` | Some `any`; reduced type safety. |
| 19 | Missing loading states | Various frontend | Some async ops have no loading UI. |
| 20 | Markdown linter warnings | `QUICK_TEST.md` | Doc quality only. |

---

## Todo List (prioritized)

### Phase 1 – Unblock & fix critical

- [x] **Fix auth middleware** – Add missing `{` in `backend/src/middleware/auth.js:54` so backend starts.
- [x] **Add Bid.transactionHash** – Update `backend/prisma/schema.prisma`, run migration, persist in bid creation.
- [x] **Implement auth endpoints** – Add `/api/auth/nonce` and `/api/auth/login` (wallet sign → JWT); wire frontend in `frontend/src/utils/api.ts`.
- [x] **Export and wire contract ABIs** – Export from Hardhat artifacts to `contracts/abis/`, copy to frontend and backend, use in contract calls.
- [ ] **Implement contract deployment service** – Backend service to deploy auction contracts on “start auction”; replace `'0x...'` in `backend/src/routes/auctions.js:190`.
- [ ] **Implement backend wallet** – Wallet from env in `backend`; implement all `place*Bid` in `backend/src/routes/web3.js`.
- [ ] **Complete frontend contract integration** – In `BiddingInterface.tsx`, add contract interaction for all 7 auction types (not just Dutch/English).
- [ ] **Add bid validation** – Validate bids against contract state in `backend/src/routes/auctions.js:226`.

### Phase 2 – Environment & data

- [ ] **Create env files** – From examples: `backend/.env`, `contracts/.env`, `frontend/.env.local` with real values.
- [ ] **Run Prisma migrations** – `cd backend && npx prisma migrate dev` (and ensure DB exists).
- [ ] **Deploy contracts locally** – Start Hardhat node, run deploy script, ensure `contracts/deployments.json` exists and backend reads it.

### Phase 3 – Missing features

- [ ] **Sealed bid reveal** – Backend endpoint + frontend UI and contract calls for reveal phase.
- [ ] **Auction end processing** – Cron or listener in backend to set ENDED and run winner/payout logic.
- [ ] **Bid validation against contract** – Reuse/expand contract read logic used in Phase 1.

### Phase 4 – Quality & docs

- [ ] **Write tests** – Backend routes, frontend components, contract tests in `contracts/test/`.
- [ ] **Add API documentation** – Swagger/OpenAPI for backend.
- [ ] **Add error boundaries** – React error boundaries in frontend.
- [ ] **Tighten TypeScript** – Replace `any` in `frontend/src/` with proper types.
- [ ] **Add loading states** – For remaining async operations in frontend.

---

*Source: APPLICATION_STATUS.md and codebase. Last updated: 2025-02-07.*
