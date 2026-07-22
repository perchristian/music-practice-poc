# DEMO.md

## Goal

Demonstrate that a user can choose a screen recording, process it, return to the processed song from a library, hear separated stems, mute/unmute or solo stems, slow playback down, loop a passage, save practice state, label song sections, and view approximate harmonic information.

## Current Demo Mode

The first demo is intended to run in mock mode:

```text
PIPELINE_MODE=mock
```

Mock mode does not perform real stem separation or transcription. If local demo stems exist at `data/jobs/Bare piano.m4a` and `data/jobs/Uten piano.m4a`, it returns piano and accompaniment stems from those files so piano mute/unmute can be evaluated by ear. If those files are missing, it falls back to generated drums, bass, guitar, and piano WAV stems plus plausible harmonic metadata.

In mock mode, the browser sends selected file metadata instead of uploading the full video bytes. This keeps large iOS screen recordings usable while still exercising multi-file job creation, per-file processing status, the unified song workspace, reusable processed-song library entries, synchronized stem playback, per-stem mute/solo/volume controls, looping, learning status, beat/bar timeline markers over a deterministic waveform, variable-tempo downbeat correction, grid-aligned metronome click, editable key/meter corrections, editable chord-chart corrections, flat song-section labels, video thumbnail display when the browser can extract a frame, and harmonic display.

In real mode, the browser uploads the actual selected file as multipart form data, with a 150 MB POC upload limit. The backend stores the uploaded source media under the job directory, invokes FFmpeg, writes `source-audio.wav` as uncompressed PCM WAV, then runs Demucs `htdemucs_6s` by default to write `Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` stems. It also runs a first-pass dependency-free harmonic analysis across the full `source-audio.wav`, using a reduced-rate analysis representation for memory control: broad onset energy estimates tempo, first downbeat, and a beat/bar grid; beat-length chroma scoring estimates chord cues that can include multiple changes inside a bar when evidence is strong; and roman numerals are generated from the estimated key. Listening on `MakeYouFeelMyLovePart2.mov` showed the piano-removal play-along use case is good enough for the POC, while the solo piano stem can still contain crackle/artifacts.

Real-mode progress is approximate. FFmpeg extraction moves the job to the separation stage, and Demucs stderr percentages are mapped into the overall progress bar so stem separation should advance beyond 55% before completion when Demucs emits progress output.

The topbar includes a Mock/Real pipeline switch. `PIPELINE_MODE` is still the server startup default, but the GUI switch changes the active backend mode for new uploads in the current server session.

When Real mode is selected, the service status should show the active separator. `Backend ready: real · demucs-htdemucs_6s` means new uploads will use Demucs. `Backend ready: real · FFmpeg fallback` means the server was started with `REAL_SEPARATOR=ffmpeg-spectral`; stop that server and restart without `REAL_SEPARATOR=ffmpeg-spectral` if the goal is Demucs separation.

## Prerequisites

- Node.js installed.
- Project dependencies installed with `npm install`.
- A small local video or audio file to upload.
- In mock mode the file can be large, because only metadata is sent.
- In real mode the selected upload must be 150 MB or smaller.

No Demucs, Basic Pitch, FFmpeg, GPU, or heavy ML dependency is required for mock mode.

For real screen-recording tests, prefer clips with a short pause before the first downbeat. Current manual testing shows grid and chord alignment is easier to inspect when the first beat starts after the clip begins; clips where the first beat happens just before the recording starts require a negative Bar 1 time in `Edit timing` and are more fragile for demos.

Real mode requires FFmpeg for extraction. On macOS with Homebrew, it is commonly available at `/opt/homebrew/bin/ffmpeg`. If FFmpeg is not on `PATH`, set:

```bash
FFMPEG_PATH=/path/to/ffmpeg npm start
```

Real mode now uses Demucs by default. Install the optional heavy dependencies separately:

```bash
python3 -m venv .venv-real
.venv-real/bin/python -m pip install -r requirements-real.txt
```

Then run:

```bash
TORCH_HOME=.cache/torch PIPELINE_MODE=real npm start
```

The default uses `.venv-real/bin/python -m demucs`, which continues to work when
the repository is moved even if `.venv-real/bin/demucs` retains its old absolute
Python path. Use `DEMUCS_PYTHON` for a different interpreter or `DEMUCS_PATH` for
an explicit Demucs entrypoint.

To use the old lightweight FFmpeg spectral split instead of Demucs:

```bash
REAL_SEPARATOR=ffmpeg-spectral PIPELINE_MODE=real npm start
```

