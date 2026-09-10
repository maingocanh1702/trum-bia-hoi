# playable-v0

Status: **PASS — playable-v0 acceptance**. Code commit: **d048a9c296815f2b0813da9bb21207906cc73899**. The tag `playable-v0` adds this release note; resolve its exact snapshot SHA with `git rev-parse playable-v0`.
Owner scope: Steer12/13. Config remains **2.0.2**, rules24; the Steer14 buffer change runs only after this tag.

## Run locally

From the game worktree, install dependencies with `npm ci`, then use two terminals:

```sh
TBH_AUTH_DEV=1 TBH_DB="$PWD/.qa/game-api.sqlite" TBH_ORIGIN=http://127.0.0.1:5174 npm run dev:server
```

```sh
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174/. The API runs on 5175. `npm run build` builds the web client and typechecks both web and API. The API entry point runs with tsx; there is no separate emitted server bundle.

For the pinned preview, use the recorded checkout and launchctl jobs below instead of a live writing worktree. Preserve the existing SQLite database when switching builds.

## Included

Language selection (VI/EN), device-persistent guest progress, a full 12-minute shift, service/order panels, beer/glass/washing pipelines, food and restocking, paused menus and in-shift upgrades, shift book, next-day continuation. Existing kitchen/menu, customer/weather/rush, progression, quests and account screens remain available at their configured unlocks. This is playable acceptance, not a claim that every historical M1–M5 exit criterion is closed.

Beer inventory is **Bom bia / Beer keg**; the ready buffer is **Cốc rót sẵn / Poured glasses**; equipment is **Vòi rót / Beer taps**. Their counts come from canonical game state/config and update live.

The explicit local dev identity form supports mid-shift account attachment and restore through the real session/receipt paths. It is refused in production and disabled unless `TBH_AUTH_DEV=1`; real Google remains available when a Client ID is configured. **Verified via dev identity stub; real Client ID pending — owner waiver 2026-09-10.** Never use test identities as production accounts.

## Deferred / asset limits

**M6/M7/M8 DEFERRED by owner 2026-09-11 — post-release.** The game has no monetization. Risk controls are hidden in the shipped UI; legacy risk UI is available only in an explicit development test preview (`VITE_TBH_RISK_PREVIEW=1`), and historical engine/config/save support is retained. Inspection and lottery remain OFF; donation/football features are not exposed.

**Owner waiver 2026-09-11: draft assets accepted for release.** Current manifest: 132 entries, 108 draft files, 16 sprite placeholders, 32 paired audio effects. Working placeholders are accepted under Steer12; this build does not claim the stricter `check:assets --release` asset-completion target. Two counter imagegen attempts failed native alpha (RGB checkerboards); the manifest records both, and counter upgrade cards use the registered starter-table sprite as a visible fallback. Higher-level art polish remains deferred.

Human-only criteria are **WAIVED by owner 2026-09-10 — post-release playtest**. Browser timing/FPS evidence uses desktop Chromium at mobile viewport sizes, not a physical-phone benchmark.

## Reproduce acceptance

```sh
npm run verify
npm run check:assets
npx playwright test --config playwright.playable.config.ts
npx playwright test --config playwright.dev-identity.config.ts
```

The playable suite builds current sources, runs one default-config API/clock per viewport (390×844, 360×740, 1280×720), and uses ordinary UI actions. First shift is real wall time; only overnight rest after its summary is accelerated by an isolated test-server route. No test routes are imported by the shipped server entry point. Filtering/retrying one project does not wait for the other viewports.

## Verification

| Viewport | First playable | RAF fps | Served | Full shift / upgrade / next day / reload / new tab | Console / failed requests |
|---|---:|---:|---:|---|---|
|390×844|1340ms|60.09|68|PASS|0 / 0|
|360×740|1264ms|60.34|60|PASS|0 / 0|
|1280×720|627ms|60.16|63|PASS|0 / 0|

Final current-code `npm run verify`: **406/406 unit/server**,10standard cohorts k2.4186–2.8738,15rush cases,30-day career seeds42/99 k3.483282/3.318249≤3.5. `check:assets` PASS. Three legacy risk-preview regressions PASS. Dev identity acceptance:1stub browser path +5normal Google regressions and server link/restore/reauth/MFA checks (a7331b4); built-client midshift stub smoke kept the same player/shift/coins. Independent release diff review: **CLEAN**.

Receipts in the writing checkout `.qa/`: `playable-final-verify.txt`, `playable-final-assets.txt`, `playable-smoke-final.txt` (two mobile passes, original desktop locator failure), `playable-smoke-desktop-retry.txt` (desktop PASS), `playable-{390,360,1280}.json` and summary screenshots, `playable-panels.json`, `review-playable-final-verdict.txt`. The first desktop failure was a stale test locator, corrected to use persistent table buttons; no gameplay timing/economy changes. Historical initial smoke without an actual upgrade purchase is not the final acceptance evidence.

## Pinned local runtime

Checkout: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0` at `playable-v0`. Local launch jobs: `local.tbh.playable-web` / `local.tbh.playable-api`; logs, pre-switch SQLite backup and actual runtime receipt live under that checkout's `.qa/playable-runtime/`. Web serves the built client with Vite preview on5174; API uses tsx on5175 with explicit `TBH_AUTH_DEV=1`, `NODE_ENV=development`. The existing database remains `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game/.qa/game-api.sqlite`; no browser cookie/save is reset. Jobs persist for the current login session.

For a manual restart, stop those two jobs before running the commands above, so there is only one API writer. Real admin access still requires a private allowlist and TOTP; no default admin identity is added. The subsequent Steer14 balance commit does not silently change this pinned snapshot or an existing registry/shift pin.
