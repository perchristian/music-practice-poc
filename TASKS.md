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
- Change speed, stem mix, volume, loop points, and status; reload and confirm the values persist.
- Delete a processed song and confirm it disappears from the library and no longer opens.

Status: Planned next.

## Phase 2: Problem Areas and Practice Notes

Goal: A user can track difficult passages and use the app as an ongoing practice workspace, not just a one-off player.

Demonstrable outcome:
- Multiple saved loops can be attached to one song.
- Each loop can have a name, note, and status such as `difficult`, `improving`, or `learned`.
- Saved loops can be selected quickly from the practice view.

Verification:
- Create, edit, select, and delete multiple loops on one processed song.
- Reload the app and confirm notes and loop status persist.

Status: Planned.

## Phase 3: First Real-Pipeline Spike

Goal: Reduce the highest technical uncertainty with one replaceable real subsystem.

Candidate scope:
- Extract audio from uploaded video with FFmpeg, or
- Run a small piano separation/transcription experiment on one short sample.

Demonstrable outcome:
- Real mode replaces exactly one mock subsystem.
- Mock mode remains working.
- Results and limitations are documented.

Verification:
- Run mock demo.
- Run real spike on one sample if dependencies are available.

Status: Planned after library and saved practice state, unless real stem quality becomes the immediate blocker.

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

## Next Task

Start Phase 1 by adding a processed-song library API and UI that lists existing completed jobs and reopens one without reprocessing.
