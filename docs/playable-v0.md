# playable-v0

Latest client acceptance: **playable-v0.2**, documented in “Local release v0.2” below. Historical v0/v0.1 evidence is retained.

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

## Local release v0.2 — owner decision 2026-09-11

**PASS — local playable acceptance.** Runtime code: `422560ebdc3450fb7891501ec4d80d1d42a39b1b`; tag `playable-v0.2` includes this release note. Resolve its commit with `git rev-parse 'playable-v0.2^{commit}'`. The immutable tag is the preview build; later operation notes may exist on the writing branch.

Included: corrected dev-account form validation; explicit unowned kitchen state and compact kitchen sprites; cooler freshness/weather explanation; seven core screens; prompt numeric-only timeout penalties; measured current-shift upgrade suggestions with keyboard navigation; VI/EN copy gate and accessible control contrast. Guest gift/referral actions remain unavailable. M1 is 11 PASS / 1 human-test WAIVED; M5-F14-SUMMARY is PENDING post-v0.2. M6/M7/M8 stay deferred/hidden; no monetization.

Config remains 2.0.3 / rules24. No engine/config values changed in this batch, so no new registry publication is needed; the existing normal `next_shift` publication `registry-183f67c7-2c6e-489a-94d5-0862e29bb0f7` and current shift pins are retained. All 132 manifest entries resolve: 121 draft files / 3 working placeholders, 32 paired SFX. Draft assets are release-ready under the owner's waiver; art polish is pending.

| Viewport | First playable | RAF fps | Served | Full shift / restock / upgrade / next day / reload / new tab | Console / failed requests |
|---|---:|---:|---:|---|---|
| 390×844 | 1154 ms | 60.25 | 58 | PASS | 0 / 0 |
| 360×740 | 659 ms | 60.25 | 83 | PASS | 0 / 0 |
| 1280×720 | 974 ms | 60.22 | 83 | PASS | 0 / 0 |


Full verify:406/406 unit/server tests, 10 standard cohorts k 2.5644–2.9168, 15 rush cases, 30-day career seeds 42/99 k 3.465460767842698 / 3.393196640939153 ≤ 3.5. `check:assets` and 804 VI/EN key checks PASS. Axe:6/6 tests, 17 screens × 2 locales × 3 viewports = 102 scans, 0 violations. Focused upgrade checks 9/9, timeout/pause/reconnect 6/6, seven-screen smoke 3/3. Independent full-diff review's single keyboard-focus finding was fixed and its follow-up is CLEAN.

Fresh gate receipts: `.qa/playable-v02-final-{verify,assets,smoke}.txt`, `.qa/playable-{390,360,1280}.json`; review `.qa/playable-v02-review-verdict.txt` plus `.qa/playable-v02-review-followup.txt`; focus `.qa/playable-v02-focus-{red,green}.txt`; axe `.qa/playable-v02-final-axe.txt`; guest visibility `.qa/steer17-quests-visibility.txt`. Timing/FPS are desktop Chromium at mobile viewport sizes, not physical-device results.

### Start / stop the pinned local game

