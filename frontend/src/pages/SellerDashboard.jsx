import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { useAllListings, useTokenMeta } from "../hooks/useMarketplace.js";
import { useContractAddresses } from "../hooks/useMarketplace.js";
import { useTxButton } from "../hooks/useTxButton.js";
import { marketplaceAbi } from "../config/contracts.js";
import {
  formatPrice,
  LISTING_STATUS,
} from "../lib/format.js";
import NoContractBanner from "../components/NoContractBanner.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function SellerDashboard() {
  const { address } = useAccount();
  const { data: listings, isLoading, refetch } = useAllListings();

  const mine = useMemo(() => {
    if (!listings || !address) return [];
    return listings.filter(
      (l) => l.seller.toLowerCase() === address.toLowerCase()
    );
  }, [listings, address]);

  return (
    <div>
      <NoContractBanner />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fb-text">Selling</h1>
          <p className="text-sm text-fb-subtle">Manage your listings</p>
        </div>
        <Link
          to="/sell/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fb-accent text-white text-sm font-semibold hover:bg-fb-accentHover"
        >
          + Create listing
        </Link>
      </div>

      {!address ? (
        <p className="text-fb-subtle">Connect your wallet to view your listings.</p>
      ) : isLoading ? (
        <p className="text-fb-subtle">Loading…</p>
      ) : mine.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Create your first listing to start selling."
          action={
            <Link
              to="/sell/new"
              className="inline-flex px-4 py-2 rounded-lg bg-fb-accent text-white text-sm font-medium hover:bg-fb-accentHover"
            >
              Create listing
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {mine.map((l) => (
            <SellerListingRow key={String(l.id)} listing={l} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerListingRow({ listing, onChanged }) {
  const { marketplace } = useContractAddresses();
  const { symbol, decimals } = useTokenMeta(listing.paymentToken);
  const status = Number(listing.status);
  const isPaused = status === 1;
  const inEscrow = status === 2;

  const pauseTx = useTxButton({ onSuccess: onChanged });
  const cancelTx = useTxButton({ onSuccess: onChanged });
  const refundTx = useTxButton({ onSuccess: onChanged });

  const togglePause = () =>
    pauseTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "setListingPaused",
      args: [listing.id, !isPaused],
    });

  const cancel = () =>
    cancelTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "cancelListing",
      args: [listing.id],
    });

  const refund = () =>
    refundTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "refundBuyer",
      args: [listing.activeEscrowId],
    });

  return (
    <div className="bg-fb-surface rounded-xl shadow-card p-4 flex flex-col sm:flex-row gap-4">
      <Link to={`/listing/${listing.id}`} className="shrink-0">
        <div className="w-full sm:w-28 h-28 rounded-lg overflow-hidden bg-fb-bg">
          {listing.imageURI ? (
            <img
              src={listing.imageURI}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-2">
          <Link
            to={`/listing/${listing.id}`}
            className="font-semibold text-fb-text truncate hover:underline"
          >
            {listing.name}
          </Link>
          <span className="text-xs px-2 py-0.5 rounded bg-fb-bg text-fb-subtle">
            {LISTING_STATUS[status]}
          </span>
        </div>
        <p className="text-sm text-fb-text mt-1">
          {formatPrice(listing.price, decimals, symbol)}
        </p>
        <p className="text-xs text-fb-subtle mt-1 line-clamp-2">
          {listing.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(status === 0 || status === 1) && (
            <ToggleSwitch
              on={!isPaused}
              disabled={pauseTx.isPending || pauseTx.isMining}
              label={isPaused ? "Paused" : "Active"}
              onChange={togglePause}
            />
          )}
          {(status === 0 || status === 1) && (
            <button
              onClick={cancel}
              disabled={cancelTx.isPending || cancelTx.isMining}
              className="text-xs px-3 py-1.5 rounded-lg border border-fb-border text-fb-subtle hover:bg-fb-bg disabled:opacity-60"
            >
              {cancelTx.status || "Cancel listing"}
            </button>
          )}
          {inEscrow && (
            <button
              onClick={refund}
              disabled={refundTx.isPending || refundTx.isMining}
              className="text-xs px-3 py-1.5 rounded-lg bg-fb-danger text-white hover:opacity-90 disabled:opacity-60"
            >
              {refundTx.status || "Refund buyer"}
            </button>
          )}
        </div>

        {(pauseTx.error || cancelTx.error || refundTx.error) && (
          <p className="mt-2 text-xs text-fb-danger">
            {(pauseTx.error || cancelTx.error || refundTx.error).shortMessage ||
              (pauseTx.error || cancelTx.error || refundTx.error).message}
          </p>
        )}
      </div>
    </div>
  );
}

function ToggleSwitch({ on, label, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${
        on
          ? "border-fb-success/30 bg-green-50 text-fb-success"
          : "border-fb-border text-fb-subtle"
      } disabled:opacity-60`}
    >
      <span
        className={`relative inline-block w-7 h-4 rounded-full transition-colors ${
          on ? "bg-fb-success" : "bg-fb-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            on ? "translate-x-3" : ""
          }`}
        />
      </span>
      {label}
    </button>
  );
}
