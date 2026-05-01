import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, mainnet, sepolia, polygon, base, arbitrum } from "wagmi/chains";

// WalletConnect project id is optional in dev — RainbowKit will warn but still
// run with injected wallets (MetaMask, Rabby, etc.).
const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "demo-project-id";

export const config = getDefaultConfig({
  appName: "P2P Stablecoin Marketplace",
  projectId,
  chains: [hardhat, sepolia, mainnet, polygon, base, arbitrum],
  ssr: false,
});