Open [Trùm Bia Hơi local](http://127.0.0.1:5174/). Pinned checkout: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.2`; API 5175. After cutover, these commands control both dedicated launchd jobs. They leave the same player database and cookies in place:

```sh
python3 /Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.2/.qa/playable-runtime/control.py status
python3 /Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.2/.qa/playable-runtime/control.py stop
python3 /Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.2/.qa/playable-runtime/control.py start
```

Use one action at a time. `start` is idempotent and can load the jobs after logging in again; jobs are registered for the current login session, not installed as login items. The helper refuses jobs owned by another checkout. Logs, backup and actual runtime receipt live beside the helper. Do not run a second API process against `.qa/game-api.sqlite`.

Known limits: **localhost dev identity only; real Google Client ID/consent pending; no CAPTCHA or production hosting**. Admin requires a private allowlist/TOTP and is disabled in the owner preview. No external release or human playtest is claimed. The Production deployment checklist in this document remains PENDING. The cutover and master fast-forward will be recorded only after their checks finish.


### Local v0.2 cutover complete — 2026-09-11

Launchd `local.tbh.playable-web` / `local.tbh.playable-api` now serve tag **playable-v0.2**, commit **ad94161ab25185ed6e40107a770c4070810fd9d7**, from `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.2` on localhost 5174/5175. Served index SHA-256 `38464756630f628c5ea4fbff229ba0c058b0a8b2a364b4e4dbe76f01e8a77cb5` equals the tested build. The start/stop/status helper is installed beside the runtime plists; use the commands above.

The existing SQLite path and cookies are unchanged. Backup: pinned checkout `.qa/playable-runtime/game-api-before-playable-v0.2.sqlite`. Read-only comparison preserved all 6 prior players, 7,150 commands, 4,942 events, 36 client receipts, 4 config snapshots, 8 registry audit records and 2 publication records; all 5 same-shift pins match, no shift advanced during cutover. No new config publication was necessary. Runtime smoke confirms buffer 4/4, six stock rows, risk UI hidden and mid-shift dev sign-in preserving player/shift/coins with **zero core or account-console errors**. This fixes the historical v0.1 dev-form console limitation.

Evidence: `.qa/playable-v02-{cutover.txt,preservation-receipt.json,runtime-smoke.json,runtime-smoke.txt}` and pinned `.qa/playable-runtime/receipt.json`. Helper mocked start/stop/rollback/wrong-checkout tests PASS; operation review CLEAN. All 37 original-checkout WIP hashes and its `codex/build-game` branch are unchanged. Master landing/check evidence is recorded below; no push or production operation.


### Master landing — local only, 2026-09-11

`master` was fast-forwarded from `30c0285e40ee6d922f44ef8412bce50892a84f75` to the first local landing `51c852dbe6fdef80a561530db891c2ed6cb67206` using `git merge --ff-only codex/game-build-isolated` in `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-master-v02-verify`. This documentation-only receipt is also fast-forwarded before the dedicated merged-master check; it changes no runtime code. No merge commit, rebase, history rewrite or push.

Dedicated check: `npm run verify` in that temporary master worktree, with output retained in the writing checkout `.qa/playable-v02-master-verify.txt`. The success-only receipt `.qa/playable-v02-master-verified.json` records the final master hash and test result after command completion; remove the temporary worktree only after PASS. The main checkout remains on `codex/build-game` with its WIP untouched. The running preview stays at immutable tag `playable-v0.2` (`ad94161`), independently of these documentation commits.


## Local v0.3 scope — owner update 2026-09-11

Release work is in progress;5174/5175 still serve accepted playable-v0.2.
**F12-CLAIM: PENDING (owner decision 2026-09-11 13:33), OUT of playable-v0.3.** Season reward grants, idempotent prize claims and the mailbox wait for a defined per-tier prize table. No prizes or reward config will be invented. Immutable season snapshots, captured names and history remain in scope.


## Local release v0.3 — 2026-09-11

**PASS — local playable acceptance.** Source/evidence commit `b67470fe01730f5197c2d808faf3458d92b1e13d`; tag `playable-v0.3` adds this note. Resolve its exact commit with `git rev-parse 'playable-v0.3^{commit}'`. The tag is immutable; cutover and master verification receipts are recorded separately below after completion.

Included: v0.2 gameplay plus historical location multipliers in the shift book; stable/paginated live ranks; immutable end-season public names/scores, podium/wall and history; admin-edited onboarding thresholds/step contents; disabled onboarding hides a retained guide. Existing guest progress, mid-shift localhost dev sign-in, pause/restock/upgrade behavior remain. No engine rule or economy/config value changed; current2.0.3 buffer remains4/7/12/20/40, so no registry publication is required.

| Viewport | First playable | Measured FPS | Served in full shift | Shift/book/next-day/reload/new-tab |
|---|---:|---:|---:|---|
| 390×844 | 1436 ms | 60.44 | 76 | PASS |
| 360×740 | 1154 ms | 60.25 | 90 | PASS |
| 1280×720 | 1159 ms | 60.35 | 64 | PASS |

All three tests ran full12-minute shifts with real UI serving, stock/restock, washing and an actual upgrade; zero console/page errors and zero missing assets. Chromium viewport measurements are local desktop evidence, not a physical-phone benchmark.

Full `npm run verify`:418/418 tests;20 paired onboarding cohorts (on2.5644–2.9168; off2.4866–2.9590);15rush cases;30-day career42/99 k3.465460767842698/3.393196640939153≤3.5. `check:assets`:132entries,121drafts,3placeholders,32pairedSFX PASS. Snapshot6browser/6axe scans zero violations; onboarding normal-admin publication test covers four VI/EN×on/off combinations. Independent batch/correction and local-operation review CLEAN.

Run after cutover: open [the game](http://127.0.0.1:5174/), API on5175. Start/stop/status commands:

```sh
python3 '/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.3/.qa/playable-runtime/control.py' start
python3 '/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.3/.qa/playable-runtime/control.py' stop
python3 '/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.3/.qa/playable-runtime/control.py' status
```

The login-session launchd jobs remain `local.tbh.playable-web` / `local.tbh.playable-api`. Existing SQLite stays at the writing checkout `.qa/game-api.sqlite`; cookies/progress are retained. The pinned checkout contains built web output; API runs its matching TypeScript through the installed runtime.

**F12-CLAIM PENDING (owner2026-09-11), OUT of v0.3:** no season prize quantities, grant/claim or mailbox is invented. M6/M7/M8 remain deferred/hidden; no monetization, inspection or lottery. Production hosting/HTTPS/domain, real Google OAuth/consent, CAPTCHA, PWA/physical-device acceptance and social/referral remain PENDING. Local dev identity is explicitly enabled only on localhost/non-production. Owner preview admin remains disabled without a private allowlist/TOTP. M1/M3 reconciliation adds no assets or new gameplay: the sole M3 art-batch FAIL stays tracked for M9; human rows remain WAIVED.

Receipts in the writing checkout `.qa/`: `v03-onboarding-verify.txt`, `playable-v03-{assets,smoke}.txt`, `playable-v03-{390,360,1280}.json`, `v03-snapshot-receipt.json`, `v03-onboarding-receipt.json`, `v03-release-review.txt`, and `playable-v03-control-tests.txt`. Cutover backup/preservation and exact master verification are separate success-only receipts. No push or production operation.


### Local v0.3 runtime cutover — PASS, 2026-09-11

Tag `playable-v0.3` is `261f23316e025ea56e88f372c884c5c50ab4cdbd`. Both launchd jobs now use `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-playable-v0.3`;5174 serves the byte-identical built index (SHA256 `d656c0fc52e2c54be66f574c7a44c1c36ba6aa087483487708e707692b25eb4b`),5175 runs the matching API. SQLite/cookies stay unchanged; backup is pinned `.qa/playable-runtime/game-api-before-playable-v0.3.sqlite`.

Preservation PASS:7prior players,7155commands,4959events,37client receipts,4config snapshots,8audit records and2publications retained byte-for-byte;6same-shift pins match,0shifts advanced during cutover. Normal config publication is unnecessary because no config values changed. Runtime smoke confirms4/4ready buffer,6stock rows, hidden risk controls and mid-shift localhost dev identity retaining player/shift/coins with0console errors.

All37main-checkout WIP hashes and its `codex/build-game` branch are unchanged. Evidence: `.qa/playable-v03-{cutover.txt,preservation-receipt.json,runtime-binding.json,runtime-smoke.json}`, pinned runtime receipt/control helper. No production operation or push.

### Local v0.3 master landing / verification record

Next authorized operation: fast-forward `master` from `7d1c25595af86067a63d5a43a48c47bf80c09814` to this writing branch through the clean temporary worktree `trum-bia-hoi-master-v03-verify`, then full `npm run verify` in that worktree. The main checkout is never switched or stashed. Exact ff commit is recorded in `.qa/playable-v03-master-ff.json`; success-only `.qa/playable-v03-master-verified.json` records the final master hash,418test result and log SHA256 after completion. Retain `.qa/playable-v03-master-verify.txt`, then remove the temporary worktree only after PASS. These receipt files distinguish a completed check from this planned record. The preview stays on its immutable v0.3 tag independently of later documentation commits.
