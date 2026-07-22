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

## Decision 19

Decision:
Use Demucs `htdemucs_6s` as the default real-mode stem separator for the POC, with the previous FFmpeg spectral split retained as `REAL_SEPARATOR=ffmpeg-spectral` fallback.

Reason:
A listening pass on `test-media/MakeYouFeelMyLovePart2.mov` found that Demucs is good enough for the core POC workflow: removing/muting piano for play-along practice. The solo piano stem can crackle and is not presentation-quality, but solo piano quality is less important than creating a useful non-piano backing track.

Alternatives considered:
- Continue with `ffmpeg-spectral-piano-v1`.
- Use manual Logic Pro stems as the real-mode pipeline.
- Keep Demucs only as a bakeoff artifact.

Tradeoffs:
Demucs adds heavy Python/Torch dependencies, model downloads, and runtime cost. It is also not perfect for isolated piano listening. It is still a better fit than FFmpeg spectral splitting because it produces instrument-level stems and materially improves the piano-removal practice workflow. Logic Pro remains a useful quality baseline, but it is not a reproducible backend dependency or suitable for Codex Cloud.

Confidence:
Medium for POC play-along value; low for final production architecture.

Date:
2026-07-06

## Decision 18

Decision:
Analyze key and chords as whole-song harmony using the full extracted audio plus supporting evidence from bass, piano, guitar, and accompaniment stems when available, rather than deriving chords from the piano stem alone.

Reason:
The learning cue the user needs is the song's harmonic map. The piano part may omit roots, imply voicings, or add passing tones that are not the actual chord. Bass content is often the strongest evidence for root motion, while guitar, piano, and other harmonic instruments help identify chord quality and extensions such as dominant 7, minor 7, major 7, 9, 11, and 13. Early separation will be imperfect, so the full mix should remain part of the evidence.

Alternatives considered:
- Analyze only the separated piano stem.
- Analyze only the full mix with no stem-specific evidence.
- Defer chord analysis until high-quality ML separation exists.
- Display advanced chord labels immediately from a broad chord vocabulary.

Tradeoffs:
Multi-source analysis is more complex than a piano-only transcription path, but it better matches the musical question. Full-mix analysis is robust to bad stems but can confuse melody, percussion, and dense mixes with harmony. Stem-specific evidence can help, but early stems may leak or remove important notes. The first implementation should therefore use a conservative vocabulary and expose confidence/limitations instead of overclaiming detailed extensions.

Confidence:
Medium.

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

## Decision 17

Decision:
Use a narrow FFmpeg spectral split (`ffmpeg-spectral-piano-v1`) for Phase 2G instead of adding Demucs, Torch, or another heavy ML separator.

Reason:
Phase 2G should reduce integration uncertainty and exercise the real practice flow with `piano.wav` and `accompaniment.wav` while keeping mock mode lightweight and avoiding a large dependency step. FFmpeg is already part of the real-mode extraction spike and is installed locally.

Alternatives considered:
- Add Demucs or another ML separator immediately.
- Keep real mode at source-audio extraction only.
- Mock piano/accompaniment stems after real upload.

Tradeoffs:
The FFmpeg split is not true source separation and may remove useful accompaniment content or include non-piano material in the piano stem. It is useful for proving job flow, output storage, API shape, metadata, timing, and UI compatibility, but it does not validate real separation quality. A stronger separator should replace it if listening tests show the workflow needs better audio quality.

Confidence:
Medium for spike integration value; low for final audio quality.

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

## Decision 18

Decision:
Implement the first real harmonic-analysis spike as dependency-free downbeat/bar-aligned chroma analysis over `source-audio.wav`.

Reason:
Chord labels are only useful for practice if they sit on a musical grid. Real screen recordings often start before or after the first downbeat, so the first analysis pass should estimate tempo and downbeat placement before emitting chord cues, and it should de-emphasize brief chromatic passing material by scoring one conservative chord per bar. Keeping the implementation in Node over PCM16 WAV avoids adding Basic Pitch, librosa, Essentia, TensorFlow, or other heavy dependencies before the product value of approximate harmonic cues has been tested.

