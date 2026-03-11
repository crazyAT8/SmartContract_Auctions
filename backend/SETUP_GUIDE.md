# Backend Setup Guide

This guide will help you fix common issues when starting the backend server.

## Quick Diagnostic

Run the diagnostic script to check your setup:

```bash

cd backend
node check-setup.js
```

This will tell you exactly what's missing or misconfigured.

## Common Issues and Fixes

### Issue 1: Missing .env File

**Error:** `Cannot find module` or environment variable errors

**Fix:**
```bash

cd backend
cp env.example .env
```

Then edit `.env` with your configuration.

### Issue 2: Database Connection Failed

**Error:** `Database connection failed` or `Can't reach database server`

**Fixes:**

#### Option A: Using Docker (Recommended)

```bash
# From project root
docker-compose up -d postgres
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL
2. Create database: `createdb auction_dapp`
3. Update `.env`:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/auction_dapp?schema=public"
   ```

#### Then run migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### Issue 3: Redis Connection Failed

**Error:** `Redis connection failed` or `ECONNREFUSED`

**Fixes:**

#### Option A: Using Docker (Recommended)

```bash
# From project root
docker-compose up -d redis
```

#### Option B: Local Redis

1. Install Redis
2. Start Redis: `redis-server`
3. Update `.env` if needed:
   ```
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

### Issue 4: Missing JWT_SECRET

**Error:** `JWT_SECRET is required` or authentication errors

**Fix:**
Edit `.env` and set:
```
JWT_SECRET=your_super_secret_key_here_make_it_long_and_random
```

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue 5: Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'` or Prisma errors

**Fix:**
```bash
cd backend
npx prisma generate
```

## Complete Setup Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Create Environment File

```bash
cp env.example .env
```

### Step 3: Configure .env

Edit `.env` and set at minimum:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Random secret key for JWT tokens
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)

### Step 4: Start Services

#### Using Docker Compose (Easiest)

```bash
# From project root
docker-compose up -d postgres redis
```

Wait a few seconds for services to start.

#### Or Start Services Manually

- PostgreSQL: Start your PostgreSQL service
- Redis: `redis-server` or start Redis service

### Step 5: Setup Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### Step 6: Start Backend

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Verification

### Check Server is Running

```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "uptime": ...
}
```

### Check Logs

Logs are written to:
- `backend/logs/combined.log` - All logs
- `backend/logs/error.log` - Error logs only

## Troubleshooting

### Port Already in Use

If port 3001 is already in use:
1. Change `PORT` in `.env`
2. Or stop the process using port 3001

### Database Migration Errors

```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create fresh migration
npx prisma migrate dev --name init
```

### Still Having Issues?

1. Run diagnostic: `node check-setup.js`
2. Check logs: `cat logs/error.log`
3. Verify services are running:
   - PostgreSQL: `docker-compose ps` or `pg_isready`
   - Redis: `docker-compose ps` or `redis-cli ping`

## Minimal .env Example

For quick testing, here's a minimal `.env`:

```env
# Database (adjust for your setup)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auction_dapp?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3001
NODE_ENV=development

# JWT (generate a secure one!)
JWT_SECRET=change_this_to_a_random_secret_key
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Next Steps

Once the server starts successfully:
1. ✅ Test the health endpoint: `curl http://localhost:3001/health`
2. ✅ Test authentication: See `TESTING_AUTH.md`
3. ✅ Connect frontend to backend
4. ✅ Deploy contracts and update contract addresses

