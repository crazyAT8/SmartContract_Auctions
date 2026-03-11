/**
 * Auction end processing: finds ACTIVE auctions that have passed their end time,
 * syncs winner/highestBid from contract to DB, sets status ENDED, and optionally
 * calls finalize/end/settle on the contract (payout logic).
 * Intended to be run periodically (e.g. every 60s) via setInterval or cron.
 */

const { ethers } = require('ethers');
const { prisma } = require('../config/database');
const { getProvider, getWallet, loadArtifact, isDeploymentConfigured } = require('./contractDeployment');
const { getAuctionABI } = require('../contracts');
const { TYPE_TO_CONTRACT } = require('./contractDeployment');
const { logger } = require('../utils/logger');

const provider = getProvider();

/**
 * Get end-relevant state from contract (ended flag, winner, highestBidder, highestBid).
 * @param {string} contractAddress
 * @param {string} type - Auction type (DUTCH, ENGLISH, etc.)
 * @returns {Promise<{ ended: boolean, winner?: string, highestBidder?: string, highestBid?: string }>}
 */
async function getContractEndState(contractAddress, type) {
  const abi = getAuctionABI(type);
  if (!abi) return { ended: false };

  const contract = new ethers.Contract(contractAddress, abi, provider);

  switch (type) {
    case 'DUTCH': {
      const [ended, winner] = await Promise.all([contract.ended(), contract.winner()]);
      return {
        ended: Boolean(ended),
        winner: winner && winner !== ethers.ZeroAddress ? winner : undefined,
        highestBidder: winner && winner !== ethers.ZeroAddress ? winner : undefined,
        highestBid: ended ? (await contract.reservePrice()).toString() : undefined
      };
    }
    case 'ENGLISH': {
      const [ended, highestBidder, highestBid] = await Promise.all([
        contract.ended(),
        contract.highestBidder(),
        contract.highestBid()
      ]);
      return {
        ended: Boolean(ended),
        winner: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBidder: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBid: highestBid ? highestBid.toString() : undefined
      };
    }
    case 'SEALED_BID': {
      const [auctionEnded, highestBidder, highestBid] = await Promise.all([
        contract.auctionEnded(),
        contract.highestBidder(),
        contract.highestBid()
      ]);
      return {
        ended: Boolean(auctionEnded),
        winner: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBidder: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBid: highestBid ? highestBid.toString() : undefined
      };
    }
    case 'HOLD_TO_COMPETE': {
      const [auctionEndTime, highestBidder, highestBid] = await Promise.all([
        contract.auctionEndTime(),
        contract.highestBidder(),
        contract.highestBid()
      ]);
      const now = Math.floor(Date.now() / 1000);
      const ended = now >= Number(auctionEndTime.toString());
      return {
        ended,
        winner: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBidder: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBid: highestBid ? highestBid.toString() : undefined
      };
    }
    case 'PLAYABLE': {
      const [auctionEnded, highestBidder, highestBid] = await Promise.all([
        contract.auctionEnded(),
        contract.highestBidder(),
        contract.highestBid()
      ]);
      return {
        ended: Boolean(auctionEnded),
        winner: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBidder: highestBidder && highestBidder !== ethers.ZeroAddress ? highestBidder : undefined,
        highestBid: highestBid ? highestBid.toString() : undefined
      };
    }
    case 'RANDOM_SELECTION': {
      const [auctionEndTime, auctionEnded] = await Promise.all([
        contract.auctionEndTime(),
        contract.auctionEnded()
      ]);
      const now = Math.floor(Date.now() / 1000);
      const ended = Boolean(auctionEnded) || now >= Number(auctionEndTime.toString());
      return { ended };
    }
    case 'ORDER_BOOK': {
      const [auctionEndTime, auctionEnded] = await Promise.all([
        contract.auctionEndTime(),
        contract.auctionEnded()
      ]);
      const now = Math.floor(Date.now() / 1000);
      const ended = Boolean(auctionEnded) || now >= Number(auctionEndTime.toString());
      return { ended };
    }
    default:
      return { ended: false };
  }
}

/**
 * Call contract finalize/end/settle when backend wallet is the seller/owner.
 * No-op if wallet not configured or contract doesn't support it.
 */
