---
readiness_version: 1
---

# Feature readiness — ap3 intake rubric

<!-- review-readiness: criteria -->

> **Purpose:** a feature or task only enters the autonomous workflow (ap3, DESIGN v2 tier 1) once
> its docs are complete enough that a headless writer never has to guess. This rubric is a
> machine-readable checklist; every item scores PASS/GAP/N/A with the `file:section` that decided
> it. A GAP becomes a numbered question for the owner; the answer is written back into docs, not
> chat. Authority sources: {{prd}}, {{decisions}}, and the `{{fe_spec}}` / `{{be_spec}}` pair.
>
> This file is a starting point (`install.sh` only writes it when your repo has none yet). Replace
> every `{{placeholder}}` with your own path or convention, then delete this note.

## How to score

- The scoring unit is one **feature** (a `{{fe_spec}}` / `{{be_spec}}` pair) or one **task** inside
  that feature. A task inherits its feature's score; only R6-R8 are re-scored for the part of the
  feature the task actually touches.
- Every item is `PASS` / `GAP` / `N/A` (`N/A` needs a one-line reason). Any `GAP` in R1-R5 =>
  `NOT_READY`. A `GAP` in R6-R8 => `READY_WITH_SUPERVISED_SLICES` (that part still enters the
  plan, marked `supervised: true`).
- No inference: an item the docs do not state is a `GAP`, even when the code "obviously" implies
  the answer.

## R1 — Scope & intent

- R1.1 The feature appears in {{prd}}'s roadmap with a phase, or the owner states "out of
  roadmap, per intent X" directly in `INTAKE.md`.
- R1.2 {{prd}} has a matching flow/section for the feature, and that flow is not marked out of
  scope.
- R1.3 `{{fe_spec}}` exists and is Reviewed (not Draft) — or the owner accepts Draft with a
  one-line note in `INTAKE.md`.

## R2 — Measurable acceptance

- R2.1 `{{fe_spec}}`'s acceptance criteria: every criterion is a sentence a test can pin
  (condition -> observable behaviour), with no "reasonable", "appropriate", or "good enough".
- R2.2 For a task: at least one criterion **fails at the current base** (a real RED) — name it.
- R2.3 The use-case / edge-case list names an edge case for every transition the task touches.

## R3 — Technical design

- R3.1 `{{be_spec}}` has every section your project's document convention requires, including its
  entry points.
- R3.2 Database/schema: every table or column the task touches is described here — already
  existing in the schema, or by a documented migration plan (even one not yet applied). Whether a
  new migration is actually needed is R6's question, not this one; this item only checks the
  design is written down.
- R3.3 API contract: every endpoint or command the task touches has its request/response and
  error codes documented.
- R3.4 The transitions and invariants involved are described; invariant names match
  {{checklist}} or an invariant catalog, if the project keeps one.

## R4 — Decisions

- R4.1 Every decision the FE/BE spec cites for the part the task touches is FINAL in
  {{decisions}}; a `proposal` or `direction-only` decision is a GAP.
- R4.2 The FE spec's open questions and {{checklist}}'s unresolved items (if any) share no entry
  with the task's scope.

## R5 — Test plan

- R5.1 `{{be_spec}}`'s testing plan has a row for the behaviour the task touches
  (unit/integration), or {{checklist}} has a matching row with a traceable source.
- R5.2 A sandbox-runnable verify command is named (typecheck + the package's own tests); anything
  needing a database, a build, or a browser is split into `verify_host` (the dispatcher runs it
  after Codex CLEAN) or left to CI.

## R6 — Migration (supervised if GAP)

- R6.1 The task needs no schema change; if it does, the migration is its own `supervised: true`
  slice, merged before the code slices that depend on it.

## R7 — i18n & user-visible strings (supervised if GAP)

- R7.1 The task adds or changes no user-visible string; if it does, that change is its own
  supervised slice.

## R8 — UI/UX (supervised if GAP)

- R8.1 The task does not touch a page, a display component, or design tokens; if it does, the FE
  spec's screens-and-states section must cover the new state and the slice is supervised.

## Intake output

`ap3/features/<slug>/INTAKE.md`: the R1-R8 table (PASS/GAP/N/A + `file:section`), numbered
questions with a proposed answer each, the list of decisions that must be finalized, and
`status: NOT_READY | READY_FOR_PLAN | READY_WITH_SUPERVISED_SLICES`. The owner answers; the skill
writes the answers into docs; the rubric is re-scored.

## Changelog

- 1 — kit-generic starting template, mirrored from Plexco's `feature-readiness.md` v0.1 R1-R8
  shape.
