const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction Contracts", function () {
  let dutchAuction, englishAuction, sealedBidAuction, randomSelectionAuction, playableAuction, orderBookAuction;
  let holdToCompeteAuction, biddingToken;
  let owner, bidder1, bidder2, bidder3;

  const MIN_HOLD = ethers.parseEther("100");
  const TOKEN_SUPPLY = ethers.parseEther("1000000");

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

    // Deploy Random Selection Auction
    const RandomSelectionAuction = await ethers.getContractFactory("RandomSelectionAuction");
    randomSelectionAuction = await RandomSelectionAuction.deploy(3600);

    // Deploy Playable Auction (startingPrice, reservePrice, duration, priceDropInterval, priceDropAmount)
    const PlayableAuction = await ethers.getContractFactory("PlayableAuction");
    playableAuction = await PlayableAuction.deploy(
      ethers.parseEther("5"),  // starting price
      ethers.parseEther("1"),  // reserve price
      3600,                    // duration
      60,                      // price drop interval
      ethers.parseEther("0.1") // price drop amount
    );

    // Deploy Order Book Auction
    const OrderBookAuction = await ethers.getContractFactory("OrderBookAuction");
    orderBookAuction = await OrderBookAuction.deploy(3600);

    // Deploy ERC20 + HoldToCompete Auction
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    biddingToken = await MockERC20.deploy("Bid Token", "BID", TOKEN_SUPPLY);

    const HoldToCompeteAuction = await ethers.getContractFactory("HoldToCompeteAuction");
    holdToCompeteAuction = await HoldToCompeteAuction.deploy(
      await biddingToken.getAddress(),
      3600,      // duration
      MIN_HOLD  // min hold amount
    );

    // Fund bidders and approve auction for lock + bid transfers
    for (const bidder of [bidder1, bidder2, bidder3]) {
      await biddingToken.transfer(bidder.address, ethers.parseEther("10000"));
      await biddingToken
        .connect(bidder)
        .approve(await holdToCompeteAuction.getAddress(), ethers.MaxUint256);
    }
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
      ).to.be.revertedWith("There already is a higher bid.");
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

  describe("Random Selection Auction", function () {
    it("Should allow placing bids", async function () {
      await expect(
        randomSelectionAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1") })
      ).to.emit(randomSelectionAuction, "BidPlaced");
    });

    it("Should reject zero bid", async function () {
      await expect(
        randomSelectionAuction.connect(bidder1).placeBid({ value: 0 })
      ).to.be.revertedWith("Bid must be greater than 0");
    });

    it("Should allow multiple bidders and select winner after end", async function () {
      await randomSelectionAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1") });
      await randomSelectionAuction.connect(bidder2).placeBid({ value: ethers.parseEther("2") });

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        randomSelectionAuction.connect(owner).selectWinner()
      ).to.emit(randomSelectionAuction, "AuctionEnded");

      expect(await randomSelectionAuction.auctionEnded()).to.be.true;
    });
  });

  describe("Playable Auction", function () {
    it("Should return correct starting price", async function () {
      const price = await playableAuction.getCurrentPrice();
      expect(price).to.equal(ethers.parseEther("5"));
    });

    it("Should allow placing bid at or above current price", async function () {
      await expect(
        playableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("5") })
      ).to.emit(playableAuction, "NewBid");
    });

    it("Should reject bid below current price", async function () {
      await expect(
        playableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("1") })
      ).to.be.revertedWith("Bid amount too low");
    });

    it("Should allow finalizing after end time", async function () {
      await playableAuction.connect(bidder1).placeBid({ value: ethers.parseEther("5") });

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        playableAuction.connect(owner).finalizeAuction()
      ).to.emit(playableAuction, "AuctionEnded");
    });
  });

  describe("Order Book Auction", function () {
    it("Should allow placing buy order with correct ETH", async function () {
      const price = ethers.parseEther("1");
      const amount = 10n;
      const value = price * amount;

      await expect(
        orderBookAuction.connect(bidder1).placeBuyOrder(price, amount, { value })
      ).to.emit(orderBookAuction, "OrderPlaced");
    });

    it("Should reject buy order with incorrect ETH amount", async function () {
      const price = ethers.parseEther("1");
      const amount = 10n;

      await expect(
        orderBookAuction.connect(bidder1).placeBuyOrder(price, amount, { value: ethers.parseEther("5") })
      ).to.be.revertedWith("Incorrect ETH sent");
    });
  });

  describe("Hold To Compete Auction", function () {
    async function lockAndBid(bidder, amount) {
      await holdToCompeteAuction.connect(bidder).lockTokens();
      await holdToCompeteAuction.connect(bidder).placeBid(amount);
    }

    it("Should initialize with correct seller, token, and min hold", async function () {
      expect(await holdToCompeteAuction.seller()).to.equal(owner.address);
      expect(await holdToCompeteAuction.biddingToken()).to.equal(await biddingToken.getAddress());
      expect(await holdToCompeteAuction.minHoldAmount()).to.equal(MIN_HOLD);
      expect(await holdToCompeteAuction.highestBid()).to.equal(0);
      expect(await holdToCompeteAuction.highestBidder()).to.equal(ethers.ZeroAddress);
    });

    it("Should set auction end time from duration", async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const endTime = await holdToCompeteAuction.auctionEndTime();
      expect(endTime).to.be.gt(now);
      expect(endTime).to.be.lte(BigInt(now + 3600));
    });

    it("Should allow locking tokens before bidding", async function () {
      const auctionAddr = await holdToCompeteAuction.getAddress();
      const balanceBefore = await biddingToken.balanceOf(auctionAddr);

      await expect(holdToCompeteAuction.connect(bidder1).lockTokens())
        .to.emit(biddingToken, "Transfer")
        .withArgs(bidder1.address, auctionAddr, MIN_HOLD);

      expect(await holdToCompeteAuction.hasLocked(bidder1.address)).to.be.true;
      expect(await biddingToken.balanceOf(auctionAddr)).to.equal(balanceBefore + MIN_HOLD);
    });

    it("Should reject locking tokens twice", async function () {
      await holdToCompeteAuction.connect(bidder1).lockTokens();
      await expect(
        holdToCompeteAuction.connect(bidder1).lockTokens()
      ).to.be.revertedWith("Tokens already locked");
    });

    it("Should reject bidding without locking tokens first", async function () {
      await expect(
        holdToCompeteAuction.connect(bidder1).placeBid(ethers.parseEther("10"))
      ).to.be.revertedWith("Must lock tokens before bidding");
    });

    it("Should allow placing a bid after locking", async function () {
      await holdToCompeteAuction.connect(bidder1).lockTokens();
      const bidAmount = ethers.parseEther("10");

      await expect(holdToCompeteAuction.connect(bidder1).placeBid(bidAmount))
        .to.emit(holdToCompeteAuction, "BidPlaced")
        .withArgs(bidder1.address, bidAmount);

      expect(await holdToCompeteAuction.highestBidder()).to.equal(bidder1.address);
      expect(await holdToCompeteAuction.highestBid()).to.equal(bidAmount);
    });

    it("Should reject bids not higher than current highest", async function () {
      await lockAndBid(bidder1, ethers.parseEther("10"));
      await holdToCompeteAuction.connect(bidder2).lockTokens();

      await expect(
        holdToCompeteAuction.connect(bidder2).placeBid(ethers.parseEther("10"))
      ).to.be.revertedWith("Bid must be higher than current highest bid");

      await expect(
        holdToCompeteAuction.connect(bidder2).placeBid(ethers.parseEther("5"))
      ).to.be.revertedWith("Bid must be higher than current highest bid");
    });

    it("Should credit previous highest bidder when outbid", async function () {
      const firstBid = ethers.parseEther("10");
      const secondBid = ethers.parseEther("20");

      await lockAndBid(bidder1, firstBid);
      await lockAndBid(bidder2, secondBid);

      expect(await holdToCompeteAuction.highestBidder()).to.equal(bidder2.address);
      expect(await holdToCompeteAuction.highestBid()).to.equal(secondBid);
      expect(await holdToCompeteAuction.bids(bidder1.address)).to.equal(firstBid);
      expect(await holdToCompeteAuction.bids(bidder2.address)).to.equal(0);
    });

    it("Should allow outbid bidder to withdraw previous bid", async function () {
      const firstBid = ethers.parseEther("10");
      await lockAndBid(bidder1, firstBid);
      await lockAndBid(bidder2, ethers.parseEther("20"));

      const balanceBefore = await biddingToken.balanceOf(bidder1.address);
      await expect(holdToCompeteAuction.connect(bidder1).withdrawBids())
        .to.emit(holdToCompeteAuction, "FundsWithdrawn")
        .withArgs(bidder1.address, firstBid);

      expect(await biddingToken.balanceOf(bidder1.address)).to.equal(balanceBefore + firstBid);
      expect(await holdToCompeteAuction.bids(bidder1.address)).to.equal(0);
    });

    it("Should reject withdrawBids when nothing to withdraw", async function () {
      await expect(
        holdToCompeteAuction.connect(bidder1).withdrawBids()
      ).to.be.revertedWith("No funds to withdraw");
    });

    it("Should allow non-winners to withdraw locked tokens", async function () {
      await lockAndBid(bidder1, ethers.parseEther("10"));
      await lockAndBid(bidder2, ethers.parseEther("20"));

      const balanceBefore = await biddingToken.balanceOf(bidder1.address);
      await expect(holdToCompeteAuction.connect(bidder1).withdrawLockedTokens())
        .to.emit(holdToCompeteAuction, "FundsWithdrawn")
        .withArgs(bidder1.address, MIN_HOLD);

      expect(await holdToCompeteAuction.hasLocked(bidder1.address)).to.be.false;
      expect(await biddingToken.balanceOf(bidder1.address)).to.equal(balanceBefore + MIN_HOLD);
    });

    it("Should prevent winner from withdrawing locked tokens", async function () {
      await lockAndBid(bidder1, ethers.parseEther("10"));

      await expect(
        holdToCompeteAuction.connect(bidder1).withdrawLockedTokens()
      ).to.be.revertedWith("Winner cannot withdraw locked tokens");
    });

    it("Should reject finalize before auction ends", async function () {
      await expect(
        holdToCompeteAuction.connect(owner).finalizeAuction()
      ).to.be.revertedWith("Auction is still ongoing");
    });

    it("Should reject finalize from non-seller", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        holdToCompeteAuction.connect(bidder1).finalizeAuction()
      ).to.be.revertedWith("Only seller can finalize");
    });

    it("Should finalize and transfer winning bid to seller", async function () {
      const winningBid = ethers.parseEther("25");
      await lockAndBid(bidder1, ethers.parseEther("10"));
      await lockAndBid(bidder2, winningBid);

      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      const sellerBefore = await biddingToken.balanceOf(owner.address);
      await expect(holdToCompeteAuction.connect(owner).finalizeAuction())
        .to.emit(holdToCompeteAuction, "AuctionEnded")
        .withArgs(bidder2.address, winningBid);

      expect(await biddingToken.balanceOf(owner.address)).to.equal(sellerBefore + winningBid);
    });

    it("Should finalize with no bids", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(holdToCompeteAuction.connect(owner).finalizeAuction())
        .to.emit(holdToCompeteAuction, "AuctionEnded")
        .withArgs(ethers.ZeroAddress, 0);
    });

    it("Should reject lock and bid after auction ends", async function () {
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine");

      await expect(
        holdToCompeteAuction.connect(bidder1).lockTokens()
      ).to.be.revertedWith("Auction has ended");

      await expect(
        holdToCompeteAuction.connect(bidder1).placeBid(ethers.parseEther("10"))
      ).to.be.revertedWith("Auction has ended");
    });
  });
});
