#!/usr/bin/env node
/**
 * Serve the production Next build briefly and GET /.
 * Requires a prior `npm run build` (creates .next/).
 *
 * Usage (from frontend/):
 *   npm run smoke:prod
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = String(process.env.SMOKE_PORT || '3000');
const HOST = '127.0.0.1';
const HOME_URL = `http://${HOST}:${PORT}/`;
const BOOT_MS = Number(process.env.SMOKE_BOOT_MS || 60000);
const nextDir = path.join(__dirname, '..', '.next');

if (!fs.existsSync(nextDir)) {
  console.error('Missing .next/ — run `npm run build` first.');
  process.exit(1);
}

function fetchHome() {
  return new Promise((resolve, reject) => {
    const req = http.get(HOME_URL, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`home status ${res.statusCode}`));
          return;
        }
        resolve({ status: res.statusCode, length: body.length });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('home request timeout'));
    });
  });
}

async function waitForHome(deadlineMs) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < deadlineMs) {
    try {
      return await fetchHome();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr || new Error('frontend never became ready');
}

async function main() {
  console.log(`Starting next start on ${HOST}:${PORT}...`);

  const nextBin = path.join(
    __dirname,
    '..',
    'node_modules',
    'next',
    'dist',
    'bin',
    'next'
  );

  const child = spawn(process.execPath, [nextBin, 'start', '-H', HOST, '-p', PORT], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production', PORT },
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
    const result = await waitForHome(BOOT_MS);
    console.log(`\nHome OK: status=${result.status} bytes=${result.length}`);
    console.log('Prod-mode frontend smoke passed.');
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 1000));
    if (child.exitCode === null && !child.killed) {
      child.kill('SIGKILL');
    }
    process.exit(0);
  } catch (err) {
    console.error('\nProd-mode frontend smoke FAILED:', err.message);
    if (exitCode !== null) {
      console.error(`next start exited early with code ${exitCode}`);
    }
    console.error('--- server output (tail) ---');
    console.error(output.slice(-4000));
    child.kill('SIGKILL');
    process.exit(1);
  }
}

main();
