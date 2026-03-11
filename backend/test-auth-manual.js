/**
 * Manual Test Script for Auth Middleware
 * 
 * This script tests the auth middleware by:
 * 1. Creating a test Express app with the middleware
 * 2. Making requests with different scenarios
 * 3. Verifying the middleware behavior
 * 
 * Run with: node test-auth-manual.js
 */

const express = require('express');
const { authenticateUser, optionalAuth } = require('./src/middleware/auth');

const app = express();
app.use(express.json());

// Test route with authenticateUser
app.get('/test/required', authenticateUser, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user ? {
      id: req.user.id,
      address: req.user.address,
      username: req.user.username
    } : null
  });
});

// Test route with optionalAuth
app.get('/test/optional', optionalAuth, (req, res) => {
  res.json({ 
    success: true, 
    user: req.user ? {
      id: req.user.id,
      address: req.user.address,
      username: req.user.username
    } : null
  });
});

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`\n🧪 Auth Middleware Test Server running on http://localhost:${PORT}\n`);
  console.log('Test Scenarios:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1. Test REQUIRED auth (authenticateUser) - No token:');
  console.log('   curl http://localhost:3002/test/required');
  console.log('\n2. Test REQUIRED auth - Invalid token:');
  console.log('   curl -H "Authorization: Bearer invalid-token" http://localhost:3002/test/required');
  console.log('\n3. Test REQUIRED auth - Valid token (requires JWT_SECRET and database):');
  console.log('   curl -H "Authorization: Bearer YOUR_VALID_TOKEN" http://localhost:3002/test/required');
  console.log('\n4. Test OPTIONAL auth (optionalAuth) - No token:');
  console.log('   curl http://localhost:3002/test/optional');
  console.log('\n5. Test OPTIONAL auth - Invalid token (should still work):');
  console.log('   curl -H "Authorization: Bearer invalid-token" http://localhost:3002/test/optional');
  console.log('\n6. Test OPTIONAL auth - Valid token:');
  console.log('   curl -H "Authorization: Bearer YOUR_VALID_TOKEN" http://localhost:3002/test/optional');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Tip: Use Postman, Insomnia, or your browser to test these endpoints');
  console.log('💡 Make sure your .env file has JWT_SECRET set and database is running\n');
});

