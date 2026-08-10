# Decision Log

## Decision 34

Decision:
Broaden the product from piano practice to practice for any member of a band
playing covers. Keep the stem count fixed at the six `htdemucs_6s` outputs and
let users import stems they separated elsewhere instead of adding separators.
Vocals are in scope and need a vocal stem plus lyrics, not melody notation.
Note-level transcription and melody extraction leave scope entirely.

Reason:
Product-owner direction on 2026-08-08. `htdemucs_6s` already emits close to one
stem per band role, so the audio and analysis layers required no change; the
piano framing lived almost entirely in documentation. Broadening multiplies the
addressable user without a pipeline change, and delegating unusual roles to
user-supplied stems bounds the pipeline instead of growing it.

Melody left scope on the reasoning that the chord chart exists because harmony is
*not* reliably recoverable by ear, whereas a melody is monophonic and foreground
and can be learned from the soloed stem. Words are the singer's equivalent of the
harmony problem; the tune is not.

This is a directional decision, not an evidence-driven one. The
`docs/product/IDEAS.md` entry "Additional Practice Targets" recorded a promotion
trigger of "piano user testing succeeds or clearly shows another target is
required", and that trigger has not fired — no user has used the prototype at
all. The decision is legitimate as product direction and is recorded as such
rather than as the parked trigger firing.

Alternatives considered:
- Keep the piano-only framing until user testing produces evidence. Advantages:
  respects the recorded promotion trigger; keeps validation focused.
  Disadvantages: no user testing is scheduled, so the trigger might never fire;
  meanwhile every agent session re-derives piano-only priorities from `AGENTS.md`
  and pushes the codebase back toward a framing the owner has abandoned.
- Broaden and add separators for roles the six-stem model misses, such as saxophone
  or a second guitar. Advantages: covers more of a real band. Disadvantages: a new
  separation model per role, unbounded scope, and heavy dependencies for a POC.
- Broaden and treat melody extraction as required for the vocal role. Advantages:
  gives the singer reading material analogous to the chord chart. Disadvantages:
  a second capability gate comparable in size to the chord gate, built on a false
  analogy.

Tradeoffs:
Per-stem separation quality becomes a primary quality bar rather than a secondary
one, which invalidates the stated rationale of Decision 19 — see Decision 35.
Mock mode cannot yet demonstrate a non-pianist journey because it generates no
vocals stem. Against that, the repositioning removes more work than it adds:
melody transcription leaves scope, one risk closes, the stem count is frozen, and
the only genuinely new build is stem import.

Confidence:
High that the code and architecture absorb the change cheaply, since the coupling
was enumerated and shallow. Medium for the product judgment itself, which rests
on owner direction rather than user evidence.

Date:
2026-08-08

## Decision 35

Decision:
Supersede the rationale of Decision 19. Demucs `htdemucs_6s` remains the default
real-mode separator, but not because solo-stem quality is unimportant. Per-stem
isolation quality is now a primary bar for all six stems, and user-supplied stem
import is the structural mitigation when the pipeline's own quality is
insufficient for a role.

Reason:
Decision 19 accepted Demucs on the reasoning that "solo piano quality is less
important than creating a useful non-piano backing track". That trade was correct
when exactly one stem was ever removed and no stem was ever studied. Under
Decision 34 a guitarist solos the guitar stem to learn the part, so every stem is
both removed and studied. The conclusion survives — there is no better
reproducible option in scope — but the reasoning and the `RISKS.md` Low rating do
not.

Evidence per stem is thin: piano was judged on one listening pass on one clip and
on the removal case only; drums were rated "not perfect but ok" by the product
owner on 2026-08-08; bass, guitar, vocals, and other are unmeasured.

Alternatives considered:
- Leave Decision 19 as written. Advantages: no work. Disadvantages: leaves a
  stated rationale in the decision log that contradicts the current product, which
  is exactly the failure mode the log exists to prevent.
- Replace or tune the separator. Advantages: might raise solo quality.
  Disadvantages: no better reproducible option is in scope, and the effort
  competes with the chord gate for no validated benefit.
- Run a full per-stem listening campaign before deciding. Advantages: real
  evidence. Disadvantages: the override makes the campaign much less decisive,
  since a user with inadequate stems can now supply their own.

