# Security

Envelopes holds bank transaction history. A few things are worth understanding
before you run it.

## What it stores, and where

Everything lives on the machine you run the server on, under `DATA_DIR`
(`~/.envelope` by default), mode `0600` inside a `0700` directory:

| File | Contents |
| --- | --- |
| `users.json` | emails and salted scrypt password hashes |
| `users/<id>/state.json` | that account's budget and transactions |
| `users/<id>/simplefin.json` | that account's SimpleFIN access URL |
| `secret` | signs session cookies |

There is no telemetry, no analytics, and no outbound connection except to the
SimpleFIN bridge when you sync.

## Bank access

Envelopes never sees your bank credentials. You authenticate with SimpleFIN
Bridge, which returns an access URL. That URL is a long-lived read-only
credential; it is stored server-side and never sent to the browser. Nothing in
this app can move money.

Revoke access at any time from your SimpleFIN dashboard.

## Exposing it to the internet

The server refuses to bind a public interface with no accounts and no signup
code, because otherwise the first stranger to find the port claims it.

If you put this on the internet, put an authenticating proxy in front —
Cloudflare Access, Tailscale, Authelia, or equivalent. The built-in password is
a reasonable second layer, not a first one. Set `TRUST_PROXY=1` behind a TLS
terminator so session cookies get their `Secure` flag.

## Known limits

- **No password reset.** Emails are identifiers, not verified addresses, and
  nothing is sent to them. A locked-out user must be deleted and re-registered
  by an admin, which erases their budget.
- **No end-to-end encryption.** The server operator can read every account's
  data. If you host for other people, tell them.
- **No backups.** `DATA_DIR` is the only copy and the app has no undo. Back it
  up yourself, and consider encryption at rest if others use your instance.
- **Sessions are 30 days** and not revocable individually; deleting `secret`
  signs everyone out.

## Reporting a vulnerability

Open a private security advisory through GitHub's "Security" tab rather than a
public issue.
