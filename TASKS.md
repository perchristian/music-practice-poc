# TASKS.md

## Prioritization Order

1. Learning value
2. Demo quality
3. Risk reduction
4. Simplicity
5. Implementation effort
6. Future scalability

## Epic 1: Mock Upload-to-Practice Flow

Goal: A user can choose a local screen recording, upload it, wait for mock processing, and land in a practice view.

Demonstrable outcome:
- Browser file picker accepts video/audio.
- Backend creates a mock job from selected file metadata.
- UI polls status and shows realistic progress.
- Completed job exposes mock drums, bass, guitar, and piano stems plus harmonic metadata.

Verification:
- Start the local server.
- Upload a small local file.
- Confirm job transitions from queued/processing to complete.
- Confirm result metadata and audio URL are returned.

Status: Complete in mock mode.

## Epic 2: Practice Playback and Stem Controls

Goal: A user can practise with processed stems, including muting the piano part to play it themselves.

Demonstrable outcome:
- Synchronized stem playback works for drums, bass, guitar, and piano.
- User can mute and unmute each stem.
- User can solo each stem.
- Mute and solo cannot both be active for the same stem.
- User can switch playback speed.
- User can set loop start/end and enable looping.
- Current playback time is visible.

Verification:
- Manual browser test.
- Confirm each mock stem URL returns WAV audio.
- Confirm piano can be muted while drums, bass, and guitar remain active.
- Confirm piano can be soloed while the other stems drop out.
- Confirm playback rate changes.
- Confirm loop jumps from end back to start.

Status: Complete in mock mode.

## Epic 3: Harmonic Learning Cues

Goal: A user can view approximate harmonic information aligned to time.

Demonstrable outcome:
- Detected key is displayed.
- Chord names and roman numerals appear over time.
- Current chord is highlighted during playback.

Verification:
- Manual browser test using mock metadata.
- Confirm current cue updates during playback.

Status: Complete in mock mode.

## Epic 4 / Phase 0: Baseline Demo Closure

Goal: Another developer can follow `DEMO.md` without intervention.

Demonstrable outcome:
- Setup and run instructions are complete.
- Mock mode is default.
- Known limitations are documented.
- No hidden agent state is required.
- Backend smoke test verifies mock job creation, processing completion, stems, and harmonic metadata.
- Browser smoke test verifies the mock upload-to-practice happy path.

Verification:
- Follow `DEMO.md` from a clean checkout.
- Confirm the Engineering Definition of Done is satisfied in mock mode.
- Run `npm test`.
- Run `npm run test:gui`.
- Manually listen to the demo to confirm piano mute/unmute, playback speed, and looping feel usable.

Status: Functionally complete for automated verification. `npm test` and `npm run test:gui` pass as of 2026-07-05. Subjective audio usefulness still needs a human listening pass before external user testing.

## Phase 1: Processed Song Library and Saved Practice State

Goal: A user can return to previously processed songs without processing them again, and the app remembers how they practised each song.

Demonstrable outcome:
- Processed songs are listed in the UI.
- The unified song list shows completed songs with timestamps and ordering based on when they were created.
- All completed songs are available from an All songs view.
- Multiple uploads can be queued at once with per-file processing progress.
- A song can be opened without creating a new processing job.
- A song can be previewed before loading into the full practice view.
- A song can be renamed and deleted.
- A song has a simple learning status such as `not_started`, `practicing`, or `learned`.
- Practice state persists per song:
  - mute/solo state
  - volume per stem
  - playback speed
  - loop points
  - last playback position

Verification:
- Process a mock song, reload the browser, and reopen it from the library.
- Queue two mock uploads and confirm the app stays on home after processing completes.
- Open older processed songs and confirm doing so does not move them above newer created songs.
- Filter All songs by learning status.
- Change speed, stem mix, volume, loop points, and status; reload and confirm the values persist.
- Delete a processed song and confirm it disappears from the library and no longer opens.

Status: Complete in mock mode. `npm test` and `npm run test:gui` pass as of 2026-07-05.

## Phase 1B: Unified Song Workspace UX

Goal: A user can always see newly uploaded, processing, failed, and completed songs in one primary song list, and can switch songs without navigating through separate home, Recent, and All songs pages.

Design reference:
- `UX_FLOOR_PLANS.md`

Demonstrable outcome:
- Desktop and wide tablet show a Voice Memos-inspired split view with the song list on the left and selected song detail/practice on the right.
- Mobile shows a list-first stack: song list first, selected song/practice detail second.
- Upload/add is available from the song list.
- New uploads appear immediately in the song list with progress/status.
- Completed uploads remain in the list and do not auto-open unless the user selects them.
- The whole song row opens/selects the song.
- Rename/delete move to the selected-song header and/or row actions instead of requiring a separate card button for the primary open action.
- Status and human-readable activity time are shown inline; seconds-level timestamps are not shown.
- Existing practice playback, saved state, learning status, and harmonic cue behavior remain working.

Verification:
- Queue one or more mock uploads and confirm active jobs remain visible in the unified song list.
- Let uploads complete and confirm they remain visible without auto-opening.
- On desktop width, select different songs from the left list and confirm the practice/detail pane changes without leaving the workspace.
- On mobile width, open a song from the list and return to the same list.
- Confirm the entire row opens/selects the song.
- Rename and delete a selected song from the new action placement.
- Run `npm test`.
- Run `npm run test:gui`.

Status: Complete in mock mode. `npm test` and `npm run test:gui` pass as of 2026-07-06.

## Phase 2: First Real-Pipeline Spike

Goal: Reduce the highest technical uncertainty with one replaceable real subsystem.

Recommended first subsystem:
- Extract audio from an uploaded video/audio file with FFmpeg in `PIPELINE_MODE=real`.

Reason:
- This validates the first real processing boundary with much lower dependency risk than stem separation or transcription.
- It exercises actual file upload, local source storage, asynchronous processing, error handling, generated result assets, and real-mode documentation.
- It keeps mock mode fully useful while giving the project a concrete real-pipeline foothold.

Deferred candidate scopes:
- Piano/accompaniment separation on one short sample.
- Piano transcription or chord extraction on one short sample.
- These should not start until the audio-extraction spike has either passed or shown that extraction is not the right first real subsystem.

Demonstrable outcome:
- Real mode replaces exactly one mock subsystem: source media audio extraction.
- Mock mode remains working.
- A real uploaded media file produces an extracted audio asset that can be reopened from the processed-song library.
- Stem separation and harmonic metadata may remain mocked during this phase.
- Results and limitations are documented.

Verification:
- Run `npm test`.
- Run `npm run test:gui`.
- Run `PIPELINE_MODE=mock npm start` and confirm the existing mock demo still works.
- Run `PIPELINE_MODE=real npm start` and process one short sample when FFmpeg is available.
- If FFmpeg is unavailable, confirm real mode fails with a clear setup error while mock mode remains unaffected.

### Phase 2A: Spike Framing and Test Media

Goal: Define the narrowest real-mode slice before touching implementation.

Deliverables:
- Confirm whether FFmpeg is available locally.
- Choose or generate one short non-copyright sample for local testing.
- Define the exact output asset for the spike, such as `source-audio.wav` or `source-audio.m4a`.
- Define success metrics:
  - processing completes or fails clearly
  - extracted audio is playable in the browser
  - job metadata records timing, command availability, and limitations
  - mock mode behavior is unchanged

Verification:
- Record FFmpeg availability and sample choice in `STATUS.md`.
- If a sample is added or generated, document its source/copyright status in `DEMO.md`.

Result:
- FFmpeg was initially unavailable on the local PATH, then installed through Homebrew on 2026-07-06. Current verified path: `/opt/homebrew/bin/ffmpeg`.
- The local non-copyright test input is `test-media/phase-2a-source.wav`, generated by `npm run generate:test-media`.
- The exact real-mode extraction output asset is `source-audio.wav` inside the job directory.
- Phase 2B/2C should preserve the existing job lifecycle and mock behavior while adding real-mode upload storage and FFmpeg extraction.

