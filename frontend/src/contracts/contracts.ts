/**
 * Contract ABIs and helpers.
 * ABIs are exported from Hardhat artifacts via contracts/scripts/export-abis.js
 * (run from contracts/: npm run compile:abis). All 7 auction types are wired.
 */

import DutchAuctionABI from './abis/DutchAuction.json'
import EnglishAuctionABI from './abis/EnglishAuction.json'
import HoldToCompeteAuctionABI from './abis/HoldToCompeteAuction.json'
import OrderBookAuctionABI from './abis/OrderBookAuction.json'
import PlayableAuctionABI from './abis/PlayableAuction.json'
import RandomSelectionAuctionABI from './abis/RandomSelectionAuction.json'
import SealedBidAuctionABI from './abis/SealedBidAuction.json'

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
  SEALED_BID: SealedBidAuctionABI as unknown[],
  HOLD_TO_COMPETE: HoldToCompeteAuctionABI as unknown[],
  PLAYABLE: PlayableAuctionABI as unknown[],
  RANDOM_SELECTION: RandomSelectionAuctionABI as unknown[],
  ORDER_BOOK: OrderBookAuctionABI as unknown[],
}

/**
 * Returns the contract ABI for the given auction type, or undefined if not wired.
 */
export function getAuctionABI(type: AuctionType): unknown[] | undefined {
  return auctionABIs[type]
}

export {
  DutchAuctionABI,
  EnglishAuctionABI,
  HoldToCompeteAuctionABI,
  OrderBookAuctionABI,
  PlayableAuctionABI,
  RandomSelectionAuctionABI,
  SealedBidAuctionABI,
}
