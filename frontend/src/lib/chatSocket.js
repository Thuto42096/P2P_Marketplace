import { io } from "socket.io-client";
import { CHAT_API_URL } from "./chatApi.js";

let currentSocket = null;
let currentToken = null;

/** Returns a singleton socket bound to the current token. Reconnects on token change. */
export function getSocket(token) {
  if (!token) {
    if (currentSocket) {
      currentSocket.disconnect();
      currentSocket = null;
      currentToken = null;
    }
    return null;
  }
  if (currentSocket && currentToken === token) return currentSocket;
  if (currentSocket) currentSocket.disconnect();

  currentToken = token;
  currentSocket = io(CHAT_API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return currentSocket;
}

export function disconnectSocket() {
  if (currentSocket) {
    currentSocket.disconnect();
    currentSocket = null;
    currentToken = null;
  }
}