Status: Complete on 2026-07-06.

### Phase 2B: Real-Mode Upload and Job Contract

Goal: Make `PIPELINE_MODE=real` accept actual uploaded media and run through the same job lifecycle as mock mode.

Deliverables:
- Real mode accepts multipart upload through the existing `POST /api/jobs` route.
- Source media is stored under the job directory.
- Job status transitions are visible through `GET /api/jobs/:id`.
- Failures are stored in `job.json` and returned through the API without crashing the server.
- Mock-mode metadata-only upload remains unchanged.

Verification:
- Backend coverage for real-mode upload/job creation using an isolated `DATA_DIR`.
- Existing mock backend tests continue to pass.

Result:
- `PIPELINE_MODE=real` now accepts multipart uploads through `POST /api/jobs`.
- The uploaded source is stored inside the job directory as `source.<original extension>`.
- `GET /api/jobs/:id` exposes queued, processing, and failed states for real-mode jobs.
- Real-mode failures are persisted in `job.json` and returned through the API.
- Mock-mode metadata-only upload remains unchanged.

Status: Complete on 2026-07-06. `npm test` and `npm run test:gui` pass as of 2026-07-06.

### Phase 2C: FFmpeg Audio Extraction Worker

Goal: Replace only the source-audio extraction subsystem with real processing.

Deliverables:
- Real mode invokes FFmpeg through a small backend worker.
- The worker extracts audio from the uploaded source into a browser-playable asset.
- Processing duration and FFmpeg errors are captured in job metadata.
- FFmpeg path can be configured without adding a heavy default dependency.
- Missing FFmpeg produces a clear actionable error.

Verification:
- Run extraction on one short local sample when FFmpeg is available.
- Confirm the extracted audio file exists, has nonzero size, and is served with the correct content type.
- Confirm a failed extraction marks the job as `failed` with a useful error message.

Result:
- Real mode now invokes FFmpeg through `FFMPEG_PATH` or `ffmpeg`.
- Successful real-mode jobs write `source-audio.wav` inside the job directory and expose it as a browser-playable source stem.
- Job metadata records FFmpeg command availability, processing time, output filename, and output size.
- Missing FFmpeg produces an API-visible failed job with a setup-oriented error.

Status: Complete on 2026-07-06.

### Phase 2D: Practice UI Compatibility

Goal: Keep the existing workspace usable when the result comes from the first real subsystem.

Deliverables:
- A completed real-mode job appears in the unified song list.
- Selecting the job opens the same practice/detail panel.
- The extracted source audio is exposed as a playable result asset, while separated stems and harmonic metadata may remain mocked or clearly labeled as unavailable/mocked.
- Existing controls do not break if the real-mode result has fewer stems than the mock result.

Verification:
- Manual browser test with one real-mode completed job.
- GUI smoke coverage is updated only if the result shape changes in a way the current tests should protect.

Result:
- Completed real-mode extraction jobs appear in the unified song list.
- Selecting a real-mode completed job opens the same practice/detail panel with one `Extracted source audio` stem.
- At the time of the extraction-only spike, harmonic metadata remained mocked and was marked as `harmonySource: "mock"` in job metadata. Phase 2H later replaced this for current real-mode jobs.
- The GUI includes a Mock/Real pipeline mode switch in the topbar; `PIPELINE_MODE` remains the startup default, and the switch affects new uploads in the current server session.

Status: Complete on 2026-07-06.

### Phase 2E: Real-Mode Smoke Verification

Goal: Make the spike reproducible without making FFmpeg required for mock-mode development.

Deliverables:
- Add a real-mode smoke path that can run when FFmpeg is installed.
- Keep default `npm test` and mock GUI verification lightweight.
- Document any skipped verification when FFmpeg is missing.

Verification:
- `npm test` passes without requiring FFmpeg.
- `npm run test:gui` passes in mock mode.
- The real-mode smoke command passes locally when FFmpeg is available, or reports a documented skip/setup error when unavailable.

Result:
- `npm test` includes a missing-FFmpeg real-mode failure test that does not require FFmpeg.
- `npm test` also includes a real-mode extraction smoke that runs when FFmpeg is available and skips cleanly otherwise.
- Mock GUI verification remains under `npm run test:gui`.

Status: Complete on 2026-07-06.

### Phase 2F: Documentation, Risks, and Decision Gate

Goal: Capture what the spike proves before starting heavier ML work.

Deliverables:
- Update `DEMO.md` with real-mode setup and run steps.
- Update `STATUS.md` with results, timing, limitations, and whether FFmpeg was available.
- Update `RISKS.md` with evidence for upload/extraction, processing time, and dependency/platform risks.
- Log any significant dependency or pipeline decision in `DECISIONS.md`.
- Decide the next real subsystem:
  - stem separation
  - piano transcription
  - harmonic analysis
  - stop and improve real upload/extraction reliability

Verification:
- Documentation explains how another developer can reproduce the real spike or understand why it was skipped.
- The next implementation task is selected from evidence, not assumption.

Result:
- Real extraction was verified locally with FFmpeg available.
- Mock mode remained intact.
- Documentation, risks, and decisions were updated.
- The next real subsystem should be a narrow piano-focused stem separation spike before transcription or harmonic-analysis work.

Status: Complete on 2026-07-06. Do not begin broad Demucs, Basic Pitch, or other heavy ML integration without keeping the spike narrow and mock mode working.

## Phase 2G: Piano-Focused Real Stem-Separation Spike

Goal: Determine whether the extracted source audio can be turned into practice-useful piano and accompaniment stems.

Reason:
- Phase 2 has only extracted `source-audio.wav` with FFmpeg.
- The core product question depends on muting/removing piano while keeping the rest of the arrangement useful.
- This should happen before more practice-workspace UX, because unusable separation would change the next product direction.

Candidate scope:
- Use `source-audio.wav` as the input to one stem-separation path.
- Keep the spike narrow: one short real or generated sample first.
- Produce at minimum:
  - `piano.wav`
  - `accompaniment.wav`
- Prefer drums, bass, guitar, and piano if the chosen separator can provide them without broad integration work.
- Store outputs under the existing job directory and expose them through the existing stem API.
- Record separator name/version, command/runtime, output files, and limitations in job metadata.
- Keep `PIPELINE_MODE=mock` unchanged and useful.

Verification:
- Run the separator on one short allowed test file.
- Confirm resulting stems are served by the browser player.
- Manually listen for:
  - whether piano is reduced enough in accompaniment for play-along
  - whether the piano stem is recognizable enough for learning
  - whether artifacts make practice distracting
- Measure processing time on the local MacBook.
- Update `RISKS.md`, `STATUS.md`, and `DEMO.md` with the result.

Result:
- Real mode now uses `source-audio.wav` as the input to `ffmpeg-spectral-piano-v1`, a lightweight FFmpeg filter-graph separator.
- The separator writes `stems/piano.wav` and `stems/accompaniment.wav` under the existing job directory.
- Completed real-mode jobs expose those stems through the existing stem API and compatibility `piano.wav` endpoint.
- Job metadata records separator name, FFmpeg version line, command/filter graph, runtime, output files, output sizes, and limitations.
- `npm run generate:test-media` now generates `test-media/phase-2g-piano-mix.wav`, a short copyright-safe synthetic piano/accompaniment mix for this spike.
- Direct FFmpeg smoke on the 6-second generated sample took about `0.06s` for extraction and `0.05s` for the spectral split on the local MacBook environment.
- Automated verification confirms the stems are browser-servable. Subjective listening for practice usefulness still needs a human pass.

Status: Complete for technical spike on 2026-07-06. Human listening on generated and real screen-recorded material remains required before treating the separation as product-useful.

## Phase 2G-QA: Stem Separation Bakeoff

