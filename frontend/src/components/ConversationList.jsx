import { NavLink } from "react-router-dom";
import { truncateAddress } from "../lib/format.js";

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

export default function ConversationList({ conversations, myAddress }) {
  if (!conversations.length) {
    return (
      <div className="p-4 text-sm text-fb-subtle">
        No conversations yet. Start one from a listing page.
      </div>
    );
  }
  const me = myAddress?.toLowerCase();
  return (
    <ul className="divide-y divide-fb-border">
      {conversations.map((c) => {
        const peer = c.address_a === me ? c.address_b : c.address_a;
        const unread = Number(c.unread_count) || 0;
        return (
          <li key={c.id}>
            <NavLink
              to={`/messages/${c.id}`}
              className={({ isActive }) =>
                [
                  "block px-4 py-3 hover:bg-fb-bg",
                  isActive ? "bg-purple-50" : "",
                ].join(" ")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fb-text truncate">
                  {c.listing_title || `Listing #${c.listing_id}`}
                </p>
                <span className="text-xs text-fb-subtle shrink-0">
                  {relativeTime(c.last_message_at)}
                </span>
              </div>
              <p className="text-xs font-mono text-fb-subtle mt-0.5">
                {truncateAddress(peer)}
              </p>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className="text-sm text-fb-subtle truncate">
                  {c.last_message || "No messages yet"}
                </p>
                {unread > 0 && (
                  <span className="ml-2 shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-fb-accent text-white text-xs font-semibold">
                    {unread}
                  </span>
                )}
              </div>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