## Run

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

If a sandbox blocks local port binding, run the same command in a normal terminal from the repository root.

To start with real mode selected by default:

```bash
PIPELINE_MODE=real npm start
```

For Demucs real mode, prefer:

```bash
TORCH_HOME=.cache/torch PIPELINE_MODE=real npm start
```

You can also start normally and switch Mock/Real from the topbar before uploading a file.

For repeated frontend testing where file selection and upload are not the thing being evaluated, open:

```text
http://localhost:3000/?demo=processed
```

This feature toggle creates a complete mock job and opens the processed practice view directly. It still uses backend-generated/copy-backed stems, the normal job result shape, and the same player controls as the full upload flow.

## Automated Verification

Run the backend smoke test:

```bash
npm test
```

Run the browser smoke test:

```bash
npx playwright install chromium
npm run test:gui
```

The browser smoke test covers the mock-mode happy path: backend readiness, GUI pipeline mode switching, multi-file selection, per-file progress in the unified song list, active and failed job recovery after reload, failed-job removal, job completion without automatically opening practice, full-row song selection, desktop workspace selection, mobile list-first navigation, status filtering, selected-song actions, persisted learning/practice state, stem controls, playback speed, loops/count-in, thumbnails, waveform rendering, timing edit-mode gating, edit-only zoom, downbeat drag/persistence, contextual segment BPM, variable-grid chord/loop alignment, beat/bar markers, metronome scheduling, key/meter correction, Harmony chord editing, section labels, and analyzer provenance.

The browser smoke test does not prove that the stems sound musically useful. Manual listening is still required before a user demo.

## Demo Steps

1. Open the local web app.
2. Choose one or more screen recordings or small media files.
3. Upload them from the song list.
4. Confirm each file appears immediately in the same song list with inline status/progress.
5. Reload once while mock processing is active and confirm its row returns and continues updating. Wait for mock processing to complete and confirm the app does not auto-open practice.
6. Confirm completed songs remain in the same list with human-readable activity time and duration.
7. Select a completed song by clicking the whole row.
8. On desktop, confirm the song list stays visible on the left while practice opens on the right.
9. On mobile, confirm the list opens first, then the selected song/practice detail, and the Songs button returns to the list.
10. Play the stem mix.
11. Confirm the mixer shows piano plus either accompaniment from the local demo stems or generated drums, bass, and guitar fallback stems.
12. Mute the piano stem so the non-piano backing remains while the piano drops out.
13. Solo the piano stem and confirm other stems drop out.
14. Confirm mute and solo cannot remain active at the same time on the piano stem.
15. Confirm the timeline shows beat/bar markers.
16. Unmute the `Grid click` mixer row, play the song, and listen for whether the click feels aligned with the music.
17. Use `/2` or `x2` next to the displayed tempo if the grid click is clearly half-time or double-time.
18. Click the displayed BPM, type a corrected tempo, and press Enter to audition the updated grid.
19. Select `Edit timing`. Confirm the timeline grows into a waveform editor and the normal timeline could not be edited before entering this mode.
20. Increase `Zoom` or pinch over the waveform. Confirm zoom stays centered on the playhead, or on the pointer/pinch center when interacting over the waveform. Horizontally scroll to a known downbeat.
21. Click a numbered bar line to lock it without moving it, or drag it onto the visible audio event. Use the arrow-icon nudges or exact Time field for fine adjustment. Use the Corrections list or previous/next buttons to revisit anchors, including Bar 1.
22. Confirm the anchored line is visually distinct from the red playhead, the displayed BPM changes as the playhead crosses segment boundaries, and click/chord timing updates immediately. Select `Done`, reload, reopen the song, and confirm corrections return; use `Reset corrections` from Bar 1 only when intentionally returning to the constant-tempo grid.
23. Select the known key before reanalysis. In Harmony, select `Reanalyse chords`, confirm that the warning names the selected key, and continue. Wait for the status to report how many new chord cues were generated from the corrected timing and which key was used. The previous working chart is retained as a backend backup. The key controls roman numerals but does not forbid borrowed/non-diatonic chord names.
24. If Harmony shows `Review hidden chords`, open it and audition one of the isolated one-beat changes that conservative smoothing removed. Select `Add` only when it sounds useful; confirm the surrounding working chord remains on both sides and the edit reaches `Saved`.
25. Adjust click volume from the mixer row; downbeat accent is always on for now.
26. Set count-in to `1 bar` without enabling Loop and confirm it prepares ordinary playback. Optionally enable `Start at Bar 1` to skip incomplete pre-roll. Then enable Loop and change its start/end; `1` means all of Bar 1. Confirm count-in repeats before each loop pass, including after timing corrections.
27. Change playback speed, stem volume, grid click settings, tempo correction, time signature, key, and learning status from the selected-song header. Time signature and `/2`/`x2` are intentionally disabled while a tempo map exists.
28. In the Harmony grid, confirm chords appear as compact blocks with chord names and roman numerals, without per-card bar/beat labels.
29. Change `Bars / row` and `View` to confirm the chart can show more of the song and can switch between name, roman, or both.
30. Select a bar range directly in Harmony, then create a section from the selection. Symbol, label, and color are optional; leave the text fields blank to confirm a visual range can be saved without text. Confirm the section appears as a band across the bar range, toggle its information display, then use its `Edit` and `x` controls to change or remove it.
31. Edit a chord label, drag a chord to another beat, drag a chord's right edge to shorten or lengthen it on beat boundaries, drag the active loop's Harmony handles across bars/rows, click `+` in an empty cell to add a chord, and use the small `x` in a chord corner to delete an extra cue.
32. Change a practice setting and confirm the selected-song header moves from `Saving...` to `Saved`. Reload the page, reopen the song from the unified song list, and confirm those practice settings, timing anchors, section labels, Harmony view settings, and chord edits return.
33. Rename the selected song from the selected-song header more menu.
34. Delete the selected song from the selected-song header more menu and confirm it disappears from the song list and no longer opens.
35. Inspect detected key, chord names, and roman numerals. Change key and confirm the roman numerals update best-effort for the working chart.

