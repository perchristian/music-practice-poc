# STATUS.md

This file describes the project as it is now. Dated history, the completed-work
list, and the verification log live in `STATUS_ARCHIVE.md`. Curated outcomes live
in `CHANGELOG.md`, the plan in `TASKS.md`, and irreversible choices in
`DECISIONS.md`.

## Current Status

Implemented and verified by automated backend and browser tests:

- **Library and workspace.** One primary song list holds queued, processing,
  failed, and completed songs. Songs reopen without reprocessing; rename, delete,
  search, and thumbnails work. Practice state persists per song with
  `Saving.../Saved/Save failed` feedback and survives an immediate song switch.
- **Playback.** Synchronized stem playback with mute, solo, per-stem volume,
  speed change, one grid-snapped loop, count-in, and a Web Audio metronome
  clicking against the effective grid.
- **Timeline.** Persisted Zoom, Fit, and optional Follow, over a waveform.
  Follow defaults off and yields to manual panning. Mac trackpad pinch is a known
  open defect; the reliable path is the Zoom slider plus `Fit`, and
  `TIMELINE_INTERACTION_CONTRACT.md` holds the agreed input contract.
- **Timing.** `Edit timing` exposes a separately zoomable waveform where one bar
  line can carry an explicit downbeat time, an effective time signature, or both,
  removable independently. The meter-aware map drives contextual BPM, timeline
  and bar enumeration, click and accent scheduling, chord windows and
  highlighting, loops, Harmony, count-in, and inverse seeking. Bar 1 supports
  negative time; 6/8 and 12/8 use dotted-quarter pulse grouping.
- **Harmony.** Beat-aligned chord grid with user editing, flat section labels,
  key override, corrected-timing reanalysis, `Back to analysis` with
  analysis-scoped one-step undo, and recovery of chord candidates suppressed by
  smoothing.
- **Pipelines.** Mock mode is dependency-light and remains fully demoable. Real
  mode extracts `source-audio.wav` with FFmpeg, separates six stems with Demucs
  `htdemucs_6s`, applies threshold-aware timing, then runs approximate harmony
  analysis.

Persisted state: constant corrections in `practiceState.gridOverrides`; sparse
variable timing and meter changes in version-2 `practiceState.timingMap` with
deterministic version-1 migration; viewing in `practiceState.timelineView`. Key,
chord chart, sections, and Harmony view are separate user-owned state.

### Current checkpoint

The chord-reliability validation gate is the committed line of work. Everything
else is deferred behind it. The measured position is:

- RWC-P development MajMin 60.8% with oracle timing and 55.7% end-to-end, after
  the isolated-beat smoothing rule.
- The Phase 2J holdout is consumed and fixed at 49.0% oracle and 39.9%
  end-to-end. It must never be used for tuning.
- Human review found chord names still inaccurate on real recordings after
  corrected-timing reanalysis. Timing itself passed its human gate.

Chord accuracy is therefore the open core question. Timing, transport,
persistence, and the editable chart are not.

### Known limitations

- Chord names are unreliable on real screen recordings. This is the gate.
- Mac trackpad pinch zoom on the timeline is intermittent.
- Multipart uploads are buffered in memory behind a 650 MB cap; peak memory has
  not been measured near the limit.
- Runtime and memory for full-length real recordings are unmeasured.
- No piano player has used the prototype yet, so nothing about product value is
  validated.

## Current Architecture

Local web POC:

- static browser client
- lightweight Node.js backend
- local filesystem storage under `data/`
- server startup uses `PIPELINE_MODE=mock` unless configured otherwise; the browser entry URL applies Real for a first-time root visit and remembers later mode choices
- processed results represented as stems, with piano as the primary practice target
- completed jobs exposed as a reusable processed-song library
- unified workspace shows active uploads, processing jobs, failed jobs, and completed songs in one primary song list
- per-song practice state stored in local `job.json`, including grid overrides, key override, and the user's grid-first chord chart
- `PIPELINE_MODE=real` behind the same pipeline boundary, currently with real upload storage, FFmpeg source-audio extraction, and Demucs `htdemucs_6s` six-stem separation by default
- stable `?mode=real` and `?mode=mock` links in the app-information popover change the active backend pipeline mode for new jobs in the current server session; `PIPELINE_MODE` remains the server startup default
- desktop/wide tablet uses a split view with song list on the left and selected detail/practice on the right
- mobile uses a list-first stack with a back button from detail/practice to the same song list
- beat/bar markers render from an effective grid derived from job `metadata.beatGrid` plus per-song `practiceState.gridOverrides`; the Web Audio metronome clicks against that same effective grid with downbeat accent always on and mute/solo/volume controls in the mixer
- Harmony renders analyzer chords as draft suggestions until `practiceState.chordChart` exists; once present, the user-edited grid-first chart becomes the displayed working chart while `job.result.metadata.chords` remains unchanged for provenance. The Harmony UI is a beat-aligned chart: bars render as rows, beats as cells, and chord cards show the bar/beat where each chord hits rather than a visible start/end time range

