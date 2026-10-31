// Le PC de la maison : `npm run dev`
// - sert l'app sur http://localhost:5174 (la même que celle en ligne)
// - analyse les imports envoyés de partout (file d'attente dans Firestore) avec ton Claude
// Ouvre une fois http://localhost:5174 et connecte-toi : ce PC devient celui qui analyse tes reels.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotEnv(path.join(here, ".env"));

const { engineInfo } = await import("./lib/analyze.js");
const { loadSession, saveSession, clearSession } = await import("./lib/firestore-rest.js");
const { createWorker } = await import("./lib/worker.js");
const { APP_URL, OWNER_EMAILS } = await import("./public/js/config.js");

const PORT = Number(process.env.PORT) || 5174;
const PUBLIC_DIR = path.join(here, "public");
const SESSION_FILE = path.join(here, ".ada-session.json");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

let worker = null;
function startWorker(session) {
  worker?.stop();
  worker = createWorker({ session, sessionFile: SESSION_FILE });
  console.log(`  🏠 Ce PC analyse les imports de ${session.email}`);
}
const existing = loadSession(SESSION_FILE);
if (existing) startWorker(existing);

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 50_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("too_large"), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

// Le jeton de connexion ne se confie que depuis ce PC, jamais depuis le Wi-Fi.
const fromThisPc = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!file.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: "forbidden" });
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(PUBLIC_DIR, "index.html"); // fallback SPA
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    sendJson(res, 404, { error: "not_found" });
  }
}

const lanUrls = () =>
  Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254."))
    .map((i) => `http://${i.address}:${PORT}`);

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        local: true,
        ...engineInfo(),
        paired: worker ? { uid: worker.uid, email: worker.email } : null,
        worker: worker ? { ...worker.status } : null,
        appUrl: APP_URL,
        lan: lanUrls(),
      });
    }
    if (pathname === "/api/pair" && req.method === "POST") {
      if (!fromThisPc(req)) return sendJson(res, 403, { error: "Uniquement depuis ce PC (http://localhost)." });
      const { uid, email, refreshToken } = await readBody(req);
      if (!uid || !refreshToken || !OWNER_EMAILS.includes(email)) return sendJson(res, 400, { error: "Compte non autorisé." });
      const session = { uid, email, refreshToken, deviceId: loadSession(SESSION_FILE)?.deviceId || randomUUID(), pairedAt: new Date().toISOString() };
      saveSession(SESSION_FILE, session);
      startWorker(session);
      return sendJson(res, 200, { ok: true });
    }
    if (pathname === "/api/unpair" && req.method === "POST") {
      if (!fromThisPc(req)) return sendJson(res, 403, { error: "Uniquement depuis ce PC." });
      worker?.stop();
      worker = null;
      clearSession(SESSION_FILE);
      return sendJson(res, 200, { ok: true });
    }
    if (pathname === "/api/kick" && req.method === "POST") {
      worker?.kick();
      return sendJson(res, 200, { ok: Boolean(worker) });
    }
    if (pathname.startsWith("/api/")) return sendJson(res, 404, { error: "Route inconnue." });
    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, error.status || 500, { error: "Erreur inattendue du serveur." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const { engine, model, cli } = engineInfo();
  const engineLabel = { api: `API Anthropic (${model})`, cli: `Claude Code ${cli ? `${cli.split(" ")[0]} ` : ""}(${model})`, command: `ta commande d'IA (${model})`, local: "sans IA — analyse de la légende" }[engine];
  console.log(`\n  ⌨️  Ada — le PC de la maison\n\n  App en ligne : ${APP_URL}\n  Sur ce PC    : http://localhost:${PORT}`);
  console.log(`  Analyse      : ${engineLabel}`);
  if (!worker) console.log(`\n  → Ouvre http://localhost:${PORT} et connecte-toi : ce PC analysera tes imports.`);
  console.log("");
});
