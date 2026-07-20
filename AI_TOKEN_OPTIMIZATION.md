# Reduce Token Usage Per AI Task

## Context

This project uses Claude Code to implement tasks defined in TASKS.md. The goal of this document is to reduce the number of tokens Claude consumes per task — which means reducing how much Claude needs to *explore* before it can act. Quality (accuracy of the implementation) must stay the same.

Token waste in Claude Code sessions comes from three main sources:
1. **Architecture re-discovery** — Claude reads README, ARCHITECTURE, STATUS, etc. at the start of every session to orient itself
2. **Code search overhead** — `server.js` is 2876 lines and `app.js` is 4192 lines; Claude reads large portions just to find the relevant 50 lines
3. **Type/signature inference** — Claude reads function bodies to understand what arguments functions take because there are no type annotations

---

## Recommendations (Priority Order)

### 1. Extend `AGENTS.md` with a Quick-Orientation Section — Biggest ROI

`AGENTS.md` is already loaded by both Claude Code and Codex at the start of every session. It currently covers mission, principles, and process well, but lacks a fast-lookup reference for the codebase itself. Adding one eliminates the architecture exploration phase (reading README, ARCHITECTURE, STATUS, etc.) without duplicating those docs.

**Add a new `## Codebase quick reference` section to `AGENTS.md`:**

```md
## Codebase quick reference

### Key files

| File | Responsibility |
|---|---|
| `server.js` | HTTP API + all DSP analysis (beat detection, chord scoring, key detection) |
| `public/app.js` | Entire browser UI (playback, mixer, grid editor, waveform, chord chart) |
| `public/chord-chart.js` | Chord data model — pure functions, no DOM |
| `public/tempo-map.js` | Beat↔time conversion — pure functions |

### Pipeline mode

`PIPELINE_MODE=mock` (default) — no ML deps, simulated stems and analysis  
`PIPELINE_MODE=real` — requires Demucs + FFmpeg

### Dev commands

| Command | Purpose |
|---|---|
| `npm start` | Start local server |
| `npm test` | Backend unit tests (28 passing) |
| `npm run test:gui` | Playwright browser tests |

### Critical invariants

- `job.result.metadata` is **immutable** — original analyzer output, never overwritten
- User edits live in `practiceState.chordChart` (chord corrections) and `practiceState.tempoMap` (timing corrections)
- `public/chord-chart.js` and `public/tempo-map.js` are pure — no side effects, safe to unit test in isolation
```

**Savings:** Eliminates reading ~5 long markdown files per session. Estimated savings: 3,000–8,000 tokens per session.

---

### 2. Add File + Line Anchors to Task Descriptions in `TASKS.md`

When a task says "fix chord detection," Claude must search the codebase to find where chord detection lives. When it says "fix `estimateChord()` in `server.js` around line 829," Claude goes directly there.

**Pattern to adopt for every future task:**

```
### Task: [Short title]
**Files:** server.js (estimateChord ~line 829), tests/backend.test.js
**Goal:** [One sentence — what should change and why]
**Do not touch:** [list anything nearby that should stay the same]
**Verify:** npm test should pass
```

**Savings:** Eliminates code search and exploratory file reads. Estimated savings: 1,000–5,000 tokens per task depending on complexity.

---

### 3. Split `server.js` Into Focused Modules

The 2876-line monolith forces Claude to read large spans of unrelated code. Splitting it means Claude reads only the relevant file for each task.

**Proposed split (move existing code, don't rewrite):**

| New file | Moved from server.js | Approx lines |
|---|---|---|
| `lib/beat-detection.js` | `estimateBeatGrid`, onset functions (lines 373–667) | ~300 |
| `lib/harmonic-analysis.js` | chroma, chord scoring, key detection, `analyzeHarmonyFromAudio` (lines 670–1074) | ~400 |
| `lib/job-manager.js` | job creation, listing, persistence (scattered) | ~300 |
| `server.js` | HTTP route wiring only | ~200 |

**Savings:** When a task is about chord detection, Claude reads `lib/harmonic-analysis.js` (~400 lines) instead of all of `server.js` (~2876 lines). Estimated savings: 2,000–6,000 tokens per DSP-related task.

---

### 4. Add JSDoc to Key Function Signatures

Without type annotations, Claude reads entire function bodies to understand what arguments to pass and what shapes objects have. JSDoc solves this without needing TypeScript.

**Priority functions to annotate (one-liners each):**

```js
/** @param {Float32Array} pcm @param {number} sr @returns {{ bpm: number, meter: number, downbeatOffset: number, confidence: number }} */
function estimateBeatGrid(pcm, sr) { ... }

/** @param {number[]} chroma 12-element normalized pitch-class energy @returns {{ root: string, quality: string, confidence: number }} */
function estimateChord(chroma) { ... }
```

**Files to annotate:** DSP functions in `server.js`, `public/tempo-map.js`, `public/chord-chart.js`.

**Savings:** Eliminates body-reading when Claude needs to call or compose these functions. Estimated savings: 500–2,000 tokens per task that touches the DSP pipeline.

---

## Files to Create / Modify

| File | Action | Priority |
|---|---|---|
| `AGENTS.md` | Add `## Codebase quick reference` section | High |
| `TASKS.md` | Update format — add file+line anchors to future tasks | High |
| `lib/beat-detection.js` | Create (move from server.js lines 373–667) | Medium |
| `lib/harmonic-analysis.js` | Create (move from server.js lines 670–1074) | Medium |
| `lib/job-manager.js` | Create (move from server.js job routes) | Medium |
| `server.js` | Shrink to HTTP routing only | Medium |

---

## Verification

After each change:
1. `npm test` — all 28 backend tests still pass
2. `npm run test:gui` — all Playwright GUI tests still pass
3. Start a new Claude Code session with a sample TASKS.md task and observe whether Claude reads multiple files before acting (token waste) or goes directly to the right location (efficient)
