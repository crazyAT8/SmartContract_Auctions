# Auction DApp

Full-stack Ethereum auction platform with seven auction types, wallet auth, on-chain bidding, and live updates.

## Primary stack (use this)

| Layer | Path | Stack | Role |
|-------|------|--------|------|
| **Frontend** | `frontend/` | Next.js 14, React 18, TypeScript, Tailwind, Framer Motion, ethers v6, Socket.IO, React Query | UI, MetaMask wallet, contract txs |
| **Backend** | `backend/` | Express, Prisma + PostgreSQL, Redis, Socket.IO, JWT, ethers | REST API, deploy-on-start, end processing, validation |
| **Contracts** | `contracts/` | Hardhat, Solidity, OpenZeppelin | 7 auction contracts + ERC20 mock |

> **Legacy:** The root Next.js demo (`app/`, `components/`, `lib/`, root `package.json` with Wagmi/RainbowKit) is **not** the product. Prefer `frontend/` + `backend/` + `contracts/`.

## Features

- Seven auction types: English, Dutch, Sealed Bid, Hold-to-Compete, Order Book, Playable, Random Selection
- Wallet SIWE-style auth (nonce → sign → JWT)
- On-chain bidding for all types; sealed-bid reveal; auction end processing
- Live updates via Socket.IO; in-app notifications
- API docs at `GET /api/docs` (Swagger) when the backend is running

## Quick start (local)

### Option A — Docker

```bash
docker compose up -d --build
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:3001 (`GET /health`, `GET /api/docs`)  
- Postgres `:5432`, Redis `:6379`

Optional Hardhat chain:

```bash
docker compose --profile local-chain up -d --build
docker compose --profile local-chain exec hardhat \
  npx hardhat run scripts/deploy.js --network localhost
```

See [docs/deployment.md](docs/deployment.md) for production Compose and env checks.

### Option B — Manual (three packages)

Prerequisites: Node.js 18+, PostgreSQL, Redis (or `docker compose up -d postgres redis`).

1. **Contracts**

   ```bash
   cd contracts
   npm install
   cp env.example .env
   npm run compile
   npm run compile:artifacts   # required for backend deploy-on-start
   # Optional local chain:
   npx hardhat node
   npx hardhat run scripts/deploy.js --network localhost
   ```

2. **Backend**

   ```bash
   cd backend
   npm install
   cp env.example .env          # set DATABASE_URL, JWT_SECRET, ETHEREUM_RPC_URL, PRIVATE_KEY
   npx prisma migrate dev
   npx prisma generate
   npm run dev                  # http://localhost:3001
   ```

3. **Frontend**

   ```bash
   cd frontend
   npm install
   cp env.example .env.local    # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_ETHEREUM_RPC_URL
   npm run dev                  # http://localhost:3000
   ```

Then connect a wallet → create an auction → place a bid.

## Project structure

```
Auctions/
├── frontend/              # Primary Next.js app (use this)
│   └── src/app/           # Pages, providers, error boundaries
├── backend/               # Express API + Prisma + Socket.IO
│   ├── prisma/
│   └── src/
├── contracts/             # Hardhat contracts, deploy scripts, tests
│   ├── src/
│   ├── scripts/
│   └── deployments.json   # Addresses consumed by the API
├── docs/deployment.md     # Docker, prod env, smoke checks
├── docker-compose.yml
├── docker-compose.prod.yml
├── app/                   # Legacy root Next.js demo — do not use for product work
├── components/            # Legacy
└── lib/                   # Legacy (Wagmi/RainbowKit demo)
```

## Scripts (by package)

| Package | Common commands |
|---------|-----------------|
| `frontend/` | `npm run dev`, `build`, `start`, `test`, `smoke:prod` |
| `backend/` | `npm run dev`, `start`, `test`, `migrate`, `check:prod-env`, `smoke:prod` |
| `contracts/` | `npm run compile`, `compile:artifacts`, `test`, `deploy:local`, `e2e:local` |

Root `npm run dev` / `npm run compile` target the **legacy** demo and root Hardhat config — avoid them for day-to-day work.

## Ops notes

1. Run `npm run compile:artifacts` in `contracts/` so `backend/src/contracts/artifacts/` has bytecode for deploy-on-start.
2. `GET /api/web3/contracts` reads repo-root `contracts/deployments.json`.
3. Production: copy `*/env.production.example`, then `cd backend && NODE_ENV=production npm run check:prod-env`. Details in [docs/deployment.md](docs/deployment.md).

## Testing

```bash
cd backend && npm test
cd frontend && npm test
cd contracts && npm test
# Local chain smoke (Dutch + English create → bid → end):
cd contracts && npm run e2e:local
```

## Further reading

- [TODO.md](TODO.md) — current status and remaining work
- [docs/deployment.md](docs/deployment.md) — Docker and production
- [backend/SETUP_GUIDE.md](backend/SETUP_GUIDE.md) — backend troubleshooting
- [TESTING_GUIDE.md](TESTING_GUIDE.md) / [QUICK_TEST.md](QUICK_TEST.md) — test workflows

## License

MIT — see [LICENSE](LICENSE) if present.
