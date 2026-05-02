import { Link, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import { useSearch } from "../lib/searchContext.js";

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Header() {
  const { search, setSearch } = useSearch();
  const navigate = useNavigate();
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  return (
    <header className="bg-fb-surface border-b border-fb-border sticky top-0 z-30">
      <div className="flex items-center gap-4 px-4 h-14">
        <Link
          to="/"
          className="flex items-baseline gap-2 shrink-0"
          aria-label="ChainMart home"
        >
          <span className="text-fb-accent text-2xl font-extrabold tracking-tight">
            ChainMart
          </span>
          <span className="hidden lg:inline text-xs text-fb-subtle">
            P2P stablecoin marketplace
          </span>
        </Link>

        <div className="flex-1 max-w-xl">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-fb-subtle">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (window.location.pathname !== "/") navigate("/");
              }}
              type="search"
              aria-label="Search ChainMart listings"
              placeholder="Search ChainMart"
              className="w-full pl-10 pr-3 h-10 rounded-full bg-fb-bg border border-transparent
                         focus:bg-white focus:border-fb-border focus:outline-none
                         text-sm placeholder:text-fb-subtle"
            />
          </div>
        </div>

        <div className="ml-auto">
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              title="Disconnect"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-fb-border bg-fb-bg text-fb-text text-sm font-medium hover:bg-white"
            >
              <span className="truncate max-w-[120px]">
                {shortAddress(address)}
              </span>
              <span className="text-xs text-fb-subtle hidden sm:inline">
                {chain?.name ?? `Chain ${chainId}`}
              </span>
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center h-9 px-4 rounded-full bg-fb-accent text-white text-sm font-semibold hover:bg-fb-accentHover transition-colors"
            >
              Connect
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="m20 20-3.5-3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
