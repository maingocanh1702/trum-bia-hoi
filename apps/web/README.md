# Trùm Bia Hơi web

Normal startup connects to the authenticated server. Run the API with `TBH_DB`,
`TBH_ORIGIN=http://127.0.0.1:5173` and `TBH_PORT=5175`, then `npm run dev`.
Vite proxies `/api` to `http://127.0.0.1:5175`; override `TBH_API_TARGET` for an
isolated server. Production needs a same-origin reverse proxy from `/api/*` to
API `/*`. `npm run build` emits static files, not a running API.

The browser renders `WorldView`, fetches the exact pinned economy schema, and
uses pure quote helpers. It never constructs/advances a Game in online mode.
Server snapshots own time, balances, inventory, customer state and menu reports.
Presentation events are separate from the paged realtime notification cursor.
No full event archive or RNG/checkpoint seed is sent as a player snapshot.

`remote.ts` persists `{playerId, clientId, nextSeq, heartbeatSeq, cursor, pending}`
in the small `tbh.remote.v1` localStorage journal, under a native Web Lock. A second
tab must close the first or retry; it cannot overwrite the action sequence. HTTP-only
cookies carry identity. Session expiry/account mismatch stops sending while retaining
commands; it never resets the journal or silently creates a replacement career.
Persist failures refuse unsaved commands. Capacity comes from `network.commandBufferMax`;
extra clicks are explicitly refused. Retrying a possibly committed command retains its
key and sequence until the server acknowledgement is received and persisted.

Each heartbeat carries CURRENT visibility and menu state, with a new sequence.
Reordered/lost beats recover without replaying stale presence. Management menus remain
paused after purchases/upgrades; inline service stays live. A heartbeat deadline changes
the edge status to reconnecting even if fetch hangs, while the yard stays visible and
no local game clock runs. After grace, normal closing comes from the server.

## Existing local careers

An existing local archive is preserved. Before creating a server career, the UI offers
export/continue-local or an explicitly separate new server stall. Nothing is uploaded,
merged, repriced or discarded by that choice. After a server journal exists, reload
resumes that server player and its pending actions. `local.ts`/IndexedDB remain for the
explicit legacy continuation and test fixtures while the owner-deferred public archive
upload/review flow is unfinished. Local earnings cannot reach server balances/ranking.
Structurally corrupt local archives enter the existing forensic download/import/reset
flow; replacement preserves the exact damaged rows in a backup. Google Client ID is absent; no real Google/GIS or approval UI is claimed here.

## Checks

- `npm run test:e2e`: 91 legacy UI/storage cases. Its Vite process explicitly sets
  `VITE_TBH_LOCAL=1`; this test-only environment switch is not a network fallback.
- `npx playwright test --config playwright.remote.config.ts`: real isolated API+web,
  lost acknowledgements/reload, offline queue, pause/in-shift upgrade, grace closing,
  local preservation, one writer, storage failure, account rotation and hung fetch.
  Test API uses a distinct pinned fixture config and an isolated in-memory database;
  its virtual-clock route is never imported by production. Output is isolated under
  `.qa/test-results-remote`, so it does not erase the legacy runner's traces.

| Date | Change |
|---|---|
| 2026-09-10 | First web server cutover/outbox and explicit local preservation boundary. Verification and independent review in progress; M4 registry/admin and full account/import integration remain open. |

| 2026-09-10 verified |936e9d5: config/build,298engine/server +91legacy/10remote browser and k/rush PASS. Full review local-recovery regression fixed; correction review CLEAN. M4 registry/admin/account acceptance remain open. |


### Netlify guest hosting — owner decision 2026-09-11

The owner requests a separate browser-only guest edition on their existing `trumbiahoi.netlify.app` site. See [Netlify guest deployment](../../docs/netlify-guest.md) for its explicit build mode, device-save limits and verification. This supersedes the local-only hosting restriction for this static edition; the accepted localhost v0.3 runtime and SQLite are unchanged. Oracle/API and real Google remain separate future work.

### Cloudflare guest hosting — owner decision 2026-09-30

The guest edition moves to Cloudflare Workers static assets on `trumbiahoi.com`; browser saves restart on the new origin (accepted). Same `npm run build:guest` output; header/redirect files now live in `deploy/static/`. See [Cloudflare guest](../../docs/cloudflare-guest.md).

| Date | Change |
|---|---|
| 2026-09-30 | Guest hosting target changed from Netlify to Cloudflare; build mode and gameplay unchanged. |
