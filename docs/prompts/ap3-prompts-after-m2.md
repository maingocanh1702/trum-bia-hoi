# Prompts after M2 — agent-verification, Trùm Bia Hơi

State at 2026-09-16 01:08Z: `main` @ `a6a16e4`, 12 PRs merged, `MILESTONE agent-verification M2
complete`, queue empty, `clean_runs: 1`. `npm run verify:doctor` is green on every line except
`map ✗` (6/169 test files uncited). Kit is at Claude template `feat/ap3` @ `df7686e` (K23 +
follow-up), installed in the repo @ `e562911`.

Four items, in this order. 0 is shell. K24 runs in the **Claude template** repo. 3 and 4 run in
**Trùm Bia Hơi**. Each prompt is self-contained — paste it into a fresh Claude Code session.

---

## 0. Owner — pause the dispatcher, archive the finished queue (shell, ~1 min)

The queue is empty and the dispatcher logs `NOTHING_QUEUED` every 15 minutes. Prompt 3 is
supervised (no dispatcher), so pause it until Prompt 4 emits new tasks.

```bash
cd "/Users/maingocanh/Projects/Trum Bia Hoi"
touch ap3/PAUSED                                   # dispatch.sh exits early while this exists
mkdir -p ap3/queue/done/agent-verification-m1-m2
git mv ap3/queue/agent-verification-m0*.md ap3/queue/done/agent-verification-m1-m2/
git commit -qm "chore(ap3): archive the 7 merged agent-verification M1/M2 tasks; pause dispatcher for the supervised V4 track"
git push origin main
```

(`ap3/PAUSED` is gitignored — the pause is local, which is what you want. Remove the file after
Prompt 4 has emitted and linted the V5 tasks.)

---

## Prompt K24 — Claude template, `feat/ap3` — every resume path must stage the task

Paste into a Claude Code session opened at `~/Projects/Claude template`, branch `feat/ap3`.

```
You are working in the Claude template repo on branch feat/ap3, HEAD df7686e. Read ap3/README.md
§Recovery and ap3/test/retry-answer.sh before touching anything.

## Defect (measured on the Trùm Bia Hơi repo, 2026-09-15)

K23 (5bd79c2) and its follow-up (df7686e) fixed the answer channel for `retry.sh --answer`: the
owner's answer is staged at <worktree>/.ap3-run/TASK.md and launch_writer prefers that file. But
the OTHER resume paths never stage anything:

- `retry.sh --extend-rounds N <slug>` / `--extend-budget USD <slug>` re-enter review, and when the
  review returns FINDINGS the dispatcher relaunches the writer with AP3_TASK = whatever launch_writer
  finds. If the owner amended the pinned ap3/state/runs/<slug>/task.md alongside the extension
  (the normal case -- you extend BECAUSE you have something new to say), the writer never sees it
  unless a .ap3-run/TASK.md happens to exist from an earlier --answer. Measured: on
  agent-verification-m02-doctor, OWNER AMENDMENT 4 was written into the pinned task before
  `--extend-rounds 9 --extend-budget 6`, and the owner had to `cp` it into .ap3-run/TASK.md by hand
  or the writer would have run round 8 against instructions three amendments stale.
- `retry.sh --review-only <slug>` has the same shape for the reviewer/writer asymmetry, though the
  amendment case is rarer there.

Root cause is the same as K23: two copies of the task, only one reaches the writer, and the copy
the owner naturally edits (the pinned one, the one the reviewer reads) is the wrong one.

## Fix — one rule, every path

Extract the staging step from the --answer block into a function in retry.sh, e.g.
`stage_pinned_task()`: copy ap3/state/runs/<slug>/task.md to <worktree>/.ap3-run/TASK.md, fail
closed with a clear message if either side is missing. Call it from ALL FOUR resume modes
(--answer, --extend-rounds, --extend-budget, --review-only) immediately before the record is
flipped back to `running`. Keep the existing guard that it must never write the git-tracked
<worktree>/ap3/queue/<slug>.md.

launch_writer already prefers .ap3-run/TASK.md when present -- do not change dispatch.sh unless a
test proves you must.

## Tests — test-first, extend the existing files, do not create a parallel suite

1. ap3/test/retry-extend.sh: after the run halts MAX_ROUNDS, append an `## OWNER AMENDMENT` line
   to the pinned task, run `--extend-rounds`, tick until the fix writer is relaunched, and assert
   the fake writer's recorded $AP3_TASK contains the amendment. Same for `--extend-budget` on a
   BUDGET halt. Reuse retry-answer.sh's SEEN_TASK pattern (the fake claude does
   `cat "$AP3_TASK" > "$SEEN_TASK"`).
