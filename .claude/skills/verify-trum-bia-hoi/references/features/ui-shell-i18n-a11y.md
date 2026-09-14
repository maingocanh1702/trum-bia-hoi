# UI shell, i18n & accessibility (`scripts/check_web_copy.mjs`; `docs/features/F25-localization-account.md` §6)

## Observable contract

- `App()` (`App.tsx:49-68`) gates on `settings.localeAccepted` — shows a `language-entry` welcome
  form (`aria-label={t('entry.title')}`, a `vi`/`en` radio fieldset, `Sprite id="glass-full"`) until
  a locale is explicitly accepted via submit (`:60-67`), then renders `StartedApp()`.
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
  exactly 4 buttons: shift/book toggle, stock, upgrades, journey (with a numeric `nav-badge`
  claimable-count badge).
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
- No dedicated test exercises the shared `SheetDialog`/toast/bottom-nav shell mechanics directly
  (focus-return-on-close, `Escape`-to-close, the `role="status"` pause line) in their own right — they
  are only incidentally exercised by whichever feature spec happens to open a sheet. Treat that as
  Uncovered, not proof.

## Verification procedure

- `npm run check:i18n` (part of `npm run verify`) — run after touching any player-facing `.tsx` file,
  `i18n/vi.json`, or `i18n/en.json`.
- `npx playwright test --config playwright.accessibility.config.ts` — real dev-identity server
  (`TBH_AUTH_DEV=1`, ports 4179/4180), full guest a11y sweep; run when changing shell layout, ARIA,
  copy, or CSS motion/focus rules. **Not** part of `npm run verify`'s default chain (`SKILL.md` lists
  `check:config → check:i18n → build → test → sim:onboarding → sim:rush → sim:career:gate` — no axe
  step) — run it explicitly.
- For the 3-viewport layout matrix specifically (not a11y), `npx playwright test --config
  playwright.playable.config.ts` (`apps/web/playable-test/shift.spec.ts`) is the closest existing
  proof, though it doesn't run axe.

## Uncovered paths

- **`i18n_missing_key {key, locale}` (spec'd in `docs/features/F25-localization-account.md` §9) is not
  implemented anywhere in code** — `grep -rn "i18n_missing_key"` across the repo returns exactly two
  hits, both in that same doc's own prose (`:79`, `:105`). The real runtime behavior (`i18n.ts:8`) is a
  `console.warn` gated on `import.meta.env.DEV`, firing only when a key is missing from **both**
  locales — a key missing from just one locale can't happen past `check:i18n`'s static parity check,
  so this DEV-only path only ever fires for a key missing from the dictionaries entirely (e.g. a
  runtime-constructed key, or a regression `check:i18n` would already have caught pre-commit).
- `SheetDialog` focus-return, `Escape` handling, and the shared pause line have no dedicated
  shell-level test (see Existing proof).
- No test asserts the two reduced-motion mechanisms (global kill-switch vs. scoped `no-preference`
  gating) actually behave correctly together — axe checks static WCAG rules, not
  `prefers-reduced-motion` compliance, and no spec calls `page.emulateMedia({ reducedMotion })`.
- `accessibility.spec.ts` only ever drives the **guest** path (`account.playGuest`) — no axe pass
  exists for a signed-in Google session, the Admin screens, or the pre-locale-acceptance error path
  (`entry.storageError`).

## Variants

- **locale** — vi and en, both fully looped by `accessibility.spec.ts`; parity enforced statically by
  `check_web_copy.mjs`.
- **viewport** — 390×844 / 360×740 / 1280×720, looped in-test by `accessibility.spec.ts`, looped via
  Playwright `projects` by `playwright.playable.config.ts` (two different mechanisms, see Gotchas).
- **reduced-motion** — CSS-only guarantee today; not exercised by any Playwright spec.
- **missing-copy** — key missing from both dictionaries → DEV console warning only (see Uncovered
  paths); key missing from exactly one dictionary → statically impossible past `check:i18n`.
- **empty/error** — `entry.storageError` (locale-write failure, `App.tsx:57,65`) and the
  `network.*`/`save.*` recovery alerts (`:93,256-265`) are shell-level error variants, not included in
  the axe sweep (see Uncovered paths).

## Gotchas

- **The `Admin*.tsx` i18n exemption is real, not theoretical** — `check_web_copy.mjs:7` explicitly
  filters `!file.startsWith('Admin')` while still including `admin-api.ts`. See
  [admin-registry](admin-registry.md) for the admin-side consequence (hardcoded English is expected
  there, not a bug).
- **`style.css` and `admin.css` are separate bundle entries, not layers of one stylesheet** —
  `main.tsx:3` imports `style.css` (the player shell); `Admin.tsx:7` imports `admin.css` on its own.
  That's *why* `admin.css:19` needs its own `@media (prefers-reduced-motion:reduce) { .admin-page
  button { transition:none; } .admin-page button:active { transform:none; } }` — the shared shell's
  global kill switch (`style.css:204`) never loads on the admin bundle, so admin has to repeat the
  pattern locally rather than being redundant with it.
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