Alternatives considered:
- Start with piano transcription through Basic Pitch or another transcription model.
- Add a Python audio-analysis stack such as librosa or Essentia immediately.
- Keep fixed-time chord windows without a downbeat/bar grid.
- Analyze only the isolated piano stem.

Tradeoffs:
The dependency-free analyzer is intentionally approximate. It may pick the wrong tempo, downbeat, key, or chord quality, especially on dense mixes, swing, rubato, weak percussion, or noisy screen recordings. It also does not produce melody or note-level transcription. The benefit is that real-mode jobs now produce inspectable, bar-aligned harmonic cues without new setup risk, and mock mode remains lightweight.

Confidence:
Medium for generated test media and integration value; low-to-medium for accuracy on arbitrary real songs until manual listening/inspection is done.

Date:
2026-07-06

## Decision 20

Decision:
Harden the real harmonic-analysis spike to `beat-aware-chroma-v2` with generated known-answer fixtures before switching to a heavier MIR or transcription stack.

Reason:
Manual inspection found two concrete failures: the analyzer could halve the perceived tempo and miss chord changes because it emitted only one cue per bar. These failures directly reduce learning value. Before adding heavy dependencies, the POC needs deterministic fixtures that prove the lightweight analyzer can handle common learning cases: multiple chords inside a bar, meter variation, and bass notes that do not play the root.

Alternatives considered:
- Jump immediately to a Python MIR stack such as librosa or Essentia.
- Start piano transcription with Basic Pitch or another model and derive chords from notes.
- Keep one-chord-per-bar output and document the limitation only.
- Hand-label chord timelines for user tests instead of improving automatic analysis.

Tradeoffs:
The beat-aware Node analyzer remains heuristic and is not a general-purpose chord-recognition system. The 3/4 support is intentionally limited and fixture-verified, not broad meter inference. The benefit is that mock mode stays light, real mode remains reproducible without new heavy dependencies, and regressions are now caught by known-answer tests before user demos.

Confidence:
Medium for generated fixtures and POC demo readiness; low-to-medium for arbitrary commercial screen recordings until more real clips are manually inspected.

Date:
2026-07-07

## Decision 21

Decision:
Prioritize user-correctable musical grid, metronome calibration, and editable chord charts before further automatic chord-recognition complexity.

Reason:
Chord labels often do not have one canonical answer. Real-book-style symbols are useful reductions, not complete harmonic truth, and labels such as `Csus2`, `C9`, `C7/F`, and `F11` can be musically defensible in overlapping contexts. For the POC, the user needs a practical chord chart for learning, not an analyzer that claims final authority. A reliable grid is the foundation for chord placement, bar-snapped loops, count-in, practice notes, and later correction workflows. A metronome/click against the song gives the user immediate feedback on whether tempo, bar 1, and time signature are usable.

Alternatives considered:
- Continue prioritizing automatic chord-recognition accuracy before manual editing.
- Build a librosa/Essentia/LLM-hybrid analyzer before grid correction tools.
- Treat generated chord labels as the app's canonical chart.
- Defer manual chord entry until after transcription or notation work.

Tradeoffs:
This shifts effort from analyzer sophistication to interaction design and persistent editing. It may expose that the current beat grid is not good enough, but that is useful risk reduction because grid quality affects loops and practice even without chord labels. Automatic analyzers still matter, but they become first-draft generators whose output can be corrected rather than a single source of truth.

Confidence:
High for product direction; medium for the exact first UI because it needs hands-on testing with real songs.

Date:
2026-07-07

## Decision 22

Decision:
Treat mock mode as an expandable scenario catalog, not as one fixed demo file or a real file-compatibility contract.

Reason:
Mock mode exists to keep the full learning workflow demonstrable while real ML, upload, and media-processing dependencies are unavailable or still changing. As the prototype grows, it should include multiple representative practice scenarios so the UI and product flow can be evaluated against different musical and processing conditions: generated fallback stems, local piano/accompaniment demo stems, full drums/bass/guitar/piano stem sets, imperfect separation, missing or quiet stems, short and longer recordings, different meters, multiple chord changes per bar, uncertain chords, and user-corrected charts. These examples should be easy to replace as better test assets become available.

