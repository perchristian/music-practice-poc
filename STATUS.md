# STATUS.md

## Current Status

The first mock-mode vertical slice, Phase 1 processed-song library, Phase 1B unified song workspace UX, Phase 2 real-mode FFmpeg extraction spike, Phase 2G piano-focused real separation spike, Phase 2G-QA Demucs bakeoff, Phase 2H real harmonic-analysis spike, Phase 3 musical grid calibration/editable compact chord chart UI including Phase 3G.1 variable-tempo correction, Phase 4A single grid-snapped loop pass, Phase 5A runnable Flat Sections prototype, Phase 5B.1-5B.3 section-range hygiene/rendering/creation pass, and Phase 5C.1 practice-state save reliability are implemented and functionally verified by automated backend and browser tests. A developer can start the local web POC, switch active pipeline mode from the GUI, queue one or more media files for mock processing, keep active jobs visible in one primary song list, reopen completed processed songs from that same list, select songs without navigating through separate Recent and All songs pages, rename/delete the selected song from the header's more menu, persist practice state with visible saving/saved/failure feedback, mute/unmute stems, solo stems, adjust stem volume, use playback controls, see beat/bar markers over a source waveform, turn on a grid-aligned metronome/click from the mixer row, manually halve/double or type-correct the displayed tempo, enter `Edit timing`, zoom/scrub the waveform, and drag important bar lines into persisted variable-tempo downbeat anchors. The same timing map drives click, chord timing/highlighting, timeline markers, bar loops, Harmony overlays, and count-in. Users can also set bar 1 start including negative values, switch supported time signatures before creating a tempo map, change key, use a 1-bar loop count-in, adjust loop handles, edit the working chord chart, and label flat song sections. Pending practice edits are stored as job-bound snapshots, serialized, and flushed before song switches. Constant corrections persist in `practiceState.gridOverrides`; sparse variable timing persists separately as `practiceState.tempoMap`; key, chord chart, sections, and Harmony view remain separate user-owned state. In real mode, uploaded media is extracted to `source-audio.wav`, separated by Demucs, analyzed for approximate harmony, and reduced to a compact waveform envelope; mock mode supplies deterministic representative peaks without heavy dependencies.

Phase 0, Phase 1, Phase 1B, Phase 2A through the Phase 2H beat-aware hardening pass, and Phase 3 are complete for automated verification. Human listening on `MakeYouFeelMyLovePart2.mov` found Demucs good enough for the core POC play-along use case: solo piano has crackle/artifacts, but removing piano works well enough to continue. Phase 2H harmonic analysis is verified on generated known-chord test media for pre-roll/downbeat placement, multiple chord changes inside 4/4 bars at 120 BPM, a five-bar 3/4 fixture at 90 BPM, and inversions where bass avoids the root. It is also verified on the local `f9e9cf9d-0998-494d-82cf-3dc89fcf4d76` calibration job, where the expected answer is 106 BPM, 4/4, and one chord per bar: C, Dm, Am, Am, C, Dm, Am, Am. Broader manual inspection on varied real screen recordings and manual listening for metronome alignment are still required.

Phase 3D replaced the seconds-first `practiceState.chordEdits` model with a clean-break grid-first `practiceState.chordChart` model on 2026-07-07. Backward compatibility with old local POC songs was intentionally not added. Phase 3E introduced the beat-aligned chord chart UI, and Phase 3F compacted it after product review by removing split/merge/arrow controls and moving add/move/delete onto the grid. A follow-up on 2026-07-07 added beat-snapped right-edge resizing for chord cards so users can shorten a spanning chord and reveal `+` cells for inserting another chord inside the same bar. Manual listening on varied real recordings is still needed to judge whether the Phase 3 Bar 1/BPM/meter calibration is intuitive enough, or whether a waveform view should be added later. Manual testing also found that clips with a short pause before the first downbeat are easier to inspect than clips where the first beat happens just before the recording starts; `DEMO.md` now recommends pre-roll for demos. The default real-mode separator is now Demucs; the previous FFmpeg spectral split remains available with `REAL_SEPARATOR=ffmpeg-spectral`.

Phase 4A reprioritized loop work on 2026-07-08: multiple saved loops, loop names, notes, and loop statuses are deferred. The next practice-loop priority is one good loop first. The UI now shows loop start/end as whole bars when a beat grid exists, while the backend continues to persist `practiceState.loopStart` and `practiceState.loopEnd` as seconds for compatibility. The count-in path is covered for nonzero `Bar 1 start` and now repeats before every loop pass. Dense timeline rendering drops nonessential beat ticks and skips overlapping bar numbers. Harmony marks the active loop and exposes draggable start/end handles that work across rows and can extend the loop earlier from the front. A follow-up on 2026-07-08 added an in-grid preview while dragging loop handles, so the user can see the bar range that will be applied before releasing the pointer. Verification passed with `npm test`, `node --check public/app.js`, `node --check tests/gui.spec.js`, focused Playwright loop/persistence tests, and full `npm run test:gui` with 20 tests; the drag-preview follow-up was verified with the focused Playwright loop test. Manual listening on a real long song is still needed to confirm metronome behavior through repeated loop passes.

Chord chart bugfix on 2026-07-07: chord cards now reserve every beat cell they visually span, so `+` buttons do not remain visible underneath dragged or resized chords and mixed `+`/chord rows no longer grow to a second grid row. Resizing a chord's right edge now previews the resulting span and covered `+` cells before release. Deleting the final chord is supported by preserving an explicit empty `practiceState.chordChart` instead of falling back to analyzer chords. Verification passed with `npm test`, targeted Playwright coverage for chord resize/delete, and the full `npm run test:gui` suite. Test/probe-created library jobs were checked and removed after verification.

Chord chart maintainability refactor on 2026-07-07: the pure chord-chart model, grid math, roman-numeral derivation, and add/edit/move/resize/delete transforms now live in `public/chord-chart.js`. `public/app.js` keeps DOM rendering, event handling, practice-state persistence, and playback integration. `tests/chord-chart.test.js` covers the core chart transforms in fast Node tests, reducing the need to use Playwright for every chord editor logic change while preserving the browser integration coverage.

Process note added on 2026-07-07: every implementation or verification task must delete songs/jobs created during testing before the task is considered complete. Keep only intentional demo, fixture, or calibration jobs that are explicitly documented, because accumulated test-created songs make the library noisy for later work.

Fragmentation Cleanup Review was completed on 2026-07-07. Findings:

- No uncommitted completed, incomplete, or ambiguous work was present at review start; `git status --short` was clean.
- `server.js` retains compatibility/fallback paths that look old at first pass but are still intentional: `/api/jobs/:id/piano.wav` supports legacy/practice audio URLs, generated mock jobs still write a root `piano.wav`, and `REAL_SEPARATOR=ffmpeg-spectral` remains the documented lightweight fallback.
- The frontend still uses some older internal names from the pre-unified workspace flow, such as `homeView` and `backToHomeButton`. These are minor naming fragmentation, but renaming them would touch HTML, CSS, JS, and Playwright tests without improving the demo path, so they were left unchanged. The old `?skipUpload=1` processed-demo alias was removed on 2026-07-07.
- Documentation had stale local-state context saying `AGENTS.md` had pre-existing uncommitted edits. The repository is currently clean, so the local-state note was updated instead of preserving obsolete context.
- No runtime code cleanup was high-confidence enough to justify churn during this process task.

Phase 2A spike frame:

- FFmpeg availability: installed locally on 2026-07-06 through Homebrew. `which ffmpeg` returns `/opt/homebrew/bin/ffmpeg`; `ffmpeg -version` reports `ffmpeg version 8.1.2`.
- Local test media: `test-media/phase-2a-source.wav`, a 6-second mono 44.1 kHz WAV generated by `npm run generate:test-media`; `test-media/phase-2g-piano-mix.wav`, a generated 6-second piano/accompaniment mix for the separator spike; `test-media/phase-2h-bar-grid.wav`, a generated four-bar C, Am, F, G fixture with pre-roll; `test-media/phase-2h-multi-chord-120.wav`, a generated 4/4 fixture with multiple chord changes per bar; `test-media/phase-2h-three-four-90.wav`, a generated 3/4 fixture; and `test-media/phase-2h-inversions-100.wav`, a generated inversion fixture where bass avoids the root.
- Copyright/source status: generated in-repo from synthesized sine-wave chord tones; no third-party recording or composition is bundled.
- Exact real-mode output asset: `source-audio.wav` stored inside each real-mode job directory and served at `/api/jobs/<job-id>/source-audio.wav` after completion.
- Real-mode upload/extraction/separation/analysis contract: `PIPELINE_MODE=real` accepts multipart media up to 150 MB through `POST /api/jobs`, stores the uploaded source as `source.<original extension>`, runs FFmpeg extraction to uncompressed `pcm_s16le` `source-audio.wav`, runs Demucs `htdemucs_6s` by default to write `drums`, `bass`, `guitar`, `piano`, `vocals`, and `other` stem WAVs, analyzes `source-audio.wav` for approximate beat/bar grid, key, beat-aware chords, meter, and roman numerals, returns a completed practice-compatible result when processing succeeds, and persists API-visible failures in `job.json` when FFmpeg, the separator, or analysis fails.
- Real-mode progress reporting: API job responses include `pipelineStage`; Demucs stderr percentages are mapped from the separation stage into overall job progress from about 56% to 96%, with completion still reserved for 100%. This is approximate progress, not a reliable ETA.
- Real-mode separator switch: `REAL_SEPARATOR=demucs` is the default; `REAL_SEPARATOR=ffmpeg-spectral` keeps the old FFmpeg spectral split available for lightweight fallback/testing.
- Real-mode dependency setup: `requirements-real.txt` contains optional heavy dependencies; local verification used `.venv-real/bin/demucs`, `demucs==4.0.1`, `torchcodec==0.14.0`, and `TORCH_HOME=.cache/torch`.
- Stem bakeoff fixture: `test-media/MakeYouFeelMyLovePart2.mov` with manual Logic Pro stems under `test-media/stems from logic/`.
- Stem bakeoff command: `npm run bakeoff:stems` imports the Logic baseline and creates the FFmpeg spectral comparison job; `TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs npm run bakeoff:stems -- --demucs` also creates the Demucs `htdemucs_6s` comparison job.
- Current bakeoff library entries:
  - `MakeYouFeelMyLovePart2 - Logic baseline`, job `bb66948a-c060-4898-b879-320eb4c83a0c`, stems `drums`, `bass`, `guitar`, `piano`, `vocals`, `other`
  - `MakeYouFeelMyLovePart2 - FFmpeg spectral`, job `aee1bb76-cf09-462b-aed5-50ca602f443c`, stems `piano`, `accompaniment`
  - `MakeYouFeelMyLovePart2 - Demucs htdemucs_6s`, job `dee5b7c9-aadf-4ff2-9525-2c52cc04c713`, stems `drums`, `bass`, `guitar`, `piano`, `vocals`, `other`
