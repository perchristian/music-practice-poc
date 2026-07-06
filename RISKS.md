# RISKS.md

## Domain Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Poor stem separation quality from screen-recorded, compressed, noisy, or mixed sources | High | High | Keep mock mode demoable; test real recordings early; compare multiple separators only after first real spike | Open |
| Piano leaks into `other`, `guitar`, or `vocals` stems | Medium | High | Inspect separated stems manually; choose stem strategy based on learning value, not purity | Open |
| Non-piano stems are too poor after separation to be useful for play-along practice | Medium | High | Evaluate drums, bass, guitar, and piano stems together; prioritize a useful accompaniment over perfect isolation | Open |
| Basic Pitch or another transcription tool produces inaccurate MIDI for dense polyphonic piano | High | Medium | Treat transcription as approximate cues; test alternatives only if cues are unusable | Open |
| Chord detection is wrong or misleading when harmonic information is weak | Medium | Medium | Display cues as approximate; prioritize key/chord labels that help orientation | Open |
| CPU-only processing is too slow for a convincing demo | Medium | High | Keep mock mode default; measure first real subsystem before committing to full real pipeline | Open |
| iOS Photos permissions, large video uploads, and App Transport Security create friction | Medium | Medium | Start with web/local uploader; revisit native only if upload friction blocks validation | Open |
| Copyright and user expectations around commercial recordings | High | Medium | Document demo media limitations; avoid bundling commercial media | Open |

## Dependency and Platform Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Heavy ML dependencies slow or fail installation | High | High | Keep default mock mode dependency-light; add real dependencies only through explicit setup | Open |
| FFmpeg unavailable in development environment | Medium | Medium | Do not require FFmpeg for mock mode; document real-mode setup when introduced; Phase 2B/2C must return a clear missing-FFmpeg error in real mode | Observed locally on 2026-07-06; mock mode unaffected |
| Browser audio behavior differs across desktop and iOS Safari | Medium | Medium | Use native HTML audio APIs first; test on target devices before user sessions | Open |
| Multiple HTML audio elements drift during synchronized stem playback | Medium | Medium | Keep sync simple in mock mode; measure drift manually; move to Web Audio if drift distracts from the demo | Open |
| Large uploads consume local disk or memory | Medium | Medium | Keep POC file sizes small; add limits before real user testing | Open |
| GUI verification depends on Playwright browser installation | Medium | Low | Keep Playwright dev-only; document `npx playwright install chromium`; backend tests still run without browser binaries | Mitigated |

## Product Risks

| Risk | Likelihood | Impact | Mitigation | Current status |
| --- | --- | --- | --- | --- |
| Processed output does not help learners more than the original recording | Unknown | High | Run user tests comparing original-only vs processed workflow | Open |
| Mock demo feels useful but real pipeline quality disappoints | Medium | High | Move to real-pipeline spike after mock flow proves demo shape | Open |
| Users need notation or keyboard visualization more than harmonic labels | Medium | Medium | Observe testers; do not build extra views until feedback supports it | Open |
