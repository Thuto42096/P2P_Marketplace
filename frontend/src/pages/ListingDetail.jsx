import { useParams, Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import {
  useListing,
  useTokenMeta,
  useContractAddresses,
} from "../hooks/useMarketplace.js";
import { useTxButton } from "../hooks/useTxButton.js";
import {
  marketplaceAbi,
  erc20Abi,
} from "../config/contracts.js";
import {
  formatPrice,
  truncateAddress,
  LISTING_STATUS,
} from "../lib/format.js";
import NoContractBanner from "../components/NoContractBanner.jsx";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><rect width='100%25' height='100%25' fill='%23e4e6eb'/></svg>";

function resolveImage(uri) {
  if (!uri) return PLACEHOLDER;
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return uri;
}

export default function ListingDetail() {
  const { id } = useParams();
  const { address: account } = useAccount();
  const { marketplace } = useContractAddresses();
  const { data: listing, isLoading, refetch } = useListing(id);
  const { symbol, decimals } = useTokenMeta(listing?.paymentToken);

  // Allowance check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    abi: erc20Abi,
    address: listing?.paymentToken,
    functionName: "allowance",
    args: account && marketplace ? [account, marketplace] : undefined,
    query: { enabled: Boolean(account && marketplace && listing?.paymentToken) },
  });

  const approveTx = useTxButton({ onSuccess: () => refetchAllowance() });
  const buyTx = useTxButton({
    onSuccess: () => {
      refetch();
      refetchAllowance();
    },
  });

  if (isLoading) {
    return <p className="text-fb-subtle">Loading…</p>;
  }

  if (!listing || listing.id === 0n) {
    return (
      <>
        <NoContractBanner />
        <p className="text-fb-subtle">Listing not found.</p>
      </>
    );
  }

  const status = Number(listing.status);
  const isSeller = account && account.toLowerCase() === listing.seller.toLowerCase();
  const needsApproval =
    !isSeller &&
    status === 0 &&
    (allowance === undefined || allowance < listing.price);

  const onApprove = () =>
    approveTx.write({
      abi: erc20Abi,
      address: listing.paymentToken,
      functionName: "approve",
      args: [marketplace, listing.price],
    });

  const onBuy = () =>
    buyTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "buyItem",
      args: [listing.id],
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 bg-fb-surface rounded-xl overflow-hidden shadow-card">
        <img
          src={resolveImage(listing.imageURI)}
          alt={listing.name}
          className="w-full h-full object-contain bg-black/5 max-h-[600px]"
          onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
        />
      </div>

      <aside className="lg:col-span-2 bg-fb-surface rounded-xl shadow-card p-6 self-start sticky top-20">
        <h1 className="text-2xl font-bold text-fb-text">{listing.name}</h1>
        <p className="text-3xl font-semibold text-fb-text mt-2">
          {formatPrice(listing.price, decimals, symbol)}
        </p>
        <span className="inline-block mt-2 text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-fb-bg text-fb-subtle">
          {LISTING_STATUS[status]}
        </span>

        <div className="mt-4 pt-4 border-t border-fb-border">
          <p className="text-xs text-fb-subtle">Seller</p>
          <p className="text-sm font-mono mt-1">{truncateAddress(listing.seller)}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-fb-border">
          <p className="text-xs text-fb-subtle uppercase">Description</p>
          <p className="text-sm text-fb-text mt-2 whitespace-pre-wrap">
            {listing.description || "—"}
          </p>
        </div>

        <div className="mt-6">
          {!account ? (
            <p className="text-sm text-fb-subtle">Connect your wallet to buy.</p>
          ) : isSeller ? (
            <Link
              to="/sell"
              className="block text-center w-full py-3 rounded-lg bg-fb-bg text-fb-text font-medium hover:bg-fb-border"
            >
              Manage in seller dashboard
            </Link>
          ) : status !== 0 ? (
            <p className="text-sm text-fb-subtle">
              This listing is not currently available.
            </p>
          ) : needsApproval ? (
            <button
              onClick={onApprove}
              disabled={approveTx.isPending || approveTx.isMining}
              className="w-full py-3 rounded-lg bg-fb-accent text-white font-semibold hover:bg-fb-accentHover disabled:opacity-60"
            >
              {approveTx.status || `Approve ${symbol}`}
            </button>
          ) : (
            <button
              onClick={onBuy}
              disabled={buyTx.isPending || buyTx.isMining}
              className="w-full py-3 rounded-lg bg-fb-success text-white font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {buyTx.status || "Buy with Escrow"}
            </button>
          )}
          {(approveTx.error || buyTx.error) && (
            <p className="mt-2 text-sm text-fb-danger">
              {(approveTx.error || buyTx.error).shortMessage ||
                (approveTx.error || buyTx.error).message}
            </p>
          )}
          {buyTx.isSuccess && (
            <p className="mt-2 text-sm text-fb-success">
              Purchase locked in escrow. Track it in{" "}
              <Link to="/buy" className="underline">
                Buying
              </Link>
              .
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