- Success metrics for the first real-mode extraction spike:
  - processing either completes or fails with a clear API-visible error
  - extracted `source-audio.wav` is playable in the browser
  - job metadata records FFmpeg availability, command path or missing-command state, processing timing, source filename/type/size, output filename/size when present, and known limitations
  - `PIPELINE_MODE=mock` behavior and existing mock tests remain unchanged

A possible on-demand context overhead audit is parked in `IDEAS.md`. Context-overhead logging remains off and should only be promoted into the execution plan after an explicit human request or repeated evidence of context loss.

Open Knowledge Format context assessment added on 2026-07-08 in `research/open-knowledge-format-context-assessment.md`. Recommendation: consider OKF-style Markdown frontmatter only for project-context bundles and Codex handoff, not for runtime song/job/practice-state storage. The unscheduled context-bundle spike is parked in `IDEAS.md`. No agents were delegated, no model switch was used, and no runtime jobs or songs were created.

UI system note added on 2026-07-08: the recommendation remains to keep the static HTML/CSS/vanilla JS frontend. Concrete shell and touch improvements now have a defined Phase 5D position in `TASKS.md`; the broader design-system abstraction pass is parked in `IDEAS.md` until repeated maintenance cost justifies it. `ARCHITECTURE.md` documents the frontend direction, and `DECISIONS.md` records Decision 24 to defer React/shadcn/Radix, Ionic, Material, Tailwind, and broad web-component adoption for the current POC phase.

Section-structure research note added on 2026-07-08: repeated song parts such as verse/chorus/bridge are now captured as a planned research/prototype task in `TASKS.md`, with the detailed plan in `research/section-structure-prototype-plan.md`. The recommended order is Flat Sections, Assisted Sections, then only later Linked Sections with local overrides if simpler approaches are insufficient. No agents were delegated for this planning step; use one lead agent until the shared scenario and evaluation criteria are stable, and record any later multi-agent delegation or model switch here.

Section-structure prototype research completed on 2026-07-08 in `research/section-structure-prototype-results.md`. The pass compared Flat Sections, Linked Sections, and Assisted Sections against the same 48-bar Intro / A / B / A' / C / B / Outro scenario. Recommendation: implement Flat Sections first as bar-range labels beside the existing grid-first `practiceState.chordChart`, add Assisted Sections next as non-destructive repeated-range suggestions that create flat labels when accepted, and keep Linked Sections as a deferred research prototype because template/global-edit semantics have the highest edit-scope confusion and would require a new model. No agents were delegated and no model switch was used. No runtime jobs or songs were created.

Flat Sections runnable prototype implemented on 2026-07-08. `practiceState.sections` now stores sanitized flat bar-range labels with `id`, `label`, `symbol`, `startBar`, `endBar`, and `source`; the Harmony panel renders section bands over the existing bar grid; and users can add, rename, and remove section labels without changing chord edit scope. Linked templates/global edits were intentionally not added. Verification passed with `node --check public/app.js`, `node --check server.js`, `node --check tests/gui.spec.js`, `npm test`, focused Playwright coverage for Flat Sections, and full `npm run test:gui` with 21 tests. No agents were delegated and no model switch was used.

Section UX product review planning on 2026-07-08: user feedback identified bugs and next-step workflows for Flat Sections: section symbols cannot be edited after creation, overlapping sections can be created, repeated per-bar section labels create visual noise, section and loop markings should render as continuous ranges between bars, section creation should come from selected bars instead of numeric start/end fields, section ranges should resize by dragging start/end handles, sections should be color-coded, chords should support multi-selection, selected section chords should be copy/pasteable, and chord/section selection should be usable for setting loop start/end. `TASKS.md` now tracks these as Phase 5B work packages in this recommended order: section data hygiene/edit dialog, continuous section/loop rendering, bar selection and section creation, section resize/color coding, chord multi-selection foundation, then chord copy/paste and loop-from-selection. No agents were delegated and no model switch was used.

Phase 5B.1 and Phase 5B.2 implemented on 2026-07-08. Shared pure section helpers now live in `public/section-ranges.js` and are used by both `public/app.js` and `server.js` so frontend validation and backend persistence agree: adjacent ranges are allowed, and overlapping ranges are rejected before persistence. The Harmony UI now opens a compact section edit dialog for `symbol`, `label`, `startBar`, and `endBar`; section bands render as row-chunk overlays instead of repeated per-bar labels; label/edit/delete controls appear only on the first section chunk; double-clicking the visible section range opens edit; and loop display plus loop drag preview use the same row-chunk range treatment while loop handle dragging across rows remains covered. Verification passed with `npm test`, focused Playwright coverage for `flat section|section ranges|loop range`, and full `npm run test:gui` with 22 tests. Test-created jobs were checked after verification; no new `flat-sections-`, `section-ranges-`, or `loop-bars-` entries remained. No agents were delegated and no model switch was used.

Section range validation fix on 2026-07-08: section `symbol` and `label` are now optional so users can rely on visual/color-coded ranges without naming every section. Blank section ranges persist through the same shared frontend/backend helpers, render without visible text, and use an accessible fallback name such as `Section bars 2-3` for controls. The edit dialog no longer raises the old `Add a symbol or label.` validation path for blank section text. Verification passed with `npm test` and focused Playwright coverage for `flat section labels`. Test-created `flat-sections-` jobs were removed by the test cleanup. No agents were delegated and no model switch was used.

Phase 5B.3 implemented on 2026-07-08. Harmony section creation now starts from selected bars in the grid: `Create section` appears only after a bar range is selected, creation asks for symbol, label, and optional color instead of numeric start/end, empty unsectioned bars show a subtle section `+` while section info is visible, and overlapping selected ranges disable creation before persistence. The section-info show/hide preference persists in `practiceState.harmonyView.sectionInfoVisible`. The Harmony row layout now reserves a consistent section-info lane, and Playwright coverage confirms chord cards keep the same height when a row mixes sectioned and unsectioned bars. Verification passed with `node --check public/app.js`, `node --check server.js`, `node --check tests/gui.spec.js`, `npm test`, focused Playwright coverage for `flat section|section ranges|section creation`, and full `npm run test:gui` with 23 tests. Test-created jobs were checked after verification; no new `flat-sections-`, `section-ranges-`, `section-selection-`, or `loop-bars-` entries remained. No agents were delegated and no model switch was used.

Phase 5C.1 implemented on 2026-07-17. Practice-state persistence now snapshots both the target job ID and JSON payload when an edit occurs, serializes PUT requests, flushes pending work before a song switch, and retains a failed pending snapshot instead of silently discarding it. The selected-song header exposes `Saving...`, `Saved`, and `Save failed`; request versions prevent stale responses from changing the visible state for another song. Focused Playwright coverage changes speed and immediately opens another song, confirms the first job retained the change, injects a failed save, and confirms recovery. No agents were delegated and no model switch or skill was used.

Phase 5C.2 implemented on 2026-07-17. `GET /api/jobs` lists every valid persisted `job.json`, while `/api/library` remains completed-only. On page load the browser reconstructs queued, processing, and failed entries, resumes polling active backend work, preserves backend error messages, and offers deletion for failed jobs. Backend coverage verifies active and failed list entries; focused Playwright coverage reloads during mock processing, waits for recovered polling to complete, reloads a deliberately failed real upload, shows its error, and deletes it. No agents were delegated and no model switch or skill was used.

Phase 2I implemented on 2026-07-17 without changing musical chord-decision logic. The PCM reader now covers the full recording while reducing source/stem audio to an approximately 8 kHz mono analysis representation, removing the previous 120-second ceiling with bounded sample-array growth. The frontend/backend working-chart safety cap is 4096 events instead of 128. A 125-second fixture verifies chord cues beyond 120 seconds; frontend and backend tests preserve 160 events; all existing tempo, meter, multi-change, inversion, and local calibration expectations remain unchanged. `TASKS.md` and `ARCHITECTURE.md` now explicitly separate immutable analyzer suggestions from the user's authoritative working chart and defer optional extra-suggestion, comparison, `Back to analysis`, and heuristic-learning behavior to a joint calibration loop. No agents were delegated and no model switch or skill was used.

Roadmap documentation reorganized on 2026-07-17. `TASKS.md` is now a concise chronological execution plan: completed work is ordered by implementation date, and planned work is numbered in intended execution order. Phase IDs are retained as subsystem lineage even when they are not numerically increasing. The next human checkpoint is Phase 2J analyzer/working-chart calibration; Phase 5D is the next independent implementation task, followed by Phase 5B.4-5B.6. Conditional and unscheduled work moved to `IDEAS.md` with promotion triggers, including advanced chord vocabulary, lyrics/melody, chord preview, transposition, saved loops, extra practice targets, Assisted/Linked Sections, broad design-system work, native iOS, waveform correction, and context experiments. Documentation-only change; no runtime tests or jobs were needed. No agents were delegated and no model switch or skill was used.

