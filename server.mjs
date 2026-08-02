#!/usr/bin/env node
/**
 * Envelopes — application server (multi-user)
 *
 * Serves the built front end, stores each account's budget server-side, and
 * brokers SimpleFIN separately per account. Every user gets their own budget
 * and their own bank connection; nothing is shared between accounts.
 *
 * Requirements: Node 18+ (built-in fetch). No npm install needed.
 *
 * Local, signup open:
 *   node server.mjs
 *
 * Exposed to the network — a signup code is required to create the first account:
 *   ENVELOPE_SIGNUP_CODE='...' HOST=0.0.0.0 node server.mjs
 *
 * Environment:
 *   PORT                  default 4000
 *   HOST                  default 127.0.0.1. Set 0.0.0.0 to accept LAN traffic.
 *   ENVELOPE_SIGNUP_CODE  needed to register when bound publicly
 *   DATA_DIR              default ~/.envelope
 *   TRUST_PROXY           set to 1 behind Cloudflare/nginx so Secure cookies work
 *
 * On disk:
 *   DATA_DIR/secret                     signs session cookies
 *   DATA_DIR/users.json                 emails + scrypt hashes, never plaintext
 *   DATA_DIR/users/<id>/state.json      that account's budget
 *   DATA_DIR/users/<id>/simplefin.json  that account's bank access URL
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || "127.0.0.1";
const SIGNUP_CODE = process.env.ENVELOPE_SIGNUP_CODE || "";
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const DATA_DIR = (process.env.DATA_DIR || path.join(os.homedir(), ".envelope")).replace(/^~(?=$|\/)/, os.homedir());
const DIST = path.join(HERE, "dist");

const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET_FILE = path.join(DATA_DIR, "secret");
const USERS_DIR = path.join(DATA_DIR, "users");
const LEGACY_STATE = path.join(DATA_DIR, "state.json");
const LEGACY_SFIN = path.join(DATA_DIR, "simplefin.json");

const LOOPBACK = ["127.0.0.1", "localhost", "::1"].includes(HOST);

/* ---------- disk ---------- */

fs.mkdirSync(USERS_DIR, { recursive: true, mode: 0o700 });

const readJSON = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
};

/** temp file + rename, so a crash can't leave a half-written budget */
function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

const SECRET = (() => {
  const existing = (() => { try { return fs.readFileSync(SECRET_FILE, "utf8").trim(); } catch { return ""; } })();
  if (existing) return existing;
  const s = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return s;
})();

const loadUsers = () => readJSON(USERS_FILE, []);
const saveUsers = (u) => writeJSON(USERS_FILE, u);

if (!LOOPBACK && !SIGNUP_CODE && loadUsers().length === 0) {
  console.error("\nRefusing to start.\n");
  console.error(`HOST is ${HOST}, which accepts connections from other machines,`);
  console.error("there are no accounts yet, and no signup code is set — so the");
  console.error("first stranger to find this port could claim the server.\n");
  console.error("Set a code:  ENVELOPE_SIGNUP_CODE='...' HOST=0.0.0.0 node server.mjs\n");
  process.exit(1);
}

/* ---------- passwords ---------- */

const hashPassword = (password, salt) => crypto.scryptSync(String(password), salt, 64).toString("hex");

function makeUser(email, password, admin) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id: crypto.randomBytes(8).toString("hex"),
    email: String(email).toLowerCase().trim(),
    salt,
    hash: hashPassword(password, salt),
    admin: Boolean(admin),
    createdAt: new Date().toISOString(),
  };
}

/** Accounts created before emails were required identify by username. */
const identityOf = (u) => (u.email || u.username || "").toLowerCase();
const findUser = (users, given) => {
  const g = String(given || "").toLowerCase().trim();
  return users.find((u) => identityOf(u) === g) || null;
};

