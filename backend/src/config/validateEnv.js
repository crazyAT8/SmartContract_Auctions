/**
 * Production environment validation.
 * Refuses to start when NODE_ENV=production if secrets, RPC, DB, or
 * contract addresses look like local/dev defaults (Hardhat keys, localhost, placeholders).
 */

const fs = require('fs');
const path = require('path');

/**
 * Hardhat default accounts 0–9 private keys (without 0x).
 * Source: Hardhat default mnemonic.
 */
const HARDHAT_DEFAULT_PRIVATE_KEYS = new Set([
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
]);

const PLACEHOLDER_SECRETS = new Set([
  '',
  'your_jwt_secret_here',
  'change_this_to_a_random_secret_key',
  'your_super_secret_key_here_make_it_long_and_random',
  'test-secret',
  'test-secret-key',
]);

const PLACEHOLDER_PRIVATE_KEYS = new Set([
  '',
  'your_private_key_here',
  '0xyour_private_key_here',
]);

/**
 * Normalize a private key for comparison (no 0x, lowercase).
 * @param {string} key
 * @returns {string}
 */
function normalizePrivateKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/^0x/, '');
}

/**
 * Resolve path to deployments.json (CONTRACT_ADDRESSES_JSON or repo default).
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
function resolveDeploymentsPath(env = process.env) {
  if (env.CONTRACT_ADDRESSES_JSON) {
    const configured = path.isAbsolute(env.CONTRACT_ADDRESSES_JSON)
      ? env.CONTRACT_ADDRESSES_JSON
      : path.resolve(process.cwd(), env.CONTRACT_ADDRESSES_JSON);
    if (fs.existsSync(configured)) {
      return configured;
    }
  }

  const candidates = [
    // From backend/src/config → repo-root contracts/
    path.resolve(__dirname, '../../../contracts/deployments.json'),
    // From backend/ cwd with ../contracts
    path.resolve(process.cwd(), '../contracts/deployments.json'),
    // From repo root cwd
    path.resolve(process.cwd(), 'contracts/deployments.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  // Prefer configured path for error messages even if missing
  if (env.CONTRACT_ADDRESSES_JSON) {
    return path.isAbsolute(env.CONTRACT_ADDRESSES_JSON)
      ? env.CONTRACT_ADDRESSES_JSON
      : path.resolve(process.cwd(), env.CONTRACT_ADDRESSES_JSON);
  }
  return candidates[0];
}

/**
 * True if URL looks like a local/dev chain endpoint.
 * @param {string} url
 * @returns {boolean}
 */
function isLocalRpcUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  return (
    u.includes('localhost') ||
    u.includes('127.0.0.1') ||
    u.includes('0.0.0.0') ||
    u.includes('hardhat') ||
    /:8545(\/|$)/.test(u)
  );
}

/**
 * True if URL is localhost / loopback (for FRONTEND_URL / CORS).
 * @param {string} url
 * @returns {boolean}
 */
function isLocalAppUrl(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.trim().toLowerCase();
  return u.includes('localhost') || u.includes('127.0.0.1') || u.includes('0.0.0.0');
}

/**
 * True when intentionally smoking the production process against local infra.
 * Never set in a real deploy. Skips "must not be localhost/Hardhat" checks only.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
function isLocalProdSmoke(env = process.env) {
  const v = String(env.ALLOW_LOCAL_PROD_SMOKE || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Collect production env problems. Does not throw.
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ deploymentsPath?: string, readFileSync?: typeof fs.readFileSync }} [opts]
 * @returns {string[]}
 */
