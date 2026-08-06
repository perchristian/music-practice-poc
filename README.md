# piano-practice-poc

Mock-first prototype for testing whether a screen recording can become a better piano learning workflow.

The current POC uses local mock audio stems when available: `data/jobs/Bare piano.m4a` for piano and `data/jobs/Uten piano.m4a` for accompaniment. If those ignored local files are missing, it falls back to generated drums, bass, guitar, and piano WAV stems. Stable `?mode=mock` and `?mode=real` URLs select the upload pipeline. The browser can queue multiple files, reopen processed songs from a creation-time-sorted library, preview/rename/delete them, persist practice state, play stems together, mute/unmute or solo stems, adjust stem volume, slow playback, loop passages, and show harmonic cues.

## Run

```bash
npm install
npm start
```

Open `http://localhost:3000/?mode=mock` for the dependency-light demo or `http://localhost:3000/?mode=real` for real processing. A first-time root visit chooses Real; later root visits remember the last selected mode.

On macOS, after `npm install` has been run once, you can also start the local demo
without opening an editor:

```bash
scripts/start-demo.command
```

The same file can be double-clicked from Finder. It starts the app in mock mode,
opens `http://localhost:3000/?mode=mock` in the browser, and keeps the service running until
the Terminal window is closed.

For faster frontend iteration without selecting or uploading a file, open:

```text
http://localhost:3000/?mode=mock&demo=processed
```

This creates an already-complete mock job and jumps directly to the processed practice view.

Mock remains the dependency-light server and launcher default and requires no heavy ML dependencies:

```bash
PIPELINE_MODE=mock npm start
```

Real mode currently validates upload, FFmpeg source-audio extraction, Demucs `htdemucs_6s` stem separation, and first-pass harmonic analysis for piano-focused practice. It stores uploaded media, writes `source-audio.wav`, exposes `Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` WAV stems, then emits approximate beat-aware chord cues, key, roman numerals, tempo, meter, and bar/beat metadata. The FFmpeg spectral split remains available as a lightweight fallback with `REAL_SEPARATOR=ffmpeg-spectral`. Melody transcription is not implemented yet.

Heavy real-pipeline dependencies are optional and separate from mock mode:

```bash
python3 -m venv .venv-real
.venv-real/bin/python -m pip install -r requirements-real.txt
TORCH_HOME=.cache/torch PIPELINE_MODE=real npm start
```

The server invokes Demucs as `.venv-real/bin/python -m demucs`, so moving the
repository does not depend on the virtual environment's absolute-path entrypoint.
Set `DEMUCS_PYTHON` to use another Python interpreter, or `DEMUCS_PATH` to invoke
a specific Demucs executable directly.

See `docs/engineering/DEMO.md` for the current demo flow and known limitations.

## Documentation

All project documentation lives in [docs/](docs/) — see [docs/README.md](docs/README.md)
for the full map. The two most-used entry points:

- [docs/planning/STATUS.md](docs/planning/STATUS.md) — current technical status, known limitations, and next task
- [docs/planning/TASKS.md](docs/planning/TASKS.md) — the execution plan for pending work, with a status index

[AGENTS.md](AGENTS.md) is the operating manual for agents working in this repo, and
[CHANGELOG.md](CHANGELOG.md) records notable additions, improvements, and fixes.

## Verify

```bash
npm test
npx playwright install chromium
npm run test:gui
```

`npm test` runs the mock backend smoke tests. `npm run test:gui` runs the Playwright browser smoke tests for the mock upload queue, recent/all-songs library flow, and practice-state persistence.
