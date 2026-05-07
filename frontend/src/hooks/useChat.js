import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { SiweMessage } from "siwe";
import {
  chatApi,
  ChatApiError,
  getStoredToken,
  setStoredToken,
} from "../lib/chatApi.js";
import { getSocket, disconnectSocket } from "../lib/chatSocket.js";

/** Auth + token lifecycle. Triggers SIWE signing on demand. */
export function useChatAuth() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState(() => getStoredToken(address));
  const [error, setError] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [trackedAddress, setTrackedAddress] = useState(address);

  // Re-read the token from storage when the connected wallet changes.
  // Using "store info from previous render" instead of an effect avoids
  // the cascading-render lint rule.
  if (trackedAddress !== address) {
    setTrackedAddress(address);
    setToken(getStoredToken(address));
    setError(null);
  }

  // Validate stored token on mount; clear if expired/rejected.
  useEffect(() => {
    if (!token || !address) return;
    let cancelled = false;
    chatApi.me(token).catch((err) => {
      if (cancelled) return;
      if (err instanceof ChatApiError && err.status === 401) {
        setStoredToken(address, null);
        setToken(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, address]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Connect a wallet first");
    setIsSigning(true);
    setError(null);
    try {
      const { nonce } = await chatApi.nonce();
      const siwe = new SiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to ChainMart chat",
        uri: window.location.origin,
        version: "1",
        chainId: Number(chainId) || 1,
        nonce,
        issuedAt: new Date().toISOString(),
      });
      const message = siwe.prepareMessage();
      const signature = await signMessageAsync({ message });
      const { token: jwt } = await chatApi.verify(message, signature);
      setStoredToken(address, jwt);
      setToken(jwt);
      return jwt;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSigning(false);
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(() => {
    setStoredToken(address, null);
    setToken(null);
    disconnectSocket();
  }, [address]);

  return { token, address, isAuthed: Boolean(token), isSigning, error, signIn, signOut };
}

/** List of conversations for the signed-in user. Polls every 10s as a fallback. */
export function useConversations(token) {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const { conversations } = await chatApi.listConversations(token);
      setConversations(conversations);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const [trackedToken, setTrackedToken] = useState(token);
  if (trackedToken !== token) {
    setTrackedToken(token);
    if (!token) setConversations([]);
  }

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
    const id = setInterval(refetch, 10_000);
    return () => clearInterval(id);
  }, [token, refetch]);

  return { conversations, isLoading, error, refetch };
}

/** Live messages for one conversation. Joins room, listens for `message:new`. */
export function useConversationMessages(token, conversationId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const socket = useMemo(() => (token ? getSocket(token) : null), [token]);

  const [trackedKey, setTrackedKey] = useState(`${token ?? ""}:${conversationId ?? ""}`);
  const currentKey = `${token ?? ""}:${conversationId ?? ""}`;
  if (trackedKey !== currentKey) {
    setTrackedKey(currentKey);
    if (!token || !conversationId) setMessages([]);
  }

  useEffect(() => {
    if (!token || !conversationId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    chatApi
      .listMessages(token, conversationId)
      .then(({ messages }) => {
        if (!cancelled) setMessages(messages);
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("conversation:join", { conversationId });
    const onNew = (msg) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
      socket.emit("conversation:leave", { conversationId });
    };
  }, [socket, conversationId]);

  const sendMessage = useCallback(
    (body) =>
      new Promise((resolve, reject) => {
        if (!socket) return reject(new Error("Not connected"));
        socket.emit("message:send", { conversationId, body }, (ack) => {
          if (ack?.error) reject(new Error(ack.error));
          else resolve(ack?.message);
        });
      }),
    [socket, conversationId],
  );

  const markRead = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit("message:read", { conversationId });
  }, [socket, conversationId]);

  return { messages, isLoading, error, sendMessage, markRead };
}
