# ARCHITECTURE.md

## Current Recommendation

Build a local web POC with a lightweight Node.js backend and static browser client.

The backend owns uploads, job status, pipeline mode, generated mock stem assets, and future real-pipeline integration. The browser owns file selection, upload progress, polling, synchronized stem playback, per-stem mute/solo controls, audio playback speed, loop controls, and harmonic display.

## Runtime Modes

- `PIPELINE_MODE=mock`: default. Uses no heavy ML, no FFmpeg, no GPU, and no large media. It simulates realistic processing and returns local demo stems when available, otherwise generated audio, plus plausible harmonic metadata.
- `PIPELINE_MODE=real`: accepts real multipart media uploads, stores the source file under each job directory, invokes FFmpeg, writes `source-audio.wav`, runs Demucs `htdemucs_6s` by default to create drums, bass, guitar, piano, vocals, and other stems, then runs first-pass beat-aware harmonic analysis over the extracted full mix. The old FFmpeg spectral piano/accompaniment split remains available with `REAL_SEPARATOR=ffmpeg-spectral`.

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
- `GET /api/jobs/:id`: returns job status, progress, stem result URLs, and harmonic metadata when ready. In mock mode the result contains piano plus accompaniment when local demo stems are available, otherwise generated drums, bass, guitar, and piano stems. In real mode the result currently contains Demucs stems by default and approximate beat-aware harmonic metadata.
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

The processed-song library treats completed jobs as reusable practice items instead of one-off processing results. Practice state such as stem mute/solo state, per-stem volume, playback speed, loop points, learning status, last position, grid overrides, key override, and the user's working chord chart is stored per song in `job.json`. User chord edits now persist as grid-first `practiceState.chordChart` events; seconds-based cue values are derived from the corrected grid at render/playback time. Notes and multiple named practice loops are deferred until after the beat-aligned chord chart UI work.

## Library UX

The frontend uses the Voice Memos-inspired song workspace documented in `UX_FLOOR_PLANS.md`.

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

Real mode now stores uploaded source media, extracts `source-audio.wav` through FFmpeg, runs Demucs `htdemucs_6s` by default, and then runs `beat-aware-chroma-v2` over the full mix plus usable separated stems to estimate tempo, meter, first downbeat, beat/bar grid, key, chord names, and roman numerals. Bass/accompaniment stems support root evidence; other/accompaniment/guitar/piano stems support chord-quality evidence; very quiet stems are ignored. The old `ffmpeg-spectral-piano-v1` separator remains as an explicit fallback for lightweight testing. The current harmonic analyzer is a spike: it scores beat-length segments, merges adjacent repeated labels within each bar, and can emit multiple chord cues inside one bar when evidence is strong. It can still pick the wrong tempo, meter, downbeat, key, or chord quality on real recordings.

The next architecture priority is not a more complex chord labeler. It is a user-correctable musical grid and chord chart:

1. make the analyzed beat/bar grid audible with a metronome/click: implemented for Phase 3A
2. let the user correct bar 1, tempo, time signature, and key while listening: implemented for Phase 3B with numeric fields, 0.01-second nudges, half/double tempo buttons, typed BPM, and 4/4, 3/4, 5/4, 6/8, 7/8, and 12/8 options
3. store analyzer chord output as draft suggestions: implemented by keeping `job.result.metadata.chords` unchanged
4. let the user add, edit, split, merge, move, and delete chord labels on bars/beats: implemented for Phase 3C
5. persist user-edited chords as the song's working chart, overriding analyzer suggestions: implemented as grid-first `practiceState.chordChart`
6. replace the previous seconds-first `practiceState.chordEdits` shape with a grid-first working chart model: implemented for Phase 3D
7. render that working chart as a beat-aligned chord chart instead of a plain cue list: planned for Phase 3E
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

The implemented Phase 2H spike currently records `harmonySource: "real-audio-analysis-v1"`, `analysisSource`, `beatGrid`, `beatOffsetSeconds`, `downbeatOffsetSeconds`, `downbeatConfidence`, per-cue `bar`, `beat`, `confidence`, and analyzer limitations. It emits beat-aware chord cues and merges repeated labels within a bar, while preserving repeated labels across bar boundaries. These cues should be treated as draft chart data. User edits must be stored separately from analyzer suggestions and should become authoritative for playback, bar-based loops, roman numerals, and practice notes.

Chord text should remain user-preserving. The app may parse root, quality, bass note, and extensions for display, roman numerals, and future transposition, but it must keep the original entered label because useful musician notation can be ambiguous. For example, `Csus2`, `C9`, `C7/F`, and `F11` can be different names for similar harmonic evidence depending on context.

The metronome is part of grid calibration. It now plays against the song from the current effective `beatGrid`, with downbeat emphasis and mixer-style mute/solo/volume controls stored in `practiceState`. Phase 3B adds persistent user corrections for BPM, bar 1 start, and time signature in `practiceState.gridOverrides`, while preserving analyzer metadata as provenance. Phase 3D stores the user's working chart in `practiceState.chordChart`; each event keeps musical placement as `bar`, `offsetDiv`, and `durationDiv`, and the UI derives internal seconds-based cue timing from the corrected grid while rendering Harmony as bar rows and beat cells. The current UI uses direct numeric fields and 0.01-second nudge buttons instead of a waveform editor; waveform should be considered later only if manual listening shows the nudge-only flow is too blind for users.

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