Variable-tempo planning revised on 2026-07-17 after product review identified unavoidable chord/click drift on recordings that do not hold one constant BPM. Phase 3G.1 is now the next implementation task: a gated zoomable source-waveform editor will reuse bar lines as draggable downbeat anchors, persist an optional user-owned piecewise-linear `practiceState.tempoMap`, expose contextual segment tempo, and route click, chords, timeline, loops, and count-in through one shared musical-time mapping. Phase 2J chord calibration follows once timing is trustworthy. Normal-playback zoom/follow is separated into Phase 3G.2 so it does not expand the first vertical timing slice; it proceeds after the calibration checkpoint or while that human session is waiting. The former parked waveform idea was promoted into `TASKS.md`. Planning only: no runtime code, tests, songs, or jobs changed; no agents were delegated and no model switch or skill was used.

Phase 3G.1 implemented on 2026-07-17. `public/tempo-map.js` normalizes versioned bar/time anchors and provides invertible piecewise-linear beat/time conversion, beat enumeration, and local tempo. Backend jobs now expose separate `waveform.json` assets: real mode derives normalized min/max peaks from `source-audio.wav`, while mock mode generates representative peaks without FFmpeg. The Time panel displays the waveform beneath existing bar lines; `Edit timing` gates edit-only zoom, horizontal scroll/scrub, bar-line drag, anchored-line selection, 0.01-second nudges, correction removal, and full-map reset. Mapped BPM is contextual; editing it moves only the active segment's right anchor, while time-signature and `/2`/`x2` reinterpretation are disabled until reset. Working chords remain grid-first, and timeline, metronome, current-chord timing, loops, Harmony overlays, and count-in now share the tempo map. Verification passed with 27 passing/1 skipped `npm test` cases, focused Playwright timing coverage, all 26 GUI tests, a 390 px no-overflow assertion, and visual inspection of the rendered mobile editor. Test-created timing jobs were removed. Real-song listening with audible drift remains the next human checkpoint. No agents were delegated and no model switch or skill was used.

Changelog process established on 2026-07-17. A new root `CHANGELOG.md` backfills notable app and developer-facing changes from the Git history and the verified outcomes in `TASKS.md`/`STATUS.md`, grouped into dated POC milestones for 2026-07-05, 2026-07-06, 2026-07-07, 2026-07-08, and 2026-07-17. `AGENTS.md` now requires completed implementation iterations to add concise `Added`, `Changed`, `Fixed`, or `Removed` entries under `Unreleased` in the same focused commit; planning-only and routine internal changes are excluded unless they materially affect development. `README.md` links the changelog and clarifies the roles of the main project documents. Documentation-only change; no runtime tests or jobs were needed. No agents were delegated and no model switch or skill was used.

## Current Architecture

Local web POC:

- static browser client
- lightweight Node.js backend
- local filesystem storage under `data/`
- `PIPELINE_MODE=mock` by default
- processed results represented as stems, with piano as the primary practice target
- completed jobs exposed as a reusable processed-song library
- unified workspace shows active uploads, processing jobs, failed jobs, and completed songs in one primary song list
- per-song practice state stored in local `job.json`, including grid overrides, key override, and the user's grid-first chord chart
- `PIPELINE_MODE=real` behind the same pipeline boundary, currently with real upload storage, FFmpeg source-audio extraction, and Demucs `htdemucs_6s` six-stem separation by default
- GUI Mock/Real switch changes the active backend pipeline mode for new jobs in the current server session; `PIPELINE_MODE` remains the startup default
- desktop/wide tablet uses a split view with song list on the left and selected detail/practice on the right
- mobile uses a list-first stack with a back button from detail/practice to the same song list
- beat/bar markers render from an effective grid derived from job `metadata.beatGrid` plus per-song `practiceState.gridOverrides`; the Web Audio metronome clicks against that same effective grid with downbeat accent always on and mute/solo/volume controls in the mixer
- Harmony renders analyzer chords as draft suggestions until `practiceState.chordChart` exists; once present, the user-edited grid-first chart becomes the displayed working chart while `job.result.metadata.chords` remains unchanged for provenance. The Harmony UI is a beat-aligned chart: bars render as rows, beats as cells, and chord cards show the bar/beat where each chord hits rather than a visible start/end time range

## Completed Work

- Created `VISION.md`.
- Created `ARCHITECTURE.md`.
- Created `TASKS.md`.
- Created `RISKS.md`.
- Created `DECISIONS.md`.
- Created `STATUS.md`.
- Created `DEMO.md`.
- Created dependency-light Node.js backend in `server.js`.
- Created static browser client in `public/`.
- Added `package.json` with `npm start` and `npm test`.
- Added mock upload/job API:
  - `GET /api/health`
  - `POST /api/jobs`
  - `GET /api/jobs/:id`
  - `GET /api/jobs/:id/piano.wav`
- Updated mock mode so the browser sends file metadata instead of full video bytes, avoiding failed uploads for large iOS screen recordings.
- Fixed hidden practice panels showing before results were ready.
- Fixed missing static files such as `/favicon.ico` crashing the server.
- Added generated mock piano WAV output.
- Added generated mock drums, bass, guitar, and piano WAV stems.
- Added local mock stem support for ignored demo files `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a`, with generated WAV fallback when either file is missing.
- Added API stem result list and `GET /api/jobs/:id/stems/:stem.wav`.
- Added `.m4a` stem result URLs and `audio/mp4` serving for local demo stems.
- Added mock harmonic metadata with key, chord names, roman numerals, and internal melody data.
- Added synchronized stem playback, per-stem mute/unmute controls, per-stem solo controls, playback speed controls, loop controls, current time display, and current chord highlighting.
- Added a Node backend smoke test for mock job creation, completion, stems, and harmonic metadata.
- Added Playwright GUI smoke coverage for the mock upload-to-practice happy path.
- Added `npm run test:gui` and Playwright configuration for local browser verification.
- Added stable GUI test hooks with `data-testid` attributes.
- Added processed demo shortcut:
  - `GET /api/demo/processed-job`
  - `/?demo=processed`
- The processed demo shortcut creates a complete mock job and jumps directly to the practice view without selecting or uploading a file.
- Completed Phase 0 automated verification:
  - `npm test` passed on 2026-07-05.
  - `npm run test:gui` passed on 2026-07-05.
- Added a phased forward roadmap in `TASKS.md`:
  - Phase 1: processed-song library and saved practice state.
  - Phase 2: first real-pipeline spike.
  - Phase 3: musical grid calibration and editable chords.
  - Phase 4: bar-based loops and practice notes.
  - Phase 5: expanded practice targets.
  - Phase 6: native iOS feasibility spike.
- Expanded Phase 2 into subphases 2A-2F, starting with FFmpeg audio extraction before any heavy ML integration.
- Completed Phase 2A spike framing:
  - initially confirmed FFmpeg was unavailable locally
  - chose/generated `test-media/phase-2a-source.wav` as the non-copyright local sample
  - defined `source-audio.wav` as the first real-mode output asset
  - documented success metrics for Phase 2B/2C
- Installed FFmpeg locally through Homebrew on 2026-07-06 for the Phase 2 real-mode extraction spike.
- Completed Phase 2B real-mode upload and job contract:
  - real mode accepts multipart uploads through `POST /api/jobs`
  - source media is stored under each job directory as `source.<original extension>`
  - real jobs expose queued, processing, and failed states through `GET /api/jobs/:id`
  - failures are persisted in `job.json` and returned as `error` through the API
  - mock-mode metadata-only upload remains unchanged
- Added `tests/real-mode-upload.test.js` covering real-mode multipart upload with isolated `DATA_DIR`, persisted source media, API-visible failure, and persisted failure metadata.
- Completed Phase 2C through Phase 2F:
  - real mode invokes FFmpeg through `FFMPEG_PATH` or `ffmpeg`
  - successful real-mode jobs extract source audio to `source-audio.wav`
  - the extracted source audio was exposed as a practice-compatible `Extracted source audio` stem during the extraction-only spike, before Phase 2G replaced the public real-mode result with piano/accompaniment stems
  - FFmpeg command availability, extraction time, output filename, and output size are recorded in job metadata
  - missing FFmpeg produces an API-visible failed job with an actionable setup error
  - `npm test` covers missing-FFmpeg failure without requiring FFmpeg, and runs the extraction smoke when FFmpeg is available
- Completed Phase 2G piano-focused real stem-separation spike:
  - real mode now feeds `source-audio.wav` into `ffmpeg-spectral-piano-v1`
  - the separator writes `stems/piano.wav` and `stems/accompaniment.wav`
  - real-mode completed jobs now expose `Piano` and `Accompaniment` stems through the same browser player as mock jobs
  - job metadata records separator name, FFmpeg version line, command/filter graph, runtime, output files, output sizes, and limitations
  - `npm run generate:test-media` now generates `test-media/phase-2g-piano-mix.wav`
  - direct FFmpeg smoke on the 6-second generated sample measured about `0.06s` extraction time and `0.05s` separation time
  - subjective listening was not completed in this Codex run and remains required
- Added a GUI Mock/Real pipeline mode switch:
  - `PIPELINE_MODE` remains the startup default
  - the GUI switch updates the active backend mode for new jobs in the current server process
  - existing jobs retain the mode they were created with
- Fixed a GUI mode-switch race where a stale startup `/api/health` response could render `mock` after the user clicked `Real`; invalid pipeline-mode JSON now returns a clear 400 response instead of a generic 500.
- Documented native iOS transition criteria in `ARCHITECTURE.md`.
- Added processed-song library API:
  - `GET /api/library`
  - `PUT /api/jobs/:id/practice-state`
  - `PUT /api/jobs/:id/rename`
  - `DELETE /api/jobs/:id`