Tradeoffs:
Separation quality moves from a hard product ceiling to a per-song default the
user can override, which is a better risk position than tuning the separator, but
it makes stem import load-bearing rather than merely convenient. A bounded solo
check of the four unmeasured stems remains worthwhile and is not scheduled here.

Confidence:
High that the original rationale no longer holds; medium that Demucs remains the
right default, pending the unmeasured stems.

Date:
2026-08-08

## Decision 36

Decision:
Position the app as a neutral tool that processes material the user already
holds. Keep it local and single-user. Do not build or document features that
acquire audio from streaming services. Responsibility for source rights sits with
the user.

Reason:
Under Norwegian åndsverkloven § 26 the private-copying right belongs to the user,
and a free tool running locally is the user copying for themselves rather than
receiving commercial third-party assistance — which matters, because that
assistance is specifically restricted for musical and film works. The prior
documentation undercut this position by describing the input as a screen
recording from YouTube or TikTok, which is both the weakest available source and
the one a comparable well-resourced product (Moises) explicitly refuses.

Alternatives considered:
- Keep the streaming-capture framing. Advantages: describes what an early tester
  would actually do. Disadvantages: documented intent is evidence, and it
  undermines the neutral-tool position at no benefit.
- Adopt the full commercial apparatus now — warranty, indemnity, safe harbour.
  Advantages: needed eventually if the project is productized. Disadvantages:
  premature for a local POC, and it does not cure the Norwegian restriction on
  commercial assistance for musical works.

Tradeoffs:
The position holds for a free local tool and does not automatically survive
commercialisation or hosting, so this decision has to be revisited with counsel
before either. Full analysis and the open questions for a lawyer are in
`docs/research/source-legality-and-legal-posture.md`.

Confidence:
Medium. This is an AI-authored orientation, not legal advice, and the DRM and
commercial-assistance points in particular are unverified by a lawyer.

Date:
2026-08-08

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

## Decision 32

Note:
Renumbered from a duplicate `Decision 18` on 2026-07-25. The decision text, alternatives, tradeoffs, confidence, and original date are unchanged; only the identifier was made unique. The other `Decision 18` retains its number.

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

## Decision 29

Decision:
Evolve user-corrected timing into one versioned list of bar events and one bar-line interaction. A bar event may carry an explicit downbeat time, an effective time signature, or both; tempo remains derived between timed events. Automatic timing becomes a separate threshold-aware stage before chord segmentation.

Reason:
Product review identified a single underlying failure chain: an incorrect song start, tempo drift, or unsupported meter change produces wrong beats and bars, which then produces incorrectly placed chord-analysis windows. The current `practiceState.tempoMap` solves manual variable tempo for one constant meter, but users reasonably expect to move a bar and change the meter that begins there through the same visible bar line. Separate tempo and meter markers would expose implementation concepts instead of the musical object the user understands.

The unified event shape is conceptually:

```json
{
  "bar": 33,
  "timeSeconds": 61.42,
  "timeSignature": {
    "beatsPerBar": 3,
    "beatUnit": 4
  }
}
```

Both correction fields are optional. A time-only event inherits the active meter; a meter-only event uses its calculated audio time. Bar 1 establishes the initial effective meter and may also establish the first explicit downbeat. Existing version-1 `{ bar, timeSeconds }` tempo anchors should normalize into the new model so intentional calibration work can survive the transition.

Implemented outcome on 2026-07-22: the persisted contract is `practiceState.timingMap` version 2. Simple meters use one pulse per written beat; 6/8 and 12/8 use dotted-quarter pulses, producing two and four primary clicks per bar; 7/8 uses eighth-note pulses because no grouping is available. The analyzer uses locked 18% phase, 8% local-tempo, four-beat persistence, and two-bar meter-persistence thresholds from a separate generated timing fixture set. Its candidates remain in immutable beat-grid provenance and never write user practice state.

The analyzer must continue to estimate timing before chords, but its current one-tempo/one-meter result is insufficient. The next timing pass should fit stable spans over multiple observations, ignore ordinary human beat variation, and propose a new tempo boundary only after relative phase or tempo deviation crosses a calibrated threshold for a persistent window. Meter-change candidates are limited to plausible downbeats and concrete bars. Analyzer candidates remain immutable provenance and do not silently rewrite user timing.

