/* eslint-disable no-console */
/**
 * Copies the latest Marketplace + MockERC20 ABIs and deployment addresses
 * into the frontend so the React app can import them as plain JSON.
 *
 * Run:  node scripts/syncFrontend.js
 * Or as part of a deploy: it is invoked automatically by scripts/deploy.js.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ARTIFACTS = path.join(ROOT, "artifacts", "contracts");
const DEPLOYMENTS = path.join(ROOT, "deployments");
const OUT = path.join(ROOT, "frontend", "src", "contracts");

function readAbi(artifactPath) {
  const raw = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return raw.abi;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`  wrote ${path.relative(ROOT, file)}`);
}

function main() {
  console.log("Syncing contract artifacts to frontend...");

  const marketplaceArtifact = path.join(
    ARTIFACTS,
    "Marketplace.sol",
    "Marketplace.json"
  );
  const erc20Artifact = path.join(
    ARTIFACTS,
    "mocks",
    "MockERC20.sol",
    "MockERC20.json"
  );

  if (!fs.existsSync(marketplaceArtifact)) {
    throw new Error(
      `Missing ${marketplaceArtifact}. Run \`npx hardhat compile\` first.`
    );
  }

  writeJson(path.join(OUT, "MarketplaceAbi.json"), readAbi(marketplaceArtifact));
  if (fs.existsSync(erc20Artifact)) {
    writeJson(path.join(OUT, "Erc20Abi.json"), readAbi(erc20Artifact));
  }

  // Aggregate every deployments/<network>.json into a single addresses.json
  // keyed by chain id. The frontend picks the right entry at runtime.
  const addresses = {};
  if (fs.existsSync(DEPLOYMENTS)) {
    for (const file of fs.readdirSync(DEPLOYMENTS)) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(
        fs.readFileSync(path.join(DEPLOYMENTS, file), "utf8")
      );
      if (data.chainId) {
        addresses[data.chainId] = {
          marketplace: data.marketplace,
          stablecoin: data.stablecoin,
          network: data.network,
        };
      }
    }
  }
  writeJson(path.join(OUT, "addresses.json"), addresses);
  console.log("Done.");
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
