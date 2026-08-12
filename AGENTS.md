# AGENTS.md

## Repository layout

```text
server.js, demucs-command.js, timing-analysis.js   backend entry points
public/                                            browser client and shared modules
scripts/  tests/  benchmarks/                      tooling, tests, benchmark harness
docs/planning/                                     TASKS, STATUS, DECISIONS, RISKS — the working set
docs/engineering/                                  ARCHITECTURE and behavioral contracts
docs/product/                                      VISION, design brief, ideas
docs/research/                                     dated investigations
docs/archive/                                      frozen history, do not edit
assets/                                            screenshots referenced by the docs
```

`docs/README.md` is the full documentation map. Paths in this file are
repo-relative.

---

## Mission

Your mission is **not** to build the perfect music application.

Your mission is to answer one product question:

> Can AI transform a recording of a song into a significantly better way for a band member to learn their part in a cover?

The prototype should enable a human to evaluate this question.

Whenever tradeoffs arise, optimize for **learning**, not completeness.

The target user is any member of a band playing covers — keys, guitar, bass,
drums, or vocals. The product was originally scoped to piano only; that changed
on 2026-08-08 (`docs/planning/DECISIONS.md` Decision 34). Piano remains a useful
concrete example, never the only one.

---

## Product hypothesis

The hypothesis is:

> A musician can learn their own part of a song faster by using an AI-assisted workflow than by using the original recording alone.

This hypothesis **cannot** be validated by implementation alone.

Your responsibility is to build a prototype suitable for validating it.

---

## Engineering goal

Build an end-to-end prototype where a user can:

1. Select a recording they hold, or stems they have already separated elsewhere.
2. Upload it to a backend.
3. Wait for processing.
4. Listen to separated stems, at minimum drums, bass, guitar, and piano in the POC.
5. Choose which part is theirs.
6. Mute and unmute individual stems, especially their own, so the user can practise playing or singing that part themselves against the rest of the arrangement.
7. Solo any stem to study a part they are learning.
8. Slow playback down.
9. Loop difficult passages.
10. View approximate harmonic information.

Do not optimize beyond what is necessary for this experience.

The first prototype may use a web/local uploader instead of a native iOS app.
Native iOS should be deferred until the web POC demonstrates enough value to justify
the setup cost, unless a core assumption specifically requires native Photos access.

The source material is whatever the user already holds. Do not build features
that acquire audio from streaming services, and do not describe the product as a
workflow for capturing them. See
`docs/research/source-legality-and-legal-posture.md`.

Approximate harmonic information means, at minimum, useful learning cues such as:

- detected key
- concrete chord names over time
- roman-numeral chord labels relative to the key

Note-level transcription and melody extraction are explicitly out of scope. A
part is learned by soloing its stem; the chord chart exists because harmony is
the thing that is *not* recoverable by ear.

---

## Target development setup

Assume this project is developed with:

- A MacBook M3 for iOS/Xcode/Codex IDE work.
- Codex Cloud for planning, backend implementation, documentation, and non-Xcode tasks.
- A backend that can run locally and, where practical, in cloud development environments.
- Heavy ML behind a switchable pipeline mode so the project remains demoable even when ML dependencies are unavailable.

For any local macOS task expected to run long enough for idle sleep to interfere:

1. Start one `caffeinate -i` subprocess before the task begins.
2. Record its PID and reuse that process for the entire task.
3. Do not start another `caffeinate` process during the task.
4. When the task finishes, pauses for user input, or is cancelled, terminate the recorded PID.
5. Verify that the process has exited before ending the work session.
6. Never leave a `caffeinate` process running after the session ends.

Use:

```text
PIPELINE_MODE=mock
PIPELINE_MODE=real
```

The application must remain useful in `mock` mode.

`PIPELINE_MODE=mock` must simulate a realistic backend so the whole product can be
developed and demonstrated without depending on:

- Demucs
- Basic Pitch
- GPU availability
- FFmpeg
- long processing times
- large test files

Mock mode should still exercise the real product flow: upload, job creation, job
status transitions, processed stem playback, stem mute/unmute and solo, speed changes,
looping, and harmonic metadata display.

`PIPELINE_MODE=real` should replace mock subsystems gradually. Basic Pitch is only
an example transcription option, not a committed choice.

Demo media should be replaceable. Include or generate a small default test asset
when practical, but document copyright and source limitations.

---

## Engineering Definition of Done

The prototype is considered complete when another developer can follow `docs/engineering/DEMO.md` and successfully:

