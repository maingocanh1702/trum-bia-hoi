# Deployment log

This log records deployment receipts. A source commit or a passing test suite does not establish what is currently served.

## Historical Netlify guest release — 2026-09-11

Recorded here on 2026-09-16 from the committed September 11 receipt; no deployment or live-site verification was performed for this entry.

| Field | Historical receipt |
|---|---|
| Site | https://trumbiahoi.netlify.app/ |
| Source commit | `c7724254b2e3dca28800dec5261d975478c1562c` (`codex/netlify-guest`) |
| Immutable Netlify deployment | `6aa3df1ade7c9b5eeba5662b` — promoted from the verified draft |
| Published files | 123 static files; browser-only guest edition |
| Index SHA-256 | `2a9a80fdac977a60f0fefecb4b1f23c5d408eda3392dbe13e0e96bbdf7e0b45e` |
| File-manifest SHA-256 | `3710891ad808c9c88f3549499d918a4803533160562dd262b241fe18b7465f81` |
| Previous deployment / rollback | `6a9fa78f9bec4e0d3bfa19b7` |
| Recorded public smoke | Anonymous HTTPS 200 matching the index digest; 3/3 viewports (360×740, 390×844, 1280×720); zero page errors, failed asset responses or API/Google requests; reload/new-tab recovery passed |
| Save boundary | Browser/Netlify-origin IndexedDB progress; no cross-device restore or backend deployment |

Source of this historical entry: `docs/netlify-guest.md` at receipt commit `223ec608874e7258a6ab278dcbca9cd8af5e8f7a`, read from the existing Netlify worktree. Reproduce the committed source with `git show 223ec608874e7258a6ab278dcbca9cd8af5e8f7a:docs/netlify-guest.md`. That receipt names `.qa/netlify-published.json`, `.qa/netlify-public-http.json`, `.qa/netlify-visibility.json`, `.qa/local-preserved.json`, and `.qa/guest-public-smoke.txt` as its original evidence; those ignored artifacts are not republished by this log.

The historical receipt also records public visitor access, the optional Netlify badge disabled to avoid intercepting mobile controls, and the local 5174/5175 services preserved. These are September 11 observations, not current settings assertions.

## Build identification

Settings displays the first 12 characters of the build's existing `__TBH_COMMIT__` value, with its full value in the element title. This is the source SHA captured when Vite starts/builds, not a deployment ID or a live-host status check. A new source commit must be rebuilt before that label changes; the September 11 deployed build predates this label.

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 | A6: reconstruct the September 11 Netlify receipt and explain the Settings build label; no new deployment or current-site claim. |

## Read-only public index check — 2026-09-16

Anonymous HTTPS returned200 and index SHA-256 `2a9a80fdac977a60f0fefecb4b1f23c5d408eda3392dbe13e0e96bbdf7e0b45e`, exactly matching the September11 receipt above (source `c7724254b2e3dca28800dec5261d975478c1562c`). This check identifies the served entrypoint; it is not a new deployment or a fresh gameplay acceptance. Evidence: `artifacts/verification/improve-wave-ab/public-index-receipt.json`. Wave A/B has not been published; the Settings SHA is available only in a rebuilt A6-or-later client.


## Wave A/B published — 2026-09-17 (Asia/Ho_Chi_Minh)

| Field | Verified release receipt |
|---|---|
| Site | https://trumbiahoi.netlify.app/ — public browser-only guest edition |
| Gameplay source | `5e9fe2d49af550a03f385c37df7c90edc7607c3b` (Wave A/B) |
| Built source commit | `36c8db43e61b7dec4e424f7da123e71b3818ffc5` — Settings displays `36c8db43e61b` |
| Immutable deploy | `6aaacf25a465a8fb1d8e9267` — tested draft promoted without rebuilding |
| Promoted at | 2026-09-16 18:04 UTC / 2026-09-17 01:04 Asia/Ho_Chi_Minh |
| Static upload | 123 files; 4 changed files uploaded; no API/functions/database/credentials |
| Index SHA-256 | `8be2fa76b6d2b922c77626335531485f9a40620c78fc8a0cc736a440e51ea1ec` |
| File-manifest SHA-256 | `9bbaf915730f0cbb30ff9725e114e5c8a4eae8db40ef2743e96dc4100006ee40` |
| Previous deploy / rollback | `6aa3df1ade7c9b5eeba5662b` |
| Public HTTP | Anonymous HTTPS 200, exact index digest above; revalidation enabled |
| Public browser smoke | **3/3 PASS**: 390×844, 360×740, 1280×720 |

Included: the reviewed A/B guest gameplay update, direct beer restock action, clearer preparation/loss feedback, six exact shift KPIs and Settings build identification. Config 2.0.4 / rules 27 come from A/B; this deployment wrapper changes neither. A2 balance acceptance remains OPEN; human playtest and later plan waves are not claimed complete.

