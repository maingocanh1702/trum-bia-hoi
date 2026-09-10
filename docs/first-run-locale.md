# First-run language entry

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