- choose a recording
- process it
- hear separated mock stems for drums, bass, guitar, and piano
- mute and unmute stems, including muting one stem for play-along practice
- solo a stem to study that part
- switch playback speed
- loop a passage
- view harmonic information

without developer intervention.

For every implementation or verification task, delete all songs/jobs created
during testing before considering the task complete. Test-created library entries
create noise for the next iteration; keep only intentional demo, fixture, or
calibration jobs that are explicitly documented.

This rule applies to manual browser sessions, scripts, and probes against a
locally started server. The automated suites are isolated and do not need
cleanup: `npm test` uses temporary data directories, and `npm run test:gui` runs
its server against a temporary `DATA_DIR` created per run.

---

## Product Validation Goal

This project is **not** product-validated until it has been demonstrated to real users.

An AI agent cannot determine product success.

Instead, prepare the prototype for answering this question:

> Does this workflow help band members learn their parts faster than their existing approach?

Do not attempt to infer this answer yourself.

---

## Working principles

### Build vertically

Always deliver complete user journeys.

Avoid building isolated technical layers.

Preferred progression:

```text
Select video
↓
Upload
↓
Mock processing
↓
Real processing
↓
Improve quality
```

Never leave the application permanently half-integrated.

---

### Replace mocks gradually

The application should remain demonstrable throughout development.

Replace one subsystem at a time.

Example:

```text
mock upload
↓
real upload
↓
mock stems
↓
real stems
↓
mock MIDI
↓
real MIDI
```

---

### Simplicity wins

Prefer the simplest solution that enables the demo.

Avoid optimization unless measurements indicate a problem.

---

## Git workflow

At the start of each iteration, inspect `git status`.

If the worktree contains uncommitted changes from a completed previous task, verify them, update documentation as needed, and commit them before starting a new task.

Do not automatically commit ambiguous, broken, or experimental changes. If changes appear to be user edits or incomplete work, inspect them and either integrate them into the current task or ask before committing.

Each completed iteration should normally end with:

1. relevant verification
2. a `CHANGELOG.md` update when the iteration changes user-visible behavior, developer setup, APIs, persisted data, or other noteworthy capabilities
3. other documentation updates
4. a focused git commit

Avoid accumulating multiple unrelated tasks in one dirty worktree.

### Changelog maintenance

`CHANGELOG.md` is the curated, audience-facing history of what was added, changed, fixed, or removed. It is not a copy of `docs/planning/TASKS.md`, `docs/planning/STATUS.md`, or the Git log.

For every completed implementation iteration:

- add concise entries under `Unreleased` in the same focused commit as the implementation
- describe user-visible or developer-visible outcomes rather than internal coding steps
- use `Added`, `Changed`, `Fixed`, and `Removed` headings as applicable
- use `docs/planning/TASKS.md`, `docs/planning/STATUS.md`, commit messages, and the actual diff as source material, but verify the final wording against implemented behavior
- do not include planned or incomplete work
- do not add entries for routine formatting, planning-only edits, or internal refactors unless they materially affect setup, APIs, compatibility, performance, or future development

When a coherent demo or user-test checkpoint is declared, move the relevant `Unreleased` entries into a dated milestone section. Numbered semantic versions are not required during the POC unless releases begin to use them.

---

## Architecture

Before implementation, evaluate alternative solutions **only for major irreversible decisions**.

Major decisions include:

- overall architecture
- client/server split
- ML pipeline
- storage strategy

For each alternative document:

- advantages
- disadvantages
- implementation effort
- technical risk
- expected demo quality

Recommend one.

Explain why the others were rejected.

Do **not** repeat architecture comparisons for routine implementation decisions.

---

## Critical assumptions

The project depends on validating several technical assumptions.

Track these explicitly.

Examples include:

- user-supplied recording audio quality is sufficient
- every stem can be isolated accurately enough to be both removed and studied in isolation
- harmonic analysis remains useful despite imperfect separation
- processing time is acceptable for interactive use
- local backend is practical during development
- the import/upload flow is not too much friction for a user
- users can supply stems they separated elsewhere when the pipeline's own quality is insufficient

Each assumption should have:

- confidence
- evidence
- remaining uncertainty

---

## Domain-specific risks

Maintain domain risks in `docs/planning/RISKS.md`.

At minimum, consider:

