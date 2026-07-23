# TASKS.md

## Next Task

Complete Chord Reliability task CR0: lock the validation contract, new
development/holdout data, target screen-recording scenarios, reference process,
metrics, and “good enough” thresholds described in
`research/chord-reliability-validation-plan.md`.

## Purpose

This file is the chronological execution plan for the POC. Completed work appears in implementation order, followed by future work in the order it should be attempted.

Phase IDs are preserved because they identify the subsystem where work belongs. They are not expected to be numerically increasing when a later iteration returns to an earlier subsystem; for example, Phase 2I was completed after Phase 5C.

Unscheduled, conditional, or temporarily parked work lives in `IDEAS.md`. Moving an item there does not reject it; it means the item has no committed place in the current execution sequence.

## Prioritization Order

1. Learning value
2. Demo quality
3. Risk reduction
4. Simplicity
5. Implementation effort
6. Future scalability

## Committed Chord Reliability Validation Gate

Product-owner decision on 2026-07-23:

- reliable chord analysis is a core capability alongside useful stem separation;
- current chord quality is not yet validated as good enough;
- prove or disprove chord reliability before resuming unrelated feature work;
- use the bounded research and milestone contract in
  `research/chord-reliability-validation-plan.md`;
- retain editable charts and immutable analyzer provenance throughout.

The tasks below are in committed priority order. A task may stop the sequence at
its milestone gate. Do not skip directly to automatic repeat detection or combine
several unproven heuristics in one experiment.

### CR0: Lock the chord-reliability validation contract

Files and symbols:
- `research/chord-reliability-validation-plan.md`: Evaluation contract and
  Milestone 0
- `scripts/chord-benchmark-lib.js`: existing RWC adapter and metrics contract
- `scripts/benchmark-chords.js`: benchmark CLI
- `benchmarks/README.md`: corpus and artifact instructions

Goal:
- Freeze a new development/holdout split, target screen-recording scenarios,
  reference-review process, metrics, artifact paths, and “good enough” thresholds
  before analyzer behavior changes.

Contracts to preserve:
- The consumed Phase 2J holdout remains fixed and unavailable for tuning.
- Corpus audio and detailed run artifacts stay outside Git and outside
  application jobs.
- Reference/corrected timing and end-to-end timing are reported separately.

Non-goals:
- Analyzer tuning.
- New UI.
- Automatic section detection.

Verify:
- Manifest checksum and selected-track availability checks.
- Reference interval validation.
- Dry-run commands do not create library jobs.
- Human approval of target recordings, scenarios, and thresholds.

Milestone:
- Milestone 0 passes exactly as defined in the research plan.

Status: Next implementation/research task.

### CR1: Add evidence diagnostics and failure fixtures

Files and symbols:
- `server.js`: `analyzeHarmonyFromAudio`, `chromaEvidenceForBar`,
  `pitchClassEnergyDetails`
- `scripts/generate-phase2a-test-media.js`: generated known-answer media
- `scripts/chord-benchmark-lib.js`: diagnostic result adapters
- `tests/harmony-analysis.test.js`: known-answer analysis coverage

Goal:
- Expose per-beat, per-source chroma, low-note candidates, bass reliability,
  persistence/chordality features, raw candidate scores, and the evidence that
  changed the winner without changing public chord output.
- Add fixtures for vocal melody, no dedicated bass, piano/guitar bass fallback,
  ornaments, repeated accompaniment with different melodies, and a legitimate
  repeated-section variation.

Contracts to preserve:
- Mock mode remains dependency-light.
- Public analyzer output and immutable provenance remain unchanged.
- Diagnostics stay in benchmark artifacts unless a later task explicitly
  defines a bounded persisted subset.

Non-goals:
- Changing stem weights or chord labels.
- Product-facing diagnostic UI.

Verify:
- Semantic before/after analyzer-output comparison.
- Focused fixture tests.
- Current full-mix and Demucs-assisted baselines.
- Review of dominant error classes before CR2.

Milestone:
- Milestone 1 passes.

Status: Planned after CR0.

### CR2: Validate accompaniment-first melody suppression

Files and symbols:
- analyzer module containing `loadAnalysisStemAudios`,
  `chromaEvidenceForBar`, and `estimateChord` after the smallest justified
  extraction from `server.js`
- `tests/harmony-analysis.test.js`
- chord benchmark scripts and result report

Goal:
- Make stable comp instruments primary chord-quality evidence, prevent vocal or
  melody-like evidence from independently creating chord labels or boundaries,
  and make full mix a reliability-gated fallback.

Contracts to preserve:
- Bass evidence remains separate from chord-quality evidence.
- Full mix remains available when separation is missing or unreliable.
- Every tested variant is individually selectable and benchmarked.

Non-goals:
- Bass fallback changes.
- Ornament persistence changes.
- Repeated-section pooling.

Verify:
- Melody-heavy generated fixtures.
- New locked development gate, then untouched holdout only after it passes.
- Target screen-recording listening/chart review.
- False-extra and missing-change comparison.

Milestone:
- Milestone 2 passes or the project follows its external-analyzer comparison
  escape rule.

Status: Planned after CR1.

### CR3: Validate bass fallback and ornament-resistant comp evidence

Files and symbols:
- harmony analyzer: bass reliability, lowest-persistent-note fallback, subframe
  persistence, and robust comp aggregation
- `tests/harmony-analysis.test.js`
- chord benchmark scripts and result report

Goal:
- Use dedicated bass only when reliable; otherwise derive confidence-weighted
  bass evidence from the lowest reliable persistent note in non-melodic comp
  stems. Make stable chord tones outweigh brief ornaments without deleting real
  short chords.

Contracts to preserve:
- Lowest note is evidence, never a forced root.
- Inversions remain valid.
- Vocal, lead-melody, and drum stems are excluded from default bass fallback.
- H2 and H3 are evaluated independently before their accepted changes combine.

Non-goals:
- Slash-chord display or broad vocabulary expansion.
- Repetition-aware analysis.

Verify:
- No-bass, inversion, pedal-tone, passing-bass, ornament, and genuine-short-chord
  fixtures.
- Bass-present and no-bass scenario metrics.
- Locked development/holdout and target-domain review.

Milestone:
- Milestone 3 passes.

Status: Planned after CR2.

### CR4: Validate repeated-section evidence pooling with known groups

