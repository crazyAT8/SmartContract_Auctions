// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract HoldToCompeteAuction is ReentrancyGuard {
    IERC20 public biddingToken;  // ERC20 token used for bidding
    address public seller;
    uint256 public auctionEndTime;
    uint256 public minHoldAmount;  // Amount to lock before bidding

    address public highestBidder;
    uint256 public highestBid;
    mapping(address => uint256) public bids;
    mapping(address => bool) public hasLocked;

    event AuctionStarted(uint256 endTime);
    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);
    event FundsWithdrawn(address bidder, uint256 amount);

    modifier onlyBeforeEnd() {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        _;
    }

    modifier onlyAfterEnd() {
        require(block.timestamp >= auctionEndTime, "Auction is still ongoing");
        _;
    }

    constructor(address _tokenAddress, uint256 _duration, uint256 _minHoldAmount) {
        biddingToken = IERC20(_tokenAddress);
        seller = msg.sender;
        auctionEndTime = block.timestamp + _duration;
        minHoldAmount = _minHoldAmount;

        emit AuctionStarted(auctionEndTime);
    }

    function lockTokens() external onlyBeforeEnd {
        require(!hasLocked[msg.sender], "Tokens already locked");
        require(
            biddingToken.transferFrom(msg.sender, address(this), minHoldAmount),
            "Token lock failed"
        );

        hasLocked[msg.sender] = true;
    }

    function placeBid(uint256 bidAmount) external onlyBeforeEnd nonReentrant {
        require(hasLocked[msg.sender], "Must lock tokens before bidding");
        require(bidAmount > highestBid, "Bid must be higher than current highest bid");
        
        // Refund previous highest bidder
        if (highestBidder != address(0)) {
            bids[highestBidder] += highestBid;
        }

        highestBidder = msg.sender;
        highestBid = bidAmount;

        // Transfer bid amount
        require(
            biddingToken.transferFrom(msg.sender, address(this), bidAmount),
            "Bid transfer failed"
        );

        emit BidPlaced(msg.sender, bidAmount);
    }

    function finalizeAuction() external onlyAfterEnd nonReentrant {
        require(msg.sender == seller, "Only seller can finalize");

        if (highestBidder != address(0)) {
            // Transfer winning bid to seller
            require(
                biddingToken.transfer(seller, highestBid),
                "Transfer to seller failed"
            );
        }

        emit AuctionEnded(highestBidder, highestBid);
    }

    function withdrawLockedTokens() external nonReentrant {
        require(hasLocked[msg.sender], "No tokens to withdraw");
        require(msg.sender != highestBidder, "Winner cannot withdraw locked tokens");

        hasLocked[msg.sender] = false;
        require(
            biddingToken.transfer(msg.sender, minHoldAmount),
            "Locked token withdrawal failed"
        );

        emit FundsWithdrawn(msg.sender, minHoldAmount);
    }

    function withdrawBids() external nonReentrant {
        uint256 amount = bids[msg.sender];
        require(amount > 0, "No funds to withdraw");

        bids[msg.sender] = 0;
        require(
            biddingToken.transfer(msg.sender, amount),
            "Bid withdrawal failed"
        );

        emit FundsWithdrawn(msg.sender, amount);
    }
}
