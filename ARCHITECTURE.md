# ARCHITECTURE.md

## Current Recommendation

Build a local web POC with a lightweight Node.js backend and static browser client.

The backend owns uploads, job status, pipeline mode, generated mock stem assets, and future real-pipeline integration. The browser owns file selection, upload progress, polling, synchronized stem playback, per-stem mute/solo controls, audio playback speed, loop controls, and harmonic display.

## Runtime Modes

- `PIPELINE_MODE=mock`: default. Uses no heavy ML, no FFmpeg, no GPU, and no large media. It simulates realistic processing and returns local demo stems when available, otherwise generated audio, plus plausible harmonic metadata.
- `PIPELINE_MODE=real`: future mode. Replaces mock subsystems one at a time while preserving the same API and client workflow.

## Recommended Architecture

```text
Browser UI
  - selects local video/audio file
  - POSTs to backend
  - polls job status
  - plays processed stems in sync
  - mutes/unmutes and solos individual stems, especially piano for play-along practice
  - controls speed and loop region
  - renders harmonic metadata

Node.js backend
  - serves static UI
  - accepts uploads
  - creates processing jobs
  - stores files under local data/
  - runs mock or real pipeline behind same interface
  - exposes job status and result assets

Local filesystem storage
  - uploaded source files
  - local demo stem copies or generated mock stem WAVs
  - job metadata JSON
```

## API Surface

- `GET /api/health`: returns mode and service status.
- `POST /api/jobs`: in mock mode, accepts JSON file metadata and creates a simulated upload job; in future real mode, accepts one uploaded media file and creates a processing job.
- `GET /api/jobs/:id`: returns job status, progress, stem result URLs, and harmonic metadata when ready. In mock mode the result contains piano plus accompaniment when local demo stems are available, otherwise generated drums, bass, guitar, and piano stems.
- `GET /api/jobs/:id/stems/:stem.wav` or `GET /api/jobs/:id/stems/:stem.m4a`: returns a processed stem asset.
- `GET /api/jobs/:id/piano.wav`: compatibility endpoint for the processed piano-focused audio.

## Alternative 1: Native iOS App First

Advantages:
- Direct Photos integration.
- Tests real mobile import friction immediately.
- Closer to eventual mobile workflow.

Disadvantages:
- Slower setup and iteration.
- Xcode and signing can dominate early learning.
- Does not reduce ML quality risk faster than a web flow.

Implementation effort: High.

Technical risk: Medium.

Expected demo quality: High for import realism, lower for rapid iteration.

Decision: Rejected for now. Native iOS should wait until the web POC demonstrates enough learning value or Photos access becomes the blocking assumption.

## Alternative 2: Python FastAPI Backend and Web Client

Advantages:
- Natural fit for later ML libraries.
- Strong ecosystem for audio and data processing.
- Clean API development.

Disadvantages:
- Adds Python web dependencies to mock mode.
- Requires dependency installation before the simplest demo.
- More setup than needed for mock-first validation.

Implementation effort: Medium.

Technical risk: Low to medium.

Expected demo quality: High.

Decision: Rejected for the first vertical slice. Reconsider when real ML pipeline work begins.

## Alternative 3: Static-Only Browser Mock

Advantages:
- Fastest implementation.
- No backend setup.
- Easy to demo.

Disadvantages:
- Does not exercise upload, job creation, or backend processing assumptions.
- Too far from the intended end-to-end workflow.
- Harder to replace mock subsystems gradually.

Implementation effort: Low.

Technical risk: Low.

Expected demo quality: Medium.

Decision: Rejected because it misses key backend flow assumptions.

## Storage Strategy

Use local filesystem storage under `data/` for the POC. Store uploaded files and generated outputs per job. This is easy to inspect and sufficient for local demos.

Cloud/object storage is deferred until remote demos or larger files require it.

## Pipeline Strategy

The pipeline boundary should be stable:

```text
input media file -> processing job -> stem audio assets + harmonic metadata
```

Mock mode records selected file metadata, simulates upload/processing, copies local demo stems from `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a` when both exist, and returns deterministic harmonic metadata. If those local files are missing, it generates short drums, bass, guitar, and piano WAV stems. It intentionally does not upload the full video bytes, so large screen recordings remain usable during POC demos.

Real mode should later replace:

1. audio extraction from video
2. multi-stem separation, with piano as the primary practice target
3. transcription or chord extraction
4. harmonic analysis

one subsystem at a time.

## Critical Assumptions

| Assumption | Confidence | Evidence | Remaining uncertainty |
| --- | --- | --- | --- |
| Screen recording audio quality is sufficient | Low | Not tested yet | Need real iOS screen recordings from target apps |
| Piano stems can be isolated accurately enough | Low | Known risk for mixed/compressed audio | Need real separator trial |
| Muting piano while keeping other stems useful helps practice | Medium | Strong learning rationale; mock mixer now demonstrates flow | Need tester feedback |
| Transcription can produce useful cues | Low | Dense piano is difficult | Need Basic Pitch or alternative benchmark |
| Harmonic cues remain useful despite errors | Medium | Approximate chords can still orient learners | Need user feedback |
| Processing time is acceptable | Low | Mock mode is fast only | Need CPU real-pipeline measurement |
| Local backend is practical | Medium | Simple local web flow should work | Need run-through on MacBook |
| Web upload is enough before native iOS | Medium | AGENTS.md allows web/local uploader first | Need tester feedback on friction |

## Dependency Policy

Mock mode must avoid heavy ML dependencies. Real-pipeline dependencies must be installed through an explicit real-mode setup path later.