Files and symbols:
- chord benchmark manifest: reference repeat-group contract
- harmony analyzer: robust evidence pooling before final scoring
- `public/section-ranges.js`: preserve user-owned Flat Section semantics
- focused harmony and benchmark tests

Goal:
- Pool corresponding raw evidence across manually/reference-grouped repeated
  section instances and preserve strongly supported local variations.

Contracts to preserve:
- Do not copy the first section's labels.
- Do not silently alter user-owned Flat Sections or chord charts.
- Repeat grouping and analyzer provenance remain distinguishable.

Non-goals:
- Automatic repeat detection.
- Linked-section editing.

Verify:
- Repeated-melody and legitimate-variation fixtures.
- Known-group accuracy, repeat disagreement, false forced equality, and correction
  burden.
- Locked development/holdout results.

Milestone:
- Milestone 4 passes; failure ends repetition work for this POC.

Status: Planned after CR3.

### CR5: Evaluate automatic repeat suggestions

Entry condition:
- CR4 passed.

Files and symbols:
- new pure structure-analysis module for beat-synchronous self-similarity and
  equal-length repeat candidates
- benchmark repeat-group evaluator
- backend provenance contract
- browser confirmation flow only if offline evaluation first passes

Goal:
- Recover enough of the known-group benefit automatically to justify a
  reviewable repeated-section suggestion flow.

Contracts to preserve:
- Suggestions never mutate user timing, Flat Sections, or chord charts silently.
- Strong local variations remain independent.

Non-goals:
- General hierarchical form analysis.
- Automatic verse/chorus naming.

Verify:
- Repeat-group precision/recall.
- Retained chord benefit versus known groups.
- False grouping and missed-variation review.
- Human confirmation-flow check on representative songs.

Milestone:
- Milestone 5 passes.

Status: Conditional on CR4.

### CR6: Integrated chord-reliability checkpoint

Files and symbols:
- benchmark reports and aggregate checkpoint
- `CHORD_ANALYSIS_STRATEGY.md`
- `STATUS.md`, `RISKS.md`, `DECISIONS.md`, and `DEMO.md`

Goal:
- Run the best independently validated changes together and make an explicit
  GO, ADJUST ONCE, COMPARE/REPLACE, or STOP/REFRAME decision.

Contracts to preserve:
- Automatic analysis remains immutable suggestion provenance.
- The user's working chart remains authoritative.
- Passing technical metrics does not claim product validation.

Non-goals:
- Continuing to tune after the declared terminal decision.
- Resuming the feature backlog without recording the gate result.

Verify:
- Target-domain holdout and grouped metrics.
- Runtime and memory measurement.
- Three-minute-song correction-time review.
- Human chart-usability assessment.
- Full mock/real regressions and cleanup of all test-created jobs.

Milestone:
- Milestone 6 closes the gate and selects the next project direction.

Status: Planned after the last entered experimental milestone.

## Deferred Work Packages

The product-owner decision above completes the previous grooming choice. The
packages below remain useful, but are deferred until CR6 or an earlier terminal
decision closes the chord-reliability gate.

These packages group the existing backlog by technical dependency, risk, and
reversibility. Their order is deliberately technical-first at the product owner's
request and temporarily departs from the default prioritization order above.

Do not start implementation from this list while the chord-reliability gate is
active.

### WP0: Backlog Grooming and Sprint Planning

Purpose:
- Review completed capability, known risks, current evidence, and remaining
  feature ideas from the broader product perspective.
- Decide which work is necessary before product-owner-led piano-player testing.
- Select one bounded sprint and explicitly defer or park the rest.

Inputs:
- `RETROSPECTIVES.md`
- `AI_TOKEN_OPTIMIZATION.md`
- current planned phases in this file
- `RISKS.md`, `STATUS.md`, and `IDEAS.md`

Output:
- one agreed sprint goal
- selected tasks with symbol-based file anchors, preserved contracts, non-goals,
  verification, and human gates
- explicit deferred and conditional work

Status: Superseded by the committed Chord Reliability Validation Gate; retain as
historical grooming context.

### WP1: AI Execution Baseline and Context Foundations

Technical rationale:
- Measurement must precede optimization.
- Smaller current-context documents and stable routing information reduce repeated
  exploration for every later package.
- This is documentation and process work with low runtime regression risk.

Tasks:
1. Capture comparable frontend, backend/analysis, and documentation task baselines
   using the metrics in `AI_TOKEN_OPTIMIZATION.md`.
2. Condense `STATUS.md` to current state and move dated verification history to an
   archive.
3. Keep active and near-future work in `TASKS.md`; archive completed phase detail
   without losing traceability.
4. Add a compact stable codebase quick reference to `AGENTS.md`, excluding line
   numbers, fixed test totals, and volatile current state.
5. Adopt the symbol-based task contract from `AI_TOKEN_OPTIMIZATION.md`.
6. Perform and record the required simulated or fresh context recovery review.
7. Repeat comparable task samples after the changes and retain only improvements
   that preserve quality.

Dependencies:
- WP0 chooses the baseline tasks and decides whether this is part of the first
  sprint or a short enabling package.

Status: Proposed.

### WP2: Timeline Input Correctness and Frontend Seam

Technical rationale:
- Phase 3G.2A contains a known real-hardware failure and conflicting input paths.
- Timeline viewport, Follow, seek, pan, zoom, touch, and timing-marker behavior
  share state inside the largest integration file.
- Correctness should be established before further transport or Harmony gestures
  build on the same interaction surface.

Tasks:
1. Implement the Phase 3G.2A contract in
   `TIMELINE_INTERACTION_CONTRACT.md`.
2. Centralize viewport mutation and input arbitration.
3. Extract timeline viewport/input state from `public/app.js` only if the active
   change exposes a cohesive, testable seam; avoid a broad frontend rewrite.
4. Add focused tests around the extracted contract plus full browser regression
   coverage.
5. Pass the required real Mac trackpad and narrow-screen gates.

Dependencies:
- WP0 confirms this remains a pre-user-test blocker.
- WP1 baseline should capture this task before context or code organization is
  changed if practical.

Maps to:
- Phase 3G.2A.

Status: Proposed highest-priority runtime package.

### WP3: User-Test Readiness Stabilization

Technical rationale:
- This package closes visible transport and mobile interaction gaps without
  expanding the underlying song model.
- It creates a stable handoff for product-owner-led piano-player testing.

