import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Auction Contracts...");

  // Deploy English Auction
  const EnglishAuction = await ethers.getContractFactory("EnglishAuction");
  const englishAuction = await EnglishAuction.deploy(3600, ethers.parseEther("0.1")); // 1 hour, 0.1 ETH reserve
  await englishAuction.waitForDeployment();
  console.log("English Auction deployed to:", await englishAuction.getAddress());

  // Deploy Dutch Auction
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  const dutchAuction = await DutchAuction.deploy(
    ethers.parseEther("1.0"), // start price
    ethers.parseEther("0.1"), // reserve price
    3600, // duration
    300    // price drop interval (5 minutes)
  );
  await dutchAuction.waitForDeployment();
  console.log("Dutch Auction deployed to:", await dutchAuction.getAddress());

  // Deploy Sealed Bid Auction
  const SealedBidAuction = await ethers.getContractFactory("SealedBidAuction");
  const sealedBidAuction = await SealedBidAuction.deploy(1800, 1800); // 30 min bidding, 30 min reveal
  await sealedBidAuction.waitForDeployment();
  console.log("Sealed Bid Auction deployed to:", await sealedBidAuction.getAddress());

  // Deploy Hold to Compete Auction (using a mock ERC20 token)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockToken = await MockERC20.deploy("Auction Token", "AUCT", ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("Mock ERC20 Token deployed to:", await mockToken.getAddress());

  const HoldToCompeteAuction = await ethers.getContractFactory("HoldToCompeteAuction");
  const holdToCompeteAuction = await HoldToCompeteAuction.deploy(
    await mockToken.getAddress(),
    3600, // duration
    ethers.parseEther("10") // min hold amount
  );
  await holdToCompeteAuction.waitForDeployment();
  console.log("Hold to Compete Auction deployed to:", await holdToCompeteAuction.getAddress());

  // Deploy Order Book Auction
  const OrderBookAuction = await ethers.getContractFactory("OrderBookAuction");
  const orderBookAuction = await OrderBookAuction.deploy(3600); // 1 hour duration
  await orderBookAuction.waitForDeployment();
  console.log("Order Book Auction deployed to:", await orderBookAuction.getAddress());

  // Deploy Playable Auction
  const PlayableAuction = await ethers.getContractFactory("PlayableAuction");
  const playableAuction = await PlayableAuction.deploy(
    ethers.parseEther("1.0"), // starting price
    ethers.parseEther("0.1"), // reserve price
    3600, // duration
    300,  // price drop interval
    ethers.parseEther("0.01") // price drop amount
  );
  await playableAuction.waitForDeployment();
  console.log("Playable Auction deployed to:", await playableAuction.getAddress());

  // Deploy Random Selection Auction
  const RandomSelectionAuction = await ethers.getContractFactory("RandomSelectionAuction");
  const randomSelectionAuction = await RandomSelectionAuction.deploy(3600); // 1 hour duration
  await randomSelectionAuction.waitForDeployment();
  console.log("Random Selection Auction deployed to:", await randomSelectionAuction.getAddress());

  console.log("\n=== Deployment Summary ===");
  console.log("English Auction:", await englishAuction.getAddress());
  console.log("Dutch Auction:", await dutchAuction.getAddress());
  console.log("Sealed Bid Auction:", await sealedBidAuction.getAddress());
  console.log("Mock ERC20 Token:", await mockToken.getAddress());
  console.log("Hold to Compete Auction:", await holdToCompeteAuction.getAddress());
  console.log("Order Book Auction:", await orderBookAuction.getAddress());
  console.log("Playable Auction:", await playableAuction.getAddress());
  console.log("Random Selection Auction:", await randomSelectionAuction.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
