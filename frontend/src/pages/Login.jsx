import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import hero from "../assets/hero.png";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useAccount();

  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (isConnected) navigate(from, { replace: true });
  }, [isConnected, from, navigate]);

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      <aside className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-fb-accent to-blue-700 text-white p-12">
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
          <img
            src={hero}
            alt=""
            className="rounded-xl shadow-cardHover w-full max-w-sm opacity-95"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
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
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready =
                    mounted && authenticationStatus !== "loading";
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === "authenticated");

                  return (
                    <div
                      aria-hidden={!ready}
                      style={{
                        opacity: ready ? 1 : 0,
                        pointerEvents: ready ? "auto" : "none",
                        userSelect: ready ? "auto" : "none",
                      }}
                    >
                      {!connected ? (
                        <button
                          type="button"
                          onClick={openConnectModal}
                          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-fb-accent text-white font-semibold text-base hover:bg-fb-accentHover transition-colors"
                        >
                          <WalletIcon />
                          Connect wallet
                        </button>
                      ) : chain.unsupported ? (
                        <button
                          type="button"
                          onClick={openChainModal}
                          className="w-full inline-flex items-center justify-center h-12 rounded-xl bg-fb-danger text-white font-semibold text-base hover:opacity-90 transition-opacity"
                        >
                          Wrong network — switch
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <button
                            type="button"
                            onClick={openAccountModal}
                            className="w-full inline-flex items-center justify-between h-12 px-4 rounded-xl border border-fb-border bg-fb-bg text-fb-text font-medium hover:bg-white"
                          >
                            <span className="truncate">
                              {account.displayName}
                            </span>
                            <span className="text-xs text-fb-subtle">
                              {chain.name}
                            </span>
                          </button>
                          <p className="text-xs text-center text-fb-subtle">
                            Redirecting to your dashboard…
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
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
