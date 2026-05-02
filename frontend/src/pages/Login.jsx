import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnections,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import hero from "../assets/hero.png";
import hero2 from "../assets/hero2.png";

function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, variables, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  useConnections();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (isConnected) navigate(from, { replace: true });
  }, [isConnected, from, navigate]);

  const supportedChain = chains.find((c) => c.id === chainId);
  const visibleConnectors = connectors.filter(
    (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i
  );

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-fb-accent to-fb-success text-white p-12">
        <div className="text-3xl font-extrabold tracking-tight">ChainMart</div>

        <div className="space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Buy and sell with stablecoins, secured by escrow.
          </h1>
          <p className="text-base text-white/80">
            ChainMart is a peer-to-peer marketplace where funds stay in a smart
            contract until the buyer confirms receipt. No middlemen, no
            chargebacks.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <img
              src={hero}
              alt=""
              className="rounded-xl shadow-cardHover w-full opacity-95"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <img
              src={hero2}
              alt=""
              className="rounded-xl shadow-cardHover w-full opacity-95"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        <p className="text-xs text-white/70">
          Funds are held in escrow until both parties are satisfied.
        </p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="text-fb-accent text-3xl font-extrabold tracking-tight">
              ChainMart
            </div>
            <p className="text-sm text-fb-subtle mt-1">
              Peer-to-peer marketplace, settled on-chain.
            </p>
          </div>

          <div className="bg-fb-surface rounded-2xl shadow-card border border-fb-border p-8">
            <h2 className="text-2xl font-bold text-fb-text">Welcome back</h2>
            <p className="text-sm text-fb-subtle mt-1">
              Connect your wallet to start buying and selling.
            </p>

            <div className="mt-8">
              {!isConnected ? (
                <div className="space-y-2">
                  {visibleConnectors.length === 0 ? (
                    <p className="text-sm text-fb-subtle text-center">
                      No wallet detected. Install MetaMask or another browser
                      wallet, then refresh.
                    </p>
                  ) : (
                    visibleConnectors.map((connector) => {
                      const pendingThis =
                        isPending && variables?.connector?.id === connector.id;
                      return (
                        <button
                          key={connector.uid}
                          type="button"
                          onClick={() => connect({ connector })}
                          disabled={isPending}
                          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-fb-accent text-white font-semibold text-base hover:bg-fb-accentHover transition-colors disabled:opacity-60"
                        >
                          <WalletIcon />
                          {pendingThis
                            ? "Connecting…"
                            : `Connect ${connector.name}`}
                        </button>
                      );
                    })
                  )}
                  {error ? (
                    <p className="text-xs text-fb-danger text-center">
                      {error.shortMessage || error.message}
                    </p>
                  ) : null}
                </div>
              ) : !supportedChain ? (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: chains[0].id })}
                  className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-fb-danger text-white font-semibold text-base hover:opacity-90 transition-opacity"
                >
                  Wrong network — switch
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => disconnect()}
                    className="w-full inline-flex items-center justify-between h-12 px-4 rounded-xl border border-fb-border bg-fb-bg text-fb-text font-medium hover:bg-white"
                  >
                    <span className="truncate">{shortAddress(address)}</span>
                    <span className="text-xs text-fb-subtle">
                      {supportedChain.name}
                    </span>
                  </button>
                  <p className="text-xs text-center text-fb-subtle">
                    Redirecting to your dashboard…
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-fb-border">
              <p className="text-xs text-fb-subtle leading-relaxed">
                By connecting a wallet, you agree to use ChainMart at your own
                discretion. We never take custody of your funds.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2h2v6h-2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="12" r="1.25" fill="currentColor" />
    </svg>
  );
}
