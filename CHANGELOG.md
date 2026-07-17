# Changelog

This file records notable user-visible and developer-visible changes to the piano-practice POC.

The project currently uses date-based development milestones rather than numbered releases. Dates below follow the Git commit history. Planned work belongs in `TASKS.md`; conditional or unscheduled work belongs in `IDEAS.md`.

## Unreleased

### Added

- Added this curated changelog and made changelog maintenance part of the completion criteria for future implementation iterations.
- Added a gated waveform timing editor where users can zoom, scrub, and drag existing bar lines into persisted downbeat anchors.
- Added compact real/mock waveform result assets and a shared variable-tempo mapping module.

### Changed

- Displayed BPM now follows the active tempo-map segment, and segment edits move only its next anchored downbeat.
- Timeline markers, metronome clicks, chord timing, loops, Harmony overlays, and count-in now use the same invertible musical-time map.

### Fixed

- Fixed cumulative click and chord-chart drift on recordings that require more than one tempo segment.

## 2026-07-17 — Reliability and Full-Song Coverage

### Added

- Added direct bar-range selection for creating Harmony sections, including optional symbol, label, and color.
- Added visible `Saving...`, `Saved`, and `Save failed` feedback for practice settings.
- Added `GET /api/jobs` so queued, processing, failed, and completed jobs can be reconstructed from persisted backend state.
- Added a safe delete action for failed jobs.
- Added automated coverage for immediate song switching, save failure/recovery, active-job reload, failed-job reload, full-song analysis, and working charts larger than 128 events.

### Changed

- Practice-state writes now capture the edited job and an immutable payload snapshot, serialize requests, and flush pending work before changing songs.
- Active jobs resume polling after a browser reload, while failed jobs retain the original backend error.
- Harmonic analysis now covers the entire recording using an approximately 8 kHz mono analysis representation instead of retaining full-rate sample arrays for every source and stem.
- Increased the defensive working-chart limit from 128 to 4096 chord events.
- Separated the chronological execution roadmap in `TASKS.md` from conditional and unscheduled work in `IDEAS.md`.

### Fixed

- Fixed a race where rapid song switching could lose practice settings or save them to the wrong song.
- Fixed active and failed processing jobs disappearing after page reload.
- Fixed harmonic analysis stopping after 120 seconds.
- Fixed long editable chord charts being silently truncated after 128 events.

## 2026-07-08 — Musical Loops and Song Sections

### Added

- Added whole-bar loop controls based on the corrected musical grid.
- Added count-in before the first loop pass and every repeated pass.
- Added continuous Harmony loop ranges with draggable start/end handles and in-grid drag preview.
- Added persisted Flat Sections for labeling intro, verse, chorus, bridge, and other bar ranges without linking chord edits.
- Added section editing and deletion plus optional unlabeled visual ranges.
- Added direct chord resize on beat boundaries.

### Changed

- Simplified dense full-song timeline markers so bar numbers remain readable.
- Rendered section and loop ranges as continuous row chunks rather than repeating labels or outlines in every bar.
- Shared section normalization between frontend and backend, allowing adjacent ranges while rejecting overlap.
- Extracted pure chord-chart transforms into `public/chord-chart.js` with fast Node tests.

### Fixed

- Fixed covered Harmony cells remaining inaccessible after shortening a chord.
- Fixed deleting the final user chord from restoring analyzer chords unexpectedly.
- Fixed overlapping section ranges being persisted.

## 2026-07-07 — Grid Calibration and Editable Harmony

### Added

- Added first-pass real harmonic analysis for tempo, meter, downbeat, key, beat-aware chord names, roman numerals, confidence, and source metadata.
- Added generated known-answer fixtures for pre-roll/downbeat placement, multiple chord changes in 4/4, 3/4 meter, and bass inversions.
- Added an audible, persisted grid click with volume, mute, solo, and downbeat accent.
- Added manual BPM, Bar 1, time-signature, and key correction while preserving analyzer provenance.
- Added an editable grid-first chord chart with chord rename, add, delete, drag, and beat-snapped resize.
- Added compact Harmony layouts with 1, 2, 4, or 8 bars per row and name/roman display modes.
- Added loop count-in pre-roll.
- Increased the real upload limit to 150 MB.

### Changed

- User chord edits now persist as `practiceState.chordChart` events positioned by bar and musical divisions rather than seconds.
- The user working chart becomes authoritative for Harmony display and roman numerals after the first edit, while analyzer suggestions remain unchanged in job metadata.
- Timeline markers, chord placement, metronome clicks, loops, and selected-song metadata now use the corrected grid.

### Fixed

- Improved half-tempo, missed-chord, downbeat-offset, and inversion-root behavior in the first real analyzer.
- Fixed Harmony placement drifting away from user-corrected tempo and Bar 1.
- Fixed chord resize and deletion edge cases.

## 2026-07-06 — Real Processing and Unified Song Workspace

### Added

- Added a responsive unified song workspace for uploads, active processing, failures, and completed songs.
- Added real multipart media upload with persistent per-job source files.
- Added FFmpeg extraction to uncompressed PCM `source-audio.wav`.
- Added a piano-focused separation spike and a repeatable stem-separation bakeoff.
- Added Demucs `htdemucs_6s` separation for drums, bass, guitar, piano, vocals, and other stems.
- Added Mock/Real pipeline switching and active separator reporting.
- Added human-readable song duration and responsive desktop/mobile list-detail navigation.

### Changed

- Selected Demucs as the default real-mode separator after human listening; retained FFmpeg spectral separation as an explicit lightweight fallback.
- Preserved source channel count and sample rate during FFmpeg extraction before Demucs processing.
- Kept mock mode dependency-light and fully demoable when FFmpeg, Demucs, or heavy ML dependencies are unavailable.

### Fixed

- Fixed cases where the UI reported Real mode while using the FFmpeg fallback without making that visible.
- Fixed selected-song and library duration falling back to incomplete harmonic cue length.
- Fixed playback pause/resume and responsive layout regressions in the early workspace.

## 2026-07-05 — First End-to-End POC

### Added

- Added the first mock upload-to-processing-to-practice journey.
- Added realistic asynchronous mock job progress and persisted job metadata.
- Added synchronized stem playback with piano plus drums, bass, and guitar or a combined accompaniment fallback.
- Added stem mute, solo, and volume controls, playback speed, passage looping, and approximate harmonic cues.
- Added a processed-song library with reopen, rename, delete, learning status, saved practice state, and last position.
- Added a processed-demo shortcut for opening a complete mock result without selecting media.
- Added backend and Playwright smoke tests for the core demo path.

### Changed

- Mock mode uses local piano/accompaniment demo stems when available and generated WAV stems otherwise.
- Independent transport state keeps playback position stable across stem mute and solo changes.

### Fixed

- Fixed muted or soloed stems restarting from the beginning when returning to the mix.
- Fixed continuous media seeking that could cause silent or unstable playback.
