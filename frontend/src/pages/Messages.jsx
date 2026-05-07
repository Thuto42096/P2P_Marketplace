import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { chatApi } from "../lib/chatApi.js";
import { useChatAuth, useConversations } from "../hooks/useChat.js";
import ConversationList from "../components/ConversationList.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

export default function Messages() {
  const { id } = useParams();
  const { token, address, isAuthed, isSigning, error, signIn } = useChatAuth();
  const { conversations, refetch } = useConversations(token);
  const [active, setActive] = useState(null);
  const [activeError, setActiveError] = useState(null);

  // Refresh sidebar when the active conversation receives a message,
  // so unread counts and last-message previews stay in sync.
  useEffect(() => {
    if (!token) return;
    const i = setInterval(refetch, 4_000);
    return () => clearInterval(i);
  }, [token, refetch]);

  const [trackedKey, setTrackedKey] = useState(`${token ?? ""}:${id ?? ""}`);
  const currentKey = `${token ?? ""}:${id ?? ""}`;
  if (trackedKey !== currentKey) {
    setTrackedKey(currentKey);
    if (!token || !id) {
      setActive(null);
      setActiveError(null);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveError(null);
    chatApi
      .getConversation(token, id)
      .then(({ conversation }) => !cancelled && setActive(conversation))
      .catch((err) => !cancelled && setActiveError(err));
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (!isAuthed) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-fb-surface rounded-xl shadow-card p-6 text-center">
        <h1 className="text-xl font-bold text-fb-text">Sign in to chat</h1>
        <p className="text-sm text-fb-subtle mt-2">
          Sign a one-time message with your wallet to authenticate to the
          ChainMart chat service. Your wallet won&apos;t be charged.
        </p>
        <button
          onClick={() => signIn().catch(() => {})}
          disabled={!address || isSigning}
          className="mt-4 w-full py-3 rounded-lg bg-fb-accent text-white font-semibold hover:bg-fb-accentHover disabled:opacity-60"
        >
          {isSigning ? "Waiting for signature…" : "Sign in with wallet"}
        </button>
        {error && (
          <p className="mt-3 text-sm text-fb-danger">
            {error.shortMessage || error.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-fb-surface rounded-xl shadow-card overflow-hidden h-[calc(100vh-7.5rem)] flex">
      <aside className="w-72 shrink-0 border-r border-fb-border overflow-y-auto">
        <div className="px-4 py-3 border-b border-fb-border">
          <h2 className="text-sm font-semibold text-fb-text">Messages</h2>
        </div>
        <ConversationList conversations={conversations} myAddress={address} />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {activeError ? (
          <div className="flex-1 flex items-center justify-center text-sm text-fb-danger">
            {activeError.message}
          </div>
        ) : (
          <ChatPanel token={token} conversation={active} myAddress={address} />
        )}
      </div>
    </div>
  );
}
