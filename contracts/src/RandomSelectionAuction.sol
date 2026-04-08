// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RandomSelectionAuction {
    address public owner;
    uint256 public auctionEndTime;
    bool public auctionEnded;

    struct Bid {
        address bidder;
        uint256 amount;
    }

    Bid[] public bids;
    mapping(address => uint256) public bidAmounts;
    uint256 public totalBidAmount;

    event BidPlaced(address indexed bidder, uint256 amount);
    event WinnerSelected(address indexed winner, uint256 winningAmount);
    event AuctionEnded();

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier auctionActive() {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        _;
    }

    modifier auctionEndedOnly() {
        require(block.timestamp >= auctionEndTime, "Auction still active");
        require(!auctionEnded, "Auction already ended");
        _;
    }

    constructor(uint256 _duration) {
        owner = msg.sender;
        auctionEndTime = block.timestamp + _duration;
    }

    function placeBid() external payable auctionActive {
        require(msg.value > 0, "Bid must be greater than 0");

        if (bidAmounts[msg.sender] == 0) {
            bids.push(Bid(msg.sender, msg.value));
        } else {
            for (uint256 i = 0; i < bids.length; i++) {
                if (bids[i].bidder == msg.sender) {
                    bids[i].amount += msg.value;
                    break;
                }
            }
        }

        bidAmounts[msg.sender] += msg.value;
        totalBidAmount += msg.value;

        emit BidPlaced(msg.sender, msg.value);
    }

    function selectWinner() public onlyOwner auctionEndedOnly {
        require(bids.length > 0, "No bids placed");

        uint256 randomValue = uint256(
            keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))
        ) % totalBidAmount;

        address winner;
        uint256 cumulativeSum = 0;

        for (uint256 i = 0; i < bids.length; i++) {
            cumulativeSum += bids[i].amount;
            if (randomValue < cumulativeSum) {
                winner = bids[i].bidder;
                break;
            }
        }

        auctionEnded = true;
        emit WinnerSelected(winner, bidAmounts[winner]);
        emit AuctionEnded();
    }

    function withdrawFunds() external onlyOwner {
        require(auctionEnded, "Auction not yet ended");
        payable(owner).transfer(address(this).balance);
    }
}
