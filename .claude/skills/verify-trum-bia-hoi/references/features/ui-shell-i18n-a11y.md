# UI shell, i18n & accessibility (`scripts/check_web_copy.mjs`; `docs/features/F25-localization-account.md` §6)

## Observable contract

- **Since 2026-10-15 (fun-locale-default-vi, FEEDBACK I.1) there is no language screen.** `App()` renders
  `StartedApp()` at once and only sets `<html lang>`/title from `locale.ts` `savedLocale()`: a clean profile is
  Vietnamese whatever `navigator.language` says, an explicitly saved `en` stays `en`, anything else is `vi`, and
  Settings → Ngôn ngữ is the only switch. `readSettings()` ignores the removed `localeAccepted`/`welcomed` keys. The
  `main.tsx` loading text reads the same saved locale. The `language-entry` CSS class survives only as the layout
  of the remote account-mode chooser.
- `StartedApp()` (`:69-94`) dispatches on `start()`'s `StartState` union: `'reauth' in state` → a
  recovery `<Account>` panel; `'session' in state` → either a two-mode chooser (`account.modes`
  heading, guest/google buttons, `:78-85`, gated by a `sessionStorage['tbh.playing']`
  per-tab-visit guard) or `<GameView>`; else a `recovery` screen for `'local' in state` (existing
  local archive: export original/legacy backup buttons, "keep local" vs "new server" choice,
  `:88-93`) or a `state.error`-keyed alert (`otherTab|invalidSession|conflict|storage` else
  `unavailable`, `:93`).
- `GameView()` (`:95-493`) is the main shell: `<header class="hud">` (coins, stamina/shift clock,
  settings button, `:363-367`), weather row (`:368`), `stall-scene` (equipment buttons, business-unlock
  props, `:369-376`), and a `<nav aria-label={t('brand')} className="bottom-nav">` (`:388-393`) with
  up to 4 buttons: shift/book toggle, stock, upgrades, journey (with a numeric `nav-badge`
  claimable-count badge). **Since 2026-10-14 (fun-onboarding-visual) shift 1 shows only the wallet and the keg (plus, since 2026-10-15 (fun-next-goal), the "Mục tiêu kế tiếp" chip right under the wallet — see [upgrades-equipment-tables](upgrades-equipment-tables.md)):**
  the settings gear, the shift clock, weather/rush row, stock strip, cooler/washer/kitchen, glass counter and the whole nav stay hidden until
  `onboarding.featureReveal.hudAfterShifts` completed shifts (Upgrades/Journey buttons have their own thresholds, the Upgrades
  sheet shows one card until `upgradeAllAfterShifts`). `reveal.ts` `revealed()` is the single switch; 1.x snapshots and `onboarding.enabled=false`
  reveal everything. Exactly one element may carry `data-spotlight` (`spotlight.ts`), numbers travel through the decorative `.fly-layer`
  and queued groups render in `.door` — proof in `apps/web/test/first-shift-visual.spec.ts` (see [onboarding-guide](onboarding-guide.md)).
- Sheets: a `Sheet` union of 15 named values + `null` (`:22`): `account, seasons, locations, stock,
  upgrades, book, close, journey, settings, config, dog, delivery, signboard, flyer, quests`. Every
  open sheet renders through one shared `<SheetDialog>` (`:40-47`) — a native `<dialog>`
  (`showModal()`/`close()` via `useLayoutEffect`), `aria-label={title}`, closes on `Escape`/backdrop
  click/`onCancel`, and always shows a `role="status"` "sheet-pause" line (`Ⅱ` + `pausedLabel`) — every
  sheet visually and semantically declares gameplay paused while it's open.
- Toast system (`:394-399`): 3 mutually exclusive shapes keyed by `toast.loss`/`toast.gain`/plain — a
  `role="status"` loss toast (`aria-label={t('loss.aria', …)}`), a gain toast, or a
  dismiss-on-click toast; auto-dismiss timer 2400ms (gain) / 5000ms (other) (`:252`, marked
  `config-exempt` — UI-only timing, not sourced from `economy.tbh.json`).
- Network status live region, remote mode only: `<div className="network-status is-{remote.state}"
  role="status" aria-live="polite">` (`:378`) — the only `aria-live` region in the shell.
- The onboarding guide banner (`:387`) and `LoginInvitation` (`:406`) render inside this shell but are
  owned by [onboarding-guide](onboarding-guide.md) — not re-documented here.
- Locale plumbing: `t = (key, params) => translate(locale, key, params)` (`:130`) backed by
  `translate()` in `i18n.ts:6-9`, falling back `target-locale → vi → raw key` and warning via
  `console.warn` (DEV only) on a fully-missing key. `document.documentElement.lang` is kept in sync on
  every locale change (`:53`, `:225-227`) — this is exactly what `accessibility.spec.ts:13` asserts.

## How to reach it

- Player-facing UI: every `.tsx` file that isn't `Admin*` is subject to `scripts/check_web_copy.mjs`
  (33 lines, read in full). `npm run check:i18n` = `node scripts/check_web_copy.mjs`
  (`package.json:23`). It checks: (1) `vi.json`/`en.json` key-set equality (`:5`); (2) per-key
  `{interpolation}` placeholder-set parity between vi/en (`:6`); (3) a hardcoded-copy scan over
  `readdirSync('apps/web/src').filter(f => f.endsWith('.tsx') && !f.startsWith('Admin')).concat('admin-api.ts')`
  (`:7`) — parses each file (rolldown `parseSync`) and fails on: any JSX text/template-literal quasi
  containing a Unicode letter (`\p{L}`) not going through `t()`; the same inside
  `aria-label`/`title`/`placeholder`/`alt` JSX attributes; native `textContent`/`innerText`/
  `placeholder`/`title` property assignments; and any `t('key')` call whose literal key isn't in `vi`
  (`:27`) — so it also catches typo'd/removed keys, not just hardcoded strings.
