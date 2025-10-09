@echo off
REM Auction dApp Setup Script for Windows
REM This script sets up the development environment

echo 🚀 Setting up Auction dApp development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js detected

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

echo ✅ Docker detected

REM Install root dependencies
echo 📦 Installing root dependencies...
call npm install

REM Install contracts dependencies
echo 📦 Installing contracts dependencies...
cd contracts
call npm install
cd ..

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Create environment files
echo 📝 Creating environment files...

REM Backend .env
if not exist "backend\.env" (
    copy "backend\env.example" "backend\.env"
    echo ✅ Created backend\.env
) else (
    echo ⚠️  backend\.env already exists
)

REM Frontend .env.local
if not exist "frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 > frontend\.env.local
    echo NEXT_PUBLIC_WS_URL=http://localhost:3001 >> frontend\.env.local
    echo NEXT_PUBLIC_ETHEREUM_RPC_URL=http://localhost:8545 >> frontend\.env.local
    echo ✅ Created frontend\.env.local
) else (
    echo ⚠️  frontend\.env.local already exists
)

REM Contracts .env
if not exist "contracts\.env" (
    copy "contracts\env.example" "contracts\.env"
    echo ✅ Created contracts\.env
) else (
    echo ⚠️  contracts\.env already exists
)

REM Create logs directory
if not exist "backend\logs" mkdir backend\logs
echo ✅ Created logs directory

REM Start Docker services
echo 🐳 Starting Docker services...
docker-compose up -d postgres redis

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Run database migrations
echo 🗄️  Running database migrations...
cd backend
call npx prisma generate
call npx prisma migrate dev --name init
cd ..

echo ✅ Database migrations completed

REM Compile contracts
echo 📜 Compiling smart contracts...
cd contracts
call npx hardhat compile
cd ..

echo ✅ Smart contracts compiled

echo.
echo 🎉 Setup completed successfully!
echo.
echo Next steps:
echo 1. Start the development servers:
echo    npm run dev
echo.
echo 2. Or start individual services:
echo    npm run dev:backend    # Backend API on http://localhost:3001
echo    npm run dev:frontend   # Frontend on http://localhost:3000
echo    npm run dev:contracts  # Hardhat node on http://localhost:8545
echo.
echo 3. Deploy contracts to local network:
echo    cd contracts ^&^& npm run deploy:local
echo.
echo 4. Open http://localhost:3000 in your browser
echo.
echo Happy coding! 🚀
pause
