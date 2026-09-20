/**
 * Local chain smoke: auth → create → start (deploy) → bid → end;
 * also confirms contracts/deployments.json addresses resolve via GET /api/web3/contracts.
 *
 * Prerequisites: hardhat node, redis, postgres, backend on :3001, deploy:local done.
 * Run: node scripts/local-chain-smoke.js  (from contracts/ or repo root)
 */
const path = require('path');
const { ethers } = require('ethers');

const API = process.env.API_URL || 'http://127.0.0.1:3001/api';
const RPC = process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545';
const PK0 = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
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

async function placeEnglishBidDirect(provider, contractAddress, bidderPk, amountEth) {
  const abi = ['function bid() payable', 'function highestBid() view returns (uint256)'];
  const wallet = new ethers.Wallet(bidderPk, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  const tx = await contract.bid({ value: ethers.parseEther(amountEth) });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const seller = new ethers.Wallet(PK0, provider);
  const bidder = new ethers.Wallet(PK1, provider);

  console.log('=== 1) Confirm deployments.json addresses resolve ===');
  const contracts = await req('GET', '/web3/contracts');
  const entries = Object.entries(contracts);
  if (!entries.length) throw new Error('GET /web3/contracts returned empty');
  for (const [name, addr] of entries) {
    const ok = await hasCode(provider, addr);
    console.log(`  ${name}: ${addr} => ${ok ? 'HAS CODE' : 'NO CODE'}`);
    if (!ok) throw new Error(`No code at ${name}`);
  }

  console.log('=== 2) Auth ===');
  const sellerToken = await login(seller);
  const bidderToken = await login(bidder);
  console.log('  seller:', await seller.getAddress());
  console.log('  bidder:', await bidder.getAddress());

  console.log('=== 3) Create ENGLISH auction (20s) ===');
  const auction = await req('POST', '/auctions', {
    token: sellerToken,
    body: {
      title: 'Local smoke English',
      description: 'Hardhat smoke test',
      type: 'ENGLISH',
      biddingTime: 20,
      reservePrice: '1000000000000000000',
    },
  });
  console.log('  id:', auction.id, 'status:', auction.status);

  console.log('=== 4) Start (deploy-on-start) ===');
  const started = await req('POST', `/auctions/${auction.id}/start`, { token: sellerToken });
  console.log('  contractAddress:', started.contractAddress);
  console.log('  status:', started.status, 'endTime:', started.endTime);
  if (!(await hasCode(provider, started.contractAddress))) {
    throw new Error('Started auction has no bytecode');
  }

  // Brief pause so deploy nonce is fully settled on the node
  await new Promise((r) => setTimeout(r, 1500));

  console.log('=== 5) Persist bid intent + place on-chain bids ===');
  // REST /bids validates against *current* contract highest, so record before raising it.
  const dbBid = await req('POST', `/auctions/${auction.id}/bids`, {
    token: bidderToken,
    body: { amount: '2000000000000000000' },
  });
  console.log('  db bid (pre-tx):', dbBid.id);

  const txHash = await placeEnglishBidDirect(provider, started.contractAddress, PK1, '2');
  console.log('  on-chain tx (bidder 2 ETH):', txHash);

  let web3Tx = null;
  try {
    const bidTx = await req('POST', `/web3/auction/${started.contractAddress}/bid`, {
      token: sellerToken,
      body: { type: 'ENGLISH', amount: '2.5' },
    });
    web3Tx = bidTx.transactionHash;
    console.log('  via /web3 (backend wallet 2.5 ETH):', web3Tx);
  } catch (e) {
    console.warn('  /web3 follow-up bid skipped:', e.message);
  }

  const state = await req(
    'GET',
    `/web3/auction/${started.contractAddress}/state?type=ENGLISH`
  );
  console.log('  contract state:', JSON.stringify(state));

  console.log('=== 6) Wait for DB endTime + end processor ===');
  // Processor selects by wall-clock endTime (not Hardhat evm time).
  const endMs = new Date(started.endTime).getTime();
  const waitMs = Math.max(0, endMs - Date.now()) + 1500;
  console.log(`  waiting ${Math.ceil(waitMs / 1000)}s for endTime...`);
  await new Promise((r) => setTimeout(r, waitMs));
  // Also advance chain so finalizeAuction() passes auctionEndTime check
  await provider.send('evm_increaseTime', [60]);
  await provider.send('evm_mine', []);

  const backendRoot = path.resolve(__dirname, '..', '..', 'backend');
  require('dotenv').config({ path: path.join(backendRoot, '.env') });
  const endProcessorPath = path.join(backendRoot, 'src', 'services', 'auctionEndProcessor.js');
  const deploymentPath = path.join(backendRoot, 'src', 'services', 'contractDeployment.js');
  delete require.cache[endProcessorPath];
  delete require.cache[deploymentPath];
  const { run: runEnd } = require(endProcessorPath);
  await runEnd();

  const ended = await req('GET', `/auctions/${auction.id}`);
  console.log('  final status:', ended.status);
  console.log('  winner:', ended.winner);
  console.log('  highestBid:', ended.highestBid);
  if (ended.status !== 'ENDED') throw new Error(`Expected ENDED, got ${ended.status}`);

  const eng = new ethers.Contract(
    started.contractAddress,
    [
      'function ended() view returns (bool)',
      'function highestBidder() view returns (address)',
      'function highestBid() view returns (uint256)',
    ],
    provider
  );
  console.log('  on-chain ended:', await eng.ended());
  console.log('  on-chain highestBidder:', await eng.highestBidder());
  console.log('  on-chain highestBid:', (await eng.highestBid()).toString());

  console.log('\nSMOKE OK');
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e.message);
  process.exit(1);
});
