---
name: how
description: Explain how something works in Trùm Bia Hơi (engine/server/web) by exploring the codebase and producing an architectural explanation grounded in file:line citations and the tests that already pin the behaviour. Optionally critique the architecture for issues. Use before editing anything non-trivial.
---

# How

Explore the codebase to answer "how does X work?" questions. Produce clear architectural
explanations at the level of a senior engineer onboarding onto a subsystem — enough to build a
working mental model, not so much that it reads like annotated source code.

Ported from [poteto/how](https://github.com/poteto/how) for Claude Code. Same two modes, adapted
to this harness's `Agent` tool and to this repo's shape (pure engine + server + two web runtime
modes).

Two modes:

1. **Explain** (default) — explore the codebase and produce a clear explanation
2. **Critique** — explain first, then spawn independent reviewers to identify architectural issues

## Before You Start

- Read `references/tbh-map.md` first. It names the owner file/module for rules, clocks,
  persistence, each runtime mode, and UI, plus where the existing proof (tests) lives. Explorers
  start from that map instead of rediscovering repo structure from zero every time.
- This repo has two tiers and, in the web tier, two runtime modes: **engine** (pure, `Game.command`
  / `advance()`), **server** (`apps/server`, calls the engine per request), **web-local**
  (`VITE_TBH_LOCAL=1`, the browser builds a `Game` itself), **web-remote** (default, the browser
  never constructs a `Game` — it talks to the server over `/api` via `RemoteGame`). Classify every
  finding by tier/mode; a claim that doesn't say which one is incomplete.
- GitNexus (`gitnexus://repo/trum-bia-hoi/context`) only covers `prototype/` today. Check freshness
  before using it for anything under `packages/` or `apps/` — if it's stale there (it currently is),
  use Glob/Grep/Read instead of trusting graph results for those paths.

## Explain Mode

### Step 1 — Understand the Question and Assess Complexity

Parse what the user is asking about. They might say:

- "How does the serve trace work end to end?" — a runtime trace crossing UI → dispatch → engine
- "How does remote.ts keep one writer and recover after reconnect?" — a subsystem
- "How is the save system structured?" — an architectural overview
- "What does `kitchen.ts` do?" — a single module

Identify the scope. If it's ambiguous, make your best guess and state your interpretation before
exploring. Don't ask — explore and let the user redirect if you're off.

**Assess complexity to decide the approach:**

- **Simple** (a single module or function, a narrow question about one file): skip explorer agents
  entirely — one agent explores and explains in a single pass. Go directly to Step 2b.
- **Complex** (a subsystem spanning multiple files, a cross-cutting feature, a flow that crosses
  engine/server/web or local/remote): spawn parallel explorer agents first, then synthesize. Go to
  Step 2a.

When in doubt, lean toward the simple path — you can always spawn explorers if the direct pass hits
a wall.

### Step 2a — Explore (complex questions only)

Decompose the question into 2-4 parallel exploration angles, each a distinct slice so explorers
aren't duplicating work. For example, "how does the serve trace work end to end?" might split into:

- Explorer 1: the UI tap → `dispatch()`/`RemoteGame` boundary (`apps/web/src/App.tsx`,
  `local.ts`, `remote.ts`)
- Explorer 2: the engine command/outcome (`engine.ts` `command()`, `rules.ts`, the four serve
  outcomes)
- Explorer 3: persistence and the resulting toast/UI update (`save.ts`, `browser-save.ts`, the
  event the UI listens for)

The right decomposition depends on the question. For narrow questions, 2 explorers is fine; for
broad subsystems, use up to 4.

Spawn all explorers in a single message using the `Agent` tool with `subagent_type: "Explore"`
(read-only by construction — no Write/Edit/Agent tools). Each explorer gets the base prompt from
`references/explorer-prompt.md` with `{QUESTION}` and `{EXPLORATION_ANGLE}` filled in, plus:

- Start from `references/tbh-map.md`'s entry points for its angle, then Glob/Grep/Read from there.
- Read the actual code — don't guess from file or function names.
- Name which tier/mode (engine / server / web-local / web-remote) each finding belongs to.
- Name the existing test(s) that already pin the behaviour it traced (file + `test('...')` name),
  not just the source.

Each explorer returns structured findings per the template in `explorer-prompt.md`. Overlap between
explorers is fine — the synthesis step reconciles it.

Then proceed to Step 3.

### Step 2b — Direct Explain (simple questions)

Spawn a single `Agent` call, `subagent_type: "general-purpose"`, `model: "opus"`. Instruct it
explicitly: read-only — it must not Write or Edit any file, only Read/Grep/Glob/Bash(read-only) and
report back.

This agent explores (starting from `references/tbh-map.md`) and writes the explanation directly.
Give it `references/explainer-prompt.md` for communication style and output format — it follows the
same structure, it just has no explorer findings as input.

Proceed to Step 4.

### Step 3 — Synthesize (complex questions only)

Once all explorers return, spawn one `Agent` call, `subagent_type: "general-purpose"`,
`model: "opus"`, read-only (same instruction as Step 2b), to synthesize their findings into one
explanation. Use `references/explainer-prompt.md` as the prompt template, with `{QUESTION}` and
`{EXPLORER_FINDINGS_ALL}` filled in from Step 2a's results.

The synthesizer reconciles overlapping findings, resolves contradictions by checking the code
itself (it has read access), and weaves the separate slices into one picture — including which
tier/mode each part of the flow runs in.

### Step 4 — Present

Take the output from Step 2b or Step 3 and present it to the user. You may lightly edit for
clarity or add context from the conversation, but don't substantially rewrite.

### Output Format

Same sections as upstream, adapted with one addition required in this repo:

**Overview** — 1-2 paragraphs: what this is, what it does, why it exists.

**Key Concepts** — the important types/modules/world fields needed to follow the rest.

**How It Works** — the core walkthrough: trigger, steps, data flow, decision points. Prose, not
pseudocode; reference specific files/functions. A mermaid or ASCII diagram when the flow crosses
several components or transforms data through stages.

**Where Things Live** — a brief file/directory map, just what's needed to start working here.

**Change-Safety Summary** — required whenever the answer names anything a future edit could touch
(i.e. most questions in this repo, per the "understand before editing" rule in `CLAUDE.md`). Skip
only for a purely historical/conceptual question with no editable target. Name, tersely:
- **Owner module(s)** — where this behaviour actually lives; prefer extending it over a sibling.
- **Commands / events** — which of the 26 commands and 66 domain events are involved.
- **World fields** — which `World`/`WorldView` fields the behaviour reads or mutates.
- **Invariants** — rules that must keep holding (e.g. k band, append-only log, config pinning).
- **Tests already pinning it** — exact file + test name, engine/server/web, so a change author
  knows what must stay green.
- **Regression surfaces** — sibling behaviour likely to break if this is touched carelessly.
- **Tier / mode** — engine, server, web-local, and/or web-remote.

For a Simple/single-function answer this can be one line (owner module, tier, tests). For a Complex
answer, give the full list — this is the block the acceptance check and a future editor rely on.

**Gotchas** — non-obvious things, historical context, sharp edges. Skip if there's nothing to say.

## Critique Mode

Triggered when the user asks for architectural issues, problems, or improvements — not just
understanding.

### Step 1 — Explain First

Run the full Explain flow above (Steps 1-4). You need to understand the architecture before you
can critique it.

### Step 2 — Spawn Critics

After the explanation is complete, spawn two independent critics — one Claude subagent, one Codex
— so the critique doesn't share a single model's blind spots.

**Critic A (Claude).** `Agent` call, `subagent_type: "general-purpose"`, `model: "opus"`,
read-only (explicit instruction, same as Step 2b/3). Prompt built from `references/critic-prompt.md`
with `{EXPLANATION}` = Step 1's output, `{FILE_PATHS}` = the files the explanation cites, and
`{CRITIQUE_RUBRIC_CONTENTS}` = the contents of `references/critique-rubric.md`.

**Critic B (Codex).** Build the same filled-in `critic-prompt.md` (identical inputs to Critic A, so
the two are comparable) and pipe it to Codex on stdin:

```bash
codex exec review - < /tmp/how-critic-<slug>.txt
```

Notes:
- `--base`/`--commit`/`--uncommitted` review a *diff*; critique reviews the *current* architecture,
  so omit them here — that's a different command, used for slice review (`docs/prompts/codex-review.md`),
  not for `/how`.
- `codex exec review` reads its prompt from stdin only when the positional arg is exactly `-`. If
  you run it by hand with nothing meaningful piped, it blocks waiting for EOF — use
  `codex exec review - < /dev/null` in that case, not a bare invocation left open.

### Step 3 — Lead Judgment

You're a pragmatic lead, not an aggregator. Categorize each finding from both critics:

- **Act on** — architectural problems worth fixing now
- **Consider** — real concerns, cost/benefit unclear
- **Noted** — valid, low priority
- **Dismissed** — wrong, missing context, or style preference

Present the explanation first (from Step 1), then the critique verdict below it. The explanation
must stand on its own — someone who just wants to understand the system shouldn't have to wade
through critique to get there.

## Trùm Bia Hơi Question Set

Representative questions this skill should answer well (not exhaustive — any "how does X work"
question in this repo is in scope):

- Serve trace: tap → `dispatch()`/`RemoteGame` → command → outcome → toast → persist
- The table ring / table lifecycle (03-SPEC)
- Beer-flat lifecycle (glass states)
- Kitchen pans / order-rounds
- Remote outbox + one-writer lock + reconnect (`remote.ts`)
- How k (value per served order) is measured
- Save replay (`save.ts`, `decodeSave`) and what breaks it
- Season snapshot / rollover
- Admin registry publish/rollback
- i18n fallback behaviour

## References

- `references/tbh-map.md` — entry points, modules, and existing tests per subsystem
- `references/explorer-prompt.md` — template for Step 2a explorer agents
- `references/explainer-prompt.md` — template for Step 2b/3 explain/synthesize agents
- `references/critic-prompt.md` — template for critique-mode critics
- `references/critique-rubric.md` — the architectural critique rubric