Tasks:
1. Complete Phase 5D.2 transport, keyboard, loop, and mobile Harmony cleanup.
2. Run the complete mock and real demo journeys using `DEMO.md`.
3. Resolve or explicitly preserve the malformed local `job.json` recorded in
   `STATUS.md`; do not delete ambiguous user data without approval.
4. Confirm clean test-job state, known demo fixtures, and reproducible setup.
5. Prepare a short user-test readiness note containing known limitations and
   suggested observation points, without inferring product success.

Dependencies:
- WP2 interaction correctness unless grooming explicitly accepts the current
  slider/`Fit` fallback for early testing.

Maps to:
- Phase 5D.2.
- Existing demo-readiness and cleanup requirements.

Status: Proposed.

### WP4: Boundary Contracts and Opportunistic Backend Modularization

Technical rationale:
- Shared data shapes are cheaper and safer to document before extracting backend
  modules.
- Broad refactoring of stable analysis or job code would add regression risk
  without improving the immediate user-test journey.

Tasks:
1. Add reusable JSDoc typedefs for practice state, timing events, chord events,
   analyzer metadata, waveform metadata, and job/API payloads.
2. Apply those types to exported and cross-module functions.
3. When harmonic analysis is next changed, extract beat and harmony analysis from
   `server.js` without rewriting algorithms.
4. When persistence is next changed, extract job storage/lifecycle operations
   from HTTP route wiring.
5. Measure whether each extraction reduces relevant exploration without
   increasing failed tests or rework.

Dependencies:
- WP1 establishes the measurement and task-contract method.
- Extraction tasks remain dormant until their subsystem is active.

Status: Proposed enabling/debt package; not a pre-user-test blocker by default.

### WP5: Evidence-Driven Feature Backlog

Technical rationale:
- Section resizing, chord multi-selection, copy/paste, and loop-from-selection
  build on interaction and state foundations from earlier packages.
- Implementing them before grooming or user evidence risks deepening secondary
  complexity.

Candidate tasks:
- Phase 5B.4 section resize handles and color coding
- Phase 5B.5 chord multi-selection
- Phase 5B.6 chord copy/paste and loop from selection
- parked ideas promoted by product-owner-led testing

Dependencies:
- WP2 and WP3 are stable.
- Backlog grooming or user evidence demonstrates that the capability improves the
  learning workflow enough to justify its interaction and persistence cost.

Status: Conditional; do not schedule as one large package.

## Task Contract for Newly Groomed Work

Use this compact shape for tasks selected from the work packages:

```md
### Task: Short title

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
```

## Completed Work — Chronological

### 1. Initial Mock Vertical Slice and Phase 0 Demo Closure

Completed: 2026-07-05

Outcome:
- A user can select media, create a mock processing job, wait for realistic progress, and open a practice result.
- The result exposes piano plus drums, bass, and guitar or a combined accompaniment fallback.
- Synchronized playback, stem mute/solo/volume, speed, looping, and approximate harmonic cues work in mock mode.
- The backend persists jobs and serves generated or local demo stem assets.

Verification:
- `npm test`
- `npm run test:gui`

Status: Complete for automated verification. Subjective musical usefulness still requires human evaluation.

### 2. Phase 1: Processed Song Library and Saved Practice State

Completed: 2026-07-05

Outcome:
- Completed jobs remain available as reusable songs.
- Per-song playback speed, loop, learning status, stem state, and last position persist.
- Songs can be reopened, renamed, and deleted.

Status: Complete in mock mode.

### 3. Phase 1B: Unified Song Workspace

Completed: 2026-07-06

Outcome:
- Uploads, active jobs, failures, and completed songs share one primary list.
- Desktop keeps the list beside song detail; mobile uses a list-first stack.
- Whole-row selection, learning-status filtering, activity time, duration, and selected-song actions are integrated.

Status: Complete in mock mode.

### 4. Phase 2A–2G and 2G-QA: First Real Pipeline and Separation Bakeoff

Completed: 2026-07-06

Sequence delivered:
1. Defined a narrow, replaceable real-pipeline spike and generated safe test media.
2. Added real multipart upload and persistent source storage.
3. Added FFmpeg PCM extraction and practice-compatible results.
4. Added a piano-focused separation spike.
5. Compared FFmpeg spectral separation with Demucs `htdemucs_6s`.
6. Selected Demucs as the real-mode default while retaining the lightweight FFmpeg fallback.

Human evidence:
- On `MakeYouFeelMyLovePart2.mov`, piano removal was accepted as useful enough for the POC play-along workflow.
- Solo-piano crackle, leakage, and broader song coverage remain risks rather than validated quality claims.

Status: Complete for the technical spike and initial human listening gate.

### 5. Phase 2H: First Real Harmonic-Analysis Spike

Completed: 2026-07-06; hardened 2026-07-07

Outcome:
- Real mode derives tempo, meter, downbeat, bar/beat grid, key, chord names, roman numerals, confidence, and source notes from real audio.
- Full mix is primary; bass and harmonic stems provide supporting evidence when useful.
- Beat-aware cues may contain multiple changes inside a bar and preserve repeated labels across bar boundaries.
- Analyzer output is explicitly approximate and stored as draft provenance.

Verification:
- Generated fixtures cover pre-roll/downbeat placement, multiple changes in 4/4, 3/4 at 90 BPM, and inversion bass.
- The optional local calibration fixture expects 106 BPM and `C, Dm, Am, Am, C, Dm, Am, Am`.

Status: Complete for automated calibration. Broader real-song inspection remains necessary.

### 6. Phase 3A–3F: Grid Calibration and Editable Compact Chord Chart

Completed: 2026-07-07

Sequence delivered:
1. Made the analyzed grid audible with a persisted metronome.
2. Added user correction for BPM, Bar 1, time signature, and key without changing analyzer provenance.
3. Added chord edit, add, delete, drag, and beat-boundary resize.
4. Replaced seconds-first edits with grid-first `practiceState.chordChart` events.
5. Made the user chart authoritative for Harmony display and roman numerals after the first edit.
6. Added compact 1/2/4/8-bars-per-row and name/roman display modes.

Status: Complete for automated verification. Manual calibration on varied real recordings remains open.

### 7. Process Review: Fragmentation Cleanup

Completed: 2026-07-07

Outcome:
- Reviewed runtime code, tests, documentation, compatibility paths, and worktree state.
- Found no high-value broad refactor; corrected stale documentation and retained intentional fallbacks.

Status: Complete; no runtime behavior changed.

### 8. Phase 4A: Single Grid-Snapped Practice Loop

