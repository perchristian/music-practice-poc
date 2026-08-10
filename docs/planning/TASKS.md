# Tasks

## Next Task

Product-owner qualitative review after selecting `REFRAME` in issue #10. Inspect
the three fixed screen-recording scenarios using the prepared local Chordino
viewer and answer the frozen correction-burden verdict in
`benchmarks/chord-reliability-cr2e-manual-review.md`.

The band-cover repositioning (Decision 34) did not change the gate. It added a
short reframing pass, completed on 2026-08-08, plus two queued tasks below —
`BR1` practice target and `BR2` stem import — which are ready but do not preempt
the required qualitative review.

CR2E consumed the four-track holdout once after issue #8 froze the gate.
Chordino materially outperformed the local baseline and passed every aggregate
check except oracle root accuracy: 73.1% against the 75.0% minimum. Decision 40
keeps that failure intact while authorizing one bounded qualitative review; the
product adapter remains blocked.

Current issue pointers and blocking state live in `docs/planning/STATUS.md` under Active Work
Ownership. They are not duplicated here.

## Index

| ID | Task | Status |
|---|---|---|
| [CR0](#cr0-lock-the-chord-reliability-validation-contract) | Lock the chord-reliability validation contract | Complete, amended 2026-07-25 |
| [CR2E](#cr2e-validate-the-chordino-replacement-candidate) | Chordino replacement candidate | **Reframed manual review ready — human action** |
| [CR3](#cr3-validate-bass-fallback-and-ornament-resistant-comp-evidence) | Bass fallback and ornament-resistant comp evidence | Deferred pending manual verdict |
| [CR4](#cr4-validate-repeated-section-evidence-pooling-with-known-groups) | Repeated-section evidence pooling, known groups | Planned after CR3 |
| [CR5](#cr5-evaluate-automatic-repeat-suggestions) | Automatic repeat suggestions | Conditional on CR4 |
| [CR6](#cr6-integrated-chord-reliability-checkpoint) | Integrated chord-reliability checkpoint | Planned last |
| [BR1](#br1-per-song-practice-target) | Per-song practice target | Ready, does not preempt CR2E |
| [BR2](#br2-import-user-supplied-stems) | Import user-supplied stems | Ready after BR1 |
| [WP1](#wp1-ai-execution-baseline-and-context-foundations) | AI execution baseline and context foundations | Proposed |
| [WP2](#wp2-timeline-input-correctness-and-frontend-seam) | Timeline input correctness and frontend seam | Proposed, highest-priority runtime |
| [WP3](#wp3-user-test-readiness-stabilization) | User-test readiness stabilization | Proposed |
| [WP4](#wp4-boundary-contracts-and-opportunistic-backend-modularization) | Boundary contracts and backend modularization | Proposed enabling/debt |
| [WP5](#wp5-evidence-driven-feature-backlog) | Evidence-driven feature backlog | Conditional |
| [3G.2A](#18a-phase-3g2a-timeline-input-contract-hardening) | Timeline input-contract hardening | Planned next |
| [5D.2](#192-transport-keyboard-loop-and-mobile-harmony) | Transport, keyboard, loop, mobile Harmony | Next planned slice |
| [5B.4](#20-phase-5b4-section-resize-handles-and-color-coding) | Section resize handles and color coding | Planned after 5D |
| [5B.5](#21-phase-5b5-chord-multi-selection) | Chord multi-selection | Planned after 5B.4 |
| [5B.6](#22-phase-5b6-chord-copypaste-and-loop-from-selection) | Chord copy/paste and loop from selection | Planned after 5B.5 |

Completed task records live in `docs/archive/TASKS_ARCHIVE.md`. Unscheduled and conditional
work lives in `docs/product/IDEAS.md`.

## Purpose

This file is the execution plan for the POC. It contains pending work only, in
the order it should be attempted. Completed records move to `docs/archive/TASKS_ARCHIVE.md`
rather than accumulating here.

GitHub Issues are the source of truth for executable work. This file retains the
roadmap, ordering, dependencies, and durable contracts. A human review issue is
created only when its review packet is ready.

Phase IDs are preserved because they identify the subsystem where work belongs. They are not expected to be numerically increasing when a later iteration returns to an earlier subsystem; for example, Phase 2I was completed after Phase 5C.

Unscheduled, conditional, or temporarily parked work lives in `docs/product/IDEAS.md`. Moving an item there does not reject it; it means the item has no committed place in the current execution sequence.

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
  `docs/research/chord-reliability-validation-plan.md`;
- retain editable charts and immutable analyzer provenance throughout.

Product-owner amendment on 2026-07-24, answered in
[#3](https://github.com/perchristian/music-practice-poc/issues/3) and recorded as
`docs/planning/DECISIONS.md` Decision 33:

- run RWC-P as the primary benchmark first, using its aligned MIDI, beat, chord,
  structure, melody, and vocal annotations;
- do not require Logic-generated fixtures or two untouched target recordings
  before the RWC development and holdout evaluation;
- once RWC results are satisfactory, manually check a small number of
  representative iOS screen recordings as the final domain check.

The locked RWC split, exclusions, checksums, annotation commit, and
`--allow-holdout` rule are unchanged.

GitHub tracking:
- Shared gate:
  [#1](https://github.com/perchristian/music-practice-poc/issues/1)
- CR0 agent preparation:
  [#2](https://github.com/perchristian/music-practice-poc/issues/2) — closed
- CR0 product review:
  [#3](https://github.com/perchristian/music-practice-poc/issues/3) — closed
  with `CHANGES`

The tasks below are in committed priority order. A task may stop the sequence at
its milestone gate. Do not skip directly to automatic repeat detection or combine
several unproven heuristics in one experiment.

### CR0: Lock the chord-reliability validation contract

Files and symbols:
- `docs/research/chord-reliability-validation-plan.md`: Evaluation contract and
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

Status: Complete for the purpose of unblocking CR1, and amended on 2026-07-25.
The locked 8/4 RWC split excludes all consumed Phase 2J tracks, five local target
candidates remain checksum-inventoried, and metrics, paths, artifact locations,
and dry-run commands are defined. `npm run verify:chord-contract` passed without
changing the existing application job directories.

The two untouched target holdout slots, the blind two-reviewer reference process,
and Logic fixture authoring were removed from the critical path by the `CHANGES`
verdict; they apply again only if a scored target holdout is reinstated. What
remains open is one ready product-owner input: approving or replacing the
proposed `thresholds.rwcPrimaryGate` values before the RWC holdout is opened,
and agreeing the scope of the final manual domain check.

### CR2E: Validate the Chordino replacement candidate

Files and symbols:
- `scripts/benchmark-chords.js`: local/Chordino analyzer selection
- `benchmarks/chordino-transform.n3`: pinned external transform
- `benchmarks/chord-reliability-cr2-checkpoint.md`: development evidence
- `benchmarks/chordino-manual-review.html`: local synchronized review
- `benchmarks/chord-reliability-cr2e-manual-review.md`: reframed verdict contract
- product harmony adapter only after the locked evaluation authorizes it

Goal:
- Decide whether Chordino should replace the local chord analyzer by running the
  same locked holdout evaluator and then the approved manual target-domain check.

Contracts to preserve:
- Issue #8 approved the proposed thresholds and three-recording manual scope;
  preserve that frozen contract when opening the four-track RWC holdout.
- Compare the unchanged local CR1 baseline and Chordino through the same
  evaluator; do not tune either against holdout results.
- Mock mode and normal application setup remain free of Chordino, Sonic
  Annotator, and Vamp dependencies.
- User-owned charts and immutable analyzer provenance remain authoritative.

Non-goals:
- CR3–CR5 local heuristics.
- Product integration before the holdout and manual gate pass.
- Broader chord vocabulary or UI changes.

Verify:
- One guarded local-baseline and Chordino holdout run with oracle and end-to-end
  timing, after approval.
- Approved primary thresholds, density, regression, runtime, and per-track
  comparison.
- A just-in-time `owner:per` manual-domain packet covering the approved screen-
  recording scenarios and requested answer format.
- Full regression suite; no application jobs created.

Milestone:
- Make a bounded COMPARE/REPLACE or STOP/REFRAME recommendation. Schedule a
  product adapter only if the locked and manual gates authorize it.

Status: Automated portion complete as owner-agent issue #10. Chordino improved
holdout oracle MajMin from 59.0% to 73.9% and boundary F1 from 53.6% to 72.9%,
but oracle root reached 73.1% against the frozen 75.0% minimum. The holdout is
consumed and the automated gate remains failed. The product owner selected
`REFRAME`; the three-recording qualitative packet is ready and awaits the exact
PASS/FAIL response. Product integration remains unauthorized. See
`benchmarks/chord-reliability-cr2e-checkpoint.md` and
`benchmarks/chord-reliability-cr2e-manual-review.md`.

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
- Bass-present and no-bass scenario metrics, grouped from RWC instrumentation.
- Locked RWC development results; holdout only at the precommitted gate.

Milestone:
- Milestone 3 passes.

Status: Deferred pending the reframed manual review verdict. Do not resume local
heuristics or reuse the consumed holdout.

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
- `docs/engineering/CHORD_ANALYSIS_STRATEGY.md`
- `docs/planning/STATUS.md`, `docs/planning/RISKS.md`, `docs/planning/DECISIONS.md`, and `docs/engineering/DEMO.md`

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
- RWC holdout against the approved primary gate thresholds, plus grouped metrics.
- Final manual domain check on a small number of representative iOS screen
  recordings, run only after the RWC results are satisfactory.
- Runtime and memory measurement.
- Three-minute-song correction-time review.
- Human chart-usability assessment.
- Full mock/real regressions and cleanup of all test-created jobs.

Milestone:
- Milestone 6 closes the gate and selects the next project direction.

Status: Planned after the last entered experimental milestone.

## Band Repositioning Tasks

Created by Decision 34 on 2026-08-08. Neither task changes the analyzer, so
neither interacts with the chord-reliability gate. Both are small enough to
schedule around the CR sequence rather than ahead of it.

### BR1: Per-song practice target

Files and symbols:
- `server.js`: `publicStem` (`defaultMuted`)
- `public/app.js`: stem player construction, `primaryPlayer`, practice-state
  persistence
- `docs/engineering/ARCHITECTURE.md`: practice-state shape

Goal:
- Let the user mark which stem is their part, persist it per song, and default
  that stem to muted when the song opens.

Contracts to preserve:
- The target is derived from the job's actual stem list, never a fixed instrument
  vocabulary, because imported jobs (BR2) may carry any stems.
- Existing songs without a target keep current behavior: nothing muted on open.
- `primaryPlayer` must stop preferring piano; prefer the longest loaded stem, as
  it is only a duration/clock reference.

Non-goals:
- Role-specific views.
- Dynamic stem sets beyond reading the job's own list.

Verify:
- Focused browser coverage for target selection, default mute on open, and
  persistence across reload.
- `npm test` and `npm run test:gui`.
- Delete test-created jobs.

Status: Ready.

### BR2: Import user-supplied stems

Files and symbols:
- `server.js`: job creation, stem descriptors, `stemsForJob`, analysis source
  selection
- `public/app.js`: upload flow and stem naming UI

Goal:
- Create a processing job from a set of user-supplied stems, skipping separation.

Contracts to preserve:
- Validate stem lengths on import and fail loudly. The transport trusts one
  stem's duration as its clock, so a mismatched stem would corrupt the grid
  silently rather than error.
- Synthesize `source-audio.wav` by summing imported stems when no full mix is
  supplied; harmony analysis and the waveform asset both depend on it.
- Map filenames to stem roles with a user override.
- Mock mode stays dependency-light.

Non-goals:
- A LALAL or other service integration. That is a later, separate decision.
- Changing the analyzer.

Verify:
- Import fixtures from `test-media/stems from logic/` and
  `test-media/stems from lalal/`, including the `.mov` container case.
- Mismatched-length and unknown-name rejection paths.
- `npm test` and `npm run test:gui`.
- Delete test-created jobs.

Status: Ready after BR1.

## Deferred Work Packages

The product-owner decision above completes the previous grooming choice. The
packages below remain useful, but are deferred until CR6 or an earlier terminal
decision closes the chord-reliability gate.

These packages group the existing backlog by technical dependency, risk, and
reversibility. Their order is deliberately technical-first at the product owner's
request and temporarily departs from the default prioritization order above.

Do not start implementation from this list while the chord-reliability gate is
active.

### WP1: AI Execution Baseline and Context Foundations

Technical rationale:
- Measurement must precede optimization.
- Smaller current-context documents and stable routing information reduce repeated
  exploration for every later package.
- This is documentation and process work with low runtime regression risk.

Tasks:
1. Capture comparable frontend, backend/analysis, and documentation task baselines
   using the metrics in `docs/engineering/AI_TOKEN_OPTIMIZATION.md`.
2. Condense `docs/planning/STATUS.md` to current state and move dated verification history to an
   archive.
3. Keep active and near-future work in `docs/planning/TASKS.md`; archive completed phase detail
   without losing traceability.
4. Add a compact stable codebase quick reference to `AGENTS.md`, excluding line
   numbers, fixed test totals, and volatile current state.
5. Adopt the symbol-based task contract from `docs/engineering/AI_TOKEN_OPTIMIZATION.md`.
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
   `docs/engineering/TIMELINE_INTERACTION_CONTRACT.md`.
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
2. Run the complete mock and real demo journeys using `docs/engineering/DEMO.md`.
3. Resolve or explicitly preserve the malformed local `job.json` recorded in
   `docs/planning/STATUS.md`; do not delete ambiguous user data without approval.
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

## Detailed Backlog — Pending Phase Records

The provisional work packages above now govern backlog grooming. The phase records
below preserve existing detail and previous ordering until grooming explicitly
reclassifies, parks, or selects them.

Numbering is non-contiguous because completed phase records moved to
`docs/archive/TASKS_ARCHIVE.md`. Only pending records remain here.

### 18A. Phase 3G.2A: Timeline Input-Contract Hardening

Goal: Make timeline navigation predictable across trackpad, mouse, touchscreen, and keyboard without changing playback time accidentally or allowing `Follow` to fight direct navigation.

Product contract:
- Implement the normative behavior in `docs/engineering/TIMELINE_INTERACTION_CONTRACT.md`.
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
- Run `git diff --check` and update `CHANGELOG.md`, `docs/planning/STATUS.md`, and this task status in the implementation commit.

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

See `docs/product/IDEAS.md` for conditional, unscheduled, or temporarily deferred work. Promote an idea back into this file only when it has explicit entry criteria and a defined position in the execution order.
