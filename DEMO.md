# DEMO.md

## Goal

Demonstrate that a user can choose a screen recording, process it, return to the processed song from a library, hear separated stems, mute/unmute or solo stems, slow playback down, loop a passage, save practice state, and view approximate harmonic information.

## Current Demo Mode

The first demo is intended to run in mock mode:

```text
PIPELINE_MODE=mock
```

Mock mode does not perform real stem separation or transcription. If local demo stems exist at `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a`, it returns piano and accompaniment stems from those files so piano mute/unmute can be evaluated by ear. If those files are missing, it falls back to generated drums, bass, guitar, and piano WAV stems plus plausible harmonic metadata.

In mock mode, the browser sends selected file metadata instead of uploading the full video bytes. This keeps large iOS screen recordings usable while still exercising multi-file job creation, per-file processing status, the unified song workspace, reusable processed-song library entries, synchronized stem playback, per-stem mute/solo/volume controls, looping, learning status, and harmonic display.

In real mode, the browser uploads the actual selected file as multipart form data. The backend stores the uploaded source media under the job directory, invokes FFmpeg, writes `source-audio.wav`, then runs Demucs `htdemucs_6s` by default to write `Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` stems. Harmonic analysis remains mocked. Listening on `MakeYouFeelMyLovePart2.mov` showed the piano-removal play-along use case is good enough for the POC, while the solo piano stem can still contain crackle/artifacts.

The topbar includes a Mock/Real pipeline switch. `PIPELINE_MODE` is still the server startup default, but the GUI switch changes the active backend mode for new uploads in the current server session.

When Real mode is selected, the service status should show the active separator. `Backend ready: real · demucs-htdemucs_6s` means new uploads will use Demucs. `Backend ready: real · FFmpeg fallback` means the server was started with `REAL_SEPARATOR=ffmpeg-spectral`; stop that server and restart without `REAL_SEPARATOR=ffmpeg-spectral` if the goal is Demucs separation.

## Prerequisites

- Node.js installed.
- Project dependencies installed with `npm install`.
- A small local video or audio file to upload.
- In mock mode the file can be large, because only metadata is sent.

No Demucs, Basic Pitch, FFmpeg, GPU, or heavy ML dependency is required for mock mode.

Real mode requires FFmpeg for extraction. On this machine it was verified at `/opt/homebrew/bin/ffmpeg`. If FFmpeg is not on `PATH`, set:

```bash
FFMPEG_PATH=/path/to/ffmpeg npm start
```

Real mode now uses Demucs by default. Install the optional heavy dependencies separately:

```bash
python3 -m venv .venv-real
.venv-real/bin/python -m pip install -r requirements-real.txt
```

Then run:

```bash
TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs PIPELINE_MODE=real npm start
```

To use the old lightweight FFmpeg spectral split instead of Demucs:

