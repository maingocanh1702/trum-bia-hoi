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
