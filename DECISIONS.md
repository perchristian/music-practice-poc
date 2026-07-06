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

## Decision 8

Decision:
Defer native iOS until the web POC has a reusable song library, saved practice state, at least one real-pipeline spike on real screen recordings, and evidence that mobile import/storage/caching friction is blocking validation.

Reason:
The core uncertainty is whether separated stems, harmonic cues, and structured practice help musicians learn faster. A native app would improve Photos access and mobile file handling, but it does not answer the stem-quality or learning-value question faster than the current web POC.

Alternatives considered:
- Start native iOS immediately after the first mock demo.
- Keep the project web-only indefinitely.
- Build a full native app before real-pipeline validation.

Tradeoffs:
Deferring iOS keeps iteration fast and focuses effort on learning value, but it delays validation of Photos permissions, App Transport Security, local caching, background audio, and native recording workflows. The compromise is a narrow iOS feasibility spike once the web POC shows enough value or mobile-specific friction becomes the largest blocker.

Confidence:
Medium.

Date:
2026-07-05

## Decision 9

Decision:
Store the processed-song library and per-song practice state in each local job's `job.json` file.

Reason:
Phase 1 needs reusable processed songs and saved practice state, but the POC is still local-first and single-user. Extending the existing filesystem job record keeps the implementation inspectable, dependency-light, and compatible with mock mode.

Alternatives considered:
- Add SQLite for library and practice state.
- Store practice state only in browser localStorage.
- Keep the library in memory only.

Tradeoffs:
Job JSON storage is simple and persists across browser/server restarts, but it is not suitable for concurrent users, remote sync, or complex queries. SQLite or another database can replace this later if the POC needs multi-user or cloud behavior.

Confidence:
Medium.

Date:
2026-07-05

## Decision 10

Decision:
Track recently opened songs with `lastOpenedAt` in each job's `job.json`, updated only by `POST /api/jobs/:id/opened`.

Reason:
Home needs to show the five most recently opened songs independent of learning status and independent of processing or practice-state updates. A dedicated timestamp avoids overloading `updatedAt`, which changes for rename and practice-state persistence.

Alternatives considered:
- Sort recent songs by `updatedAt`.
- Store recent songs only in browser localStorage.
- Add a separate library database table.

Tradeoffs:
The field is simple, durable, and consistent with the local filesystem POC, but it remains single-user and local-only. A future multi-user or synced version should move this into a proper library/practice database.

Confidence:
High.

Date:
2026-07-05

Status:
Superseded by Decision 11 on 2026-07-06. The active UI and API no longer track opens for library ordering.

## Decision 11

Decision:
Use creation time, not last-opened time, for completed song list timestamps and ordering.

Reason:
The unified song list should behave like a library of processed songs. Opening a song is not a content change and should not move the song to the top or make the displayed date look newer than the processing job.

Alternatives considered:
- Continue sorting by `lastOpenedAt`.
- Sort by `updatedAt`.
- Add a separate explicit "Recently opened" section.

Tradeoffs:
Creation-time ordering is predictable and matches the user's correction, but removes implicit recency-of-use behavior. A future "Recently opened" view can still be added explicitly if user testing shows it is useful.

Confidence:
High for the current POC library behavior.

Date:
2026-07-06

## Decision 15

Decision:
Use `PIPELINE_MODE` as the server startup default, but allow the GUI to switch the active backend pipeline mode between `mock` and `real` for new jobs during a running local session.

Reason:
The POC needs an easy evaluator-facing way to compare mock and real processing without restarting the server for every upload. Keeping `PIPELINE_MODE=mock` as the default preserves reproducible lightweight setup, while the GUI switch makes the real-pipeline spike discoverable.

Alternatives considered:
- Require restarting the server with `PIPELINE_MODE=mock` or `PIPELINE_MODE=real`.
- Store the mode only in browser state and infer upload behavior client-side.
- Create separate mock and real servers.