Goal: Compare a high-quality manual Logic Pro baseline, the current FFmpeg spectral split, and a local Demucs `htdemucs_6s` run on the same real screen recording before changing the real pipeline.

Reason:
- The Phase 2G listening result showed the FFmpeg spectral split sounds like EQ, not useful AI source separation.
- The next implementation decision should be based on listening to comparable outputs in the actual practice UI.
- Logic Pro can provide a local quality baseline, while Demucs can test whether an automatable local model is good enough for the POC.

Deliverables:
- Use `test-media/MakeYouFeelMyLovePart2.mov` as the source clip.
- Use `test-media/stems from logic/` as the manual Logic baseline.
- Add a script that creates processed-song library entries for each method.
- Include at minimum:
  - `MakeYouFeelMyLovePart2 - Logic baseline`
  - `MakeYouFeelMyLovePart2 - FFmpeg spectral`
  - `MakeYouFeelMyLovePart2 - Demucs htdemucs_6s`
- Keep the bakeoff entries as QA artifacts; do not make Demucs a dependency for mock mode.

Verification:
- Run `npm run bakeoff:stems`.
- After Demucs is installed, run `TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs npm run bakeoff:stems -- --demucs`.
- Open each processed song in the app and listen with piano muted, piano soloed, and full mix active.
- Score each method for piano removal, accompaniment usefulness, piano recognizability, bleed/artifacts, and runtime.
- Choose the next implementation path based on listening, not automated test success.

Result:
- `scripts/build-stem-bakeoff.js` creates the Logic baseline and FFmpeg spectral comparison jobs.
- With local `.venv-real` Demucs dependencies and `.cache/torch` model cache, the same script creates the Demucs `htdemucs_6s` comparison job.
- Current created job ids are documented in `STATUS.md`.
- Stem URL probes returned HTTP 200 for representative Logic, FFmpeg, and Demucs stems.

Status: Complete on 2026-07-06. Human listening accepted Demucs for the POC play-along use case: solo piano has crackle/artifacts, but removing piano works well enough to continue. Demucs is now the default real-mode separator; FFmpeg spectral remains available with `REAL_SEPARATOR=ffmpeg-spectral`.

## Phase 2H: First Real Audio Analysis Spike

Goal: Replace mocked harmonic metadata with approximate whole-song harmonic cues derived from the extracted audio and, when available, separated stems.

Entry criteria:
- Phase 2G-QA has produced at least one audio source worth analyzing, or the team explicitly decides to analyze `source-audio.wav` before separation quality is known.

Strategy:
- Analyze the song harmony, not just the piano part.
- Treat `source-audio.wav` as the primary truth source for key and chord context because it contains the whole arrangement.
- Use separated or filtered sources as evidence streams:
  - bass or low-frequency content for likely root notes and inversions
  - piano, guitar, and harmonic accompaniment for chord quality such as major, minor, dominant 7, minor 7, major 7, suspended, diminished, and common extensions
  - full mix chroma for stable pitch-class evidence when stem separation is imperfect
- Combine evidence instead of trusting one stem:
  - estimate beat/bar or fixed-window segments first
  - compute chroma/HPCP-style pitch-class features per segment from full mix and harmonic stems
  - estimate bass pitch class/root candidates from low-frequency content
  - score candidate chords against chord templates
  - smooth the chord sequence over time so single-frame noise does not create misleading chord changes
- Start with a conservative chord vocabulary:
  - first pass: key, major/minor triads, dominant 7, minor 7, major 7, sus2/sus4, diminished
  - later pass: 9, 11, 13, altered dominants, slash chords, and borrowed chords only when confidence is high
- When evidence for extensions is weak, display the simpler useful chord rather than overclaiming precision. For example, prefer `C7` over `C13` unless the upper extensions are clearly supported by the harmonic instruments.
- Generate roman numerals from the detected key and chord root, with confidence and "approximate" metadata.
- Keep melody extraction separate from chord analysis; melody may use the piano stem later, but the chord timeline should remain a whole-song estimate.
- Preserve the existing harmonic metadata shape so the UI does not need a major rewrite, but add metadata fields for analysis source, confidence, vocabulary level, and limitations.

Candidate implementation sequence:
1. Build a deterministic analysis contract that can emit key, chord timeline, roman numerals, confidence, and source notes.
2. Add a simple real-derived key/chord prototype on generated test media with known chords.
3. Compare full-mix-only analysis against analysis that also uses bass/accompaniment/piano stems.
4. Keep the first UI result conservative: useful labels over impressive labels.
5. Only add advanced extensions after the simpler vocabulary is stable enough to help practice.

Verification:
- Run analysis on one short allowed test file.
- Confirm the UI displays real-derived key/chord data instead of mock data for that job.
- Compare the output manually against the known/generated test material or a simple hand-labeled reference.
- Confirm chord labels are whole-song estimates, not piano-only transcription.
- Confirm the metadata records whether bass, piano, accompaniment, and full mix were used as evidence.
- Document accuracy, failure modes, dependency/install cost, and processing time.

Result:
- Real mode now emits `harmonySource: "real-audio-analysis-v1"` instead of mock harmonic metadata.
- `source-audio.wav` is analyzed as the full-mix truth source with a dependency-free PCM16 WAV reader.
- The first-pass analyzer estimates broad onset energy, applies a conservative half-time correction to avoid over-fine subdivision grids, estimates first downbeat separately from file start, builds a beat/bar grid from that downbeat, scores beat-length chroma windows against a conservative chord vocabulary, merges adjacent repeated labels within each bar, estimates key, and generates roman numerals.
- Analysis now uses available bass/accompaniment stems for root evidence and other/accompaniment/guitar/piano stems for chord-quality evidence, ignoring very quiet stems and keeping `source-audio.wav` as the fallback.
- Weakly supported 7/maj7 extensions are simplified back to triads, and real analysis emits beat-aware cues, including multiple chord changes inside a bar when evidence supports them, while preserving repeated chord labels across bar boundaries.
- Chord cues preserve the existing UI metadata shape and add `bar`, `beat`, `confidence`, `source`, `beatGrid`, `beatGrid.meterCandidates`, `analysisSource`, and `analysis` metadata.
- The UI displays beat-aware chord placement when available; after Phase 3E this appears as Harmony grid labels such as `Bar 1 · Beat 1`.
- `npm run generate:test-media` now creates `test-media/phase-2h-bar-grid.wav`, a safe four-bar C, Am, F, G test fixture with a clear pulse and 0.65 seconds of pre-roll before the first downbeat, plus known-answer fixtures for multiple chords per 4/4 bar at 120 BPM, 3/4 at 90 BPM, and inversion bass at 100 BPM.

Status: Initial implementation complete on 2026-07-06, downbeat-offset hardening added on 2026-07-07, local calibration added on 2026-07-07 for job `f9e9cf9d-0998-494d-82cf-3dc89fcf4d76`, and beat-aware hardening added on 2026-07-07 after manual inspection found half-tempo and missed-chord behavior. `npm test` covers real-derived harmonic analysis on generated test media that does not start exactly on the first downbeat, multiple chord changes inside 4/4 bars, 3/4 meter, inversion bass, and, when the local calibration job is present, 106 BPM, 4/4, and C, Dm, Am, Am, C, Dm, Am, Am. Manual listening/inspection on more real screen recordings is still required before treating the analysis as user-test ready.

## Phase 3: Musical Grid Calibration and Editable Chords

Goal: A user can turn the analyzer's timing and chord estimates into a useful personal chord chart by correcting the musical grid first, then editing chords on that grid.

Rationale:
- Chord labels do not always have one canonical answer. `Csus2`, `C9`, `C7/F`, and `F11` can describe overlapping musical evidence depending on context and intended use.
- For practice, the user's corrected chord chart should become the working truth for that song.
- Tempo, downbeat, bar positions, and time signature are the foundation for editable chords, bar-snapped loops, count-in, and later practice notes.
- A metronome/click against the original audio is the fastest way for a user to hear whether the analyzed grid is wrong and adjust it.

