# Architectural Critique Rubric

Review through whichever of these lenses are relevant. Not every lens applies to every subsystem.

## Abstraction Fit

Are the abstractions in this subsystem pulling their weight?

- Does each abstraction represent a real concept, or is it an indirection layer "in case we need it"?
- Are the abstraction boundaries in the right place — do they separate things that change
  independently (e.g. engine rules vs. rendering, local mode vs. remote mode)?
- Is there accidental coupling where two components share implementation details they shouldn't
  need to know about?
- Is business logic entangled with framework wiring, or cleanly separated (engine purity)?

Over-abstraction is as much a problem as under-abstraction. A flat, simple design is fine when the
domain is simple.

## Data Model

Do the data structures fit the actual usage patterns?

- Are the data models (`World`, `WorldView`, save shapes) designed for how data is actually
  accessed, or for how it was conceptually modeled?
- Are there impedance mismatches — places where code constantly reshapes data because the
  underlying model doesn't match the access pattern?
- Are types honest? Do they represent what data actually looks like at runtime, or do they claim
  more structure than exists?

## Boundary Discipline

Are system boundaries clean and well-placed?

- Is validation concentrated at entry points (config loader, command handlers, server routes), or
  scattered through internal code?
- Are errors/outcomes handled at boundaries and propagated cleanly, or caught and re-thrown at
  every layer?
- Does data cross boundaries (engine → server → web, local ↔ remote) in well-typed shapes, or as
  bags of optional fields?
- Could this subsystem be tested in isolation (pure engine tests), or does it require the entire
  system running?

## Evolution Readiness

How well will this architecture handle likely changes?

- If the next plausible requirement landed tomorrow (a new customer type, a new command, a new
  runtime mode), how much would need to change — one file, or everything?
- Are there hardcoded assumptions that would need to be relaxed?
- Is the design bolted-on (integrated as an afterthought) or integrated (looks like it was always
  part of the plan)?
- Are there legacy paths preserved for compatibility that nothing depends on?

Don't penalize for not handling hypothetical changes. Focus on changes plausible given the
trajectory of this codebase.

## Complexity vs. Value

Is the complexity budget spent wisely?

- Where is the complexity concentrated — in parts that need to be complex (core rules, tricky
  invariants like the k band or replay determinism), or in accidental places (boilerplate,
  unnecessary indirection)?
- Are there simpler ways to achieve the same behavior?
- Does every component earn its existence, or are there vestigial pieces from an earlier design?

## Consistency

Does this subsystem follow the patterns established elsewhere in the codebase?

- Are similar problems solved the same way here as in other engine modules, or does this area
  invent its own patterns?
- If the patterns differ, is there a good reason, or did it just evolve independently?
- Inconsistency isn't automatically bad — but unexplained inconsistency is a maintenance burden.
