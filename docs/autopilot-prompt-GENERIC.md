# Autopilot prompt — GENERIC

> KIT_VERSION: 2 · repo-agnostic master flow. This is the prompt an autopilot/Claude-Code session
> runs to take **one slice** (one `docs/autopilot-manifests/<slug>.json`) from a clean base ref to a
> reviewed `ready` branch — **never auto-merging P1**. The slash commands in `.claude/commands/ap-*`
> are thin wrappers that load this file. The repo-owned script `scripts/autopilot-scope-gate` is the
> executable source of truth for the parallel gate (§A.3.1); this doc is the surrounding flow.

The single rule that makes parallel safe: **stay inside the manifest `scope`, declare every shared
domain as an `invariants:` token, and HALT on any breaker (§D).** Two sessions run in parallel only
when their scope files are disjoint AND they share no invariant token — enforced mechanically by the
gate, not by trust.

---

## §A — Pre-flight (before writing any code)

### §A.1 Load context
1. Read the manifest `docs/autopilot-manifests/<slug>.json`. It is the **single source of truth**:
   `feature`, `branch`, `base_ref`, `risk`, `change_class`, `merge_policy`, `auto_merge`,
   `codex_review`, `depends_on`, `invariants`, `scope` (and optional `dep_checks`).
2. Read the feature row in `docs/autopilot-backlog.md` and the source spec it points to
   (`06-ROADMAP-trum-bia-hoi.md` Phase, plus GDD/SPEC/economy-spec as relevant).
3. Confirm the manifest `scope` and the prompt's working set **mirror each other**. If the spec
   implies a file not in `scope`, STOP and widen the manifest first (a scope edit is cheap; an
   out-of-scope commit is a breaker).

