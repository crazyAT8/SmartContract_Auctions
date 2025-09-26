const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction Contracts", function () {
  let dutchAuction, englishAuction, sealedBidAuction;
  let owner, bidder1, bidder2, bidder3;

  beforeEach(async function () {
    [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

    // Deploy Dutch Auction
    const DutchAuction = await ethers.getContractFactory("DutchAuction");
    dutchAuction = await DutchAuction.deploy(
      ethers.parseEther("10"), // start price
      ethers.parseEther("1"),  // reserve price
      3600,                    // duration
      60                       // price drop interval
    );

    // Deploy English Auction
    const EnglishAuction = await ethers.getContractFactory("EnglishAuction");
    englishAuction = await EnglishAuction.deploy(
      3600,                    // bidding time
      ethers.parseEther("1")   // reserve price
    );

    // Deploy Sealed Bid Auction
    const SealedBidAuction = await ethers.getContractFactory("SealedBidAuction");
    sealedBidAuction = await SealedBidAuction.deploy(
      3600,  // bidding time
      1800   // reveal time
    );
  });

  describe("Dutch Auction", function () {
    it("Should start with correct initial price", async function () {
      const currentPrice = await dutchAuction.getCurrentPrice();
      expect(currentPrice).to.equal(ethers.parseEther("10"));
    });

    it("Should allow buying at current price", async function () {
      await expect(
        dutchAuction.connect(bidder1).buy({ value: ethers.parseEther("10") })
      ).to.emit(dutchAuction, "AuctionEnded");
    });

    it("Should reject insufficient payment", async function () {
      await expect(
        dutchAuction.connect(bidder1).buy({ value: ethers.parseEther("5") })
      ).to.be.revertedWith("Insufficient funds to buy");
    });
  });

  describe("English Auction", function () {
    it("Should allow placing bids", async function () {
      await expect(
        englishAuction.connect(bidder1).bid({ value: ethers.parseEther("2") })
      ).to.emit(englishAuction, "HighestBidIncreased");
    });

    it("Should reject bids lower than current highest", async function () {
      await englishAuction.connect(bidder1).bid({ value: ethers.parseEther("2") });
      await expect(
        englishAuction.connect(bidder2).bid({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("There already is a higher bid");
    });

    it("Should allow finalizing auction", async function () {
      await englishAuction.connect(bidder1).bid({ value: ethers.parseEther("2") });
      
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        englishAuction.finalizeAuction()
      ).to.emit(englishAuction, "AuctionEnded");
    });
  });

  describe("Sealed Bid Auction", function () {
    it("Should allow submitting blinded bids", async function () {
      const secret = ethers.randomBytes(32);
      const value = ethers.parseEther("2");
      const blindedBid = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [value, secret]));

      await expect(
        sealedBidAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("2") })
      ).to.emit(sealedBidAuction, "BidSubmitted");
    });

    it("Should allow revealing bids", async function () {
      const secret = ethers.randomBytes(32);
      const value = ethers.parseEther("2");
      const blindedBid = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes32"], [value, secret]));

      await sealedBidAuction.connect(bidder1).bid(blindedBid, { value: ethers.parseEther("2") });

      // Fast forward to reveal phase
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        sealedBidAuction.connect(bidder1).reveal(value, secret)
      ).to.emit(sealedBidAuction, "BidRevealed");
    });
  });
});