function collectProductionEnvErrors(env = process.env, opts = {}) {
  const errors = [];
  const readFile = opts.readFileSync || fs.readFileSync;
  const localSmoke = isLocalProdSmoke(env);

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_HOST',
    'ETHEREUM_RPC_URL',
    'PRIVATE_KEY',
    'FRONTEND_URL',
  ];
  for (const key of required) {
    if (!env[key] || !String(env[key]).trim()) {
      errors.push(`Missing required ${key}`);
    }
  }

  const jwt = String(env.JWT_SECRET || '').trim();
  if (jwt && (PLACEHOLDER_SECRETS.has(jwt) || jwt.length < 32)) {
    if (!localSmoke) {
      errors.push(
        'JWT_SECRET must be a unique secret at least 32 characters (not a placeholder or test value)'
      );
    } else if (jwt.length < 8) {
      errors.push('JWT_SECRET is required for local prod smoke (min 8 characters)');
    }
  }

  const pk = String(env.PRIVATE_KEY || '').trim();
  const pkNorm = normalizePrivateKey(pk);
  if (pk && (PLACEHOLDER_PRIVATE_KEYS.has(pk) || PLACEHOLDER_PRIVATE_KEYS.has(pkNorm))) {
    errors.push('PRIVATE_KEY is a placeholder; set a dedicated production deployer key');
  } else if (!localSmoke && pkNorm && HARDHAT_DEFAULT_PRIVATE_KEYS.has(pkNorm)) {
    errors.push(
      'PRIVATE_KEY is a well-known Hardhat/Anvil default key — never use these in production'
    );
  }

  if (!localSmoke && env.ETHEREUM_RPC_URL && isLocalRpcUrl(env.ETHEREUM_RPC_URL)) {
    errors.push(
      `ETHEREUM_RPC_URL must be a public/testnet/mainnet RPC, not local/Hardhat (${env.ETHEREUM_RPC_URL})`
    );
  }

  if (!localSmoke && env.FRONTEND_URL && isLocalAppUrl(env.FRONTEND_URL)) {
    errors.push(
      `FRONTEND_URL must be the public app origin in production (got ${env.FRONTEND_URL})`
    );
  }

  const dbUrl = String(env.DATABASE_URL || '');
  if (!localSmoke) {
    if (
      dbUrl.includes('postgres:postgres@') ||
      (/localhost|127\.0\.0\.1/.test(dbUrl) && /:postgres@/.test(dbUrl))
    ) {
      errors.push(
        'DATABASE_URL looks like a local default (postgres/postgres or localhost) — use a production database'
      );
    } else if (/localhost|127\.0\.0\.1/.test(dbUrl)) {
      errors.push('DATABASE_URL points at localhost — use a production database host');
    }
  }

  const redisHost = String(env.REDIS_HOST || '').toLowerCase();
  if (!localSmoke && (redisHost === 'localhost' || redisHost === '127.0.0.1')) {
    errors.push('REDIS_HOST points at localhost — use a production Redis host');
  }

  const deploymentsPath = opts.deploymentsPath || resolveDeploymentsPath(env);
  try {
    const raw = readFile(deploymentsPath, 'utf8');
    const deployments = JSON.parse(raw);
    const networkName = String(deployments?.network?.name || '').toLowerCase();
    const chainId = String(deployments?.network?.chainId || '');
    if (
      !localSmoke &&
      (networkName === 'localhost' ||
        networkName === 'hardhat' ||
        chainId === '1337' ||
        chainId === '31337')
    ) {
      errors.push(
        `Contract deployments at ${deploymentsPath} are for local Hardhat (network=${networkName || '?'}, chainId=${chainId || '?'}); deploy to the target network and update the file`
      );
    }
    if (!deployments?.contracts || Object.keys(deployments.contracts).length === 0) {
      errors.push(`No contract addresses in ${deploymentsPath}`);
    }
  } catch (err) {
    errors.push(
      `Could not load production contract addresses from ${deploymentsPath}: ${err.message}`
    );
  }

  return errors;
}

/**
 * Validate env for the current NODE_ENV. In production, throws if invalid.
 * In development/test, no-op (returns []).
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ deploymentsPath?: string, readFileSync?: typeof fs.readFileSync }} [opts]
 * @returns {string[]}
 */
function validateEnv(env = process.env, opts = {}) {
  const nodeEnv = env.NODE_ENV || 'development';
  if (nodeEnv !== 'production') {
    return [];
  }
  const errors = collectProductionEnvErrors(env, opts);
  if (errors.length > 0) {
    const message = [
      'Production environment validation failed:',
      ...errors.map((e) => `  - ${e}`),
      'See backend/env.production.example and docs/deployment.md',
    ].join('\n');
    throw new Error(message);
  }
  return errors;
}

module.exports = {
  validateEnv,
  collectProductionEnvErrors,
  resolveDeploymentsPath,
  normalizePrivateKey,
  isLocalRpcUrl,
  isLocalAppUrl,
  isLocalProdSmoke,
  HARDHAT_DEFAULT_PRIVATE_KEYS,
};