Alternatives considered:
- Keep a single canonical mock song.
- Require all mock examples to be backed by real uploaded video files.
- Treat mock-mode accepted file types as proof of real-mode media compatibility.
- Expand only real-mode fixtures and leave mock mode minimal.

Tradeoffs:
More mock scenarios improve demo coverage and make product regressions easier to spot, but they can create false confidence if they are presented as real processing quality. Mock fixtures should therefore be labeled as scenarios and should exercise the real product flow without claiming to validate codec support, upload throughput, stem quality, or harmonic-analysis accuracy. Real-mode compatibility remains a separate responsibility verified through actual multipart uploads, FFmpeg extraction, separator output, and manual listening.

Confidence:
High for POC usefulness; medium for the exact fixture organization until more scenarios are added.

Date:
2026-07-07

## Decision 23

Decision:
Make the next chord-chart iteration a clean break from the current seconds-first `practiceState.chordEdits` model, replacing it with a grid-first `practiceState.chordChart` model instead of adding migration or backward compatibility.

Reason:
The chord editor research recommends an explicit internal event model where chord positions are stored in bars and subdivisions, with rendering derived from that model. The current POC model stores user chord edits primarily as seconds-based `start` and `end` ranges, which makes musical placement less stable when the user corrects BPM, Bar 1, or time signature. The POC does not need to preserve existing local songs as product data; deleting and regenerating runtime jobs is cheaper and clearer than maintaining compatibility while the model is still being learned.

Alternatives considered:
- Keep `practiceState.chordEdits` and add grid fields beside seconds fields.
- Add a migration layer from old chord edits to the new chart model.
- Defer the model change until after bar-based loops.
- Use MusicXML or ChordPro as the internal chord chart format.

Tradeoffs:
A clean break may invalidate existing local processed songs and require deleting/recreating them. That is acceptable for this POC because accumulated runtime songs already create library noise, and only explicit fixture, demo, or calibration jobs should be kept. The benefit is lower implementation complexity and a clearer musical model for chord editing, current-chord highlighting, roman numerals, and future bar-based loops. MusicXML and ChordPro remain useful future import/export formats, not the internal source of truth.

Confidence:
High for POC iteration speed and model clarity; medium for the exact JSON shape until it is implemented and tested in the UI.

Date:
2026-07-07

## Decision 24

Decision:
Use a small internal CSS/HTML design system for the current web POC instead of adopting a broad component library or migrating the frontend framework.

Reason:
The frontend is currently a no-build static HTML, CSS, and vanilla JavaScript app. Most of the important UI is domain-specific: transport, synchronized stem controls, loop handles, metronome controls, and the editable Harmony chart. A broad library would not replace those surfaces and would add migration cost before the POC has finished validating learning value. The immediate need is consistency and mobile reliability across existing primitives.

Alternatives considered:
- React with shadcn/Radix primitives.
- Ionic for a mobile-app-like component model.
- Material Web or another Material-style web-component library.
- Web Awesome as a framework-agnostic web-component layer.
- Continue with entirely ad hoc CSS.

Tradeoffs:
An internal design system requires discipline and does not provide prebuilt accessibility behavior for complex primitives such as dialogs or popovers. The benefit is that mock mode stays dependency-light, the current static frontend remains easy to run, and improvements can be made incrementally around the real POC workflow. Web Awesome remains a reasonable future option for specific repeated primitives if internal implementations become costly, and Ionic should be reconsidered only if native/hybrid mobile becomes the next validated direction.

Confidence:
High for the current POC phase; medium for later mobile/native phases.

Date:
2026-07-08

## Decision 25

Decision:
Represent user-corrected variable timing as sparse downbeat anchors over a source waveform, with piecewise-linear musical-position/time mapping shared by every playback consumer.

Reason:
The current corrected grid still has one BPM, one meter, and one Bar 1 offset for the whole recording. It therefore accumulates audible and visual drift on rubato, ritardando, accelerando, and ordinary human tempo variation. Chords, click, loops, and count-in all depend on the grid, so chord-analysis calibration should not proceed on a timing model that cannot represent the source. Users already understand the bar lines; in a gated editor those same lines can be aligned to visible waveform events without inventing a second marker system.

