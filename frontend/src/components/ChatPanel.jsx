import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { truncateAddress } from "../lib/format.js";
import { useConversationMessages } from "../hooks/useChat.js";

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export default function ChatPanel({ token, conversation, myAddress }) {
  const { messages, isLoading, sendMessage, markRead } =
    useConversationMessages(token, conversation?.id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    markRead();
  }, [messages, markRead]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-fb-subtle text-sm">
        Select a conversation to start chatting.
      </div>
    );
  }

  const me = myAddress?.toLowerCase();
  const peer =
    conversation.address_a === me ? conversation.address_b : conversation.address_a;

  async function onSubmit(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage(body);
      setDraft("");
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-4 py-3 border-b border-fb-border bg-fb-surface">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fb-text truncate">
              {conversation.listing_title || `Listing #${conversation.listing_id}`}
            </p>
            <p className="text-xs font-mono text-fb-subtle">
              with {truncateAddress(peer)}
            </p>
          </div>
          <Link
            to={`/listing/${conversation.listing_id}`}
            className="text-xs text-fb-accent hover:underline shrink-0"
          >
            View listing
          </Link>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-fb-bg"
      >
        {isLoading && (
          <p className="text-center text-xs text-fb-subtle">Loading messages…</p>
        )}
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-xs text-fb-subtle">
            No messages yet — say hi.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={[
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-card",
                  mine
                    ? "bg-fb-accent text-white"
                    : "bg-fb-surface text-fb-text",
                ].join(" ")}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "text-white/70" : "text-fb-subtle"
                  }`}
                >
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={onSubmit}
        className="px-4 py-3 border-t border-fb-border bg-fb-surface"
      >
        {sendError && (
          <p className="mb-2 text-xs text-fb-danger">{sendError}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message…"
            disabled={sending}
            className="flex-1 h-10 px-3 rounded-full bg-fb-bg border border-transparent
                       focus:bg-white focus:border-fb-border focus:outline-none
                       text-sm placeholder:text-fb-subtle disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="h-10 px-4 rounded-full bg-fb-accent text-white text-sm font-semibold hover:bg-fb-accentHover disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
