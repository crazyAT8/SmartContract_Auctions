/**
 * Contract ABIs and helpers.
 * ABIs are exported from Hardhat artifacts via contracts/scripts/export-abis.js
 * (run from contracts/: npm run compile:abis). Minimal ABIs are committed for Dutch/English.
 */

import DutchAuctionABI from './abis/DutchAuction.json'
import EnglishAuctionABI from './abis/EnglishAuction.json'

export type AuctionType =
  | 'DUTCH'
  | 'ENGLISH'
  | 'SEALED_BID'
  | 'HOLD_TO_COMPETE'
  | 'PLAYABLE'
  | 'RANDOM_SELECTION'
  | 'ORDER_BOOK'

const auctionABIs: Partial<Record<AuctionType, unknown[]>> = {
  DUTCH: DutchAuctionABI as unknown[],
  ENGLISH: EnglishAuctionABI as unknown[],
}

/**
 * Returns the contract ABI for the given auction type, or undefined if not wired.
 */
export function getAuctionABI(type: AuctionType): unknown[] | undefined {
  return auctionABIs[type]
}

export { DutchAuctionABI, EnglishAuctionABI }
