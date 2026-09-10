# Guest login invitations

Base: `f18db4e`. F25 §10 / F27 §2, with the owner's two-mode decision.
Guests keep device progress; Google adds durable history, achievements, ranking
and cross-device restore. Owner Steer #5 (15:30) supersedes the initial exit warning. This slice changes presentation
and its cooldown only. It uses canonical completed shifts/earnings and the existing
Account/Google transaction; no engine, account authorization or economy rule changes.

| Trigger | Outcome |
|---|---|
| First completed shift, enabled, cooldown elapsed | Optional three-benefit card in the shift book; the ledger stays available. |
| Open existing season/ranking entry, enabled, cooldown elapsed | Same card, with explicit Google action and dismiss; no forced sign-in. |
| Guest leaves the page | No native warning or login upsell. Device progress already persists. |
| Google account or local archive | No automatic invitation or guest departure warning. Explicit account controls remain available. |
| Dismiss / close / view account manually | Seeing the benefits starts the shared configured cooldown, measured in completed shifts. Manual account access stays usable. |
| Same guest reload | Same player-keyed cooldown; no loss of pending gameplay commands. |
| Guest reopens browser or another tab | Same player and same cooldown; no new guest is created. |

`onboarding.enabled` and all `onboarding.loginPrompt` keys come from the
current pinned config. `loginPromptPlayer`/`loginPromptShift` are presentation
preferences, not a save, achievement, clock, eligibility or identity credential.
Invitation display alone does not load Google or request a nonce; clicking sign-in
opens the existing Account component. Its shared list has exactly three benefits:
save to your account, achievements, compete on the leaderboard. The offer also
explains device persistence and the four account-only limitations. Controls and copy are VI/EN.
The existing menu pause lasts until the sheet closes, as directed by the owner.

## Browser boundary

Steer #5 removes the native guest departure warning: it suggests unsaved changes
when the stall is already retained. Book/ranking-entry cards remain optional, and
explicit account controls remain available. Only the existing pending local-write
warning can prevent accidental loss while an archive write is in flight.

The earlier config2.0.2 departure thresholds remain in existing pinned snapshots;
this correction does not change config. The compatibility helper now reads its
fallback through the validated engine config export, never raw JSON. There is no
active tab-close invitation consumer. A future explicit exit surface must be
specified without misleading data-loss claims; community board/shrine work is
still pending. No live Google consent is claimed.

## Verification

Pending implementation checks and independent review; receipt will pin the final code.

## Changelog

| Date | Change |
|---|---|
| 2026-09-10 | Defines optional invitations and shared per-player cooldown without new authentication or gameplay paths; records the native departure limit. |

| 2026-09-10 review correction | P1 addressed: departure thresholds now live in governed config2.0.2, with explicit old-snapshot compatibility and no game-economy retune. |

| 2026-09-10 15:30 owner Steer #5 | Device-persistent guest progress replaces fresh-visit reset; shared cooldown survives reopening. Remove native departure warning and its dedicated sheet, clarify account-only benefits, keep skippable book/ranking-entry cards and menu pause. No config/engine changes in this correction. |
