const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy Dutch Auction
  const DutchAuction = await ethers.getContractFactory("DutchAuction");
  const dutchAuction = await DutchAuction.deploy(
    ethers.parseEther("10"), // start price: 10 ETH
    ethers.parseEther("1"),  // reserve price: 1 ETH
    3600,                    // duration: 1 hour
    60                       // price drop interval: 1 minute
  );
  await dutchAuction.waitForDeployment();
  console.log("Dutch Auction deployed to:", await dutchAuction.getAddress());

  // Deploy English Auction
  const EnglishAuction = await ethers.getContractFactory("EnglishAuction");
  const englishAuction = await EnglishAuction.deploy(
    3600,                    // bidding time: 1 hour
    ethers.parseEther("1")   // reserve price: 1 ETH
  );
  await englishAuction.waitForDeployment();
  console.log("English Auction deployed to:", await englishAuction.getAddress());

  // Deploy Sealed Bid Auction
  const SealedBidAuction = await ethers.getContractFactory("SealedBidAuction");
  const sealedBidAuction = await SealedBidAuction.deploy(
    3600,  // bidding time: 1 hour
    1800   // reveal time: 30 minutes
  );
  await sealedBidAuction.waitForDeployment();
  console.log("Sealed Bid Auction deployed to:", await sealedBidAuction.getAddress());

  // Deploy Hold to Compete Auction (requires ERC20 token address)
  // You'll need to deploy an ERC20 token first or use an existing one
  const ERC20Token = await ethers.getContractFactory("ERC20Mock");
  const token = await ERC20Token.deploy("Auction Token", "AUCT", ethers.parseEther("1000000"));
  await token.waitForDeployment();
  console.log("ERC20 Token deployed to:", await token.getAddress());

  const HoldToCompeteAuction = await ethers.getContractFactory("HoldToCompeteAuction");
  const holdToCompeteAuction = await HoldToCompeteAuction.deploy(
    await token.getAddress(), // token address
    3600,                     // duration: 1 hour
    ethers.parseEther("100")  // min hold amount: 100 tokens
  );
  await holdToCompeteAuction.waitForDeployment();
  console.log("Hold to Compete Auction deployed to:", await holdToCompeteAuction.getAddress());

  // Deploy Playable Auction
  const PlayableAuction = await ethers.getContractFactory("PlayableAuction");
  const playableAuction = await PlayableAuction.deploy(
    ethers.parseEther("10"), // starting price: 10 ETH
    ethers.parseEther("1"),  // reserve price: 1 ETH
    3600,                    // duration: 1 hour
    60,                      // price drop interval: 1 minute
    ethers.parseEther("0.1") // price drop amount: 0.1 ETH
  );
  await playableAuction.waitForDeployment();
  console.log("Playable Auction deployed to:", await playableAuction.getAddress());

  // Deploy Random Selection Auction
  const RandomSelectionAuction = await ethers.getContractFactory("RandomSelectionAuction");
  const randomSelectionAuction = await RandomSelectionAuction.deploy(
    3600 // duration: 1 hour
  );
  await randomSelectionAuction.waitForDeployment();
  console.log("Random Selection Auction deployed to:", await randomSelectionAuction.getAddress());

  // Deploy Order Book Auction
  const OrderBookAuction = await ethers.getContractFactory("OrderBookAuction");
  const orderBookAuction = await OrderBookAuction.deploy(
    3600 // auction duration: 1 hour
  );
  await orderBookAuction.waitForDeployment();
  console.log("Order Book Auction deployed to:", await orderBookAuction.getAddress());

  // Save deployment addresses
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    contracts: {
      dutchAuction: await dutchAuction.getAddress(),
      englishAuction: await englishAuction.getAddress(),
      sealedBidAuction: await sealedBidAuction.getAddress(),
      holdToCompeteAuction: await holdToCompeteAuction.getAddress(),
      playableAuction: await playableAuction.getAddress(),
      randomSelectionAuction: await randomSelectionAuction.getAddress(),
      orderBookAuction: await orderBookAuction.getAddress(),
      erc20Token: await token.getAddress(),
    },
    timestamp: new Date().toISOString(),
  };

  const fs = require("fs");
  fs.writeFileSync(
    "./deployments.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\nDeployment completed successfully!");
  console.log("Contract addresses saved to deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
