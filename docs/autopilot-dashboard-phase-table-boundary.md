# Autopilot slice — dashboard-phase-table-boundary

> Authored against canonical `autopilot-prompt-GENERIC.md` v0.6.0. Local-only project; STOP_AT_READY.

```text
Task: Prevent the Phase 4 tracker parser from consuming later summary tables as feature rows — bugfix

Risk: P2. Merge policy: manual_only. Codex review: one FULL-base clean round on current HEAD.

Observed failure
  `docs/implementation-tracker.md` has exactly 26 Fxx rows, but `build_dashboard.py` reports 27 PRs.
  `parse_prs` lets the final Phase 4 block run to EOF, so the later progress-summary header
  `Phase | ... | In progress (🟡)` is accepted as a pseudo feature named `Phase`.

Positive scope
  - Bound each parsed phase at the next level-2 section as well as the next Phase heading.
  - Accept only deterministic feature IDs matching `F` plus two digits.
  - Add focused stdlib unittest coverage for the Phase 4 → summary boundary and the live tracker count.

Negative scope
  - Do not change work-state, GitHub/network collectors, status semantics, tracker rows, roadmap parsing,
    dashboard visual design, or generated dashboard output by hand.
  - Do not add dependencies or rewrite the dashboard engine.

Verify
  - `python3 -m unittest tools/dashboard-engine/test_build_dashboard.py`
  - Run the builder with `--no-network`, a temporary dashboard state/output directory, and confirm `26 PRs`.
  - `gitnexus_detect_changes` must show only the parser/test flow.
  - Persist one real Codex verdict, mark scope-gate ready, and STOP.
```