```bash
REAL_SEPARATOR=ffmpeg-spectral PIPELINE_MODE=real npm start
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

If a sandbox blocks local port binding, run the same command in a normal terminal from the repository root.

To start with real mode selected by default:

```bash
PIPELINE_MODE=real npm start
```

For Demucs real mode, prefer:

```bash
TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs PIPELINE_MODE=real npm start
```

You can also start normally and switch Mock/Real from the topbar before uploading a file.

For repeated frontend testing where file selection and upload are not the thing being evaluated, open:

```text
http://localhost:3000/?demo=processed
```

This feature toggle creates a complete mock job and opens the processed practice view directly. It still uses backend-generated/copy-backed stems, the normal job result shape, and the same player controls as the full upload flow.

## Automated Verification

Run the backend smoke test:

```bash
npm test
```

Run the browser smoke test:

```bash
npx playwright install chromium
npm run test:gui
```

The browser smoke test covers the mock-mode happy path: backend readiness, GUI pipeline mode switching, multi-file selection, per-file progress in the unified song list, job completion without automatically opening practice, full-row song selection, desktop workspace selection, mobile list-first navigation, status filtering, selected-song header rename/delete, persisted learning status, per-stem mute/solo/volume controls, playback speed selection, loop control state, detected key, chord labels, and roman numerals.

The browser smoke test does not prove that the stems sound musically useful. Manual listening is still required before a user demo.

## Demo Steps

1. Open the local web app.
2. Choose one or more screen recordings or small media files.
3. Upload them from the song list.
4. Confirm each file appears immediately in the same song list with inline status/progress.
5. Wait for mock processing to complete and confirm the app does not auto-open practice.
6. Confirm completed songs remain in the same list with human-readable activity time and duration.
7. Select a completed song by clicking the whole row.
8. On desktop, confirm the song list stays visible on the left while practice opens on the right.
9. On mobile, confirm the list opens first, then the selected song/practice detail, and the Songs button returns to the list.
10. Play the stem mix.
11. Confirm the mixer shows piano plus either accompaniment from the local demo stems or generated drums, bass, and guitar fallback stems.
12. Mute the piano stem so the non-piano backing remains while the piano drops out.
13. Solo the piano stem and confirm other stems drop out.
14. Confirm mute and solo cannot remain active at the same time on the piano stem.
15. Change playback speed, stem volume, loop start/end, loop enabled state, and learning status.
16. Reload the page, reopen the song from the unified song list, and confirm those practice settings return.
17. Rename the selected song from the selected-song header.
18. Delete the selected song and confirm it disappears from the song list and no longer opens.
19. Inspect detected key, chord names, and roman numerals.

## Real-Mode Separation Smoke

1. Start the app with `PIPELINE_MODE=real npm start`, or switch to Real in the topbar.
2. Upload `test-media/phase-2g-piano-mix.wav` or another short audio/video file.
3. Wait for the job to complete.
4. Select the completed song and confirm the practice result shows `Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` stems when using Demucs.
5. Play the result and confirm the browser can load both stems.
6. Mute the piano stem and listen for whether the accompaniment has enough piano reduction for play-along practice.
7. Solo the piano stem and listen for whether the piano part is recognizable enough for learning.
8. Inspect the job directory under `data/jobs/<job-id>/` and confirm `source-audio.wav` and the stem WAV files exist with nonzero size.

If FFmpeg or Demucs is unavailable, the job should fail with a clear setup message instead of crashing the server. If separation fails, the job should fail with an API-visible separator error. Mock mode remains usable.

## Stem Separation Bakeoff

Use this when comparing separation quality on the same source recording inside the app.

Input files expected locally:

```text
test-media/MakeYouFeelMyLovePart2.mov
test-media/stems from logic/
```

Create or refresh the Logic baseline and FFmpeg spectral jobs:

```bash
npm run bakeoff:stems
```

Create or refresh those jobs plus a Demucs `htdemucs_6s` job after installing Demucs in `.venv-real`:

```bash
TORCH_HOME=.cache/torch DEMUCS_PATH=.venv-real/bin/demucs npm run bakeoff:stems -- --demucs
```

The script creates processed library entries named:

```text
MakeYouFeelMyLovePart2 - Logic baseline
MakeYouFeelMyLovePart2 - FFmpeg spectral
MakeYouFeelMyLovePart2 - Demucs htdemucs_6s
```

Open the app, select each entry from the song list, mute or solo the piano stem, and compare whether the remaining stems are useful for play-along practice. Harmony cues in these bakeoff jobs are mocked; judge audio quality only.

## Fast Iteration Steps

1. Start the app with `PIPELINE_MODE=mock npm start`.
2. Open `http://localhost:3000/?demo=processed`.
3. Confirm the app lands directly on the processed practice view.
4. Test mute/solo, speed, loop, and harmonic cue changes without repeating file selection.

## Expected Result

The user should experience the intended learning workflow end to end, even though the stems and harmonic data are mocked.

## Demo Media and Copyright

Do not include commercial recordings in the repository. Use a user-provided test file or a generated/local sample. The local demo stem files under `data/` are ignored by git and must be replaced with material the tester is allowed to process. The mock pipeline does not depend on the uploaded file content yet.

The Phase 2A/2G real-pipeline spikes use generated safe local test inputs. Generate or refresh them with:

```bash
npm run generate:test-media
```

This creates:

- `test-media/phase-2a-source.wav`: synthesized sine-wave chord tones for upload/extraction smoke.
- `test-media/phase-2g-piano-mix.wav`: synthesized piano-band chords plus low bass and high accompaniment content for the separator smoke.

These files are generated in-repo, are not commercial recordings, and do not include third-party audio. They are intentionally short and musically plain. The Phase 2G file can verify that the backend creates and serves `piano.wav` and `accompaniment.wav`; it cannot prove quality on real screen recordings.

## Known Limitations

- Real piano isolation is only a lightweight FFmpeg spectral split, not ML source separation.
- Real drums, bass, guitar, and piano separation is not implemented yet.
- Real transcription is not implemented yet.
- Real-mode upload storage, FFmpeg source-audio extraction, and heuristic piano/accompaniment splitting are implemented, but no real transcription runs after separation.
- Harmonic metadata is mocked, including for real-mode extracted-audio jobs.
- The processed-song library is local-only and single-user; there is no cloud sync or authentication.
- Browser stem playback uses synchronized HTML audio elements, which is sufficient for the POC but not sample-accurate.
- Native iOS Photos import is not implemented yet.
- Automated browser tests verify the GUI state, but not subjective audio quality.
