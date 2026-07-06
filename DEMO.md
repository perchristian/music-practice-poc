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

In real mode, the browser uploads the actual selected file as multipart form data. As of Phase 2B, the backend stores the uploaded source media under the job directory and exposes the queued -> processing -> failed job lifecycle through the API. The failure is expected until Phase 2C adds FFmpeg extraction.

## Prerequisites

- Node.js installed.
- Project dependencies installed with `npm install`.
- A small local video or audio file to upload.
- In mock mode the file can be large, because only metadata is sent.

No Demucs, Basic Pitch, FFmpeg, GPU, or heavy ML dependency is required for mock mode.

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

If a sandbox blocks local port binding, run the same command in a normal terminal from the repository root.

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

The browser smoke test covers the mock-mode happy path: backend readiness, multi-file selection, per-file progress in the unified song list, job completion without automatically opening practice, full-row song selection, desktop workspace selection, mobile list-first navigation, status filtering, selected-song header rename/delete, persisted learning status, per-stem mute/solo/volume controls, playback speed selection, loop control state, detected key, chord labels, and roman numerals.

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

## Fast Iteration Steps

1. Start the app with `PIPELINE_MODE=mock npm start`.
2. Open `http://localhost:3000/?demo=processed`.
3. Confirm the app lands directly on the processed practice view.
4. Test mute/solo, speed, loop, and harmonic cue changes without repeating file selection.

## Expected Result

The user should experience the intended learning workflow end to end, even though the stems and harmonic data are mocked.

## Demo Media and Copyright

Do not include commercial recordings in the repository. Use a user-provided test file or a generated/local sample. The local demo stem files under `data/` are ignored by git and must be replaced with material the tester is allowed to process. The mock pipeline does not depend on the uploaded file content yet.

The Phase 2A real-pipeline spike uses `test-media/phase-2a-source.wav` as a safe local test input. Generate or refresh it with:

```bash
npm run generate:test-media
```

This file is synthesized in-repo from simple sine-wave chord tones. It is not a commercial recording and does not include third-party audio. It is intentionally short and musically plain; its purpose is to verify upload, job lifecycle, FFmpeg availability handling, and browser playback of the extracted `source-audio.wav` asset, not to evaluate stem quality.

## Known Limitations

- Real piano isolation is not implemented yet.
- Real drums, bass, guitar, and piano separation is not implemented yet.
- Real transcription is not implemented yet.
- Real-mode upload storage is implemented, but real-mode FFmpeg extraction is not implemented yet. On this machine, FFmpeg was installed with Homebrew on 2026-07-06 and verified at `/opt/homebrew/bin/ffmpeg` version 8.1.2.
- Harmonic metadata is mocked.
- The processed-song library is local-only and single-user; there is no cloud sync or authentication.
- Browser stem playback uses synchronized HTML audio elements, which is sufficient for the POC but not sample-accurate.
- Native iOS Photos import is not implemented yet.
- Automated browser tests verify the GUI state, but not subjective audio quality.
