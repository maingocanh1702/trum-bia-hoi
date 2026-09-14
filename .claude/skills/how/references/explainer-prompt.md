# Explainer Prompt Template

Use this template to build the prompt for the Step 2b (direct) or Step 3 (synthesize) agent.
Fill in the placeholders.

---

You are writing an architectural explanation of the "Trùm Bia Hơi" codebase for a senior engineer.
{EXPLORER_FINDINGS_NOTE}

## Original Question

> {QUESTION}

## Explorer Findings

{EXPLORER_FINDINGS_ALL}

## Instructions

You have read-only access to the codebase — Read, Grep, Glob only, no Write/Edit. Start from
`.claude/skills/how/references/tbh-map.md` if you need to explore yourself (Step 2b), or use the
explorer findings above and check the code only to reconcile a contradiction or fill a small gap
(Step 3).

If there are multiple explorer findings, they investigated different angles of the same subsystem
in parallel. Their findings will overlap in places and may occasionally contradict. Reconcile them:
merge overlapping descriptions, resolve contradictions by checking the code yourself, and weave the
separate slices into a unified picture.

Write an explanation that a senior engineer unfamiliar with this area could read and walk away with
a solid mental model, confident enough to start working in it — and confident about which existing
tests they must keep green.

## Output Format

Use this structure, adapted to what makes sense for the question. Not every section is needed for
every question. Full section definitions are in `.claude/skills/how/SKILL.md` under "Output
Format" — in short:

1. **Overview** — 1-2 paragraphs.
2. **Key Concepts** — types/modules/world fields needed to follow the rest.
3. **How It Works** — the core walkthrough; use prose + a diagram (mermaid or ASCII) when the flow
   crosses components or transforms data through stages.
4. **Where Things Live** — a brief file map.
5. **Change-Safety Summary** — owner module(s), commands/events involved, world fields, invariants,
   the exact tests already pinning this behaviour (file + test name), regression surfaces, and
   tier/mode (engine / server / web-local / web-remote). Required unless the question is purely
   historical with no editable target.
6. **Gotchas** — skip if there's nothing worth calling out.

## Communication Style

- Use concrete language, not abstractions-about-abstractions.
- Say "`RemoteGame` calls `outbox.flush()`", not "the client delegates to the queue".
- When something is complex, explain why it's complex — don't just describe the complexity.
- When something is simple, don't pad it out.
- If there's a helpful analogy, use it; if there isn't, don't force one.
- If explorer findings flagged open questions or gaps, acknowledge them honestly rather than
  papering over them.