Tradeoffs:
Runtime mode switching is local-session state and is not a production configuration model. Existing jobs keep the mode they were created with, and the switch affects only new uploads. This is acceptable for the POC because it improves demo ergonomics without adding persistent configuration or deployment complexity.

Confidence:
Medium.

Date:
2026-07-06

## Decision 16

Decision:
After the Phase 2 FFmpeg extraction spike, the next real-pipeline subsystem should be piano-focused stem separation on a short real or generated sample.

Reason:
Phase 2 validated real upload storage, FFmpeg extraction, API-visible failures, browser playback of a real extracted asset, and mock-mode compatibility. The highest remaining uncertainty for the core product hypothesis is whether piano can be removed or isolated well enough from screen-recorded audio for useful play-along practice.

Alternatives considered:
- Start piano transcription first.
- Start harmonic analysis first.
- Spend more time hardening upload/extraction before separation.

Tradeoffs:
Stem separation introduces heavier dependencies and likely install/runtime risk, but it attacks the most important learning-value uncertainty. Transcription and harmonic analysis remain valuable, but both depend on usable source or piano audio and are less central than muting piano against an accompaniment.

Confidence:
Medium.

Date:
2026-07-06

## Decision 12

Decision:
Move the library/practice UX toward a Voice Memos-inspired song workspace with a persistent song list on desktop, a list-first stack on mobile, and status shown inline in the song rows instead of using separate Recent and All songs destinations as the main navigation model.

Reason:
Newly uploaded songs should stay visible while they upload and process, and reopening a different song should not require navigating home -> All songs -> song. A status-first song list keeps uploads, processing jobs, failed jobs, recently opened songs, and completed songs in one place while preserving the user's ability to decide whether to open a newly processed song.

Alternatives considered:
- Keep the current Home + Recent + All songs model.
- Auto-open every newly completed upload.
- Make Recent the primary first screen and keep All songs as a separate library.

Tradeoffs:
The unified workspace requires a larger frontend layout change than small fixes to Recent, and mobile/desktop behavior must be designed deliberately. It reduces navigation friction and better matches familiar media-library patterns, but it does not by itself improve the underlying stem or harmonic quality.

Confidence:
Medium.

Date:
2026-07-06

## Decision 13

Decision:
Use `source-audio.wav` as the first real-mode extracted audio asset inside each job directory.

Reason:
The first real-pipeline spike should validate one boundary only: uploaded source media becomes a browser-playable audio asset through FFmpeg. WAV keeps playback and file inspection simple, avoids codec ambiguity during the spike, and gives later stem separation or transcription work a stable local input.

Alternatives considered:
- `source-audio.m4a`
- Keeping only the original uploaded source file
- Producing separated stems immediately

Tradeoffs:
WAV files are larger than compressed audio, but the Phase 2 sample and intended spike files are short. This does not solve stem separation or transcription quality; it only proves upload storage, real processing, error handling, and browser playback of an extracted asset.

Confidence:
Medium.

Date:
2026-07-06

## Decision 14

Decision:
Keep Phase 2B real mode limited to upload storage and job-contract validation, with an intentional API-visible failure before FFmpeg extraction.

Reason:
The next learning step is to prove that real uploads, local source storage, persisted job state, and failure reporting work before adding FFmpeg process execution. This keeps the first real-pipeline boundary small and preserves mock-mode demo behavior.

Alternatives considered:
- Implement FFmpeg extraction in the same phase.
- Keep `PIPELINE_MODE=real` returning an immediate "not implemented" error.
- Reuse mock-mode JSON metadata upload in real mode until extraction exists.

Tradeoffs:
This does not yet produce a playable real output asset, so Phase 2 is not complete. It does validate actual multipart upload and failure persistence with lower debugging surface than combining upload and FFmpeg worker work in one step.

Confidence:
High.

Date:
2026-07-06
