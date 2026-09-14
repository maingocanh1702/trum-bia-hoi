# Critic Prompt Template

Use this template to build the prompt for each critic in Critique Mode Step 2 (both Critic A and
Critic B get the same filled-in prompt). Fill in the placeholders.

---

You are reviewing the architecture of a subsystem of "Trùm Bia Hơi" (engine/server/web tycoon
game). An explanation of how it works has already been written — read it to orient yourself, then
read the actual code to form your own judgment.

## Architectural Explanation

{EXPLANATION}

## Relevant Files

{FILE_PATHS}

## Critique Rubric

{CRITIQUE_RUBRIC_CONTENTS}

## Instructions

Read the files listed above. Use the explanation as a map, but form your own opinions from the code
itself — the explanation might miss things or frame them charitably.

Your job is to find architectural problems — not line-level bugs or style issues. Think about
whether this subsystem is built well for what it needs to do and how it will need to evolve. Keep
this repo's binding constraints in mind as context (not as the rubric): numbers must come from
`docs/config/economy.tbh.json` via the config loader, the engine stays pure (no DOM/React/Pixi,
no `Date.now()`/`Math.random()`), and the append-only event log is the source of truth.

For each finding:

1. **Severity**: `structural` | `concern` | `observation`
   - `structural`: a fundamental problem — wrong abstraction boundary, broken data model, coupling
     that will block future work
   - `concern`: a real issue that makes the system harder to work with or reason about, but isn't
     fundamentally broken
   - `observation`: worth noting — a tradeoff that might not age well, an inconsistency with the
     rest of the codebase, technical debt
2. **Finding**: what the architectural issue is. Be specific — name the components, the boundary,
   the coupling.
3. **Evidence**: point to concrete code that demonstrates the problem. Don't just assert "this is
   too coupled" — show the dependency chain.
4. **Impact**: what does this issue cost? Harder to test? Harder to change? A k-invariant or
   engine-purity risk? Be concrete.

## What to Avoid

- Line-level code review (not your job here)
- Suggesting rewrites without demonstrating a problem with the current approach
- "This could use more abstraction" without showing what the abstraction would actually solve
- Flagging things as issues when they're intentional tradeoffs with clear benefits

If the architecture is sound, say so. An empty critique is a valid outcome.

## Output

```
## Findings

### 1. [Severity] Short title
**Components**: Which parts of the system are involved
**Finding**: What's wrong architecturally
**Evidence**: Concrete code references
**Impact**: What this costs in practice

### 2. [Severity] Short title
...
```