Completed: 2026-07-08

Outcome:
- The single loop uses whole bars when a corrected grid exists.
- Count-in respects Bar 1 and repeats before every loop pass.
- Harmony shows a continuous loop range with draggable start/end handles and drag preview.
- Dense full-song timeline markers remain readable.

Status: Complete for automated verification. Real long-song listening remains useful.

### 9. Section-Structure Research

Completed: 2026-07-08

Outcome:
- Compared Flat, Assisted, and Linked Sections against the same 48-bar scenario.
- Selected Flat Sections as the first runtime model because edits remain local and predictable.
- Assisted suggestions remain compatible with the flat model; linked templates require a new arrangement/override model.

References:
- `research/section-structure-prototype-plan.md`
- `research/section-structure-prototype-results.md`

Status: Research complete.

### 10. Phase 5A: Runnable Flat Sections

Completed: 2026-07-08

Outcome:
- `practiceState.sections` stores independent bar ranges.
- Harmony renders section bands without changing chord edit scope.
- Sections can be added, edited, removed, and persisted.

Status: Complete in the mock-compatible UI.

### 11. Phase 5B.1–5B.3: Section Range Hygiene, Rendering, and Creation

Completed: 2026-07-08

Sequence delivered:
1. Shared frontend/backend normalization rejects overlapping sections while allowing adjacency.
2. Section and loop ranges render as continuous row chunks rather than repeated per-bar labels.
3. Users select bars directly before creating a section; symbol, label, and color are optional.
4. Section-info visibility persists and chord-card height stays stable across mixed rows.

Status: Complete for automated verification.

### 12. Phase 5C.1: Reliable Practice-State Saving

Completed: 2026-07-17

Outcome:
- Saves capture the edited job ID and an immutable payload snapshot.
- Pending saves flush before song changes and requests are serialized.
- The selected-song header shows `Saving...`, `Saved`, or `Save failed`.
- A failed save retains pending work instead of silently discarding it.

Status: Complete; the former immediate-song-switch race has regression coverage.

### 13. Phase 5C.2: Persistent Active and Failed Jobs

Completed: 2026-07-17

Outcome:
- `GET /api/jobs` exposes persisted queued, processing, failed, and completed jobs.
- Reload reconstructs non-complete rows and resumes polling active backend work.
- Failed jobs retain their backend error and can be removed safely.

Status: Complete with backend and Playwright reload coverage.

### 14. Phase 2I: Full-Song Analysis Coverage

Completed: 2026-07-17

Outcome:
- Removed the 120-second analysis ceiling.
- PCM is reduced to an approximately 8 kHz mono analysis representation to bound sample-array growth.
- Increased the frontend/backend working-chart limit from 128 to 4096 events.
- Did not change chord scoring, smoothing, bass evidence, vocabulary, or change-frequency logic.

Verification:
- A 125-second fixture emits cues after 120 seconds.
- Frontend and backend retain a 160-event working chart.
- Existing harmonic known-answer fixtures still pass.

Status: Complete.

## Detailed Backlog — Existing Phase Records

The provisional work packages above now govern backlog grooming. The phase records
below preserve existing detail and previous ordering until grooming explicitly
reclassifies, parks, or selects them.

### 15. Phase 3G.1: Waveform Timing Editor and Variable-Tempo Grid

Goal: Let a user align important bar downbeats to visible audio events so click, chords, loops, and count-in follow recordings that do not hold one constant tempo.

Why this precedes chord calibration:
- The current grid derives every beat from one BPM and one downbeat offset, so timing necessarily drifts on rubato, ritardando, accelerando, and ordinary human tempo variation.
- Chord-quality calibration is misleading while correct musical bar positions can still map to the wrong audio times.
- Existing grid-first chords and sections can remain stable if the app gains one shared musical-position/time mapping.

Data contract:
- Keep analyzer `job.result.metadata.beatGrid` immutable as provenance.
- Keep `practiceState.gridOverrides` as the corrected base BPM, meter, and Bar 1 seed for old songs and songs without a tempo map.
- Add optional user-owned `practiceState.tempoMap` with `version: 1` and sorted anchors shaped as `{ bar, timeSeconds }`.
- Require unique, increasing integer bar numbers and strictly increasing finite audio times; reject invalid/conflicting anchors rather than silently repairing them.
- Use piecewise-linear musical-position/time mapping between anchors. Beats are evenly distributed inside each anchored span. Before the first and after the last usable span, extrapolate from the nearest segment; fall back to base BPM when only one anchor exists.
- Keep meter constant across the first tempo-map version. Mid-song meter changes, per-beat warping, splines, and automatic transient snapping are out of scope.

User journey:
1. The normal timeline remains safe and non-editable.
2. `Edit timing` opens a distinct editor with a larger source waveform, horizontal pan, edit-only zoom, playback/scrubbing, and the existing bar lines over the waveform.
3. Clicking a bar line locks it at its calculated position; dragging creates or updates the same anchor at a new audible/visible downbeat. Manually anchored lines gain a restrained handle/state only in edit mode; they are not represented by a second competing marker system.
4. A correction picker plus previous/next actions navigates every explicit anchor. The selected correction exposes precise time, icon-only nudge controls, and removal; Bar 1 is edited here and remains the required seed once a tempo map exists.
5. Every change previews click, chord, loop, and marker alignment immediately and persists through the existing serialized practice-state save path. `Done` exits edit mode; no broad history editor is required for the first pass.

Waveform contract:
- Generate a compact versioned min/max peak envelope during processing and serve it as a separate result asset instead of embedding raw PCM or a large peak array in `job.json`.
- Real mode derives the envelope from `source-audio.wav`, which is the timing reference even when the user listens to a stem mix.
- Mock mode supplies deterministic representative peaks without adding FFmpeg or other heavy default dependencies.
- Target roughly 50-100 peak buckets per second, then confirm payload size and useful zoom depth on a user-length recording before fixing the final resolution.
- Do not decode the full source WAV in the browser for the first pass.

Tempo-control semantics:
- Without a tempo map, the current BPM, `/2`, and `x2` behavior remains the base-grid correction flow.
- With a tempo map, the visible value becomes the average local tempo of the segment containing the playhead and updates during scrubbing and playback. The selected correction still determines which segment a typed BPM edit changes.
- Editing a mapped segment tempo keeps its left anchor fixed and moves only its right anchor. Later explicit anchors keep their audio times, so important later downbeats are not cascaded; the following segment's calculated tempo may consequently change.
- If no right anchor exists, create the next bar downbeat as the right anchor.
- `/2` and `x2` must not silently rewrite an existing map; require an explicit reset/reinterpret action with confirmation if that capability is retained.