### Module map

- `server.js` — HTTP routing, job lifecycle and storage, mock audio generation,
  real pipeline orchestration, and the beat/harmony analyzer. The two analysis
  subsystems are the next candidates for extraction, per
  `AI_TOKEN_OPTIMIZATION.md`.
- `public/app.js` — DOM rendering, transport, persistence, and timeline input.
  The largest integration file.
- `public/chord-chart.js`, `public/tempo-map.js`, `public/section-ranges.js` —
  pure, unit-tested model code. `section-ranges.js` is shared with `server.js` so
  frontend validation and backend persistence cannot diverge.
- `scripts/` — benchmark, fixture, and contract-verification tooling. None of it
  touches the application library.

## Active Work Ownership

- Shared gate:
  [#1 — Validate chord reliability for user testing](https://github.com/perchristian/piano-practice-poc/issues/1)
- Current Codex task: None open. CR1 is ready and needs an `owner:codex` issue
  when work begins.
- Current human action: None ready.
- Blocked by human action: No.
- Deferred human input: approve or replace the proposed
  `thresholds.rwcPrimaryGate` values in
  `benchmarks/chord-reliability-contract-v1.json` before the RWC holdout is
  opened, and agree the scope of the final manual domain check.

## In Progress

- No implementation phase is currently in progress.
- CR0 is complete and amended. The product owner answered `CHANGES` in
  [#3](https://github.com/perchristian/piano-practice-poc/issues/3) on
  2026-07-24: RWC-P is the primary benchmark and runs first, Logic fixtures and
  the two untouched target recordings no longer block it, and a manual check of a
  few representative iOS screen recordings becomes the final domain check. This
  is recorded as `DECISIONS.md` Decision 33.
- Phase 3G.3 is complete for automated and human verification. A general undo
  history remains deferred.
- Phase 3G.2A timeline input correctness has a known real-hardware failure and is
  deferred behind the chord gate.
- The prior backlog work packages are deferred until the gate reaches a terminal
  decision.

## Next Recommended Task

CR1: add evidence diagnostics and failure fixtures against RWC-P, without
changing public analyzer output. See `TASKS.md` for the task contract.

The deferred threshold approval is not needed to start CR1; it is needed before
the RWC holdout is opened.

## Skills Used

- Used Codex skill `github:github` on 2026-07-24 to inspect CR0 issue #2 and its
  parent gate, verify the human queue, and create approval issue #3.
  - Purpose: execute the issue contract while keeping the product-owner review
    as one explicit, just-in-time handoff.
  - Result: CR0 Codex preparation is complete and #3 is the only
    `owner:per`/`state:ready` issue.
  - Reproducibility: all contract artifacts and commands are version-controlled;
    GitHub is used only for ownership and the approval response.
- Used Codex skill `github:github` on 2026-07-23 to inspect the empty repository
  tracker and establish the approved issue-based ownership workflow.
  - Purpose: separate Codex execution from product-owner actions and keep human
    review requests visible and actionable.
  - Result: created the `Chord Reliability Gate` milestone, ownership/state/review
    labels, shared gate issue #1, and active Codex issue #2.
  - Reproducibility: the labels, milestone, and issue bodies are visible in
    GitHub and the workflow rules are version-controlled in `AGENTS.md`.

Older skill use is recorded in `STATUS_ARCHIVE.md`.

## Agent and Model Use

- No delegated agents used.
- No model switch performed.
- Main Codex session is being used for planning and implementation.

## Known Local State

- Local `data/jobs` contains manual/runtime jobs for `TeAmo.mov`,
  `Stem-generator_1.aif`, and `MakeYouFeelMyLovePart2.mov`, plus one local
  `job.json` that currently fails JSON parsing. This is user data and has not
  been deleted; WP3 must resolve or explicitly preserve it.
- The Playwright suite runs against an isolated temporary `DATA_DIR` since
  2026-07-25, so GUI runs no longer write into the local library.
- `.benchmark-data/` holds the RWC-P archive, annotations, and the twelve
  extracted CR0 audio files. All of it is ignored by Git.

## Verification

Current commands:

```bash
npm test              # Node backend and pure-module tests
npm run test:gui      # Playwright browser tests
npm run verify:chord-contract   # CR0 contract dry run, requires .benchmark-data
```

Dated verification evidence for completed work is in `STATUS_ARCHIVE.md`.
