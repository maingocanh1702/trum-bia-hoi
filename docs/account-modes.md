# Play modes — current owner decision, 2026-09-10 15:30

Steer #5 supersedes the 08:18 interpretation that a new tab visit starts a fresh
stall. The two modes remain **play without signing in** and **register/sign in
with a Google account**. Implementation base: `90d1a50`. No economy, engine or
config changes belong to this correction.

| Situation | Behavior |
|---|---|
| New visitor, language accepted | Offer both modes with plain account limitations. |
| Play without signing in | Keep the stall, coins, upgrades and current day/shift on this device across reload, new tabs and closing/reopening the browser. Guest does not get durable player history, achievements, ranking or cross-device restore. |
| Reopen with the same guest session | Acquire the existing single-writer lock, check the authenticated player against the durable journal, and resume the same command stream. Never rotate the guest or erase its journal because of navigation type or a tab marker. |
| Another tab already writes | Refuse a second writer without modifying progress or the journal. After the writer closes, the other tab can reload and resume. |
| Lost connection / command response | Keep ordered pending commands and receipts. Reconnect to the same stream and apply once, including after reopening a tab. |
| Missing, expired, revoked or mismatched credential | Preserve the old journal and fail closed. A new anonymous cookie or local player ID does not authorize the old save. Ordinary browser reopening with its valid persistent cookie is supported; clearing site data or losing that credential is not cross-device recovery. |
| New Google account | Attach current guest progress once, retaining the current shift and command receipts. |
| Existing Google account | Restore that account's progress directly, without a second stall choice or merging guest totals. |
| Ambiguous authentication | Keep persisted intent, nonce fencing, exact server transition receipt and the existing destination-stream handling. |
| Old local archive | Preserve the recovery/export path; it is not a third advertised play mode. |
| No live Google Client ID | Show unavailable honestly and allow guest play; never simulate production login. |

Device progress is distinct from durable player-facing history and achievements.
Internal server audit records still support integrity and replay; their retention
does not grant account-only product features. Existing offline/presence recovery
rules continue to govern elapsed absence; reopening never invents a fresh career.
No economy clock, config value or engine rule is changed.

Guest offer copy states that device progress survives and lists account-only
history, achievements, ranking and cross-device restore. Use **tài khoản Google /
Google account**, never “quán Google”. No paywall or lost-progress upsell. The
optional shift-book and ranking-entry invitations share their existing cooldown;
leaving the page does not trigger a guest data-loss warning. The separate pending
local-write warning remains intact.

Verification: real browser close/relaunch, new tab/reload, exact-session refusal,
single writer, lost bootstrap response, pending upgrade applied once, Google
attachment/restore/reauthentication and VI/EN wording. See the current slice receipt
and milestone closure for measured results; this contract is not release proof.

## Changelog
| Date | Change |
|---|---|
| 2026-09-10 | Record the owner's two-mode correction; remove the extra product-level save choice and stop durable guest resume. |

| 2026-09-10 review correction | A known expired/revoked guest cookie may obtain only a fresh anonymous player, with the previous guest ID acknowledged by the server; unknown/Google credentials still fail closed. Bootstrap distinguishes newly created sessions to avoid a redundant restart. Navigation type distinguishes copied tab markers from reload/back. Tests cover dropped headers as well as dropped body, copied markers, expiry, and one first-visit creation. |
| 2026-09-10 historical provider correction | Guest recovery excludes any player with a past authenticated Google target in append-only account_logins, including after claimLocal moves the current mapping. Pending sign-in disables the guest-mode button; the sheet's close button still dismisses while confirmation/pause continues. Existing import and busy-close regressions cover both. |

| 2026-09-10 15:30 owner Steer #5 | Supersedes the 08:18 fresh-visit interpretation and the earlier rows above: guest device progress persists across browser/new-tab visits; account-only history/achievements/ranking/cross-device restore remain separate. Remove navigation-triggered restart and journal deletion; preserve writer lock, exact session, pending receipts and existing Google attach/restore. Remove misleading guest departure warning. No economy/engine/config changes. |
