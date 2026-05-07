import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || "./data/chat.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id        INTEGER NOT NULL,
    listing_id      INTEGER NOT NULL,
    listing_title   TEXT,
    address_a       TEXT NOT NULL,
    address_b       TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    last_message_at INTEGER NOT NULL,
    UNIQUE(chain_id, listing_id, address_a, address_b)
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_a ON conversations(address_a, last_message_at DESC);
  CREATE INDEX IF NOT EXISTS idx_conversations_b ON conversations(address_b, last_message_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender          TEXT NOT NULL,
    body            TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    read_at         INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, id DESC);
`);

/** Lower-case + sort two addresses so a pair always maps to one conversation row. */
export function normalizePair(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? [x, y] : [y, x];
}

const findStmt = db.prepare(`
  SELECT * FROM conversations
   WHERE chain_id = ? AND listing_id = ? AND address_a = ? AND address_b = ?
`);
const insertConvStmt = db.prepare(`
  INSERT INTO conversations
    (chain_id, listing_id, listing_title, address_a, address_b, created_at, last_message_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function getOrCreateConversation({ chainId, listingId, listingTitle, me, peer }) {
  const [a, b] = normalizePair(me, peer);
  const existing = findStmt.get(chainId, listingId, a, b);
  if (existing) return existing;
  const now = Date.now();
  const info = insertConvStmt.run(chainId, listingId, listingTitle ?? null, a, b, now, now);
  return findStmt.get(chainId, listingId, a, b) ?? { id: info.lastInsertRowid };
}

const listConvStmt = db.prepare(`
  SELECT c.*,
         (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,
         (SELECT sender FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender,
         (SELECT COUNT(*) FROM messages m
            WHERE m.conversation_id = c.id AND m.sender != ? AND m.read_at IS NULL) AS unread_count
    FROM conversations c
   WHERE c.address_a = ? OR c.address_b = ?
   ORDER BY c.last_message_at DESC
`);

export function listConversationsForAddress(addr) {
  const a = addr.toLowerCase();
  return listConvStmt.all(a, a, a);
}

const getConvStmt = db.prepare(`SELECT * FROM conversations WHERE id = ?`);
export function getConversation(id) {
  return getConvStmt.get(id);
}

const insertMsgStmt = db.prepare(`
  INSERT INTO messages (conversation_id, sender, body, created_at) VALUES (?, ?, ?, ?)
`);
const touchConvStmt = db.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`);
const getMsgStmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);

export function insertMessage({ conversationId, sender, body }) {
  const now = Date.now();
  const info = insertMsgStmt.run(conversationId, sender.toLowerCase(), body, now);
  touchConvStmt.run(now, conversationId);
  return getMsgStmt.get(info.lastInsertRowid);
}

const listMsgStmt = db.prepare(`
  SELECT * FROM messages
   WHERE conversation_id = ? AND (? IS NULL OR id < ?)
   ORDER BY id DESC
   LIMIT ?
`);
export function listMessages({ conversationId, before, limit = 50 }) {
  const rows = listMsgStmt.all(conversationId, before ?? null, before ?? null, limit);
  return rows.reverse();
}

const markReadStmt = db.prepare(`
  UPDATE messages SET read_at = ?
   WHERE conversation_id = ? AND sender != ? AND read_at IS NULL
`);
export function markRead({ conversationId, reader }) {
  return markReadStmt.run(Date.now(), conversationId, reader.toLowerCase()).changes;
}

export function isParticipant(conversation, addr) {
  if (!conversation || !addr) return false;
  const a = addr.toLowerCase();
  return conversation.address_a === a || conversation.address_b === a;
}