Shared timing responsibilities:
- Add one pure timing module for `musicalPositionToSeconds`, `secondsToMusicalPosition`, beat enumeration, local segment tempo, and anchor normalization.
- Route timeline markers, click scheduling, working-chart cue timing/current-chord highlighting, bar-based loop boundaries, Harmony loop overlays, and count-in through that module.
- Keep `practiceState.chordChart` grid-first; moving a downbeat changes derived playback seconds, not chord bar/beat data.

Execution sequence:
1. Implement the pure tempo-map model, inverse mapping, normalization, persistence, and focused unit/backend tests.
2. Generate and serve real/mock waveform envelopes with duration and payload-size coverage.
3. Build the gated zoomable editor and direct bar-line drag/nudge/remove flow using pointer events and keyboard-accessible controls.
4. Replace constant-tempo calculations in every timing consumer before declaring the vertical slice complete.
5. Make mapped tempo contextual and constrain tempo edits to the selected segment semantics above.
6. Add a generated variable-tempo fixture with known downbeats, plus Playwright coverage for edit-mode gating, zoom, drag, persistence, reload, and unchanged normal-mode safety.
7. Manually align at least one real recording with drift and listen through click, chord changes, a bar loop, and repeated count-in.
8. Run `npm test` and `npm run test:gui`, check narrow-screen behavior, measure the waveform payload, and delete all test-created jobs.

Acceptance criteria:
- Important user-anchored downbeats remain aligned within the practical browser/audio scheduling tolerance used by the POC; target an audible/visual error no worse than about 50-75 ms during manual review.
- A song with changing tempo no longer accumulates grid drift across anchored spans.
- Click, chords, timeline, loops, and count-in agree on the same mapping before and after reload.
- Old jobs without `practiceState.tempoMap` retain their current constant-tempo behavior.
- Edit controls cannot move bar lines outside `Edit timing` mode.
- Mock mode remains dependency-light and demonstrates the editor flow.

Status: Implemented and complete for automated verification on 2026-07-17. A product-feedback follow-up added click-to-lock downbeats, correction-list navigation, unified Bar 1 editing, distinct playhead styling, playhead/pointer-centered zoom with pinch support, live contextual BPM, optional Bar 1 playback start, and count-in independent of looping. Pure timing tests cover changing segment tempos and inverse mapping; backend tests cover waveform assets plus validated persistence; Playwright covers edit-mode gating, zoom, click/drag correction, contextual BPM transitions, chord/loop alignment, independent and repeated count-in, reload, and 390 px layout. Human listening/alignment on a real drifting recording remains the completion gate before Phase 2J.

### 16. Phase 2J: Joint Analyzer/Working-Chart Calibration

Goal: Improve chord usefulness through a deliberate try/fail/learn/adjust loop without allowing automatic analysis to overwrite user work.

Current data contract:
- `job.result.metadata.chords` is the immutable analyzer suggestion/provenance layer.
- `practiceState.chordChart` is the user's authoritative working chart after it is created.

Execution sequence:
1. Build the dataset-backed benchmark described in `research/chord-analysis-benchmark-strategy.md`, using RWC-P v2 as the primary real-pop corpus without checking audio into Git.
2. Lock a 12-song complexity-stratified pilot before analyzer changes: 8 development songs and 4 untouched holdout songs.
3. Run the current analyzer with both RWC reference timing and analyzer-estimated timing; report Root/MajMin/Triads/MIREX WCSR, boundary precision/recall, cue density, OOV duration, and runtime.
4. Automatically classify false extra changes, missing changes, wrong roots, wrong qualities, and the largest per-track regressions.
5. If realistic mixes fail, backtrack only the weakest cases through Tiny AAM mix/stem ablations or GuitarSet instead of building a long simple-to-complex manual ladder.
6. Adjust one musical heuristic at a time and retain only improvements that generalize from development to holdout.
7. After two failed local improvements against the same error class, compare Chordino through the same evaluator before further custom tuning.
8. Decide how raw/dense candidates and a conservative default presentation should be represented separately.
9. Prototype optional insertion of extra analyzer suggestions, comparison against user edits, and an explicit `Back to analysis` action with confirmation or undo.

Constraints:
- Do not automatically train on or overwrite user edits.
- Do not change chord-change frequency, bass heuristics, smoothing, or vocabulary before the fixed dataset baseline has been reviewed.
- Keep evaluation dependencies and corpora outside the dependency-light mock-mode setup.
- Do not tune on or replace the holdout set after seeing its results.

Status: Complete for the Phase 2J checkpoint on 2026-07-22. The Phase 3G.1 human checkpoint passed on `TeAmo.mov`; the dataset-backed benchmark and isolated-beat smoothing experiment passed their locked development/holdout gate. Immutable conservative `chords`, compact `suppressedChordSuggestions`, and the user-owned working chart are separate layers. Users can recover one hidden beat explicitly, return to the active conservative analysis after confirmation, and undo that whole-chart reset once while the same analysis remains active. Corrected-timing reanalysis uses the same analysis-scoped backup contract. The consumed holdout remains fixed and must not be tuned against; absolute chord accuracy and screen-recording domain validation remain documented risks rather than reasons for indefinite Phase 2J tuning.

### 16A. Cold-Start Metronome Initialization

Completed: 2026-07-17

Outcome:
- The first playback after a browser/server cold start waits for the Web Audio clock to resume before starting stems or scheduling the grid click.
- Metronome enable and Play share one in-flight audio-context activation instead of racing two resume attempts.
- A suspended clock cannot consume beat schedule keys, so a temporarily unavailable click remains eligible for the next scheduler pass.

Verification:
- Added deterministic Playwright coverage with a deliberately pending `AudioContext.resume()`.
- `npm test`: 28 passing, 1 skipped optional local calibration.
- `npm run test:gui`: all 28 tests passing.
- Test-created jobs removed; intentional local songs retained.

Status: Complete.

### 16B. Relocatable Demucs Startup

Completed: 2026-07-22