Demonstrable outcome:
- Bar and beat markers appear in the timeline.
- The app can play an optional metronome/click aligned to the analyzed grid while the song plays.
- The user can adjust at minimum:
  - BPM or half/double tempo
  - time signature, currently 4/4, 3/4, 5/4, 6/8, 7/8, and 12/8
  - bar 1 / downbeat start point
  - selected key so roman numerals match the user's working chart
- Chords are displayed as draft suggestions on bars/beats.
- The user can add, edit, split, merge, move, and delete chord labels on the grid. Done on 2026-07-07: the Harmony panel now renders chord labels as editable fields with per-cue move, split, merge, and delete controls plus an Add chord action.
- User-edited chord labels persist and override analyzer suggestions for the song. Done on 2026-07-07: edits now persist as grid-first `practiceState.chordChart` events and drive the displayed chord chart when present.
- Chord labels preserve user-entered text, even when parsing is ambiguous. Done on 2026-07-07: chord names are stored as user text, while roman numerals are recalculated best-effort from the selected key.

Implementation notes:
- Treat automatic chord analysis as a first draft, not a source of truth.
- Store both analyzer suggestions and user chord edits so the app can distinguish "machine estimate" from "user-approved chart".
- The chord parser should be best-effort. It may extract root, quality, extensions, and bass note when possible, but free-text chord labels must remain valid.
- The metronome should be an audition/calibration tool first, not a performance feature. Keep controls direct: click mute/solo, volume, and grid adjustment; downbeat emphasis stays on by default.

Verification:
- Open a processed song and confirm bar/beat markers are visible.
- Enable metronome and confirm the click follows the displayed grid.
- Adjust bar 1, tempo, and time signature, then confirm the metronome and chord placement update.
- Create/edit/split/merge/delete chords on bars or beats.
- Reload the app and confirm user grid corrections and chord edits persist.
- Confirm analyzer suggestions remain available as provenance but do not overwrite user edits.

### Phase 3A: Grid Audition with Metronome

Goal: Let a user hear and see whether the analyzed beat/bar grid is plausible before adding correction controls or chord editing.

Deliverables:
- Mock metadata includes a simple 60 BPM, 4/4 beat grid so `/?demo=processed` can exercise grid UI without real-mode dependencies.
- The practice view renders beat and bar markers from `metadata.beatGrid`.
- The app can play an optional Web Audio metronome/click aligned to the same grid while stem playback runs.
- Downbeats are accented when enabled.
- Click on/off, downbeat accent, and click volume persist in each song's practice state.

Verification:
- Open a processed song and confirm beat/bar markers are visible.
- Enable the grid click and confirm click scheduling follows the displayed grid.
- Change click settings, reload the song, and confirm they persist.
- Run `npm test`.
- Run `npm run test:gui`.

Result:
- Phase 3A is implemented in mock-compatible UI and backed by automated backend and Playwright coverage.
- `npm test` passed on 2026-07-07 with 11 backend tests.
- `npm run test:gui` passed on 2026-07-07 with 12 Playwright tests.
- Manual listening on real recordings is still required to judge whether the click feels aligned enough for calibration.

Status: Complete for automated verification on 2026-07-07.

### Phase 3B: Minimal Grid Correction Controls

Goal: Let a user correct the analyzed musical grid before editing chords.

Deliverables:
- User can adjust bar 1/downbeat start point. Done on 2026-07-07: the Time panel shows a `Bar 1 start` seconds field with 0.01-second nudge buttons.
- User can adjust BPM through half/double tempo and/or a numeric BPM field. Done on 2026-07-07: the Time panel shows `/2`, editable BPM, and `x2`; the override persists as `practiceState.gridOverrides.bpm`; timeline markers, chord bar labels, selected-song tempo text, and grid click use the corrected tempo.
- User can switch time signature. Done on 2026-07-07: the Time panel now uses a dropdown for 4/4, 3/4, 5/4, 6/8, 7/8, and 12/8; per-song overrides persist as `practiceState.gridOverrides.beatsPerBar` and `beatUnit`.
- User can change key. Done on 2026-07-07: the Harmony panel has a key dropdown with natural, sharp, and flat spellings for major/minor keys; roman numerals are recalculated from the selected key and persisted as `practiceState.keyOverride`.
- Grid offset is intentionally removed from the active UI after product review; Bar 1 start plus BPM should cover the current calibration need without an extra offset concept.
- Corrections persist separately from analyzer output and drive the timeline, metronome, chord placement, and later bar-snapped loops. Done on 2026-07-07: corrections persist in `practiceState.gridOverrides` as `bpm`, `beatsPerBar`, `beatUnit`, and `downbeatOffsetSeconds`, while analyzer metadata remains unchanged.
- Transport, speed, current/total time, playhead, and loop markers are grouped with the timeline. Loop markers appear only when looping is enabled.
- Loop count-in has a first-pass 1-bar option. Updated on 2026-07-07: count-in now schedules metronome clicks before loop audio starts, so it also works when loop start is 0 or the source recording has no usable pre-roll. Loop start/end/count-in controls are only shown while Loop is enabled.
- Bar 1 start accepts negative values down to -60 seconds so recordings that begin just after the first downbeat can still be aligned to the musical grid.
- Metronome/click is presented as a mixer row with mute, solo, and volume. Downbeat accent is always enabled without a user-facing preference.
- Product-review cleanup after Phase 3B moved learning status to the selected-song header, moved Rename/Delete under a more menu, removed user-facing `Processed result`, `Learning cues`, `Ready`, and `Offset` labels, split the practice UI into Time, Harmony, and Stems/Mixer sections, persisted browser-extracted video thumbnails, and fixed scheduled metronome clicks continuing after pause or across loop jumps.

Verification:
- Open a processed song, enable the metronome, and adjust each grid control.
- Confirm timeline markers and click timing update immediately.
- Reload the app and confirm the corrected grid persists.
- Confirm analyzer metadata remains available as provenance.

Status: Complete for automated verification on 2026-07-07. `npm test` and `npm run test:gui` pass after the correction pass. Manual listening on varied real recordings is still needed to judge whether Bar 1/BPM/meter calibration is intuitive enough, or whether a waveform view should be added later.

### Phase 3C: Editable Chord Chart

Goal: Let users turn analyzer chord suggestions into their own working chart after grid calibration.

Deliverables:
- Chord cues render as editable labels.
- Add chord creates a new user chord after the current chart.
- Split divides a chord into two adjacent cues.
- Merge combines a cue with the next cue.
- Move shifts a cue earlier or later by one beat on the corrected grid.
- Delete removes a cue while keeping at least one chord.
- User-edited chord labels persist in a user chart and override analyzer suggestions. Phase 3C first stored this as `practiceState.chordEdits`; Phase 3D superseded it with grid-first `practiceState.chordChart`.
- Analyzer chord metadata remains unchanged for provenance.
- Free-text labels remain valid even when roman-numeral parsing is only approximate.

Verification:
- Edit, add, split, merge, move, and delete chords in the Harmony panel.
- Reload the app and confirm the edited chart returns.
- Confirm `job.result.metadata.chords` still contains analyzer suggestions while `practiceState.chordChart` contains the user chart.
- Run `npm test`.
- Run `npm run test:gui`.

Result:
- Phase 3C is implemented in mock-compatible UI and practice-state storage.
- Backend validation originally normalized chord edit timing, capped chart size, and stored user text without requiring a strict chord parser.
- Playwright coverage verifies edit/add/split/merge/move/delete behavior, persistence, and analyzer-provenance preservation.
- Test-created songs are cleaned up by GUI test teardown for the known test filename prefixes.

Status: Complete for automated verification on 2026-07-07. Phase 3D superseded the original `practiceState.chordEdits` persistence model with `practiceState.chordChart`.

### Phase 3D: Grid-First Chord Chart Model

