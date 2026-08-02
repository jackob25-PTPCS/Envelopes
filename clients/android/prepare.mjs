#!/usr/bin/env node
/**
 * Generates the Android native project and applies this app's customisations.
 *
 *   npm install && node prepare.mjs
 *
 * Capacitor's `android/` directory is generated output, so it isn't committed —
 * the same reason `node_modules` isn't. What IS committed is `overrides/`: the
 * launcher icons and the network-security policy that let the app reach a
 * plain-http server on a private network.
 *
 * Safe to re-run. If `android/` already exists it is left alone and only the
 * overrides are re-applied.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "android");
const OVERRIDES = path.join(HERE, "overrides");
const RES = path.join(NATIVE, "app", "src", "main", "res");
const MANIFEST = path.join(NATIVE, "app", "src", "main", "AndroidManifest.xml");

const run = (cmd) => execSync(cmd, { cwd: HERE, stdio: "inherit" });

if (!fs.existsSync(NATIVE)) {
  console.log("\nGenerating the native Android project…");
  run("npx cap add android");
} else {
  console.log("\nNative project already present — syncing.");
  run("npx cap sync android");
}

console.log("Applying overrides…");
fs.cpSync(path.join(OVERRIDES, "res"), RES, { recursive: true, force: true });

// point the manifest at our network security policy
let manifest = fs.readFileSync(MANIFEST, "utf8");
if (!manifest.includes("networkSecurityConfig")) {
  manifest = manifest.replace(
    'android:icon="@mipmap/ic_launcher"',
    'android:icon="@mipmap/ic_launcher"\n        android:networkSecurityConfig="@xml/network_security_config"'
  );
  fs.writeFileSync(MANIFEST, manifest);
  console.log("  manifest: network security policy attached");
} else {
  console.log("  manifest: already configured");
}

console.log(`
Ready. Build the APK with:

  cd android && ./gradlew assembleDebug

It lands at android/app/build/outputs/apk/debug/app-debug.apk
`);
