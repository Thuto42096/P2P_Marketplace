import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { useTxButton } from "../hooks/useTxButton.js";
import {
  useContractAddresses,
  useTokenMeta,
} from "../hooks/useMarketplace.js";
import { marketplaceAbi } from "../config/contracts.js";
import NoContractBanner from "../components/NoContractBanner.jsx";

export default function CreateListing() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { marketplace, stablecoin } = useContractAddresses();
  const { symbol, decimals } = useTokenMeta(stablecoin);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageURI: "",
  });

  const tx = useTxButton({
    onSuccess: () => navigate("/sell"),
  });

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!marketplace || !stablecoin) return;
    let priceWei;
    try {
      priceWei = parseUnits(form.price || "0", decimals);
    } catch {
      return;
    }
    if (priceWei <= 0n || !form.name.trim()) return;

    tx.write({
      abi: marketplaceAbi,
      address: marketplace,
      functionName: "createListing",
      args: [
        form.name.trim(),
        form.description.trim(),
        priceWei,
        form.imageURI.trim(),
        stablecoin,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="bg-fb-surface rounded-xl p-8 text-center shadow-card">
        <p className="text-fb-text">Connect your wallet to create a listing.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <NoContractBanner />
      <h1 className="text-2xl font-bold text-fb-text mb-1">Create new listing</h1>
      <p className="text-sm text-fb-subtle mb-6">
        Buyers will pay in <span className="font-medium">{symbol}</span> and
        funds are held in escrow until they confirm receipt.
      </p>

      <form
        onSubmit={submit}
        className="bg-fb-surface rounded-xl shadow-card p-6 space-y-4"
      >
        <Field label="Title" required>
          <input
            value={form.name}
            onChange={update("name")}
            required
            maxLength={120}
            placeholder="What are you selling?"
            className="input"
          />
        </Field>

        <Field label={`Price (${symbol})`} required>
          <input
            value={form.price}
            onChange={update("price")}
            required
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="100"
            className="input"
          />
        </Field>

        <Field label="Image URL or IPFS URI">
          <input
            value={form.imageURI}
            onChange={update("imageURI")}
            type="url"
            placeholder="https://… or ipfs://Qm…"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={form.description}
            onChange={update("description")}
            rows={5}
            placeholder="Condition, dimensions, shipping notes…"
            className="input resize-y"
          />
        </Field>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={tx.isPending || tx.isMining}
            className="px-6 py-2.5 rounded-lg bg-fb-accent text-white font-semibold hover:bg-fb-accentHover disabled:opacity-60"
          >
            {tx.status || "Publish listing"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2.5 rounded-lg text-fb-subtle hover:bg-fb-bg"
          >
            Cancel
          </button>
        </div>

        {tx.error && (
          <p className="text-sm text-fb-danger">
            {tx.error.shortMessage || tx.error.message}
          </p>
        )}
      </form>

      <style>{`.input{display:block;width:100%;padding:.55rem .75rem;border:1px solid #dddfe2;border-radius:.5rem;font-size:.9rem;background:#fff;outline:none}.input:focus{border-color:#1877f2;box-shadow:0 0 0 3px rgba(24,119,242,.15)}`}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-fb-text mb-1">
        {label}
        {required && <span className="text-fb-danger ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
