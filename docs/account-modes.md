# Play modes — owner correction, 2026-09-10

Base 6e6c46a. The owner replaces the "Google stall/current stall" concept with
two modes: play without signing in, or register/sign in with a Google account.
This decision supersedes conflicting guest-persistence and save-choice wording
in F25 and earlier slice contracts. No economy or engine rules change.

| Situation | Behavior |
|---|---|
| New visitor, language accepted | Offer the two modes with explicit save limitations. |
| Play without signing in | Full core gameplay for this tab's visit; no durable player history/achievements. Reload/reconnect within this visit preserves pending actions. A fresh navigation starts a new visit, including tabs copied from an opener; reload/back within the visit can resume. |
| New visit sees an old guest cookie | Under the existing single-writer lock, replace only the exact expected guest session. Never restart or erase a Google account. Internal server command/audit records remain for integrity, not a recoverable guest career. |
| New Google account | Attach current server guest progress once, retaining the current shift and command receipts. |
| Existing Google account | Restore that account's progress directly after sign-in, without a second "stall" choice or merging guest totals. This is the announced default while continuing the owner's two-mode correction. |
| Ambiguous authentication | Reuse persisted intent, nonce fencing, exact server transition receipt and fresh destination stream from the preceding slice. |
| Old local archive | Preserve the recovery/export path. It is historical data, not a third advertised play mode. |
| No live Google Client ID | Show an honest unavailable state and allow guest play; never simulate production login. |

Guest history means player-accessible durable progress; this change does not
delete audit records or promise immediate database erasure. Existing local
archives remain untouched. Ranking approval/local upload stay separately tracked.
Verification covers both languages, fresh-tab guest reset, same-tab pending
recovery, Google restore, exact-session guard and transactional rollback.

## Changelog
| Date | Change |
|---|---|
| 2026-09-10 | Record the owner's two-mode correction; remove the extra product-level save choice and stop durable guest resume. |

| 2026-09-10 review correction | A known expired/revoked guest cookie may obtain only a fresh anonymous player, with the previous guest ID acknowledged by the server; unknown/Google credentials still fail closed. Bootstrap distinguishes newly created sessions to avoid a redundant restart. Navigation type distinguishes copied tab markers from reload/back. Tests cover dropped headers as well as dropped body, copied markers, expiry, and one first-visit creation. |
