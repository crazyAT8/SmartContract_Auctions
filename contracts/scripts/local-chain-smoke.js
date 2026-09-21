/**
 * Integration / E2E: Create → start (deploy) → bid → end
 * for English + Dutch (scaffold ready for other types).
 *
 * Prerequisites:
 *   - Hardhat node on :8545
 *   - Postgres + Redis
 *   - Backend on :3001 with PRIVATE_KEY + ETHEREUM_RPC_URL
 *   - artifacts exported (`npm run compile:artifacts`)
 *   - optional: `npm run deploy:local` so GET /web3/contracts has code
 *
 * Run from contracts/:  npm run e2e:local
 *   or:                npm run smoke:local
 */
const path = require('path');
const { ethers } = require('ethers');

const API = process.env.API_URL || 'http://127.0.0.1:3001/api';
const RPC = process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545';
/** Hardhat account #0 (deployer / seller) */
const PK0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
/** Hardhat account #1 (bidder) */
const PK1 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

async function req(method, pathSuffix, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${pathSuffix}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${pathSuffix} -> ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function login(wallet) {
  const address = await wallet.getAddress();
  const nonceRes = await req('GET', `/auth/nonce?address=${address}`);
  const signature = await wallet.signMessage(nonceRes.message);
  const loginRes = await req('POST', '/auth/login', {
    body: { address, signature, nonce: nonceRes.nonce },
  });
  return loginRes.token;
}

async function hasCode(provider, addr) {
  const code = await provider.getCode(addr);
  return Boolean(code && code !== '0x');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runEndProcessor() {
  const backendRoot = path.resolve(__dirname, '..', '..', 'backend');
  require('dotenv').config({ path: path.join(backendRoot, '.env') });
  const endProcessorPath = path.join(backendRoot, 'src', 'services', 'auctionEndProcessor.js');
  const deploymentPath = path.join(backendRoot, 'src', 'services', 'contractDeployment.js');
  delete require.cache[endProcessorPath];
  delete require.cache[deploymentPath];
  const { run: runEnd } = require(endProcessorPath);
  await runEnd();
}

async function assertEnded(auctionId, { expectWinner } = {}) {
  const ended = await req('GET', `/auctions/${auctionId}`);
  if (ended.status !== 'ENDED') {
    throw new Error(`Expected ENDED, got ${ended.status}`);
  }
  if (expectWinner) {
    const winner = (ended.winner || '').toLowerCase();
    if (winner !== expectWinner.toLowerCase()) {
      throw new Error(`Expected winner ${expectWinner}, got ${ended.winner}`);
    }
  }
  return ended;
}

async function confirmDeploymentsResolve(provider) {
  console.log('=== Shared: deployments.json addresses resolve ===');
  const contracts = await req('GET', '/web3/contracts');
  const entries = Object.entries(contracts);
  if (!entries.length) {
    console.warn('  GET /web3/contracts empty (ok if deploy:local not run; per-auction deploy still tested)');
    return;
  }
  for (const [name, addr] of entries) {
    const ok = await hasCode(provider, addr);
    console.log(`  ${name}: ${addr} => ${ok ? 'HAS CODE' : 'NO CODE'}`);
    if (!ok) throw new Error(`No code at ${name}`);
  }
}

/**
 * English: create → start → REST bid + on-chain bid → wait endTime → end processor → ENDED
 */
async function flowEnglish({ provider, sellerToken, bidderToken, bidderAddress }) {
  console.log('\n========== ENGLISH: create → start → bid → end ==========');

  const auction = await req('POST', '/auctions', {
    token: sellerToken,
    body: {
      title: 'E2E English',
      description: 'Integration create/start/bid/end',
      type: 'ENGLISH',
      biddingTime: 20,
      reservePrice: '1000000000000000000',
    },
  });
  console.log('  created:', auction.id, auction.status);

  const started = await req('POST', `/auctions/${auction.id}/start`, { token: sellerToken });
  console.log('  started:', started.contractAddress, started.status);
  if (!(await hasCode(provider, started.contractAddress))) {
    throw new Error('English: started auction has no bytecode');
  }
  await sleep(1500);

  // REST /bids validates against *current* contract highest, so record before raising it.
  const dbBid = await req('POST', `/auctions/${auction.id}/bids`, {
    token: bidderToken,
    body: { amount: '2000000000000000000' },
  });
  console.log('  db bid:', dbBid.id);

  const engAbi = ['function bid() payable', 'function highestBid() view returns (uint256)'];
  const bidderWallet = new ethers.Wallet(PK1, provider);
  const eng = new ethers.Contract(started.contractAddress, engAbi, bidderWallet);
  const tx = await eng.bid({ value: ethers.parseEther('2') });
  const receipt = await tx.wait();
  console.log('  on-chain bid tx:', receipt.hash);

  try {
    const bidTx = await req('POST', `/web3/auction/${started.contractAddress}/bid`, {
      token: sellerToken,
      body: { type: 'ENGLISH', amount: '2.5' },
    });
    console.log('  /web3 follow-up bid:', bidTx.transactionHash);
  } catch (e) {
    console.warn('  /web3 follow-up bid skipped:', e.message);
  }

  const state = await req('GET', `/web3/auction/${started.contractAddress}/state?type=ENGLISH`);
  console.log('  contract state:', JSON.stringify(state));

  const endMs = new Date(started.endTime).getTime();
  const waitMs = Math.max(0, endMs - Date.now()) + 1500;
  console.log(`  waiting ${Math.ceil(waitMs / 1000)}s for endTime...`);
  await sleep(waitMs);
  await provider.send('evm_increaseTime', [60]);
  await provider.send('evm_mine', []);

  await runEndProcessor();
  const ended = await assertEnded(auction.id);
  console.log('  final status:', ended.status, 'winner:', ended.winner);

  const onChain = new ethers.Contract(
    started.contractAddress,
    [
      'function ended() view returns (bool)',
      'function highestBidder() view returns (address)',
      'function highestBid() view returns (uint256)',
    ],
    provider
  );
  const onChainEnded = await onChain.ended();
  const onChainBidder = await onChain.highestBidder();
  console.log('  on-chain ended:', onChainEnded);
  console.log('  on-chain highestBidder:', onChainBidder);
  if (!onChainEnded) throw new Error('English: contract not finalized');
  if (!ended.winner || ended.winner.toLowerCase() !== onChainBidder.toLowerCase()) {
    throw new Error(`English: DB winner ${ended.winner} != on-chain ${onChainBidder}`);
  }
  console.log('ENGLISH OK');
}

/**
 * Dutch: create → start → REST bid + on-chain buy → end processor (contract-ended) → ENDED
 * Buy settles immediately on-chain; end processor picks up contract.ended without waiting endTime.
 */
async function flowDutch({ provider, sellerToken, bidderToken, bidderAddress }) {
  console.log('\n========== DUTCH: create → start → bid → end ==========');

  // start 2 ETH, reserve 1 ETH; duration >= priceDropInterval (Solidity division)
  const startPriceWei = '2000000000000000000';
  const auction = await req('POST', '/auctions', {
    token: sellerToken,
    body: {
      title: 'E2E Dutch',
      description: 'Integration create/start/bid/end',
      type: 'DUTCH',
      startPrice: startPriceWei,
      reservePrice: '1000000000000000000',
      duration: 60,
      priceDropInterval: 10,
    },
  });
  console.log('  created:', auction.id, auction.status);

  const started = await req('POST', `/auctions/${auction.id}/start`, { token: sellerToken });
  console.log('  started:', started.contractAddress, started.status);
  if (!(await hasCode(provider, started.contractAddress))) {
    throw new Error('Dutch: started auction has no bytecode');
  }
  await sleep(1500);

  const priceState = await req('GET', `/web3/auction/${started.contractAddress}/state?type=DUTCH`);
  console.log('  current price state:', JSON.stringify(priceState));

  const dbBid = await req('POST', `/auctions/${auction.id}/bids`, {
    token: bidderToken,
    body: { amount: startPriceWei },
  });
  console.log('  db bid:', dbBid.id);

  const dutchAbi = [
    'function buy() payable',
    'function ended() view returns (bool)',
    'function winner() view returns (address)',
    'function getCurrentPrice() view returns (uint256)',
  ];
  const bidderWallet = new ethers.Wallet(PK1, provider);
  const dutch = new ethers.Contract(started.contractAddress, dutchAbi, bidderWallet);
  const currentPrice = await dutch.getCurrentPrice();
  const tx = await dutch.buy({ value: currentPrice });
  const receipt = await tx.wait();
  console.log('  on-chain buy tx:', receipt.hash);
  console.log('  on-chain ended:', await dutch.ended(), 'winner:', await dutch.winner());

  // Contract already ended via buy(); processor should mark DB ENDED without waiting wall-clock endTime
  await sleep(500);
  await runEndProcessor();
  const ended = await assertEnded(auction.id, { expectWinner: bidderAddress });
  console.log('  final status:', ended.status, 'winner:', ended.winner);
  console.log('DUTCH OK');
}

/**
 * Placeholder for remaining types — keep listed so the suite is easy to extend.
 * Each should follow: create → start → type-specific bid/reveal → end.
 */
const FUTURE_FLOWS = [
  'SEALED_BID',
  'HOLD_TO_COMPETE',
  'PLAYABLE',
  'RANDOM_SELECTION',
  'ORDER_BOOK',
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const seller = new ethers.Wallet(PK0, provider);
  const bidder = new ethers.Wallet(PK1, provider);
  const bidderAddress = await bidder.getAddress();

  console.log('=== Integration / E2E (English + Dutch) ===');
  console.log('  API:', API);
  console.log('  RPC:', RPC);

  await confirmDeploymentsResolve(provider);

  console.log('\n=== Auth ===');
  const sellerToken = await login(seller);
  const bidderToken = await login(bidder);
  console.log('  seller:', await seller.getAddress());
  console.log('  bidder:', bidderAddress);

  const ctx = { provider, sellerToken, bidderToken, bidderAddress };
  await flowEnglish(ctx);
  await flowDutch(ctx);

  console.log('\n=== Deferred types (not yet in this suite) ===');
  for (const t of FUTURE_FLOWS) {
    console.log(`  [ ] ${t}`);
  }

  console.log('\nE2E OK (English + Dutch)');
}

main().catch((e) => {
  console.error('E2E FAILED:', e.message);
  process.exit(1);
});