2. ap3/test/retry-review-only.sh: same assertion shape for --review-only.
3. ap3/test/retry-answer.sh: unchanged in behaviour; refactor only if the shared function forces
   it, and keep all 33 assertions green.
4. Negative: staging must NOT dirty the worktree (`git status --porcelain -uall` empty after every
   resume mode) -- retry-answer.sh already pins this for --answer; add it to the other two files.

Run the full suite with `bash ap3/test/run.sh` and require `AP3_KIT_TEST: PASS`. Note: run.sh IS
the suite runner -- do not add it to a loop of individual tests.

## Docs

ap3/README.md §Recovery: drop the "Known gap (W1-KNOWN-GAPS K23)" sentence from the
MISSING_CONTEXT row (it is fixed), and add one sentence after the table: every resume mode stages
the pinned task to .ap3-run/TASK.md, so an owner amendment written to
ap3/state/runs/<slug>/task.md reaches the writer on the next relaunch. Update
docs/level3-native/W1-KNOWN-GAPS.md to mark K23 closed with the commit shas.

## Commit

One commit, message prefix `fix(ap3): W5.2.4 (K24) --`, body explains the measured defect and the
one-rule fix. End with:

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QS88zcWwh2DWB9ExZeAakf

Then report: the commit sha, `AP3_KIT_TEST: PASS` verbatim, and the three assertion counts. Do
not install into any other repo -- the owner does that.
```

After K24 lands, install it:

```bash
cd "/Users/maingocanh/Projects/Trum Bia Hoi"
cp "/Users/maingocanh/Projects/Claude template/ap3/retry.sh" ap3/retry.sh
git add ap3/retry.sh && git commit -qm "chore(ap3): install kit K24 -- every resume path stages the pinned task" && git push origin main
```

---

## Prompt 3 — Trùm Bia Hơi — V4 contract + plan corrections + close the 6 uncited tests

Supervised track: run it in a Claude Code session at `~/Projects/Trum Bia Hoi` on `main`, NOT
through the dispatcher. It is docs + one small script fix, and it needs judgement the dispatcher's
writer cannot be given cheaply. One PR at the end, reviewed by Codex once before merge (the
`/slice-review-round` skill), same as S1–S4.

```
You are in the Trùm Bia Hơi repo at ~/Projects/Trum Bia Hoi on main (a6a16e4 or later). This is
Wave V4 of trum-bia-hoi-agent-understanding-verification-implementation-plan.md plus the cleanup
that the M1/M2 autopilot wave left behind. Read the plan's §8 (V4), §10, and the Changelog first,
then `npm run verify:doctor` to see the live state -- every line is green except
`map ✗ feature-map coverage`.

## Ground rules

- Read `.claude/skills/verify-trum-bia-hoi/references/features/README.md` and follow its
  conventions for every feature-file edit.
- Docs-only plus the two small code items in part D. No gameplay, economy JSON, engine or server
  API change. `npm run verify` and `npm run verify:doctor` must both be green at the end -- doctor
  going green is the acceptance test for this whole prompt.
- Numbers only from docs/config/economy.tbh.json. Do not restate economy values in prose.
- Before claiming any test "proves" something, read the test BODY and follow its helpers -- never
  grep test names. This was the finding class Codex raised in every one of S1–S4.