## Real-Mode Separation Smoke

1. Generate the local test fixtures if they are not already present:

```bash
npm run generate:test-media
```

2. Start the app with `PIPELINE_MODE=real npm start`, or switch to Real in the topbar.
3. Upload `test-media/phase-2h-bar-grid.wav`, `test-media/phase-2h-multi-chord-120.wav`, `test-media/phase-2h-three-four-90.wav`, `test-media/phase-2h-inversions-100.wav`, `test-media/phase-2g-piano-mix.wav`, or another short audio/video file.
4. Wait for the job to complete. During Demucs separation, the selected song should show `Separating stems` and progress should advance past 55% before the job reaches 100%.
5. Select the completed song and confirm the practice result shows `Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` stems when using Demucs.
6. Play the result and confirm the browser can load all stems.
7. Confirm Harmony shows compact bar sections with small bar numbers, beat-cell separators, and chord blocks when the analysis can estimate a grid.
8. Unmute the `Grid click` mixer row and listen for whether the click aligns with the real recording. Treat misalignment as expected calibration input, not necessarily an analysis failure.
9. If the click is half-time or double-time, use `/2` or `x2`; if it is close but still wrong, click the BPM value and type the corrected tempo.
10. Enter `Edit timing`, select Bar 1 in Corrections, and adjust its exact time or arrow nudges while listening to the click. Negative values are allowed when recording starts just after the downbeat. Switch time signature if accents are wrong.
11. If the click later drifts, zoom to a recognizable downbeat and click its numbered bar line to lock the preceding span, then drag or nudge the next incorrect line onto the waveform event. Repeat only at important later drift/tempo-change points.
12. Enable optional `Start at Bar 1`, set count-in independently, then enable Loop and set start/end as whole bars. Confirm loop playback starts at the corrected boundary and mapped count-in repeats on each pass.
13. Confirm beat markers and chord highlighting update immediately after timing correction while Harmony remains expressed in musical bars/beats rather than visible seconds.
14. Edit at least one chord label, add one section label, resize one chord, reload, reopen the song, and confirm BPM/grid seed, timing anchors, key, loop bars, sections, and chord chart persist.
15. Mute the piano stem and listen for whether the accompaniment has enough piano reduction for play-along practice.
16. Solo the piano stem and listen for whether the piano part is recognizable enough for learning.
17. Listen to the FFmpeg source extraction directly at `http://localhost:3000/api/jobs/<job-id>/source-audio.wav`.
18. Inspect the job directory under `data/jobs/<job-id>/` and confirm `source-audio.wav`, `waveform.json`, and the stem WAV files exist with nonzero size.

`source-audio.wav` is intentionally kept in each real-mode job directory so it can be compared against the original upload and the separated stems. The FFmpeg extraction step writes uncompressed `pcm_s16le` WAV rather than MP3/AAC, so compression artifacts heard after separation are more likely from the original screen recording or the separator than from FFmpeg's source-audio extraction.

