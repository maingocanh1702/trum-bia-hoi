# Google save choice and journal recovery

Base `0eff2a5`. F25§4/10: explicitly choose existing Google progress after conflict;
never merge worlds, silently select another account or send old queued commands to it.
The prior Google panel and same-player transport remain the shared path.

| Situation | Decision |
|---|---|
| First signed attempt finds another Google save | Preserve both saves; retain credential only in the mounted panel for explicit choice. Closing clears it. |
| Keep current stall | Close panel; no authentication mutation. |
| Choose Google stall | Queue existing keepAccount transaction after all old commands are acknowledged. Persist a non-secret switch intent in the existing journal before the POST. |
| Server returns another player | Accept only a persisted intent with empty outbox AND the current session's server audit receipt naming the journal's previous player. No client-supplied previous player is authority. |
| Cookie rotation is ambiguous / identity read fails / page closes | Retain intent; renew nonce before reading canonical identity. Reopen can finish only the audited transition; never replay the credential or old commands. |
| Intent exists but canonical identity is still the guest | Nonce fence cancels any late verifier. Clear intent and continue that same guest. |
| Unexpected player, absent receipt, pending old commands, corrupt storage | Fail closed and preserve the journal; no new-player command. |
| Explicit authentication rejection | Clear the intent; retain guest/history and show translated retry. |
| Switched target accepted | Connect a fresh target stream; atomically replace the empty source journal only after validating receipt/target. Remount the game through existing boot without browser navigation. Same-player links keep their running component. |
| Revoked/expired cookie with no usable replacement | Existing invalid-session recovery remains fail-closed; this slice does not grant access from a revoked credential. Reauthentication recovery remains a follow-up. |

Server receipt reuses append-only account_logins + sessions, authenticated by the
current cookie. No migration, economy number, token persistence or upload endpoint.
The source stall/history remains on the server; this choice does not promise a
return-to-guest button. Support recovery, empty-target local import, automatic
invitations and competitive approval remain separate required work. Owner's local
upload deferral to M9 and absent live Client ID remain in force.

Verify real signed-token HTTP, old outbox drain/receipt conservation, ambiguous and
reload recovery, unrelated cookie refusal, storage refusal, expired choice, VI/EN
choice/cancel and no main-frame navigation. Full config/build/unit/browser regression;
independent native full-base code/security review. Engine/config unchanged: reuse E13.

## Changelog
| Date | Change |
|---|---|
| 2026-09-10 | Pin explicit save choice to existing server audit evidence and durable journal intent; no automatic merge or permission inferred from a mismatched cookie. |
| 2026-09-10 native lock correction | The first VI/EN choice test exposed new boot racing the old Web Lock release. RemoteGame.close now exposes the native lock completion; the game remount awaits it. No retry timer or relaxed single-writer protection. |
