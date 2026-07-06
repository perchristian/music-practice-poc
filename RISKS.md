# RISKS.md

## Domain Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Poor stem separation quality from screen-recorded, compressed, noisy, or mixed sources | Medium | High | Keep mock mode demoable; test real recordings early; compare multiple separators only after first real spike | Partially mitigated. Demucs `htdemucs_6s` was accepted as good enough for the `MakeYouFeelMyLovePart2.mov` play-along workflow, but more songs are still needed |
| Piano leaks into `other`, `guitar`, or `vocals` stems | Medium | High | Inspect separated stems manually; choose stem strategy based on learning value, not purity | Still open. Demucs improves the accompaniment use case, but solo piano crackle/artifacts and leakage remain possible |
| Non-piano stems are too poor after separation to be useful for play-along practice | Low | High | Evaluate drums, bass, guitar, and piano stems together; prioritize a useful accompaniment over perfect isolation | Partially mitigated for one real clip. Demucs piano removal was good enough for POC play-along on `MakeYouFeelMyLovePart2.mov` |
| Basic Pitch or another transcription tool produces inaccurate MIDI for dense polyphonic piano | High | Medium | Treat transcription as approximate cues; test alternatives only if cues are unusable | Open |
| Chord detection is wrong or misleading when harmonic information is weak | Medium | Medium | Display cues as approximate; use full-mix harmony plus bass/root and harmonic-instrument evidence; prefer simpler chord labels over weakly supported extensions | Open |
| CPU-only processing is too slow for a convincing demo | Medium | High | Keep mock mode default; measure first real subsystem before committing to full real pipeline | Still open for user-length recordings. Demucs completed the 23-second bakeoff clip and a short end-to-end smoke locally, but longer screen recordings need measurement |
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
| Large uploads consume local disk or memory | Medium | Medium | Keep POC file sizes small; current backend rejects uploads over 100 MB; add streaming upload storage before real user testing with large screen recordings | Partially mitigated by upload limit, isolated source storage, and short real-mode test media; parser still buffers multipart bodies in memory |
| GUI verification depends on Playwright browser installation | Medium | Low | Keep Playwright dev-only; document `npx playwright install chromium`; backend tests still run without browser binaries | Mitigated |

## Product Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Processed output does not help learners more than the original recording | Unknown | High | Run user tests comparing original-only vs processed workflow | Open |
| Mock demo feels useful but real pipeline quality disappoints | Medium | High | Move to real-pipeline spike after mock flow proves demo shape | Still open; Phase 2 validates extraction only, not stem quality |
| Users need notation or keyboard visualization more than harmonic labels | Medium | Medium | Observe testers; do not build extra views until feedback supports it | Open |