- Pre-existing uncommitted edits: CLAUDE.md, AGENTS.md and .claude/skills/gitnexus/*/SKILL.md
  carry an UNCOMMITTED GitNexus re-index (2026-09-15, 407 files / 8897 nodes / 14707 edges / 300
  flows, pinned 5e6703f). Start by reading `git diff` on those files. Keep those edits, fold your
  own changes to CLAUDE.md/AGENTS.md on top of them, and commit them together in part C. Do not
  revert them and do not commit them separately.

## A. Close the 6 uncited tests so `verify:doctor` goes green

`npm run verify:map` reports 6 uncited of 169:
  packages/engine/test/forecast.test.ts
  packages/engine/test/snapshot.test.ts        (added by M1 -- the map rotted inside its own wave)
  apps/server/test/accounts.test.ts
  apps/server/test/shift-location.test.ts
  apps/server/test/store.test.ts
  apps/web/test/economy2.spec.ts

For each: open the file, read what it actually proves, find the feature file(s) under
references/features/ it belongs to, and cite it in that file's `## Existing proof` section in the
README's `file: test name` format. If a test genuinely belongs to no existing feature file, say so
and propose the file rather than inventing a citation. `npm run verify:map` must report 0 uncited
when you are done, and `npm run verify:doctor` must exit 0.

## B. Plan changelog v3.1 -- correct four measured errors in v3

Add a `v3.1 | 2026-09-16` row to the Changelog and fix the body text it refers to:
1. §0/§7 port inventory: re-measure from the real configs (scripts/verify/port.ts is now the
   source of truth -- read it) and replace the stale table.
2. "5 Playwright configs" -> there are SIX `playwright*.config.ts` at the repo root; list them.
3. `remote-test/`, `dev-identity-test/` etc. are under `apps/web/`, not the repo root; fix every
   path that says otherwise.
4. §6 claims the prod bundle "contains no `__TBH_VERIFY__` string". Measured: the build RETAINS
   the string; what the guard does is refuse to INSTALL the bridge outside dev/VITE_TBH_VERIFY.
   Reword to what is true and cite apps/web/src/verify/install.ts.
Also tick the Definition-of-done boxes that M1/M2 actually closed, with the PR numbers (#3–#12),
and leave the V4/V5 boxes open.

## C. V4 contract (plan §8)

1. `docs/prompts/codex-review.md` item 3 gains: "Verification block present, evidence paths exist,
   skips legitimate, no PASS on a failed doctor."
2. CLAUDE.md and AGENTS.md: the `<!-- ap3-workflow:start -->…<!-- ap3-workflow:end -->` block
   ALREADY EXISTS in both -- update it in place, do not add a second one. It must state: the
   9-step sequence from the verify skill's SKILL.md, the PASS rule, the two-tier rule (engine tier
   = `game.command()` is production; UI tier = through the DOM only, remote proof needs the
   isolated API), and "never mutate through the bridge". Then update the GitNexus header in both
   files to the re-index numbers above and DELETE the two lines "covers `prototype/` only" and
   "packages/apps not indexed" -- both are false since the re-index.
3. The verify skill's README gains a `## Conventions for authors` section with these four rules,
   each with the incident that produced it in one line:
   - Existing-proof and Uncovered claims come from reading test bodies and following helpers, never
     from test names. (S1–S4: `replay()` in locations.test.ts:21 was missed; `encodeSave()`
     equality was mistaken for replay proof.)
   - A queue task that cites a library API must verify the API exists in the installed version
     first (`node -p "typeof require('x').y"`). (m02-doctor: `ts.createSourceFile` does not exist
     in typescript@7.0.2; cost two review rounds.)
   - "Matching the plan's X/Y/Z groups" is not an acceptance criterion. Each group gets its own
     falsifiable pass/fail line, or is named as out of scope. (m02-doctor: the reviewer measured
     against the plan document and the slice ballooned.)
   - An owner amendment that adds a hard rule is checked against the real tree before it is
     written. (m02-doctor: "ban bare Date/Math" contradicted 94 legitimate uses; the writer had to
     HALT to expose it.)
   Plus the review-cap rule: the 4-round review cap resets once after an owner-directed scope
   change; a second reset requires a new slice.
4. `SESSION-TRACK-LOG.md`, `docs/TRANG-THAI-DOCS.md`, `docs/implementation-tracker.md`: one row
   each for M1/M2 (PRs #3–#12, the verify:doctor/verify:map/verify:port commands, the
   tbh-fixture + bridge.spec.ts, and the fact that `verify_host` ran a real browser for the first
   time on PR #12). Rebuild the dashboard if the tracker feeds it (check scripts/dashboard).

## D. Two small code items (only these two)

1. `scripts/verify/map-coverage.ts`: if closing part A revealed a matching bug (e.g. a test cited
   with a path form the scanner does not recognise), fix the scanner and add the case to
   map-coverage.test.ts. If part A closed cleanly, touch nothing here and say so.
2. package.json: add `"verify:all": "npm run verify && npm run verify:doctor"` so one command is
   the gate. Mention it in the ap3-workflow block.

## Report

Write the §0.3 slice report (docs/prompts/11-PROMPT.md format) with a `VERIFICATION:` block whose
evidence is the literal output of `npm run verify:doctor` (all lines ✓, exit 0) and
`npm run verify:map` (0 uncited). Then run one Codex review round with /slice-review-round, close
the findings, and hand the branch back for the owner to open the PR. Do not merge.
```

---

## Prompt 4 — Trùm Bia Hơi — emit the first V5 slices (plan-emit, then dispatcher)

Run this AFTER Prompt 3 is merged and K24 is installed. Same session shape as the original P2:
Claude Code at `~/Projects/Trum Bia Hoi` on `main`, output = lint-clean queue files, no code.

```
You are in the Trùm Bia Hơi repo at ~/Projects/Trum Bia Hoi on main. Read
trum-bia-hoi-agent-understanding-verification-implementation-plan.md §9 (V5), ap3/routines.json,
ap3/lint-task.sh, and every file under ap3/queue/done/agent-verification-m1-m2/ (the seven tasks
that ran, for the exact frontmatter and section shape the linter accepts). Then read
.claude/skills/verify-trum-bia-hoi/references/features/README.md §Conventions for authors -- you
are bound by all five rules there.

Your output is queue task files under ap3/queue/, each linted clean with
`bash ap3/lint-task.sh ap3/queue/<slug>.md`, and ONE edit to ap3/routines.json. No product code.

## 1. A new routines class -- the owner-authority decision you must surface, not make silently

The only class today is `agent-tooling`, and its description forbids gameplay, economy, engine/
server API and UI copy changes. The first V5 slice below is a server behaviour change, so it
cannot run under it. Add a class `server-guard` to ap3/routines.json:
  status enabled, risk P1, writer_model claude-sonnet-5, budget_usd_max 16, max_runs_per_day 3,
  review codex, security_review required,
  allowed_scope: apps/server/src/registry.ts, apps/server/src/forecast.ts,
                 apps/server/test/**, packages/engine/sim/**, packages/engine/test/**
  description: "Server-side admission and forecast guards. Changes what the server REFUSES, never
  what the game pays. No economy JSON, no engine command/event, no UI."
Print the exact JSON you added in your report -- the owner reviews it before unpausing.

## 2. Slice `v5-admin-k-admission` (class server-guard, risk P1) -- the real defect

Measured 2026-09-15: apps/server/src/registry.ts:157 `validate()` admits a candidate config when
its SELF-REPORTED `values.k.value` lies inside the seed's `values.k.band`. A config with
`k.value: 2.5` was admitted while the economy it described measured k = 209.765. The forecast
route (apps/server/src/forecast.ts, backed by packages/engine/sim/forecast) already simulates
candidate-vs-baseline but never checks k against the band.

Before writing the task, MEASURE: read packages/engine/sim/forecast and find where (or whether) k
is computed from a simulation -- k = mean(payment + tip) / 82.5 over ≥500 serves, band [2.0, 3.0]
per docs/config/economy.tbh.json (cite the exact JSON path, do not restate the numbers). Write
into the task's Context exactly which function returns the per-serve payment/tip series, or that
none does and the sim must expose it. Verify every API you name exists (rule 2 of the
conventions).

Acceptance (falsifiable, one line each):
- A new server test proves admission REFUSES `registry:bindingRange` for a candidate whose
  self-reported k.value is inside the band but whose measured k (from the same forecast sim the
  route already runs) is outside it. This test must fail on main today.
- A second test proves admission still ACCEPTS a candidate whose measured k is inside the band.
- The measured-k check runs inside validate() or a function it calls, not only in the forecast
  route, so there is no path to admission that skips it.
- The refusal error carries both numbers (`registry:bindingRange measured=<k> band=[lo,hi]`) so an
  admin sees why.
- Existing forecast tests unchanged and green.
- verify: the two new test files via `npm run test:one -- <files>`. No verify_host.
Add the slice's feature-file citation to references/features/admin-registry.md `Existing proof`
in the same task (the map must not rot again), and put that file in scope.
Budget 14, max_review_rounds 3, milestone false.

## 3. Slice `agent-verification-m03-dev-port-wire` (class agent-tooling, risk P2)

Plan §7 leftover. scripts/verify/port.ts resolves a worktree-safe port and all six
playwright*.config.ts use it (PR #9), but `npm run dev`, `npm run dev:server` and
apps/web/vite.config.ts still hardcode their ports, so two worktrees' dev servers still collide.
Wire them to TBH_PORT_BASE via the same resolver.

The resolver itself has a measured gap the V4 review (round 6) could only fix the WORDING of:
`scripts/verify/port.ts:69` maps a worktree to `5200 + sha256(id) % 300` with no collision
detection. Ten live worktrees in 300 slots is roughly a 14% chance two share a slot, and two bases
closer than MAX_ROLE_OFFSET collide on their role ports even when the slots differ. Fix the
mechanism in this slice: enumerate the other live worktrees (`git worktree list --porcelain`),
detect a base within MAX_ROLE_OFFSET of another worktree's, and probe deterministically to the next
free slot. Acceptance: a unit test proves the vite config and the dev scripts derive their ports
from the resolver with the documented offsets; a second test proves two fake worktree ids that hash
to the same slot receive different bases and that the probe order is stable across runs; the real
guarantee replaces the probabilistic wording in port.ts and in the ap3-workflow block.
verify: `npm run test:one -- <tests>`. Scope: scripts/verify/port.ts, apps/web/vite.config.ts,
package.json, scripts/verify/port-wire.test.ts (extend, do not duplicate), CLAUDE.md, AGENTS.md
(ap3-workflow block only). Budget 10, rounds 3.

## Rule for EVERY slice emitted here: wire new tests into the aggregate

The V4 review found 115 tests from M1/M2 that `npm run verify` never ran: each slice's `verify:`
pointed at its own file and nobody added the file to the aggregate. Every task you emit that adds
a test file must ALSO, in the same PR, add it to whatever `npm run verify` executes (or prove the
aggregate already globs it), and its acceptance must say so in one line. A slice whose new tests
are green in isolation but absent from `npm run verify` is not done.

## 4. Slice `v5-uncovered-serve-toast-remote` (class agent-tooling, risk P2)

Pick the FIRST entry of references/features/<serve feature file>.md `## Uncovered paths` that is
a remote-mode behaviour (plan §9 names "remote-mode serve outcome toasts"). One Playwright spec
using the tbh fixture (apps/web/test/tbh-fixture.ts) proves it through the DOM against the
isolated API; verify = a browser-free unit test of any helper you add; verify_host = the spec via
`npx playwright test <spec> --config playwright.remote.config.ts`. Cite it back in the feature
file. Budget 12, rounds 3. If no such Uncovered entry exists, say so and emit nothing for this
slice.

## Order and report

`after:` chains: m03-dev-port-wire has no predecessor; v5-admin-k-admission has none;
v5-uncovered-serve-toast-remote `after: agent-verification-m03-dev-port-wire`.

Report: the linter output for every file, the routines.json diff, the measurement you made for
slice 2 (function names and file:line), and any acceptance line you could NOT make falsifiable --
name it rather than softening it. Commit the queue files and routines.json with prefix
`chore(ap3): emit V5 slices --`. Do not unpause the dispatcher; the owner removes ap3/PAUSED.
```

After the owner reviews the `server-guard` class and the three tasks:

```bash
cd "/Users/maingocanh/Projects/Trum Bia Hoi" && git pull && rm -f ap3/PAUSED
launchctl kickstart -k gui/$(id -u)/com.ap3.dispatch.Trum-Bia-Hoi
tail -f ~/Library/Logs/ap3/dispatch-Trum-Bia-Hoi.log
```