Goal: Replace the previous seconds-first user chord edit shape with a small, explicit chord chart model that stores positions in bars, beats, and subdivisions.

Reason:
- The chord editor research recommends separating internal model from rendering notation, with chord events positioned explicitly inside measures.
- The previous `practiceState.chordEdits` model stored `start` and `end` seconds first, with `bar` and `beat` as derived helper fields. That made chord edits too dependent on tempo/grid changes.
- For learning, the user needs a musical chart that stays meaningful when BPM, Bar 1, or time signature are corrected.
- Backward compatibility is not required for the POC. Existing local songs/jobs may be deleted and regenerated when the model changes, except intentional fixture, demo, or calibration jobs that are explicitly documented.

Target model:
- Store the user's working chart under `practiceState.chordChart`.
- Use a simple JSON structure:
  - `version`
  - `divisionsPerQuarter`
  - `chords`
- Each chord event stores:
  - stable `id`
  - `bar`
  - `offsetDiv`
  - `durationDiv`
  - user-preserved `raw` chord text
  - `source`, usually `user`
- Derive playback/render values such as `start`, `end`, display `beat`, and roman numeral from the corrected grid and selected key.

Deliverables:
- Backend accepts and normalizes `practiceState.chordChart`. Done on 2026-07-07.
- Existing `practiceState.chordEdits` support may be removed instead of migrated. Done on 2026-07-07: new/public practice state uses `chordChart`; old local POC jobs are not migrated.
- Analyzer suggestions remain in `job.result.metadata.chords` as draft/provenance. Done on 2026-07-07.
- User chart is authoritative for Harmony display, current-chord highlighting, roman numerals, and future bar-based loops. Done on 2026-07-07 for Harmony display, highlighting, and roman numerals; future bar-based loops remain Phase 4.
- Local runtime songs/jobs created under the old chord edit model are deleted after verification unless explicitly documented as fixtures.

Verification:
- Create a mock processed song.
- Edit/add/split/merge/move/delete chords and confirm persisted `practiceState.chordChart` uses grid positions rather than seconds-first timing.
- Change BPM and Bar 1 start, then confirm the chord's musical bar/beat placement remains stable while derived seconds update.
- Reload the app and confirm the chart is restored from `practiceState.chordChart`.
- Confirm analyzer metadata remains unchanged.
- Run `npm test`.
- Run `npm run test:gui`.
- Delete test-created songs/jobs before considering the task complete.

Result:
- Phase 3D is implemented as a clean break from seconds-first `practiceState.chordEdits`.
- Backend practice-state persistence stores `practiceState.chordChart` with `version`, `divisionsPerQuarter`, and chord events containing `id`, `bar`, `offsetDiv`, `durationDiv`, `raw`, and `source`.
- The frontend seeds `chordChart` from analyzer suggestions on first edit, then derives `start`, `end`, display beat, and roman numerals from the corrected grid and selected key.
- Changing BPM or Bar 1 start changes derived cue seconds while preserving the chord's stored musical `bar`, `offsetDiv`, and `durationDiv`.
- Analyzer metadata remains unchanged in `job.result.metadata.chords`.
- Five undocumented local runtime jobs created before `practiceState.chordChart` were deleted after verification; no test-created jobs remain under `data/jobs`.

Status: Complete for automated verification on 2026-07-07. `npm test`, focused Playwright chord-editor coverage, and full `npm run test:gui` pass.

### Phase 3E: Beat-Aligned Chord Chart UI

Goal: Replace the plain Harmony cue list with a compact beat-aligned chord chart view/editor that makes bars, beats, and chord durations visually obvious.

Reason:
- A list of cue cards is useful for initial editing, but it does not clearly show where chords sit in the measure.
- The research report recommends a grid/timeline editor plus beat-aligned reading view as the best MVP balance for chord placement.
- A chord chart UI will make bar-based loops, count-in, and practice notes easier to understand.

Deliverables:
- Harmony renders bars as rows or compact grouped measures. Done on 2026-07-07: Harmony renders bar rows with responsive beat cells.
- Beats/subdivisions are visible enough to understand placement without full notation. Done on 2026-07-07: each bar row shows numbered beat cells.
- Chords appear as blocks or cells spanning their musical duration. Adjusted after product review on 2026-07-07: chord cards appear in the beat cell where they hit, and duration is implicit until the next chord instead of showing a visible from/to time range.
- Add, edit, split, merge, move, and delete operate on chart positions with snap to the current subdivision. Done on 2026-07-07: the existing chart controls continue to operate on grid-first `bar`/`offsetDiv` positions.
- The UI remains usable at desktop and mobile widths without horizontal overflow. Verified on 2026-07-07 at 1180px, 820px, and 390px with a Playwright layout probe.

Verification:
- Open a processed song and confirm the Harmony chart shows bars/beats/chords clearly.
- Edit the chart using the same operations covered by Phase 3C.
- Confirm keyboard and pointer interaction both remain usable.
- Confirm current-chord highlighting follows playback.
- Run `npm test`.
- Run `npm run test:gui`.
- Use a Playwright layout probe or screenshot check at desktop/tablet/mobile widths if the chart layout changes materially.
- Delete test-created songs/jobs before considering the task complete.

Result:
- The plain Harmony cue list has been replaced with a compact beat-aligned chart.
- Chord labels now display hit positions such as `Bar 1 · Beat 2` rather than `Bar 1 · 0:01-0:05`.
- BPM and Bar 1 corrections no longer change the visible chord label into a new time range; the chart stays musical while derived seconds remain internal for playback/highlighting.
- Existing add/edit/split/merge/move/delete controls, roman numerals, persistence, analyzer provenance, and current-chord highlighting remain covered by Playwright.

Status: Complete for automated verification on 2026-07-07. `npm test`, `npm run test:gui`, focused Harmony/chord-editor Playwright tests, and a desktop/tablet/mobile layout probe passed.

### Phase 3F: Compact Chord Chart Editor

Goal: Make the Harmony chart cleaner and more song-level readable by removing redundant editing chrome and using the grid itself for add/move operations.

Reason:
- Once chords sit in a beat-aligned grid, visible `Bar N / Beat N` text on every card is redundant.
- Split/merge and arrow buttons added too much visual weight for a POC learning chart.
- Users need to see more of the song at once, so bars-per-row and name/roman display controls matter more than per-card action buttons.

Deliverables:
- Remove visible per-card bar/beat hit labels. Done on 2026-07-07.
- Remove split/merge controls. Done on 2026-07-07.
- Replace left/right arrow movement with drag/drop onto the chart. Done on 2026-07-07.
- Move delete to a small `x` in the chord-card corner. Done on 2026-07-07.
- Add `+` controls in empty grid cells. Done on 2026-07-07.
- Remove the global Add chord button. Done on 2026-07-07.
- Let chord cards stretch across following empty cells when their duration implies the chord still applies. Done on 2026-07-07.
- Let users resize a chord card's right edge so a long chord can be shortened or lengthened on beat boundaries before inserting another chord. Done on 2026-07-07.
- Add a persisted bars-per-row control. Done on 2026-07-07: supported values are 1, 2, 4, and 8 bars per row.
- Remove beat-number labels from the chart. Done on 2026-07-07.
- Replace `Bar N` row labels with compact bar numbers inside each bar segment. Done on 2026-07-07.
- Add a persisted display control for name + roman, name only, or roman only. Done on 2026-07-07.

Verification:
- Run `npm test`.
- Run focused Playwright coverage for Harmony and editable chords.
- Run `npm run test:gui`.
- Confirm test-created songs/jobs are removed after verification.

