# Netlify guest edition — owner decision 2026-09-11

Target: https://trumbiahoi.netlify.app/ (owner-owned existing Free-plan site).
Source base: `0da1529c337da0823be46951b5e410c284d24b0c`, with the same gameplay as `release-1.0-local` / `playable-v0.3`.

The owner chose browser-only guest hosting before deploying the API. `VITE_TBH_GUEST_ONLY=1` explicitly selects the existing local engine/IndexedDB save path. Normal builds still use server-authoritative startup. No network-error fallback, engine/economy change or live local-database upload is introduced. Oracle/API deployment is separate future work.

## Build and deploy

Use Node 22.22.1 or later: `npm ci`, then `npm run build:guest`. Upload only `apps/web/dist` to the existing Netlify site. `netlify.toml` records the same command/publish directory for future Netlify builds. Do not upload the repository, `.qa`, SQLite, cookies, environment files or credentials. Netlify credentials stay in the existing local CLI credential store, never this repo or the browser build.

`npm run build:guest` adds the static security/cache headers and redirects `/admin` to the game. A direct admin URL also cannot mount the admin app in a guest build. Online rankings/history are hidden and the local account panel explains that login/sync are unavailable. No API or Google requests are required. Local shift book, quests, progression and save export remain usable; gift quests retain their existing unavailable notice.

Progress stays in this browser and this site origin across closing/reopening. Clearing site data or using another browser/device does not carry the save over. Existing save corruption/conflict recovery remains fail-closed. A downloadable backup is available in Settings. Localhost progress and its database remain untouched; this release does not claim cross-device restoration or import local test accounts.

## Verification and rollback

`npm run verify` and `npm run check:assets` cover the unchanged game/asset contracts. Copy the accepted guest build to `.qa/guest-dist`, then run `npx playwright test --config playwright.guest.config.ts` for serving, restock/menu pause, upgrade, shift close, next day, reload/new tab and zero API requests on 390×844, 360×740 and 1280×720. To run the same isolated-browser smoke on the published site, set `TBH_GUEST_URL=https://trumbiahoi.netlify.app`.

Before deploying, record the previous published Netlify deploy ID; publish only the tested directory. Retain a deployment receipt with source commit, build digest, old/new deploy IDs and smoke results under `.qa`. Netlify can restore the previous immutable deployment without erasing browser storage. Existing site access protection is a separate setting; publishing files alone does not change it.

## Candidate verified 2026-09-11

- `npm run verify`: PASS, 418/418 tests, config/i18n/build, standard paired-onboarding k gate, rush gate and career seeds 42/99 (k 3.46546 / 3.39320, both ≤ 3.5).
- `npm run check:assets`: PASS, 132 manifest entries, 32 paired SFX, 3 existing sprite placeholders and 121 draft files accepted.
- Browser smoke: 3/3 viewports PASS, including ordinary serving/restock/upgrade, complete shift, next day, reload/new tab, and league still hidden after the configured unlock threshold; no API requests, page errors or failed asset responses.
- Independent review: no source/security defect; two test timing/eligibility findings fixed and follow-up verdict CLEAN. Receipts: `.qa/verify.txt`, `.qa/assets.txt`, `.qa/guest-smoke.txt`, `.qa/guest-review-followup.txt`.
- Netlify draft `6aa3df1ade7c9b5eeba5662b`: 123 static files. Index SHA-256 `2a9a80fdac977a60f0fefecb4b1f23c5d408eda3392dbe13e0e96bbdf7e0b45e`; file-manifest SHA-256 `3710891ad808c9c88f3549499d918a4803533160562dd262b241fe18b7465f81`.
- Owner explicitly chose public visitor access (no Netlify login). Only this site's visibility changes; Oracle and the local 5174/5175 services stay untouched.

## Published 2026-09-11

Live: **https://trumbiahoi.netlify.app/**. Source commit `c772425` on `codex/netlify-guest`; immutable Netlify deploy `6aa3df1ade7c9b5eeba5662b` was promoted after verification. Anonymous HTTPS returns 200 with the exact index digest above. Production smoke also passes 3/3 viewports, with zero page errors, failed asset responses and API/Google requests (`.qa/guest-public-smoke.txt`). Reload/new-tab save recovery and the post-unlock league guard pass on the live site.

Site settings: `sso_login=false`, no password. Netlify's optional `built_with_badge_enabled` is off: its injected iframe intercepted the mobile Upgrade button in the first public smoke. Disabling the badge through the per-site setting fixed all three viewports without rebuilding or modifying gameplay. See [Netlify badge settings](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/). Keep this setting off for the fullscreen game.

Rollback deploy: `6a9fa78f9bec4e0d3bfa19b7`; restoring it only switches hosted files. `.qa/netlify-published.json`, `.qa/netlify-public-http.json`, `.qa/netlify-visibility.json` and `.qa/local-preserved.json` retain deployment/preservation receipts. The original local 5174/5175 listeners, v0.3 index, SQLite path and main-checkout WIP are unchanged. No Oracle resources, paid plans, backend uploads or git pushes were made.

| Date | Change |
|---|---|
| 2026-09-11 | Owner authorizes Netlify guest edition first; browser-only saves are intentional for this hosting mode. Existing local release, server authority for normal builds, economy and deferred features are unchanged. |

## Wave A/B candidate — 2026-09-16

