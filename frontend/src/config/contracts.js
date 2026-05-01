import MarketplaceAbi from "../contracts/MarketplaceAbi.json";
import Erc20Abi from "../contracts/Erc20Abi.json";
import addresses from "../contracts/addresses.json";

export const marketplaceAbi = MarketplaceAbi;
export const erc20Abi = Erc20Abi;

/**
 * Returns the deployed contract addresses for a given chainId.
 * Falls back to the Hardhat local network deployment so the UI is usable in
 * dev even before the user has switched networks.
 */
export function getAddresses(chainId) {
  const key = String(chainId);
  if (addresses[key]) return addresses[key];
  // Fallback to the first available deployment (typically Hardhat / 31337).
  const first = Object.values(addresses)[0];
  return first || { marketplace: undefined, stablecoin: undefined };
}

export const allAddresses = addresses;
