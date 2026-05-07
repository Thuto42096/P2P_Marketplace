import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { buildRouter } from "./routes.js";
import { attachSocket } from "./socket.js";

const port = Number(process.env.PORT) || 4000;
const corsOrigin = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "32kb" }));
app.use(buildRouter());

const server = http.createServer(app);
attachSocket(server, { corsOrigin });

server.listen(port, () => {
  console.log(`[chainmart-chat] listening on http://localhost:${port}`);
  console.log(`[chainmart-chat] CORS allowed: ${corsOrigin.join(", ")}`);
});