### §A.2 Freshness of base
- `git fetch` then verify `base_ref` exists locally. The build/measure you do is only valid against
  the **real merged code** on `base_ref`, never against a discarded upstream draft (see DEP_MISSING #21).

### §A.3 Gates — run BEFORE any branch/worktree mutation

#### §A.3.1 Parallel scope gate (SCOPE_COLLISION)
Run the repo-owned gate. It resolves the shared registry at main-repo `.autopilot/INFLIGHT.md`,
takes an atomic mkdir-lock, validates invariants against the catalog, checks `depends_on` is merged,
checks scope/invariant collision, and on PASS reserves an `in-flight` block for this feature:

```bash
scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/<slug>.json
```

The gate HALTs the run on any of: **INVARIANT_UNKNOWN**, **DEP_MISSING**, **SCOPE_COLLISION** (§D).
Do not hand-edit `INFLIGHT.md` — let the script own it. Only after PASS do you create the worktree.

### §A.4 Worktree
One git worktree per feature, created only after the gate passes:
```bash
git worktree add .autopilot/worktrees/<slug> <branch> 2>/dev/null \
  || git worktree add .autopilot/worktrees/<slug> -b <branch> <base_ref>
```
- `.autopilot/` is gitignored, so the worktree dir and registry never get committed.
- Give this worktree its **own mutable test state** — e.g. `export DB_PATH=/tmp/ap-<slug>.db` — so
  parallel sessions never share a SQLite/DB file.

---

## §B — Build loop

### §B.1 Plan
Write the smallest change that satisfies the slice. List the exact files (must be ⊆ `scope`) and the
public symbols you will touch.

### §B.2 Implement within scope
- Edit **only** files in `scope`. If you discover you need another file:
  - if it carries a **shared domain** another active feature might touch → STOP, it's a SCOPE_COLLISION
    risk: add the invariant token + file to the manifest and re-run the gate (§A.3.1).
  - if it's genuinely isolated → add it to `scope`, note why, continue.
- Keep `engine-core` / `economy-balance` changes minimal and reversible; these are the choke points.

### §B.3 Verify (fail-closed)
Default verify for the prototype:
```bash
cd prototype && npm run build          # tsc + vite — must be clean
```
Slices that touch the sim/economy also run:
```bash
cd prototype && npm run sim            # headless harness
# economy/k slices: re-measure k (scripts/measure_k.py) and compare to the spec band
```
A red build or a k outside the spec band is a HALT — never proceed to review on a failing verify.

### §B.4 Review
- **Self-review**: diff every hunk against `scope`; confirm no out-of-scope file changed
  (`git diff --name-only <base_ref>...HEAD` ⊆ scope).
- **Cross-model review (codex)** per manifest `codex_review`:
  - `1x_clean` (P2) — one codex pass, must come back clean.
  - `2x_clean` (P1) — two independent FULL codex passes, both clean. Stagger them to avoid
    auth/quota contention when several sessions review at once.

### §B.5 STOP_AT_READY
When build + review are green, flip the reservation to `ready` and **stop** — do not merge:
```bash
scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/<slug>.json
```
Report to the human: branch name, files changed, verify result, codex verdict, and the merge policy.
**P1 is `manual_only` / `auto_merge:false` → NEVER auto-merge.** The human owns the merge.

---

## §C — Merge (human-initiated; serialized)

### §C1 Pre-merge
Rebase the branch onto the latest `base_ref`; re-run §B.3 verify on the rebased tree. If a rebase
pulls in an upstream interface change, re-derive your symbol refs from the merged code (DEP_MISSING #21).

### §C2 Merge
One branch at a time into `base_ref`. After merge, clean up the reservation and worktree:
```bash
scripts/autopilot-scope-gate cleanup --manifest docs/autopilot-manifests/<slug>.json   # or: --feature <slug>
git worktree remove .autopilot/worktrees/<slug>
```

### §C3 Merge-train (batching parallel branches)
When several `ready` branches must land together:
1. Order them by dependency, then by blast radius (smallest `economy-balance`/`engine-core` surface first).
2. Merge the head of the train, then **rebase the rest** on the new base and re-run §B.3 on each.
3. A branch that goes red after a rebase drops out of the train and re-enters §B (it is no longer
   `ready`). Never force a red branch through to keep the train moving.
4. `cleanup` each branch as it lands so the registry reflects reality for the next gate.

---

## §D — Breakers (HALT conditions)

On any breaker: stop, leave the tree as-is, report the breaker + why, do not merge. The three added by
this kit on top of the base set are enforced by the gate script:

- **SCOPE_COLLISION** — a scope file OR an invariant token intersects another active (`in-flight|ready`)
  feature. → run sequentially: wait for the blocker to merge + cleanup, then rebase.
- **DEP_MISSING** — a `depends_on` prerequisite is still active (not merged on `base_ref`), OR a
  `dep_checks` {file,symbol} is absent from the real merged code on `base_ref` (interface drift).
- **INVARIANT_UNKNOWN** — the manifest uses a token not in `docs/autopilot-invariant-catalog.md`. → add
  the canonical token to the catalog first (or use the existing one — never a synonym).

Base breakers still apply: **BUILD_RED** (§B.3 fails), **SCOPE_ESCAPE** (a changed file ∉ `scope`),
**REVIEW_FAIL** (codex not clean per policy), **METRIC_DRIFT** (k / balance outside spec band).

---

## §E — Risk classes & policy

| risk | meaning | codex | merge_policy | auto_merge | autopilot? |
|------|---------|-------|--------------|------------|------------|
| **P0** | legal/payment/auth/irreversible (e.g. F21 Lottery, F26 Session Pass) | — | manual_only | false | **NO** — human only, do not start a slice |
| **P1** | core game logic / balance (`engine-core`, `economy-balance`) | `2x_clean` (2× FULL clean) | manual_only | false | yes, but STOP_AT_READY, **NEVER auto-merge** |
| **P2** | isolated / additive (ui, docs, measure) | `1x_clean` | manual_only | false | yes |

`economy-balance` touched = balance numbers in play → fail-closed; never let two slices edit it at
once (the gate enforces this via the shared token). When a new phase opens, add its domain tokens to
the catalog **before** writing any `/ap-new` slice for it.