Verification: `npm run verify:all` passed 548/548 tests plus config/i18n/build, paired-onboarding, rush/VIP/career and doctor gates. Standard k samples remain 2.4989–2.9830; aggregate 30-day career k is 3.465461 (seed 42) / 3.393197 (seed 99). `check:assets` passed 132 entries, 32 paired SFX, 3 accepted sprite placeholders and 121 drafts. Final isolated guest-port fix passed 8 port tests, typecheck, doctor and the three-viewport local smoke; pinned independent review ended `NETLIFY_REVIEW_CLEAN`.

The public smoke exercises ordinary serving, restock/menu pause, an earned upgrade, shift close/summary, the next day, reload/new-tab recovery, VI/EN account copy, hidden online league/admin, exact source SHA, and all six KPI values matching the downloaded save. No page errors, failed HTTP asset responses or API/Google requests were observed. This uses isolated test browsers and accelerated time, not the owner's save or a human playtest.

Draft evidence: both mobile viewports passed initially; the desktop test's Node export reader hung and was terminated. The unchanged desktop test passed on an isolated retry (40.5s). The public run used one worker and passed all three together (1.7m). The initial normal-account/locale run had 46 passing cases and two timing failures under concurrent load; the isolated retry passed 3/3 including the pending-upgrade variant. These retries do not replace the original failure logs.

Evidence is retained in `artifacts/verification/deploy-wave-ab/`: `verify.log`, `assets.log`, `review-02.log`, `guest-draft-smoke.log`, `guest-draft-desktop-retry.log`, `guest-public-smoke.log`, `published-candidate.json`, `netlify-published.json`, `netlify-public-http.json`, and `local-preserved.json`.

Preservation: the existing Netlify origin and IndexedDB save path are unchanged; no storage reset was introduced. The localhost 5174 served-index hash and 5174/5175 listeners were preserved. This operation did not write the main checkout, local SQLite or launchd settings; concurrently appearing server WIP was left untouched. No git push/merge, Oracle/backend deployment or site-access change was performed. Netlify visitor login/password protection and the injected badge remain off.

Rollback: restore immutable deploy `6aa3df1ade7c9b5eeba5662b` through Netlify's existing deployment restore action. This switches hosted files without deleting browser storage; it does not migrate a save backward. Later documentation commits are not part of the served build.

| Date | Change |
|---|---|
| 2026-09-17 | Owner-authorized Wave A/B guest publication; exact-source public smoke PASS and rollback receipt recorded. |


## Netlify freshness check — 2026-09-18 (no deployment)

Owner asked to update https://trumbiahoi.netlify.app/ to the latest main. The check found nothing to publish: a guest build from current main is the same build that is already live, apart from its identity label. No Netlify operation was performed; the live deploy `6aaacf25a465a8fb1d8e9267` is untouched.

| Field | Result |
|---|---|
| Live built-source commit | `36c8db43e61b7dec4e424f7da123e71b3818ffc5` (Wave A/B, published 2026-09-17) |
| Candidate source | `9227661131cef08e8182dfb56fc577d782a938df` — main after PR #14 (supervised P1 k-admission) |
| Guest build | `npm run build:guest` PASS, 123 static files, same count as the live deployment |
| `assets/index-*.js` | Byte-identical to the served chunk after substituting the referenced App chunk filename |
| `assets/App-*.js` | 340069 bytes both sides; exactly 20 bytes differ — the 40- and 12-character `__TBH_COMMIT__` labels and the 8-character index chunk hash they cascade into |
| `assets/index-*.css` | Identical content hash `index-DBDzTQ7N.css`, unchanged since Wave A/B |
| Player-visible change | None. Settings would show `9227661131ce` instead of `36c8db43e61b`; nothing else differs |

Reason: everything merged since the live build is server-side or documentation. The only source file on the candidate that the browser bundle could reach is `packages/engine/sim/forecast.ts`, imported solely by `apps/server/src/forecast.ts`; `apps/web/src/AdminForecast.tsx` takes a type-only import from the server module, and the admin app is excluded from a guest build in any case. The k-admission registry change has no guest surface, because the guest edition has no API.

### Served index digest no longer matches the Wave A/B receipt — explained

The Wave A/B receipt records index SHA-256 `8be2fa76b6d2b922c77626335531485f9a40620c78fc8a0cc736a440e51ea1ec`; anonymous HTTPS now returns `a53e7002613c92ce6fec85047f3183f0c62b91c29d5f784dadb4ebf28124a44f`. This is not a different deployment. Netlify now injects a hosting comment, `<meta name="hosting-provider">` and `<meta name="netlify-deploy">` into served HTML; the uploaded file is 461 bytes and the served one 997, and they are identical once that injected block is removed. Future receipts should hash the uploaded artifact, and treat a served-HTML digest as a platform-dependent value rather than an equality assertion.

| Date | Change |
|---|---|
| 2026-09-18 | Freshness check only; no build published, no site setting changed, no rollback consumed. |

## v6 guest update published — 2026-09-18 (Asia/Ho_Chi_Minh)

