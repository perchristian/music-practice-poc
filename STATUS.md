# STATUS.md

## Current Status

The first mock-mode vertical slice is implemented. A developer can start the local web POC, upload a media file, wait for mock processing, receive generated drums/bass/guitar/piano stems, mute and unmute stems, mute piano for play-along practice, use playback controls, and inspect harmonic cues.

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
- Added API stem result list and `GET /api/jobs/:id/stems/:stem.wav`.
- Added mock harmonic metadata with key, chord names, roman numerals, and melody cues.
- Added synchronized stem playback, stem mute/unmute controls, full mix and mute-piano presets, playback speed controls, loop controls, current time display, and current chord highlighting.
- Added a Node backend smoke test for mock job creation, completion, stems, and harmonic metadata.
- Added Playwright GUI smoke coverage for the mock upload-to-practice happy path.
- Added `npm run test:gui` and Playwright configuration for local browser verification.
- Added stable GUI test hooks with `data-testid` attributes.

## In Progress

- Epic 4: Demo Readiness and Reproducibility.

## Next Recommended Task

Run a manual listening demo from `DEMO.md`, confirm synchronized stem playback, piano mute/unmute, speed, and loop behavior by ear, and update any setup or UX gaps before moving to the first real-pipeline spike.

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