Alternatives considered:
- Keep separate `tempoAnchors` and `meterChanges` collections with separate visual markers. Advantages: each algorithm gets a narrow data type. Disadvantages: two controls compete for the same bar line, combined edits become awkward, and users must understand an implementation distinction. Effort is medium, interaction risk is high, and expected demo quality is lower.
- Copy the full time signature onto every persisted bar. Advantages: every bar is locally self-describing. Disadvantages: repeated state can contradict itself, makes edits noisy, and bloats long-song data. Effort is medium, consistency risk is high, and expected demo quality is unchanged.
- Add optional meter data only to existing timed anchors. Advantages: smallest schema change. Disadvantages: a legitimate meter-only change would require creating a false timing correction, coupling two independent semantics. Effort is low-to-medium, model risk is medium, and expected interaction quality is acceptable but conceptually brittle.
- Persist BPM directly on each event. Advantages: easy display and editing. Disadvantages: BPM can conflict with actual anchor times and becomes ambiguous across meter/beat-unit changes. Effort is low, consistency risk is high, and expected timing quality is poor.
- Retain one global meter and let users approximate meter changes with tempo anchors. Advantages: no meter-aware rewrite. Disadvantages: bar numbers, click accents, chord positions, and loops remain musically wrong after the change. Effort is low, technical risk is low, and expected demo quality is inadequate.

Tradeoffs:
The unified interaction is simpler for musicians, but the internal timing module becomes more sophisticated. Musical distance must be accumulated through the effective meter of each crossed bar rather than using one global `beatsPerBar`; compound-meter pulse/accent semantics also need an explicit definition. Every timing consumer and timing test must move together. A normalization path adds short-term implementation work, but protects the already useful `TeAmo.mov` calibration map. Threshold-aware automatic timing will still miss some changes or propose false ones, so candidates, confidence, user corrections, and downstream chord results must remain distinct layers.

The narrow analysis-scoped `Back to analysis` one-step undo remains the immediate safety slice because it prevents accidental working-chart loss during reanalysis. The unified timing model follows before additional chord heuristics, normal-timeline polish, or general multi-level undo, reducing the chance of building broad history semantics around a timing model that is about to change.

Confidence:
High that one bar-line interaction is the correct product model and that timing must precede chord scoring; medium for the exact automatic change thresholds and compound-meter pulse rules until the dedicated fixtures and real recordings are evaluated.

Date:
2026-07-22

## Decision 30

Decision:
Make reliable chord analysis the next bounded product-validation gate, ahead of
unrelated interaction polish and feature backlog work. Evaluate
accompaniment-first melody suppression, reliability-gated bass fallback,
ornament-resistant comp evidence, and repeated-section evidence pooling as
separate hypotheses before combining them.

Reason:
Useful stem separation and a reliable harmonic chart are both core to the
piano-learning experience. Current holdout scores and human review show that the
analyzer is not yet trustworthy enough: corrected timing can align wrong chord
names, but cannot make them harmonically correct. Research supports separating
or attenuating vocals before chord features, modeling bass separately from chord
quality, using stable segment evidence instead of treating every note equally,
and combining aligned evidence across repeated song sections. The product owner
has therefore chosen chord reliability as the next learning-value and risk gate.

Alternatives considered:
- Continue with timeline and mobile interaction cleanup before returning to
  harmony. This would improve usability around an unvalidated core result and
  risks making a polished workflow for misleading chords.
- Rely on manual chord correction for user testing. This keeps implementation
  small but transfers transcription work to the learner and may invalidate the
  intended speed advantage.
- Replace the analyzer immediately with Chordino or another external engine.
  This may improve accuracy, but without target-domain evidence and shared
  metrics the project cannot tell whether replacement solves melody, missing
  bass, ornaments, timing, or repetition.
- Tune several stem weights and sequence heuristics together. This is fast to
  implement but makes gains and regressions uninterpretable and encourages
  overfitting.
- Force repeated sections to share copied labels. This improves visual
  consistency but propagates the first error and destroys legitimate variations.

Tradeoffs:
Unrelated UI work pauses, and the new target-domain references require human
review. Demucs-assisted benchmark runs add processing cost. In return, the
project gets an explicit definition of “good enough,” isolates major musical
failure classes, and has terminal GO, ADJUST ONCE, COMPARE/REPLACE, and
STOP/REFRAME decisions that prevent indefinite heuristic tuning. Automatic repeat
detection is conditional on manually known repeat groups first proving useful.
Analyzer evidence remains immutable and user charts remain authoritative.

