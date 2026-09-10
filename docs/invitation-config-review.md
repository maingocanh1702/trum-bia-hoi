# Invitation config review follow-up

Status: **IMPLEMENTED, verification/review in progress**, discovered while reviewing `f18db4e...056cf7c`.
The finding is in the preceding invitation slice (`90d1a50`), not the guest-device
correction (`90d1a50...056cf7c`). Evidence: `.qa/review-guest-device.txt`.

- **P1 — required-key deletion accepted:** `packages/engine/src/config.ts` permits
  omission of the whole `onboarding.loginPrompt.leaveProgress` object for old
  config compatibility. The same exception currently permits a new admin proposal
  to delete that object from a base that already contains it.
- Required outcome: preserve exact historical pins while rejecting deletion from
  a newly proposed config whose base contains the governed object. Add a registry
  regression for deletion rejection and unchanged old-pin replay.
- Owner follow-up at18:02 explicitly authorizes this separate server validation
  fix. The earlier no-change constraint applied to the guest correction; economic
  values and engine rules remain unchanged.
- Guest departure invitation is no longer active; the helper has a validated-loader
  fallback. This limits current UI exposure but does not close the validation defect.
- The prior invitation slice is **not review-complete**. M4 stays OPEN13/18; do not
  count a green guest-device review as certification of this separate config slice.

## Changelog

| Date | Change |
|---|---|
| 2026-09-10 | Record the native full-diff review finding and separate it from the owner-scoped guest persistence correction. No engine/config modification authorized by this report. |

## Server proposal/publication slice — base25cc21c

`ConfigRegistry.validateAdmission` rejects omission of an installed `leaveProgress` group.
`publicationAt` calls that same validator before preview/publication, including
approved drafts admitted before this fix. The replay loader and config JSON stay
unchanged. Three new regression cases fail before the fix and pass after it;
Focused tests and final config/build checks are recorded in the closure receipt below.

| Input | Outcome |
|---|---|
| Stored pre-threshold snapshot | Read/replay unchanged. |
| New proposal based on an old snapshot, group still absent | Existing old-shape compatibility; no silent forced migration. |
| Add thresholds to an old base | Accept under existing role/approval/schedule rules. |
| Proposal/rollback deletes thresholds present on its base | Reject before config/proposal/audit writes, for default and scoped input. |
| Approved pre-fix draft deletes the installed group | Reject preview/publication; keep draft and history intact. |
| Exact retry of an already-published version | Return its immutable receipt as before; no new publication. |

| 2026-09-10 18:02 owner follow-up | Authorizes validation-only server correction as a separate small slice; keep economy.tbh.json values and engine rules unchanged, then continue remaining M4. |

| 2026-09-10 review correction | Initial review found that applying the admission guard during composition also rejected historical published scopes. The guard now runs only at proposal/publication admission; existing composition retains its prior validation. A fourth red-before/green-after regression opens a shift under a pre-fix published scope, retries its receipt, previews/forecasts/publishes a corrective withdrawal, and preserves the live pin across restart. |
