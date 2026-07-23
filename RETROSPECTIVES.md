# Retrospectives

This file is the append-only record of project retrospectives. Add new reports
under a dated heading. Do not rewrite earlier conclusions to match later
knowledge; add a follow-up note in a newer retrospective when a conclusion
changes.

Each report should cover:

- what went well
- what could improve
- what to start
- what to continue
- what to stop
- resulting backlog or process changes

---

## 2026-07-23 — Delivery and AI Context Retrospective

### Scope

Reviewed the delivered prototype, current project planning and status, recent
iteration history, and `AI_TOKEN_OPTIMIZATION.md`.

Product validation will be led by the piano-player product owner, supported by
additional user testing. The project team should prepare a dependable testable
prototype and evidence, but should not infer product success without those
sessions.

### What Went Well

- The project delivered vertical user journeys rather than isolated layers. Mock
  mode remained demonstrable while real extraction, separation, analysis, timing,
  loops, and sections were introduced.
- Human listening and physical-device review complemented automation. Real Mac
  trackpad review exposed a gap that synthetic pointer automation did not model.
- Immutable analyzer provenance remains separate from user-owned timing and chord
  corrections.
- Pure chord-chart and tempo-map modules support fast focused tests while browser
  tests cover integration.
- Experiments use bounded gates, fixed holdouts, explicit limitations, and stop
  criteria instead of indefinite analyzer tuning.
- The current next task and its unresolved interaction contract are documented
  consistently.
- Test-created jobs are normally removed after verification, preserving a usable
  demo library.

### What Could Improve

- The backlog should be reviewed against the broader learning goal before more
  secondary feature refinement. The product owner will lead validation, but the
  technical backlog should prepare for that work rather than assume more features
  are automatically valuable.
- Current-context documents have accumulated too much chronological history.
  `STATUS.md` and `TASKS.md` duplicate evidence already available in tests,
  `CHANGELOG.md`, decisions, and Git history.
- `public/app.js` and `server.js` remain large integration files. The frontend is
  now the more immediate source of interaction complexity.
- The first token-optimization proposal depended on line numbers, test counts,
  stale signatures, and unmeasured savings.
- The required context recovery review has not been recorded despite more than
  three completed epics.
- Known local state includes one malformed `job.json`; its ownership and intended
  cleanup need resolution during grooming.
- One large mixed commit bundled the first optimization memo with unrelated
  research, screenshots, video, and tooling under a vague message. Focused
  planning commits should remain reviewable and reversible.

### Start

- Measure representative AI tasks before changing context or code structure.
- Condense current context and archive historical task and verification detail.
- Add a compact, stable code map without line numbers or test totals.
- Give new tasks symbol-based file anchors, preserved contracts, non-goals, and
  focused/full verification commands.
- Extract frontend timeline state at the next active seam if it can be isolated
  safely.
- Add JSDoc typedefs at persisted-state, analysis, and API boundaries.
- Perform the overdue context recovery review after documentation is condensed.
- Prepare a technically stable handoff for product-owner-led piano-player testing.

### Continue

- Build and verify complete mock and real user journeys.
- Preserve immutable analyzer output and user-owned corrections.
- Use focused tests during development and full regression suites at completion.
- Require human listening and real-device gates where automation is not
  representative.
- Keep experiments bounded and retain honest records of known harmonic limits.
- Delete test-created jobs and maintain outcome-oriented changelog entries.

### Stop

- Stop maintaining volatile line numbers, test totals, or current implementation
  details in automatically loaded context.
- Stop appending permanent verification history to the current-status snapshot.
- Stop claiming token savings without a repeatable baseline.
- Stop using synthetic input alone as evidence for real hardware behavior.
- Stop combining unrelated planning, media, and tooling in one commit.
- Stop duplicating the same completion narrative across every project document.
- Stop assuming that another implementation phase is more valuable than backlog
  review or product-owner-led validation.

### Resulting Actions

- Revised `AI_TOKEN_OPTIMIZATION.md` into a measurement-first plan.
- Added provisional, technically sequenced work packages to `TASKS.md`.
- Paused implementation pending backlog grooming and sprint planning with the
  product owner.