Confidence:
High that chord reliability must be resolved before broader user testing; high
for melody suppression and repeat pooling as evidence-backed experiments; medium
for the exact bass-reliability, ornament-persistence, and automatic-repeat
methods until the locked target-domain baseline is reviewed.

Date:
2026-07-23

## Decision 31

Decision:
Lock chord-reliability evaluation before inspecting a new baseline: use a fresh
stratified 8-development/4-holdout RWC-P split excluding all consumed Phase 2J
tracks; treat all existing screen recordings as development-only; require two
new full-length target holdouts; use analyzer-blind transcription plus a
different musician's verification; and freeze exact usability, accuracy,
regression, runtime, and memory thresholds in a checksum-linked CR0 contract.

Reason:
The project cannot distinguish a real harmony improvement from corpus
overfitting, timing leakage, or reviewer bias if data identities, reference
construction, and success thresholds move after results are seen. Existing
screen recordings have all influenced implementation or review, so calling one
an untouched target holdout would invalidate the gate. A machine-readable
contract and guarded holdout flag make accidental result inspection harder while
keeping availability checks reproducible.

Alternatives considered:
- Reuse the Phase 2J holdout. Advantages: no additional media extraction or
  references. Disadvantages: its results are already known and influenced the
  current plan, so it cannot detect tuning overfit. Effort is low, validity risk
  is unacceptable, and expected evidence quality is low.
- Treat one existing screen recording as target holdout. Advantages: immediate
  target-domain scoring. Disadvantages: every current candidate has already
  influenced separation, timing, harmony, or chart work. Effort is low,
  leakage risk is high, and expected evidence quality is misleading.
- Use only RWC-P. Advantages: official chord/beat references and cheap repeatable
  scoring. Disadvantages: it does not represent compressed iOS capture,
  separation leakage, missing bass, or the correction workflow. Effort is low,
  domain risk is high, and expected product evidence is incomplete.
- Set thresholds after the baseline. Advantages: thresholds could match observed
  difficulty. Disadvantages: the gate would reward the current implementation
  rather than define user-test fitness. Effort is low, decision bias is high,
  and expected learning value is poor.
- Have one reviewer correct analyzer output. Advantages: fastest reference
  creation. Disadvantages: analyzer mistakes anchor the reference and repeated
  sections may be made artificially consistent. Effort is low, reference bias
  is high, and expected benchmark quality is poor.

Tradeoffs:
CR0 pauses on product-owner confirmation, two new recordings, and access to a
second musician. The target set remains small, and the fixed numeric thresholds
may prove too strict. In return, later GO/ADJUST/COMPARE/STOP decisions have
stable evidence, reference-timed and end-to-end failures stay separable, and no
commercial audio or detailed artifact enters Git or the application library.

Confidence:
High for excluding consumed data, blind independent reference review, and
locking thresholds before results; medium for the exact numeric thresholds and
two-recording holdout size until product-owner review.

Date:
2026-07-24

## Decision 33