- Added local `DATA_DIR` override support for isolated backend tests.
- Added processed-song library UI listing completed jobs.
- Added library preview playback before opening the full practice view.
- Added library open, rename, and delete actions.
- Added per-song learning status values: `not_started`, `practicing`, and `learned`.
- Added per-stem volume sliders.
- Added persisted practice state for mute/solo, volume, playback speed, loop points, loop enabled state, learning status, and last playback position.
- Fixed saved loop-end restoration so audio metadata loading does not overwrite a user's persisted loop end.
- Added backend coverage for library listing, practice-state persistence, rename, reopen, and delete.
- Added Playwright coverage for processing a song, reloading into the library, previewing before opening, reopening, persisting state, renaming, and deleting.
- Documented the Phase 1 storage decision in `DECISIONS.md`.
- Added home/all-songs/practice view separation so upload and library controls do not distract inside the practice view.
- Added multi-file upload queue UI with per-file progress; completed uploads stay on home instead of opening practice automatically.
- Added `lastOpenedAt` tracking during Phase 1, then removed it from the active API/UI on 2026-07-06 so the unified song list displays and sorts completed songs by `createdAt`.
- Added All songs learning-status filters for `All`, `Not started`, `Practicing`, and `Learned`.
- Removed redundant `complete` status badges from completed library cards.
- Fixed practice-view back navigation so songs opened from All songs return to the processed-song list, while songs opened from Recent still return home.
- Refined `VISION.md` validation criteria into an OKR-style objective with key results for learning speed, perceived value, motivation, empowerment, transfer learning, error tolerance, return intent, and adoption threshold.
- Added `UX_FLOOR_PLANS.md` with three floor plans for a Voice Memos-inspired unified song workspace.
- Documented the unified song workspace direction in `ARCHITECTURE.md`, `TASKS.md`, and `DECISIONS.md`.
- Implemented Phase 1B unified song workspace UX:
  - Replaced separate home, Recent, All songs, and practice destinations with one primary song workspace.
  - Added a status-first song list containing active uploads, processing jobs, failed jobs, and completed songs.
  - Added desktop split view with the song list on the left and selected detail/practice on the right.
  - Added mobile list-first stack with a back button from selected detail/practice to the list.
  - Made full song rows select/open songs.
  - Moved rename/delete to the selected-song header.
  - Kept completed uploads from auto-opening after processing.
  - Preserved saved practice state, learning status, stem controls, speed, loop, and harmonic cue behavior.
- Fixed Pause -> Play resume behavior so stem audio continues from the paused timeline position instead of restarting near the beginning while the visual playhead continues.
- Combined file selection and upload into one `Upload` button: selecting files from the picker immediately queues/uploads them.
- Changed completed song rows and selected-song metadata to use creation time instead of last-opened or updated time, and removed the obsolete `/api/jobs/:id/opened` endpoint from the active API.
- Removed the 980px list-over-player breakpoint; the only viewport breakpoint now switches from split list/detail to mobile list/detail navigation at 820px.
- Made the practice grid stack by available detail width, so processed-result is no longer squeezed beside harmony when the sidebar is still visible.
- Kept stem controls in a consistent name/volume/mute/solo row at desktop and mobile widths, with narrower minimums to avoid mobile overflow.
- Moved each stem volume slider and M/S controls below the stem title to prevent overlap with longer stem names.
- Completed the initial Phase 2H real harmonic-analysis spike:
  - Added a dependency-free PCM16 WAV reader for `source-audio.wav`.
  - Added broad onset-energy beat estimation with a conservative half-time correction to avoid over-fine subdivision grids.
  - Added a 4/4 beat/bar grid contract in result metadata.
  - Added downbeat-phase estimation so bar 1 can start after file start when the recording has pre-roll before the first downbeat.
  - Added bar-length chroma scoring with low-frequency root evidence against a conservative vocabulary: major, minor, dominant 7, minor 7, major 7, sus2, sus4, and diminished.
  - Added key estimation and roman-numeral generation from the estimated key.
  - Real-mode jobs now return `harmonySource: "real-audio-analysis-v1"` instead of mock harmonic metadata.
  - Chord metadata now includes `bar`, `beat`, `confidence`, and `source`; job metadata includes `beatGrid`, `beatOffsetSeconds`, `downbeatOffsetSeconds`, `downbeatConfidence`, `analysisSource`, and `analysis`.
  - The Harmony chart displays bar/beat chord hit placement when `bar` and `beat` are present.
  - `npm run generate:test-media` now generates `test-media/phase-2h-bar-grid.wav` with 0.65 seconds of pre-roll before the first downbeat.
  - Real-mode backend tests generate missing synthetic test media automatically before upload, so ignored generated fixtures do not break a clean checkout.
- Hardened Phase 2H against local calibration job `f9e9cf9d-0998-494d-82cf-3dc89fcf4d76`:
  - Short clips that start with audio and fit an integer number of 4/4 bars can now win tempo selection over false subharmonic onset correlations.
  - The analyzer uses non-drum stems as supporting evidence: bass/accompaniment for root evidence and other/accompaniment/guitar/piano for chord-quality evidence, with quiet stems ignored.
  - Weakly supported 7/maj7 chord extensions are simplified back to useful triad labels.
  - Real analysis now emits one chord cue per bar instead of merging repeated adjacent chord names.
  - The same local job's persisted `job.json` was refreshed so reopening it shows 106 BPM, 4/4, downbeat 0:00, and C, Dm, Am, Am, C, Dm, Am, Am.
- Hardened Phase 2H after manual inspection found half-tempo behavior and missed chord changes:
  - Real analysis now runs `beat-aware-chroma-v2`, scoring beat-length segments instead of only whole bars.
  - Adjacent repeated labels are merged within each bar, but repeated labels across bar boundaries are preserved.
  - The analyzer can emit multiple chord cues inside a 4/4 bar when evidence supports changes on beat 1/3 or individual beats.
  - Beat-grid estimation now considers 3/4 as a limited POC meter candidate and records `beatGrid.meterCandidates` for inspection.
  - Bass root weighting was reduced and bass chord-tone support was added so inverted bass notes are less likely to overwrite the harmonic root.
  - `npm run generate:test-media` now creates known-answer fixtures for 120 BPM multiple-chords-per-bar, 90 BPM 3/4, and 100 BPM inversion-bass cases.
- Reprioritized the next product phase toward editable musical structure:
  - Chord analysis is now treated as a draft chart, not a canonical truth source.
  - Phase 3 is now Musical Grid Calibration and Editable Chords.
  - The next UI should make the analyzed grid audible with a metronome/click so users can quickly correct bar 1, tempo, time signature, and offset.
  - User-entered chord labels should persist as the song's working chord chart and override analyzer suggestions.
- Aligned Markdown phase references after the Phase 2 / Phase 3 roadmap order change:
  - earlier stale references were corrected when notes and multiple named practice loops moved out of the immediate Phase 2 scope.
  - `TASKS.md` was later reprioritized so Phase 3 is grid calibration/editable chords and Phase 4 is bar-based loops/practice notes.
- Completed Phase 3A grid-audition pass:
  - Mock metadata now includes a 60 BPM, 4/4 beat grid so the processed demo can exercise grid UI without real-mode analysis.
  - The practice view renders beat and bar markers from `metadata.beatGrid`.
  - A Web Audio metronome can click against the same grid while playback runs, with downbeat accent, on/off, and volume controls.
  - Metronome enabled/volume/accent settings persist in each song's `practiceState`.
  - Existing chord labels remain analyzer suggestions; user correction controls and editable chords are still planned.
- Completed Phase 3B correction pass:
  - Transport, current/total time, speed controls, playhead, and loop markers are grouped around one timeline.
  - A Back to start transport button resets playback to 0:00.
  - Time signature is now a dropdown with 4/4, 3/4, 5/4, 6/8, 7/8, and 12/8; `beatUnit` persists with the meter override.
  - Grid offset was removed from the active UI; Bar 1 start and BPM are the correction controls for timing.
  - Key is editable with natural, sharp, and flat spellings for major/minor keys; roman numerals update from the selected key.
  - Loop count-in has a first-pass 1-bar option that schedules clicks before loop audio starts, including when loop start is 0.
  - Bar 1 start accepts negative values down to -60 seconds for recordings that begin just after the first downbeat.
  - Metronome/click is represented as a mixer row with mute, solo, and volume; downbeat accent is always on.
  - Stem/mixer rows now keep stable height when mute/solo state changes.
- Completed product-review UI cleanup after Phase 3B:
  - Deleted local historical runtime jobs under `data/jobs`.
  - Removed the old `?skipUpload=1` processed-demo alias from the frontend.
  - Moved learning status into the selected-song header.
  - Moved Rename/Delete under a selected-song more menu.
  - Removed user-facing `Processed result`, `Learning cues`, `Ready`, and `Offset` labels from the practice UI.
  - Split the practice view into Time, Harmony, and Stems/Mixer sections.
  - Moved Loop next to the timeline and only shows Start, End, and Count in controls while Loop is enabled.
- Completed Phase 3C editable chord chart:
  - Harmony chord cues now render as editable fields.
  - Users can add, edit, split, merge, move, and delete chord labels.
  - User chord edits originally persisted as `practiceState.chordEdits`; Phase 3D superseded this with `practiceState.chordChart`.
  - User chord edits override analyzer suggestions in the working chart while analyzer metadata remains unchanged.
  - Free-text chord labels are accepted and roman numerals are recalculated best-effort from the selected key.
  - GUI test teardown now deletes jobs created by the known Playwright test filename prefixes so local libraries stay cleaner after verification.
  - Fixed scheduled metronome clicks being allowed to continue after pause or across a loop jump.
  - Gave Play/Pause a fixed-width icon button and kept Back to start as a fixed-width icon button.
  - Persisted browser-extracted video thumbnails and displays them in song rows and the selected-song header.
  - Added container-width stacking so the timeline and mixer do not overflow the detail pane at tablet widths.
