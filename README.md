# Envelopes

Self-hosted zero-based budgeting with real bank sync. Every dollar gets a job
before the month starts; the app tells you when one doesn't.

Runs on your own machine. Your transaction history never touches anyone else's
server, and there is no account to create with anyone but yourself.

## What it does

- **Zero-based budget** — assign income to envelopes until nothing is left over,
  with spending caps and savings targets per envelope
- **Bank sync** via [SimpleFIN Bridge](https://beta-bridge.simplefin.org) —
  read-only, so nothing can move money
- **Bills & income calendar** — recurring and one-off, with per-day, weekly and
  monthly totals for money out, money in, and the net
- **Payday awareness** — the overview tells you what drafts before your next
  paycheck lands, and whether you can cover it
- **Debt snowball** — smallest balance first, month-by-month payoff simulation,
  with an honest avalanche comparison
- **Net worth** — assets, liabilities, and the line between them over time
- **Milestones** — the goals you're measured against, defaulting to a familiar
  seven-step sequence but fully editable
- **Multi-user** — every account gets its own budget and its own bank link

> **Not financial advice, and no warranty.** Verify against your bank
> statements. See [DISCLAIMER.md](DISCLAIMER.md).

## Requirements

Node 18 or newer. That's the whole list — `server.mjs` uses only Node built-ins,
so there is nothing to install on the machine you deploy to.

## Quick start

```bash
git clone https://github.com/jackob25-PTPCS/envelopes.git
cd envelopes
npm install
npm run host
```

Open http://localhost:4000 and create an account. The first one becomes admin.

## Serving it to other machines

The server binds to loopback by default and **refuses to start** on a public
interface with no accounts and no signup code — otherwise the first stranger to
find the port claims the server.

```bash
ENVELOPE_SIGNUP_CODE='some phrase' HOST=0.0.0.0 npm run host
```

| Variable | Default | Notes |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | `0.0.0.0` to accept traffic from other machines |
| `PORT` | `4000` | |
| `ENVELOPE_SIGNUP_CODE` | none | Required to register when bound publicly |
| `DATA_DIR` | `~/.envelope` | Accounts, budgets, bank credentials |
| `TRUST_PROXY` | unset | `1` behind nginx, Caddy, Cloudflare, etc. |

### As a service

`/etc/systemd/system/envelopes.service`:

```ini
[Unit]
Description=Envelopes budgeting
After=network-online.target

[Service]
WorkingDirectory=/opt/envelopes
ExecStart=/usr/bin/node /opt/envelopes/server.mjs
EnvironmentFile=/home/USER/.envelope/env
User=USER
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Keep the signup code out of the unit file, which is world-readable:

```bash
install -m 600 /dev/null ~/.envelope/env
echo "HOST=0.0.0.0"                        >> ~/.envelope/env
echo "ENVELOPE_SIGNUP_CODE=some phrase"    >> ~/.envelope/env
echo "TRUST_PROXY=1"                       >> ~/.envelope/env
sudo systemctl enable --now envelopes
```

### Behind a reverse proxy

Point one hostname at `http://localhost:4000`. App and API share an origin, so
there is nothing else to route. Set `TRUST_PROXY=1` so session cookies pick up
their `Secure` flag from `X-Forwarded-Proto`.

**Put an authenticating proxy in front of it.** See [SECURITY.md](SECURITY.md).

## Connecting a bank

1. Create an account at [beta-bridge.simplefin.org](https://beta-bridge.simplefin.org)
   and link your bank there. It's about $15/year.
2. Under Apps, create a connection and generate a **setup token**.
3. Paste it into Bank connection in Envelopes and claim it.

The token is single-use and is exchanged for a long-lived read-only access URL
that stays on your server. Each account needs its own SimpleFIN subscription.

Want to try the plumbing first? The demo token on SimpleFIN's developer page
returns fabricated accounts and is safe to use anywhere.

## Clients

The web app works everywhere and installs from Chrome on Android as a PWA. If
you'd rather have native packages:

```bash
cd clients/desktop && npm install
npm run dist:linux    # .deb + AppImage
npm run dist:win      # installer + portable .exe
```

Building Windows targets from Linux needs Wine including 32-bit support:
`sudo dpkg --add-architecture i386 && sudo apt install wine64 wine32:i386`

### Android

Open the server in Chrome and choose **Install app** — a home-screen icon and a
standalone window, nothing to sideload. Requires https.

If your server is plain http on your LAN, Chrome won't install it. Build an APK
instead, with no local Android SDK required: **Actions → Build Android APK →
Run workflow**, then grab it from the run's Artifacts. Full instructions in
[clients/android/README.md](clients/android/README.md).

## Your data

Everything is in `DATA_DIR`. Back it up — it is the only copy, and there is no
undo inside the app.

## Documentation

- [Installing](docs/INSTALL.md) — server and every client
- [Security](SECURITY.md) — what's stored where, and what to do before exposing it
- [Disclaimer](DISCLAIMER.md) — no warranty, not financial advice
- [Contributing](CONTRIBUTING.md)

## License

MIT
