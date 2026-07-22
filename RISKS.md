# RISKS.md

## Domain Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Poor stem separation quality from screen-recorded, compressed, noisy, or mixed sources | Medium | High | Keep mock mode demoable; test real recordings early; compare multiple separators only after first real spike | Partially mitigated. Demucs `htdemucs_6s` was accepted as good enough for the `MakeYouFeelMyLovePart2.mov` play-along workflow, but more songs are still needed |
| Piano leaks into `other`, `guitar`, or `vocals` stems | Medium | High | Inspect separated stems manually; choose stem strategy based on learning value, not purity | Still open. Demucs improves the accompaniment use case, but solo piano crackle/artifacts and leakage remain possible |
| Non-piano stems are too poor after separation to be useful for play-along practice | Low | High | Evaluate drums, bass, guitar, and piano stems together; prioritize a useful accompaniment over perfect isolation | Partially mitigated for one real clip. Demucs piano removal was good enough for POC play-along on `MakeYouFeelMyLovePart2.mov` |
| Basic Pitch or another transcription tool produces inaccurate MIDI for dense polyphonic piano | High | Medium | Treat transcription as approximate cues; test alternatives only if cues are unusable | Open |
| Beat/bar grid is wrong or drifts as a recording changes tempo, making chord placement, loops, count-in, and practice notes misleading | High | High | Keep the grid audible; preserve analyzer provenance; let users align important bar lines against a zoomed source waveform; interpolate one shared musical-time map between persisted downbeat anchors | Partially mitigated. Phase 3G.1 now provides the gated waveform editor and shared variable-tempo map with automated coverage. Real-song listening must still determine whether sparse linear spans are easy and accurate enough, or whether smoother/per-beat correction is needed |
| Chord detection is wrong or misleading when harmonic information is weak | Medium | Medium | Display cues as approximate; preserve user-owned charts; benchmark reference-timed and end-to-end analysis separately on a fixed RWC-P development/holdout split; use Tiny AAM/GuitarSet only to localize mix or timbre failures; compare an external analyzer before repeated local tuning | Confirmed as a material limitation. Isolated-beat smoothing raises development MajMin from 58.6% to 60.8% with oracle timing and 53.7% to 55.7% end-to-end, but the holdout remains only 49.0% and 39.9%. User-facing accuracy is not validated, and conservative smoothing can remove some true changes when estimated timing is weak |
| Benchmark results overfit one corpus or fail to represent screen-recording audio | Medium | High | Stratify RWC-P by chord and instrumentation complexity; use the fixed holdout only as a regression checkpoint; use synthetic/solo-instrument corpora only for diagnostics; finish with deterministic AAC/MOV transcodes and 2-3 real iOS screen recordings | Partially mitigated by a locked low/medium/high 8-development/4-holdout pilot. The first holdout checkpoint is now consumed and must not become a tuning set. RWC-P remains cleaner than screen-recording audio and is CC BY-NC, so media stays outside shipped/demo assets |
| CPU-only processing is too slow for a convincing demo | Medium | High | Keep mock mode default; measure first real subsystem before committing to full real pipeline | Still open for user-length recordings. Demucs completed the 23-second bakeoff clip and a short end-to-end smoke locally, but longer screen recordings need measurement |
| Full-song harmonic analysis exhausts memory or becomes too slow | Medium | High | Analyze a reduced-rate mono representation, retain the 150 MB upload guard, and regression-test cues beyond two minutes | Partially mitigated. The 120-second truncation is removed and a 125-second fixture completes with cues after 120 seconds; runtime and peak memory still need measurement on several real user-length recordings with all supporting stems |
| iOS Photos permissions, large video uploads, and App Transport Security create friction | Medium | Medium | Start with web/local uploader; revisit native only if upload friction blocks validation | Open |
| Copyright and user expectations around commercial recordings | High | Medium | Document demo media limitations; avoid bundling commercial media | Open |

## Dependency and Platform Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Heavy ML dependencies slow or fail installation | High | High | Keep default mock mode dependency-light; add real dependencies only through explicit setup | Partially mitigated locally with `.venv-real`, `requirements-real.txt`, and `.cache/torch`; still a setup risk on new machines |
| Lightweight FFmpeg separator gives false confidence before testing ML-quality separation | Low | High | Label Phase 2G outputs as heuristic, require human listening, and do not infer real source-separation viability from generated media alone | Mitigated for current direction. Human listening rejected FFmpeg quality and accepted Demucs for POC play-along |
| FFmpeg unavailable in development environment | Medium | Medium | Do not require FFmpeg for mock mode; document real-mode setup; return a clear missing-FFmpeg error in real mode | Mitigated locally on 2026-07-06 by Homebrew install; verified `/opt/homebrew/bin/ffmpeg` version 8.1.2. Automated missing-FFmpeg coverage now verifies the failure path |
| Browser audio behavior differs across desktop and iOS Safari | Medium | Medium | Use native HTML audio APIs first; test on target devices before user sessions | Open |
| Multiple HTML audio elements drift during synchronized stem playback | Medium | Medium | Keep sync simple in mock mode; measure drift manually; move to Web Audio if drift distracts from the demo | Open |
| Large uploads consume local disk or memory | Medium | Medium | Keep POC file sizes small; current backend rejects uploads over 150 MB; add streaming upload storage before real user testing with large screen recordings | Partially mitigated by upload limit, isolated source storage, reduced-rate analysis arrays, and short real-mode test media; parser and WAV reader still buffer source files in memory |
| GUI verification depends on Playwright browser installation | Medium | Low | Keep Playwright dev-only; document `npx playwright install chromium`; backend tests still run without browser binaries | Mitigated |

## Product Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Processed output does not help learners more than the original recording | Unknown | High | Run user tests comparing original-only vs processed workflow | Open |
| Mock demo feels useful but real pipeline quality disappoints | Medium | High | Move to real-pipeline spike after mock flow proves demo shape | Still open; Phase 2 validates extraction only, not stem quality |
| Users need notation or keyboard visualization more than harmonic labels | Medium | Medium | Observe testers; do not build extra views until feedback supports it | Open |
