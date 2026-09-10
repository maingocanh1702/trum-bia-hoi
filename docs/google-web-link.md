# Google web link — transport contract

Base: `e62bb2d` (first-run locale accepted before a server guest starts).
Scope: `RemoteGame` identity/challenge/link handoff, its isolated browser API and
production transport tests. F25 remains in progress; this is the transport prerequisite.

The existing server owns Google verification and atomic guest linking. The browser
must retain the same player, client stream, pending command receipts and event cursor.
It does not upload/rebuild career history or infer identity from an ID token.

| Situation | Transport decision |
|---|---|
| Online guest opens account menu | Request server nonce; unavailable Google stays an ordinary account error. |
| Credential arrives with queued commands | Block new commands; finish the existing ordered outbox before sending authentication. |
| Command/heartbeat fails before authentication | Reject the attempt; preserve the outbox and normal reconnect behavior. |
| Google accepts the current guest | Read the cookie's canonical session; require the same player and Google provider. Keep journal/history intact. |
| Authentication response is lost but rotated cookie arrived | Reconcile through canonical session; same-player Google counts as success. Never replay the credential automatically. |
| Authentication failed before mutation | Return the account error; keep playing as guest. |
| Cookie is expired/revoked or belongs to another player | Existing fail-closed invalid-session/conflict state; never send old commands to that player. |
| Google already has another save | Return accountConflict without keepAccount, switching, merging or overwriting. Explicit conflict resolution is the next slice. |
| Concurrent link, completed link or closed client | Reject; no duplicate authentication or retained credential. |
| Page closes during the attempt | Abort requests/release browser lock; pending promises settle. Reload derives identity from the server. |

No new economy numbers, engine mutations, public local-upload route, logout/account
switch UX, login prompts, ranking policy, asset work or Google configuration in this
slice. Owner has no live Client ID. Real SDK verification uses an isolated RSA signer
and cert endpoint in tests, as in the existing admin browser suite.

Verification: focused real-server browser cases for ordered commands, mid-shift
identity/history retention, response loss, nonce/expiry/conflict, cancellation and
missing configuration; existing remote browser suite, config/build/unit suite, then
independent native Codex review. No economy/sim change; reuse E13 simulation evidence.

## Changelog (append-only)
| Date | Change |
|---|---|
| 2026-09-10 | Pin the bounded RemoteGame Google-link handoff before its account UI and conflict-resolution successors. No milestone completion claimed. |
| 2026-09-10 review correction | A lost canonical-session read now retains a credential-free reconciliation flag. Reconnect retries only the session read before gameplay; commands/another link wait until identity is known. This fixes stale guest status after a committed Google cookie rotation. |
| 2026-09-10 ambiguity correction | Reconciliation first renews the existing server challenge, then reads identity. Existing signInGoogle transaction rechecks the nonce, so a still-verifying old POST cannot commit after this fence; a confirmed guest can resume and retry with a fresh challenge. No new endpoint/schema is needed. A real-SDK HTTP regression in apps/server/test/google.test.ts pins the held-verification race; browser regression pins request ordering and late credential refusal. |

## Verified transport checkpoint

`3c369aa` passes351engine/server,33remote browser (12link cases),config/build/typecheck.
The final independent full-base review reports no actionable introduced defects.
Two earlier review findings are fixed: stale guest state after a failed identity read,
and a guest read overtaking pending verification. The existing nonce transaction is
the authoritative cancellation boundary; no new server runtime or endpoint is needed.
Receipt `.qa/google-link-verification.json`. No Google UI, explicit save switching,
local upload or full F25/M4 acceptance is claimed; M4 stays12/18 OPEN.
