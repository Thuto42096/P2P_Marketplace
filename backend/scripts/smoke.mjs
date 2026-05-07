// End-to-end smoke test: SIWE login (x2 wallets), create conversation,
// open WebSocket, exchange a message, fetch history.
import { privateKeyToAccount } from "viem/accounts";
import { SiweMessage } from "siwe";
import { io } from "socket.io-client";

const API = "http://localhost:4000";

async function siweLogin(account, chainId = 31337) {
  const { nonce } = await (await fetch(`${API}/auth/nonce`)).json();
  const msg = new SiweMessage({
    domain: "localhost:5173",
    address: account.address,
    statement: "Sign in to ChainMart chat",
    uri: "http://localhost:5173",
    version: "1",
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  }).prepareMessage();
  const signature = await account.signMessage({ message: msg });
  const r = await fetch(`${API}/auth/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: msg, signature }),
  });
  if (!r.ok) throw new Error(`verify failed: ${r.status} ${await r.text()}`);
  return (await r.json()).token;
}

async function api(token, path, opts = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), authorization: `Bearer ${token}`, "content-type": "application/json" },
  });
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${path} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

const buyer = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const seller = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");

const buyerJwt = await siweLogin(buyer);
const sellerJwt = await siweLogin(seller);
console.log("✓ both wallets signed in");

const { conversation } = await api(buyerJwt, "/conversations", {
  method: "POST",
  body: JSON.stringify({ chainId: 31337, listingId: 42, listingTitle: "Test Item", peer: seller.address }),
});
console.log("✓ conversation:", conversation.id);

const buyerSocket = io(API, { auth: { token: buyerJwt }, transports: ["websocket"] });
const sellerSocket = io(API, { auth: { token: sellerJwt }, transports: ["websocket"] });

await new Promise((res) => buyerSocket.on("connect", res));
await new Promise((res) => sellerSocket.on("connect", res));
console.log("✓ both sockets connected");

await new Promise((res) => buyerSocket.emit("conversation:join", { conversationId: conversation.id }, res));
await new Promise((res) => sellerSocket.emit("conversation:join", { conversationId: conversation.id }, res));
console.log("✓ joined room");

const received = new Promise((res) => sellerSocket.once("message:new", res));
await new Promise((res) => buyerSocket.emit("message:send", { conversationId: conversation.id, body: "hello from buyer" }, res));
const incoming = await received;
console.log("✓ seller received:", incoming.body, "from", incoming.sender);

const { messages } = await api(sellerJwt, `/conversations/${conversation.id}/messages`);
console.log(`✓ history has ${messages.length} message(s):`, messages.map((m) => m.body));

const { conversations } = await api(sellerJwt, `/conversations`);
console.log(`✓ seller sees ${conversations.length} conversation(s); unread=${conversations[0].unread_count}`);

buyerSocket.disconnect();
sellerSocket.disconnect();
console.log("ALL OK");
process.exit(0);
