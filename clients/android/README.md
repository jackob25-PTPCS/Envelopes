# Envelopes on Android

Two ways onto a phone. Try the first — most people never need the second.

## 1. Install from Chrome (no build, works today)

The server ships a web app manifest, so Chrome can install it like an app.

1. Open your Envelopes server in Chrome on the phone
2. Menu (⋮) → **Install app** (or **Add to Home screen**)
3. It appears in your app drawer and opens without browser chrome

**Requirement:** the server must be reachable over **https**. That means a
domain with a certificate, or a tunnel like Cloudflare Tunnel or Tailscale.
Chrome will not offer to install a plain-http site.

This is a real install — home-screen icon, its own window, its own task in the
app switcher. The only thing it can't do is reach an `http://192.168.x.x`
server on your LAN.

## 2. Build the APK

Worth it if your server is plain http on the local network, or you want a real
installable package. You do **not** need Android Studio or the SDK.

### The easy way — GitHub builds it for you

1. Fork this repository (or use your own copy)
2. Go to the **Actions** tab
3. If prompted, click **I understand my workflows, enable them**
4. Pick **Build Android APK** in the left sidebar
5. Click **Run workflow** → **Run workflow**
6. Wait about five minutes for the green check
7. Click into the run, scroll to **Artifacts**, download **Envelopes-APK**

That gives you a zip; inside is `Envelopes.apk`.

GitHub's runners come with the Android SDK preinstalled, which is the whole
reason this exists — it saves you a 3 GB download and an afternoon.

### Attaching it to a release

If you publish releases, the same workflow can upload the APK to one:

- Publishing a release triggers it automatically, or
- Run the workflow manually and enter the tag (e.g. `v1.0.0`) in the
  **attach_to_release** box

### The local way

If you'd rather build on your own machine:

```bash
sudo apt install -y openjdk-21-jdk unzip

# command line tools from https://developer.android.com/studio#command-tools
mkdir -p ~/android-sdk/cmdline-tools
unzip commandlinetools-linux-*.zip -d ~/android-sdk/cmdline-tools
mv ~/android-sdk/cmdline-tools/cmdline-tools ~/android-sdk/cmdline-tools/latest

export ANDROID_HOME=~/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

sdkmanager --licenses          # answer y to each
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"

cd clients/android
npm install
node prepare.mjs               # generates android/ and applies overrides
cd android && ./gradlew assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

## How this directory is laid out

The `android/` native project is **generated, not committed** — the same
reasoning as `node_modules`. `node prepare.mjs` creates it with
`npx cap add android` and then copies in `overrides/`, which holds the two
things that make this app different from a stock Capacitor shell:

- `overrides/res/xml/network_security_config.xml` — permits cleartext traffic
  to private address ranges only
- `overrides/res/mipmap-*` — the launcher icons

The script is safe to re-run; if `android/` already exists it syncs instead of
regenerating, then re-applies the overrides.

Two things that trip people up: the licences must be accepted before the SDK
packages will install (a build that fails in two seconds usually means they
weren't), and `ANDROID_HOME` has to be set in the shell you build from.

## Installing the APK on a phone

**Over USB**, with developer options and USB debugging enabled:

```bash
adb install -r Envelopes.apk
```

**Without USB** — serve it from the machine that has it:

```bash
cd <folder with the apk>
python3 -m http.server 8099
```

Then browse to `http://YOUR-COMPUTER-IP:8099/Envelopes.apk` on the phone, tap
the download, tap it again to install. Android will ask you to permit installs
from your browser; that prompt is expected for anything outside the Play Store.
Stop the server with Ctrl+C when you're done — it has no authentication.

## First launch

It asks for your server address. All of these work:

```
budget.example.com
https://budget.example.com
192.168.1.20:4000
```

Bare hostnames get `https://`; private addresses get `http://`. It checks that
an Envelopes server is really answering before saving. Then sign in with the
account you created on the server.

## Why plain http works here but not in Chrome

`res/xml/network_security_config.xml` permits cleartext traffic for private
ranges only — `10.x`, `172.16–31.x`, `192.168.x`, `localhost`, and `.local`.
Anything on the public internet still requires https. That's the one capability
the APK has that the Chrome install doesn't.

## About the debug signature

`assembleDebug` signs with a throwaway debug key. That's fine for sideloading
onto phones you control. It cannot go on the Play Store, and a build signed
with a different key can't upgrade it in place — you'd uninstall first.

For a release build, generate a keystore, add a signing config to
`android/app/build.gradle`, and run `assembleRelease`. Only worth the trouble
if you're distributing beyond people who'll take an APK directly from you.
