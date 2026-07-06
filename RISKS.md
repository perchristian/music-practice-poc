# RISKS.md

## Domain Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Poor stem separation quality from screen-recorded, compressed, noisy, or mixed sources | High | High | Keep mock mode demoable; test real recordings early; compare multiple separators only after first real spike | Still open. Phase 2G added a heuristic FFmpeg spectral split, but it is not evidence of real screen-recording separation quality |
| Piano leaks into `other`, `guitar`, or `vocals` stems | Medium | High | Inspect separated stems manually; choose stem strategy based on learning value, not purity | Still open. Phase 2G only creates `piano` and `accompaniment`; the piano band may include guitar, vocals, synth, or other midrange material |
| Non-piano stems are too poor after separation to be useful for play-along practice | Medium | High | Evaluate drums, bass, guitar, and piano stems together; prioritize a useful accompaniment over perfect isolation | Still open. Phase 2G accompaniment removes midrange content with the piano, so it may damage useful backing material |
| Basic Pitch or another transcription tool produces inaccurate MIDI for dense polyphonic piano | High | Medium | Treat transcription as approximate cues; test alternatives only if cues are unusable | Open |
| Chord detection is wrong or misleading when harmonic information is weak | Medium | Medium | Display cues as approximate; use full-mix harmony plus bass/root and harmonic-instrument evidence; prefer simpler chord labels over weakly supported extensions | Open |
| CPU-only processing is too slow for a convincing demo | Medium | High | Keep mock mode default; measure first real subsystem before committing to full real pipeline | Partially mitigated for FFmpeg extraction and heuristic splitting only. Direct Phase 2G smoke on a 6-second generated sample took about 0.06s extraction and 0.05s splitting; full ML processing time remains open |
| iOS Photos permissions, large video uploads, and App Transport Security create friction | Medium | Medium | Start with web/local uploader; revisit native only if upload friction blocks validation | Open |
| Copyright and user expectations around commercial recordings | High | Medium | Document demo media limitations; avoid bundling commercial media | Open |

## Dependency and Platform Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Heavy ML dependencies slow or fail installation | High | High | Keep default mock mode dependency-light; add real dependencies only through explicit setup | Open |
| Lightweight FFmpeg separator gives false confidence before testing ML-quality separation | Medium | High | Label Phase 2G outputs as heuristic, require human listening, and do not infer real source-separation viability from generated media alone | Open after Phase 2G; the spike validates integration and timing, not product-quality separation |
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
