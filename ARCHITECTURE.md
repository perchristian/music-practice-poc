# ARCHITECTURE.md

## Current Recommendation

Build a local web POC with a lightweight Node.js backend and static browser client.

The backend owns uploads, job status, pipeline mode, generated mock stem assets, and future real-pipeline integration. The browser owns file selection, upload progress, polling, synchronized stem playback, per-stem mute/solo controls, audio playback speed, loop controls, and harmonic display.

## Runtime Modes

- `PIPELINE_MODE=mock`: default. Uses no heavy ML, no FFmpeg, no GPU, and no large media. It simulates realistic processing and returns local demo stems when available, otherwise generated audio, plus plausible harmonic metadata.
- `PIPELINE_MODE=real`: accepts real multipart media uploads, stores the source file under each job directory, invokes FFmpeg, writes `source-audio.wav`, runs Demucs `htdemucs_6s` by default to create drums, bass, guitar, piano, vocals, and other stems, then runs first-pass beat-aware harmonic analysis over the extracted full mix. The old FFmpeg spectral piano/accompaniment split remains available with `REAL_SEPARATOR=ffmpeg-spectral`.

Stable browser URLs and the topbar information popover can switch the active backend mode between `mock` and `real` for new uploads in the current local server session. `PIPELINE_MODE` remains the server startup default, and existing jobs retain the mode they were created with.

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
- `GET /api/jobs`: returns all persisted jobs, including queued, processing, failed, and complete states, so the unified song list can recover lifecycle state after a browser reload.
- `GET /api/jobs/:id`: returns job status, progress, stem result URLs, and harmonic metadata when ready. In mock mode the result contains piano plus accompaniment when local demo stems are available, otherwise generated drums, bass, guitar, and piano stems. In real mode the result currently contains Demucs stems by default and approximate beat-aware harmonic metadata.
- `GET /api/jobs/:id/stems/:stem.wav` or `GET /api/jobs/:id/stems/:stem.m4a`: returns a processed stem asset.
- `GET /api/jobs/:id/piano.wav`: compatibility endpoint for the processed piano-focused audio.
- `GET /api/jobs/:id/source-audio.wav`: returns the extracted real-mode full mix used as the timing/harmony reference.
- `GET /api/jobs/:id/waveform.json`: returns the compact versioned min/max peak envelope, generating it lazily for older completed jobs when possible.
- `GET /api/library`: returns completed processed songs that can be reopened without creating a new processing job.
- `PUT /api/jobs/:id/practice-state`: persists per-song learning status, stem state, playback/loop state, constant grid overrides, optional versioned timing events, chord chart, sections, and view settings.
- `POST /api/jobs/:id/reanalyze-harmony`: re-runs real-audio chord analysis against persisted corrected timing after explicit working-chart replacement confirmation.
- `POST /api/jobs/:id/chord-chart/back-to-analysis`: after explicit confirmation, snapshots the user chart against the active analysis identity and returns to immutable conservative suggestions.
- `POST /api/jobs/:id/chord-chart/undo-back-to-analysis`: restores that snapshot once only when the same analysis is still active and no newer working chart exists.
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

The processed-song library treats completed jobs as reusable practice items instead of one-off processing results. `GET /api/library` remains completed-only, while `GET /api/jobs` lets the client reconstruct active and failed rows and resume active polling after a browser reload. Practice state such as stem mute/solo state, per-stem volume, playback speed, loop points, learning status, last position, grid overrides, key override, and the user's working chord chart is stored per song in `job.json`. User chord edits now persist as grid-first `practiceState.chordChart` events; seconds-based cue values are derived from the corrected grid at render/playback time. A confirmed corrected-timing reanalysis stores the prior chart in `practiceState.chordChartBackup` and the new derived result in `metadata.correctedTimingAnalysis`; original `metadata.chords` remains unchanged. Notes and multiple named practice loops are deferred until after the beat-aligned chord chart UI work.

## Library UX

The frontend uses the Voice Memos-inspired song workspace documented in `UX_FLOOR_PLANS.md`.

Pipeline mode is part of the browser entry URL (`?mode=real` or `?mode=mock`) rather than a transient main-surface control. A browser with no saved preference is redirected from the root to Real; later root visits reuse the last successfully selected mode. The processed-demo route explicitly selects Mock. The URL selection is applied through the existing backend setting endpoint because this remains a single-user local POC. Mode links and backend readiness live in the compact app-information popover.

