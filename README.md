# piano-practice-poc

Mock-first prototype for testing whether a screen recording can become a better piano learning workflow.

The current POC uses local mock audio stems when available: `data/jobs/Bare piano.m4a` for piano and `data/jobs/Uten piano.m4a` for accompaniment. If those ignored local files are missing, it falls back to generated drums, bass, guitar, and piano WAV stems. The browser can switch Mock/Real pipeline mode, queue multiple files, reopen processed songs from a creation-time-sorted library, preview/rename/delete them, persist practice state, play stems together, mute/unmute or solo stems, adjust stem volume, slow playback, loop passages, and show harmonic cues.

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For faster frontend iteration without selecting or uploading a file, open:

```text
http://localhost:3000/?demo=processed
```

This creates an already-complete mock job and jumps directly to the processed practice view.

Mock mode is the default and requires no heavy ML dependencies:

```bash
PIPELINE_MODE=mock npm start
```

Real mode currently validates upload, FFmpeg source-audio extraction, and a narrow FFmpeg spectral split for piano-focused practice. It stores uploaded media, writes `source-audio.wav`, then exposes heuristic `Piano` and `Accompaniment` WAV stems. This is not production-quality source separation; transcription and real harmonic analysis are not implemented yet.

See `DEMO.md` for the current demo flow and known limitations.

## Verify

```bash
npm test
npx playwright install chromium
npm run test:gui
```

`npm test` runs the mock backend smoke tests. `npm run test:gui` runs the Playwright browser smoke tests for the mock upload queue, recent/all-songs library flow, and practice-state persistence.