- **`Admin*.tsx` files are explicitly excluded from this entire check** (`:7`'s
  `!file.startsWith('Admin')`), while `admin-api.ts` is explicitly included — see Gotchas; the admin
  side of this boundary is [admin-registry](admin-registry.md).
- Accessibility: `apps/web/remote-test/accessibility.spec.ts` drives axe-core
  (`@axe-core/playwright`) via `playwright.accessibility.config.ts` (read in full), which is
  `{...require('./playwright.dev-identity.config'), testMatch: 'accessibility.spec.ts', outputDir:
  '.qa/axe-results'}` plus a `TBH_A11Y_TEST=1` prefix on each webServer command — i.e. it inherits
  dev-identity's single `390×844` viewport, 1 worker, 60s timeout, ports `4179` (web,
  `TBH_BROWSER_TEST=1 npm run dev`) / `4180` (API, `TBH_AUTH_DEV=1` dev-login bypass).
- The 3-viewport matrix (`390×844`, `360×740`, `1280×720`) used elsewhere
  (`playwright.playable.config.ts`, read in full: 3 independent projects/ports `4209/4211/4213` web,
  `4210/4212/4214` API, `workers:3`, `fullyParallel:true`) is **not** how `accessibility.spec.ts` gets
  its 3 viewports — that spec instead loops the same 3 sizes **in-test** via
  `page.setViewportSize(viewport)` (`accessibility.spec.ts:4,6`) against the single dev-identity
  server. Two different mechanisms produce the same 3-size coverage — see Gotchas.
- CSS: a single global kill switch, `style.css:204-207` —
  `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto
  !important; animation: none !important; transition: none !important; } button:active { transform:
  none; } .toast:active { transform: translateX(-50%); } }` — `!important`-overrides every
  animation/transition site-wide for the player shell (`main.tsx` imports `style.css`). Two sprite
  animations instead default **on** and are explicitly turned **off** under `reduce`:
  `reference-layout.css:163` (`.dog-object .sprite { animation: none; }`) and `:222`
  (`.has-delivery .sprite { animation: none; }`). Two others default **off** and are turned **on**
  only under `no-preference`: `:239` (`.sign-object:active { transform: rotate(-2deg); }`) and
  `:312-315` (`.equipment-object.kitchen.is-cooking .sprite` cook-animation keyframes).
- 44px hit targets: a global baseline, `style.css:7` (`button { min-height: 44px; … }`), reinforced
  per-component where a control isn't a bare `<button>`: `style.css:21` (`.icon-button` 44×44),
  `style.css:103` (`.guide button` min-width 44px), `admin.css:7,9` (admin form inputs/buttons
  `min-height:44px`), `reference-layout.css:63` (`.table-order-hint` 44px min-height).

## Existing proof

- `apps/web/test/quick-beer-stock.spec.ts` — `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) uses a real DOM purchase and replay inspection to assert full-quote quantity/cost, stock including in-flight batches, one restock event, unpaused timer/reload, 44px and warning-specific axe. Boundaries: `A2 empty raw beer stock remains a refill warning while a batch is still preparing`, `A2 low beer stock keeps the exact unaffordable quote disabled in ${locale}`, and `A2 full beer stock has no low-stock warning or zero-quantity quick purchase`. `A2 stock at the configured batch boundary has no warning despite a nonzero refill quote` pins `stock === batchSize < cap` separately from the full-stock boundary.
- `apps/web/remote-test/quick-beer-stock.spec.ts` — `A2 quick beer refill uses the real server while the shift remains live and reloads once` consumes stock through DOM serving against the isolated API, purchases through the HUD, and checks the authoritative charge/stock, no pause and reload. Run `TBH_PORT_BASE=4178 npx playwright test --config playwright.remote.config.ts apps/web/remote-test/quick-beer-stock.spec.ts`; 4179/4180 must be free because this fixture binds those test ports. Local proof uses `npx playwright test apps/web/test/quick-beer-stock.spec.ts`.


- `apps/web/test/build-info.spec.ts` — `A6 settings shows the build commit in ${locale} at ${viewport.width}px` (VI/EN ×360/390/1280) opens Settings through the DOM, checks the short SHA/full title against the checkout used by Vite, and verifies no overflow or console errors. Run with the default `playwright.config.ts`; screenshot receipts use `a6-build-<locale>-<width>.png`.

- `apps/web/test/instant-pour.spec.ts` (local tier, saves made by `apps/web/test/fixtures/instant-pour.ts` through the real engine): `instant pour: the keg shows one set of numbers and "rót sẵn" counts the beers a guest can get right now (${locale}) at ${w}×${h}` (vi/en × 390 · 360 · 1280: four beers but three clean glasses read `Rót sẵn 3/4 cốc` on the HUD badge and in the pipeline line, the keg sheet shows the reserve + refill of the current and the next level and neither the tap line nor `Đang rót n/m vòi`, axe 0), `instant pour: a guest's beer is in the tray the moment the order is placed, and the badge drops by one (vi) at ${w}×${h}` (the first frame that shows the order shows `.table-order-hint.is-ready`, `data-preparation="ready"`, an enabled Serve) and `instant pour: a capacity pin keeps its tap numbers and waits for the pour (vi) at ${w}×${h}` (an old pin keeps the tap line, `Đang rót 0/1 vòi` and `data-preparation="preparing"` for `pourMs`). The keg sheet is also audited by axe in vi and en at three viewports (0 violations). Run `npx playwright test apps/web/test/instant-pour.spec.ts`.

