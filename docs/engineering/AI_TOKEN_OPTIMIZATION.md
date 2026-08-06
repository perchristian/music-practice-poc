# AI Task Token Optimization

## Objective

Reduce the context, exploration, and inference required for Claude Code, Codex, or
another coding agent to complete a project task without reducing implementation
quality, verification depth, or product learning.

Token reduction is not itself the product goal. An optimization is successful only
when it preserves or improves:

- implementation accuracy
- regression safety
- time to a verified outcome
- clarity for the next developer or agent

## Review Baseline

The first version of this document correctly identified three recurring costs:

1. architecture and status rediscovery
2. search across large integration files
3. inference of undocumented data shapes and function contracts

The review on 2026-07-23 found that the original recommendations were directionally
useful but too dependent on volatile facts:

- source line numbers and function signatures had already moved
- fixed test counts had become stale
- `practiceState.tempoMap` had been replaced by version-2
  `practiceState.timingMap`
- estimated token savings had no measured baseline
- the proposed split focused on `server.js` even though `public/app.js` had become
  the larger and more immediately active integration file

Static line numbers, test totals, and current-state details must therefore stay out
of automatically loaded orientation text.

## Optimization Principles

1. Measure before claiming savings.
2. Keep automatically loaded context short and stable.
3. Point to symbols and contracts, not line numbers.
4. Separate current state from historical evidence.
5. Extract cohesive seams when their subsystem is already being changed.
6. Document shared boundary shapes before annotating internal implementation.
7. Preserve focused and full regression verification.

## Actions in Priority Order

### 1. Establish a Repeatable Baseline

Before restructuring context or code, record at least three representative AI
tasks:

- one frontend interaction task
- one backend or analysis task
- one documentation-only task

For each task, capture what the available tooling exposes:

- input and output tokens
- number of file reads or search/tool calls before the first relevant edit
- elapsed time to the first relevant edit and to verified completion
- failed tests, regressions, or material rework
- files read versus files ultimately changed

The sample does not need laboratory precision. It must be consistent enough to
compare later sessions and must not incentivize skipping necessary context.

### 2. Condense Current-Context Documents

The primary context files have accumulated completed history and detailed
verification logs. Reorganize them without losing evidence:

- keep `docs/planning/STATUS.md` focused on current architecture, current checkpoint, active
  work, next task, blockers, and known local state
- keep active and near-future execution work in `docs/planning/TASKS.md`
- move completed task detail and dated verification history to clearly named
  archives
- retain `CHANGELOG.md` as the curated outcome history
- keep `docs/planning/DECISIONS.md` authoritative for irreversible choices

The target is not an arbitrary line count. A fresh session should be able to
orient itself by reading the current sections without scanning chronological
implementation history.

### 3. Add a Small, Stable Codebase Quick Reference

Add or replace content in `AGENTS.md` with a compact quick reference only after
the baseline has been recorded. It should contain:

- stable file or module responsibilities
- current runtime entry points
- critical state/provenance invariants
- canonical development commands without test totals
- pointers to `docs/planning/STATUS.md`, `docs/planning/TASKS.md`, `docs/engineering/ARCHITECTURE.md`, and `docs/planning/DECISIONS.md`

Keep the reference short enough that automatically loading it is always cheaper
than rediscovering the same information. Do not copy current task status,
implementation line numbers, or volatile data-model versions into it.

### 4. Use Symbol-Based Task Contracts

New task descriptions should use this shape:

```md
### Task: Short title

Files and symbols:
- `public/app.js`: `followPlaybackTimeline`, timeline pointer/wheel handlers
- `tests/gui.spec.js`: focused timeline interaction coverage

Goal:
- One sentence describing the user or engineering outcome.

Contracts to preserve:
- Relevant persisted-state, API, provenance, and interaction invariants.

Non-goals:
- Nearby behavior that must not expand in this task.

Verify:
- Focused test command
- Full regression command
- Required human or hardware gate
```

Symbol names are search anchors. Line numbers may be used in temporary notes
during one session but must not become maintained planning metadata.

### 5. Extract Modules at Active Seams

Avoid a broad monolith rewrite whose only justification is token reduction.
Extract a module when all of these are true:

- its responsibility can be named precisely
- its inputs, outputs, and side effects can be tested
- the current work already touches that subsystem
- the extraction reduces the scope future tasks must inspect

Current candidates:

1. During timeline input-contract hardening, separate timeline viewport and input
   state from `public/app.js` if a coherent, regression-safe seam is available.
2. When harmonic analysis is next changed, move beat and harmony analysis from
   `server.js` into focused modules without rewriting the algorithms.
3. When job persistence is next changed, separate job storage and lifecycle
   operations from HTTP route wiring.

Pure transformation modules should be preferred. DOM, transport, filesystem, and
process-launch side effects should remain explicit at integration boundaries.

### 6. Add Boundary-Focused JSDoc

Start with reusable data contracts rather than annotating every private helper:

- persisted practice state
- version-2 timing events
- chord-chart events
- analyzer metadata and provenance
- job/API request and response shapes
- waveform envelope metadata

Annotate exported or cross-module functions using those shared typedefs. Keep
comments synchronized with runtime validation and tests. Do not add incorrect
one-line signatures merely to increase annotation coverage.

### 7. Validate Context Recovery and Real Savings

After the context changes:

1. perform the required simulated or fresh-session context recovery review using
   only `docs/planning/STATUS.md`, `docs/planning/TASKS.md`, `docs/planning/DECISIONS.md`, and `docs/engineering/ARCHITECTURE.md`
2. repeat comparable frontend, backend, and documentation tasks
3. compare tokens, exploratory reads, time, and rework with the baseline
4. retain only changes that improve efficiency without weakening outcomes

## Acceptance Criteria

- A fresh session identifies the current architecture, completed checkpoint,
  next task, and important invariants without reading historical verification
  logs.
- Task descriptions route an agent to relevant files and symbols without brittle
  line anchors.
- No automatically loaded quick reference contains fixed test counts or volatile
  implementation state.
- At least one before/after sample exists for frontend, backend, and
  documentation work.
- Focused and full regression verification remain part of implementation tasks.
- The context recovery review passes after documentation is reorganized.
- Module extraction is justified by an active subsystem change and verified
  behavior, not by speculative token savings alone.

## Explicit Non-Goals

- migrating the project to TypeScript only for AI efficiency
- splitting every large file in one refactor
- minimizing tokens by skipping architecture, safety, or verification context
- optimizing for one agent product at the expense of reproducibility
- treating estimated token reduction as evidence without measurement
