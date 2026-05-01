import { useChainId, useReadContract } from "wagmi";
import { marketplaceAbi, erc20Abi, getAddresses } from "../config/contracts.js";

/** Returns { marketplace, stablecoin } addresses for the current chain. */
export function useContractAddresses() {
  const chainId = useChainId();
  const addrs = getAddresses(chainId);
  return { chainId, ...addrs };
}

/** Reads every listing (active, paused, sold, etc.) from the contract. */
export function useAllListings() {
  const { marketplace } = useContractAddresses();
  return useReadContract({
    abi: marketplaceAbi,
    address: marketplace,
    functionName: "getAllListings",
    query: { enabled: Boolean(marketplace), refetchInterval: 5_000 },
  });
}

/** Reads a single listing by id. */
export function useListing(id) {
  const { marketplace } = useContractAddresses();
  return useReadContract({
    abi: marketplaceAbi,
    address: marketplace,
    functionName: "getListing",
    args: id !== undefined ? [BigInt(id)] : undefined,
    query: {
      enabled: Boolean(marketplace) && id !== undefined,
      refetchInterval: 5_000,
    },
  });
}

/** Reads a single escrow record by id. */
export function useEscrow(id) {
  const { marketplace } = useContractAddresses();
  return useReadContract({
    abi: marketplaceAbi,
    address: marketplace,
    functionName: "getEscrow",
    args: id !== undefined ? [BigInt(id)] : undefined,
    query: {
      enabled: Boolean(marketplace) && id !== undefined && Number(id) > 0,
      refetchInterval: 5_000,
    },
  });
}

/** Reads ERC20 token metadata (symbol + decimals). */
export function useTokenMeta(tokenAddress) {
  const symbol = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "symbol",
    query: { enabled: Boolean(tokenAddress) },
  });
  const decimals = useReadContract({
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "decimals",
    query: { enabled: Boolean(tokenAddress) },
  });
  return {
    symbol: symbol.data ?? "TOKEN",
    decimals: decimals.data !== undefined ? Number(decimals.data) : 18,
    isLoading: symbol.isLoading || decimals.isLoading,
  };
}
