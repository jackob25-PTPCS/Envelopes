const KEY = "envelopes.serverUrl";
const url = document.getElementById("url");
const msg = document.getElementById("msg");
const go = document.getElementById("go");

/** Accepts "host", "host:port", or a full URL. Private ranges assume http. */
function normalize(input) {
  let raw = String(input || "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) {
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(raw);
    raw = (local ? "http://" : "https://") + raw;
  }
  try {
    const u = new URL(raw);
    return /^https?:$/.test(u.protocol) ? u.origin : null;
  } catch { return null; }
}

async function probe(origin) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${origin}/api/session`, { signal: ctrl.signal });
    if (!res.ok) return { ok: false, reason: `The server answered with ${res.status}.` };
    const body = await res.json();
    if (typeof body.authRequired === "undefined") {
      return { ok: false, reason: "Something is running there, but it isn't an Envelopes server." };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.name === "AbortError" ? "Timed out. Is the phone on the same network?" : `Couldn't reach it — ${e.message}` };
  } finally { clearTimeout(timer); }
}

function goTo(origin) {
  try { localStorage.setItem(KEY, origin); } catch { /* private mode */ }
  location.href = origin + "/";
}

/** The probe is a courtesy, not a gate — an older server may not allow the
 *  cross-origin check even though it works perfectly once we navigate to it. */
function offerAnyway(origin) {
  if (document.getElementById("anyway")) return;
  const b = document.createElement("button");
  b.id = "anyway";
  b.className = "quiet";
  b.textContent = "Connect anyway";
  b.onclick = () => goTo(origin);
  document.querySelector(".card").appendChild(b);
}

async function submit() {
  const origin = normalize(url.value);
  if (!origin) { msg.className = "msg bad"; msg.textContent = "That doesn't look like an address."; return; }
  go.disabled = true;
  msg.className = "msg";
  msg.textContent = "Looking for a server…";
  const res = await probe(origin);
  if (!res.ok) {
    msg.className = "msg bad";
    msg.textContent = res.reason;
    go.disabled = false;
    offerAnyway(origin);
    return;
  }
  goTo(origin);
}

go.addEventListener("click", submit);
url.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

// straight back in if we already know where we're going
const saved = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
if (saved) {
  url.value = saved;
  msg.textContent = "Reconnecting…";
  go.disabled = true;
  probe(saved).then((r) => {
    if (r.ok) { location.href = saved + "/"; return; }
    msg.className = "msg bad";
    msg.textContent = r.reason;
    go.disabled = false;
    offerAnyway(saved);
    const change = document.createElement("button");
    change.className = "quiet";
    change.textContent = "Use a different server";
    change.onclick = () => { try { localStorage.removeItem(KEY); } catch {} ; location.reload(); };
    document.querySelector(".card").appendChild(change);
  });
}