Outcome:
- Real mode and the stem bakeoff invoke the local Demucs package through `.venv-real/bin/python -m demucs`.
- Moving the repository no longer breaks processing because of the generated Demucs entrypoint's absolute Python shebang.
- `DEMUCS_PYTHON` supports a custom interpreter, while `DEMUCS_PATH` remains an explicit direct-entrypoint override.

Verification:
- Dependency-free unit coverage resolves the virtualenv Python from an arbitrary new repository root.
- The isolated real-mode contract requires module invocation and produces all six practice stems.
- `npm test`, syntax checks, local Demucs module startup, and `git diff --check` pass without creating library jobs.

Status: Complete.

### 17. Phase 3G.3: Unified Bar Timing and Threshold-Aware Analysis

Goal: Make timing a trustworthy first-class analysis stage that handles nonzero song starts, meaningful tempo changes, and bar-boundary time-signature changes without giving users competing tempo and meter controls.

Entry conditions:
- Complete the narrow Phase 2J `Back to analysis` reset and analysis-scoped one-step undo so timing-driven reanalysis cannot strand a displaced working chart.
- Keep the consumed Phase 2J chord holdout fixed; timing thresholds require separate development evidence and must not be tuned against those holdout results.

Recommended data contract:
- Evolve the user-owned `practiceState.tempoMap` into a versioned `practiceState.timingMap` with one ordered `events` list.
- Each event is attached to one bar and may contain `timeSeconds`, `timeSignature`, or both. A meter-only event inherits its calculated audio time; a timing-only event inherits the active meter.
- Bar 1 seeds the effective meter and may also own the first explicit downbeat time. Normalize existing `tempoMap` anchors into timing events so the documented `TeAmo.mov` corrections remain usable.
- Tempo remains derived from musical distance and audio time between timed events. Do not persist an independent BPM value that can contradict the anchors.
- Keep immutable analyzer timing provenance separate from user-owned corrections. Automatic timing changes are candidates until accepted or used to create a new analysis result; they must not silently rewrite `practiceState.timingMap`.

Unified interaction:
- Keep one visual bar line on the existing waveform/timeline. Do not add separate tempo-anchor and meter-change markers or lanes.
- Dragging or nudging the line updates that bar's optional `timeSeconds` and therefore the derived tempo of adjacent spans.
- Selecting the same line exposes its exact time, local derived tempo, and effective time signature. A time-signature change applies from that bar and is stored on the same event.
- Typing a segment tempo continues to move or create the relevant timed boundary under explicit, documented semantics; it does not create a second visual object.
- Removing one aspect of a correction preserves the other. For example, removing a moved time must not discard a meter change stored on the same bar.

Meter-aware timing responsibilities:
- Extend the shared timing module to integrate musical distance through the effective meter of every crossed bar instead of multiplying a bar difference by one global `beatsPerBar`.
- Define beat-unit and compound-meter pulse/accent semantics explicitly before implementation so 6/8 does not become an ambiguous six-quarter-note or six-click span.
- Route bar enumeration, beat positions, local tempo, metronome accents, chord cue timing, bar loops, count-in, section rendering, and inverse time lookup through the same meter-aware map.
- Preserve grid-first chord and section positions. A timing or meter correction changes derived playback/rendering time, not the user's musical bar identity.

Threshold-aware automatic analysis:
1. Make timing an explicit stage before chord segmentation and retain its candidates, confidence, and limitations as provenance.
2. Estimate plausible beat/downbeat observations and fit stable tempo spans across multiple beats or bars instead of warping to every onset.
3. Open a new tempo span only when phase error or local-tempo deviation exceeds a relative threshold for a persistent window; calibrate the threshold from timing fixtures rather than choosing it from one song.
4. Detect meter changes only at plausible downbeats and attach each accepted/candidate change to a concrete bar.
5. Treat uncertain tempo or meter changes as reviewable timing candidates, not automatic user corrections.
6. Run chord analysis only after the selected analyzer or user-corrected timing map has produced beat-aligned windows.

Test/learn/correct loop:
- Add known-answer fixtures for leading silence/pre-roll, a pickup before Bar 1, stable human-like beat jitter, an abrupt tempo change, gradual accelerando/ritardando, and 4/4-to-3/4 meter change.
- Measure beat/downbeat precision and recall, Bar 1 error, bar-line timing error, cumulative phase drift, tempo-change boundary error, and meter-change/bar accuracy before measuring downstream chord scores.
- Compare automatic timing with reference timing through the existing chord benchmark to quantify the remaining harmonic gap, but use a new timing development split or generated fixtures for threshold selection.
- Change one timing rule at a time, retain analyzer provenance, and compare final user corrections against analyzer output as evaluation evidence without automatically training on or overwriting those corrections.
- Finish with manual click/chord/loop/count-in review on at least two real screen recordings, including one with a late song start and one with tempo or meter change.

Acceptance criteria:
- A user can move a bar, change the time signature from that bar, or do both through the same selected bar line.
- Ordinary human timing variation does not create a correction event for every beat; persistent drift or a real tempo change creates a sparse, inspectable span boundary.
- Mid-song meter changes keep click accents, bar numbering, chords, loops, sections, and inverse seek mapping aligned.
- Corrected timing is established before chord windows are scored, and analyzer evidence remains distinct from user-owned timing and chord charts.
- Existing version-1 tempo maps either normalize deterministically or fail with an explicit documented clean-break decision before runtime code ships.
- Mock mode remains dependency-light and includes a representative timing/meter-change scenario.

Status: Complete on 2026-07-22. Version-1 tempo anchors migrate to version-2 timing events; the shared mapping, editor, click, chord windows, loops, count-in, Harmony, and inverse seeking are meter-aware; and timing/meter correction aspects share one bar line but remain independently removable. Seven generated known-answer fixtures pass the locked timing gate. Human review covered two real recordings: `ShapeOfMyHeart manually adjusted` confirmed that the metronome follows manually aligned bars through changing tempo, and a second late-start recording passed click, loop, repeated count-in, reload, and final chord highlighting after corrections. Loop review established and accepted the rule that an enabled valid loop always relocates to its start before direct playback or count-in. The late-start review found and verified fixes for corrected-timing cues retaining old waveform seconds and rounded analyzer seconds crossing a musical boundary. Corrected-analysis cues remap from their immutable timing snapshot, explicit bar/beat is authoritative, and near-integer beat ends snap to their intended boundary. Chord labels on `ShapeOfMyHeart manually adjusted` remained inaccurate after corrected-timing reanalysis, which is retained as harmonic-quality evidence rather than a timing failure.

