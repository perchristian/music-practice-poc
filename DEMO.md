# DEMO.md

## Goal

Demonstrate that a user can choose a screen recording, process it, hear separated stems, mute/unmute stems, mute piano to practise the piano part themselves, slow playback down, loop a passage, and view approximate harmonic information.

## Current Demo Mode

The first demo is intended to run in mock mode:

```text
PIPELINE_MODE=mock
```

Mock mode does not perform real stem separation or transcription. It simulates the full product flow and returns generated drums, bass, guitar, and piano stems plus plausible harmonic metadata.

In mock mode, the browser sends selected file metadata instead of uploading the full video bytes. This keeps large iOS screen recordings usable while still exercising job creation, processing status, synchronized stem playback, piano mute/unmute, looping, and harmonic display.

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

The browser smoke test covers the mock-mode happy path: backend readiness, file selection, job completion, drums/bass/guitar/piano stem controls, piano mute preset, full mix preset, playback speed selection, loop control state, detected key, chord labels, roman numerals, and melody cues.

The browser smoke test does not prove that the stems sound musically useful. Manual listening is still required before a user demo.

## Demo Steps

1. Open the local web app.
2. Choose a screen recording or small media file.
3. Upload it.
4. Wait for the mock processing job to complete.
5. Play the generated stem mix.
6. Confirm the mixer shows drums, bass, guitar, and piano.
7. Use the piano mute control or `Mute piano` preset so drums, bass, and guitar remain while the piano drops out.
8. Unmute piano again and confirm it returns.
9. Change playback speed.
10. Set a loop start and loop end.
11. Enable looping and confirm playback repeats the selected passage.
12. Inspect detected key, chord names, roman numerals, and melody cues.

## Expected Result

The user should experience the intended learning workflow end to end, even though the stems and harmonic data are mocked.

## Demo Media and Copyright

Do not include commercial recordings in the repository. Use a user-provided test file or a generated/local sample. The mock pipeline does not depend on the uploaded file content yet.

## Known Limitations

- Real piano isolation is not implemented yet.
- Real drums, bass, guitar, and piano separation is not implemented yet.
- Real transcription is not implemented yet.
- Harmonic metadata is mocked.
- Browser stem playback uses synchronized HTML audio elements, which is sufficient for the POC but not sample-accurate.
- Native iOS Photos import is not implemented yet.
- Automated browser tests verify the GUI state, but not subjective audio quality.