| Field | Verified release receipt |
|---|---|
| Site | https://trumbiahoi.netlify.app/ — public browser-only guest edition |
| Gameplay change | `0549542` (#16): `dayKey()` caches one `Intl.DateTimeFormat` per timezone. No config, rules, asset or UI change; config 2.0.4 / rules 27 unchanged |
| Built source commit | `d966975b1f018cfe43de0951117eedc7c3db6ead` — Settings displays `d966975b1f01` (one docs commit above #16; bundle content identical to #16) |
| Immutable deploy | `6aad0f63f2091edfe7f7cf7b` — tested draft promoted via `restoreSiteDeploy`, not rebuilt |
| Promoted at | 2026-09-18 10:21 UTC / 17:21 Asia/Ho_Chi_Minh |
| Static upload | 123 files; `netlify deploy --no-build --filter @tbh/web --dir=apps/web/dist`; no API/functions/database/credentials |
| Uploaded index SHA-256 | `34b805019e18072000c3413b4006274540049bf0645eb26a89e9cc4e5c90be57` |
| File-manifest SHA-256 | `2bb8145d79479ae04c02e64d4f5a7961cd2e2d0339709ebb193a87f6a1a25191` (sorted `find`, sha256 of per-file sha256 list) |
| Served index SHA-256 | `d19f5ee4837bb0e399f6607b42500ab59ae53863d3027634624500a0f857b1e0` — differs from the uploaded file by Netlify's injected hosting comment and two `<meta>` tags only (see the 2026-09-18 freshness check above); platform-dependent, not an equality assertion |
| Previous deploy / rollback | `6aaacf25a465a8fb1d8e9267` (Wave A/B, 2026-09-17) |
| Public browser smoke | **3/3 PASS**: 390×844 (34.0s), 360×740 (35.6s), 1280×720 (33.1s), `--workers=1`, exact source SHA asserted |

Why publish a change with no visible feature: the same `dayKey()` runs in the browser on every engine
tick. Each call built a native ICU formatter that V8's heap accounting never sees and only frees on a
major GC; in the headless career sim that grew RSS by ~400MB per simulated day (3-day run 1552MB →
198MB after the fix; the full 30-day gate 12–17GB → 289MB). A player's tab pays the same cost, slower.

Verification chain: `verify:all` on main after #16 — 587/587 tests, config/i18n/build, paired
onboarding, rush, career gate (k 3.465460767 / 3.393196640, identical to the recorded baseline),
doctor green after restoring two feature-map citations (`d966975`). Whole `verify:all`: 134s wall,
442MB max RSS — before #16 it did not finish on this 16GB machine. Local guest smoke on
`.qa/guest-dist` 3/3; draft smoke on `6aad0f63…--trumbiahoi.netlify.app` 3/3 (a first draft run
failed only its build-label assertion because the expected SHA was given as `0549542` while the build
was made at `d966975`; retained as `draft-smoke-wrong-label.log`, re-run with the correct label 3/3);
public smoke 3/3.

Evidence in `artifacts/verification/deploy-v6-daykey/`: `verify-all.log`, `guest-smoke.log`,
`draft-smoke2.log`, `draft-smoke-wrong-label.log`, `public-smoke.log`, `nl-draft2.json`,
`nl-promote.json` (ignored artifacts, not republished by this log).

Preservation: browser-origin IndexedDB saves untouched (no storage change in this build); Netlify
visitor access, password and badge settings untouched; the primary checkout stayed on `main`.

Rollback: restore `6aaacf25a465a8fb1d8e9267` through Netlify's deployment restore action.

| Date | Change |
|---|---|
| 2026-09-18 | Owner-authorized v6 guest publication (dayKey formatter cache); draft and public smoke 3/3; rollback receipt recorded. |


## Cloudflare preparation — 2026-09-30 (no deployment)

Owner moved the guest edition to Cloudflare Workers static assets on `trumbiahoi.com` ([Cloudflare guest](cloudflare-guest.md)). This entry records local checks only; nothing was uploaded to Cloudflare or Netlify, and the live Netlify deploy `6aad0f63f2091edfe7f7cf7b` is untouched.

| Field | Local result |
|---|---|
| Source | `a775fc065ec1c675f2ac16ed5fb4f439cf99425f` + this change (`wrangler.jsonc`, `deploy/static/`), `npm run build:guest`, 123 files |
| Runtime | `wrangler dev` 4.144.0 (local workerd + asset-worker) |
| Headers / redirects | `/` no-cache revalidate + 3 security headers; `/assets/*` immutable; `/admin` and `/admin/*` 302 → `/`; `_headers`/`_redirects` not served |
| Served vs built `index.html` | Identical SHA-256 `d9a44ff3bff5c93bf9b52f8002b52fc91a46991f44506241aaf1260b87c3d6fd` — no injected markup |
| Guest smoke | `guest.spec.ts` against the local runtime: 3/3 PASS (390×844, 360×740, 1280×720) |

Future Cloudflare receipts use the Worker version ID in place of the Netlify deploy ID, and the served index hash is expected to equal the uploaded one.

| Date | Change |
|---|---|
| 2026-09-30 | Cloudflare hosting prepared and checked locally; no deployment, no site setting changed. |
