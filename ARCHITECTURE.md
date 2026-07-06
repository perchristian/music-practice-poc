# ARCHITECTURE.md

## Current Recommendation

Build a local web POC with a lightweight Node.js backend and static browser client.

The backend owns uploads, job status, pipeline mode, generated mock stem assets, and future real-pipeline integration. The browser owns file selection, upload progress, polling, synchronized stem playback, per-stem mute/solo controls, audio playback speed, loop controls, and harmonic display.

## Runtime Modes

- `PIPELINE_MODE=mock`: default. Uses no heavy ML, no FFmpeg, no GPU, and no large media. It simulates realistic processing and returns local demo stems when available, otherwise generated audio, plus plausible harmonic metadata.
- `PIPELINE_MODE=real`: accepts real multipart media uploads, stores the source file under each job directory, invokes FFmpeg, writes `source-audio.wav`, and runs a narrow FFmpeg spectral split that creates `piano.wav` and `accompaniment.wav`. Harmonic analysis is still mocked.

The browser topbar can switch the active backend mode between `mock` and `real` for new uploads in the current local server session. `PIPELINE_MODE` remains the startup default, and existing jobs retain the mode they were created with.

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

- `GET /api/health`: returns active mode, startup mode, FFmpeg path, and service status.
- `PUT /api/settings/pipeline-mode`: switches active local pipeline mode for new jobs between `mock` and `real`.
- `POST /api/jobs`: in mock mode, accepts JSON file metadata and creates one simulated upload job per request; in real mode, accepts one multipart media file, stores it in the job directory, and creates a processing job. The browser can create multiple jobs from one multi-file selection.
- `GET /api/jobs/:id`: returns job status, progress, stem result URLs, and harmonic metadata when ready. In mock mode the result contains piano plus accompaniment when local demo stems are available, otherwise generated drums, bass, guitar, and piano stems. In real mode the result currently contains heuristic piano and accompaniment WAV stems.
- `GET /api/jobs/:id/stems/:stem.wav` or `GET /api/jobs/:id/stems/:stem.m4a`: returns a processed stem asset.
- `GET /api/jobs/:id/piano.wav`: compatibility endpoint for the processed piano-focused audio.
- `GET /api/library`: returns completed processed songs that can be reopened without creating a new processing job.
- `PUT /api/jobs/:id/practice-state`: persists per-song learning status, stem mute/solo/volume state, playback speed, loop points, and last playback position.
- `PUT /api/jobs/:id/rename`: renames a processed song for the local library.
- `DELETE /api/jobs/:id`: deletes a processed song and its local files.

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

Use local filesystem storage under `data/` for the POC. Store uploaded files, generated outputs, job metadata, and per-song practice state per job. This is easy to inspect and sufficient for local demos.

Cloud/object storage is deferred until remote demos or larger files require it.

The processed-song library treats completed jobs as reusable practice items instead of one-off processing results. Practice state such as stem mute/solo state, per-stem volume, playback speed, loop points, learning status, and last position is stored per song in `job.json`. Notes and multiple named practice loops are deferred to Phase 3.

## Library UX

The frontend uses the Voice Memos-inspired song workspace documented in `UX_FLOOR_PLANS.md`.

The backend API and storage model should remain the same. This is primarily a client layout and navigation change:

- desktop and wide tablet: persistent song list on the left, selected song detail/practice on the right
- mobile: list-first stack with song detail as the second screen
- active uploads, processing jobs, failed jobs, and completed songs shown in one status-first list
- full-row song selection instead of a separate Open button
- selected-song header actions for rename, delete, and future overflow actions

## Pipeline Strategy

The pipeline boundary should be stable:

```text
input media file -> processing job -> stem audio assets + harmonic metadata
```

Mock mode records selected file metadata, simulates upload/processing, copies local demo stems from `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a` when both exist, and returns deterministic harmonic metadata. If those local files are missing, it generates short drums, bass, guitar, and piano WAV stems. It intentionally does not upload the full video bytes, so large screen recordings remain usable during POC demos.