Owner requested publishing the latest A/B update. Gameplay source is `5e9fe2d`; this candidate reuses the prior `c772425` guest-only wrapper on that source. The startup conflict preserves the newer verification-bridge wrapper and selects local storage inside `startSession`. No engine/config/assets changes in this deployment slice; config 2.0.4 and rules 27 are inherited from A/B.

Verify the complete guest journey in `playwright.guest.config.ts` on three viewports before publishing, including the Settings source SHA and all six closed-shift KPIs matching the downloaded backup. Upload only the accepted static directory, retain the previous deployment for rollback, promote the verified draft, and run the same smoke against the public URL. The deployed receipt is recorded in `docs/deploy-log.md` after the operation succeeds. Existing site-origin saves and local 5174/5175 services remain untouched.


## Wave A/B published — 2026-09-17

Live guest update: **https://trumbiahoi.netlify.app/**. Runtime source `36c8db43e61b7dec4e424f7da123e71b3818ffc5`, gameplay base `5e9fe2d`, immutable deploy `6aaacf25a465a8fb1d8e9267`. Settings shows `36c8db43e61b`. The reviewed static draft was promoted directly; the three-viewport public guest smoke passed, including saved progress, next day and six shift KPIs. Anonymous HTTPS serves the exact recorded index. Browser-origin storage and the local services are preserved; online accounts/admin/ranking remain unavailable in this edition. A2 balance acceptance remains OPEN.

Full receipt, test retries, hashes and rollback deploy `6aa3df1ade7c9b5eeba5662b`: [deployment log](deploy-log.md#wave-ab-published--2026-09-17-asiaho_chi_minh). Re-run against this immutable source with `TBH_GUEST_URL=https://trumbiahoi.netlify.app TBH_GUEST_COMMIT=36c8db43e61b7dec4e424f7da123e71b3818ffc5 npx playwright test --config playwright.guest.config.ts --workers=1`.

| Date | Change |
|---|---|
| 2026-09-17 | Publish Wave A/B guest update; existing public access, browser persistence and local preview remain unchanged. |

## v6 guest update published — 2026-09-18

Live: **https://trumbiahoi.netlify.app/**. Built source `d966975b1f018cfe43de0951117eedc7c3db6ead`
(gameplay change `0549542`, #16: per-timezone `Intl.DateTimeFormat` cache in `dayKey()` — a native
memory leak on every engine tick, invisible to the JS heap), immutable deploy `6aad0f63f2091edfe7f7cf7b`.
Settings shows `d966975b1f01`. Draft and public three-viewport smokes passed 3/3. No config, rules,
asset, UI or storage change; rollback deploy `6aaacf25a465a8fb1d8e9267`. Full receipt:
[deployment log](deploy-log.md#v6-guest-update-published--2026-09-18-asiaho_chi_minh).

The CLI is installed and linked (`~/.npm-global/bin/netlify`, `.netlify/state.json`); from the repo
root it must be invoked with `--filter @tbh/web` (or from outside the repo) or the workspace prompt
blocks non-interactive use. Re-run the public smoke with
`TBH_GUEST_URL=https://trumbiahoi.netlify.app TBH_GUEST_COMMIT=d966975b1f018cfe43de0951117eedc7c3db6ead npx playwright test --config playwright.guest.config.ts --workers=1`.

| Date | Change |
|---|---|
| 2026-09-18 | Publish v6 guest update; public access, browser persistence and local services unchanged. |


## Moving to Cloudflare — owner decision 2026-09-30

The Netlify Free plan's credit model (15 credits per production deploy, 20 per GB, whole site paused when credits run out) no longer fits this 55 MB guest build. The owner chose Cloudflare Workers static assets on `trumbiahoi.com` and accepted that browser saves start over on the new origin. The static header/redirect files moved unchanged from `deploy/netlify/` to `deploy/static/`; `npm run build:guest` and `netlify.toml` still produce the same Netlify upload. This site stays as published until the first Cloudflare release passes its public smoke; replacing it with a redirect needs a separate owner go-ahead (revised 2026-10-14: this site stays live in parallel, see the next section). Procedure and local verification: [Cloudflare guest](cloudflare-guest.md).

| Date | Change |
|---|---|
| 2026-09-30 | Owner decision to move the guest edition to Cloudflare (`trumbiahoi.com`); save reset accepted. `deploy/netlify/` renamed to `deploy/static/`; no Netlify operation performed. |

## Netlify stays live in parallel — owner decision 2026-10-14

The owner revised the 2026-09-30 decision: this site is **not** retired and gets **no** redirect to `trumbiahoi.com`. Each guest release is built once (`npm run build:guest`) and the same `apps/web/dist` is published to both this site and Cloudflare (`https://trumbiahoi.com/`); `netlify.toml` stays as the Netlify build record. The two origins keep separate browser saves (accepted): progress on `trumbiahoi.netlify.app` is not visible on `trumbiahoi.com` and the reverse. The credit limits above apply to this site only; if the Netlify credits run out this site pauses and `trumbiahoi.com` is unaffected.

Release procedure for both hosts (stage both, promote both only on the owner's word, one deploy-log entry carrying both receipts): [Cloudflare guest — Phát hành lên hai host](cloudflare-guest.md#phát-hành-lên-hai-host). This document remains the reference for the Netlify side: CLI draft, promote, rollback and past receipts.

| Date | Change |
|---|---|
| 2026-10-14 | Owner decision: Netlify stays published in parallel with Cloudflare from one shared build; no redirect, `netlify.toml` kept, separate saves per origin. Supersedes the redirect path left open by the 2026-09-30 entry. No Netlify operation performed. |
