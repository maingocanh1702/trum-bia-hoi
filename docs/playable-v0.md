# playable-v0

Latest client acceptance: [playable-v0.1](#playable-v01--steer15-2026-09-11). Historical v0 evidence is retained below.

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


## playable-v0.1 — Steer15, 2026-09-11

**PASS — all three playable viewports.** Code/art commit: **7dc5998d18ed8d752a4888dcee385d1b3e17f900**; UI/ingredient copy: **af9d287**. Tag `playable-v0.1` adds this release note; resolve the exact tag SHA with `git rev-parse playable-v0.1`.

VI/EN kitchen cards explain unlocks, pans, portions and prep speed; phone explains shipper orders; QR lists phone ownership first. Stock/restock/HUD use ingredient names and cook-to-order hints, while orders/kitchen/shift ledger retain finished-dish names.13 distinct draft sprites replace washer2–5, cooler2–5 and stall1–5 placeholders. No engine/config values changed by Steer15. Manifest:132entries,121drafts,3placeholders outside this batch (chair-plastic-red, stall-owner-normal, customer-football-fan); all files resolve. M6/M7/M8 stay deferred/hidden; no monetization.

| Viewport | First playable | RAF fps | Served | Full shift / upgrade / next day / reload / new tab | Console / failed requests |
|---|---:|---:|---:|---|---|
|390×844|561ms|60.25|68|PASS|0 / 0|
|360×740|751ms|60.44|75|PASS|0 / 0|
|1280×720|1040ms|60.27|83|PASS|0 / 0|

Full `npm run verify` PASS:406/406unit/server tests,10standard cohorts k2.5644–2.9168,15rush cases, career seeds42/99 k3.465460767842698 /3.393196640939153≤3.5. `check:assets` PASS; per-level upgrade-art browser regression PASS; independent source/art review CLEAN. Timing/FPS are desktop Chromium at the named viewports, not a physical-phone benchmark. The390px retry corrects test receipt/popup synchronization; no gameplay timing was changed.

Receipts: `.qa/steer15-final-verify.txt`, `.qa/steer15-final-assets.txt`, `.qa/steer15-art-web.txt`, `.qa/steer15-playable-smoke-final.txt` (360/1280PASS), `.qa/steer15-playable-390-retry.txt` (390PASS), `.qa/playable-{390,360,1280}.json`, `.qa/steer15-review-verdict.txt`, `.qa/steer15-operation-review-followup-verdict.txt`.

Prepared pinned checkout: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.1`. Build succeeds and its index/manifest/config hashes match the tested code. Keep the same `local.tbh.playable-web` / `local.tbh.playable-api` jobs,5174/5175, and existing `.qa/game-api.sqlite`; cutover requires the pre-switch SQLite backup. Run commands above remain valid.

**Registry clarification:** the prior tag carried seed2.0.2, but direct SQLite inspection found the existing preview registry still active at2.0.1. Seed2.0.3 (`7418c7b`) differs from that live snapshot only in `upgrades.keg.kegStorage`4/7/12/20/40 and the already-built `onboarding.loginPrompt.leaveProgress` threshold group. Publish both through the normal proposal/approval `next_shift` path; the registry assigns its own immutable version ID. Existing shifts retain their pins. Runtime cutover/publication receipts will be appended after the operation; this tag alone does not publish config.


### Steer15 (3) — runtime and normal registry publication complete

The5174/5175 launch jobs now serve **playable-v0.1 at b3cfb34425cb2b9b472f7705f5ef8a1d4a64591a** from `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.1`. `git rev-parse 'playable-v0.1^{commit}'` resolves the commit behind the annotated tag. The served index is byte-identical to the tested built index. The writing checkout may contain this later operation receipt; the pinned client remains at the tag.

Normal registry publication **registry-183f67c7-2c6e-489a-94d5-0862e29bb0f7**, sequence2, uses source config2.0.3 from7418c7b and base2.0.1. Changes are exactly `upgrades.keg.kegStorage` and `onboarding.loginPrompt.leaveProgress`. Activation: **next_shift**. Ordinary proposal/approval/publication audit events are seq5/6/7; repeating publish returned the identical original receipt. No emergency hotfix, future-schedule override, engine edit or save reset. Runtime snapshot confirms buffer4/7/12/20/40; a newly opened Lv1 shift displays4/4. Existing shift pins are preserved.

Backups live in the pinned checkout `.qa/playable-runtime/`: `game-api-before-playable-v0.1.sqlite`, `game-api-before-playable-v0.1-retry.sqlite` and `game-api-before-config2.0.3.sqlite`. The first switch was stopped by annotated-tag resolution, then launchd teardown/bootstrap timing; old services were restored before the bounded-bootstrap retry succeeded. All original backups were retained. Independent local-operation and retry/rollback reviews CLEAN; mock failure/retry checks PASS.

Read-only comparison to the original pre-switch backup:4existing players preserved,7054commands/4842events/30client receipts/2prior config snapshots byte-for-byte unchanged;3existing same-shift config pins unchanged,0shifts advanced during publication. Existing SQLite path and browser cookies are unchanged. A temporary private localhost dev Super identity with real TOTP performed the normal publish; it was logged out, its allowlist/secret removed and original disabled admin environment restored. HTTP confirms admin disabled and authentication fails closed as `admin:unavailable`. No default admin was left behind.

Runtime checks:6stock rows, deferred risk UI hidden, new4/4buffer,0core-game console errors; midshift dev sign-in preserves player/shift/coins. **Known pre-existing limitation:** opening the dev identity form logs one invalid HTML `pattern` regex in `apps/web/src/admin-api.ts:68` (`[a-z][a-z0-9-]{0,31}`, also present at7418c7b). The broader account-console smoke therefore reports FAIL for that one console error; login state checks pass. This is outside the three owner-authorized Steer15 items and was recorded without changing auth UI. The three guest full-shift acceptance paths remain PASS with0console errors.

Operation evidence in the writing checkout `.qa/`: `steer15-runtime-cutover-final.txt`, `steer15-publication-receipt.json`, `steer15-publication-run.txt`, `steer15-preservation-receipt.json`, `steer15-admin-revocation.json`, `steer15-runtime-smoke.json`, `steer15-runtime-smoke-final.txt`, `steer15-launchd-review-verdict.txt`. Reload the preview tab to load the new client; the new buffer applies when the next shift starts. Steer15(1)af9d287 and(2)7dc5998 are complete; no M6/M7/M8 or other feature work started.


## Production deployment — PENDING (owner decision 2026-09-11)

Local v0.2 is for owner testing only. Do not begin these production tasks as part of this batch:

- [ ] Hosting, HTTPS and domain.
- [ ] Production environment (`NODE_ENV=production`), dev identity stub OFF.
- [ ] Real `TBH_GOOGLE_CLIENT_ID` and Google consent acceptance.
- [ ] Production admin accounts file and TOTP enrollment.
- [ ] SQLite backups, restore checks and monitoring.
- [ ] CAPTCHA.
- [ ] PWA installation and performance on real devices.
- [ ] Human playtest (existing owner waiver retained).
- [ ] Remaining assets/backgrounds.

Owner authorizes fast-forwarding `codex/game-build-isolated` into master only after local v0.2 is tagged and serving, via a clean temporary master worktree; full verify there, then remove that temporary worktree. No push. The main checkout on codex/build-game and its uncommitted docs must remain untouched.
