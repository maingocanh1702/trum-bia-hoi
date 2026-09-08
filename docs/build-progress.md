# Build progress — Trùm Bia Hơi

Started 2026-09-08 from `30c0285` on `codex/build-game`. Authority: HANDOFF v1.14,
PROMPT PACK part B, GDD decisions, 03-SPEC table rules, JSON numbers. This is the
complete-game goal; milestones below are implementation order, not scope cuts.

| Milestone | Status | Evidence / remaining |
|---|---|---|
| M0 — config, pure engine, deterministic replay, k sim, workspaces | In progress | New implementation in packages/engine and apps/web |
| M1 — serve loop, glasses, stock, upgrades, local save, spatial UI, core audio | Pending | |
| M2 — guest, vi/en, onboarding | Pending | |
| M3 — full menu, customer mix, weather, rush, business unlocks | Pending | |
| M4 — server authority, accounts, reconnect, config registry/admin | Pending | |
| M5 — seasons, leaderboard/shrine, life path, leases, quests/referrals | Pending | |
| M6 — risks, dog, emergency supplies | Pending | |
| M7 — voluntary donations, cosmetic gifts, age notice | Pending | |
| M8 — football events, season shop, legal-gated lottery | Pending | |
| M9 — complete art/audio, accessibility, replay/security/performance QA, release | Pending | |

## Decisions and boundaries

- Build fresh; do not modify or inherit archived prototype code/UI.
- React DOM + CSS for the first spatial yard: accessible native controls, stable
  keyed objects, no canvas dependency before a measured need.
- Shared pure TypeScript rules, seeded RNG, explicit time, JSON config snapshots,
  append-only commands/events with idempotency keys. Local persistence before server.
- Held content is never fabricated: inspection remains disabled. Lottery must be
  disabled until legal approval; seed currently says `true` despite HANDOFF's off
  requirement, so reconcile the flag to `false` when wiring the new config.
- Manual donation confirmation and admin-entered football fixtures are the defaults.
- Asset placeholders are labelled through the manifest until replacement art passes QA.
- Keep real external setup and human playtest evidence distinct from local checks.

## Verification

Each completed milestone records commands and results here and updates the feature
tracker/dashboard. No completed-game claim until all in-scope acceptance is handled.

## Changelog

| Date | Change |
|---|---|
| 2026-09-08 | Started complete-game build and recorded authority, order and boundaries. |