### 18. Phase 3G.2: Zoomed Playback Timeline and Follow

Goal: Make long-song bars readable during ordinary practice without expanding the timing editor's first implementation scope.

Entry condition:
- Phase 3G.1 has passed real-song manual timing review.
- Normal playback zoom/follow still appears valuable after using the waveform editor; edit-mode zoom itself is not conditional.

Deliverables:
- Expose the same timeline viewport's zoom and `Fit` controls in normal playback.
- Add optional `Follow` that keeps the playhead around 35-40% into the viewport while timeline content scrolls underneath it.
- Turn Follow off when the user manually pans so the interface does not fight direct navigation.
- Preserve stable behavior near the beginning/end, while paused, during seeks, at non-1x playback speeds, and across loop jumps.
- Keep Edit timing follow off by default and preserve the user's ordinary playback preference separately.

Verification:
- Focused Playwright coverage for zoom anchoring, manual-pan cancellation, follow scrolling, seeking, loop jumps, and reload.
- Viewport checks around 1180 px, 820 px, and 390 px with no horizontal page overflow.
- Manual playback review on a long song before enabling Follow by default; default to off unless evidence supports otherwise.

Status: Complete for the original slider/Fit/Follow slice on 2026-07-22. Normal playback exposes persisted per-song Zoom, Fit, and optional Follow on the same timeline viewport. The original behavior targets 37.5% of the viewport, clamps at song boundaries, reacts to paused seeks, playback-speed changes, and loop relocation, and turns off on direct pan input. Timing edit currently keeps its own minimum-first ephemeral zoom and suppresses Follow without changing the saved playback preference. Focused browser coverage verifies anchoring, reload, loop entry, manual-pan cancellation, and no page overflow at 1180, 820, and 390 px. Product review on 2026-07-23 superseded two details: `Follow` should move the viewport only while playback is running, and timing edit should inherit then restore the ordinary viewport. Trackpad pinch also remains open because the pointer-based fix passed synthetic automation but failed human Mac trackpad review. Phase 3G.2A tracks the corrective interaction slice. Follow remains off by default until a long-song manual review provides evidence to change that default.

### 18A. Phase 3G.2A: Timeline Input-Contract Hardening

Goal: Make timeline navigation predictable across trackpad, mouse, touchscreen, and keyboard without changing playback time accidentally or allowing `Follow` to fight direct navigation.

Product contract:
- Implement the normative behavior in `TIMELINE_INTERACTION_CONTRACT.md`.
- Treat the contract as input-mechanism based rather than detecting a Mac, Windows, touch-only, or mouse-only device.
- Keep the dependency-light mock journey fully usable through visible Zoom, `Fit`, scrubber, and scrollbar controls even when a hardware gesture is unavailable.

Current gaps to correct:
- Trackpad pinch can require prior slider movement and can stop again at `Fit`.
- `followPlaybackTimeline` can reposition the viewport while playback is paused, including when Follow is enabled or a paused seek occurs.
- Ordinary mouse/trackpad wheel handling can turn `Follow` off even when the input only scrolls the page.
- Ordinary-playback click-to-seek and true primary-button drag-to-pan do not yet share one explicit click/drag arbitration path.
- Touch panning uses horizontal movement directly instead of relying as far as practical on browser `touch-action` arbitration for native vertical page scrolling.
- The native overflow area is not presented as an explicit keyboard panning path.
- Entering timing edit resets to minimum zoom rather than copying the ordinary viewport, and leaving does not restore a captured ordinary viewport.

Implementation sequence:
1. Centralize timeline viewport mutations behind small pan, zoom, seek, and Follow helpers. Distinguish programmatic Follow scrolling from deliberate user scrolling so only intentional manual pan disables `Follow`.
2. Gate Follow scrolling on active playback. Enabling Follow, paused scrubber changes, paused timeline seeks, zoom, and `Fit` must not reposition the viewport; playback start or resume may scroll to reveal the advancing playhead. Follow must never call a transport-seek path.
3. Implement the shared zoom-anchor rules. Pointer-located pinch uses its gesture position; slider and keyboard zoom use the visible playhead only during active followed playback and otherwise use viewport center; `Fit` shows the whole song from time zero.
4. Replace device-specific gesture assumptions with browser-faithful wheel handling. Consume horizontal deltas for timeline pan, leave unrelated vertical deltas available for page scroll, recognize browser trackpad pinch separately, normalize supported wheel delta modes, and keep pinch operational at both zoom bounds and after repeated direction changes.
5. Add one primary-pointer interaction state for empty timeline space. Release within the drag threshold seeks; movement beyond the threshold pans and suppresses the release seek; cancellation performs neither. Timing-marker anchors and explicit controls take precedence.
6. Keep `touch-action` configured for native vertical page scrolling while handling horizontal one-finger timeline pan and two-finger pinch. Adding a second touch cancels any pending tap or pan, and marker manipulation remains isolated from viewport pan.
7. Make horizontal overflow an explicit navigation control whenever zoom is greater than `Fit`. Use the platform scrollbar where practical, expose the viewport in keyboard focus order with a visible focus state and accessible label, reveal an overlay scrollbar on hover/focus/active pan, and verify that keyboard panning changes viewport position without seeking.
8. Capture ordinary zoom and horizontal position on entry to `Edit timing`, initialize the temporary editor viewport from that snapshot, and restore the unchanged ordinary viewport on exit. Persist only ordinary zoom and the Follow preference; keep horizontal positions and the edit viewport transient.
9. Preserve keyboard operation of the scrubber, Zoom slider, `Fit`, and timing anchors. Confirm that marker press/drag/cancel never also seeks or pans and that all interactive hit areas remain touch-usable.
10. Update the focused GUI test around the new Follow policy and split it into browser-faithful cases for Follow, click/drag arbitration, wheel axes, zoom anchoring, touch, edit-viewport restoration, and keyboard scrolling. Avoid relying on synthetic touchscreen pointer events as proof of real trackpad pinch.