Result:
- Harmony now renders compact bar segments with small numeric bar markers and beat separators, not a separate `Bar N` label column or beat-number headers.
- Chord cards show only the selected chord text mode, can visually span empty beats, and keep the small corner delete action.
- Empty cells expose `+` add buttons, drag/drop moves chords to beat positions, and the right edge of each chord card resizes duration with beat snapping.
- `practiceState.harmonyView` persists `barsPerRow` and `chordDisplay`.
- Automated verification passed, including covered-cell insertion after resizing, and no test-created jobs with the known Playwright prefixes remained after test teardown.
- Follow-up maintainability refactor completed on 2026-07-07: pure chord-chart grid math and add/edit/move/resize/delete transforms moved to `public/chord-chart.js`, with fast Node coverage in `tests/chord-chart.test.js`. Browser tests remain for integration and persistence.

Status: Complete for automated verification on 2026-07-07. Manual visual review on long real songs is still useful to judge whether 4 or 8 bars per row is compact enough for full-song scanning.

### Later: Chord Preview And Instrument Stem

Goal: Let users audibly check whether the chord chart is correct.

Candidate scope:
- Add a preview button on each chord card to play that chord on demand.
- Add an optional generated chord instrument stem that follows the chart during playback.
- Provide at least piano, electric piano, guitar, and strings timbres.
- On macOS/iOS, evaluate whether General MIDI via Apple DLSMusicDevice is the best cost/quality path; in the browser, evaluate a lightweight Web Audio/SoundFont fallback.

Status: Planned after the compact chart editor. This should be handled as a separate audio/playback iteration because it touches timing, synthesis/timbre choice, and mixer integration.

Overall Phase 3A-3F status: Complete for automated verification on 2026-07-07. Manual listening on varied real recordings is still needed to judge whether Bar 1/BPM/meter calibration is intuitive enough, or whether a waveform view should be added later.

## Phase 4: Single Grid-Snapped Loop

Goal: A user can set one musically correct loop that follows the corrected grid and supports reliable count-in practice.

Reason:
- One reliable loop has more immediate learning value than multiple saved loops.
- The current loop UI should snap to bars instead of exposing high-resolution decimal seconds or requiring beat-level loop starts.
- Count-in and metronome behavior must respect `Bar 1 start` before loop workflows are expanded.
- Timeline markers become unreadable on full songs if every bar label is rendered.

Demonstrable outcome:
- The existing single loop can snap to bars from the corrected grid.
- Loop start/end controls show bar positions when a beat grid exists, while existing persisted loop start/end seconds remain supported.
- Count-in can be enabled before loop playback and starts playback at the correct audio time when `Bar 1 start` is nonzero or negative.
- Count-in repeats on every loop pass so the second pass is not a hard jump back to loop start.
- The active loop is visible in the Harmony chart and its start/end handles can be dragged across rows, including extending the loop earlier from the front; while dragging, Harmony previews the bar range that will be applied on release.
- Metronome clicks follow loop boundaries and reset cleanly after loop jumps.
- Dense full-song timelines simplify marker rendering so bar numbers do not overlap.
- The existing single loop persists per song and restores after reload.

Verification:
- Start a loop at Bar 1 with a nonzero `Bar 1 start`, enable count-in, and confirm playback begins at the offset-correct audio time.
- Set loop start/end with whole bar values and confirm the persisted seconds match the corrected grid.
- Confirm decimal loop input is not treated as a high-resolution editing mode when a grid exists.
- Drag the active loop in the Harmony chart across multiple rows and confirm its persisted seconds match the selected bars.
- Confirm metronome clicks do not continue past the loop end after the loop jumps back to start.
- Load or simulate a full-song timeline and confirm bar labels remain readable.
- Reload the app and confirm the single-loop settings persist.

Status: Phase 4A implemented on 2026-07-08 for grid-snapped loop controls, offset-aware count-in verification, and dense timeline simplification. Updated later on 2026-07-08 so loop start/end are bar-based, count-in repeats on every loop pass, the active loop can be seen and adjusted from the Harmony chart, and loop handle dragging shows an in-grid preview before release. Full manual listening on real long songs is still useful.

### Deferred: Multiple Saved Loops and Practice Notes

Goal: Add a richer practice workspace only after the single-loop workflow feels correct.

Candidate scope:
- Multiple saved loops can be attached to one song.
- Each loop can have a name, note, and status such as `difficult`, `improving`, or `learned`.
- Saved loops can be selected quickly from the practice view.

Status: Deferred. Do not start this until one grid-snapped loop is validated in manual practice.

## Phase 5: Expand Practice Targets Without Losing Piano Focus

Goal: Keep piano as the first validation target while allowing the same model to support vocals, guitar, bass, and synth later.

Demonstrable outcome:
- The data model can represent a `practiceTarget`.
- Stem labels can include piano, synth, guitar, lead vocal, bass, drums, and rest when the pipeline provides them.
- The UI remains usable when fewer or more stems are available.

Verification:
- Mock results can expose different stem sets without breaking the player.
- Piano remains the default target for the POC.

Status: Planned.

## Research Task: Section Structure Prototypes

Goal: Determine whether repeated song-section support helps users maintain chord charts or creates confusing edit-scope complexity.

Reference plan:
- `research/section-structure-prototype-plan.md`
- `research/section-structure-prototype-results.md`

Problem:
- Songs often repeat sections such as intro, verse, chorus, bridge, and outro.
- Repeated sections may be identical or only 95% identical, with one or two chord variations.
- The current flat chord chart model makes users find these patterns themselves and maintain similar regions in multiple places.

Prototype directions:
- Flat Sections: label bar ranges and improve section-aware range workflows while keeping copied chords independent.
- Linked Sections: define reusable section templates and arrangement order such as `Intro A B A C B Outro`.
- Assisted Sections: detect repeated or near-repeated chord-chart regions and ask the user to accept, reject, or relabel suggested sections.

Recommended order:
- Build or sketch Flat Sections first.
- Build or sketch Assisted Sections next.
- Defer Linked Sections with local overrides until the simpler prototypes show that linked editing is necessary.

Agent strategy:
- Use one lead agent for the first prototype-spec and evaluation pass.
- Do not parallelize builders until the shared scenario and evaluation criteria are stable.
- If multiple agents are used later, assign separate builders to Flat, Linked, and Assisted prototypes and record that delegation in `STATUS.md`.

Verification:
- Compare prototypes against the same scenario from the reference plan.
- Check whether the user can predict whether an edit affects one occurrence or every occurrence.
- Confirm any implemented prototype keeps existing playback, loop, and chord editing behavior intact.
- Delete any test-created songs/jobs before considering the task complete.

Result:
- Paper prototypes for Flat Sections, Linked Sections, and Assisted Sections were completed on 2026-07-08.
- The same 48-bar Intro / A / B / A' / C / B / Outro scenario was used for all three prototypes.
- Flat Sections and Assisted Sections fit the current grid-first `practiceState.chordChart` model and keep chord edits local to the visible occurrence.
- Linked Sections provide the strongest exact-repeat maintenance, but require a new template/arrangement/override model and carry the highest edit-scope confusion risk.
- Recommended implementation order is Flat Sections MVP first, Assisted Sections suggestions second, and Linked Sections only after user testing shows simpler approaches are insufficient.

Status: Research pass complete on 2026-07-08. No runtime prototype has been implemented yet.

## UI System Task: Small Internal Design System

Goal: Make the existing mobile-friendly web POC more consistent and easier to iterate on by extracting a small internal design system from the current HTML/CSS patterns, without migrating to a frontend framework or adding a broad component library.

Reason:
- The app now has enough repeated UI primitives that small inconsistencies slow down further work: buttons, icon buttons, segmented controls, toggles, form fields, menus, progress, song rows, mixer rows, panels, and dense Harmony controls.
- The current static HTML/vanilla JS stack is still appropriate for the POC. A React/shadcn/Radix migration would spend effort on framework conversion instead of learning value.
- Most important UI surfaces are domain-specific, especially transport, stem mixer, loop controls, and the chord chart. A general component library would not replace those.
- Mobile usability matters for validation, so this task should focus on touch targets, responsive density, overflow prevention, and predictable navigation rather than visual polish alone.

