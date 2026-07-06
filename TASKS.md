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
- Harmonic metadata remains mocked and is marked as `harmonySource: "mock"` in job metadata.
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

## Phase 2H: First Real Audio Analysis Spike

Goal: Replace mocked harmonic metadata with approximate whole-song harmonic cues derived from the extracted audio and, when available, separated stems.

Entry criteria:
- Phase 2G has produced at least one audio source worth analyzing, or the team explicitly decides to analyze `source-audio.wav` before separation quality is known.

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

Status: Planned after Phase 2G unless stem separation is intentionally deferred.

## Phase 3: Problem Areas and Practice Notes

Goal: A user can track difficult passages and use the app as an ongoing practice workspace, not just a one-off player.

Demonstrable outcome:
- Multiple saved loops can be attached to one song.
- Each loop can have a name, note, and status such as `difficult`, `improving`, or `learned`.
- Saved loops can be selected quickly from the practice view.

Verification:
- Create, edit, select, and delete multiple loops on one processed song.
- Reload the app and confirm notes and loop status persist.

Status: Planned.

## Phase 4: Musical Grid and Bar-Based Practice

Goal: Playback, loops, and harmonic cues align to musical structure instead of only raw seconds.

Demonstrable outcome:
- BPM is detected or mocked.
- Time signature is detected or mocked.
- Downbeat / first bar position is detected or mocked.
- Bar markers appear in the timeline.
- Chords are displayed relative to bars.
- Loops can snap to bars.
- Count-in and/or metronome can be enabled for loop practice.

Verification:
- Open a processed song and confirm bar markers, chord placement, and bar-based loop boundaries are visible.
- Start a loop with count-in and confirm playback begins at the expected bar.

Status: Planned.

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

## Next Task

Start Phase 2H: first real audio/harmonic analysis. Use the Phase 2G outputs only after a human listening pass confirms whether `source-audio.wav`, `stems/piano.wav`, or `stems/accompaniment.wav` is the most useful analysis input.