Library video thumbnails remain lightweight data URLs in each job record. New captures are centered 240 px square JPEG crops, and both list and selected-song artwork enforce clipped square presentation so older non-square thumbnails remain usable.

The backend API and storage model should remain the same. This is primarily a client layout and navigation change:

- desktop and wide tablet: persistent song list on the left, selected song detail/practice on the right
- mobile: list-first stack with song detail as the second screen
- active uploads, processing jobs, failed jobs, and completed songs shown in one status-first list
- full-row song selection instead of a separate Open button
- selected-song header actions for rename, delete, and future overflow actions

## Frontend UI System

The current frontend remains a static HTML, CSS, and vanilla JavaScript app. The recommended UI direction is a small internal design system extracted from existing patterns, not a migration to React, shadcn/Radix, Ionic, Material, Tailwind, or a broad web-component library.

Reason:
- The current UI is already heavily domain-specific: synchronized transport, stem mixer, grid-snapped loops, metronome controls, and the editable Harmony chart would remain custom even with a component library.
- The POC still benefits from a no-build frontend that another developer can inspect and run quickly.
- Mobile validation depends more on predictable layout, touch targets, no overflow, and responsive density than on adopting a full external design system.

The internal design system should standardize the primitives already present:

- colors, spacing, borders, shadows, type sizes, focus rings, and disabled states
- primary, secondary, danger, and icon buttons
- segmented controls for modes and speed
- selects, numeric nudge fields, range sliders, toggles, and search fields
- panels, menus, list rows, status chips, progress, and mixer/control rows
- responsive rules for the list-first mobile workspace, Harmony chart, and stem mixer

Web Awesome or another web-component library can be reconsidered later for isolated primitives such as menu, dialog, tooltip, switch, or slider if repeated internal implementations become a real maintenance cost. That should be a specific dependency decision, not a default migration.

## Pipeline Strategy

The pipeline boundary should be stable:

```text
input media file -> processing job -> stem audio assets + harmonic metadata
```

Mock mode records selected file metadata, simulates upload/processing, copies local demo stems from `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a` when both exist, and returns deterministic harmonic metadata. If those local files are missing, it generates short drums, bass, guitar, and piano WAV stems. It intentionally does not upload the full video bytes, so large screen recordings remain usable during POC demos.

Real mode now stores uploaded source media, extracts `source-audio.wav` through FFmpeg, runs Demucs `htdemucs_6s` by default, and then runs `beat-aware-chroma-v3` over the full mix plus usable separated stems to estimate tempo, meter, first downbeat, beat/bar grid, key, chord names, and roman numerals. PCM readers cover the full recording and reduce each source/stem to an approximately 8 kHz mono analysis representation, avoiding the previous 120-second truncation without retaining full-rate analysis arrays for every stem. Bass/accompaniment stems support root evidence; other/accompaniment/guitar/piano stems support chord-quality evidence; very quiet stems are ignored. The old `ffmpeg-spectral-piano-v1` separator remains as an explicit fallback for lightweight testing. The current harmonic analyzer is a spike: it scores beat-length segments, replaces an isolated one-beat chord estimate when both neighboring labels agree, merges adjacent repeated labels within each bar, and can emit multiple chord cues inside one bar when evidence remains strong. It can still pick the wrong tempo, meter, downbeat, key, or chord quality on real recordings.

After timing correction, `beat-aware-chroma-corrected-timing-v2` can reuse the existing source/stem audio, score chroma over beat windows derived from `practiceState.timingMap`, and apply the same conservative isolated-beat smoothing. This is a user-triggered derived analysis rather than a mutation of the original analyzer evidence. It becomes the active suggestion layer only after confirmation, with the displaced working chart retained as a backup. When `practiceState.keyOverride` exists, that user key is authoritative for the derived analysis key and roman numerals; it does not force every detected chord to be diatonic, so borrowed/secondary harmony remains representable. Without a user key, the analyzer retains its estimated-key path.

The next architecture priority is not a more complex chord labeler. It is a user-correctable musical grid and chord chart:

