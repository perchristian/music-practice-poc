# Ponytail Over-Engineering Audit

Date: 2026-08-09

Status: All findings applied and verified on 2026-08-10.

Scope: Repository-wide complexity and over-engineering only. Correctness,
security, and performance were intentionally excluded.

## Findings

`delete:` Retired `ffmpeg-spectral` pipeline, tests, bakeoff branch, and
configuration. Keep Demucs for real mode and mock mode for lightweight demos.
[`server.js`]

`delete:` Legacy-job compatibility—v1 `tempoMap`, missing-stem `audioUrl`,
`/piano.wav`, and synthesized analysis identities. Regenerate disposable POC
jobs once. [`server.js`, `public/tempo-map.js`, `public/app.js`]

`delete:` Unused library-card, learning-chip, mode-switch, nudge-field, and
related responsive CSS. Replacement: nothing. [`public/styles.css`]

`delete:` Fourteen unreferenced design-screenshot capture paths and outputs.
Keep only images linked from the design brief.
[`scripts/screenshot-for-design.js`]

`native:` Hand-rolled multipart parser. Use Node 20 `Response.formData()`.
[`server.js`]

`shrink:` Duplicate chord-chart and harmony-view validation. Import the
existing shared normalizers. [`server.js`]

`delete:` Unreferenced `keyTempoLabel`, `resizeChordToBarBoundary`, and
`dragLoopHandleToBar` helpers. Replacement: nothing.
[`public/app.js`, `tests/gui.spec.js`]

`delete:` Superseded WP0 task contract from the active pending-work file.
Replacement: archived history. [`docs/planning/TASKS.md`]

`native:` Dialog feature detection and hidden-element fallbacks. Call supported
`<dialog>.showModal()` and `.close()` directly. [`public/app.js`]

`delete:` `metronomeAccent` configuration that is always forced to `true`.
Replacement: constant behavior. [`server.js`]

Net estimate: **-900 lines, -0 dependencies possible.**

The estimate includes corresponding tests and documentation where a listed
compatibility path or feature would be removed. Binary screenshot savings are
not represented in the line count.

Applied result: **-801 net tracked text lines, -14 generated screenshots, and
-0 dependencies.** The measured line count includes the implementation,
verification updates, documentation, and the small mock-pipeline performance and
cleanup fix found during the browser run.