- Completed Phase 3D grid-first chord chart model:
  - New jobs default to `practiceState.chordChart: null` instead of `practiceState.chordEdits`.
  - Backend `PUT /api/jobs/:id/practice-state` accepts and normalizes `practiceState.chordChart` with `version`, `divisionsPerQuarter`, and chord events containing `id`, `bar`, `offsetDiv`, `durationDiv`, `raw`, and `source`.
  - The frontend seeds a user chart from analyzer suggestions on first edit, then stores chord positions in bars/divisions while deriving `start`, `end`, display beat, and roman numerals from the corrected grid and selected key.
  - Changing BPM or Bar 1 start updates internal derived cue seconds while preserving each chord's displayed musical `bar`, `offsetDiv`, and `durationDiv`.
  - Analyzer metadata remains unchanged in `job.result.metadata.chords` for provenance.
  - Deleted five undocumented local runtime jobs under `data/jobs` after verification because they predated the grid-first chart model and were not documented fixtures, demo jobs, or calibration jobs.
- Completed Phase 3E beat-aligned chord chart UI:
  - Replaced the flat Harmony cue list with bar rows and responsive beat cells.
  - Chord cards now show hit-point labels such as `Bar 1 · Beat 1` instead of visible start/end timecode.
  - Chord duration is intentionally implicit until the next chord for the POC reading view.
  - Existing add, edit, split, merge, move, delete, roman-numeral, persistence, and current-chord highlighting behavior remains on the same grid-first chart model.
  - Layout probing at 1180px, 820px, and 390px found no horizontal overflow.
- Completed Phase 3F compact chord chart editor:
  - Removed per-card bar/beat labels, beat-number headers, split/merge buttons, arrow move buttons, and the global Add chord button.
  - Chord cards now show only name/roman content according to a persisted `View` control, with modes for both, name only, or roman only.
  - A persisted `Bars / row` control supports 1, 2, 4, and 8 bars per row so longer songs can be scanned more compactly.
  - Each bar is shown as a compact segment with a small numeric marker instead of a separate `Bar N` label column.
  - Empty cells expose `+` buttons for adding chords; drag/drop moves chords to beat positions; a small corner `x` deletes chords.
  - Chord cards visually span following empty beat cells when their duration implies the chord still applies.
  - Chord cards can be resized from the right edge, snapping to beat boundaries, so a long chord can be shortened before inserting a new chord in a previously covered cell.
  - `practiceState.harmonyView` stores `barsPerRow` and `chordDisplay`.
  - The requested chord preview button and generated chord-instrument stem were deliberately split into a later task because they require audio synthesis/playback integration, not only chart UI.

## In Progress

- No implementation task is currently in progress.

## Next Recommended Task

Run the Phase 3G.1 human checkpoint on a real recording with audible tempo drift. Align important downbeats, then listen through click, chord changes, a bar loop, and repeated count-in before deciding whether sparse linear interpolation is sufficient.

If the checkpoint passes, continue with Phase 2J analyzer/working-chart calibration. If human review is waiting, Phase 3G.2 normal-playback zoom/follow is the next independent implementation task.

## Skills Used

- Used Codex skill `openai-docs` on 2026-07-06 to verify current Codex guidance for custom prompts/slash commands before creating personal prompt `~/.codex/prompts/commit.md`.
  - Purpose: decide whether a personal `/commit`-style workflow should be implemented as a Codex custom prompt.
  - Result: personal command should be invoked as `/prompts:commit`; custom prompts are documented as deprecated in favor of skills, but remain practical for this local workflow.
  - Reproducibility: the workflow can be reproduced without the skill by following the prompt file contents.

## Agent and Model Use

- No delegated agents used.
- No model switch performed.
- Main Codex session is being used for planning and implementation.

## Known Local State

- Working tree was clean at the start of the Fragmentation Cleanup Review on 2026-07-07.
- Working tree was clean at the start of the chord-chart maintainability refactor on 2026-07-07.
- Local `data/jobs` contains manual/runtime jobs for `TeAmo.mov`, `Stem-generator_1.aif`, and `MakeYouFeelMyLovePart2.mov`, plus one local `job.json` that currently fails JSON parsing. These were not created by the compact Harmony verification run and were not deleted.

## Verification Log