- Poor stem separation quality when the source is compressed, noisy, or densely mixed.
- Cross-stem leakage in any direction, since every stem is now both removed and studied.
- Chord detection being wrong or misleading when the recording has weak harmonic information.
- CPU-only processing being too slow for a convincing demo.
- iOS Photos permissions, large video uploads, and App Transport Security friction.
- Copyright, source legality, and user expectations around processing commercial recordings.

For each significant risk, document:

- likelihood
- impact
- mitigation
- current status

Reduce the highest-risk items as early as practical.

---

## Environment, skills, and dependency management

The project must be reproducible without relying on hidden agent state.

Codex may use available Codex skills when they are directly relevant, but the project must not depend on custom skills being present.

If a skill is used, document it in `docs/planning/STATUS.md` with:

- skill name
- purpose
- result
- whether the work can be reproduced without the skill

Do not create new Codex skills during the POC unless the same workflow has been repeated at least twice and packaging it clearly reduces future work.

Project dependencies must be explicit and version-controlled.

Use:

- `pyproject.toml` or `requirements.txt` for Python dependencies
- `package.json` for JavaScript/TypeScript dependencies
- setup scripts or Dockerfile for system dependencies such as FFmpeg

Separate lightweight mock-mode dependencies from heavy real-pipeline dependencies.

The default setup must support `PIPELINE_MODE=mock` without installing heavy ML dependencies such as Demucs, Torch, TensorFlow, or Basic Pitch.

Real pipeline dependencies should be installed only through an explicit setup command, for example:

    pip install -e ".[real]"

or:

    pip install -r requirements-real.txt

Before adding a new dependency, evaluate:

1. Is it needed for the demo?
2. Is it needed for mock mode or only real mode?
3. Is there a lighter alternative?
4. Does it introduce platform, GPU, license, or install-time risk?
5. Can the feature be mocked first?

Document significant dependency choices in `docs/planning/DECISIONS.md`.

If a dependency cannot be installed in the current environment, do not block the project. Keep mock mode working, document the limitation, and continue with tasks that can still be completed.

Dependency, platform, and installation risks must be tracked in `docs/planning/RISKS.md`.

---

## Planning

Before implementation, create:

```text
docs/product/VISION.md
docs/engineering/ARCHITECTURE.md
docs/planning/TASKS.md
docs/planning/RISKS.md
docs/planning/DECISIONS.md
docs/planning/STATUS.md
docs/engineering/DEMO.md
```

Implementation starts only after these exist.

---

## Task planning

Break work into epics.

Every epic must produce something demonstrable.

Examples:

- User can upload a video.
- User receives separated stems and can choose which one is their part.
- User can mute their own stem and practise using slowed playback.
- User can see approximate harmonic information.

Each epic should reduce technical uncertainty or improve the demo.

### Task contract shape

Use this compact shape for tasks written into `docs/planning/TASKS.md`:

```md
### Task: Short title

Problem:
- Observable user or engineering failure, why it matters, and who it affects.

Evidence:
- Measurements, observations, or prior results that show the problem exists.
- Separate known evidence from assumptions that still need testing.

Hypothesis:
- Falsifiable explanation of what may improve the outcome and why.

Test strategy:
- Baseline, isolated change, evaluation data, and comparison needed to test the
  hypothesis.

Decision rule:
- Evidence required to retain, adjust, stop, or escalate the proposed change,
  and exactly what a passing result authorizes.

Files and symbols:
- `path/to/file`: `relevantSymbol`

Goal:
- User or engineering outcome.

Contracts to preserve:
- State, API, provenance, and interaction invariants.

Non-goals:
- Nearby behavior that must remain out of scope.

Verify:
- Focused test
- Full regression suite
- Required human or hardware gate

Result and learning (complete only after execution):
- Whether the hypothesis was supported, the evidence produced, and the next
  decision it enables.
```

---

## Work ownership and GitHub issues

GitHub Issues are the source of truth for executable work. `docs/planning/TASKS.md` keeps the
roadmap, work-package dependencies, and durable task contracts; `docs/planning/STATUS.md` keeps
only the current issue pointers and blocking state.

Every open issue must carry exactly one ownership label:

- `owner:agent` for work an AI agent can execute autonomously
- `owner:per` for a product-owner action or decision
- `owner:shared` when the agent prepares evidence and Per reviews or decides

The ownership split is between AI and product owner. It does not record which
model or tool executed the work; Codex, Claude, and any later agent all use
`owner:agent`.

Use `state:ready`, `state:waiting`, and `state:deferred` to distinguish current
work from queued or intentionally parked work.

Human review must never be buried inside implementation prose:

