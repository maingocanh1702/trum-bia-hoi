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


## Two-host release entry — the fields (2026-10-22, no deployment)

Every release made with [Phát hành lên hai host](cloudflare-guest.md#phát-hành-lên-hai-host) writes ONE entry here (step 8 of that procedure) with these fields:

| Field | What to record |
|---|---|
| Source commit | `git rev-parse HEAD` of step 1 (the commit `npm run verify:all` and `npm run check:assets` passed on) |
| `shift1.plan` result and commit | step 1b: `npm run sim:balance` on that same commit — its exit code, the row `shift1.plan` (PASS/FAIL, share and 95 % interval) and the commit it ran on |
| Dist digests | SHA-256 of `apps/web/dist/index.html` and of the file manifest: one pair for both hosts |
| Netlify | new and previous deploy ID (rollback); SHA-256 of the served index (recorded only: Netlify injects markup) |
| Cloudflare | new and previous version ID (rollback); SHA-256 of the served index (must equal the uploaded file) |
| Smoke per host | stage smoke (step 4) and public smoke (step 7), per viewport |
| Viewports red at the two soft lines | per host and step (4, 7): the viewports red ONLY at `P0: table 2 (1.070 xu) must be affordable …` / `table 2 is bought` of `apps/web/guest-test/guest.spec.ts`, every other assertion green, or "none". Such a run goes on to promotion only with step 1b PASS and the owner's word (owner call 4, the founder, 2026-10-22); a red at any other line stops the release |
| Owner's word | who authorized the promotion, and when |

| Date | Change |
|---|---|
| 2026-10-22 | Owner call 4 (the founder): the fields of a two-host release entry, with "viewports red at the two soft lines" and "`shift1.plan` result and commit" ([Cloudflare guest](cloudflare-guest.md) steps 1b, 4, 7, 8). No deployment, no site setting changed. |

## v-fb2 guest release — Netlify only — 2026-10-22 (Asia/Ho_Chi_Minh)

Fields of [Two-host release entry](#two-host-release-entry--the-fields-2026-10-22-no-deployment), Netlify half only. Founder exception 2026-10-22: while Cloudflare is pending, `https://trumbiahoi.netlify.app` serves `v-fb2` and `https://trumbiahoi.com` still serves the old build; this suspends the "two hosts always serve the same build" rule of [Cloudflare guest](cloudflare-guest.md) until the Cloudflare release.

| Field | Receipt |
|---|---|
| Site | https://trumbiahoi.netlify.app/ — public browser-only guest edition (`v-fb2`, economy 2.1.1, rules 28) |
| Source commit (R) | `5336be7da16fb289488a4c519a08e2a0484c5d48` — merge of PR #30 (`feat/economy-2-1`, tip `cc37a05`; the tree is identical to `cc37a05`). Settings displays `5336be7da16f` |
| Verification on R | Windows laptop, one log per gate: `check:config`, `check:i18n`, `build`, `check:assets` (134 manifest entries), `sim:onboarding`, `sim:rush`, `sim:career:gate`, `sim:balance` all exit 0. `npm test` 799 tests: second run 752 pass / 47 fail = the Windows baseline, 0 new. The first run had one failure outside the baseline, `apps/server/test/google.test.ts` "real Google SDK verifies a signed token…" (`auth:googleVerificationFailed`, 6.6 s against its 5 s certificate-fetch timeout while the suite was loading the laptop); the same file alone passed 12/12 three times, so it was read as a load timeout in a server test that is not in the guest dist, and the suite was re-run once. Linux (GitHub Actions, one targeted static run, throwaway branch since deleted): https://github.com/maingocanh1702/trum-bia-hoi/actions/runs/39742342304 — conclusion success, 8 gates exit 0, `npm test` 799/799, `verify:doctor` all ✓ |
| `shift1.plan` result and commit | `npm run sim:balance` on `5336be7` (R): exit 0, "failing gates: none", row `shift1.plan` **PASS** — 83 % of 300 runs close shift 1 with ≥ 1070 xu (95 % CI 79–87 %; fast 251/300, 4 s 250/300; start wallet 750), seeds 42 and 99 |
| Dist digests | 123 files from `npm run build:guest`. `apps/web/dist/index.html` SHA-256 `696b093838b6aba3a2178b2ff097d097d8f49d530cf97403cebb52925cfd0107`. File-manifest SHA-256 `9fea183e04db7b8d6aded97f1c56b221ce72e0e5483a19feb8988ada7294d5bc` = `cd apps/web/dist && find . -type f \| LC_ALL=C sort \| xargs -d '\n' sha256sum \| sha256sum`. The hashes-only variant (the 64-hex column alone, same order) is `7d3de4a14f150451a8921e7ff1ae2def78064aeffe4902685106df59c9594b75`. These are the receipts the Cloudflare release is checked against |
| Netlify | Draft `6ad9c1d88a0fca5b34f34601` (`netlify deploy --no-build --filter @tbh/web --dir=apps/web/dist`, no `--prod`; draft index SHA-256 = the receipt, all 121 served files byte-identical to `apps/web/dist`) promoted without a rebuild by `restoreSiteDeploy` at 2026-10-22T08:05:43Z (15:05 Asia/Ho_Chi_Minh). **New production deploy `6ad9c1d88a0fca5b34f34601`; previous production deploy / rollback `6aad0f63f2091edfe7f7cf7b`** (v6, 2026-09-18). No production deploy existed at or after the merge of #30 before this release (no Git auto-deploy) |
| Served index SHA-256 (recorded only) | `0804d3c592a5ce64150221afed12909fe85e541484b6f308f8655d9a0f2c7c97` (787 bytes). Differs from the uploaded file only by Netlify's injected 3-line "hosted on Netlify" HTML comment; with that comment stripped its SHA-256 is the receipt. The deploy permalink serves the receipt hash exactly. Before the release the live index was `4c81e0cae7a736344a30ba6733aa8def0931661637e7cbf844c5121ed3ac1e53` (previous build, same injected comment) |
| Smoke | `TBH_GUEST_COMMIT=5336be7da16fb289488a4c519a08e2a0484c5d48 npx playwright test --config playwright.guest.config.ts --workers=1`. Stage (draft URL): 390×844 PASS; 360×740 and 1280×720 red. Public (`https://trumbiahoi.netlify.app`): **3/3 PASS**, 390×844 33.8 s, 360×740 32.8 s, 1280×720 29.8 s |
| Viewports red at the two soft lines | Stage (step 4): 360×740 and 1280×720, red ONLY at `P0: table 2 (1.070 xu) must be affordable …` and `table 2 is bought` (`guest.spec.ts:73` and `:81`; two errors per viewport, every other assertion green, build label asserted); passed on under owner call 4 because step 1b passed. Public (step 7): none |
| Owner's word | The founder's instruction of 2026-10-22 (`.autopilot-state/DEPLOY-VFB2-NETLIFY.md`): release to Netlify only, with AUTO-PROMOTE chosen by the founder; the orchestrator promoted on its conditions (a)–(f) after sending the founder the stage receipt report. No other word was needed |
| Returning player | The live build was 2.0.4 / rules 27. A save pinned to 2.0.4 is kept and opens normally; its next shift opens with the bundled 2.1.1 (`apps/web/src/local.ts` `openingConfig`). Tests: `apps/web/test/rest-first-shifts.spec.ts` (D8), `apps/web/test/config-pinning.spec.ts`, and the rules-27/28 replay fixtures in `npm test` |
| Rollback | `netlify api restoreSiteDeploy --data '{"site_id":"7eac82f8-a0e5-4c64-936b-9e8719a4853c","deploy_id":"6aad0f63f2091edfe7f7cf7b"}'` (restores the previous immutable deploy; browser saves are untouched) |

Cloudflare: NOT released in this entry; founder asked Netlify first (2026-10-22); the two hosts differ until the Cloudflare entry; receipts for it: R and the SHA-256 above

| Date | Change |
|---|---|
| 2026-10-22 | `v-fb2` released to Netlify only at the founder's request; Cloudflare untouched and not released, so the two hosts serve different builds until the Cloudflare entry. |

## v-fb2 guest release — Cloudflare — 2026-10-22 (Asia/Ho_Chi_Minh)

Fields of [Two-host release entry](#two-host-release-entry--the-fields-2026-10-22-no-deployment), Cloudflare half. This is the first deploy of the Worker `trumbiahoi`; `https://trumbiahoi.com` had no players and no browser saves, so it went straight to production (first deploy, [Cloudflare guest](cloudflare-guest.md) "Thiết lập một lần"): there was no stage version and no stage smoke. The temporary difference between the hosts recorded in the Netlify entry above ends with this entry: both hosts serve the same `v-fb2` build.

| Field | Receipt |
|---|---|
| Site | https://trumbiahoi.com/ — Cloudflare Workers static assets, Worker `trumbiahoi` (no script, no bindings), custom domain `trumbiahoi.com`, public browser-only guest edition (`v-fb2`, economy 2.1.1, rules 28) |
| Source commit (R) | `5336be7da16fb289488a4c519a08e2a0484c5d48` — the same commit as the Netlify entry (merge of PR #30). `main` had no commit after it when the release started. Settings displays `5336be7da16f` |
| Verification on R | Not repeated for Cloudflare (founder's instruction): the bytes are the build verified for the Netlify entry above (Windows gates, Linux static run 39742342304, `sim:balance`). The `dist` was NOT rebuilt; it was the one of the Netlify release, and its digests were re-computed before the deploy |
| `shift1.plan` result and commit | `npm run sim:balance` on `5336be7` (R): exit 0, row `shift1.plan` **PASS** — 83 % of 300 runs close shift 1 with ≥ 1070 xu (95 % CI 79–87 %), seeds 42 and 99 (recorded in the Netlify entry; it was run for those same bytes) |
| Dist digests | One pair for both hosts, equal to the Netlify entry. `apps/web/dist/index.html` SHA-256 `696b093838b6aba3a2178b2ff097d097d8f49d530cf97403cebb52925cfd0107`. File-manifest SHA-256 `9fea183e04db7b8d6aded97f1c56b221ce72e0e5483a19feb8988ada7294d5bc` (same command as the Netlify entry). 123 files in `dist`, of which 121 are served (`_headers` and `_redirects` are configuration) |
| Cloudflare | Worker `trumbiahoi`, `npm run cf -- deploy --message "v-fb2 5336be7"` (wrangler 4.144.0), deployment created 2026-10-22T14:29:42Z (21:29 Asia/Ho_Chi_Minh), Source: Upload (not a Git build). **New version ID `9fbf210a-e127-49a2-8aba-150c7bc82955`**, 100 %. **Previous version: none — first deploy, nothing to roll back to.** 121 files uploaded; `trumbiahoi.com` attached as a custom domain. The deploy command was run by the founder in his own terminal: the Claude Code auto-mode classifier blocked it in the orchestrator's session, so the orchestrator never ran `deploy`; every other step was the orchestrator's |
| Served index SHA-256 | `696b093838b6aba3a2178b2ff097d097d8f49d530cf97403cebb52925cfd0107` (461 bytes) = the uploaded file = the receipt; nothing is injected or rewritten. All 121 served files fetched from `https://trumbiahoi.com` and compared byte-for-byte with `apps/web/dist`: 121 identical, 0 different |
| Headers and redirects | `/` 200 with `Cache-Control: public, max-age=0, must-revalidate`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`; `/assets/index-*.js` one `Cache-Control: public, max-age=31536000, immutable`. `/index.html` 307 → `/`; `/admin` and `/admin/x` 302 → `/`; `/_headers`, `/_redirects` and an unknown path 404. `http://trumbiahoi.com/` 301 → `https://trumbiahoi.com/`; `https://www.trumbiahoi.com/` 301 → `https://trumbiahoi.com/` with path and query kept |
| Smoke | Public only: `TBH_GUEST_URL=https://trumbiahoi.com TBH_GUEST_COMMIT=5336be7da16fb289488a4c519a08e2a0484c5d48 npx playwright test --config playwright.guest.config.ts --workers=1`: **3/3 PASS** — 390×844 17.5 s, 360×740 17.1 s, 1280×720 17.8 s (55.7 s), exit 0, no red line. No stage smoke (first deploy) |
| Viewports red at the two soft lines | None (step 5 public: all three viewports green, so the table-2 soft lines passed too) |
| Owner's word | The founder's instruction of 2026-10-22 (`.autopilot-state/DEPLOY-VFB2-CLOUDFLARE.md`): release `v-fb2` to Cloudflare, first deploy straight to production; he ran the deploy command himself and then told the orchestrator to continue with the checks |
| Domain and zone | `trumbiahoi.com` is registered at Hostinger. The zone lives in the founder's Cloudflare account (maingocanh1702@gmail.com, account `5060d449e8804d9f417e4fda5d797b29`) on the Free plan; nameservers `marjory.ns.cloudflare.com` and `sage.ns.cloudflare.com` (checked with `nslookup` before the deploy). Zone settings set by the founder on 2026-10-22: Always Use HTTPS ON; Rocket Loader OFF; Web Analytics / RUM not enabled; the old parking A record `trumbiahoi.com → 2.57.91.91` deleted; DNS holds only the proxied `CNAME www → trumbiahoi.com`; Redirect Rule "Redirect from WWW to root" (301). Email Address Obfuscation is still ON (it only rewrites HTML that contains an e-mail address; the served index hash equals the upload, so nothing was rewritten) |
| Hosts compared | Cloudflare serves the receipt hash exactly. Netlify (production deploy `6ad9c1d88a0fca5b34f34601`, untouched by this release) serves `0804d3c592a5ce64150221afed12909fe85e541484b6f308f8655d9a0f2c7c97` (787 bytes); `diff` against `dist/index.html` shows only Netlify's injected 3-line "hosted on Netlify" comment, so with it stripped the Netlify index is the receipt too. Same dist manifest hash for both |
| Save boundary | Unchanged and accepted by the founder ([Cloudflare guest](cloudflare-guest.md)): the browser saves of `https://trumbiahoi.com` and `https://trumbiahoi.netlify.app` are separate origins and do not see each other. `trumbiahoi.com` had no players before this release |
| Rollback | `npm run cf -- rollback <version-id>` (asks for confirmation). For this first release there is no earlier version; the next release's rollback anchor is `9fbf210a-e127-49a2-8aba-150c7bc82955`. Browser saves are untouched by a rollback |

| Date | Change |
|---|---|
| 2026-10-22 | `v-fb2` released to Cloudflare (`https://trumbiahoi.com`, Worker `trumbiahoi`, first deploy, version `9fbf210a-e127-49a2-8aba-150c7bc82955`); the two hosts serve the same build again and the temporary difference of the Netlify-only entry ends. |

## Host check — 2026-10-23 (no deployment)

Read-only check of what each host serves, from the Windows laptop on 2026-10-23 03:54–03:58 Asia/Ho_Chi_Minh (2026-10-22T20:54:30Z–20:57:48Z; the hosts' `Date:` headers read 20:54:31–20:54:33 GMT). Nothing was deployed, restored or rolled back, no host, dashboard or zone setting was changed, and nobody logged in: the Netlify CLI and wrangler were already authenticated on the laptop. It re-checks an audit of 2026-10-22 17:34 UTC that opened both hosts in a browser.

How it was measured: `curl` 8.22.0 `GET /` three times per host — curl's default `Accept: */*`, `Accept: text/html`, and a Chrome user agent with a browser `Accept` header — then SHA-256 (`sha256sum`) and byte count of each body. The entry script named in the index and the `App-*.js` chunk it imports were fetched and searched for the Settings build label (the `__TBH_COMMIT__` value, rendered as `<code title="<40 hex>">` with 12 visible characters) and for the bundled `economy config` labels. Netlify: `netlify api getSite` and `netlify api listSiteDeploys` for site `7eac82f8-a0e5-4c64-936b-9e8719a4853c` (netlify-cli 27.14.1). Cloudflare: `npm run cf -- deployments list` (wrangler 4.144.0).

| Field | https://trumbiahoi.netlify.app/ | https://trumbiahoi.com/ |
|---|---|---|
| Served build | **v6**: Settings label `d966975b1f01` (title `d966975b1f018cfe43de0951117eedc7c3db6ead`, the built source of the v6 entry of 2026-09-18) in `/assets/App-CfoaOhWg.js` (340 130 bytes) | **v-fb2**: Settings label `5336be7da16f` (title `5336be7da16fb289488a4c519a08e2a0484c5d48`, source R of the v-fb2 entries) in `/assets/App-DRPkOxYS.js` (408 216 bytes) |
| Config labels in the bundle | economy **2.0.4** (the bundled seed) and the legacy 1.7.3 snapshot; no 2.1.x | economy **2.1.1** (the bundled seed) and the legacy 2.0.4 and 1.7.3 snapshots |
| Entry script | `/assets/index-DVXeVUWd.js` (288 070 bytes) | `/assets/index-zXIXIU5c.js` (294 649 bytes) |
| The v-fb2 files | `/assets/App-DRPkOxYS.js` 404 · `/assets/index-zXIXIU5c.js` 404 | both 200 |
| Served index, `Accept: */*` | 200, 787 bytes, SHA-256 `4c81e0cae7a736344a30ba6733aa8def0931661637e7cbf844c5121ed3ac1e53` (the hash the Netlify v-fb2 entry recorded for the live index before that release) | 200, 461 bytes, SHA-256 `696b093838b6aba3a2178b2ff097d097d8f49d530cf97403cebb52925cfd0107` = the v-fb2 receipt |
| Served index, `Accept: text/html` (and the browser-style request) | the same 787 bytes and SHA-256 | **828 bytes**, SHA-256 `de28672956a92f899f9aae765f79fccd4fdb47e75f574941ff5b280a57afb8e5`: one `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js/…" … data-cf-beacon='…'>` inserted before `</body>` |
| Served index with the host's injection removed | Netlify's 3-line "This site is hosted on Netlify" comment removed: 461 bytes, SHA-256 `34b805019e18072000c3413b4006274540049bf0645eb26a89e9cc4e5c90be57` = the uploaded index of the v6 entry | the beacon `<script>` removed: 461 bytes, SHA-256 = the v-fb2 receipt |
| Deploy record | Published deploy **`6aad0f63f2091edfe7f7cf7b`** (v6, title "v6 guest update: dayKey formatter cache (main 0549542)", created 2026-09-18T10:16:03Z) with `published_at` **2026-10-22T14:56:24Z** (21:56 Asia/Ho_Chi_Minh); the site's `updated_at` is the same second. `listSiteDeploys`: 5 deploys, the newest `6ad9c1d88a0fca5b34f34601` (v-fb2, created 07:57:12Z, published 08:05:43Z on 2026-10-22, no longer the published one); none created after it | One deployment: created 2026-10-22T14:29:42Z, Source Upload, message "v-fb2 5336be7", version **`9fbf210a-e127-49a2-8aba-150c7bc82955`** at 100 % = the Cloudflare entry above |

**1. Netlify serves v6, not v-fb2.** The v-fb2 deploy was the published one from 2026-10-22 08:05:43Z to 14:56:24Z; at 14:56:24Z the previous deploy `6aad0f63…` (v6, the rollback target named in the Netlify v-fb2 entry) became the published one again. No entry in this repository logged that change at the time, and the API answer does not say who made it. **Founder, 2026-10-23: the v6 deploy was re-published by Claude (Cowork) at 2026-10-22T14:56:24Z at the founder's request** ("bản Netlify v6 do Claude (Cowork) publish lại lúc 14:56:24Z ngày 22/10 theo yêu cầu founder"). The "Hosts compared" row of the Cloudflare entry above was true when it was written (before 14:56Z); from 14:56:24Z on, neither it nor any later sentence saying both hosts serve v-fb2 matches what Netlify serves. The entries above stay as written. **Founder decision 2026-10-23: Netlify keeps the old build (v6); do not restore v-fb2 there.** Defaults that follow from it, for the founder to correct: releases go to `https://trumbiahoi.com` only and Netlify stays on v6 until the founder says otherwise; the 3-shift playtest uses `https://trumbiahoi.com` ([Cloudflare guest](cloudflare-guest.md), [PLAN "Vui 3 ca"](PLAN-vui-3-ca-2026-09-18.md) §0, [playtest sheet](phase0-alpha-playtest.md) §7). Rollback anchors are unchanged: the next Cloudflare release rolls back to `9fbf210a-e127-49a2-8aba-150c7bc82955`.

**2. Cloudflare Web Analytics is on (dated correction).** The "Domain and zone" row of the Cloudflare entry above says "Web Analytics / RUM not enabled" and stays as written. Measured today: an HTML request (`Accept: text/html`, which every browser sends) gets the Web Analytics beacon injected into `index.html`; a request without that header (curl's default `Accept: */*`) gets the uploaded file byte for byte. The release entry does not record its request shape; its 461 bytes match a request without `Accept: text/html`. When the beacon was turned on is not recorded. The founder's audit of 2026-10-22 17:34 UTC saw 826 bytes with the beacon and this check 828: the injected tag changes, so a hash taken with it is not a stable receipt. **Founder decision 2026-10-23: keep Cloudflare Web Analytics on.** From now on the byte-identical check of a Cloudflare receipt uses a request without `Accept: text/html`, or removes the beacon `<script>` before hashing ([Cloudflare guest](cloudflare-guest.md)).

| Date | Change |
|---|---|
| 2026-10-23 | Host check, no deployment: Netlify serves v6 (deploy `6aad0f63f2091edfe7f7cf7b`, re-published 2026-10-22T14:56:24Z by Claude (Cowork) at the founder's request, as the founder stated on 2026-10-23; not logged here before), Cloudflare serves `v-fb2` (version `9fbf210a-e127-49a2-8aba-150c7bc82955`) with the Web Analytics beacon on HTML requests; founder decisions 2026-10-23: Netlify keeps v6, Web Analytics stays on. No host or zone setting changed. |