Decision:
Amend Decision 31 after the product-owner `CHANGES` verdict on
[#3](https://github.com/perchristian/music-practice-poc/issues/3): run RWC-P as
the primary benchmark first, using its aligned MIDI, beat, chord, structure,
melody, and vocal annotations; do not require Logic-generated fixtures or two
untouched target screen recordings before the RWC development and holdout
evaluation; and once RWC results are satisfactory, manually check a small number
of representative iOS screen recordings as a final domain check.

Reason:
Decision 31 made target-domain reference production a prerequisite for any
analyzer work, which blocked CR1-CR6 on two new recordings, a second musician's
availability, and optional Logic fixture authoring. RWC-P is already extracted,
checksum-locked, and richly annotated, so it can produce the accuracy evidence
that decides GO/ADJUST/COMPARE/STOP without that dependency. The target-domain
question that RWC cannot answer — compressed iOS capture, separation leakage,
missing bass, and correction burden — is preserved as a final manual check
rather than a blocking precondition.

Alternatives considered:
- Keep Decision 31 unchanged. Advantages: strongest possible domain evidence and
  a fully blind target holdout. Disadvantages: the gate stays blocked on media
  and reviewer availability while the core accuracy question is answerable now.
  Effort is high, schedule risk is high, and expected learning value arrives
  late.
- Drop target-domain evaluation entirely and gate on RWC alone. Advantages:
  cheapest and fully reproducible. Disadvantages: RWC-P does not represent the
  actual product input, so a passing gate could still fail on real screen
  recordings. Effort is low, domain risk is high.
- Keep the two untouched holdouts but allow RWC work to start in parallel.
  Advantages: preserves a scored target holdout. Disadvantages: retains the
  reference-production cost and the risk of a second blocking human queue for a
  check the owner has decided should be manual. Effort is medium.

Tradeoffs:
The final domain check becomes a manual judgment on a few recordings instead of
a scored, blind, two-reviewer holdout, so target-domain evidence is weaker and
more subjective than Decision 31 intended. Accuracy conclusions will rest mainly
on clean studio pop rather than compressed capture. In exchange, the gate can
produce evidence immediately, the consumed-data and locked-split protections of
Decision 31 remain intact, and the target recordings stay checksum-inventoried
so a scored holdout can still be reinstated later.

Confidence:
High that this unblocks the gate without weakening the RWC protections; medium
for whether a manual domain check is sufficient to authorize piano-player
testing.

Date:
2026-07-25

## Decision 37

Decision:
Retire the rejected `ffmpeg-spectral-piano-v1` separator and remove disposable
piano-era and version-1 job compatibility. Real mode has one separation path,
Demucs; current jobs use per-stem URLs and version-2 timing events. Mock mode
remains the dependency-light path when Demucs is unavailable.

Reason:
The FFmpeg branch produced only piano/accompaniment and was already rejected by
listening, so it no longer supports the band-wide product question. The POC's
own storage decision says runtime jobs are disposable and should be regenerated
rather than accumulating compatibility layers. Keeping both paths duplicated
pipeline logic, tests, API fields, timing adapters, documentation, and failure
modes without improving the current demo.

Alternatives considered:
- Keep FFmpeg as a lightweight real separator. Advantages: real extraction and
  two output files work without ML installation. Disadvantages: output quality
  was rejected, four band roles are absent, and maintaining it risks presenting
  a technically complete but unusable result. Effort is low, technical risk is
  medium, and expected demo quality is low.
- Keep legacy job adapters indefinitely. Advantages: old local jobs continue to
  open. Disadvantages: the POC gains migration, fallback URL, and identity logic
  for disposable data, while every current writer already emits the new shape.
  Effort is medium over time, technical risk is medium, and demo quality is
  unchanged.
- Retire both paths now. Advantages: one real pipeline, one timing schema, one
  stem result contract, and smaller automated coverage. Disadvantages: old
  runtime jobs may need regeneration and real mode always needs Demucs. Effort
  is low, technical risk is low because mock remains available, and expected
  demo quality is unchanged or better.

Tradeoffs:
Developers lose the non-ML spectral-separation smoke and old local jobs may not
open meaningfully. In exchange, mock mode remains fully demonstrable, the fake
Demucs integration test still verifies extraction and the six-stem contract,
and production code no longer preserves rejected behavior.

Confidence:
High. The separator was already rejected and scheduled for retirement; current
state writers and documented cleanup policy make the compatibility break
appropriate for this POC.

Date:
2026-08-09

## Decision 38

Decision:
Reject both CR2 accompaniment-first variants as product defaults, stop local
chord-weight tuning, and advance Chordino as the replacement candidate for the
locked RWC holdout and final manual screen-recording check. Do not integrate it
into real mode unless those gates authorize replacement.

Reason:
Both precommitted local variants fixed the isolated vocal-melody fixture but
regressed the locked eight-track RWC-P development split. The role-only variant
improved 1/8 oracle MajMin tracks and fell 3.3 aggregate points; the chordality-
gated variant improved 2/8 and fell 2.9 points. False-extra boundaries did not
fall. This triggered Decision 30's COMPARE/REPLACE rule.

Chordino, run on the unchanged full mix through the same evaluator, reached
78.1% oracle MajMin and 75.6% boundary F1 versus 61.0% and 53.0% locally. It
improved every development track, reduced oracle false extras from 1,400 to
307, and ran at 0.013 real time. This is too large and consistent a gap to
justify CR3–CR5 custom heuristics before testing the external candidate.

Alternatives considered:
- Keep the role-only variant because it fixes the generated melody fixture.
  Advantages: smallest local behavior change and no dependency. Disadvantages:
  it regresses seven of eight oracle tracks and does not reduce corpus false
  extras. Effort is low, technical risk is low, and expected chord quality is
  worse.
- Tune full-mix or stem weights again. Advantages: may recover some local
  accuracy. Disadvantages: violates the two-attempt stop rule and optimizes a
  front end that is 17.1 MajMin points behind the external control. Effort is
  open-ended, overfit risk is high, and expected learning value is low.
- Continue to CR3–CR5 before comparing replacement. Advantages: completes the
  original hypothesis sequence. Disadvantages: spends several iterations on
  custom evidence logic despite a materially stronger existing analyzer.
  Effort and technical risk are high; expected demo quality is uncertain.
- Integrate Chordino immediately. Advantages: fastest path to the stronger
  development result. Disadvantages: consumes a GPL/AGPL external runtime
  dependency before the locked holdout and compressed target domain validate
  it. Effort is medium, packaging/licensing risk is medium, and expected demo
  quality is promising but unconfirmed.

Tradeoffs:
The local analyzer remains in the product until the gate completes, so users do
not receive the stronger development result yet. Chordino would add separate
Sonic Annotator/Vamp setup and licensing review to real mode. In exchange, the
project stops spending effort on non-generalizing weights, preserves the clean
mock boundary, and tests the most promising candidate before accepting its
dependency cost. Issue #8 subsequently locked the proposed thresholds and
three-recording manual scope; the four-track holdout remains untouched for CR2E.

Confidence:
High that both CR2 variants should be rejected and local tuning should stop;
high that Chordino is the correct next candidate; medium that it should become
the product analyzer until the holdout and screen-recording review pass.

Date:
2026-08-10

## Decision 39

Decision:
Record CR2E as `STOP/REFRAME`, permanently consume the four-track RWC-P
holdout, and keep Chordino out of the product and the approved manual
screen-recording gate until the product owner authorizes a newly scoped
direction. Do not change the frozen threshold or reuse the holdout.

Reason:
Issue #8 approved the proposed thresholds unchanged before the holdout was
opened. Chordino materially outperformed the local baseline and passed every
aggregate check except oracle root accuracy, where it reached 73.1% against the
75.0% minimum. It also regressed `RWC_P024` oracle MajMin by 4.7 points while
improving the other three tracks and every end-to-end track. The frozen contract
therefore cannot authorize replacement or the blocked manual gate.

Alternatives considered:
- Treat the 1.9-point root miss as close enough. Advantages: preserves momentum
  toward a much stronger analyzer. Disadvantages: moves a precommitted threshold
  after observing the holdout and invalidates the gate. Effort is low, technical
  risk is medium, and expected validation quality is poor.
- Resume CR3–CR5 local heuristics. Advantages: follows the original local
  research sequence. Disadvantages: both local CR2 variants already failed and
  the consumed holdout cannot validate further tuning. Effort and overfit risk
  are high; expected demo quality is below Chordino.
- Run another external analyzer against this holdout. Advantages: may find a
  passing replacement. Disadvantages: reuses the consumed split as a selection
  set. Effort is medium, technical risk is medium, and evidence quality is
  invalid.
- Reframe in a new, explicit product/validation strategy without claiming CR2E
  passed or reusing its holdout. Advantages: preserves the learning value of
  Chordino's large gains while keeping the failed result honest. Disadvantages:
  requires a new owner decision and evidence plan. Effort and risk depend on the
  chosen scope; expected learning value is highest.

Tradeoffs:
The app keeps its weaker local analyzer and does not receive Chordino's large
MajMin, boundary, density, and runtime gains. In exchange, the project preserves
the integrity of the locked evaluation and avoids taking on Sonic
Annotator/Vamp packaging and licensing costs without authorization. The
recommended owner choice is `REFRAME`, but CR2E remains a failed gate.

Confidence:
High that the frozen gate failed and the holdout cannot be reused. Medium that
reframing is more valuable than stopping automatic chord analysis entirely;
that is a product-owner decision.

Date:
2026-08-10

## Decision 40

Decision:
Accept the product owner's issue #10 `REFRAME` response and authorize one bounded
three-recording qualitative Chordino review under the existing correction-burden
criteria. Keep CR2E recorded as failed, do not reuse the consumed RWC holdout,
and do not authorize product integration from this decision.

Reason:
Chordino's large MajMin, boundary, density, and runtime gains retain learning
value despite missing the frozen oracle root threshold by 1.9 points. A local
review can now answer the narrower product question: whether its labels form a
useful editable starting chart on compressed screen recordings without checking
every beat. This does not reinterpret the automated gate.

Alternatives considered:
- Stop immediately. Advantages: no further dependency, licensing, or evaluation
  cost. Disadvantages: discards the strongest analyzer evidence before checking
  the actual product domain. Effort and risk are low; learning value is lower.
- Treat CR2E as passed and integrate Chordino. Advantages: fastest route to the
  stronger analyzer. Disadvantages: violates the frozen gate and the owner's
  explicit instruction not to integrate yet. Effort is medium and validation
  risk is high.
- Build a scored target holdout. Advantages: stronger quantitative evidence.
  Disadvantages: requires new recordings and independent references beyond the
  bounded POC decision. Effort is high and near-term learning is slower.

Tradeoffs:
The review is qualitative and uses previously consumed local recordings, so it
cannot establish general accuracy. In exchange, it directly tests correction
burden across the approved full-band, no-bass, and ornament/repeat scenarios
without changing the application or analyzer.

Confidence:
High that this preserves CR2E's failed status and is the smallest useful next
experiment; medium that the three recordings represent future user material.

Date:
2026-08-10

## Decision 41

Decision:
Accept the issue #10 manual `FAIL` without attributing failure to the reviewer's
deliberate beat-by-beat examination. Authorize CR2F as one bounded,
development-only attempt to correct the actual failure: late musical boundaries,
arpeggio-driven label churn, and repeated wrong roots on `ShapeOfMyHeart`.
Evaluate musical-window stabilization first; only if persistent roots remain,
evaluate beat-aggregated NNLS bass/treble chroma through the existing scorer.
Stop after those two candidates. Do not reopen the CR2E holdout or integrate a
candidate into the product.

Reason:
`TeAmo` and `Changes part 1` were useful starting charts at 4/5, while
`ShapeOfMyHeart` was 2/5. The failure is patterned: raw chord boundaries can
follow note resolution rather than musical onset, and an arpeggio can create
several short labels instead of one chord inferred from the notes across a
beat. Chordino remains materially stronger than the local baseline, so one
targeted experiment has higher learning value than immediate abandonment.
Chordino already derives frame-wise similarities from NNLS Chroma and offers
HMM/Viterbi smoothing; the same plugin family exposes separate bass and treble
chromagrams, making beat aggregation a bounded fallback rather than a new ML
stack. See https://isophonics.net/nnls-chroma.

Alternatives considered:
- Integrate raw Chordino now. Advantages: fastest access to the stronger
  analyzer. Disadvantages: knowingly ships the misleading `ShapeOfMyHeart`
  behavior and ignores both failed gates. Effort is medium, validation and
  packaging risk are high, and expected demo quality is inconsistent.
- Stop automatic harmony work now. Advantages: no further dependency or tuning
  cost. Disadvantages: discards useful 4/5 results and a specific, testable
  error pattern. Effort and risk are low; learning value is lower.
- Tune Chordino parameters or resume broad CR3–CR5 heuristics. Advantages: more
  search space. Disadvantages: creates an open-ended overfit loop after all
  available target recordings and the RWC holdout have been consumed. Effort
  and technical risk are high; evidence quality is poor.
- Run the two stop-gated candidates in CR2F. Advantages: first tests the smallest
  boundary/sequence correction, then directly tests the requested combination
  of bass and treble notes across beats without adding a new model. Disadvantages:
  development success cannot prove generalization and still leaves packaging
  unresolved. Effort is low-to-medium, technical risk is bounded, and expected
  learning value is highest.

Tradeoffs:
CR2F may spend one more iteration on a candidate that still fails, and the
available local songs cannot serve as independent validation. In exchange, the
work has explicit regression and stop gates, preserves raw provenance, and can
distinguish a fixable musical-window problem from a persistent recognition
limit. Passing CR2F makes fresh validation and adapter feasibility ready for a
separate decision; it does not revise CR2E or authorize integration.

Confidence:
High that the review failed because of `ShapeOfMyHeart`, not because the reviewer
was thorough. Medium that musical-window stabilization will reduce boundary
churn; medium-low that it will repair persistent wrong roots without using the
NNLS chroma fallback.

Date:
2026-08-10