- `apps/web/test/ui-clarity.spec.ts` — `A5 legacy pinned save shows direct pour without a refill or reserve in ${locale}` (VI/EN) loads the historical v12 archive and pins the direct-pour/no-reserve copy.

- `apps/web/test/ui-clarity.spec.ts` — `A5 zero configured recovery rate shows paused recovery without an invalid ETA` pins the config-allowed zero-rate display without changing engine rules.

- `apps/web/test/ui-clarity.spec.ts` — `A5 clear production stages, customer rounds and first-open art in ${locale} at ${viewport.width}px` (VI/EN × 360/390/1280px) checks the keg's reserve and refill labels (a seat-model game has no tap line since S2 `eco21-instant-pour`; the tap/refill pair of a capacity pin is pinned by `apps/web/test/instant-pour.spec.ts`), customer-round explanation, and manifest-backed tofu/phone/wood-sign preload plus decoded images on the first stock/upgrade visit. `A5 recovery ETA follows active rest, survives reload and disappears when stamina is full` reaches exhausted natural closure through engine commands, checks the configured active-rest countdown and reload/full recovery. Run with `npx playwright test apps/web/test/ui-clarity.spec.ts` (local config).

- `apps/web/remote-test/accessibility.spec.ts` — a templated `for locale of ['vi','en'] for viewport
  of [3 sizes]` double loop generating 6 real test names, each exactly:
  `` `M1-I18N/AXE local guest ${locale} ${viewport.width}x${viewport.height}` `` (`:5`) → `M1-I18N/AXE
  local guest vi 390x844`, `... vi 360x740`, `... vi 1280x720`, `... en 390x844`, `... en 360x740`,
  `... en 1280x720`. Each run drives one guest session through **17 screens** (`audit()` calls at:
  language, guest-choice, rest, yard, order, stock, upgrades, kitchen, cooler, book, settings, account,
  close, quests, journey, ranking, locations) and asserts per screen: `html[lang]` matches the active
  locale (`:13`); zero unresolved `{interpolation}` tokens leak into rendered text (`:14`, regex
  `/\{[a-zA-Z]+\}/`); zero axe violations under `wcag2a/wcag2aa/wcag21aa/wcag22aa` tags (`:15`); zero
  page errors, console errors, or `"Missing copy:"` warnings (`:9` — matches `i18n.ts:8`'s literal
  warning string); zero non-localhost network requests (`:10`). It waits for running CSS animations to
  finish before each audit (`:12`) so axe doesn't false-positive on a mid-transition frame. Writes
  `.qa/axe-<locale>-<viewport>.json`.
- `npm run check:i18n` is a static, always-run proof for every player-facing `.tsx` file (see How to
  reach it) — part of `npm run verify`'s chain per `SKILL.md`.
- `apps/web/test/pause.spec.ts:13` `'stock purchases keep the menu open and the whole game paused
  until closing, then the same table can be served'` directly asserts the shared `role="status"` pause
  line's text (`.sheet-pause` contains `'Tạm dừng'`) inside an open sheet, and that sprite animation
  play-state pauses (`animationPlayState === 'paused'`, `:27`). `pause.spec.ts:37` `'visibility changes
  cannot resume an open settings menu; Escape resumes the original remaining wait and expiry happens
  once'` asserts pressing `Escape` on an open sheet resumes the frozen shift countdown. Real, if
  incidental, proof of the pause line and `Escape`-to-close's effect — not the "no dedicated test"
  gap an earlier pass claimed. **Still genuinely untested in its own right:** focus-return-on-close,
  and whether `Escape` behaves the same across all 15 `Sheet` variants or only the two these specs
  happen to open.
- `apps/web/test/locale-default.spec.ts` (local build, FEEDBACK I.1 acceptance) proves the new contract
  on 390×844 · 360×740 · 1280×720: `a clean profile on a ${language} browser opens straight into the Vietnamese yard
  and Settings keeps English across reload` (`en-US` / `en-GB` / `fr-FR`: no `.language-entry`, no radio,
  `html[lang=vi]`, Settings → English → reload still English), `a saved English choice stays English on a
  Vietnamese browser, and a saved Vietnamese one stays Vietnamese on an English browser`, and `settings written
  by the removed language screen still load, and an unknown language falls back to Vietnamese`. Unit proof:
  `packages/engine/test/presentation.test.ts` `only a saved choice picks the language: a first run is Vietnamese
  whatever the browser says`.
- `apps/web/remote-test/locale.spec.ts` is the remote counterpart (the account-mode chooser "Chọn cách chơi" is the
  first screen): `first run opens in Vietnamese without a language screen and keeps the live shift when Settings
  switches it at ${w}x${h}` (3 viewports; same player, shift and coins after the switch, reload stays English),
  `browser language ${language} never picks the language: the first screen is Vietnamese` (`en-US`/`vi-VN`/`fr-FR`),
  `a saved English choice stays English on a Vietnamese browser`, `settings written by the removed language screen
  keep ${locale} without restarting a live shift`, `an invalid stored language falls back to Vietnamese and still
  opens the game` and `a failed game module offers retry before any player mutation`. The older entry-screen
  cases (server creation blocked until a locale is accepted, radio hit targets, storage-refusal retry) were
  removed with the screen.
