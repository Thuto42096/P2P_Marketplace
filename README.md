# ChainMart — P2P Stablecoin Marketplace

A decentralized peer-to-peer marketplace where sellers list items priced in
ERC-20 stablecoins and buyers purchase via an on-chain escrow. Funds stay in
the smart contract until the buyer confirms receipt, the seller refunds, or an
admin resolves a dispute.

- **Contracts:** Solidity 0.8.24, Hardhat, OpenZeppelin (UUPS-upgradeable)
- **Frontend:** React 19 + Vite, Tailwind CSS, wagmi v2 + viem
- **Networks:** Hardhat / localhost, Ethereum Sepolia (out of the box; mainnet,
  Polygon, Base, Arbitrum are wired in the wagmi config)

## Repository layout

```
contracts/         Marketplace.sol + mocks/MockERC20.sol
scripts/           deploy.js, syncFrontend.js
test/              Hardhat tests (Marketplace + Escrow flows)
deployments/       Per-network deployment manifests (e.g. sepolia.json)
frontend/          Vite/React app (pages, hooks, wagmi config)
```

## Smart contract overview

`Marketplace` is a UUPS-upgradeable contract with the following lifecycle:

1. Owner whitelists payment tokens via `setTokenAllowed(token, true)`.
2. Seller calls `createListing(name, description, price, imageURI, paymentToken)`.
3. Buyer approves the marketplace for `price` of the payment token, then calls
   `buyItem(listingId)` — funds are pulled into escrow and the listing moves to
   `InEscrow`.
4. Buyer calls `confirmReceipt(escrowId)` → funds released to seller, listing
   becomes `Sold`. Or seller calls `refundBuyer(escrowId)` → funds returned,
   listing returns to `Active`.
5. Either party can `raiseDispute(escrowId)`; the contract owner settles via
   `resolveDispute(escrowId, releaseToSeller)`.

`ReentrancyGuard` protects all token transfers; `SafeERC20` is used throughout.

## Prerequisites

- Node.js 18+
- An EVM wallet (MetaMask or any injected/Coinbase Wallet connector) for the
  frontend
- For Sepolia deploys: an RPC URL, a funded private key, and (optional) an
  Etherscan API key for verification

## Setup

```bash
# Repository root — Hardhat workspace
npm install

# Frontend
cd frontend && npm install && cd ..
```

Create a `.env` at the repo root for non-local deploys:

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
# Optional: skip MockERC20 deploy and whitelist an existing stablecoin instead
USDC_ADDRESS=0x...
```

## Common workflows

### Compile + test

```bash
npm run compile
npm test
```

### Run a local node and deploy to it

```bash
# terminal 1
npm run node

# terminal 2
npm run deploy:localhost
```

`deploy.js` will:

1. Deploy a `MockERC20` (mUSDC, 6 decimals) unless `USDC_ADDRESS` is set.
2. Deploy `Marketplace` behind a UUPS ERC-1967 proxy, owned by the deployer.
3. Whitelist the stablecoin on the marketplace.
4. Write a deployment manifest to `deployments/<network>.json`.
5. Run `scripts/syncFrontend.js` to copy the latest ABIs and a chain-id-keyed
   `addresses.json` into `frontend/src/contracts/`.

### Deploy to Sepolia

```bash
npm run deploy:sepolia
# Optional: verify the implementation contract printed by the deploy script
npm run verify:sepolia -- <implementationAddress>
```

The current Sepolia deployment is recorded in `deployments/sepolia.json`.

### Re-sync the frontend without redeploying

```bash
npm run sync:frontend
```

## Frontend

```bash
cd frontend
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

The app reads `frontend/src/contracts/addresses.json` and picks the marketplace
+ stablecoin address for the connected `chainId` at runtime. If no entry exists
for the active chain, the UI shows a "no contract" banner.

Pages:

- **Browse** — active listings, search, click-through to detail
- **Listing detail** — approve + buy, view escrow status
- **Selling** — create / pause / cancel listings, refund buyers
- **Buying** — your escrows, confirm receipt, dispute
- **Login** — wallet connect (injected + Coinbase Wallet)

## Available scripts (root)

| Script                  | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `npm run compile`       | `hardhat compile`                                 |
| `npm test`              | Run Hardhat test suite                            |
| `npm run node`          | Start a local Hardhat JSON-RPC node               |
| `npm run deploy:localhost` | Deploy to the running local node               |
| `npm run deploy:hardhat`   | Deploy to an in-process Hardhat network        |
| `npm run deploy:sepolia`   | Deploy to Sepolia (requires `.env`)            |
| `npm run verify:sepolia`   | `hardhat verify` shortcut for Sepolia          |
| `npm run sync:frontend`    | Mirror ABIs + addresses into `frontend/src`    |

## License

MIT
