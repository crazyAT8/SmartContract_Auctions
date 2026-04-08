// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EnglishAuction {
    address payable public seller;
    uint public auctionEndTime;
    uint public highestBid;
    address payable public highestBidder;
    bool public ended;

    mapping(address => uint) public pendingReturns;

    event AuctionStarted(uint duration, uint reservePrice);
    event HighestBidIncreased(address bidder, uint amount);
    event AuctionEnded(address winner, uint amount);
    event BidWithdrawn(address bidder, uint amount);

    modifier onlySeller() {
        require(msg.sender == seller, "Only the seller can call this.");
        _;
    }

    modifier auctionActive() {
        require(block.timestamp < auctionEndTime, "Auction has ended.");
        require(!ended, "Auction has already been finalized.");
        _;
    }

    constructor(uint _biddingTime, uint _reservePrice) {
        seller = payable(msg.sender);
        auctionEndTime = block.timestamp + _biddingTime;
        highestBid = _reservePrice;
        emit AuctionStarted(_biddingTime, _reservePrice);
    }

    function bid() external payable auctionActive {
        require(msg.value > highestBid, "There already is a higher bid.");

        // Refund previous highest bidder
        if (highestBidder != address(0)) {
            pendingReturns[highestBidder] += highestBid;
        }

        highestBid = msg.value;
        highestBidder = payable(msg.sender);

        emit HighestBidIncreased(msg.sender, msg.value);
    }

    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        require(amount > 0, "No funds to withdraw.");

        pendingReturns[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed.");

        emit BidWithdrawn(msg.sender, amount);
    }

    function finalizeAuction() external onlySeller {
        require(block.timestamp >= auctionEndTime, "Auction is still ongoing.");
        require(!ended, "Auction has already been finalized.");
        
        ended = true;
        emit AuctionEnded(highestBidder, highestBid);

        // Transfer the highest bid to the seller
        if (highestBid > 0) {
            (bool success, ) = seller.call{value: highestBid}("");
            require(success, "Transfer to seller failed.");
        }
    }

    function getAuctionDetails() external view returns (
        address, uint, uint, address, bool
    ) {
        return (seller, auctionEndTime, highestBid, highestBidder, ended);
    }
}