Verification:
- Run `npm test` and `npm run test:gui`.
- At approximately 1180 px, 820 px, and 390 px, verify no horizontal page overflow and no loss of vertical page scrolling over the timeline.
- Verify paused Follow enable, paused scrubber seek, paused timeline seek, slider zoom, and `Fit` do not move the viewport through Follow.
- Verify playback start/resume, speed changes, and loop relocation keep the advancing playhead visible without changing its song time.
- Verify click seeks on release, drag pans without seeking, pointer cancellation performs neither, and every manual-pan mechanism turns Follow off.
- Verify keyboard scrubber seeking, keyboard Zoom/`Fit`, keyboard scrollbar panning without seeking, visible focus, and timing-marker activation.
- Verify touch tap, horizontal pan, vertical page scroll, pinch, second-finger conversion, and timing-marker precedence on a real or browser-faithful touchscreen.
- Manually verify a real Mac trackpad from `Fit`, after slider zoom, after `Fit`, at both zoom bounds, and through repeated pinch-in/pinch-out cycles. If Windows support becomes a POC target, repeat the wheel/pinch checks on a Windows Precision Touchpad without changing the product contract.
- Delete every song/job created by automated or manual verification, retaining only documented intentional demo, fixture, or calibration jobs.
- Run `git diff --check` and update `CHANGELOG.md`, `STATUS.md`, and this task status in the implementation commit.

Acceptance criteria:
- `Follow` changes viewport position only while playback is running and never changes playback position.
- Paused seeking and viewport navigation remain independent even when the saved Follow preference is enabled.
- Trackpad pinch works immediately from `Fit`, after slider use, after returning to `Fit`, and across repeated zoom cycles.
- Mouse, trackpad, touch, scrollbar, and keyboard panning do not accidentally seek; seeking does not accidentally pan.
- Vertical page scrolling remains available and does not disable Follow when no timeline pan occurred.
- All zoom paths share the same bounds and preserve the specified anchor, subject only to song-boundary clamping.
- Timing edit inherits the current ordinary viewport, cannot overwrite it, and restores it on exit.
- A keyboard user can seek with the scrubber and inspect another timeline region with the scrollbar without changing playback time.
- Existing timing-marker editing, loop behavior, persisted ordinary zoom/Follow preference, mock mode, and narrow layouts remain regression-safe.

Status: Planned next from the product-reviewed contract on 2026-07-23.

### 19. Phase 5D: Compact Practice Shell and Touch Accessibility

Goal: Reduce interface friction before adding more advanced section/chord gestures.

#### 19.1 Library, App Shell, and Selected-Song Header

Deliverables:
- Fix persisted thumbnails so actual images render and all artwork is square.
- Replace the visible Search label with an icon inside the field and show clear while text exists.
- Remove unnecessary mock-pipeline title copy and move mode selection into a stable URL argument, with root redirecting to the last mode.
- Make Real the default mode for new users while keeping mock mode easy to reach and fully demoable.
- Move backend readiness details behind a compact information control outside the main app surface.
- Remove duplicate selected-song eyebrow, duration/key/BPM metadata, and the visible `Learning status` label where the values already communicate their meaning.
- Simplify the empty state and remove obsolete explanatory copy/card treatment.

Verification:
- `npm test` and `npm run test:gui`.
- Focused browser coverage for stable/default mode URLs, compact backend information, search/clear behavior, persisted square thumbnails, and the simplified selected-song header.
- Existing 1180 px, 820 px, and 390 px page-overflow coverage remains green.
- Delete test-created jobs.

Status: Complete on 2026-07-23. The library now renders clipped square persisted artwork and captures new video thumbnails as centered square crops. Search uses an icon and explicit clear action. The compact topbar moves stable Real/Mock URL links and backend details into an information popover; first visits choose Real, root visits remember the last mode, and mock/demo URLs remain explicit. The selected-song header and empty states no longer repeat pipeline, eyebrow, duration, key, BPM, learning-label, or instructional copy already communicated elsewhere.

#### 19.2 Transport, Keyboard, Loop, and Mobile Harmony

Deliverables:
- Keep transport controls available while scrolling, using a sticky/fixed treatment validated on desktop and mobile.
- Remove redundant Time heading/container treatment; place time signature before BPM, tempo below the timeline, and make Bar 1 start visually secondary.
- Add desktop shortcuts: Space toggles play/pause; Enter stops and returns to the start, without hijacking text inputs or dialogs.
- Make section add and chord selection targets touch-friendly.
- Ensure loop handles do not cover chord names and use a thinner section-like range treatment.

Verification:
- Run `npm test` and `npm run test:gui`.
- Add focused keyboard, sticky-transport, search, thumbnail, and narrow-screen layout coverage.
- Check approximately 1180 px, 820 px, and 390 px widths with no horizontal overflow.
- Delete test-created jobs.

Status: 19.1 complete; 19.2 is the next planned slice.

### 20. Phase 5B.4: Section Resize Handles and Color Coding

Goal: Let users reshape and scan sections directly in the Harmony grid.

Deliverables:
- Add draggable whole-bar start/end handles.
- Prevent resize from overlapping neighboring sections.
- Let users edit section color after creation.
- Use deterministic, calm defaults and maintain readable contrast on narrow screens.

Verification:
- Unit coverage for resize transforms and overlap prevention.
- Playwright coverage for drag, persistence, color editing, and narrow layout.
- Full regression tests and test-job cleanup.

Status: Planned after Phase 5D.

### 21. Phase 5B.5: Chord Multi-Selection

Goal: Establish one selection model for chord copy/paste and loop commands.

Deliverables:
- Click selects one chord; Shift+click selects a range.
- Cmd+click on macOS and Ctrl+click elsewhere toggle individual chords.
- Users can select all chords in a section.
- Selection remains distinct from chord-name editing and works with touch-accessible controls.

Verification:
- Unit coverage for selection calculations.
- Playwright coverage for desktop modifiers, section selection, and existing chord editing.

Status: Planned after section resize/color.

### 22. Phase 5B.6: Chord Copy/Paste and Loop From Selection

Goal: Use selected chord ranges for repeated harmony and focused practice.

Deliverables:
- Copy selected chords and paste them at a bar/beat destination while preserving relative rhythm and durations.
- Keep pasted events independent rather than creating linked templates.
- Define and test a simple destination-collision rule.
- Set loop boundaries from selected chords or an entire section.
- Treat Alt+drag copy as optional; explicit copy/paste ships first if pointer handling would become fragile.

Verification:
- Unit coverage for copy/paste, collisions, and loop-boundary derivation.
- Playwright persistence and loop-overlay coverage.
- Full regression tests and test-job cleanup.

Status: Planned after chord multi-selection.

## Parked Work

See `IDEAS.md` for conditional, unscheduled, or temporarily deferred work. Promote an idea back into this file only when it has explicit entry criteria and a defined position in the execution order.
