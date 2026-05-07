// Thin REST client for the chat backend. Tokens are kept in localStorage,
// keyed by lower-case wallet address so multiple wallets on one browser don't
// clobber each other.

export const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL || "http://localhost:4000";

const tokenKey = (address) => `chainmart.chat.jwt.${address.toLowerCase()}`;

export function getStoredToken(address) {
  if (!address) return null;
  return localStorage.getItem(tokenKey(address));
}

export function setStoredToken(address, token) {
  if (!address) return;
  if (token) localStorage.setItem(tokenKey(address), token);
  else localStorage.removeItem(tokenKey(address));
}

export class ChatApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { token, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${CHAT_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ChatApiError(res.status, data?.error || res.statusText);
  }
  return data;
}

export const chatApi = {
  nonce: () => request("/auth/nonce"),
  verify: (message, signature) =>
    request("/auth/verify", { method: "POST", body: { message, signature } }),
  me: (token) => request("/me", { token }),
  listConversations: (token) => request("/conversations", { token }),
  getOrCreateConversation: (token, payload) =>
    request("/conversations", { token, method: "POST", body: payload }),
  getConversation: (token, id) => request(`/conversations/${id}`, { token }),
  listMessages: (token, id, { before, limit } = {}) => {
    const qs = new URLSearchParams();
    if (before !== undefined) qs.set("before", String(before));
    if (limit !== undefined) qs.set("limit", String(limit));
    const suffix = qs.toString() ? `?${qs}` : "";
    return request(`/conversations/${id}/messages${suffix}`, { token });
  },
  markRead: (token, id) =>
    request(`/conversations/${id}/read`, { token, method: "POST" }),
};
