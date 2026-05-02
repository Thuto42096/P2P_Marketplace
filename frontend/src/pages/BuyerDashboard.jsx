import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  marketplaceAbi,
} from "../config/contracts.js";
import {
  useContractAddresses,
  useTokenMeta,
} from "../hooks/useMarketplace.js";
import { useTxButton } from "../hooks/useTxButton.js";
import {
  formatPrice,
  truncateAddress,
  ESCROW_STATUS,
} from "../lib/format.js";
import NoContractBanner from "../components/NoContractBanner.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function BuyerDashboard() {
  const { address } = useAccount();
  const { marketplace } = useContractAddresses();

  const { data: nextEscrowId } = useReadContract({
    abi: marketplaceAbi,
    address: marketplace,
    functionName: "nextEscrowId",
    query: { enabled: Boolean(marketplace), refetchInterval: 5_000 },
  });

  // Build a multicall to read every escrow id in [1, nextEscrowId).
  const escrowCalls = useMemo(() => {
    if (!marketplace || !nextEscrowId) return [];
    const total = Number(nextEscrowId) - 1;
    return Array.from({ length: total }, (_, i) => ({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "getEscrow",
      args: [BigInt(i + 1)],
    }));
  }, [marketplace, nextEscrowId]);

  const { data: escrowResults, refetch } = useReadContracts({
    contracts: escrowCalls,
    query: {
      enabled: escrowCalls.length > 0,
      refetchInterval: 5_000,
    },
  });

  const myEscrows = useMemo(() => {
    if (!escrowResults || !address) return [];
    return escrowResults
      .map((r) => r.result)
      .filter(
        (e) => e && e.buyer.toLowerCase() === address.toLowerCase()
      );
  }, [escrowResults, address]);

  const active = myEscrows.filter((e) => Number(e.status) === 1);
  const history = myEscrows.filter((e) => Number(e.status) !== 1);

  return (
    <div>
      <NoContractBanner />

      <h1 className="text-2xl font-bold text-fb-text mb-1">Buying</h1>
      <p className="text-sm text-fb-subtle mb-6">
        Active purchases held in escrow and your past orders.
      </p>

      {!address ? (
        <p className="text-fb-subtle">Connect your wallet to view your purchases.</p>
      ) : myEscrows.length === 0 ? (
        <EmptyState
          title="No purchases yet"
          description="Browse the marketplace to find items to buy."
          action={
            <Link
              to="/"
              className="inline-flex px-4 py-2 rounded-lg bg-fb-accent text-white text-sm font-medium hover:bg-fb-accentHover"
            >
              Browse Marketplace
            </Link>
          }
        />
      ) : (
        <>
          <Section title="Active escrow" items={active} onChanged={refetch} />
          {history.length > 0 && (
            <Section
              title="History"
              items={history}
              onChanged={refetch}
              isHistory
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, items, onChanged, isHistory }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-fb-subtle mb-3">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((e) => (
          <EscrowRow
            key={String(e.id)}
            escrow={e}
            onChanged={onChanged}
            isHistory={isHistory}
          />
        ))}
      </div>
    </section>
  );
}

function EscrowRow({ escrow, onChanged, isHistory }) {
  const { marketplace } = useContractAddresses();
  const { symbol, decimals } = useTokenMeta(escrow.paymentToken);
  const status = Number(escrow.status);

  const releaseTx = useTxButton({ onSuccess: onChanged });
  const disputeTx = useTxButton({ onSuccess: onChanged });

  const release = () =>
    releaseTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "confirmReceipt",
      args: [escrow.id],
    });

  const dispute = () =>
    disputeTx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "raiseDispute",
      args: [escrow.id],
    });

  return (
    <div className="bg-fb-surface rounded-xl shadow-card p-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <Link
          to={`/listing/${escrow.listingId}`}
          className="font-semibold text-fb-text hover:underline"
        >
          Listing #{String(escrow.listingId)}
        </Link>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            status === 1
              ? "bg-yellow-100 text-yellow-800"
              : status === 2
              ? "bg-green-100 text-green-800"
              : status === 3
              ? "bg-purple-100 text-purple-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {ESCROW_STATUS[status]}
        </span>
        <span className="text-sm text-fb-text ml-auto">
          {formatPrice(escrow.amount, decimals, symbol)}
        </span>
      </div>

      <p className="text-xs text-fb-subtle mt-2">
        Seller: {truncateAddress(escrow.seller)}
      </p>

      {!isHistory && status === 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={release}
            disabled={releaseTx.isPending || releaseTx.isMining}
            className="px-4 py-2 rounded-lg bg-fb-success text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {releaseTx.status || "Confirm receipt & release funds"}
          </button>
          <button
            onClick={dispute}
            disabled={disputeTx.isPending || disputeTx.isMining}
            className="px-4 py-2 rounded-lg border border-fb-border text-fb-subtle text-sm hover:bg-fb-bg disabled:opacity-60"
          >
            {disputeTx.status || "Raise dispute"}
          </button>
        </div>
      )}

      {(releaseTx.error || disputeTx.error) && (
        <p className="mt-2 text-xs text-fb-danger">
          {(releaseTx.error || disputeTx.error).shortMessage ||
            (releaseTx.error || disputeTx.error).message}
        </p>
      )}
    </div>
  );
}
