# DECISIONS.md

## Decision 1

Decision:
Use a local web POC before native iOS.

Reason:
The fastest way to evaluate the learning workflow is to build the full upload-processing-practice loop without paying native iOS setup cost first. `AGENTS.md` explicitly allows a web/local uploader for the first prototype.

Alternatives considered:
- Native iOS app first.
- Static-only browser demo.

Tradeoffs:
The web POC does not fully validate Photos permissions or native import friction, but it does validate the core learning workflow faster.

Confidence:
Medium.

Date:
2026-07-05

## Decision 2

Decision:
Use a lightweight Node.js backend with static frontend for the first mock-mode vertical slice.

Reason:
Mock mode can be implemented with no heavy dependencies while still exercising a real backend API, upload flow, job status polling, generated audio asset, and metadata delivery.

Alternatives considered:
- Python FastAPI backend.
- Static-only browser mock.
- Native iOS client with backend.

Tradeoffs:
Node.js is not necessarily the final best fit for ML integration, but the API boundary keeps future Python real-pipeline services possible. Avoiding Python web dependencies keeps the first demo simpler.

Confidence:
Medium.

Date:
2026-07-05

## Decision 3

Decision:
Use local filesystem storage under `data/` for uploads, job metadata, and generated outputs.

Reason:
The POC is local-first and does not need cloud storage, authentication, or multi-user isolation yet.

Alternatives considered:
- In-memory-only job storage.
- SQLite.
- Cloud object storage.

Tradeoffs:
Filesystem storage is easy to inspect and persists across server restarts, but it is not production-grade and will need cleanup/limits later.

Confidence:
Medium.

Date:
2026-07-05

## Decision 4

Decision:
Make `PIPELINE_MODE=mock` the default and defer heavy real-pipeline dependencies.

Reason:
The application must remain demonstrable without Demucs, Basic Pitch, GPU availability, FFmpeg, long processing times, or large test files.

Alternatives considered:
- Install real ML dependencies immediately.
- Build only static mock assets.

Tradeoffs:
Mock mode does not validate stem quality or transcription quality, but it enables end-to-end product learning and keeps development unblocked.

Confidence:
High.

Date:
2026-07-05

## Decision 5

Decision:
In `PIPELINE_MODE=mock`, simulate upload using selected file metadata instead of sending full video bytes.

Reason:
Large iOS screen recordings can be hundreds of megabytes. Mock mode is meant to keep the product flow demonstrable without large files, long upload times, or backend memory pressure.

Alternatives considered:
- Upload the full file even in mock mode.
- Increase the mock upload size limit.
- Require users to choose small files only.

Tradeoffs:
This no longer validates real upload throughput in mock mode, but it better supports the intended mock demo. Real upload behavior remains a future real-mode responsibility.

Confidence:
High.

Date:
2026-07-05

## Decision 6

Decision:
Represent processed output as multiple stems, with drums, bass, guitar, and piano in mock mode, and keep piano as the primary practice target.

Reason:
The key learning workflow is not only hearing the piano part, but also muting it so the learner can play the piano part themselves against the rest of the arrangement. Returning stems from the API makes that workflow explicit and keeps the future real pipeline aligned with the POC.

Alternatives considered:
- Return only a piano stem.
- Return a single premixed accompaniment without per-stem controls.
- Defer stem mute/unmute until real separation exists.

Tradeoffs:
Multiple browser audio elements are less precise than a dedicated audio engine, but they are simple, dependency-free, and good enough to demonstrate the product question in mock mode. Real mode can later replace the audio engine or pipeline without changing the core practice workflow.

Confidence:
Medium.

Date:
2026-07-05

## Decision 7

Decision:
Use Playwright for a narrow mock-mode GUI smoke test.

Reason:
The product question depends on the browser practice workflow being demonstrable, not just the backend API working. Playwright lets Codex and other developers verify the upload-to-practice path locally with a real browser while keeping the scope limited to the happy path.

Alternatives considered:
- Manual-only browser testing.
- Heavy visual regression testing.
- Custom browser automation without a maintained test runner.

Tradeoffs:
Playwright adds a dev-only dependency and requires a one-time Chromium download, but it avoids relying on hidden manual state for core GUI verification. It does not validate subjective audio quality, so manual listening remains required.

Confidence:
High.

Date:
2026-07-05
