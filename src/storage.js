/**
 * Storage adapter.
 *
 * The app persists through `window.storage`, which exists inside Claude
 * artifacts but nowhere else. This installs an implementation:
 *
 *   served over http(s)  → the server, so every device shares one budget
 *   opened as file://    → localStorage (the Electron desktop build)
 *
 * When the server wants a password, this draws a login screen before React
 * mounts. App.jsx knows nothing about any of it.
 */

const LOCAL_PREFIX = "envelope:";

function installLocal() {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(LOCAL_PREFIX + key);
      return value === null ? null : { key, value, shared: false };
    },
    async set(key, value) {
      localStorage.setItem(LOCAL_PREFIX + key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      localStorage.removeItem(LOCAL_PREFIX + key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(LOCAL_PREFIX + prefix))
        .map((k) => k.slice(LOCAL_PREFIX.length));
      return { keys, prefix, shared: false };
    },
  };
}

function installRemote() {
  const req = (path, opts) => fetch(path, { credentials: "same-origin", ...opts });

  async function readAll() {
    const r = await req("/api/state");
    if (r.status === 401) { await promptLogin({ message: "Session expired — sign in again" }); return readAll(); }
    if (!r.ok) throw new Error(`Server returned ${r.status}`);
    return r.json();
  }

  window.storage = {
    async get(key) {
      const all = await readAll();
      return key in all ? { key, value: all[key], shared: false } : null;
    },
    async set(key, value) {
      const r = await req("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (r.status === 401) { await promptLogin({ message: "Session expired — sign in again" }); return window.storage.set(key, value); }
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      return { key, value, shared: false };
    },
    async delete(key) {
      const all = await readAll();
      delete all[key];
      await req("/api/state", { method: "DELETE" });
      await req("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all) });
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const all = await readAll();
      return { keys: Object.keys(all).filter((k) => k.startsWith(prefix)), prefix, shared: false };
    },
  };
}

/* ---------- login screen, drawn without React ---------- */

function promptLogin(opts) {
  const o = opts || {};
  return new Promise((resolve) => {
    let mode = o.firstRun ? "signup" : "login";

    const wrap = document.createElement("div");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Sign in to Envelopes");
    wrap.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#fff;" +
      "font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#1B0B2E";
    document.body.appendChild(wrap);

    const field =
      "width:100%;margin-top:9px;padding:9px 11px;border:1px solid #E7DDFA;" +
      "border-radius:9px;font:inherit;font-size:14px;box-sizing:border-box";

    function draw() {
      const signup = mode === "signup";
      wrap.innerHTML = `
        <div style="width:min(340px,88vw);text-align:left">
          <div style="font-family:Fraunces,Georgia,serif;font-weight:600;font-size:22px;color:#6D28D9">Envelopes</div>
          <div style="font-size:12.5px;color:#6B5A87;margin-top:4px">${
            o.message ? o.message
              : signup ? (o.firstRun
                  ? "Step 1 of 3 — email and password. This first account gets admin."
                  : "Step 1 of 3 — email and password.")
              : "Every dollar gets a name"
          }</div>
          ${signup ? `<div style="display:flex;gap:5px;margin-top:14px">
            <span style="flex:1;height:3px;border-radius:9px;background:#6D28D9"></span>
            <span style="flex:1;height:3px;border-radius:9px;background:#E7DDFA"></span>
            <span style="flex:1;height:3px;border-radius:9px;background:#E7DDFA"></span>
          </div>` : ""}
          <input id="eb-user" type="email" placeholder="Email" autocomplete="email" autocapitalize="none" style="${field}" />
          <input id="eb-pw" type="password" placeholder="Password"
            autocomplete="${signup ? "new-password" : "current-password"}" style="${field}" />
          ${signup && o.codeRequired ? `<input id="eb-code" placeholder="Signup code" style="${field}" />` : ""}
          <div id="eb-err" style="font-size:12px;color:#C2255C;margin-top:8px;min-height:16px"></div>
          <button id="eb-go" style="width:100%;padding:10px;border:none;border-radius:9px;background:#6D28D9;
            color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer">${signup ? "Continue" : "Sign in"}</button>
          ${o.firstRun ? "" : `<button id="eb-swap" style="width:100%;margin-top:8px;padding:6px;border:none;
            background:none;color:#6B5A87;font:inherit;font-size:12px;cursor:pointer;text-decoration:underline">${
              signup ? "I already have an account" : "Create an account"
            }</button>`}
        </div>`;

      const user = wrap.querySelector("#eb-user");
      const pw = wrap.querySelector("#eb-pw");
      const code = wrap.querySelector("#eb-code");
      const err = wrap.querySelector("#eb-err");
      const go = wrap.querySelector("#eb-go");
      const swap = wrap.querySelector("#eb-swap");
      user.focus();

      async function submit() {
        go.disabled = true;
        err.textContent = "";
        const payload = { email: user.value.trim(), password: pw.value };
        if (code) payload.code = code.value.trim();
        try {
          const r = await fetch(signup ? "/api/signup" : "/api/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            err.textContent = j.error || `Server error (${r.status})`;
            go.disabled = false;
            pw.select();
            return;
          }
          const j = await r.json();
          window.__envelopeSession = { email: j.email, authRequired: true, freshSignup: signup };
          wrap.remove();
          resolve();
        } catch {
          err.textContent = "Can't reach the server";
          go.disabled = false;
        }
      }

      go.addEventListener("click", submit);
      [user, pw, code].forEach((el) => el && el.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
      if (swap) swap.addEventListener("click", () => { mode = signup ? "login" : "signup"; draw(); });
    }

    draw();
  });
}

/* ---------- entry point ---------- */

export async function initStorage() {
  if (location.protocol === "file:") { installLocal(); return; }

  let session;
  try {
    session = await (await fetch("/api/session", { credentials: "same-origin" })).json();
  } catch {
    // no server behind this page — fall back so the app still opens
    installLocal();
    return;
  }

  window.__envelopeSession = {
    email: session.email,
    admin: session.admin,
    authRequired: session.authRequired,
  };

  if (session.authRequired && !session.authed) {
    await promptLogin({ firstRun: session.firstRun, codeRequired: session.codeRequired });
  }
  installRemote();
}
