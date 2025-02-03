// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DutchAuction {
    address payable public seller;
    uint256 public startPrice;
    uint256 public reservePrice;
    uint256 public startTime;
    uint256 public duration;
    uint256 public priceDropInterval;
    uint256 public priceDropAmount;
    bool public ended;
    address public winner;

    event AuctionStarted(uint256 startPrice, uint256 reservePrice, uint256 duration);
    event AuctionEnded(address winner, uint256 finalPrice);
    event FundsWithdrawn(address seller, uint256 amount);

    constructor(
        uint256 _startPrice,
        uint256 _reservePrice,
        uint256 _duration,
        uint256 _priceDropInterval
    ) {
        require(_startPrice > _reservePrice, "Start price must be greater than reserve price");
        require(_duration > 0, "Duration must be greater than zero");

        seller = payable(msg.sender);
        startPrice = _startPrice;
        reservePrice = _reservePrice;
        duration = _duration;
        priceDropInterval = _priceDropInterval;
        priceDropAmount = (startPrice - reservePrice) / (_duration / _priceDropInterval);
        startTime = block.timestamp;
        
        emit AuctionStarted(startPrice, reservePrice, duration);
    }

    function getCurrentPrice() public view returns (uint256) {
        if (block.timestamp < startTime) {
            return startPrice;
        }

        uint256 timeElapsed = block.timestamp - startTime;
        uint256 priceDrops = timeElapsed / priceDropInterval;
        uint256 priceReduction = priceDrops * priceDropAmount;

        if (priceReduction >= (startPrice - reservePrice)) {
            return reservePrice;
        }

        return startPrice - priceReduction;
    }

    function buy() external payable {
        require(!ended, "Auction has ended");
        require(block.timestamp <= startTime + duration, "Auction time expired");

        uint256 currentPrice = getCurrentPrice();
        require(msg.value >= currentPrice, "Insufficient funds to buy");

        ended = true;
        winner = msg.sender;

        uint256 refund = msg.value - currentPrice;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit AuctionEnded(winner, currentPrice);
    }

    function withdrawFunds() external {
        require(ended, "Auction not ended yet");
        require(msg.sender == seller, "Only seller can withdraw");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        seller.transfer(balance);
        emit FundsWithdrawn(seller, balance);
    }
}
