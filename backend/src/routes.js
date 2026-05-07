import { Router } from "express";
import {
  issueNonce,
  verifySiwe,
  signSession,
  requireAuth,
} from "./auth.js";
import {
  getOrCreateConversation,
  listConversationsForAddress,
  getConversation,
  listMessages,
  markRead,
  isParticipant,
} from "./db.js";

export function buildRouter() {
  const router = Router();

  router.get("/health", (_req, res) => res.json({ ok: true }));

  router.get("/auth/nonce", (_req, res) => {
    res.json({ nonce: issueNonce() });
  });

  router.post("/auth/verify", async (req, res) => {
    try {
      const { message, signature } = req.body || {};
      if (!message || !signature) {
        return res.status(400).json({ error: "message and signature required" });
      }
      const address = await verifySiwe({ message, signature });
      const token = signSession(address);
      res.json({ token, address });
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ address: req.address });
  });

  router.get("/conversations", requireAuth, (req, res) => {
    res.json({ conversations: listConversationsForAddress(req.address) });
  });

  router.post("/conversations", requireAuth, (req, res) => {
    const { chainId, listingId, listingTitle, peer } = req.body || {};
    if (chainId === undefined || listingId === undefined || !peer) {
      return res
        .status(400)
        .json({ error: "chainId, listingId and peer are required" });
    }
    if (peer.toLowerCase() === req.address) {
      return res.status(400).json({ error: "Cannot chat with yourself" });
    }
    const conv = getOrCreateConversation({
      chainId: Number(chainId),
      listingId: Number(listingId),
      listingTitle: listingTitle || null,
      me: req.address,
      peer,
    });
    res.json({ conversation: conv });
  });

  router.get("/conversations/:id", requireAuth, (req, res) => {
    const conv = getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (!isParticipant(conv, req.address)) {
      return res.status(403).json({ error: "Not a participant" });
    }
    res.json({ conversation: conv });
  });

  router.get("/conversations/:id/messages", requireAuth, (req, res) => {
    const conv = getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (!isParticipant(conv, req.address)) {
      return res.status(403).json({ error: "Not a participant" });
    }
    const before = req.query.before ? Number(req.query.before) : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const messages = listMessages({ conversationId: conv.id, before, limit });
    res.json({ messages });
  });

  router.post("/conversations/:id/read", requireAuth, (req, res) => {
    const conv = getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ error: "Not found" });
    if (!isParticipant(conv, req.address)) {
      return res.status(403).json({ error: "Not a participant" });
    }
    const updated = markRead({ conversationId: conv.id, reader: req.address });
    res.json({ updated });
  });

  return router;
}
