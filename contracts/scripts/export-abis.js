/**
 * Export contract ABIs from Hardhat artifacts to JSON files.
 * Writes to contracts/abis/ and copies to frontend and backend.
 * Run after: npm run compile (from contracts/)
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_DIR = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(CONTRACTS_DIR, 'artifacts', 'contracts');
const OUT_ABIS = path.join(CONTRACTS_DIR, 'abis');
const FRONTEND_ABIS = path.join(CONTRACTS_DIR, '..', 'frontend', 'src', 'contracts', 'abis');
const BACKEND_ABIS = path.join(CONTRACTS_DIR, '..', 'backend', 'src', 'contracts', 'abis');

// Contract names we care about (must match artifact paths: ContractName.sol/ContractName.json)
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

function findArtifactPath(name) {
  const candidates = [
    path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json'),
    path.join(ARTIFACTS_DIR, 'contracts', `${name}.sol`, `${name}.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function exportAbis() {
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.error('Artifacts not found. Run "npm run compile" in contracts/ first.');
    process.exit(1);
  }

  ensureDir(OUT_ABIS);
  ensureDir(FRONTEND_ABIS);
  ensureDir(BACKEND_ABIS);

  let exported = 0;
  for (const name of CONTRACT_NAMES) {
    const artifactPath = findArtifactPath(name);
    if (!artifactPath) {
      console.warn(`Skip ${name}: artifact not found (searched artifacts/contracts)`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    if (!abi || !Array.isArray(abi)) {
      console.warn(`Skip ${name}: no ABI in artifact`);
      continue;
    }
    const outPath = path.join(OUT_ABIS, `${name}.json`);
    const frontPath = path.join(FRONTEND_ABIS, `${name}.json`);
    const backPath = path.join(BACKEND_ABIS, `${name}.json`);
    const content = JSON.stringify(abi, null, 2);
    fs.writeFileSync(outPath, content);
    fs.writeFileSync(frontPath, content);
    fs.writeFileSync(backPath, content);
    console.log(`Exported ${name}.json`);
    exported++;
  }

  console.log(`Done. Exported ${exported} ABIs to contracts/abis, frontend and backend.`);
}

exportAbis();
