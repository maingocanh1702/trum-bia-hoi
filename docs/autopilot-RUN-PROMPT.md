# Autopilot — ready-to-paste run prompts (Trum Bia Hoi)

Copy a block below into a fresh Claude-Code / agent session. Replace `<SLUG>` only. The project path is
already baked in. First gỡ 2 stale lock nếu còn (`rmdir ".autopilot/INFLIGHT.lock"`, `rm -f ".git/index.lock"`).

---

## 1) Scaffold a new slice (= `/ap-new`)

```
Project: /Users/maingocanh/Projects/Trum Bia Hoi

cd into the project above. Scaffold a new parallel-autopilot slice with slug `<SLUG>`.
Follow .claude/commands/ap-new.md exactly:
- Validate the slug; pull defaults from the row in docs/autopilot-backlog.md if present.
- Validate every invariant token against docs/autopilot-invariant-catalog.md (catalog:start..end).
  If a domain token is missing, STOP and tell me to add the canonical token first.
- Write docs/autopilot-manifests/<SLUG>.json from _TEMPLATE.json (feature, branch feat/<SLUG>,
  base_ref = current default branch, risk, merge_policy manual_only, auto_merge false,
  codex_review 2x_clean if P1 else 1x_clean, depends_on, invariants, scope).
- Stamp .claude/commands/_ap-launcher-TEMPLATE.md -> .claude/commands/ap-<SLUG>.md ({{SLUG}} -> <SLUG>).
Do NOT register the gate, create a worktree, or write feature code. Show me the manifest, then stop.
```

---

## 2) Run a slice end-to-end (= `/ap-<SLUG>`)

```
Project: /Users/maingocanh/Projects/Trum Bia Hoi

cd into the project above. Run autopilot for slice `<SLUG>` following docs/autopilot-prompt-GENERIC.md
end to end, HALT on the first breaker (§D) and report it — do not work around it:

1. Pre-flight (§A): read docs/autopilot-manifests/<SLUG>.json (source of truth) + its backlog row +
   the spec it points to. git fetch; confirm base_ref exists.
2. Gate BEFORE any branch/worktree mutation (§A.3.1):
   scripts/autopilot-scope-gate register --manifest docs/autopilot-manifests/<SLUG>.json
   On HALT (SCOPE_COLLISION / DEP_MISSING / INVARIANT_UNKNOWN) stop and report.
3. Worktree only after PASS (§A.4): git worktree add .autopilot/worktrees/<SLUG> ... ;
   export DB_PATH=/tmp/ap-<SLUG>.db
4. Build loop (§B): edit ONLY files in scope; verify fail-closed — cd prototype && npm run build
   (+ npm run sim / re-measure k for sim/economy slices).
5. Review (§B.4): git diff --name-only base...HEAD must be ⊆ scope; run codex per codex_review.
6. STOP_AT_READY (§B.5): scripts/autopilot-scope-gate ready --manifest docs/autopilot-manifests/<SLUG>.json
   then STOP. Report branch, files changed, verify + codex verdict. Do NOT merge — P1 is manual_only.
```

---

## 3) After I merge — release the slice (= `/ap-cleanup`)

```
Project: /Users/maingocanh/Projects/Trum Bia Hoi

cd into the project above. Slice `<SLUG>` is merged. Release it per docs/autopilot-prompt-GENERIC.md §C2:
scripts/autopilot-scope-gate cleanup --manifest docs/autopilot-manifests/<SLUG>.json 2>/dev/null \
  || scripts/autopilot-scope-gate cleanup --feature <SLUG>
git worktree remove .autopilot/worktrees/<SLUG> 2>/dev/null || true ; git worktree prune
Confirm <SLUG> no longer appears in .autopilot/INFLIGHT.md.
```
