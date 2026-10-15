# First-run language entry

> **Superseded 2026-10-15 (owner 17/09, `docs/FEEDBACK-2026-09-17.md` I.1; slice `fun-locale-default-vi`).** There is no language entry any more:
> the game opens straight into the yard in Vietnamese whatever the browser language is, a saved English choice stays English, and Settings is the
> only place that changes it (`apps/web/src/locale.ts`). The decision table below is kept for history; only its "changing language in Settings" and
> "never erase a gameplay save" lines still hold. Legacy settings with `localeAccepted`/`welcomed` still load (the keys are ignored).


Base `6df1228`. F25 §3/§6/§10 requires choosing or accepting vi/en before the
first gameplay screen. Move the existing welcome into a pre-boot entry, before
local save creation or remote session/connect requests. Keep the native-language
options visible and let the existing Enter the stall action accept the choice.
Persist a selected language immediately and the explicit acceptance before boot;
failed preference writes keep the user on the entry with a retryable error.

Decision table:
- Fresh device: suggest the browser's vi/en language; unsupported language → vi.
- Saved valid locale without acceptance: show that choice and require acceptance.
- Explicit acceptance with a valid locale: boot directly, including after reload.
- Legacy welcomed settings: preserve valid locale; missing legacy locale means vi
  (the previous runtime default). Do not replay welcome over an existing shift.
- Invalid/corrupt settings: show entry; never erase a gameplay save to recover them.
- Changing language in Settings updates copy without replacing the game/session.

Use existing assets/palette/buttons/settings storage; no new dependency, engine
command, account/auth mutation, economics or login-prompt policy in this slice.
Follow with the real Google web/account flow and configured soft invitations.
Verify local and remote pre-boot boundaries, defaults, reload/legacy preservation,
storage refusal, live-shift language change, keyboard/44px/mobile/desktop behavior,
config/build/unit/browser regressions and independent review before acceptance.

| Date | Change |
|---|---|
| 2026-09-10 | First-run locale contract; full account/login acceptance remains open. |

| 2026-09-10 bootstrap correction | A frozen-clock regression exposed the unnecessary React Suspense reveal timer at the one-page entry. Native dynamic imports now retain code splitting and mount the resolved screen directly; import failure has an explicit retry without touching player data. Old recovery tests accept locale before inspecting the unchanged archive recovery behavior. |

## First-run locale verified — 2026-09-10

Code `5871453`: vi/en selection and acceptance precede game/save/session boot.
Fresh browser defaults, persisted choice, legacy welcomed preferences, storage
refusal/retry, module-load retry and live-shift locale changes are verified.
350engine/server tests PASS; final presentation parity3/3. Full browser regression:
91local +21remote +19admin PASS. Current config zero warnings/build/typecheck PASS.
Native independent review found no actionable defect and passed3presentation tests.
Receipt `.qa/locale-entry-verification.json`; mobile/desktop screenshots inspected.
F25 first-run locale criterion PASS; M4 now12/18 OPEN. Runtime engine, economy and
auth transactions unchanged; existing standard/advanced k and rush evidence retained.
Next: Google web link/claim/conflict and configured three-benefit soft invitations,
then remaining M4 acceptance → M6–M9. Live Google Client ID still not provided.

| 2026-09-10 verified | 5871453 passes350unit/3final presentation/131browser/config/build and independent review. Locale exit criterion PASS; full account and M4 acceptance remain open. |

| 2026-10-15 fun-locale-default-vi | Entry screen, `localeAccepted` gate and the entry-only copy removed; default `vi` regardless of `navigator.language`; saved `en` kept; Settings switches. Contract above superseded. |