Scope:
- Keep the current no-build static frontend unless a later task proves it is blocking.
- Do not add React, Vue, shadcn, Radix, Ionic, Material, Tailwind, or a broad web-component dependency in the first pass.
- Web Awesome or another web-component library may be reconsidered later for specific repeated primitives such as menu, dialog, tooltip, switch, or slider if the internal pass shows clear maintenance cost.
- Preserve existing behavior and test hooks.

Deliverables:
- Inventory the repeated UI primitives in `public/index.html`, `public/app.js`, and `public/styles.css`.
- Define a compact token/primitives layer for:
  - colors, spacing, borders, shadows, type sizes, focus rings, and disabled states
  - primary/secondary/danger/icon buttons
  - segmented controls
  - form fields, selects, numeric nudge fields, range sliders, and toggles
  - panels, menus, list rows, progress, and status chips
  - mixer/control rows with stable mobile dimensions
- Separate reusable primitive CSS from app-specific layout where it materially improves clarity. This can be a documented section in `styles.css` or a new static CSS file if that is cleaner.
- Replace obvious one-off styles with the shared primitives.
- Improve the mobile floor for common controls:
  - no horizontal page overflow at narrow widths
  - touch targets stay at least 42px where practical
  - button text does not clip
  - song list/detail navigation remains list-first on mobile
  - Harmony and mixer controls remain readable at 390px width
- Document the internal UI rules in `ARCHITECTURE.md` or a small dedicated UI note if the rules become too long.

Verification:
- Run `npm test`.
- Run `npm run test:gui`.
- Use a Playwright layout probe or screenshots at approximately 1180px, 820px, and 390px widths.
- Confirm there is no horizontal overflow in the main demo path.
- Confirm upload, song selection, playback controls, stem mute/solo/volume, loop controls, and Harmony editing still work.
- Delete any test-created songs/jobs before considering the task complete.

Status: Planned. This is a focused maintainability and mobile-usability task, not a redesign and not a component-library migration.

## Phase 6: Native iOS Feasibility Spike

Goal: Test whether native iOS materially reduces friction once the web POC has demonstrated learning value.

Entry criteria:
- The web POC has a processed-song library.
- Practice state persists per song.
- At least one real-pipeline spike has been tested with real screen recordings.
- A simple BPM/time-signature/downbeat grid exists or the lack of it is clearly the current blocker.
- User feedback indicates import, storage, caching, background audio, recording, or mobile workflow is a bigger blocker than web feature maturity.

Candidate scope:
- Select a video from Photos.
- Upload it to the same backend.
- Open a processed result.
- Play stems.
- Cache processed stems locally.

Verification:
- Run the same source recording through web and iOS entry points and compare user friction.
- Confirm large-file handling and local caching are better than the web flow.

Status: Deferred until entry criteria are met.

## Process Task: On-Demand Context Overhead Audit

Goal: Determine whether repeated context reconstruction is costly enough to justify a dedicated context agent or stronger startup protocol.

Trigger:
- Only start logging when explicitly requested by a human.
- Do not log context overhead continuously during normal implementation.

Logging window:
- Capture at least three consecutive Codex sessions or implementation iterations after logging is enabled.
- Keep notes short enough that the logging itself does not become the overhead being measured.

For each logged session, record:
- Task attempted.
- Files read before the first implementation or concrete review action.
- Whether the session reconstructed already-known architecture, decisions, or current state.
- Whether documentation gaps caused extra context work.
- Context overhead rating: `low`, `medium`, or `high`.

Audit threshold:
- Recommend a dedicated context agent only if at least three consecutive logged sessions show repeated medium/high context reconstruction around the same project state, decisions, or file map.

Verification:
- Produce a short context overhead review with evidence from the logged sessions.
- Recommend one of:
  - no change
  - lighter startup protocol
  - improved project docs
  - dedicated context agent

Status: Planned. Logging is off until explicitly requested.

## Process Task: Fragmentation Cleanup Review

Goal: Inspect the codebase for avoidable fragmentation caused by repeatedly preserving dirty worktree changes across tasks, then consolidate only where it improves clarity, demo reliability, or future iteration speed.

Scope:
- Review current uncommitted changes before starting and separate completed work from incomplete or ambiguous work.
- Inspect `server.js`, `public/app.js`, `public/styles.css`, `tests/`, and documentation for duplicated logic, stale branches, obsolete compatibility paths, inconsistent naming, and half-integrated task remnants.
- Prioritize cleanup that preserves the current user journey and reduces future implementation friction.
- Avoid broad rewrites, aesthetic refactors, or architectural changes unless they directly remove demonstrable fragmentation.

Deliverables:
- A short findings list describing any fragmentation found and why it matters.
- Focused code or documentation cleanup for high-confidence findings.
- Updated `STATUS.md` if cleanup changes current behavior, verification status, or the next recommended task.
- A focused commit after verification if the reviewed changes are complete.

Verification:
- Run `npm test`.
- Run `npm run test:gui` if frontend behavior or Playwright-covered flows are touched.
- Manually smoke the relevant demo path if cleanup changes runtime behavior not covered by tests.
- Confirm `git status` contains only intentional follow-up work after the cleanup commit.

Status: Complete on 2026-07-07. The review found a clean worktree, intentional compatibility/fallback paths in runtime code, minor low-value frontend naming drift from the pre-unified workspace flow, and one stale local-state note in `STATUS.md`, which was updated. No runtime behavior was changed.

## Phase 5A: Runnable Flat Sections Prototype

Goal: Let a user label repeated song parts such as intro, verse, chorus, bridge, and outro without changing chord edit scope.

Demonstrable outcome:
- `practiceState.sections` stores flat bar-range labels with `id`, `label`, `symbol`, `startBar`, `endBar`, and `source`.
- Harmony shows section bands across the existing bar grid.
- A user can add a section label by start/end bar, symbol, and label.
- A user can rename or remove a section label.
- Chord editing remains local to the visible chord event; sections do not create linked templates or global edits.
- Sections persist when the song is reopened.

Verification:
- Run `npm test`.
- Run focused Playwright coverage for Flat Sections.
- Run `npm run test:gui`.
- Confirm test-created songs/jobs are removed by the GUI cleanup hook.

Result:
- Implemented on 2026-07-08 as a small addition beside the grid-first `practiceState.chordChart`.
- Backend sanitizes and persists `practiceState.sections`.
- The Harmony panel renders compact section bands while keeping existing chord cards, loop overlays, and drag/resize behavior intact.
- Automated coverage verifies add, rename, remove, persistence, backend normalization, library exposure, and reopen behavior.

Status: Complete in mock-compatible UI on 2026-07-08. `npm test`, focused Playwright Flat Sections coverage, and full `npm run test:gui` pass.

## Phase 5B: Section Range UX and Chord Range Workflows

Goal: Turn the first Flat Sections prototype into a practical grid workflow where sections, loops, and chord selections behave like musical ranges rather than repeated per-bar labels.

Reason:
- Product review on 2026-07-08 found that the first prototype is useful but too noisy: `A Verse` repeats on every bar, section controls only appear at the section start, section symbols cannot be edited after creation, and overlapping sections can be created.
- The next implementation should keep the flat section model, but improve how ranges are created, edited, colored, selected, copied, and converted into loops.
- This remains a Flat Sections workflow. Linked section templates and global edits are still deferred.

### Phase 5B.1: Section Data Hygiene and Edit Dialog

Goal: Fix the current section bugs before adding broader range interactions.

Deliverables:
- Add a section helper module or equivalent pure functions for normalizing, validating, and updating flat sections.
- Support editing both `symbol` and `label` for an existing section.
- Prevent overlapping sections. Adjacent sections are allowed; overlapping bar ranges are rejected or clamped before persistence.
- Preserve existing `practiceState.sections` shape, with an optional `color` or `colorKey` field if needed for later color coding.
- Keep backend persistence normalization aligned with frontend validation.