The analyzer grid remains immutable provenance. `practiceState.gridOverrides` remains the base constant-tempo seed and backward-compatible fallback. An optional user-owned `practiceState.tempoMap` stores a versioned, strictly ordered list of `{ bar, timeSeconds }` downbeat anchors. A shared pure module interpolates beats evenly between anchors and provides both musical-to-audio and audio-to-musical mapping. Real mode uses a compact server-generated peak envelope from `source-audio.wav`; mock mode provides deterministic representative waveform data without heavy dependencies.

Alternatives considered:
- Keep one BPM and downbeat offset. Advantages: no new model or UI. Disadvantages: cannot solve cumulative drift. Effort is low, technical risk is low, and expected demo quality is inadequate on variable-tempo recordings.
- Store every beat/downbeat explicitly. Advantages: maximum manual precision and simple lookup. Disadvantages: high user effort, noisy persistence, and fragile editing. Effort and interaction risk are high; expected technical alignment is high but demo usability is low.
- Use a smooth spline through sparse anchors. Advantages: continuous tempo change can sound more natural. Disadvantages: curve behavior is harder to explain, can overshoot between sparse points, and complicates inverse mapping. Effort and technical risk are medium-to-high; expected demo quality is uncertain before sparse linear anchors are tested.
- Add automatic dynamic beat tracking or audio-to-score alignment first. Advantages: potentially less manual work. Disadvantages: adds analyzer/dependency uncertainty, may be opaque to correct, and still needs an editing model. Effort and technical risk are high; expected demo quality is potentially high but unpredictable.
- Decode full source audio and build the waveform entirely in the browser. Advantages: fewer backend assets. Disadvantages: unnecessary memory/startup cost for user-length PCM, especially on mobile. Effort is medium, platform risk is medium-to-high, and expected demo quality is similar to a precomputed envelope.

Tradeoffs:
Piecewise-linear mapping makes important anchors exact and keeps the model understandable, testable, and invertible, but tempo is constant inside each anchored span rather than a mathematically smooth ritardando. Users may need several anchors through expressive passages. The first version keeps meter constant, does not warp individual beats, and does not snap automatically to transients. Those limits are acceptable because the product requirement is useful downbeat alignment rather than studio-grade tempo mapping. Normal-playback zoom/follow is split into a later phase so the first implementation can validate correction value without absorbing unrelated timeline polish.

Confidence:
High that sparse waveform-aligned downbeats solve the identified drift more directly than further chord heuristics; medium for the exact number of anchors and waveform resolution until tested on several real recordings.

Date:
2026-07-17

## Decision 26

Decision:
Use a small direct RWC-P v2 adapter and a separate pinned `mir_eval` environment for Phase 2J chord evaluation, while keeping all corpus audio and detailed run artifacts outside Git and outside application jobs.

Reason:
The product needs reproducible evidence against real mixed music before changing more chord heuristics. RWC-P v2 pairs 100 released WAV recordings with curated beat and chord timelines, and the application's analyzer is already exported as a direct function. A narrow adapter can therefore test the actual implementation without adding dataset frameworks or benchmark state to the product runtime. Standard `mir_eval` metrics make results comparable, while an optional environment preserves dependency-light mock mode.

Alternatives considered:
- Continue uploading arbitrary songs and writing guessed reference chords manually. This has low setup cost but weak, inconsistent ground truth and high repeated human/token cost.
- Add `mirdata` or a general dataset framework. This offers broader corpus abstractions but adds dependencies and adaptation work that the single fixed POC benchmark does not need.
- Implement all chord metrics locally in JavaScript. This keeps one language but creates avoidable metric-definition and comparability risk.
- Put evaluation dependencies into real mode. This simplifies setup commands but couples product processing to research-only NumPy/SciPy dependencies.

