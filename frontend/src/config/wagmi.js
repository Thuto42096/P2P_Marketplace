import { createConfig, http } from "wagmi";
import { hardhat, mainnet, sepolia, polygon, base, arbitrum } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

const chains = [hardhat, sepolia, mainnet, polygon, base, arbitrum];

export const config = createConfig({
  chains,
  connectors: [
    injected(),
    coinbaseWallet({ appName: "P2P Stablecoin Marketplace" }),
  ],
  transports: {
    [hardhat.id]: http(),
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
  },
  ssr: false,
});
