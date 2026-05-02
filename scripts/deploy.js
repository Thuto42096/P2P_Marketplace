/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network, upgrades } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network:        ${network.name} (chainId ${network.config.chainId})`);

  // 1. Resolve a stablecoin address. If USDC_ADDRESS is set we use it as-is
  //    (e.g. real Sepolia USDC on testnet). Otherwise we deploy a MockERC20
  //    so the marketplace has *something* whitelistable on any network.
  let stablecoinAddress = process.env.USDC_ADDRESS;
  if (!stablecoinAddress) {
    const isLocal = network.name === "hardhat" || network.name === "localhost";
    if (!isLocal) {
      console.warn(
        "USDC_ADDRESS not set; deploying MockERC20 (mUSDC) on this network."
      );
    }
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("Mock USD Coin", "mUSDC", 6);
    await usdc.waitForDeployment();
    stablecoinAddress = await usdc.getAddress();
    console.log(`MockERC20 (mUSDC) deployed at: ${stablecoinAddress}`);
  } else {
    console.log(`Using existing stablecoin at: ${stablecoinAddress}`);
  }

  // 2. Deploy the Marketplace behind a UUPS proxy, owned by the deployer.
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await upgrades.deployProxy(
    Marketplace,
    [deployer.address],
    {
      kind: "uups",
      initializer: "initialize",
      // OZ Contracts 5.5+ marks ReentrancyGuard as stateless and safe for
      // proxies, but its (no-op-on-proxy) constructor still trips the
      // upgrades-core safety check. Allow it explicitly.
      unsafeAllow: ["constructor"],
    }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    marketplaceAddress
  );
  console.log(`Marketplace proxy deployed at:  ${marketplaceAddress}`);
  console.log(`Marketplace implementation at:  ${implementationAddress}`);

  // 3. Whitelist the stablecoin.
  const tx = await marketplace.setTokenAllowed(stablecoinAddress, true);
  await tx.wait();
  console.log(`Whitelisted token:              ${stablecoinAddress}`);

  // 4. Persist deployment info for the frontend / scripts to consume.
  const deployment = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    marketplace: marketplaceAddress,
    marketplaceImplementation: implementationAddress,
    stablecoin: stablecoinAddress,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log(`Wrote deployment manifest to:   ${outFile}`);

  // Mirror ABIs + addresses into the frontend (best-effort).
  try {
    require("./syncFrontend.js");
  } catch (e) {
    console.warn(`(syncFrontend skipped: ${e.message})`);
  }

  if (network.name === "sepolia") {
    console.log("\nSepolia explorer links:");
    console.log(`  Marketplace proxy:          https://sepolia.etherscan.io/address/${marketplaceAddress}`);
    console.log(`  Marketplace implementation: https://sepolia.etherscan.io/address/${implementationAddress}`);
    console.log(`  Stablecoin:                 https://sepolia.etherscan.io/address/${stablecoinAddress}`);
    console.log("\nVerify the implementation contract:");
    console.log(`  npx hardhat verify --network sepolia ${implementationAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
