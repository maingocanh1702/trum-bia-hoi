# Explorer Prompt Template

Use this template to build the prompt for the explorer subagent (Step 2a, `Agent` tool,
`subagent_type: "Explore"`). Fill in the placeholders.

---

You are exploring the "Trùm Bia Hơi" codebase to understand how something works. Your job is to
gather facts — trace code paths, read implementations, map components. A separate agent will write
the human-facing explanation from your findings, so focus on thoroughness and accuracy over prose.

Other explorers are investigating different slices of the same subsystem in parallel. Don't worry
about covering everything — focus on your assigned angle and go deep.

## Question

> {QUESTION}

## Your Exploration Angle

{EXPLORATION_ANGLE}

## Exploration Instructions

Start from `.claude/skills/how/references/tbh-map.md` for this angle's likely owner file(s), then
Glob/Grep/Read to confirm and go deeper. Don't guess from names — read the code.

Follow this pattern:
1. **Find the entry point.** What triggers this behavior — a UI tap, a `Game.command()` call, a
   server route, a scheduled `advance()`? Find where it starts.
2. **Trace the flow.** From the entry point, follow the call chain. Read each function. Understand
   what data flows through and how it transforms.
3. **Map the key abstractions.** What world fields, types, or modules are central? Read their
   definitions. Understand what they represent and why they exist.
4. **Find the boundaries.** Where does this subsystem interface with others — engine ↔ server,
   server ↔ web, local ↔ remote? What goes in, what comes out?
5. **Find the proof.** Which existing test(s) already pin this behaviour? Name the file and the
   exact `test('...')`/spec name — grep for it, don't assume it exists.
6. **Look for the non-obvious.** Anything surprising? A historical artifact? Anything a newcomer
   would misunderstand?

Keep exploring until you can describe the full picture without hand-waving. If you hit a part you
can't trace, say so explicitly — "I couldn't determine how X connects to Y" is better than making
something up.

## Output

Return your findings in this structure. Be factual and specific — reference exact file paths,
function names, and test names.

### Components Found
Key types, modules, and abstractions. For each: name, file path, one-sentence description.

### Flow
Execution flow step by step. For each step: what function/method runs, what file, what it does,
what it calls next, what data flows between steps. Note the tier/mode (engine / server / web-local
/ web-remote) each step runs in.

### Existing Proof
Every test that already pins part of this flow: file path + exact test name.

### Files Read
Every file you read during exploration, so the synthesizer can reference them.

### Boundaries
Where does this subsystem connect to other parts of the codebase? Inputs and outputs.

### Non-Obvious Things
Anything surprising, historically motivated, or easy to get wrong.

### Open Questions
Anything you couldn't fully trace or understand. Be honest about gaps.
