/**
 * Export full contract artifacts (ABI + bytecode) from Hardhat to backend
 * so the backend can deploy contracts at runtime.
 * Run after: npm run compile (from contracts/)
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(CONTRACTS_DIR, 'artifacts', 'contracts');
const BACKEND_ARTIFACTS = path.join(CONTRACTS_DIR, '..', 'backend', 'src', 'contracts', 'artifacts');

const CONTRACT_NAMES = [
  'DutchAuction',
  'EnglishAuction',
  'SealedBidAuction',
  'HoldToCompeteAuction',
  'PlayableAuction',
  'RandomSelectionAuction',
  'OrderBookAuction',
  'ERC20Mock',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function exportArtifacts() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.error('Artifacts not found. Run "npm run compile" in contracts/ first.');
    process.exit(1);
  }

  ensureDir(BACKEND_ARTIFACTS);

  let exported = 0;
  for (const name of CONTRACT_NAMES) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(artifactPath)) {
      console.warn(`Skip ${name}: artifact not found at ${artifactPath}`);
      continue;
    }
    const full = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = full.abi;
    const bytecode = full.bytecode || full.data?.bytecode?.object;
    if (!abi || !bytecode) {
      console.warn(`Skip ${name}: missing abi or bytecode`);
      continue;
    }
    const out = { abi, bytecode };
    const outPath = path.join(BACKEND_ARTIFACTS, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(out));
    console.log(`Exported ${name}.json (abi + bytecode) to backend`);
    exported++;
  }

  console.log(`Done. Exported ${exported} artifacts to backend/src/contracts/artifacts/`);
}

exportArtifacts();