Real mode now stores uploaded source media, extracts `source-audio.wav` through FFmpeg, then runs `ffmpeg-spectral-piano-v1`, a lightweight non-ML split that writes `stems/piano.wav` and `stems/accompaniment.wav`. This is a spike to exercise the product flow and metadata contract, not a final separation strategy. The accompaniment removes much of the midrange, so it may also remove guitars, vocals, synths, and other learning-relevant material. Real harmonic analysis is not implemented yet. Real mode should next replace:

1. transcription or chord extraction
2. harmonic analysis
3. the heuristic separator with a better real separator if listening tests show the current split is not practice-useful

one subsystem at a time.

## Whole-Song Harmonic Analysis Strategy

Chord and key detection should estimate the harmony of the whole song, not transcribe only the piano stem.

The analysis pipeline should treat `source-audio.wav` as the primary harmonic context and use any available stems as supporting evidence. Bass or low-frequency content is important for root and inversion candidates. Piano, guitar, and harmonic accompaniment are important for chord quality and extensions. The full mix remains important because early separation may leak or remove musically relevant notes.

Recommended analysis shape:

```text
source-audio.wav + optional stems
  -> beat/bar or fixed-window segmentation
  -> pitch-class/chroma features from full mix and harmonic stems
  -> bass/root candidates from low-frequency content
  -> chord-template scoring
  -> temporal smoothing
  -> key estimate + chord names + roman numerals + confidence
```

The first implementation should use a conservative vocabulary: major/minor triads, dominant 7, minor 7, major 7, sus chords, and diminished chords. Extensions such as 9, 11, 13, altered dominants, slash chords, and borrowed chords should only be displayed when confidence is high. If the evidence is ambiguous, the app should show the simpler musically useful label, such as `C7`, instead of a more specific but weakly supported label such as `C13`.

The result metadata should record which evidence streams were used, the chord vocabulary level, per-cue confidence where practical, and known limitations. Melody extraction can use a piano stem later, but melody extraction should remain separate from whole-song chord estimation.

## Native iOS Transition Criteria

Native iOS remains deferred until the web POC demonstrates enough learning value or mobile-specific friction becomes the dominant blocker.

Move to a native iOS feasibility spike when most of these are true:

- The web POC has a processed-song library.
- Processed songs can be reopened without reprocessing.
- Practice state persists per song.
- A first real-pipeline spike has been tested with real screen recordings.
- The app has at least a simple BPM/time-signature/downbeat model, or the absence of one is clearly blocking learning validation.
- User feedback indicates import, storage, caching, background audio, recording, or mobile workflow is more limiting than web feature maturity.

The first iOS spike should stay narrow: choose a video from Photos, upload it to the existing backend, open a processed result, play stems, and cache processed stems locally. It should not replace the web POC until it proves that native workflow materially improves validation.

## Critical Assumptions

| Assumption | Confidence | Evidence | Remaining uncertainty |
| --- | --- | --- | --- |
| Screen recording audio quality is sufficient | Low | Not tested yet | Need real iOS screen recordings from target apps |
| Piano stems can be isolated accurately enough | Low | Phase 2G creates heuristic FFmpeg piano/accompaniment stems from a generated sample, but this is not ML separation | Need human listening on real screen recordings and likely a stronger separator |
| Muting piano while keeping other stems useful helps practice | Medium | Strong learning rationale; mock mixer now demonstrates flow | Need tester feedback |
| Transcription can produce useful cues | Low | Dense piano is difficult | Need Basic Pitch or alternative benchmark |
| Harmonic cues remain useful despite errors | Medium | Approximate chords can still orient learners | Need user feedback |
| Processing time is acceptable | Low to medium | Phase 2G direct FFmpeg smoke on a 6-second generated sample took about 0.06s for extraction and 0.05s for spectral splitting | Need measurement on longer real screen recordings and any future ML separator |
| Local backend is practical | Medium | Simple local web flow should work | Need run-through on MacBook |
| Web upload is enough before native iOS | Medium | AGENTS.md allows web/local uploader first | Need tester feedback on friction |

## Dependency Policy

Mock mode must avoid heavy ML dependencies. Real-pipeline dependencies must be installed through an explicit real-mode setup path later.