1. make the analyzed beat/bar grid audible with a metronome/click: implemented for Phase 3A
2. let the user correct bar 1, tempo, time signature, and key while listening: implemented for Phase 3B with numeric fields, 0.01-second nudges, half/double tempo buttons, typed BPM, and 4/4, 3/4, 5/4, 6/8, 7/8, and 12/8 options
3. store analyzer chord output as draft suggestions: implemented by keeping `job.result.metadata.chords` unchanged
4. let the user add, edit, split, merge, move, and delete chord labels on bars/beats: implemented for Phase 3C
5. persist user-edited chords as the song's working chart, overriding analyzer suggestions: implemented as grid-first `practiceState.chordChart`
6. replace the previous seconds-first `practiceState.chordEdits` shape with a grid-first working chart model: implemented for Phase 3D
7. render that working chart as a beat-aligned chord chart instead of a plain cue list: implemented
8. continue evaluating better analyzers such as librosa/Essentia/LLM-hybrid as ways to improve the first draft

one subsystem at a time.

The chord chart storage made a clean break during the POC. Existing local songs are disposable unless they are explicitly documented as fixture, demo, or calibration jobs. If the grid-first chart model invalidates runtime jobs created with the old `chordEdits` shape, delete local songs/jobs and regenerate fresh examples instead of adding migration or compatibility layers.

The target working-chart shape is a small explicit JSON model, not MusicXML or ChordPro as the internal source of truth:

```json
{
  "version": 1,
  "divisionsPerQuarter": 4,
  "chords": [
    {
      "id": "c1",
      "bar": 1,
      "offsetDiv": 0,
      "durationDiv": 16,
      "raw": "Cmaj7",
      "source": "user"
    }
  ]
}
```

Seconds-based `start` and `end` values should become derived playback/rendering values computed from the corrected grid. User-entered chord text remains authoritative and should be preserved as `raw`; parsing for roman numerals, display, or later transposition remains best-effort.

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

The implemented analyzer currently records `harmonySource: "real-audio-analysis-v2"`, `analysisSource`, `beatGrid`, `beatOffsetSeconds`, `downbeatOffsetSeconds`, `downbeatConfidence`, per-cue `bar`, `beat`, `confidence`, the sequence-smoothing mode, and analyzer limitations. It emits beat-aware chord cues, suppresses isolated one-beat disagreements between matching neighbors, and merges repeated labels within a bar while preserving repeated labels across bar boundaries. These cues are immutable analyzer suggestions in `job.result.metadata.chords`; they are evidence/provenance, not the user's source of truth. On first edit the app seeds a separate grid-first `practiceState.chordChart`, and that user working chart becomes authoritative for presentation, playback alignment, bar-based loops, roman numerals, and practice notes.

The analyzer keeps three explicit chord layers:

- `metadata.chords`: the immutable conservative suggestion chart shown by default.
- `metadata.suppressedChordSuggestions`: only raw one-beat candidates changed by the conservative `A-B-A` smoothing rule, including their original musical position, label, confidence, and suppression reason. The complete dense beat sequence is not duplicated in persisted job metadata.
- `practiceState.chordChart`: the user's authoritative chart. Adding a suppressed suggestion is an explicit local edit that replaces only the overlapping beat and preserves the surrounding working chord before and after it.

Corrected-timing reanalysis stores the same two immutable analyzer layers inside `metadata.correctedTimingAnalysis`; `effectiveMetadata` selects those together so suggestions cannot be mixed across analyzer timing versions. Already recovered suggestions are hidden by matching their musical position and label against the working chart.

`Back to analysis` is distinct from adding one suggestion. It requires confirmation whenever a working chart exists, snapshots that exact chart with the active analysis identity and reason, then resets presentation to the current conservative analyzer layer. `Undo reset` restores the snapshot once only when the song still has no newer working chart and the same analysis identity remains active. Corrected-timing reanalysis assigns a new identity and creates an undoable snapshot only when it actually displaces a working chart; stale backups are cleared rather than carried across analyses. Neither path merges or trains on user edits.

Future analyzer work must keep analysis evidence separate from presentation policy. A denser candidate layer may support optional extra chord changes, comparison against user corrections, and an explicit `Back to analysis` action without silently overwriting the working chart. Any restore operation should require confirmation or undo. The exact conservative presentation rule is deferred until the same real-song fixtures and user corrections can be compared in a joint calibration loop.

Chord text should remain user-preserving. The app may parse root, quality, bass note, and extensions for display, roman numerals, and future transposition, but it must keep the original entered label because useful musician notation can be ambiguous. For example, `Csus2`, `C9`, `C7/F`, and `F11` can be different names for similar harmonic evidence depending on context.

