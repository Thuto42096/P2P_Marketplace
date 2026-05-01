/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  console.log(`Network:        ${network.name} (chainId ${network.config.chainId})`);

  // 1. Deploy a Mock USDC (only on local/test networks). On a real network,
  //    set USDC_ADDRESS in the environment to skip this step.
  const isLocal = network.name === "hardhat" || network.name === "localhost";
  let stablecoinAddress = process.env.USDC_ADDRESS;
  if (!stablecoinAddress) {
    if (!isLocal) {
      throw new Error(
        "USDC_ADDRESS env var is required when deploying to a non-local network"
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

  // 2. Deploy the Marketplace, owned by the deployer.
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(deployer.address);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`Marketplace deployed at:        ${marketplaceAddress}`);

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
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