- create an `owner:per` issue only when its review packet is ready
- keep at most one `owner:per` issue in `state:ready`
- state exactly what to inspect, the steps, requested answer, pass/fail meaning,
  and what the answer unblocks
- historical, superseded, and future review notes do not belong in the active
  human queue

Every meaningful handoff should state:

```text
Completed by the agent:
- ...

Your action now:
- None
```

or link one ready human issue and give its required response format.

---

## Prioritization

Always prioritize in this order:

1. Learning value
2. Demo quality
3. Risk reduction
4. Simplicity
5. Implementation effort
6. Future scalability

Document whenever you intentionally violate this order.

---

## Roles

Use as few specialized agents as possible.

### Architect

Responsibilities:

- planning
- architecture
- tradeoffs
- difficult debugging
- final review

Use the strongest reasoning model available.

---

### Builder

Responsibilities:

- implementation
- refactoring
- integration
- documentation

Use a standard coding model.

---

### Reviewer

Responsibilities:

- testing
- documentation review
- edge cases
- demo readiness

Prefer a cheaper or faster model.

Escalate only if blocked.

Avoid unnecessary additional specialist agents.

---

## Model strategy

This session should keep using high or extra-high reasoning.

Do not always use the largest model for delegated work.

Use strongest reasoning for:

- architecture
- difficult debugging
- important refactors
- final review

Use cheaper models for:

- repetitive coding
- documentation
- formatting
- routine tests

Simple tasks should be delegated to agents using simpler models when practical.

Document every model switch, delegation, or agent use in `docs/planning/STATUS.md`.

---

## Context management

Treat context as limited.

Do not depend on conversation history.

Instead maintain:

```text
docs/planning/STATUS.md
docs/planning/TASKS.md
docs/planning/DECISIONS.md
```

A new agent session should be able to continue using only these files together with `docs/engineering/ARCHITECTURE.md`.

---

## Context Recovery Test

After approximately three completed epics, perform a context recovery review.

Preferred method:

Start a fresh agent session and provide only:

- `docs/planning/STATUS.md`
- `docs/planning/TASKS.md`
- `docs/planning/DECISIONS.md`
- `docs/engineering/ARCHITECTURE.md`

The new session must correctly explain:

- current architecture
- completed work
- remaining work
- next recommended task

If starting a fresh session is not practical, perform a simulated recovery review in
the current session using only the same files as source material.

In that case:

- explicitly state that it is a simulated recovery review
- do not rely on prior conversation history
- cite the relevant project files used
- identify any missing or ambiguous information
- update the documentation before continuing if the review fails

The review passes only if the project can be understood and continued from those
files alone.

Use this output format:

```text
## Context Recovery Review Result

Type: Simulated or Fresh Session

Files used:
- docs/planning/STATUS.md
- docs/planning/TASKS.md
- docs/planning/DECISIONS.md
- docs/engineering/ARCHITECTURE.md

Summary:
- Current architecture: ...
- Completed work: ...
- Remaining work: ...
- Next recommended task: ...

Gaps found:
- ...

Result:
PASS or FAIL
```

---

## Decision log

Every irreversible decision must be documented in `docs/planning/DECISIONS.md`.

Use this template:

```text
Decision:

Reason:

Alternatives considered:

Tradeoffs:

Confidence:

Date:
```

Examples of decisions that require logging:

- ML framework
- stem separation engine
- API structure
- storage format
- client/server split
- processing strategy

Routine coding decisions do not require logging.

---

## Iteration strategy

An iteration is defined as:

1. selecting one coherent task from `docs/planning/TASKS.md`
2. implementing it
3. running appropriate verification
4. updating project documentation
5. selecting the next task

Maximum ten iterations before stopping for human review.

Stop earlier if the Engineering Definition of Done has been achieved.

Do not continue polishing indefinitely.

---

## Verification

Every completed task should include appropriate verification.

Examples:

- unit tests
- integration tests
- manual demo
- performance measurement
- screenshot or video proof where appropriate

Do not assume code works because it compiles.

---

## Human review

Pause development and request review whenever:

- the architecture should change significantly
- an assumption is disproven
- implementation exceeds planned complexity
- another library appears substantially better
- the remaining work no longer aligns with the original hypothesis

---

## Final delivery

The final deliverable should contain:

- working prototype
- updated changelog
- updated documentation
- demo guide
- known limitations
- recommended next steps

Finally produce a short assessment answering:

- Which technical assumptions were validated?
- Which assumptions remain uncertain?
- Is the prototype suitable for user testing?
- What should be built next?
