import { useContractAddresses } from "../hooks/useMarketplace.js";

export default function NoContractBanner() {
  const { marketplace, chainId } = useContractAddresses();
  if (marketplace) return null;
  return (
    <div className="mb-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-sm text-yellow-900">
      <p className="font-semibold">Marketplace not deployed on this chain.</p>
      <p className="mt-1">
        Connected chain id: <code>{chainId}</code>. Deploy with{" "}
        <code>npm run deploy:localhost</code> from the project root, then run{" "}
        <code>npm run sync:frontend</code> to refresh addresses.
      </p>
    </div>
  );
}
