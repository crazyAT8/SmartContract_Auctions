# Testing Auth Middleware

This guide explains how to test the authentication middleware.

## Test Files Created

1. **`src/middleware/__tests__/auth.test.js`** - Unit tests using Jest
2. **`test-auth-manual.js`** - Manual test server for integration testing
3. **`jest.config.js`** - Jest configuration

## Running Unit Tests

### Prerequisites

Make sure you have all dependencies installed:

```bash
cd backend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## Test Scenarios Covered

### authenticateUser Middleware

✅ No authorization header  
✅ Invalid authorization format  
✅ Empty token  
✅ Invalid JWT token  
✅ Expired JWT token  
✅ Valid token with existing user  
✅ Valid token with new user (creates user)  
✅ Unexpected errors  

### optionalAuth Middleware

✅ No authorization header (allows request)  
✅ Invalid authorization format (allows request)  
✅ Empty token (allows request)  
✅ Invalid token (allows request, sets user to null)  
✅ Valid token with existing user  
✅ Valid token with non-existent user (sets user to null)  

## Manual Testing

For manual/integration testing, use the test server:

```bash
cd backend
node test-auth-manual.js
```

This starts a test server on `http://localhost:3002` with two endpoints:

- `GET /test/required` - Uses `authenticateUser` (requires valid token)
- `GET /test/optional` - Uses `optionalAuth` (token optional)

### Testing with curl

```bash
# Test required auth - no token (should fail)
curl http://localhost:3002/test/required

# Test required auth - invalid token (should fail)
curl -H "Authorization: Bearer invalid-token" http://localhost:3002/test/required

# Test optional auth - no token (should succeed with user: null)
curl http://localhost:3002/test/optional

# Test optional auth - invalid token (should succeed with user: null)
curl -H "Authorization: Bearer invalid-token" http://localhost:3002/test/optional
```

### Testing with Postman/Insomnia

1. Start the test server: `node test-auth-manual.js`
2. Create requests to:
   - `GET http://localhost:3002/test/required`
   - `GET http://localhost:3002/test/optional`
3. Test with/without `Authorization: Bearer <token>` header

## Testing with Real Backend

To test the middleware in the actual backend:

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Test endpoints that use the middleware:
   - `POST /api/auctions` - Requires `authenticateUser`
   - `GET /api/users/profile` - Requires `authenticateUser`
   - Any endpoint using `optionalAuth`

3. Use a tool like Postman or curl with proper JWT tokens

## Expected Test Results

When running `npm test`, you should see:

```
PASS  src/middleware/__tests__/auth.test.js
  Auth Middleware
    authenticateUser
      ✓ should return 401 if no authorization header
      ✓ should return 401 if authorization header does not start with Bearer
      ✓ should return 401 if token is empty after Bearer
      ✓ should return 401 if token is invalid
      ✓ should return 401 if token is expired
      ✓ should authenticate user with valid token and existing user
      ✓ should create user if not exists and authenticate
      ✓ should return 500 for unexpected errors
    optionalAuth
      ✓ should set req.user to null and continue if no authorization header
      ✓ should set req.user to null and continue if authorization header does not start with Bearer
      ✓ should set req.user to null and continue if token is empty
      ✓ should set req.user to null and continue if token is invalid
      ✓ should authenticate user with valid token
      ✓ should set req.user to null if user not found in database

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

## Troubleshooting

### Tests fail with "Cannot find module"

Make sure you're in the `backend` directory and dependencies are installed:
```bash
cd backend
npm install
```

### Tests fail with database errors

The unit tests use mocks, so they shouldn't need a real database. If you see database errors, check that the mocks are set up correctly.

### Manual test server fails to start

- Check if port 3002 is already in use
- Make sure all dependencies are installed
- Check that `JWT_SECRET` is set in your `.env` file (for real token testing)