async function tryFinalizeOnChain(contractAddress, type) {
  if (!isDeploymentConfigured()) return;
  const contractName = TYPE_TO_CONTRACT[type];
  if (!contractName) return;

  let artifact;
  try {
    artifact = loadArtifact(contractName);
  } catch (e) {
    logger.warn(`auctionEndProcessor: no artifact for ${contractName}, skipping on-chain finalize`);
    return;
  }

  const wallet = getWallet();
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  try {
    if (type === 'ENGLISH' && typeof contract.finalizeAuction === 'function') {
      const tx = await contract.finalizeAuction();
      await tx.wait();
      logger.info(`auctionEndProcessor: finalizeAuction() sent for English ${contractAddress}`);
    } else if (type === 'SEALED_BID' && typeof contract.endAuction === 'function') {
      const tx = await contract.endAuction();
      await tx.wait();
      logger.info(`auctionEndProcessor: endAuction() sent for SealedBid ${contractAddress}`);
    } else if (type === 'HOLD_TO_COMPETE' && typeof contract.finalizeAuction === 'function') {
      const tx = await contract.finalizeAuction();
      await tx.wait();
      logger.info(`auctionEndProcessor: finalizeAuction() sent for HoldToCompete ${contractAddress}`);
    } else if (type === 'PLAYABLE' && typeof contract.finalizeAuction === 'function') {
      const tx = await contract.finalizeAuction();
      await tx.wait();
      logger.info(`auctionEndProcessor: finalizeAuction() sent for Playable ${contractAddress}`);
    } else if (type === 'ORDER_BOOK' && typeof contract.settleTrades === 'function') {
      const tx = await contract.settleTrades();
      await tx.wait();
      logger.info(`auctionEndProcessor: settleTrades() sent for OrderBook ${contractAddress}`);
    }
    // DUTCH: no finalize, seller calls withdrawFunds() separately
    // RANDOM_SELECTION: owner calls withdrawFunds() separately
  } catch (err) {
    logger.warn(`auctionEndProcessor: on-chain finalize failed for ${contractAddress}: ${err.message}`);
  }
}

/**
 * Process a single auction: update DB to ENDED, sync winner/highestBid, create notifications, optionally finalize on chain.
 */
async function processOne(auction) {
  const { id, type, contractAddress, creatorId, title } = auction;

  let endState = { ended: true };
  if (contractAddress) {
    try {
      endState = await getContractEndState(contractAddress, type);
    } catch (e) {
      logger.warn(`auctionEndProcessor: getContractEndState failed for ${id}: ${e.message}`);
    }
  }

  const updateData = {
    status: 'ENDED',
    ...(endState.winner != null && { winner: endState.winner }),
    ...(endState.highestBidder != null && { highestBidder: endState.highestBidder }),
    ...(endState.highestBid != null && { highestBid: endState.highestBid })
  };

  await prisma.auction.update({
    where: { id },
    data: updateData
  });

  // Notify creator
  await prisma.notification.create({
    data: {
      userId: creatorId,
      title: 'Auction ended',
      message: `Auction "${title}" has ended.${endState.winner ? ` Winner: ${endState.winner}` : ''}`,
      type: 'AUCTION_ENDED'
    }
  });

  // Notify winner (if we can resolve address to user)
  if (endState.winner) {
    const winnerUser = await prisma.user.findFirst({
      where: { address: { equals: endState.winner, mode: 'insensitive' } }
    });
    if (winnerUser) {
      await prisma.notification.create({
        data: {
          userId: winnerUser.id,
          title: 'You won',
          message: `You won the auction "${title}".`,
          type: 'AUCTION_ENDED'
        }
      });
    }
  }

  // Optionally run on-chain finalize (payout to seller, etc.)
  if (contractAddress) {
    await tryFinalizeOnChain(contractAddress, type);
  }

  logger.info(`auctionEndProcessor: marked auction ${id} as ENDED`);
}

/**
 * Find ACTIVE auctions that should be ended (endTime in the past, or contract reports ended).
 */
async function getAuctionsToEnd() {
  const now = new Date();

  const byTime = await prisma.auction.findMany({
    where: {
      status: 'ACTIVE',
      endTime: { lte: now }
    }
  });

  // Also catch ACTIVE auctions with no endTime but with contract that reports ended (e.g. Dutch sold early)
  const withContract = await prisma.auction.findMany({
    where: {
      status: 'ACTIVE',
      contractAddress: { not: null },
      OR: [{ endTime: null }, { endTime: { gt: now } }]
    }
  });

  const toEnd = [...byTime];
  const seen = new Set(byTime.map((a) => a.id));
  for (const a of withContract) {
    if (seen.has(a.id)) continue;
    try {
      const state = await getContractEndState(a.contractAddress, a.type);
      if (state.ended) {
        toEnd.push(a);
        seen.add(a.id);
      }
    } catch (_) {
      // skip on error
    }
  }

  return toEnd;
}

/**
 * Run one pass: find all auctions to end, process each (with per-auction try/catch).
 */
async function run() {
  try {
    const toEnd = await getAuctionsToEnd();
    if (toEnd.length === 0) return;
    logger.info(`auctionEndProcessor: processing ${toEnd.length} auction(s)`);
    for (const auction of toEnd) {
      try {
        await processOne(auction);
      } catch (err) {
        logger.error(`auctionEndProcessor: failed for auction ${auction.id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`auctionEndProcessor: run failed: ${err.message}`);
  }
}

module.exports = {
  getAuctionsToEnd,
  processOne,
  run,
  getContractEndState
};
