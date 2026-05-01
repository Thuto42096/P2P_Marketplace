import { useMemo } from "react";
import { Link } from "react-router-dom";
import ItemCard from "../components/ItemCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import NoContractBanner from "../components/NoContractBanner.jsx";
import { useAllListings } from "../hooks/useMarketplace.js";
import { useSearch } from "../lib/searchContext.js";

export default function Browse() {
  const { search } = useSearch();
  const { data: listings, isLoading, error } = useAllListings();

  const filtered = useMemo(() => {
    if (!listings) return [];
    const term = search.trim().toLowerCase();
    return listings
      .filter((l) => Number(l.status) === 0) // Active only on the public feed
      .filter((l) => {
        if (!term) return true;
        return (
          l.name.toLowerCase().includes(term) ||
          l.description.toLowerCase().includes(term)
        );
      });
  }, [listings, search]);

  return (
    <div>
      <NoContractBanner />

      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-fb-text">Today&apos;s picks</h1>
          <p className="text-sm text-fb-subtle">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} for sale
          </p>
        </div>
        <Link
          to="/sell/new"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-fb-accent text-white text-sm font-medium hover:bg-fb-accentHover"
        >
          + Create listing
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          Failed to load listings: {error.shortMessage || error.message}
        </div>
      )}

      {isLoading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "No matches" : "No items listed yet"}
          description={
            search
              ? "Try a different search term."
              : "Be the first to list something for sale."
          }
          action={
            !search && (
              <Link
                to="/sell/new"
                className="inline-flex px-4 py-2 rounded-lg bg-fb-accent text-white text-sm font-medium hover:bg-fb-accentHover"
              >
                Create your first listing
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((l) => (
            <ItemCard key={String(l.id)} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="bg-fb-surface rounded-xl overflow-hidden shadow-card">
          <div className="aspect-square bg-fb-bg animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-1/3 bg-fb-bg animate-pulse rounded" />
            <div className="h-3 w-3/4 bg-fb-bg animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-fb-bg animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
