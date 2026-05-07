import { SiweMessage, generateNonce } from "siwe";
import jwt from "jsonwebtoken";

// Nonces are kept in memory; restart wipes them, which is fine for dev.
const nonces = new Map(); // nonce -> { issuedAt }
const NONCE_TTL_MS = 10 * 60 * 1000;

function pruneNonces() {
  const cutoff = Date.now() - NONCE_TTL_MS;
  for (const [n, info] of nonces) if (info.issuedAt < cutoff) nonces.delete(n);
}

export function issueNonce() {
  pruneNonces();
  const nonce = generateNonce();
  nonces.set(nonce, { issuedAt: Date.now() });
  return nonce;
}

function consumeNonce(nonce) {
  pruneNonces();
  const info = nonces.get(nonce);
  if (!info) return false;
  nonces.delete(nonce);
  return true;
}

export async function verifySiwe({ message, signature }) {
  const siwe = new SiweMessage(message);
  const expectedDomain = process.env.SIWE_DOMAIN;
  if (expectedDomain && siwe.domain !== expectedDomain) {
    throw new Error(`Unexpected SIWE domain: ${siwe.domain}`);
  }
  if (!consumeNonce(siwe.nonce)) {
    throw new Error("Unknown or expired nonce");
  }
  const result = await siwe.verify({ signature });
  if (!result.success) throw new Error("SIWE verification failed");
  return siwe.address.toLowerCase();
}

export function signSession(address) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign({ sub: address.toLowerCase() }, secret, { expiresIn });
}

export function verifySession(token) {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  const payload = jwt.verify(token, secret);
  return payload.sub;
}

/** Express middleware that populates req.address from the Bearer token. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const m = header.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: "Missing bearer token" });
  try {
    req.address = verifySession(m[1]);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