function checkPassword(user, password) {
  const a = Buffer.from(hashPassword(password, user.salt), "hex");
  const b = Buffer.from(user.hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateCredentials(email, password) {
  if (!EMAIL_OK.test(String(email || "").trim())) return "That doesn't look like an email address";
  if (String(password || "").length < 8) return "Passwords need at least 8 characters";
  return null;
}

/* ---------- sessions ---------- */

const SESSION_DAYS = 30;
const sign = (p) => crypto.createHmac("sha256", SECRET).update(p).digest("base64url");

function makeToken(userId) {
  const payload = `${userId}.${Date.now() + SESSION_DAYS * 86400000}`;
  return `${payload}.${sign(payload)}`;
}

function tokenUser(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = sign(`${userId}.${exp}`);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) <= Date.now()) return null;
  return loadUsers().find((u) => u.id === userId) || null;
}

const cookies = (req) =>
  Object.fromEntries((req.headers.cookie || "").split(";").map((c) => {
    const i = c.indexOf("=");
    return i < 0 ? ["", ""] : [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
  }));

const currentUser = (req) => tokenUser(cookies(req).envelope_session);

const sessionCookie = (userId, secure) => [
  `envelope_session=${makeToken(userId)}`,
  "Path=/", "HttpOnly", "SameSite=Lax",
  `Max-Age=${SESSION_DAYS * 86400}`,
  secure ? "Secure" : "",
].filter(Boolean).join("; ");

const failures = new Map();
const throttle = (ip) => { const n = failures.get(ip) || 0; return n < 3 ? 0 : Math.min(5000, 250 * 2 ** (n - 3)); };

/* ---------- per-user paths ---------- */

const stateFile = (user) => path.join(USERS_DIR, user.id, "state.json");
const sfinFile = (user) => path.join(USERS_DIR, user.id, "simplefin.json");

/** First account inherits any single-user data from before accounts existed. */
function adoptLegacyData(user) {
  try {
    if (fs.existsSync(LEGACY_STATE) && !fs.existsSync(stateFile(user))) {
      fs.mkdirSync(path.dirname(stateFile(user)), { recursive: true, mode: 0o700 });
      fs.renameSync(LEGACY_STATE, stateFile(user));
      console.log(`Moved existing budget into account "${user.username}"`);
    }
    if (fs.existsSync(LEGACY_SFIN) && !fs.existsSync(sfinFile(user))) {
      fs.renameSync(LEGACY_SFIN, sfinFile(user));
      console.log(`Moved existing bank connection into account "${user.username}"`);
    }
  } catch (e) {
    console.warn("Couldn't adopt legacy data:", e.message);
  }
}

/* ---------- SimpleFIN ---------- */

async function claimSetupToken(setupToken) {
  let claimUrl;
  try { claimUrl = Buffer.from(String(setupToken).trim(), "base64").toString("utf8").trim(); }
  catch { throw new Error("That setup token isn't valid base64"); }
  if (!/^https:\/\//.test(claimUrl)) throw new Error("Setup token didn't decode to an https claim URL");

  const res = await fetch(claimUrl, { method: "POST", headers: { "Content-Length": "0" } });
  const body = (await res.text()).trim();
  if (!res.ok) throw new Error(`Bridge rejected the claim (${res.status}): ${body.slice(0, 200)}`);
  if (!/^https:\/\//.test(body)) throw new Error("Bridge didn't return an access URL — the token may already be claimed");
  return body;
}

function splitAccessUrl(accessUrl) {
  const u = new URL(accessUrl);
  const auth = "Basic " + Buffer.from(`${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`).toString("base64");
  u.username = "";
  u.password = "";
  return { base: u.toString().replace(/\/$/, ""), auth };
}

async function fetchAccounts(user, days) {
  const { accessUrl } = readJSON(sfinFile(user), {});
  if (!accessUrl) throw new Error("No bank connected on this account yet — claim a setup token first");
  const { base, auth } = splitAccessUrl(accessUrl);
  const start = Math.floor(Date.now() / 1000) - days * 86400;
  const res = await fetch(`${base}/accounts?start-date=${start}`, { headers: { Authorization: auth } });
  const text = await res.text();
  if (!res.ok) throw new Error(`SimpleFIN returned ${res.status}: ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (data.errors && data.errors.length) console.warn("SimpleFIN warnings:", data.errors);
  return data;
}

/* ---------- http ---------- */

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon", ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function sendJSON(res, code, payload, extraHeaders) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    ...(extraHeaders || {}),
  });
  res.end(body);
}

function sendFile(res, file) {
  let data;
  try { data = fs.readFileSync(file); } catch { return sendJSON(res, 404, { error: "Not found" }); }
  const immutable = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": data.length,
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
  });
  res.end(data);
}

const readBody = (req, limit = 6e6) =>
  new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > limit) reject(new Error("Payload too large")); });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Body wasn't valid JSON")); }
    });
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;
  const ip = req.socket.remoteAddress || "?";
  const secure = TRUST_PROXY ? req.headers["x-forwarded-proto"] === "https" : false;

  try {
    /* --- public --- */

    if (p === "/api/session") {
      const me = currentUser(req);
      const users = loadUsers();
      // Readable cross-origin so a wrapper app can check "is there a server here?"
      // before navigating. Safe: with a wildcard origin browsers refuse to send
      // cookies, so an outside caller only ever sees the signed-out shape.
      const probeHeaders = { "Access-Control-Allow-Origin": "*", "Vary": "Origin" };
      return sendJSON(res, 200, {
        authRequired: true,
        authed: Boolean(me),
        email: me ? identityOf(me) : null,
        admin: me ? Boolean(me.admin) : false,
        firstRun: users.length === 0,
        codeRequired: Boolean(SIGNUP_CODE),
      }, probeHeaders);
    }

    if (p === "/api/signup" && req.method === "POST") {
      const delay = throttle(ip);
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const body = await readBody(req);
      const users = loadUsers();

      if (SIGNUP_CODE) {
        const given = Buffer.from(String(body.code || ""));
        const want = Buffer.from(SIGNUP_CODE);
        const ok = given.length === want.length && crypto.timingSafeEqual(given, want);
        if (!ok) {
          failures.set(ip, (failures.get(ip) || 0) + 1);
          console.warn(`Bad signup code from ${ip}`);
          return sendJSON(res, 403, { error: "That signup code isn't right" });
        }
      } else if (!LOOPBACK) {
        return sendJSON(res, 403, { error: "Registration is closed on this server" });
      }

      const problem = validateCredentials(body.email, body.password);
      if (problem) return sendJSON(res, 400, { error: problem });

      const email = String(body.email).toLowerCase().trim();
      if (findUser(users, email)) return sendJSON(res, 409, { error: "There's already an account with that email" });

      const user = makeUser(email, body.password, users.length === 0);
      if (users.length === 0) adoptLegacyData(user);
      users.push(user);
      saveUsers(users);
      failures.delete(ip);
      console.log(`New account: ${email}${user.admin ? " (admin)" : ""}`);
      return sendJSON(res, 200, { ok: true, email }, { "Set-Cookie": sessionCookie(user.id, secure) });
    }

    if (p === "/api/login" && req.method === "POST") {
      const delay = throttle(ip);
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const body = await readBody(req);
      const user = findUser(loadUsers(), body.email);
      // run the hash either way so a missing account isn't faster than a wrong password
      const ok = user ? checkPassword(user, body.password) : (hashPassword(String(body.password || ""), "decoy"), false);
      if (!ok) {
        failures.set(ip, (failures.get(ip) || 0) + 1);
        console.warn(`Failed login from ${ip}`);
        return sendJSON(res, 401, { error: "Wrong email or password" });
      }
      failures.delete(ip);
      return sendJSON(res, 200, { ok: true, email: identityOf(user) }, { "Set-Cookie": sessionCookie(user.id, secure) });
    }

    if (p === "/api/logout" && req.method === "POST") {
      return sendJSON(res, 200, { ok: true }, { "Set-Cookie": "envelope_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" });
    }

    /* --- authenticated --- */

    if (p.startsWith("/api/")) {
      const me = currentUser(req);
      if (!me) return sendJSON(res, 401, { error: "Not signed in" });

      if (p === "/api/health") {
        return sendJSON(res, 200, { ok: true, connected: Boolean(readJSON(sfinFile(me), {}).accessUrl) });
      }

      if (p === "/api/password" && req.method === "POST") {
        const body = await readBody(req);
        if (!checkPassword(me, body.current)) return sendJSON(res, 401, { error: "Current password is wrong" });
        const problem = validateCredentials(identityOf(me), body.next);
        if (problem) return sendJSON(res, 400, { error: problem });
        const users = loadUsers();
        const u = users.find((x) => x.id === me.id);
        u.salt = crypto.randomBytes(16).toString("hex");
        u.hash = hashPassword(body.next, u.salt);
        saveUsers(users);
        return sendJSON(res, 200, { ok: true });
      }

      if (p === "/api/state" && req.method === "GET") return sendJSON(res, 200, readJSON(stateFile(me), {}));

      if (p === "/api/state" && req.method === "PUT") {
        const patch = await readBody(req);
        writeJSON(stateFile(me), { ...readJSON(stateFile(me), {}), ...patch });
        return sendJSON(res, 200, { ok: true });
      }

      if (p === "/api/state" && req.method === "DELETE") {
        writeJSON(stateFile(me), {});
        return sendJSON(res, 200, { ok: true });
      }

      if (p === "/api/simplefin/claim" && req.method === "POST") {
        const body = await readBody(req);
        if (!body.setupToken) return sendJSON(res, 400, { error: "Send a setupToken" });
        writeJSON(sfinFile(me), { accessUrl: await claimSetupToken(body.setupToken), claimedAt: new Date().toISOString() });
        return sendJSON(res, 200, { ok: true });
      }

      if (p === "/api/simplefin/accounts" && req.method === "GET") {
        const days = Math.min(Number(url.searchParams.get("days") || 90), 365);
        return sendJSON(res, 200, await fetchAccounts(me, days));
      }

      if (p === "/api/simplefin/disconnect" && req.method === "POST") {
        try { fs.unlinkSync(sfinFile(me)); } catch { /* already gone */ }
        return sendJSON(res, 200, { ok: true });
      }

      /* --- admin --- */

      if (p === "/api/users" && req.method === "GET") {
        if (!me.admin) return sendJSON(res, 403, { error: "Admins only" });
        return sendJSON(res, 200, loadUsers().map((u) => ({
          id: u.id, email: identityOf(u), admin: u.admin, createdAt: u.createdAt,
          bankConnected: Boolean(readJSON(sfinFile(u), {}).accessUrl),
        })));
      }

      if (p.startsWith("/api/users/") && req.method === "DELETE") {
        if (!me.admin) return sendJSON(res, 403, { error: "Admins only" });
        const id = p.split("/")[3];
        if (id === me.id) return sendJSON(res, 400, { error: "Use another admin account to delete this one" });
        const users = loadUsers();
        if (!users.some((u) => u.id === id)) return sendJSON(res, 404, { error: "No such account" });
        saveUsers(users.filter((u) => u.id !== id));
        fs.rmSync(path.join(USERS_DIR, id), { recursive: true, force: true });
        console.log(`Deleted account ${id}`);
        return sendJSON(res, 200, { ok: true });
      }

      return sendJSON(res, 404, { error: `No route for ${req.method} ${p}` });
    }

    /* --- static --- */

    if (!fs.existsSync(DIST)) return sendJSON(res, 503, { error: "No build found. Run: npm run build" });

    const rel = p === "/" ? "index.html" : p.replace(/^\/+/, "");
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST)) return sendJSON(res, 403, { error: "Nope" });
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    return sendFile(res, exists ? file : path.join(DIST, "index.html"));
  } catch (err) {
    return sendJSON(res, 500, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  const users = loadUsers();
  console.log(`\nEnvelopes on http://${LOOPBACK ? "localhost" : HOST}:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log(`Accounts: ${users.length ? users.map((u) => identityOf(u) + (u.admin ? "*" : "")).join(", ") : "none yet"}`);
  console.log(`Signup: ${SIGNUP_CODE ? "code required" : LOOPBACK ? "open (loopback)" : "closed"}`);
  if (!fs.existsSync(DIST)) console.log("\nNo dist/ yet — run `npm run build` so there's something to serve.");
  console.log("");
});
