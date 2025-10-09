import { ethers } from 'ethers'

// Contract ABIs for each auction type
export const AUCTION_ABIS = {
  english: [
    "function bid() external payable",
    "function withdraw() external",
    "function finalizeAuction() external",
    "function getAuctionDetails() external view returns (address, uint, uint, address, bool)",
    "event HighestBidIncreased(address bidder, uint amount)",
    "event AuctionEnded(address winner, uint amount)"
  ],
  dutch: [
    "function getCurrentPrice() public view returns (uint256)",
    "function buy() external payable",
    "function withdrawFunds() external",
    "event AuctionEnded(address winner, uint256 finalPrice)"
  ],
  'sealed-bid': [
    "function bid(bytes32 _blindedBid) external payable",
    "function reveal(uint256 _value, bytes32 _secret) external",
    "function endAuction() external",
    "function withdraw() external",
    "event BidSubmitted(address indexed bidder, bytes32 blindedBid)",
    "event AuctionEnded(address winner, uint256 amount)"
  ],
  'hold-to-compete': [
    "function lockTokens() external",
    "function placeBid(uint256 bidAmount) external",
    "function finalizeAuction() external",
    "function withdrawLockedTokens() external",
    "function withdrawBids() external",
    "event BidPlaced(address indexed bidder, uint256 amount)",
    "event AuctionEnded(address winner, uint256 amount)"
  ],
  'order-book': [
    "function placeBuyOrder(uint256 price, uint256 amount) external payable",
    "function placeSellOrder(uint256 price, uint256 amount) external",
    "function settleTrades() external",
    "function depositTokens(uint256 amount) external",
    "event OrderPlaced(address indexed user, uint256 price, uint256 amount, uint8 orderType)",
    "event AuctionEnded(uint256 clearingPrice)"
  ],
  playable: [
    "function getCurrentPrice() public view returns (uint256)",
    "function placeBid() external payable",
    "function finalizeAuction() external",
    "event NewBid(address indexed bidder, uint256 amount)",
    "event AuctionEnded(address winner, uint256 winningBid)"
  ],
  'random-selection': [
    "function placeBid() external payable",
    "function selectWinner() external",
    "function withdrawFunds() external",
    "event BidPlaced(address indexed bidder, uint256 amount)",
    "event WinnerSelected(address indexed winner, uint256 winningAmount)"
  ]
}

export const createContract = (address: string, abi: string[], provider: ethers.Provider) => {
  return new ethers.Contract(address, abi, provider)
}
