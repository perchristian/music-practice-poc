# TASKS.md

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

## Planned Work — Execution Order

Do not start a later item merely because an earlier item requires human review. Record the blocker and ask whether to continue with the next independent item.

### 15. Phase 2J: Joint Analyzer/Working-Chart Calibration

Goal: Improve chord usefulness through a deliberate try/fail/learn/adjust loop without allowing automatic analysis to overwrite user work.

Current data contract:
- `job.result.metadata.chords` is the immutable analyzer suggestion/provenance layer.
- `practiceState.chordChart` is the user's authoritative working chart after it is created.

Execution sequence:
1. Choose a small repeatable set of real songs and expected chord timelines together with the user.
2. Inspect analyzer suggestions beside user corrections.
3. Classify false extra changes, missing changes, wrong roots, and wrong qualities.
4. Decide how raw/dense candidates and a conservative default presentation should be represented separately.
5. Prototype optional insertion of extra analyzer suggestions, comparison against user edits, and an explicit `Back to analysis` action with confirmation or undo.
6. Adjust one musical heuristic at a time and retain only improvements that generalize across the calibration set.

Constraints:
- Do not automatically train on or overwrite user edits.
- Do not change chord-change frequency, bass heuristics, smoothing, or vocabulary before the shared baseline has been reviewed.

Status: Next human checkpoint. Awaiting the joint calibration session.

### 16. Phase 5D: Compact Practice Shell and Touch Accessibility

Goal: Reduce interface friction before adding more advanced section/chord gestures.

#### 16.1 Library, App Shell, and Selected-Song Header

Deliverables:
- Fix persisted thumbnails so actual images render and all artwork is square.
- Replace the visible Search label with an icon inside the field and show clear while text exists.
- Remove unnecessary mock-pipeline title copy and move mode selection into a stable URL argument, with root redirecting to the last mode.
- Make Real the default mode for new users while keeping mock mode easy to reach and fully demoable.
- Move backend readiness details behind a compact information control outside the main app surface.
- Remove duplicate selected-song eyebrow, duration/key/BPM metadata, and the visible `Learning status` label where the values already communicate their meaning.
- Simplify the empty state and remove obsolete explanatory copy/card treatment.

#### 16.2 Transport, Keyboard, Loop, and Mobile Harmony

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

Status: Planned after the Phase 2J checkpoint, or as the next independent task if calibration is waiting for user input.

### 17. Phase 5B.4: Section Resize Handles and Color Coding

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

### 18. Phase 5B.5: Chord Multi-Selection

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

### 19. Phase 5B.6: Chord Copy/Paste and Loop From Selection

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

## Next Task

Prepare the Phase 2J calibration set with the user. If that human checkpoint cannot start yet, begin Phase 5D.1 as the next independent implementation task.

Do not start Phase 5B.4–5B.6 before the compact shell/touch pass unless user testing demonstrates that section resizing or chord copy/paste has greater immediate learning value.

## Parked Work

See `IDEAS.md` for conditional, unscheduled, or temporarily deferred work. Promote an idea back into this file only when it has explicit entry criteria and a defined position in the execution order.
