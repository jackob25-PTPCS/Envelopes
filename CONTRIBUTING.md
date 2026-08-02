# Contributing

## Running it

```bash
npm install
npm run dev      # front end on :5173 with hot reload
npm run serve    # server on :4000 in another terminal
```

For a production-shaped run, `npm run host` builds and serves from one process.

## Shape of the thing

- `server.mjs` — the entire back end. Node built-ins only, no dependencies.
  Serves `dist/`, stores state per account, brokers SimpleFIN.
- `src/App.jsx` — the entire front end. One file on purpose; it keeps the
  data model and the views that read it in the same place.
- `src/storage.js` — persistence adapter. Talks to the server over HTTP when
  served, falls back to localStorage under `file://`.
- `clients/desktop` — Electron shell that points at a server.
- `clients/android` — Capacitor wrapper, same idea. The native `android/`
  directory is generated: run `node prepare.mjs` there to create it. Only
  `overrides/` and the web assets are committed.

## Before opening a PR

- `npm run build` has to pass.
- No new runtime dependencies in `server.mjs`. Zero-dependency deployment is
  the point — it means users need only Node.
- Don't commit anything from `DATA_DIR`, and don't add telemetry.
- Money is stored as numbers and formatted at the edge. Keep it that way.
