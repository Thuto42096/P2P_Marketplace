import { Link, useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSearch } from "../lib/searchContext.js";

export default function Header() {
  const { search, setSearch } = useSearch();
  const navigate = useNavigate();

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
          <ConnectButton
            accountStatus="address"
            chainStatus="icon"
            showBalance={false}
          />
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
