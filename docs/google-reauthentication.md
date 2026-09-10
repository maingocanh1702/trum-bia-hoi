# Google reauthentication and retained commands

Base `c132b18`. Complete the existing account flow when an expired/revoked/missing
cookie prevents boot or live transport. Reuse the public logout/session endpoints,
Google nonce/verifier transaction, the browser Web Lock and the existing outbox.
No new authentication provider, recovery token, database schema or history upload.

| Situation | Decision |
|---|---|
| Boot/live authority invalid; player explicitly chooses sign in again | Close the old transport and acquire its native single-writer lock. Keep the original journal untouched. |
| Existing cookie still authenticates the journal player as Google | Reconnect the original stream normally; a lost authentication response needs no second login. |
| Cookie expired/revoked/unknown | Existing logout clears it; bootstrap only an anonymous session for fresh Google verification. No old account access is granted. |
| Cookie missing or a temporary/different active session exists | Use that session only as the nonce-bound authentication context; never connect/play its world or send retained commands to it. |
| Google credential verified | Require its existing account player ID to match the retained journal ID, inside the existing transaction after verifier IO. The client ID is a restriction, never proof of ownership. Wrong/new Google subject refuses without account/session mutation. |
| Successful authentication | Confirm canonical session identity after replacing the nonce; reconnect the same old stream through ordinary boot. Ordered receipts decide whether retained commands execute or return prior results. |
| Lost response, close, reload, retry | Never replay credentials automatically or clear old commands. Explicit retry obtains a fresh nonce; reload can resume only a canonically authenticated matching account. |
| Wrong account, unavailable Google, network error | Translate the error and allow retry; no gameplay or journal replacement while identity is unresolved. |

Current valid guest linking and explicit existing-Google restore retain their earlier
behavior. This is recovery of an existing retained account, not a merge, account
switch with pending commands, or revival from a revoked cookie. Internal audit and
historical local archives remain intact. Server reconnect grace still governs an
unauthenticated absence; no client-only pause or clock extension is promised.

Verify expired/revoked/missing cookies at boot and during play, exact held/acknowledged
outbox recovery, wrong signed subject/no account creation, nonce replacement during
verification, response loss/reload, one callback, both languages and lock exclusion.
Config/build/full unit and relevant browser regression, then independent native
code/security review. Engine/economy unchanged; reuse E13 k/rush evidence.

## Changelog
| Date | Change |
|---|---|
| 2026-09-10 | Pin explicit reauthentication to the existing Google transaction and unchanged retained journal; no new session recovery authority. |

| 2026-09-10 review correction | In-place retry now consumes a matching canonical Google identity before requesting another challenge. Lost post-auth fence response reproduced a second-consent requirement; the regression requires one authentication POST and the original stream after retry. |