- `apps/web/test/requirement-copy.test.ts` — `every progress requirement a bundled or pinned config can show has vi and en copy`
  walks every life-path `requires` token and every unlock gate of the bundled config and the two still-pinnable legacy configs
  (`docs/config/legacy/economy-2.0.4.json`, `economy-1.7.3.json`), rebuilds the `requirement.<kind>` / `requirement.<target>` /
  `league.<target>` / `lifePath.<id>` keys the Upgrades and Journey sheets render, and asserts each exists in `vi.json` and `en.json`.
  It is the static proof for a missing requirement string (the accessibility tier only sees one at runtime, on a screen that renders
  it); it pins `requirement.tables` from rules 28, where LP1 requires "4 tables". Run
  `node --import tsx --test apps/web/test/requirement-copy.test.ts`.

## Verification procedure

- `npm run check:i18n` (part of `npm run verify`) — run after touching any player-facing `.tsx` file,
  `i18n/vi.json`, or `i18n/en.json`.
- `npx playwright test --config playwright.accessibility.config.ts` — real dev-identity server
  (`TBH_AUTH_DEV=1`, ports 4179/4180), full guest a11y sweep; run when changing shell layout, ARIA, or
  copy. **Not** part of `npm run verify`'s default chain (`SKILL.md` lists `check:config → check:i18n
  → build → test → sim:onboarding → sim:rush → sim:career:gate` — no axe step) — run it explicitly.
- **Axe alone does not cover motion or the shared sheet/pause mechanics** — axe asserts static WCAG
  rules, not `prefers-reduced-motion` behavior or `SheetDialog`'s pause/`Escape` contract. When
  changing CSS motion or sheet/dialog behavior, also run `npx playwright test
  apps/web/test/game.spec.ts apps/web/test/pause.spec.ts` (default `playwright.config.ts`) — see
  Existing proof.
- For the 3-viewport layout matrix specifically (not a11y), `npx playwright test --config
  playwright.playable.config.ts` (`apps/web/playable-test/shift.spec.ts`) is the closest existing
  proof, though it doesn't run axe.
- `npx playwright test apps/web/test/locale-default.spec.ts` and `npx playwright test --config
  playwright.remote.config.ts apps/web/remote-test/locale.spec.ts` — run for any change to locale
  persistence/defaulting (`locale.ts`, `readSettings()`), the Settings language switch or bootstrap order
  (see Existing proof).

## Uncovered paths

- **`i18n_missing_key {key, locale}` (spec'd in `docs/features/F25-localization-account.md` §9) is not
  implemented anywhere in code** — `grep -rn "i18n_missing_key"` across the repo returns exactly two
  hits, both in that same doc's own prose (`:79`, `:105`). The real runtime behavior (`i18n.ts:8`) is a
  `console.warn` gated on `import.meta.env.DEV`, firing only when a key is missing from **both**
  locales — a key missing from just one locale can't happen past `check:i18n`'s static parity check,
  so this DEV-only path only ever fires for a key missing from the dictionaries entirely (e.g. a
  runtime-constructed key, or a regression `check:i18n` would already have caught pre-commit).
- **`check_web_copy.mjs:7`'s `Admin*.tsx` exclusion is a checking gap, not a localization exemption**
  (see Gotchas) — the four excluded files (`Admin.tsx`, `AdminCompetition.tsx`, `AdminForecast.tsx`,
  `AdminScope.tsx`) get no automated hardcoded-string/missing-key scan at all; a violation of the
  owner's 100%-i18n-key rule inside any of them is only ever caught by manual review.
- `SheetDialog` focus-return-on-close has no dedicated shell-level test; the shared pause line and
  `Escape`-to-close are incidentally exercised by `pause.spec.ts:13,37` (see Existing proof) but not
  isolated at the `SheetDialog` component level across all 15 sheet variants.
- The two reduced-motion CSS mechanisms are only half-tested: `game.spec.ts:483,571` cover the
  "default-on, turned-off-under-reduce" sprites (dog, delivery phone) via
  `page.emulateMedia({ reducedMotion: 'reduce' })`; no spec exercises the "default-off,
  turned-on-only-under-no-preference" half (`.sign-object:active`,
  `.equipment-object.kitchen.is-cooking .sprite`), and no test isolates the global `style.css:204`
  kill-switch from the per-selector rules `game.spec.ts` actually asserts against.
- `accessibility.spec.ts` only ever drives the **guest** path (`account.playGuest`) — no axe pass
  exists for a signed-in Google session, the Admin screens, or the pre-locale-acceptance error path
  (`entry.storageError`).

## Variants

- **locale** — vi and en, both fully looped by `accessibility.spec.ts`; parity enforced statically by
  `check_web_copy.mjs`.
- **viewport** — 390×844 / 360×740 / 1280×720, looped in-test by `accessibility.spec.ts`, looped via
  Playwright `projects` by `playwright.playable.config.ts` (two different mechanisms, see Gotchas).
- **reduced-motion** — `game.spec.ts:483,571` exercise the "default-on, turned-off" half via
  `page.emulateMedia({ reducedMotion: 'reduce' })`; the "default-off, turned-on-only-under-
  no-preference" half is still untested (see Uncovered paths).
- **missing-copy** — key missing from both dictionaries → DEV console warning only (see Uncovered
  paths); key missing from exactly one dictionary → statically impossible past `check:i18n`.
- **empty/error** — `entry.storageError` (locale-write failure, `App.tsx:57,65`) and the
  `network.*`/`save.*` recovery alerts (`:93,256-265`) are shell-level error variants, not included in
  the axe sweep (see Uncovered paths).

## Gotchas

- **The `Admin*.tsx` exclusion from `check_web_copy.mjs` is a checking gap, not a localization
  exemption.** `check_web_copy.mjs:7` filters `!file.startsWith('Admin')` out of its
  hardcoded-string/missing-key scan (while still including `admin-api.ts`) — that only means no
  automated check catches a hardcoded-English string inside `Admin*.tsx`; it does **not** relax the
  owner's binding 100%-i18n-key requirement for that file. A hardcoded string in `Admin*.tsx` is a
  real violation a human reviewer must still catch, exactly like one anywhere else — see
  [admin-registry](admin-registry.md) for the file list this gap covers, and Uncovered paths.
- **`main.tsx:3-4` loads `style.css`/`reference-layout.css` unconditionally, before either screen is
  chosen** — both the player shell and `Admin.tsx` get the same global stylesheets, including
  `style.css:204`'s `prefers-reduced-motion` kill switch; `Admin.tsx:7` then layers its own
  `admin.css` on top, it does not replace the shared one. `admin.css:19`'s own `@media
  (prefers-reduced-motion:reduce) { .admin-page button { transition:none; } .admin-page
  button:active { transform:none; } }` is therefore **reinforcing** the already-active global kill
  switch for admin's own button transitions, not filling a gap where the global rule "never loads" on
  the admin bundle.
- **`playwright.accessibility.config.ts` has no `projects` array of its own** — its "3 viewports" come
  entirely from the spec file calling `page.setViewportSize()` per test iteration, not from
  Playwright's project-matrix feature the way `playwright.playable.config.ts` uses it. A change to one
  config's viewport handling does not affect the other's.
- vi.json/en.json currently have **814 keys each** (measured via `python3 -c
  "import json;print(len(json.load(open(...))))"`, not from a stale doc) — confirms
  `check_web_copy.mjs`'s key-parity assertion is passing today, not just theoretically enforced.
- `accessibility.spec.ts`'s `"Missing copy:"` console-error assertion (`:9`) is coupled by string
  match to `i18n.ts:8`'s literal `` `Missing copy: ${key}` `` — renaming that warning string without
  updating the spec would silently stop failing the build on a real missing-key regression.

## Related

[onboarding-guide](onboarding-guide.md) — the guide banner/skip button (`App.tsx:387`) and
`LoginInvitation` (`:406`) render inside this shell but their trigger logic lives there; guide copy
goes through the same `t()`/i18n path documented here. [admin-registry](admin-registry.md) —
`Admin*.tsx` is exempt from `check_web_copy.mjs` (see Gotchas); its own accessibility/i18n posture (or
lack of one) is that file's responsibility. [assets-manifest](assets-manifest.md) — `Icon`
(`App.tsx:36`) is inline SVG keyed by a hardcoded `icons` record, entirely independent of
`assets/manifest.json`; only `<Sprite>` (used throughout this shell for game art) and `audio.ts` read
the manifest — don't confuse a missing icon with a missing sprite.

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 A5 | Cite UI clarity, first-open asset preload and active-rest ETA regression; no engine/config rule changes. |

| 2026-09-16 A6 | Cite the Settings build-SHA label in both locales/three viewports; historical deployment receipt is in docs/deploy-log.md. |

| 2026-09-16 A2 | Cite direct HUD full-beer purchase in local and real-server UI; raw empty is distinct from ready/batch reserve. Balance targets remain OPEN in docs/improve-a2-stock.md. |

| 2026-10-20 S2 | Cite `instant-pour.spec.ts` (keg one set of numbers, instant tray, capacity pin's tap, axe 0 on the keg sheet); the A5 line now names the keg's reserve + refill labels. Strings added: `production.tank`, `production.instantHint`, `goal.fx.keg` (vi + en, `check:i18n` 912 paired keys). |

| 2026-10-19 S1 | Cite `requirement-copy.test.ts` (every requirement key has vi + en copy, bundled and pinned configs); rules 28 added the `requirement.tables` row. |


### Wave B — 2026-09-16 proof
- `apps/web/test/menu.spec.ts` — three Sổ ca scenarios include keyboard-native Details, VI/EN six metrics, exact backup export and whole-page axe with the panel expanded (six scans); empty/partial legacy case prevents fabricated ratios. Run `npx playwright test apps/web/test/menu.spec.ts`.

### fun-onboarding-visual — 2026-10-14
- `apps/web/test/first-shift-visual.spec.ts` — minimal first-shift HUD, single spotlight, flying numbers (+ reduced motion), door queue, post-shift-1 reveal and the one-card Upgrades sheet, each at 390×844 · 360×740 · 1280×720 with `AxeBuilder` (wcag2a/aa, 21aa, 22aa) on the ready check, empty-keg warning, door and sheet. Specs that are not about onboarding reveal the HUD through `fixtures/full-hud.ts` / `fresh-game.ts`; the remote/a11y server (`remote-test/server.ts`) does the same, so the 17-screen axe sweep keeps covering the full HUD.

### fun-locale-default-vi — 2026-10-15
- No language screen (FEEDBACK I.1): `locale.ts` `savedLocale()`/`localeOf()` decide the language (saved `en` stays, everything else is `vi`, never `navigator.language`). Proof: `apps/web/test/locale-default.spec.ts` (3 viewports), `apps/web/remote-test/locale.spec.ts` (rewritten for the account-mode chooser), `packages/engine/test/presentation.test.ts` `only a saved choice picks the language…`. The specs that used to click `'Vào quán'` or the language radios now open the game directly; remote specs start an English run from a saved choice via `apps/web/remote-test/locale-seed.ts`. The guest build's browser-only notice moved from the removed screen to Settings → Tài khoản (asserted in `guest.spec.ts`).

## Netlify guest build — 2026-09-16 (updated 2026-10-14: shift 1 is the minimal HUD, so restock/upgrade happen after it closes)

`apps/web/guest-test/guest.spec.ts` → `static guest serves, restocks, upgrades, closes shift and persists across reload/new tab without API`: production guest build on 360×740, 390×844, 1280×720; full service/restock/pause/upgrade/next-day journey, Settings SHA, six close KPIs equal backup, reload/new-tab preservation, admin/online-ranking hidden and zero API/Google requests. Run `npm run build:guest`, copy `apps/web/dist` to `.qa/guest-dist`, then `npx playwright test --config playwright.guest.config.ts`; `TBH_GUEST_URL` targets the verified draft or live URL without a local server. Normal remote/account mechanics are unchanged.

## fun-buy-buttons-reason — 2026-10-19 (loss toast reasons, shift book)

- **One reason per leaving guest** (PLAN P3, supersedes the 2026-09-08 "numeric toast only" override — F27/F07 changelog): `apps/web/src/leave-reasons.ts` maps engine events to `beer` / `food` / `wait` / `seat`
  (`order_expired.cause` beerStock/beerRefill → beer, foodStock → food, any other cause → wait; `customer_left{reason:'queue'}` → wait; `queue_overflow` → seat). `processEvents` shows one `.toast-loss` per batch with `data-reason`,
  the numbers (`.loss-value` ×2) and one `.loss-reason`; a group turned away at the door costs nothing, so its toast shows the reason alone and never replaces the toast of ANY other event of the batch
  (`apps/web/src/batch-toast.ts` is the one projection: the last reward wins, a loss names ONE reason and replaces it). Shipper misses stay numeric-only (no guest reason).
- **Shift book "Vì sao khách đi"** (`.leave-reasons`): the same reasons ranked by guests lost (`leaveRows`, most first, zero rows hidden, ties in beer · food · wait · seat order) from `menuReport().losses` + `shift.stats.rejected`.
- **Proof:** `apps/web/test/leave-reasons.test.ts` (mapping per engine cause, dominant reason of a batch, ranking, and that on a real neglected shift the rows add up to `stats.lost + stats.rejected`);
  `apps/web/test/batch-toast.test.ts` (a refused group never hides the toast of a `quest_claimed` / `attendance_claimed` / `daily_bonus_claimed` / `shipper_*` / `order_served` / `shift_closed` event in either order; loss beats reward; last reward wins);
  `apps/web/test/buy-reasons.spec.ts` — `when a guest leaves the toast says why in one reason (${label}) at ${w}px` (Hết bia · Chờ lâu quá · Hết chỗ × 3 viewports, live engine event, accessible name, no overflow, axe 0) and
  `the shift book lists why guests left, most guests first, at ${w}px` (×3; counts restated from the engine, order differs from the default one so the ranking is observable); `apps/web/test/game.spec.ts`
  `a neglected first shift closes after remaining guests expire and shows the numbers of the loss with exactly one reason` and the expiry assertion in `tapped order stays live, returns keyboard focus, and closes on customer expiry`.
- **HUD "Nhập bia" does not pause** (PLAN §4 check row): already proven by `apps/web/test/quick-beer-stock.spec.ts` `A2 HUD full beer refill keeps live time and survives reload in ${locale} at ${w}px` (`paused === false`, no dialog, `remaining` keeps counting).

## eco21-capacity-demand (S3) — 2026-10-20 (shift book "Cặp không có chỗ")
- **Shift book "Cặp không có chỗ: n"** (`.leave-pairs`, `data-pairs`, under the "Vì sao khách đi" list; vi `book.pairsNoSeat` "Cặp không có chỗ: {n}", en "Pairs without a seat: {n}", `check:i18n` 913 paired keys): the pairs turned away at the door for lack of a two-chair table = `pairsWithoutSeat(shift.stats)` = `floor(noSeat / PAIR)` (`apps/web/src/leave-reasons.ts`); shown only when > 0, never on a capacity save (no `noSeat`). Singles refused for a full queue stay in the "Hết chỗ" reason row (guests, like every reason). The refusal toast ("Hết chỗ", no coins, no reputation) and the door bubble ("2 ghế" / "Hết chỗ") were Wave 1.
- **Proof:** `apps/web/test/leave-reasons.test.ts` — `S3: the shift book counts pairs turned away for lack of a two-chair table: noSeat guests / PAIR, nothing on a capacity save, never negative` and `S3: on a real one-table shift the pairs line is exactly the pairs the engine turned away at the door (queue_overflow noSeat), singles refused for a full queue are not pairs`; `apps/web/test/buy-reasons.spec.ts` `the shift book lists why guests left, most guests first, at ${w}px` (×3; fixture `book` waits for ≥ 2 `noSeat` guests, the spec restates the pairs from the engine's count; axe 0, no horizontal overflow).

## eco21-table-chair-upgrades (S4) — 2026-10-20 (table card)
- **Table card** of the Upgrades sheet on a snapshot with the level ladders: `.table-perk` (a `p` with the level, `level` "Cấp {n}", and a `ul` with one short chip per benefit the level gives: `table.benefit.rounds` / `.snack` / `.tip`, or `table.benefit.none`; review round 1 replaced the one 12-word line of a Lv4 table), `.chair-perk` (`table.chairLevel` "Ghế cấp {n} · kiên nhẫn ×{mult}"), the chair button `upgrade.chairUp` ("Nâng ghế · {cost} xu"), the two max labels `upgrade.tableMax` ("Bàn đã tối đa") and `upgrade.chairMax` ("Ghế đã tối đa") so a card maxed on both ladders does not show two buttons with one name, the reason `reason.lifePathRequired` ("Cần đạt {name}"), the chip effects `goal.fx.rounds` / `goal.fx.snack` / `goal.fx.tip` (a fraction such as ×1,25 goes through the locale decimal formatter in `GoalChip.say`, like the card), and `error.chairUpgradeUnavailable` (the refusal a stale client can still get); `check:i18n` 925 paired keys, labels ≤ 6 words (pinned for every line, chip and button of the cards in `table-upgrades.spec.ts` and `buy-reasons.spec.ts`), English `Upgrade chairs · {cost} coins`, `Reach {name} first`, `Level {n}`, `Chairs level {n} · patience ×{mult}`, `Table at max level`, `Chairs at max level`.
- **Proof:** `apps/web/test/table-upgrades.spec.ts` `table and chair levels: price by target level, what each gives and one reason per dimmed button (${locale}) at ${viewport.width}×${viewport.height}` ×6 (axe 0 on the open sheet, every button ≥ 44 px, no horizontal scroll at 390 · 360 · 1280, exactly one reason line per dimmed button on every card).

## eco21-ui-assets (S6) — 2026-10-21 (quick chair, yard copy, chair goals)
- **Copy (vi/en, `check:i18n` 933 paired keys, labels ≤ 6 words):** `goal.buyChair` "Thêm ghế bàn {n}" / "Add chair to table {n}", `goal.chairLevel` "Nâng ghế bàn {n}" / "Upgrade chairs of table {n}", `goal.fx.patience` "kiên nhẫn ×{n}" / "patience ×{n}" (the fraction goes through the locale decimal formatter like the tip), `upgrade.quickChairTitle` "Mua ghế nhanh" / "Quick chair purchase", `upgrade.quickChair` "Mua ghế bàn {n} · {cost} xu" / "Add chair · table {n} · {cost} coins", `yard.slot` "Chỗ đặt bàn còn trống" / "Empty table spot", `table.tray` "Mâm {n} món" / "Tray slots: {n}".
- **HUD "Mua ghế" does not pause** (PLAN D10, S6 row): `apps/web/test/quick-chair.spec.ts` `S6 quick chair purchase buys one chair with one tap, keeps the shift clock running and survives reload in ${locale} at ${viewport.width}px` (`paused === false`, no `dialog[open]`, `.game` not `is-paused`, `remaining` keeps counting; the section passes axe `wcag2a/2aa/21aa/22aa`, the button ≥ 44 px). The 44 px floor of the yard's table targets and the no-overlap layout of eight tables at 360 px: `apps/web/test/yard.spec.ts`; reduced motion: its `S6 reduced motion: the live yard animates (the spotlight pulse) without it and not at all with it, while the static cues (chairs, tray, spots) stay` case (no new animation was added: `.tray`, `.table-slot`, `.quick-chair` are static).
- **Review round 1 (2026-10-21):** `reason.chairsLocked` is "Mở sau khi đủ {n} bàn" / "Opens at {n} tables" and `error.chairsLocked` "Ghế thứ 2 mở sau khi đủ {n} bàn." / "A second chair opens at {n} tables." (`n` = `chairsAfterTables`; it said "Mua đủ bàn trước", false on the eight-place alley), `goal.fx.seatsTo` "{from} → {to} chỗ" / "seats {from} → {to}" and `goal.fx.patienceTo` "kiên nhẫn ×{from} → ×{to}" / "patience ×{from} → ×{to}" replace `goal.fx.patience`; every capacity block of the sheet prints its effect as `.goal-effect` (≤ 6 words, pinned by `table-upgrades.spec.ts`'s six-word check over `h3, p, li, button`). `check:i18n` 934 paired keys. Proof: `seat-model.spec.ts` (the number in the reason, the three effects), `buy-reasons.spec.ts` (the number from the config), `table-upgrades.spec.ts` (×1 → ×1,15 then ×1,15 → ×1,3).
- **"Mời về" in the table popover (Wave 3, 2026-10-22):** `#active-table-order` gains, for a table with guests, `.kick-table`: a price line `kick.price` "{cost} xu · −{rep} uy tín" / "{cost} coins · −{rep} reputation" from `kickTableQuote`, the button `kick.button` "Mời về" / "Send home" (accessible description = the price, then the reason), dimmed with exactly one `.buy-reason` (`reason.tableNotLingering` "Khách chưa dùng món xong" / "Guests haven't finished their order", or `reason.notEnoughCoins`); refusal toasts `error.tableNotLingering`, `error.kickCostChanged`, `error.kickTableUnavailable` (940 paired keys). Shown once `revealed().hud` (after shift 1), only while the shift is open (`w.phase === 'open'`: not while it closes) and only on a snapshot with the `kickTable` section. No new animation; the falling reputation (`.fly-rep`) stops under `prefers-reduced-motion` (the global rule). A11y: the new axe scan of a lai rai popover found the pre-existing `.customer-tag.type-ngoily` at 4.17:1 (cream on #387eac): now #2f6e99, 5.2:1. Proof: `apps/web/test/kick-table.spec.ts` — `Wave 3 Mời về on a lingering table shows its coins and reputation, one tap sends it home and the waiting group sits down (${locale}) at ${viewport.width}px` (vi/en × 390/360/1280: ≤ 6 words, ≥ 44 px after the popover's 160 ms entry, `toBeInViewport({ ratio: 1 })`, at most one `[data-spotlight]`, no horizontal scroll, axe 0 on the popover), `Wave 3 a table whose guests wait for their food shows Mời về dimmed with exactly one reason, next to the serve button (${locale}) at ${viewport.width}px` (×6, axe 0), `Wave 3 a short wallet: the price stays on screen and Mời về is dimmed with "not enough coins" at ${viewport.width}px` (×3, axe 0), `Wave 3 D3: a Chi Pheo who keeps his table goes home for 0 coins and the reputation of one guest`, `Wave 3 ${why}` (S6 pin, shift 1: no block), `Wave 3 a closing shift offers no Mời về: the lingering table's popover has no send-home block at ${viewport.width}px` (×3), `Wave 3 ${reduce ? 'with' : 'without'} reduced motion: the send-home block has no motion of its own; the falling reputation ${reduce ? 'stays still' : 'moves'}`.
- **Review round 1 of Wave 3 (2026-10-22):** the "Mời về" block is offered only while the shift is open (`App.tsx`: `show.hud && w.phase === 'open' && …`): once the player closes the shift no guest arrives and the shift book's "Mời tất cả về" (kickAll, `penalty.leaveRate` per guest) is the cheaper way out; the engine still accepts `kickTable` during closing (a tap sent before the close lands). `reason.tableNotLingering` is "Khách chưa dùng món xong" / "Guests haven't finished their order" (true for `seating` and `waiting`; it said "Khách đang chờ món" / "Guests await their food") and `error.tableNotLingering` "Bàn này chưa mời về được lúc này." / "This table can't be sent home right now." (a table that emptied between render and tap, a second remote tap on a table already being cleaned; it said the guests wait for food). Same 940 paired keys. Proof: `apps/web/test/kick-table.spec.ts` `Wave 3 a closing shift offers no Mời về: the lingering table's popover has no send-home block at ${viewport.width}px` (×3; fixture mode `closing`: the quote is ok, so the popover hides the block because of the phase; UI mutation U7 — the phase condition removed — turns it red) and the dimmed-reason case above, whose assertions read the new text from the i18n files unchanged.
- **Review 07 r1 (2026-10-22, stage 07):** the reduced-motion yard case is cited by its name since S6 review round 1 (`S6 reduced motion: the live yard animates (the spotlight pulse) without it and not at all with it, while the static cues (chairs, tray, spots) stay`). Layout: every row of the eight-place yard keeps a band for the order bubbles of the row below (`.yard-grid` `row-gap: 49px`; the lingering case and the limits are in the two bullets below), so a one-row order bubble of row 2+ does not cover the caption or state of the table above: `apps/web/test/yard.spec.ts` `S6 a busy alley: the order bubbles of every row cover no other table's caption or drawing, at ${viewport.width}px` (fixture `rows`: eight tables of two chairs, an open order at every table; no box of a bubble or its patience track intersects another table's `.table-caption` or `.table-object`, at 360 · 390 · 1280). `S6 a full first alley …` now asserts no `.opening-note` before its screenshot (the fixture plays one shift). Number formatting: the QR business card prints "×1,2" in Vietnamese like the goal chip (`economy2.spec.ts`, both languages).
- **Review 07 r1, after its accessibility run (2026-10-22, stage 07):** the rest note (`.opening-note`: "Quán nhỏ đã sẵn sàng", its "Mở ca" and "Chơi miễn phí · Không cần đăng ký") hangs from the top of the yard with the height of its text (`inset: 12px 10px auto`, `style.css`). Centred in a box of 15-90 % of the yard, its start button slid under the sticky bottom nav once the round's 31 px row band made the yard taller (`apps/web/remote-test/accessibility.spec.ts` red at 1280×720 in vi and en: axe `target-size`, ".opening-note > .primary" partly covered), and it already sat under the nav at 360×740 with the HUD shown: `apps/web/test/yard.spec.ts` `S6 at rest the opening note's start button is whole on screen above the bottom nav (${locale}) at ${viewport.width}px` (vi, en × 360 · 390 · 1280: the button wholly in the viewport, its four corners and centre not painted over by another element, axe clean, no horizontal scroll; red 6/6 on the old rule). The accessibility tier is 6/6 again with it.
- **Review 07 r1, second look at the yard (2026-10-22, stage 07):** every row band now clears, for a ONE-row order bubble, the measured captions above it (a lingering table's label, state and countdown included, with 0 px to spare): `.yard-grid` `row-gap: 49px` — `apps/web/test/yard.spec.ts` `S6 a busy alley under lingering tables: no order bubble covers the label, state or countdown of the table above, at ${viewport.width}px` (360 · 390 · 1280; red at 31 and 48 px).
- **Review 07 r2 (2026-10-22, stage 07):** the yard band is proven for one-row bubbles over the captions of fixtures `rows` / `linger-rows` (Lv1 tables, at most three dish icons, the fallback UI font); not covered (review 07 r2, recorded, not fixed): a spotlit Lv3+ pair table whose order holds three or more different snacks wraps its bubble into a second row that covers about 25 px of a lingering countdown above (22 px of the door band on row 1; four different snacks wrap even unlit), and a UI font taller than the fallback adds about 2 px; remedy if it shows: a one-row bubble (`flex-wrap: nowrap`, narrower sprites past three icons) and a `linger-rows` variant with Lv3 pair tables. Stated in the `.yard-grid` comment of `apps/web/src/style.css`.
- **Owner calls of PR #30 (2026-10-22, stage 07b):** the HUD quick "Mua ghế" follows a goal chip that suggests no second chair while a table can be bought, so it shows only once every place holds a table: `apps/web/test/quick-chair.spec.ts` `owner call 3 while a table can still be bought the chip points at it and the quick chair button is not shown; the sheet still sells the chair at ${viewport.width}px` (360 · 390 · 1280); the S6 cases run on a full alley of eight one-chair tables. The "Mời về" price line reads the quote at `feeRate` 0.5 (JSON 2.1.1; `kick-table.spec.ts` unchanged, its fixtures price through the engine).