If FFmpeg or Demucs is unavailable, the job should fail with a clear setup message instead of crashing the server. If separation fails, the job should fail with an API-visible separator error. Mock mode remains usable.

## Stem Separation Bakeoff

Use this when comparing separation quality on the same source recording inside the app.

Input files expected locally:

```text
test-media/MakeYouFeelMyLovePart2.mov
test-media/stems from logic/
```

Create or refresh the Logic baseline and FFmpeg spectral jobs:

```bash
npm run bakeoff:stems
```

Create or refresh those jobs plus a Demucs `htdemucs_6s` job after installing Demucs in `.venv-real`:

```bash
TORCH_HOME=.cache/torch npm run bakeoff:stems -- --demucs
```

The script creates processed library entries named:

```text
MakeYouFeelMyLovePart2 - Logic baseline
MakeYouFeelMyLovePart2 - FFmpeg spectral
MakeYouFeelMyLovePart2 - Demucs htdemucs_6s
```

Open the app, select each entry from the song list, mute or solo the piano stem, and compare whether the remaining stems are useful for play-along practice. Harmony cues in these bakeoff jobs are mocked; judge audio quality only.

## Fast Iteration Steps

1. Start the app with `PIPELINE_MODE=mock npm start`.
2. Open `http://localhost:3000/?demo=processed`.
3. Confirm the app lands directly on the processed practice view.
4. Test mute/solo, speed, loop, grid click, and harmonic cue changes without repeating file selection.

## Expected Result

The user should experience the intended learning workflow end to end. Mock mode remains the lightweight default, while real mode now exercises upload, extraction, stem separation, and approximate beat-aware harmonic analysis.

## Demo Media and Copyright

Do not include commercial recordings in the repository. Use a user-provided test file or a generated/local sample. The local demo stem files under `data/` are ignored by git and must be replaced with material the tester is allowed to process. The mock pipeline does not depend on the uploaded file content yet.

The Phase 2A/2G/2H real-pipeline spikes use generated safe local test inputs. Generate or refresh them with:

```bash
npm run generate:test-media
```

This creates:

- `test-media/phase-2a-source.wav`: synthesized sine-wave chord tones for upload/extraction smoke.
- `test-media/phase-2g-piano-mix.wav`: synthesized piano-band chords plus low bass and high accompaniment content for the separator smoke.
- `test-media/phase-2h-bar-grid.wav`: synthesized four-bar C, Am, F, G material with a clear 4/4 pulse and 0.65 seconds of pre-roll before the first downbeat for beat/bar-grid and chord-analysis smoke.
- `test-media/phase-2h-multi-chord-120.wav`: synthesized 4/4 material at 120 BPM with multiple chord changes inside bars.
- `test-media/phase-2h-three-four-90.wav`: synthesized 3/4 material at 90 BPM.
- `test-media/phase-2h-inversions-100.wav`: synthesized 4/4 material at 100 BPM where the bass plays chord tones other than the root.

These files are generated in-repo, are not commercial recordings, and do not include third-party audio. They are intentionally short and musically plain. The Phase 2G file can verify that the backend creates and serves practice-compatible stems; with default Demucs real mode that means six stems, while `REAL_SEPARATOR=ffmpeg-spectral` creates `piano.wav` and `accompaniment.wav`. It cannot prove quality on real screen recordings.

## Known Limitations

- Real mode uses Demucs by default for drums, bass, guitar, piano, vocals, and other stems, but quality is still only validated on a small number of local examples.
- Real transcription is not implemented yet.
- Chord editing is a lightweight chart editor. It preserves user text and recalculates roman numerals best-effort, but it is not a full music-notation parser.
- Real-mode harmonic analysis is a first-pass beat-aware chroma heuristic. It can estimate the wrong tempo, meter, downbeat, key, or chord quality on dense, noisy, or weakly harmonic recordings. Tempo, Bar 1 time, time signature, key, and chord labels can be corrected manually; the chord editor is still a compact POC editor, not full music notation.
- Variable timing uses constant tempo inside each span between sparse downbeat anchors. Expressive accelerando/ritardando may need several anchors; smooth curves, per-beat warping, mid-song meter changes, and automatic transient snapping are not implemented.
- Melody extraction is not implemented yet.
- The processed-song library is local-only and single-user; there is no cloud sync or authentication.
- Browser stem playback uses synchronized HTML audio elements, which is sufficient for the POC but not sample-accurate.
- Native iOS Photos import is not implemented yet.
- Automated browser tests verify the GUI state, but not subjective audio quality.
