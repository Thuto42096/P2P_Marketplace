import { formatUnits } from "viem";

export function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatPrice(amount, decimals = 6, symbol = "USDC") {
  if (amount === undefined || amount === null) return "—";
  try {
    const formatted = formatUnits(BigInt(amount), decimals);
    const n = Number(formatted);
    const display = n.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    });
    return `${display} ${symbol}`;
  } catch {
    return `${amount} ${symbol}`;
  }
}

export const LISTING_STATUS = {
  0: "Active",
  1: "Paused",
  2: "In Escrow",
  3: "Sold",
  4: "Cancelled",
};

export const ESCROW_STATUS = {
  0: "None",
  1: "Pending",
  2: "Released",
  3: "Refunded",
  4: "Disputed",
};
