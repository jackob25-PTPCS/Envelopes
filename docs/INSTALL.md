# Installing Envelopes

Two parts: a **server** you run once, and **clients** on whatever devices you
want to use. The server is required; clients are optional because the web app
works in any browser.

## 1. The server

Needs Node 18 or newer. Nothing else — no dependencies to install.

```bash
git clone https://github.com/jackob25-PTPCS/envelopes.git
cd envelopes
npm install          # build tooling only
npm run host         # builds the front end, then serves on :4000
```

Open <http://localhost:4000>, create an account, and you're running.

### Reaching it from other devices

```bash
ENVELOPE_SIGNUP_CODE='pick a phrase' HOST=0.0.0.0 npm run host
```

Then browse to `http://YOUR-SERVER-IP:4000` from anything on the network. The
signup code is what lets someone create an account; share it with people you
want on your instance and change it to close registration.

The server **refuses to start** on a public interface with no accounts and no
signup code, so you can't accidentally publish an open instance.

### Keeping it running

See the systemd unit in the main README, or use whatever supervisor you prefer.
The process is a single `node server.mjs`.

## 2. Clients

### Browser

Nothing to install. It's a responsive web app, and on Android Chrome offers
**Install app** for a home-screen icon and a standalone window (requires https).

### Desktop — Linux

```bash
sudo dpkg -i envelopes-client_1.0.0_amd64.deb
sudo apt-get install -f      # only if dependencies are missing
```

Or the AppImage, which installs nothing:

```bash
chmod +x Envelopes-1.0.0.AppImage && ./Envelopes-1.0.0.AppImage
```

On Ubuntu 24.04 and derivatives, unprivileged user namespaces are restricted
and the AppImage may complain about its sandbox. Prefer the `.deb` there.

### Desktop — Windows

- **Envelopes-Setup-1.0.0.exe** — installer with Start menu and desktop shortcuts
- **Envelopes-Portable-1.0.0.exe** — single file, runs from anywhere

Unsigned, so SmartScreen warns on first run: **More info → Run anyway**.

### Android

**Chrome install** — open your server in Chrome on the phone, menu → **Install
app**. Home-screen icon, standalone window, nothing to sideload. Needs the
server on https.

**APK** — required only if your server is plain http on your LAN, which Chrome
refuses to install from. You don't need an Android SDK: in this repository go to
**Actions → Build Android APK → Run workflow**, wait about five minutes, and
download **Envelopes-APK** from the run's Artifacts.

Then copy it to the phone and tap it, allowing installs from your browser when
prompted. Details and a local-build path are in
[clients/android/README.md](../clients/android/README.md).

## 3. First launch on a client

Each client asks for your server address once. Any of these work:

```
budget.example.com
https://budget.example.com
192.168.1.20:4000
```

Bare hostnames get `https://`; private addresses get `http://`. It verifies an
Envelopes server is actually answering before saving. Then sign in with the
account you created on the server.

## Building the clients yourself

```bash
cd clients/desktop && npm install
npm run dist:linux     # .deb + AppImage
npm run dist:win       # .exe installer + portable
```

Windows targets from Linux need Wine including 32-bit:

```bash
sudo dpkg --add-architecture i386
sudo apt update && sudo apt install -y wine64 wine32:i386
```

For Android, either use the bundled GitHub Actions workflow (Actions → Build
Android APK → Run workflow) or install the Android SDK locally and run
`./gradlew assembleDebug` in `clients/android/android`.
