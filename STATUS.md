# STATUS.md

## Current Status

The first mock-mode vertical slice is implemented and functionally verified by automated backend and browser tests. A developer can start the local web POC, upload a media file, wait for mock processing, receive local piano/accompaniment demo stems when `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a` exist, mute/unmute stems, solo stems, use playback controls, and inspect harmonic cues. If the local M4A demo stems are missing, mock mode falls back to generated drums/bass/guitar/piano WAV stems.

Phase 0 / baseline demo closure is complete for automated verification. Subjective audio usefulness still needs a human listening pass before external user testing.

## Current Architecture

Local web POC:

- static browser client
- lightweight Node.js backend
- local filesystem storage under `data/`
- `PIPELINE_MODE=mock` by default
- processed results represented as stems, with piano as the primary practice target
- future `PIPELINE_MODE=real` behind the same pipeline boundary

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
  - `/?skipUpload=1`
- The processed demo shortcut creates a complete mock job and jumps directly to the practice view without selecting or uploading a file.
- Completed Phase 0 automated verification:
  - `npm test` passed on 2026-07-05.
  - `npm run test:gui` passed on 2026-07-05.
- Added a phased forward roadmap in `TASKS.md`:
  - Phase 1: processed-song library and saved practice state.
  - Phase 2: problem areas and practice notes.
  - Phase 3: first real-pipeline spike.
  - Phase 4: musical grid and bar-based practice.
  - Phase 5: expanded practice targets.
  - Phase 6: native iOS feasibility spike.
- Documented native iOS transition criteria in `ARCHITECTURE.md`.

## In Progress

- Phase 1 planning: processed-song library and saved practice state.

## Next Recommended Task

Add a processed-song library API and UI that lists existing completed jobs and reopens one without reprocessing. Include persisted per-song practice state early because it directly supports repeated learning sessions.

## Skills Used

No Codex skills used.

## Agent and Model Use

- No delegated agents used.
- No model switch performed.
- Main Codex session is being used for planning and implementation.

## Known Local State

- `AGENTS.md` had pre-existing uncommitted edits before implementation work began.

## Verification Log

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