Verification:
- Unit/backend tests cover symbol edits and overlap rejection.
- Focused Playwright coverage confirms an existing section can be edited from `A Verse` to another symbol/label and that overlapping creation does not persist.
- Run `npm test`.
- Run focused GUI coverage.
- Delete test-created songs/jobs.

Result:
- Implemented on 2026-07-08 with shared pure section helpers in `public/section-ranges.js`.
- Frontend and backend normalization now reject overlapping sections while allowing adjacent ranges.
- Existing sections can be edited through a compact dialog that updates `symbol`, `label`, `startBar`, and `endBar`.
- `practiceState.sections` keeps the existing `id`, `label`, `symbol`, `startBar`, `endBar`, and `source` shape, with optional `colorKey` preserved for later color coding.

Status: Complete on 2026-07-08. `npm test`, focused Playwright coverage, and full `npm run test:gui` pass.

### Phase 5B.2: Continuous Section and Loop Range Rendering

Goal: Render sections and loops as continuous ranges across bar boundaries instead of repeated labels inside every bar.

Deliverables:
- Render section bands as row-level or row-chunk overlays that visually stretch from start bar to end bar, including across multiple bars per row.
- Show section label/actions only once per section, or once on the first visible row chunk when a section wraps to another row.
- Make section edit/delete controls subtle by default and clearer on hover/focus; use a pencil icon or compact icon button for edit.
- Double-click any bar inside a section opens the section edit flow, so the user does not need to find the start bar.
- Update loop visualization to use the same continuous range treatment where practical, so loops also read as ranges between bars rather than repeated per-bar boxes.
- Keep chord cards, chord resize handles, and existing loop drag behavior working.

Verification:
- Playwright layout coverage for 1, 2, 4, and 8 bars per row confirms labels do not repeat per bar and controls appear in only one place.
- Focused loop coverage confirms existing loop handle drag still works across rows.
- Run `npm test`.
- Run focused GUI coverage, then full `npm run test:gui` if shared rendering changed broadly.
- Delete test-created songs/jobs.

Result:
- Implemented on 2026-07-08 by rendering section and loop ranges as row-chunk overlays above the existing chord grid.
- Section labels and edit/delete controls appear only on the first chunk for a section; wrapped chunks remain visual range continuations.
- Section edit/delete controls are compact and subtle until hover/focus.
- Double-clicking the visible section range opens the edit dialog.
- Loop display and drag preview now use the same row-chunk range treatment while loop start/end handle dragging across rows remains covered.

Status: Complete on 2026-07-08. `npm test`, focused Playwright coverage, and full `npm run test:gui` pass.

### Phase 5B.3: Bar Selection and Section Creation Flow

Goal: Replace numeric start/end section creation with direct bar selection in the Harmony grid.

Deliverables:
- User can select one or more bars in the grid.
- A `Create section` action appears only after at least one bar is selected.
- Creating a section from selected bars asks only for symbol/label/color, not numeric start/end.
- Remove or hide the old always-visible start/end/symbol/label section form.
- Add a show/hide section-info toggle.
- When section info is visible and a bar has no section, show a subtle `+` affordance for creating a section at that bar or current selected range, similar to chord add cells.
- Selection must respect the no-overlap rule from Phase 5B.1.

Verification:
- Playwright coverage selects bars 5-8, creates `A Verse`, reloads, and confirms persistence.
- Coverage confirms no `Create section` action appears before selection.
- Coverage confirms an already-sectioned range cannot receive a second overlapping section.
- Run `npm test`.
- Run focused GUI coverage.
- Delete test-created songs/jobs.

### Phase 5B.4: Section Resize Handles and Color Coding

Goal: Let users reshape and scan sections directly in the grid.

Deliverables:
- Add draggable start/end handles to section range overlays.
- Dragging a section edge snaps to whole bars and updates `startBar`/`endBar`.
- Dragging cannot create overlap with a neighboring section.
- Add section color coding so repeated symbols or related labels can share a color.
- Default color assignment should be deterministic and calm, for example all `A`/Verse variants share the same color unless the user chooses another.
- Ensure color contrast remains readable in compact/mobile grid layouts.

Verification:
- Unit tests cover range resize transforms and overlap prevention.
- Playwright coverage resizes a section earlier/later, reloads, and confirms persisted range and color.
- Visual/layout probe at narrow width confirms labels and handles do not overlap chord controls.
- Run `npm test`.
- Run focused GUI coverage, then full `npm run test:gui` if pointer handling changed broadly.
- Delete test-created songs/jobs.

### Phase 5B.5: Chord Multi-Selection Foundation

Goal: Add a reusable chord-selection model that can support copy/paste and loop commands without disturbing single-chord editing.

Deliverables:
- User can select multiple chords in the grid.
- Support expected desktop gestures:
  - click selects one chord
  - Shift+click selects a range
  - Cmd+click toggles individual chords on macOS
  - Ctrl+click toggles individual chords on non-mac platforms
- Add section-aware selection: choose all chords inside a section.
- Selected chords have a clear but calm visual state.
- Editing a chord name still works without accidentally changing selection.

Verification:
- Unit tests cover selection range calculations from chart order/grid position.
- Playwright coverage verifies single select, Shift+click range select, Cmd/Ctrl toggle, and select-all-in-section.
- Existing chord edit/add/delete/drag/resize tests still pass.
- Run `npm test`.
- Run focused GUI coverage.
- Delete test-created songs/jobs.

### Phase 5B.6: Chord Copy/Paste and Loop From Selection

Goal: Use selected chord ranges for the two main practice workflows: copying repeated harmony and setting a loop.

Deliverables:
- Copy selected chords and paste them at another bar/beat destination.
- Pasted chords remain independent flat chord events, not linked section templates.
- Pasting should preserve relative rhythm and durations, while avoiding duplicate collisions in the destination range through a simple replacement or conflict rule documented in the UI tests.
- Support Alt+drag to copy selected chords to another grid location if this can be done without making pointer handling fragile; otherwise defer Alt+drag and ship explicit copy/paste first.
- Add a command to set loop start/end from selected chords using the first selected chord start and last selected chord end.
- Add a section-level command to set loop to a section, either directly from the section overlay or indirectly by selecting all chords in the section.

Verification:
- Unit tests cover chart copy/paste transforms, collision behavior, and loop boundary derivation from selected chords.
- Playwright coverage copies a section's chords to another section/range, reloads, and confirms persisted chord chart.
- Playwright coverage sets loop from selected chords or from a section and confirms loop start/end inputs plus rendered loop overlay.
- Run `npm test`.
- Run focused GUI coverage, then full `npm run test:gui`.
- Delete test-created songs/jobs.

Recommended sequence:
1. Phase 5B.1 first, because it fixes current correctness bugs and gives later UI a safe section contract.
2. Phase 5B.2 next, because range rendering is shared by section labels, section handles, and loop display.
3. Phase 5B.3 and 5B.4 after that, because creation and resizing both depend on the same range model.
4. Phase 5B.5 before copy/paste, because loop-from-selection and section chord copy need one consistent multi-select model.
5. Phase 5B.6 last, because it crosses chord editing, section workflows, loop state, keyboard modifiers, and persistence.

Status: Planned from product review on 2026-07-08.

## Next Task

Manually test the Phase 4A single-loop workflow on a real long song: set Bar 1 start, choose bar-based loop start/end, enable count-in, drag the loop handles in Harmony across rows, listen to grid click through repeated loop passes, and inspect whether the simplified timeline is readable enough.

Alternative next section-structure task: start Phase 5B.1, then continue through Phase 5B.2 before Assisted Sections. The product-review issues with the current Flat Sections UX should be fixed before adding automatic section suggestions.

Alternative next product task: implement chord preview and an optional generated chord-instrument stem if audible chord validation is more important than saved practice-loop workflow for the next user test.

Alternative next maintainability task: complete the small internal design system pass before adding more practice controls, especially if mobile usability or CSS drift is starting to slow iteration.
