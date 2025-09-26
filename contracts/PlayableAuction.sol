// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlayableAuction is ReentrancyGuard, Ownable {
    struct Bid {
        address bidder;
        uint256 amount;
    }

    address public highestBidder;
    uint256 public highestBid;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public startingPrice;
    uint256 public reservePrice;
    uint256 public priceDropInterval;
    uint256 public priceDropAmount;
    bool public auctionEnded;
    
    mapping(address => uint256) public bids;
    address[] public bidders;

    event NewBid(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 winningBid);

    constructor(
        uint256 _startingPrice,
        uint256 _reservePrice,
        uint256 _duration,
        uint256 _priceDropInterval,
        uint256 _priceDropAmount
    ) {
        require(_startingPrice > _reservePrice, "Starting price must be higher than reserve price");

        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        startTime = block.timestamp;
        endTime = block.timestamp + _duration;
        priceDropInterval = _priceDropInterval;
        priceDropAmount = _priceDropAmount;
    }

    modifier onlyDuringAuction() {
        require(block.timestamp < endTime, "Auction has ended");
        _;
    }

    modifier onlyAfterAuction() {
        require(block.timestamp >= endTime, "Auction is still ongoing");
        _;
    }

    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp >= endTime) {
            return reservePrice;
        }
        uint256 elapsed = block.timestamp - startTime;
        uint256 priceDrop = (elapsed / priceDropInterval) * priceDropAmount;
        uint256 currentPrice = startingPrice > priceDrop ? startingPrice - priceDrop : reservePrice;
        return currentPrice;
    }

    function placeBid() external payable onlyDuringAuction nonReentrant {
        uint256 currentPrice = getCurrentPrice();
        require(msg.value >= currentPrice, "Bid amount too low");

        // If new highest bid, update records
        if (msg.value > highestBid) {
            highestBid = msg.value;
            highestBidder = msg.sender;
        }

        // Store bid
        if (bids[msg.sender] == 0) {
            bidders.push(msg.sender);
        }
        bids[msg.sender] += msg.value;

        emit NewBid(msg.sender, msg.value);
    }

    function finalizeAuction() external onlyAfterAuction nonReentrant {
        require(!auctionEnded, "Auction already finalized");
        auctionEnded = true;

        if (highestBidder != address(0)) {
            // Declare winner and send funds to owner
            payable(owner()).transfer(highestBid);
            emit AuctionEnded(highestBidder, highestBid);
        }

        // Refunds for non-winning bidders
        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            if (bidder != highestBidder) {
                uint256 refundAmount = bids[bidder] * 80 / 100; // 80% refund
                if (refundAmount > 0) {
                    payable(bidder).transfer(refundAmount);
                }
            }
        }
    }
}