- `node --check public/app.js`, `node --check public/chord-chart.js`, `node --check public/tempo-map.js`, `node --check server.js`, and `node --check tests/gui.spec.js`: passed on 2026-07-17 for Phase 3G.1.
- `npm test`: passed on 2026-07-17 with 27 passing tests and 1 skipped local calibration test, including tempo-map inversion/segment tests, waveform contracts in mock/real mode, persisted anchor validation, and variable-map chord timing.
- `npx playwright test tests/gui.spec.js -g "waveform timing editor"`: passed on 2026-07-17, including downbeat drag, 40 BPM contextual segment calculation, chord timing at the mapped boundary, mapped bar loop seconds, persistence/reload, and 390 px no-overflow coverage.
- `npm run test:gui`: passed on 2026-07-17 with all 26 Playwright tests in about 1.8 minutes.
- Chromium screenshot inspection at 390 px confirmed the zoomed waveform, bar lines, contextual BPM, disabled reinterpretation controls, loop controls, Harmony, and mixer render without page-level horizontal overflow.
- `node --check public/app.js` and `node --check tests/gui.spec.js`: passed on 2026-07-08 after changing loop start/end to bar controls and adding Harmony loop handles.
- `npm test`: passed on 2026-07-08 with 18 passing backend tests and 1 skipped local calibration test after the bar-based loop update.
- `npx playwright test tests/gui.spec.js -g "loop range|processed song library"`: initially found loop-start normalization and handle stacking bugs; passed after preserving the edited start bar and putting loop handles above chord cards.
- `npm run test:gui`: passed on 2026-07-08 with 20 Playwright tests after bar-based loop controls, repeated count-in, and Harmony loop dragging.
- `npm test`: passed on 2026-07-07 with 18 passing tests and 1 skipped local calibration test after extracting chord-chart logic into `public/chord-chart.js`; the new pure chord-chart transform tests run in milliseconds.
- `npm run test:gui`: initially failed once in the pre-existing slow `unified song list shows completed songs and filters by learning status` test because a sequential mock job was still `processing` at timeout; the targeted rerun passed in 24.5s, and a second full `npm run test:gui` passed with 18 Playwright tests in about 1.1 minutes.
- `rg -l "screen-recording-|editable-chords-|resize-chords-|delete-last-chord-|recent-|queue-first-|queue-second-|mobile-workspace-|phase-one-library-|Renamed Phase 1 song|demo-processed-screen-recording" data/jobs`: found no leftover test-created job files after verification.
- `node --check public/app.js` and `node --check tests/gui.spec.js`: passed on 2026-07-07 after replacing Harmony time ranges with bar/beat chord grid labels.
- `npx playwright test tests/gui.spec.js -g "harmony panel shows analysis tempo|harmony chord beat labels|editable chord chart"`: passed on 2026-07-07 with 3 focused GUI tests after adding the beat-aligned Harmony chart.
- `npm test`: passed on 2026-07-07 with 11 backend tests and 1 skipped local calibration test after the Phase 3E Harmony chart UI change.
- `npm run test:gui`: passed on 2026-07-07 with 16 Playwright tests after the Phase 3E Harmony chart UI change.
- `npm test`: passed on 2026-07-07 with 11 backend tests and 1 skipped local calibration test after adding compact Harmony chart settings and persistence.
- `npx playwright test tests/gui.spec.js -g "harmony panel|manual grid|editable chord chart"`: passed on 2026-07-07 with 3 focused GUI tests covering compact chart rendering, display settings, add via empty cell, drag/drop movement, delete, and persistence.
- `npm run test:gui`: passed on 2026-07-07 with 16 Playwright tests after the compact Harmony chart editor change.
- `npm test`: passed on 2026-07-07 with 11 backend tests and 1 skipped local calibration test after adding beat-snapped chord-card resizing.
- `npx playwright test tests/gui.spec.js -g "editable chord chart|chord cards can be resized"`: passed on 2026-07-07 after confirming resize/delete controls do not overlap.
- `npx playwright test tests/gui.spec.js`: passed on 2026-07-07 with 17 Playwright tests after adding chord-card resizing and covered-cell insertion coverage.
- Playwright layout probe against `http://127.0.0.1:3001/?demo=processed`: passed on 2026-07-07 at 1180px, 820px, and 390px with no horizontal overflow after adding responsive Harmony bar/beat rows.
- `node --check server.js`, `node --check tests/real-mode-upload.test.js`, and `npm test`: passed on 2026-07-07 after increasing the real-mode upload limit to 150 MB and adding a 413 oversized-upload contract test. `npm test` reported 11 passing backend tests and 1 skipped local calibration test.
- `npm run test:gui`: passed on 2026-07-07 with 16 Playwright tests after the Phase 3D grid-first chord chart model.
- `npm test`: passed on 2026-07-07 with 11 backend tests after replacing seconds-first `practiceState.chordEdits` with grid-first `practiceState.chordChart`.
- `npx playwright test tests/gui.spec.js -g "editable chord chart"`: passed on 2026-07-07 after verifying chart persistence, analyzer provenance, and stable `bar`/`offsetDiv`/`durationDiv` through BPM and Bar 1 changes.
- `npm test`: passed on 2026-07-07 with 11 backend tests after adding `practiceState.chordEdits` persistence for the editable chord chart.
- `npx playwright test tests/gui.spec.js -g "editable chord chart"`: passed on 2026-07-07 after fixing the Harmony/Mixer layout overlap at desktop detail widths.
- `npm run test:gui`: passed on 2026-07-07 with 16 Playwright tests after adding editable chord add/edit/split/merge/move/delete coverage and GUI test job cleanup for known test filename prefixes.
- `npm test`: passed on 2026-07-07 with 11 backend tests after allowing negative Bar 1 start persistence and adding pre-roll count-in transport behavior.
- `npx playwright test tests/gui.spec.js -g "beat grid timeline|loop count-in|processed song library"`: passed on 2026-07-07 with 3 focused GUI tests covering grid correction, count-in before audio start, and persisted negative Bar 1 start.
- `npm run test:gui`: passed on 2026-07-07 with 15 Playwright tests after adding loop count-in pre-roll and negative Bar 1 start support.
- `npm test`: passed on 2026-07-07 with 11 backend tests after the Phase 3B product-review UI cleanup, thumbnail persistence, metronome cancellation fix, and local `data/jobs` cleanup.
- `npm run test:gui`: passed on 2026-07-07 with 13 Playwright tests after moving learning status, loop controls, Rename/Delete, and thumbnail rendering into the revised UI.
- Playwright layout probe against `http://127.0.0.1:3002/?demo=processed`: passed on 2026-07-07 at 1180px, 900px, and 390px with no horizontal overflow after adding detail-width stacking for the practice grid; Play/Pause measured as fixed 54px wide.
- `npm test`: passed on 2026-07-07 with 11 backend tests after updating Phase 3B practice-state fields for key override, beat unit, count-in, and metronome solo.
- `npm run test:gui`: passed on 2026-07-07 with 12 Playwright tests after regrouping transport/timeline controls, removing grid offset UI, adding key/time-signature selects, loop markers/count-in, and metronome mixer controls.
- Playwright layout probe against `http://127.0.0.1:3003/?demo=processed`: passed on 2026-07-07 at 1100px and 390px with no horizontal overflow; piano stem row height stayed stable before/after mute at both widths.
- `npm test`: passed on 2026-07-07 with 11 backend tests after Fragmentation Cleanup Review documentation updates. No runtime behavior was changed, so `npm run test:gui` was not run.
- `node --check server.js` and `node --check public/app.js`: passed on 2026-07-07 after adding Phase 3A beat-grid timeline and Web Audio metronome controls.
- `npm test`: passed on 2026-07-07 with 11 backend tests after adding mock beat-grid metadata and persisted metronome practice-state fields.
- `npx playwright test tests/gui.spec.js -g "beat grid timeline"`: passed on 2026-07-07 after adding browser coverage for grid markers and metronome click scheduling.
- `npm run test:gui`: passed on 2026-07-07 with 12 Playwright tests after adding Phase 3A grid-audition UI and persistence coverage.
- `node --check server.js` and `node --check tests/real-mode-upload.test.js`: passed on 2026-07-07 after hardening Phase 2H against the local `f9e9cf9d` calibration job.
- Direct analyzer check on `data/jobs/f9e9cf9d-0998-494d-82cf-3dc89fcf4d76/source-audio.wav`: returned 106 BPM, 4/4, downbeat 0:00, and C, Dm, Am, Am, C, Dm, Am, Am.
- `npm test`: passed on 2026-07-07 with 8 backend tests, including the generated pre-roll bar-grid regression and a local-skip calibration regression for `f9e9cf9d`.
- `npm run generate:test-media`: regenerated Phase 2H known-answer fixtures on 2026-07-07 after adding multi-chord, 3/4, and inversion-bass coverage.
- `npm test`: passed on 2026-07-07 with 11 backend tests after adding `beat-aware-chroma-v2`, generated harmonic-analysis fixtures, 3/4 POC meter handling, and inversion-bass root hardening.
- `npm run generate:test-media`: generated both `test-media/phase-2a-source.wav` and `test-media/phase-2g-piano-mix.wav` after adding the Phase 2G synthetic piano/accompaniment sample.
- `npm run generate:test-media`: generated `test-media/phase-2a-source.wav`, `test-media/phase-2g-piano-mix.wav`, and `test-media/phase-2h-bar-grid.wav` after adding the Phase 2H bar-grid/chord-analysis fixture.
- `node --check server.js`, `node --check public/app.js`, `node --check scripts/generate-phase2a-test-media.js`, and `node --check tests/real-mode-upload.test.js`: passed after adding Phase 2H analysis code, UI bar labels, generated test media, and backend coverage.
- `npm test`: passed on 2026-07-06 with 7 backend tests after adding first-pass real harmonic analysis and bar-grid regression coverage.
- `npm run test:gui`: passed on 2026-07-06 with 10 Playwright tests after adding bar-aware chord cue display.
- `node --check server.js`, `node --check scripts/generate-phase2a-test-media.js`, and `node --check tests/real-mode-upload.test.js`: passed on 2026-07-07 after adding downbeat-offset estimation and pre-roll test media.
- `npm run generate:test-media`: regenerated the Phase 2H fixture on 2026-07-07 with 0.65 seconds of pre-roll before first downbeat.
- `npm test`: passed on 2026-07-07 with 7 backend tests, including a regression that expects `downbeatOffsetSeconds` near 0.65 and the first chord cue to start at the downbeat instead of 0:00.
- `node --check public/app.js` and `node --check tests/gui.spec.js`: passed on 2026-07-07 after adding BPM display and sub-second chord cue formatting.
- `npx playwright test tests/gui.spec.js -g "harmony panel shows analysis tempo"`: passed on 2026-07-07.
- `npm test`: passed on 2026-07-07 with 7 backend tests after the BPM/cue-time UI change.
- `npm run test:gui`: passed on 2026-07-07 with 11 Playwright tests, including coverage that analysis BPM is visible and `0.65s` cue starts display as `0:00.7` instead of `0:00`.
- `npm run bakeoff:stems`: created/updated Logic baseline and FFmpeg spectral bakeoff jobs for `test-media/MakeYouFeelMyLovePart2.mov`.
- `.venv-real/bin/python -m pip install demucs`: installed Demucs 4.0.1 plus Torch/Torchaudio in local `.venv-real` after network approval.
- Demucs first run downloaded `htdemucs_6s` model weights to `.cache/torch`; initial WAV saving failed until `torchcodec` was installed.
- `.venv-real/bin/python -m pip install torchcodec`: installed TorchCodec 0.14.0 in local `.venv-real`.
- `TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs npm run bakeoff:stems -- --demucs`: created/updated the Demucs `htdemucs_6s` bakeoff job for `test-media/MakeYouFeelMyLovePart2.mov`.
- Stem URL probes against `http://127.0.0.1:3002` returned HTTP 200 for Logic piano, FFmpeg accompaniment, Demucs piano, and Demucs bass stems.
- Human listening result: Demucs is accepted as good enough for the POC because piano removal/play-along works well enough; solo piano has crackle/artifacts and should not be treated as high-quality isolated piano.
- `node --check server.js`, `node --check public/app.js`, `node --check tests/backend.test.js`, `node --check tests/real-mode-upload.test.js`, and `node --check tests/gui.spec.js`: passed after adding media-duration metadata, browser-read upload duration, and song-list duration labels that prefer it over harmonic cue length.
- `npm test`: passed on 2026-07-06 with 6 backend tests after adding mock-upload and real-mode duration metadata coverage.
- `npx playwright test tests/gui.spec.js -g "song duration labels prefer media metadata"`: passed on 2026-07-06 after adding the song-list duration regression test.
- `npm run test:gui`: passed on 2026-07-06 with 10 Playwright tests after adding the song-list duration regression test.
- `node --check server.js`, `node --check public/app.js`, and `node --check tests/real-mode-upload.test.js`: passed after adding Demucs stderr progress parsing and pipeline-stage labels.
- `npm test`: passed on 2026-07-06 with 6 backend tests after adding fake-Demucs progress coverage for a processing job progressing past 55% before completion.
- `npm run test:gui`: passed on 2026-07-06 with 9 Playwright tests after adding processing-stage labels to the upload queue UI.
- `node --check server.js`: passed after making Demucs the default real-mode separator and retaining `REAL_SEPARATOR=ffmpeg-spectral`.
- `node --check tests/real-mode-upload.test.js`: passed after adding a fake-Demucs contract test.
- `npm test`: passed on 2026-07-06 with 6 backend tests covering mock flow/library/practice state, missing-FFmpeg failure, FFmpeg fallback separation, and Demucs six-stem contract.
- Real Demucs end-to-end server smoke on 2026-07-06: `PIPELINE_MODE=real DEMUCS_PATH=.venv-real/bin/demucs TORCH_HOME=.cache/torch` uploaded `test-media/phase-2g-piano-mix.wav`, completed job `759fcd54-55ea-483e-b376-8d43a1cea64c` with `drums,bass,guitar,piano,vocals,other`, and served `stems/piano.wav` with HTTP 200.
- `node --check server.js`: passed after Phase 2G real-mode FFmpeg spectral separator changes.
- `node --check scripts/generate-phase2a-test-media.js`: passed after extending the generator for Phase 2G media.
- `node --check tests/real-mode-upload.test.js`: passed after updating real-mode coverage for piano/accompaniment separated stems.
- `node --check server.js`, `node --check scripts/build-stem-bakeoff.js`, and `node --check tests/real-mode-upload.test.js`: passed after making `source-audio.wav` explicitly uncompressed PCM and adding `/api/jobs/<job-id>/source-audio.wav`.
- `npm test`: passed on 2026-07-06 with 6 backend tests after adding source-audio HTTP coverage.
- `node --check server.js`, `node --check public/app.js`, `node --check tests/backend.test.js`, and `node --check tests/gui.spec.js`: passed after fixing delayed song-duration loading.
- `npm test`: passed on 2026-07-06 with 6 backend tests after adding byte-range coverage for stem audio responses.
- `npm run test:gui`: passed on 2026-07-06 with 9 Playwright tests after removing the 16-second player fallback and adding delayed-duration GUI coverage.
- `npm test`: passed on 2026-07-06 with 5 backend tests covering mock flow/library/practice state, missing-FFmpeg failure, and real-mode FFmpeg extraction plus `ffmpeg-spectral-piano-v1` stem creation when FFmpeg is available.
- `npm run test:gui`: passed on 2026-07-06 with 8 Playwright tests after Phase 2G, confirming the mock workspace and practice controls still work.
- Direct FFmpeg Phase 2G smoke on `test-media/phase-2g-piano-mix.wav`: extraction to `/tmp/piano-poc-2g-smoke/source-audio.wav` passed in `real 0.06s`; spectral split to `/tmp/piano-poc-2g-smoke/piano.wav` and `/tmp/piano-poc-2g-smoke/accompaniment.wav` passed in `real 0.05s`; all three files were `529278` bytes.
- Manual server smoke through an ad hoc child process did not become ready in this sandbox despite the same path passing under `npm test`; this was not treated as a product blocker because the automated real-mode server test passed.
- Phase 2A on 2026-07-06: `command -v ffmpeg` returned no path; `ffmpeg -version` failed with `command not found`.
- FFmpeg install on 2026-07-06: `brew install ffmpeg` installed `/opt/homebrew/bin/ffmpeg`; `ffmpeg -version` reports `ffmpeg version 8.1.2`.
- FFmpeg smoke check on 2026-07-06: `ffmpeg -hide_banner -y -i test-media/phase-2a-source.wav -t 1 /tmp/piano-practice-ffmpeg-smoke.wav` passed and produced a 1-second WAV output.
- `npm run generate:test-media`: generated `test-media/phase-2a-source.wav`.
- `node --check scripts/generate-phase2a-test-media.js`: passed after adding the Phase 2A media generator.
- `file test-media/phase-2a-source.wav`: confirmed RIFF/WAVE PCM, 16-bit mono, 44.1 kHz.
- `npm test`: passed on 2026-07-06 with 3 backend tests after Phase 2A framing and test-media generation.
- Documentation-only Phase 2 planning update on 2026-07-06; no code verification run.
- `node --check server.js`: passed after upload/list/layout correction work.
- `node --check public/app.js`: passed after upload/list/layout correction work.
- `node --check tests/gui.spec.js`: passed after updating GUI coverage for auto-upload and creation-time sorting.
- `npm test`: passed on 2026-07-06 with 3 backend tests after upload/list/layout correction work.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests after upload/list/layout correction work.
- Manual Playwright viewport probe against `http://127.0.0.1:3002/?demo=processed`: at 980px the sidebar and detail/player remained side by side; at 390px no horizontal overflow was detected and stem controls stayed in name/slider/button order.
- `node --check public/app.js`: passed after moving stem slider/buttons below the title.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests after moving stem slider/buttons below the title.
- Manual Playwright viewport probe against `http://127.0.0.1:3002/?demo=processed`: at 980px, 820px, and 390px each stem name rendered above the slider/buttons, with no horizontal overflow.
- Markdown consistency audit on 2026-07-06: searched project Markdown for Phase 2 / Phase 3, first real-pipeline, problem areas, and practice-notes references; corrected stale references in `ARCHITECTURE.md` and `TASKS.md`. Documentation-only change; no code tests run.
- Roadmap correction on 2026-07-06: added explicit Phase 2G real stem-separation and Phase 2H first real audio-analysis tasks after the FFmpeg extraction spike. This was documentation-only; no code tests run.
- Phase 2H strategy update on 2026-07-06: documented whole-song harmonic analysis as a multi-source estimate using full mix, bass/low-frequency root evidence, and piano/guitar/accompaniment chord-quality evidence. This was documentation-only; no code tests run.
- `node --check server.js`: passed after Phase 2B real-mode upload contract changes.
- `node --check tests/real-mode-upload.test.js`: passed after adding Phase 2B backend coverage.
- `npm test`: passed on 2026-07-06 with 4 backend tests covering mock job creation/library behavior plus real-mode multipart upload, source storage, API-visible failure, and persisted failure metadata.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests after Phase 2B backend changes.
- `node --check server.js`: passed after Phase 2C/2D real-mode extraction changes.
- `node --check public/app.js`: passed after adding the GUI pipeline mode switch.
- `node --check tests/backend.test.js`: passed after removing out-of-scope Phase 3 saved-loop coverage.
- `node --check tests/gui.spec.js`: passed after adding GUI mode-switch coverage and removing out-of-scope Phase 3 saved-loop coverage.
- `node --check tests/real-mode-upload.test.js`: passed after updating real-mode extraction coverage.
- `npm test`: passed on 2026-07-06 with 5 backend tests covering mock flow/library/practice state, missing-FFmpeg failure, and real-mode FFmpeg extraction when available.
- `node --check public/app.js`, `node --check server.js`, and `node --check tests/gui.spec.js`: passed after fixing the GUI mode-switch stale-health race.
- `npm test`: passed on 2026-07-06 after fixing the GUI mode-switch stale-health race.
- `npm run test:gui`: passed on 2026-07-06 with 8 Playwright tests, including coverage that a stale startup `/api/health` mock response cannot revert the Real mode selection.
- Manual API check on 2026-07-06: malformed `PUT /api/settings/pipeline-mode` JSON returned `400 Bad Request` with `{"error":"Invalid JSON body."}`.
- `npx playwright test tests/gui.spec.js -g "processed song library reopens"`: initially blocked by sandbox local port binding, then passed after approved execution.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests covering mode switch, mock upload-to-practice, processed demo shortcut, pause/resume, queue behavior, filters, and mobile stack navigation.
- Scope correction on 2026-07-06: removed the out-of-scope Phase 3 saved-loop implementation after clarifying that work should continue up to Phase 3, not through Phase 3. Phase 3 is again the next planned UX phase.
- `node --check server.js`, `node --check public/app.js`, `node --check tests/backend.test.js`, and `node --check tests/gui.spec.js`: passed after the Phase 3 scope correction.
- `npm test`: passed on 2026-07-06 after the Phase 3 scope correction.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests after the Phase 3 scope correction.
- `node --check public/app.js`: passed after Phase 1B unified workspace changes.
- `node --check tests/gui.spec.js`: passed after Phase 1B GUI coverage updates.
- `npm test`: passed on 2026-07-06 with 3 backend tests covering mock job creation, processed demo shortcut, processed-song library/practice-state persistence, rename, reopen, and delete.
- `npm run test:gui`: passed on 2026-07-06 with 6 Playwright tests covering mock upload-to-practice, processed demo shortcut, persisted practice state, multi-file unified queue/list behavior, learning-status filters, header rename/delete, full-row selection, and mobile list-first navigation.
- `node --check public/app.js`: passed after Pause -> Play audio resume fix.
- `node --check tests/gui.spec.js`: passed after adding Pause -> Play regression coverage.
- Real-browser Playwright probe against `http://127.0.0.1:3001/?demo=processed`: before the fix, audio resumed near `0.23s` after pausing at about `1.46s`; after the fix, audio resumed at about `1.74s` while the UI timeline was about `1.8s`.
- `npx playwright test tests/gui.spec.js -g "play after pause resumes"`: passed on 2026-07-06.
- `npm test`: passed on 2026-07-06 with 3 backend tests.
- `npm run test:gui`: passed on 2026-07-06 with 7 Playwright tests, including Pause -> Play resume regression coverage.
- Documentation-only UX planning update on 2026-07-06; no code verification run.
- `node --check server.js`: passed after home/queue/library flow changes.
- Documentation-only validation criteria update in `VISION.md`; no code verification run.
- `node --check public/app.js`: passed after home/queue/library flow changes.
- `npm test`: passed on 2026-07-05 with 3 backend tests covering mock job creation, processed demo shortcut, processed-song library/practice-state persistence, and `lastOpenedAt`.
- `npm run test:gui`: passed on 2026-07-05 with 5 Playwright tests covering mock upload-to-practice, processed demo shortcut, library persistence, multi-file upload queue, recent songs, and All songs status filters.
- `node --check public/app.js`: passed after All songs back-navigation fix.
- `node --check tests/gui.spec.js`: passed after All songs back-navigation coverage.
- `npm run test:gui`: passed on 2026-07-05 with 5 Playwright tests, including All songs -> Open -> Back to songs navigation.
- `node --check server.js`: passed after Phase 1 library/state changes.
- `node --check public/app.js`: passed after Phase 1 library/state changes.
- `node --check tests/backend.test.js`: passed after Phase 1 backend coverage.
- `node --check tests/gui.spec.js`: passed after Phase 1 GUI coverage.
- `npm test`: passed on 2026-07-05 with 3 backend tests covering mock job creation, processed demo shortcut, and processed-song library/practice-state persistence.
- `npm run test:gui`: initially failed because saved `loopEnd` was overwritten by audio metadata loading; fixed by preserving saved loop points.
- `npm run test:gui`: passed on 2026-07-05 with 3 Playwright tests covering mock upload-to-practice, processed demo shortcut, and processed-song library/practice-state persistence.
- `npm install`: initially failed inside the sandbox due blocked DNS to `registry.npmjs.org`; passed after approved network execution and created `package-lock.json`.
- `node --check server.js`: passed after adding automated verification.
- `node --check public/app.js`: passed after adding automated verification.
- `npm test`: initially failed inside the sandbox because localhost binding was blocked; passed after approved local server execution.
- `npm run test:gui`: initially failed because Playwright Chromium was not installed.
- `npx playwright install chromium`: passed after approved browser download.
- `npm run test:gui`: passed after installing Playwright Chromium.
- `node --check server.js`: passed.
- `node --check public/app.js`: passed.
- `npm test`: passed, but there are currently 0 automated tests.
- Local server required elevated execution in this sandbox because binding to `127.0.0.1:3000` was blocked without approval.
- `GET /api/health`: returned `{"ok":true,"mode":"mock"}`.
- `POST /api/jobs` with `/private/tmp/piano-poc-upload.txt`: returned `202` and created job `313bac0b-7d8e-4160-9f61-48c1ee8bcf95`.
- `GET /api/jobs/313bac0b-7d8e-4160-9f61-48c1ee8bcf95`: returned `complete`, progress `100`, mock metadata, and audio URL.
- `GET /api/jobs/313bac0b-7d8e-4160-9f61-48c1ee8bcf95/piano.wav`: returned `200 audio/wav` with `1411244` bytes.
- `GET /`: returned the static web client HTML.
- `POST /api/jobs` with JSON metadata for a simulated 500 MB `.mov`: returned `202`, `mockUpload: true`, and created job `9be33c5d-fb38-45ab-931a-fd314e5e98cc`.
- `GET /api/jobs/9be33c5d-fb38-45ab-931a-fd314e5e98cc`: returned `complete`, progress `100`, mock metadata, and audio URL.
- `GET /api/jobs/9be33c5d-fb38-45ab-931a-fd314e5e98cc/piano.wav`: returned `200 audio/wav` with `1411244` bytes.
- `GET /favicon.ico`: returned `404 application/json` without crashing the server.
- `node --check server.js`: passed after stem mixer changes.
- `node --check public/app.js`: passed after stem mixer changes.
- `npm test`: passed after stem mixer changes, but there are currently 0 automated tests.
- Local server on `127.0.0.1:3000` was already in use, so verification used `PORT=3001`.
- Local server required elevated execution in this sandbox because binding to `127.0.0.1:3001` was blocked without approval.
- `GET /api/health` on port `3001`: returned `{"ok":true,"mode":"mock"}`.
- `POST /api/jobs` with JSON metadata for a simulated 500 MB `.mov`: returned `202` and created job `c44da55d-862e-4dfa-b207-2fe29dc2bba2`.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2`: returned `complete`, progress `100`, four stems (`drums`, `bass`, `guitar`, `piano`), mock metadata, and compatibility piano audio URL.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/drums.wav`: returned `200 audio/wav` with `1411244` bytes.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/bass.wav`: returned `200 audio/wav` with `1411244` bytes.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/guitar.wav`: returned `200 audio/wav` with `1411244` bytes.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/piano.wav`: returned `200 audio/wav` with `1411244` bytes.
- After adding file availability checks, `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/piano.wav` still returned `200 audio/wav` with `1411244` bytes.
- `GET /api/jobs/c44da55d-862e-4dfa-b207-2fe29dc2bba2/stems/keys.wav`: returned `404 application/json` without crashing the server.
- Browser state for upload, completion, stem controls, piano mute/unmute preset, speed selection, loop control state, and harmonic cue rendering is now covered by Playwright.
- Browser playback, piano mute/unmute, speed, and loop behavior still need a manual listening check before user demo.
- `node --check server.js`: passed after adding local M4A mock stem support.
- `node --check public/app.js`: passed after local M4A mock stem support.
- `npm test`: passed after backend test was updated to follow API-provided stem URLs and accept `audio/mp4` or `audio/wav`.
- `npm run test:gui`: passed after GUI test was updated to accept either local piano/accompaniment stems or generated drums/bass/guitar/piano fallback stems.
- New local mock jobs `82330816-0d16-468d-8fbf-dd9bc9f1afe7` and `ca9234a8-b378-429a-b67a-ff8315cb309d` copied `accompaniment.m4a` and `piano.m4a` into their per-job `stems/` directories.
- Fixed playback when the piano stem is muted by only starting audible stems and letting the first unmuted stem drive transport while piano is muted.
- Added GUI regression coverage that verifies `Play` after muting piano starts accompaniment or fallback backing stems while piano is silent.
- `node --check public/app.js`: passed after muted-piano playback fix.
- `node --check tests/gui.spec.js`: passed after muted-piano playback regression test.
- `npm test`: passed after muted-piano playback fix.
- `npm run test:gui`: passed after muted-piano playback regression test.
- Added temporary all-muted playback coverage, later replaced by per-stem mute/solo controls.
- Updated GUI regression coverage for muting all stems and unmuting all stems while playback is active.
- `node --check public/app.js`: passed after mute-all playback support.
- `node --check tests/gui.spec.js`: passed after mute-all playback regression test.
- `npm test`: passed after mute-all playback support.
- `npm run test:gui`: passed after mute-all playback regression test.
- Corrected mute behavior so mute/unmute only changes stem volume state. All stems continue running under the shared transport, and mute presets no longer restart playback or seek the playhead.
- Updated GUI regression coverage so muted stems are still started by `Play`, while mix-state changes during playback do not trigger new `play()` calls.
- `node --check public/app.js`: passed after volume-only mute correction.
- `node --check tests/gui.spec.js`: passed after volume-only mute regression update.
- `npm test`: passed after volume-only mute correction.
- `npm run test:gui`: passed after volume-only mute regression update.
- Removed global mix preset controls from the stem UI and replaced them with per-stem mute and solo controls.
- Removed stem subtitles and piano-specific row highlighting from the mixer.
- Removed the visible `Melody cues` section from the harmony panel; mock melody data remains internal for now.
- Updated API stem payloads to omit role/subtitle text.
- Updated GUI smoke coverage for absent presets, per-stem mute, per-stem solo, and same-stem mute/solo exclusivity.
- `node --check server.js`: passed after per-stem solo UI changes.
- `node --check public/app.js`: passed after per-stem solo UI changes.
- `node --check tests/gui.spec.js`: passed after per-stem solo UI test update.
- `npm test`: passed after per-stem solo UI changes.
- `npm run test:gui`: passed after per-stem solo UI changes.
- Fixed audible stem return after direct unmute or disabling piano solo during active playback by resuming and syncing stems that transition from silent to audible.
- Added Playwright regression coverage for Accompaniment/fallback backing stem return after direct mute/unmute and after piano solo/unsolo, including `audio.muted` state and renewed `play()` calls during active playback.
- `node --check public/app.js`: passed after audible-stem resume fix.
- `node --check tests/gui.spec.js`: passed after audible-stem resume regression coverage.
- `npm run test:gui`: passed after audible-stem resume regression coverage.
- `npm test`: passed after audible-stem resume fix.
- Reworked browser playback transport so app-owned transport time is authoritative; audio elements are synchronized outputs rather than the source of truth.
- Mute/solo changes no longer restart the transport or derive resume position from a potentially stale stem `currentTime`.
- Added GUI regression coverage that seeks to a nonzero position during playback, toggles backing mute/unmute and piano solo/unsolo, and verifies resumed backing stems do not restart from `0`.
- Mocked media `currentTime` and `duration` in Playwright so transport synchronization can be tested deterministically without depending on browser decoder readiness.
- `node --check public/app.js`: passed after independent transport rewrite.
- `node --check tests/gui.spec.js`: passed after nonzero unsolo regression test.
- `npm run test:gui`: passed after nonzero unsolo regression test.
- `npm test`: passed after independent transport rewrite.
- Fixed silent playback caused by continuously seeking every stem from the transport tick. The transport tick now updates UI time and loop state without forcing media `currentTime` every animation frame.
- Kept explicit seeking for play start, scrub/loop jumps, and paused-stem resume only; normal mute/solo changes now leave already-playing stems running.
- Updated Playwright media mocks to track `paused` state so tests verify that unmute/unsolo does not issue unnecessary `play()` calls for stems that are already playing.
- Real-browser probe on local M4A mock stems confirmed Accompaniment remains `paused:false`, advances `currentTime`, mutes during Piano solo, and returns with `muted:false` after unsolo.
- `node --check public/app.js`: passed after removing continuous media seek.
- `node --check tests/gui.spec.js`: passed after paused-state media mock update.
- `npm run test:gui`: passed after paused-state media mock update.
- `npm test`: passed after removing continuous media seek.
- Added API and Playwright coverage for the processed demo shortcut.
- `node --check server.js`: passed after processed demo shortcut and querystring static-file fix.
- `node --check public/app.js`: passed after processed demo shortcut.
- `node --check tests/backend.test.js`: passed after processed demo shortcut coverage.
- `node --check tests/gui.spec.js`: passed after processed demo shortcut coverage.
- `npm test`: passed with 2 backend tests after processed demo shortcut coverage.
- `npm run test:gui`: passed with 2 Playwright tests after processed demo shortcut coverage.
- `npm test`: passed on 2026-07-05 while closing Phase 0.
- `npm run test:gui`: passed on 2026-07-05 while closing Phase 0.
- Manual subjective listening could not be completed by Codex; a human should still listen through `DEMO.md` before external user testing.
- Investigated perceived audio degradation in the real/Demucs path on 2026-07-06.
- `test-media/MakeYouFeelMyLovePart2.mov` audio is 44.1 kHz stereo AAC; existing `source-audio.wav` from the bakeoff Demucs job was 44.1 kHz mono PCM16 because FFmpeg extraction used `-ac 1 -ar 44100`.
- Demucs default output is 44.1 kHz stereo PCM16. A diagnostic Demucs run on a stereo WAV preserved much stronger channel difference than the previous mono-preprocessed Demucs job, so the avoidable degradation was the FFmpeg mono downmix before Demucs, not a lower sample rate.
- Updated `server.js` and `scripts/build-stem-bakeoff.js` to preserve source channel count and sample rate during `source-audio.wav` extraction while explicitly writing uncompressed PCM16 WAV.
- `npm test`: passed after preserving source channels during FFmpeg extraction.
- Investigated three fresh local uploads after old `data/jobs` entries were archived to `data/jobs/Archive.zip`.
- Jobs `073f295b-21dd-4994-b71a-86edb04326fa`, `6722662e-dbe6-4846-a8fe-0ce6bab23b7b`, and `94a2d0fb-f9b3-4cc7-ab66-3b0c4f8322d9` were real-mode jobs, but their metadata shows `separator.name: ffmpeg-spectral-piano-v1`; they were not mock fallback jobs.
- Added active real-separator reporting to `/api/health` and the pipeline mode switch response, and updated the UI service status to show `FFmpeg fallback` when `REAL_SEPARATOR=ffmpeg-spectral` is active.
- Updated `DEMO.md` to clarify that Demucs real mode should show `Backend ready: real · demucs-htdemucs_6s`.
- `npm test`: passed after adding separator visibility.
- `npm run test:gui`: passed after adding separator visibility.
