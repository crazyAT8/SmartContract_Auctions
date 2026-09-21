#!/usr/bin/env node
/**
 * Validate production environment without starting the server.
 * Usage: NODE_ENV=production node scripts/check-prod-env.js
 *    or: npm run check:prod-env
 */

require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || require('path').join(__dirname, '..', '.env.production'),
});

// Allow loading backend/.env if .env.production is absent
if (!process.env.DATABASE_URL) {
  require('dotenv').config();
}

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const {
  collectProductionEnvErrors,
  validateEnv,
} = require('../src/config/validateEnv');

const errors = collectProductionEnvErrors(process.env);

if (errors.length === 0) {
  validateEnv(process.env);
  console.log('Production environment looks valid.');
  process.exit(0);
}

console.error('Production environment validation failed:\n');
errors.forEach((e) => console.error(`  - ${e}`));
console.error('\nSee backend/env.production.example and docs/deployment.md');
process.exit(1);
