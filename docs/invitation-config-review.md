# Invitation config review follow-up

Status: **OPEN**, discovered while reviewing `f18db4e...056cf7c`.
The finding is in the preceding invitation slice (`90d1a50`), not the guest-device
correction (`90d1a50...056cf7c`). Evidence: `.qa/review-guest-device.txt`.

- **P1 — required-key deletion accepted:** `packages/engine/src/config.ts` permits
  omission of the whole `onboarding.loginPrompt.leaveProgress` object for old
  config compatibility. The same exception currently permits a new admin proposal
  to delete that object from a base that already contains it.
- Required outcome: preserve exact historical pins while rejecting deletion from
  a newly proposed config whose base contains the governed object. Add a registry
  regression for deletion rejection and unchanged old-pin replay.
- Current owner Steer #5 excludes economy/engine/config changes. This correction
  therefore leaves the earlier config code unchanged and records this work separately.
- Guest departure invitation is no longer active; the helper has a validated-loader
  fallback. This limits current UI exposure but does not close the validation defect.
- The prior invitation slice is **not review-complete**. M4 stays OPEN13/18; do not
  count a green guest-device review as certification of this separate config slice.

## Changelog

| Date | Change |
|---|---|
| 2026-09-10 | Record the native full-diff review finding and separate it from the owner-scoped guest persistence correction. No engine/config modification authorized by this report. |
