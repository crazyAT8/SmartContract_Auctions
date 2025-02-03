// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SealedBidAuction {
    address public auctioneer;
    uint256 public biddingEnd;
    uint256 public revealEnd;
    bool public auctionEnded;

    struct Bid {
        bytes32 blindedBid;
        uint256 deposit;
    }

    mapping(address => Bid) public bids;
    address public highestBidder;
    uint256 public highestBid;

    event BidSubmitted(address indexed bidder, bytes32 blindedBid);
    event BidRevealed(address indexed bidder, uint256 value, bool valid);
    event AuctionEnded(address winner, uint256 amount);

    constructor(uint256 _biddingTime, uint256 _revealTime) {
        auctioneer = msg.sender;
        biddingEnd = block.timestamp + _biddingTime;
        revealEnd = biddingEnd + _revealTime;
    }

    /// @notice Bidders submit hashed bids with a deposit
    function bid(bytes32 _blindedBid) external payable {
        require(block.timestamp < biddingEnd, "Bidding phase over");
        require(bids[msg.sender].blindedBid == 0, "Bid already submitted");

        bids[msg.sender] = Bid({
            blindedBid: _blindedBid,
            deposit: msg.value
        });

        emit BidSubmitted(msg.sender, _blindedBid);
    }

    /// @notice Reveal phase: Bidders reveal their actual bid and secret
    function reveal(uint256 _value, bytes32 _secret) external {
        require(block.timestamp >= biddingEnd && block.timestamp < revealEnd, "Not in reveal phase");
        
        Bid storage bidInfo = bids[msg.sender];
        require(bidInfo.blindedBid != 0, "No bid found");

        bytes32 computedHash = keccak256(abi.encodePacked(_value, _secret));
        require(computedHash == bidInfo.blindedBid, "Invalid bid reveal");

        require(bidInfo.deposit >= _value, "Deposit insufficient for bid");

        if (_value > highestBid) {
            highestBidder = msg.sender;
            highestBid = _value;
        }

        bidInfo.blindedBid = 0; // Mark as revealed
        emit BidRevealed(msg.sender, _value, true);
    }

    /// @notice Ends the auction and transfers funds to the auctioneer
    function endAuction() external {
        require(block.timestamp >= revealEnd, "Reveal phase not over");
        require(!auctionEnded, "Auction already ended");

        auctionEnded = true;
        emit AuctionEnded(highestBidder, highestBid);

        if (highestBid > 0) {
            payable(auctioneer).transfer(highestBid);
        }
    }

    /// @notice Allows non-winning bidders to withdraw their deposits
    function withdraw() external {
        require(block.timestamp >= revealEnd, "Auction not yet finalized");

        Bid storage bidInfo = bids[msg.sender];
        require(bidInfo.deposit > 0, "Nothing to withdraw");

        uint256 refundAmount = bidInfo.deposit;
        bidInfo.deposit = 0;
        payable(msg.sender).transfer(refundAmount);
    }
}
