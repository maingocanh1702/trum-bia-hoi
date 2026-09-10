# Guest login invitations

Base: `f18db4e`. F25 §10 / F27 §2, with the owner's two-mode decision.
Guests can keep playing; Google accounts save progress. This slice changes presentation
and its cooldown only. It uses canonical completed shifts/earnings and the existing
Account/Google transaction; no engine, account authorization or economy rule changes.

| Trigger | Outcome |
|---|---|
| First completed shift, enabled, cooldown elapsed | Optional three-benefit card in the shift book; the ledger stays available. |
| Open existing season/ranking entry, enabled, cooldown elapsed | Same card, with explicit Google action and dismiss; no forced sign-in. |
| Guest leaving after either configured progress threshold, enabled, cooldown elapsed | Native browser warning. Choosing Stay opens the same optional card in a paused sheet. Choosing Leave proceeds. |
| Google account or local archive | No automatic invitation or guest departure warning. Explicit account controls remain available. |
| Dismiss / close / view account manually | Seeing the benefits starts the shared configured cooldown, measured in completed shifts. Manual account access stays usable. |
| Same guest reload | Same player-keyed cooldown; no loss of pending gameplay commands. |
| Fresh guest visit | New player ID gives a fresh cooldown; old history is not advertised as saved. |

`onboarding.enabled` and all `onboarding.loginPrompt` keys come from the
current pinned config. `loginPromptPlayer`/`loginPromptShift` are presentation
preferences, not a save, achievement, clock, eligibility or identity credential.
Invitation display alone does not load Google or request a nonce; clicking sign-in
opens the existing Account component. Its shared list has exactly three benefits:
save progress, achievements, compete on the leaderboard. Controls and copy are VI/EN.
The existing menu pause lasts until the sheet closes, as directed by the owner.

## Browser boundary

[MDN beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
documents a generic browser-owned warning, user-interaction requirements and
unreliable firing on mobile/app termination. The application cannot customize that
native text, detect close separately from reload, or guarantee an invitation after
an OS kills a tab. Reload can therefore warn when the visit has not yet seen the
invitation, although the visit itself survives reload. The three benefits appear
in-page if the player stays. The book and ranking-entry cards do not depend on exit
events. Do not claim guaranteed iOS/Android tab-close delivery, live Google consent,
or the not-yet-implemented community board/shrine as tested by this slice.

Departure thresholds `leaveProgress.minCompletedShifts` and `minLifetimeEarned`
are positive safe integers, Tier C. Defaults1/1 preserve the initial any-progress
behavior. Earned income uses canonical displayed coins; this is a UI threshold,
not a payout or k-scaled Base value. A pre2.0.2 pinned snapshot may omit the entire
new object and use seed defaults; partial/malformed objects are rejected. Raw
snapshots and their replay versions stay unchanged.

## Verification

Pending implementation checks and independent review; receipt will pin the final code.

## Changelog

| Date | Change |
|---|---|
| 2026-09-10 | Defines optional invitations and shared per-player cooldown without new authentication or gameplay paths; records the native departure limit. |

| 2026-09-10 review correction | P1 addressed: departure thresholds now live in governed config2.0.2, with explicit old-snapshot compatibility and no game-economy retune. |
