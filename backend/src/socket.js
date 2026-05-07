import { Server } from "socket.io";
import { verifySession } from "./auth.js";
import {
  getConversation,
  insertMessage,
  isParticipant,
  markRead,
} from "./db.js";

const MAX_BODY_LEN = 4000;

export function attachSocket(httpServer, { corsOrigin }) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing token"));
    try {
      socket.data.address = verifySession(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const me = socket.data.address;

    socket.on("conversation:join", ({ conversationId }, ack) => {
      const conv = getConversation(Number(conversationId));
      if (!conv || !isParticipant(conv, me)) {
        return ack?.({ error: "Not a participant" });
      }
      socket.join(`conv:${conv.id}`);
      ack?.({ ok: true });
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      socket.leave(`conv:${Number(conversationId)}`);
    });

    socket.on("message:send", ({ conversationId, body }, ack) => {
      try {
        const conv = getConversation(Number(conversationId));
        if (!conv || !isParticipant(conv, me)) {
          return ack?.({ error: "Not a participant" });
        }
        const trimmed = String(body || "").trim();
        if (!trimmed) return ack?.({ error: "Empty message" });
        if (trimmed.length > MAX_BODY_LEN) {
          return ack?.({ error: "Message too long" });
        }
        const msg = insertMessage({
          conversationId: conv.id,
          sender: me,
          body: trimmed,
        });
        io.to(`conv:${conv.id}`).emit("message:new", msg);
        ack?.({ message: msg });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });

    socket.on("message:read", ({ conversationId }, ack) => {
      const conv = getConversation(Number(conversationId));
      if (!conv || !isParticipant(conv, me)) {
        return ack?.({ error: "Not a participant" });
      }
      const updated = markRead({ conversationId: conv.id, reader: me });
      socket.to(`conv:${conv.id}`).emit("message:read", { conversationId: conv.id, reader: me });
      ack?.({ updated });
    });
  });

  return io;
}
