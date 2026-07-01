# AGENTS.md

## Mission

Your mission is **not** to build the perfect music application.

Your mission is to answer one product question:

> Can AI transform a simple screen recording of a song into a significantly better piano learning experience?

The prototype should enable a human to evaluate this question.

Whenever tradeoffs arise, optimize for **learning**, not completeness.

---

## Product hypothesis

The hypothesis is:

> A musician can learn the piano part of a song faster by using an AI-assisted workflow than by using the original recording alone.

This hypothesis **cannot** be validated by implementation alone.

Your responsibility is to build a prototype suitable for validating it.

---

## Engineering goal

Build an end-to-end prototype where a user can:

1. Select a screen recording from Photos on iOS.
2. Upload it to a backend.
3. Wait for processing.
4. Listen to an isolated piano stem.
5. Slow it down.
6. Loop difficult passages.
7. View approximate harmonic information.

Do not optimize beyond what is necessary for this experience.

---

## Target development setup

Assume this project is developed with:

- A MacBook M3 for iOS/Xcode/Codex IDE work.
- Codex Cloud for planning, backend implementation, documentation, and non-Xcode tasks.
- A backend that can run locally and, where practical, in cloud development environments.
- Heavy ML behind a switchable pipeline mode so the project remains demoable even when ML dependencies are unavailable.

Use:

```text
PIPELINE_MODE=mock
PIPELINE_MODE=real
```

The application must remain useful in `mock` mode.

---

## Engineering Definition of Done

The prototype is considered complete when another developer can follow `DEMO.md` and successfully:

- choose a screen recording
- process it
- hear the isolated piano
- switch playback speed
- loop a passage
- view harmonic information

without developer intervention.

---

## Product Validation Goal

This project is **not** product-validated until it has been demonstrated to real users.

Codex cannot determine product success.

Instead, prepare the prototype for answering this question:

> Does this workflow help piano players learn songs faster than their existing approach?

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

- screen recording audio quality is sufficient
- piano stems can be isolated accurately enough from compressed screen-recording audio
- Basic Pitch or another transcription tool produces usable MIDI from the isolated piano stem
- harmonic analysis remains useful despite imperfect transcription
- processing time is acceptable for interactive use
- local backend is practical during development
- the iOS import/upload flow is not too much friction for a user

Each assumption should have:

- confidence
- evidence
- remaining uncertainty

---

## Domain-specific risks

Maintain domain risks in `RISKS.md`.

At minimum, consider:

- Poor stem separation quality when the source is screen-recorded, compressed, noisy, or mixed.
- Piano leakage into `other`, `guitar`, or `vocals` stems.
- Basic Pitch producing inaccurate MIDI for dense polyphonic piano.
- Chord detection being wrong or misleading when the recording has weak harmonic information.
- CPU-only processing being too slow for a convincing demo.
- iOS Photos permissions, large video uploads, and App Transport Security friction.
- Copyright and user expectations around processing commercial recordings.

For each significant risk, document:

- likelihood
- impact
- mitigation
- current status

Reduce the highest-risk items as early as practical.

---

## Planning

Before implementation, create:

```text
VISION.md
ARCHITECTURE.md
TASKS.md
RISKS.md
DECISIONS.md
STATUS.md
DEMO.md
```

Implementation starts only after these exist.

---

## Task planning

Break work into epics.

Every epic must produce something demonstrable.

Examples:

- User can upload a video.
- User receives isolated piano audio.
- User can practise using slowed playback.
- User can see approximate harmonic information.

Each epic should reduce technical uncertainty or improve the demo.

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

Do not always use the largest model.

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

Document every model switch in `STATUS.md`.

---

## Context management

Treat context as limited.

Do not depend on conversation history.

Instead maintain:

```text
STATUS.md
TASKS.md
DECISIONS.md
```

A new Codex session should be able to continue using only these files together with `ARCHITECTURE.md`.

---

## Context Recovery Test

After approximately three completed epics, perform a recovery test.

Start a fresh Codex session.

Provide only:

- `STATUS.md`
- `TASKS.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`

The new session must correctly explain:

- current architecture
- completed work
- remaining work
- next recommended task

If this fails, improve documentation before continuing.

---

## Decision log

Every irreversible decision must be documented in `DECISIONS.md`.

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

1. selecting one coherent task from `TASKS.md`
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
- updated documentation
- demo guide
- known limitations
- recommended next steps

Finally produce a short assessment answering:

- Which technical assumptions were validated?
- Which assumptions remain uncertain?
- Is the prototype suitable for user testing?
- What should be built next?
