First public release.

Self-hosted zero-based budgeting with read-only bank sync through SimpleFIN.
Your budget and your bank credentials stay on your own server.

## Getting started

Run the server first — see [INSTALL.md](../docs/INSTALL.md). Node 18+ is the
only requirement; the server has no dependencies.

```bash
git clone https://github.com/jackob25-PTPCS/envelopes.git
cd envelopes && npm install && npm run host
```

Then open <http://localhost:4000> and create an account. The clients below are
optional — the web app works in any browser.

## Downloads

| File | Platform | Notes |
| --- | --- | --- |
| `envelopes-client_1.0.0_amd64.deb` | Debian, Ubuntu, Zorin, Mint | Preferred on Ubuntu 24.04+ |
| `Envelopes-1.0.0.AppImage` | Any Linux | `chmod +x` and run |
| `Envelopes-Setup-1.0.0.exe` | Windows 10/11 | Installer with shortcuts |
| `Envelopes-Portable-1.0.0.exe` | Windows 10/11 | Single file, installs nothing |

No APK is attached. On Android, open your server in Chrome and choose
**Install app** — you get a home-screen icon and a standalone window with
nothing to sideload. That needs the server on https.

If your server is plain http on your LAN, build an APK in about five minutes
without installing anything: **Actions → Build Android APK → Run workflow**,
then download it from the run's Artifacts. See
[clients/android/README.md](../clients/android/README.md).

All clients are thin — they connect to a server you run. They do nothing on
their own.

## Before you install

**The binaries are not code-signed.** Windows SmartScreen will warn you
(More info → Run anyway) and Android will ask permission to install from an
unknown source. That is normal for independent software, and it also means you
are trusting whoever built these files. Building from source is always safer —
every client can be built with one command.

**This is not financial advice and comes with no warranty.** Verify against
your bank statements. See [DISCLAIMER.md](../DISCLAIMER.md).

**Your data is yours to protect.** Everything lives in `DATA_DIR` on your
server. No cloud backup, no recovery, no undo. Back it up.

## Verifying downloads

Compare against `SHA256SUMS.txt` attached to this release:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```