The metronome is part of grid calibration. It now plays against the song from the current effective `beatGrid`, with downbeat emphasis and mixer-style mute/solo/volume controls stored in `practiceState`. Phase 3B adds persistent user corrections for BPM, bar 1 start, and time signature in `practiceState.gridOverrides`, while preserving analyzer metadata as provenance. Phase 3D stores the user's working chart in `practiceState.chordChart`; each event keeps musical placement as `bar`, `offsetDiv`, and `durationDiv`, and the UI derives internal seconds-based cue timing from the corrected grid while rendering Harmony as bar rows and beat cells.

Phase 3G extends timing because one BPM, one offset, and one global meter cannot follow rubato, human tempo drift, or meter changes. The implemented model keeps `job.result.metadata.beatGrid` immutable, retains `practiceState.gridOverrides` as the constant-grid fallback, and stores optional user-owned `practiceState.timingMap` version-2 events. Each ordered bar event may carry `timeSeconds`, `timeSignature`, or both. Existing version-1 `practiceState.tempoMap` anchors normalize into version-2 events with the active initial meter, preserving intentional local calibration.

The timing editor reuses the existing bar lines over a zoomable source waveform rather than introducing a separate anchor lane. Normal playback remains non-editable but now exposes Zoom, Fit, and optional Follow on the same horizontally scrollable viewport. Per-song `practiceState.timelineView` stores the playback zoom and Follow preference; Follow defaults off, keeps the playhead near 37.5% while possible, and yields to manual panning. `Edit timing` suppresses Follow and uses a separate ephemeral zoom while exposing waveform scrubbing, bar-line drag, precise nudge, and anchor removal/reset. Real mode generates a compact versioned 80-peaks-per-second min/max envelope from `source-audio.wav`; mock mode provides deterministic representative peaks without adding heavy dependencies. The waveform is a separate job result asset, so raw full-source PCM is not decoded in the browser.

All time-sensitive consumers use the shared map: timeline/bar enumeration, metronome scheduling and accents, chord cue windows/current highlighting, bar loops, Harmony, count-in, and inverse seeking. Tempo is derived from musical pulse distance and timed events rather than persisted independently. Simple meters use one pulse per written beat; 6/8 and 12/8 use two and four dotted-quarter pulses respectively; 7/8 stays at eighth-note pulses because grouping is not known. Chord and section positions remain grid-first. Removing one correction aspect preserves the other, and `/2`, `x2`, and the global meter control are disabled while mapped timing is active.

Automatic real-mode timing is now an explicit stage before harmony segmentation. `persistent-relative-deviation-v1` searches plausible onset observations around the base grid and creates a sparse tempo boundary only after an 18% relative phase error or 8% local-tempo deviation persists for four beats. Meter candidates require two persistent local bars and are currently limited to 3/4 and 4/4. Accepted analyzer spans drive the immutable analysis result, while candidates/confidence/limitations remain under `metadata.beatGrid.timingAnalysis`; they never write `practiceState.timingMap`. The generated timing development set covers leading silence, pickup, jitter, abrupt tempo change, gradual accelerando/ritardando, and 4/4-to-3/4 change. Real screen-recording validation remains a human gate.

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
| Piano stems can be isolated accurately enough | Medium | Demucs `htdemucs_6s` was accepted for the MakeYouFeelMyLovePart2 play-along use case, though solo piano has artifacts | Need more songs and longer screen recordings |
| Muting piano while keeping other stems useful helps practice | Medium | Strong learning rationale; mock mixer now demonstrates flow | Need tester feedback |
| Transcription can produce useful cues | Low | Dense piano is difficult | Need Basic Pitch or alternative benchmark |
| Harmonic cues remain useful despite errors | Medium | Phase 2H produces downbeat-aligned C/Am/F/G cues on generated known-chord media with pre-roll before first downbeat | Need manual inspection on real screen recordings and user feedback |
| Processing time is acceptable | Low to medium | Phase 2G/2H short generated samples pass automated tests; Demucs completed the local bakeoff clip | Need measurement on longer real screen recordings |
| Local backend is practical | Medium | Simple local web flow should work | Need run-through on MacBook |
| Web upload is enough before native iOS | Medium | AGENTS.md allows web/local uploader first | Need tester feedback on friction |

## Dependency Policy

Mock mode must avoid heavy ML dependencies. Real-pipeline dependencies must be installed through an explicit real-mode setup path later.