Tradeoffs:
The one-time RWC-P archive download is about 4.1 GB and its CC BY-NC license prevents bundling it as product/demo media. The custom adapter understands only the official semicolon-CSV layout, and `mir_eval` needs a separate Python environment. In return, normal app setup remains unchanged, the locked pilot is cheap to rerun locally without model tokens, and oracle timing isolates harmonic errors from beat-tracking errors.

Confidence:
High for the benchmark boundary and dependency isolation; medium for how well RWC-P predicts compressed iOS screen-recording behavior until the later codec/domain checks run.

Date:
2026-07-21

## Decision 27

Decision:
Retain isolated one-beat `A-B-A` smoothing as the conservative default in `beat-aware-chroma-v3`, while keeping the unsmoothed analyzer available only as an explicit benchmark control.

Reason:
The locked eight-track development benchmark showed the same excessive change density that made the corrected `TeAmo.mov` result difficult to read. Replacing only a single disagreeing beat when both neighbors have the same root and quality improved development MajMin from 58.6% to 60.8% with oracle timing and from 53.7% to 55.7% with analyzer timing. Both medians and a majority of tracks improved, while false-extra boundaries fell materially. The four-track holdout was opened only after this gate passed: oracle MajMin improved 0.9 points and analyzer-timing MajMin regressed 0.3 points, within the locked one-point limit.

Alternatives considered:
- Keep every beat-level estimate. This preserves maximum recall but leaves cue density at roughly twice the development reference and creates a noisy learning chart.
- Smooth all short cues by duration. This could remove more false changes but is less conservative because a short real chord need not appear in an `A-B-A` pattern.
- Add transition penalties or a full Viterbi decoder. This may model harmonic continuity better but changes more than one variable and needs a clearer raw-candidate model.
- Continue chord-template tuning. The baseline specifically indicated that over-segmentation should be addressed before another template tweak.

Tradeoffs:
The rule is transparent, dependency-free, and reduces false changes, but it can remove a real one-beat chord when timing or neighboring estimates are wrong. The holdout estimated-timing boundary F1 fell from 44.2% to 42.5% even as false extras fell, showing a precision/recall tradeoff. Raw analyzer evidence and conservative presentation should therefore become separate layers before adding more sequence logic or recovery controls. The consumed holdout remains fixed and must not be used to tune this rule.

Confidence:
Medium. The benchmark gate passed, but absolute holdout accuracy remains too low to treat automatic chords as authoritative, and screen-recording domain validation remains open.

Date:
2026-07-22

## Decision 28

Decision:
Persist only the raw chord candidates changed by conservative smoothing as `suppressedChordSuggestions`, alongside immutable conservative `chords` and the separate user-owned `practiceState.chordChart`.

Reason:
The accepted smoothing rule improves aggregate usefulness but can hide a real one-beat change. Users need a reversible path without returning the default chart to the noisy beat-by-beat sequence. The useful evidence is the difference introduced by smoothing, not a second complete chord chart. An explicit per-suggestion `Add` action can replace only that beat in the working chart and preserve the surrounding chord on both sides.

Alternatives considered:
- Persist the full raw beat sequence and the conservative chart. This maximizes later analysis options but duplicates hundreds of cues per song and makes presentation/evidence ownership less clear.
- Discard suppressed candidates. This keeps metadata smallest but makes the smoothing precision/recall tradeoff irreversible.
- Add a global raw/conservative view toggle. This is simple to explain technically but risks presenting the noisy layer as another authoritative chart and does not express which changes the user accepted.
- Automatically merge suppressed candidates into an existing user chart above a confidence threshold. This would overwrite user intent and reuse analyzer confidence as a decision rule without benchmark evidence.

Tradeoffs:
The compact difference layer stays inspectable and old jobs remain compatible when the field is absent. Recovery is intentionally one suggestion at a time, so songs with many useful short changes may require repeated actions. A recovered suggestion becomes an ordinary independent user chord; it is not linked to analyzer evidence afterward. `Back to analysis` and one-step undo remain a separate next slice because they reset the whole chart and need analysis-scoped backup semantics.

Confidence:
High for preserving ownership and keeping the POC model small; medium for the review interaction until tested by piano learners on real songs.

Date:
2026-07-22
