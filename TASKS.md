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

## Epic 4: Demo Readiness and Reproducibility

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

Status: In progress.

## Epic 5: First Real-Pipeline Spike

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

Status: Deferred until mock demo is complete.

## Next Task

Finish Epic 4 by running through `DEMO.md` with manual listening in a browser, confirming synchronized stem playback, piano mute/unmute, speed, and loop behavior by ear, and tightening any setup gaps found during that run-through.
