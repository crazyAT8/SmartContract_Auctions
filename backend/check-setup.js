/**
 * Diagnostic script to check backend setup
 * Run with: node check-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Backend Setup...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let issues = [];
let warnings = [];

// Check 1: .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  issues.push('❌ Missing .env file - Copy env.example to .env and configure it');
} else {
  console.log('✅ .env file exists');
  
  // Check required env variables
  require('dotenv').config();
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_HOST',
    'REDIS_PORT'
  ];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      issues.push(`❌ Missing ${varName} in .env file`);
    } else {
      console.log(`✅ ${varName} is set`);
    }
  });
} 

// Check 2: Database connection
async function checkDatabase() {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    console.log('✅ Database connection successful');
  } catch (error) {
    issues.push(`❌ Database connection failed: ${error.message}`);
    warnings.push('💡 Make sure PostgreSQL is running and DATABASE_URL is correct');
  }
}

// Check 3: Redis connection
async function checkRedis() {
  let redis;
  try {
    const Redis = require('ioredis');
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null, // Disable automatic reconnection
      enableOfflineQueue: false, // Don't queue commands when offline
    });
    
    // Handle errors to prevent unhandled error events
    redis.on('error', () => {
      // Silently handle errors - we'll catch them in the try/catch
    });
    
    // Add timeout to prevent hanging
    const connectPromise = redis.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 3000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    await redis.disconnect();
    console.log('✅ Redis connection successful');
  } catch (error) {
    issues.push(`❌ Redis connection failed: ${error.message}`);
    warnings.push('💡 Make sure Redis is running (docker-compose up -d redis)');
  } finally {
    // Always clean up the Redis client
    if (redis) {
      try {
        redis.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Check 4: Prisma client generated
const prismaClientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
if (!fs.existsSync(prismaClientPath)) {
  warnings.push('⚠️  Prisma client not generated - Run: npx prisma generate');
} else {
  console.log('✅ Prisma client is generated');
}

// Check 5: Dependencies installed
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  issues.push('❌ node_modules not found - Run: npm install');
} else {
  console.log('✅ Dependencies installed');
}

// Run async checks
async function runChecks() {
  console.log('\n📊 Checking Services...\n');
  
  if (fs.existsSync(envPath)) {
    await checkDatabase();
    await checkRedis();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (issues.length > 0) {
    console.log('❌ ISSUES FOUND:\n');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\n');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    warnings.forEach(warning => console.log(`   ${warning}`));
    console.log('\n');
  }
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! Your backend should be ready to start.\n');
    console.log('   Run: npm start\n');
  } else if (issues.length === 0) {
    console.log('✅ No critical issues found. You can try starting the server.\n');
    console.log('   Run: npm start\n');
  } else {
    console.log('🔧 FIX REQUIRED:\n');
    console.log('   1. Create .env file: cp env.example .env');
    console.log('   2. Edit .env with your configuration');
    console.log('   3. Start services: docker-compose up -d postgres redis');
    console.log('   4. Generate Prisma client: npx prisma generate');
    console.log('   5. Run migrations: npx prisma migrate dev');
    console.log('   6. Try again: npm start\n');
  }
}

runChecks().catch(console.error);

