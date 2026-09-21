#!/usr/bin/env node
/**
 * Local prod-mode smoke: validate env with ALLOW_LOCAL_PROD_SMOKE, then boot
 * the production entrypoint long enough to hit /health.
 *
 * Usage (from backend/):
 *   npm run smoke:prod
 *
 * Expects Postgres + Redis reachable via backend/.env (same as local dev).
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PORT = String(process.env.SMOKE_PORT || '3011');
const HOST = '127.0.0.1';
const HEALTH_URL = `http://${HOST}:${PORT}/health`;
const BOOT_MS = Number(process.env.SMOKE_BOOT_MS || 45000);

const childEnv = {
  ...process.env,
  NODE_ENV: 'production',
  ALLOW_LOCAL_PROD_SMOKE: '1',
  PORT,
};

function fetchHealth() {
  return new Promise((resolve, reject) => {
    const req = http.get(HEALTH_URL, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`health status ${res.statusCode}: ${body}`));
          return;
        }
        resolve(body);
      });
    });
    req.on('error', reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error('health request timeout'));
    });
  });
}

async function waitForHealth(deadlineMs) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < deadlineMs) {
    try {
      return await fetchHealth();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr || new Error('health never became ready');
}

async function main() {
  console.log(`Starting prod smoke on ${HOST}:${PORT} (ALLOW_LOCAL_PROD_SMOKE=1)...`);

  const child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  const onData = (buf) => {
    const s = buf.toString();
    output += s;
    process.stdout.write(s);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);

  let exitCode = null;
  child.on('exit', (code) => {
    exitCode = code;
  });

  try {
    const body = await waitForHealth(BOOT_MS);
    console.log('\nHealth OK:', body);
    console.log('Prod-mode backend smoke passed.');
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGKILL');
    }
    process.exit(0);
  } catch (err) {
    console.error('\nProd-mode backend smoke FAILED:', err.message);
    if (exitCode !== null) {
      console.error(`Server exited early with code ${exitCode}`);
    }
    console.error('--- server output (tail) ---');
    console.error(output.slice(-4000));
    child.kill('SIGKILL');
    process.exit(1);
  }
}

main();
