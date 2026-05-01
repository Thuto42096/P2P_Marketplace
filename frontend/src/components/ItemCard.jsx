import { Link } from "react-router-dom";
import { formatPrice, truncateAddress, LISTING_STATUS } from "../lib/format.js";
import { useTokenMeta } from "../hooks/useMarketplace.js";

const PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='100%25' height='100%25' fill='%23e4e6eb'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='28' fill='%23bcc0c4'>No image</text></svg>";

function resolveImage(uri) {
  if (!uri) return PLACEHOLDER;
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

export default function ItemCard({ listing }) {
  const { symbol, decimals } = useTokenMeta(listing.paymentToken);
  const status = LISTING_STATUS[Number(listing.status)];
  const isActive = Number(listing.status) === 0;

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group block bg-fb-surface rounded-xl overflow-hidden shadow-card hover:shadow-cardHover transition-shadow"
    >
      <div className="aspect-square bg-fb-bg overflow-hidden">
        <img
          src={resolveImage(listing.imageURI)}
          alt={listing.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER;
          }}
        />
      </div>

      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-base font-semibold text-fb-text truncate">
            {formatPrice(listing.price, decimals, symbol)}
          </p>
          {!isActive && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-fb-bg text-fb-subtle">
              {status}
            </span>
          )}
        </div>
        <p className="text-sm text-fb-text mt-0.5 line-clamp-1">
          {listing.name}
        </p>
        <p className="text-xs text-fb-subtle mt-1">
          {truncateAddress(listing.seller)}
        </p>
      </div>
    </Link>
  );
}
