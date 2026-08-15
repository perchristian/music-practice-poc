# Portability Contract

Status: Normative target architecture. Adopted 2026-08-14 as
`docs/planning/DECISIONS.md` Decision 43. The current code does not satisfy it
yet; this document is the definition the migration works toward, and every new
module is expected to comply from the day it is written.

## The requirement

The analysis engines and the interactive controls must run unchanged on:

- the desktop local web app (today's product),
- iPad, as the primary practice and performance device, with full editing,
- iPhone, at minimum as a read-only reader of a shared song.

Without writing the product twice.

## The chosen shape

One shared TypeScript core, one shared set of UI controls, and a thin
platform-specific host on each side.

```text
┌─────────────────────────────────────────────────────────────┐
│ shared, platform-free TypeScript                            │
│                                                             │
│  engine-core       musical model: grid, timing map, chords, │
│                    sections, lyrics, bundle (de)serialization│
│  engine-analysis   DSP: PCM → chroma → beats → chords → key │
│  engine-adapters   provider interfaces + built-in providers │
│  ui-controls       framework-free components + design tokens│
└───────────────┬──────────────────────────┬──────────────────┘
                │                          │
     ┌──────────▼──────────┐    ┌──────────▼──────────────────┐
     │ desktop host        │    │ iOS host                    │
     │ Node + browser      │    │ Swift shell + WKWebView     │
     │ filesystem storage  │    │ Files/Photos, app container │
     │ FFmpeg + Demucs     │    │ AVFoundation, Core ML       │
     └─────────────────────┘    └─────────────────────────────┘
```

Rejected alternatives, with reasons, are recorded in Decision 43. The short
version: a Rust/WASM core buys performance the product does not currently need
and costs a second UI implementation; a native SwiftUI client costs a second UI
implementation and loses offline analysis; staying web-only leaves iOS audio and
file handling permanently compromised.

## Rules that make it work

These are the rules that decide whether a piece of code is portable. They are
checkable, and they are the ones that get violated by accident.

### R1 — The shared packages import nothing platform-specific

No `fs`, `path`, `http`, `process`, `child_process`. No `document`, `window`,
`AudioContext`, `fetch`, `localStorage`. If a shared module needs any of those,
it needs a provider instead.

### R2 — Audio enters the engine as decoded samples, never as a file

The analysis engine's input is `Float32Array` mono PCM plus a sample rate. Who
decoded it, from what container, using which decoder, is the host's problem.
This single rule is what lets the same analyzer run against FFmpeg output on
desktop and `AVAudioFile` output on iOS.

### R3 — Everything the engine produces is plain JSON

No class instances, no functions, no `Date` objects, no `Buffer` in outputs.
Results must survive `structuredClone`, a `postMessage` to a worker, a write to
disk, and a round trip through the iOS JavaScript bridge.

### R4 — Long work happens in a worker and reports progress

Analysis runs off the main thread — a `Worker` in the browser, a
`worker_threads` worker in Node, the same JS context off the UI thread on iOS.
Engines expose cancellable, progress-reporting jobs rather than one blocking
call, because a two-minute freeze is acceptable on a laptop and fatal on a
tablet.

### R5 — Capabilities are declared, not assumed

A host declares what it can do (`canSeparateStems`, `canImportMedia`,
`canWriteFiles`, `maxAnalysisMemoryMB`). The UI reads the capability set and
hides or degrades gracefully. This is what makes iPhone read-only mode a
configuration rather than a fork.

### R6 — UI controls receive state and emit intents

Components take a plain state object and emit events describing what the user
wants (`seek`, `set-chord`, `add-lyric-line`). They do not call the backend, do
not know about URLs, and do not persist anything. Persistence and transport are
host concerns.

### R7 — Touch is a first-class input, not an adaptation

Every interactive control is specified for pointer, touch, and keyboard together,
per `docs/engineering/TIMELINE_INTERACTION_CONTRACT.md`. Hit targets are sized
for a finger on a music stand, not a mouse on a desk.

## Provider interfaces

Providers are the seams where platforms differ. Each is a small interface with at
least one implementation per host.

| Provider | Desktop implementation | iOS implementation |
| --- | --- | --- |
| `MediaDecoder` | FFmpeg subprocess → PCM WAV | `AVAudioFile` / `AVAssetReader` |
| `SeparationProvider` | Demucs `htdemucs_6s` via Python | Core ML port, or import already-separated stems |
| `AnalyzerProvider` | built-in TypeScript engine; external process/HTTP plug-in | built-in TypeScript engine |
| `SongStore` | filesystem under `data/` | app container + Files integration |
| `AudioEngine` | Web Audio in the browser | Web Audio in the WebView, or AVAudioEngine when native mixing is required |
| `BundleIO` | filesystem read/write | Files, AirDrop, share sheet |

`AnalyzerProvider` is the most important of these: it is what would make "plug in
a better engine" real rather than aspirational. Note that it is a proposal here,
not an adopted analyzer strategy — the chord-reliability gate in
`docs/planning/TASKS.md` owns that question, and the CR2E/CR2F evidence is the
input to it. This document only requires that *whatever* engine is chosen can be
called through a boundary that satisfies R1–R4.

## Platform capability matrix

| Capability | Desktop web | iPad | iPhone (v1) |
| --- | --- | --- | --- |
| Open a shared song bundle | ✅ | ✅ | ✅ |
| Play stems, mute/solo/volume, speed, loop | ✅ | ✅ | ✅ |
| Follow chord chart and lyrics during playback | ✅ | ✅ | ✅ |
| Edit chords, sections, lyrics | ✅ | ✅ | ❌ read-only |
| Edit timing grid | ✅ | ✅ | ❌ read-only |
| Import media and run analysis | ✅ | ✅ | ❌ |
| Stem separation | ✅ Demucs | ⚠️ Core ML or import stems | ❌ |
| Export a bundle | ✅ | ✅ | ✅ forward as received |

⚠️ marks the one genuinely open technical question: whether on-device separation
on iPad is fast and accurate enough, or whether iPad users import stems produced
elsewhere. That question is answered by a spike, not by this document.

## Migration path from the current code

The current code is a Node `server.js` (3,156 lines) and a vanilla-JS
`public/app.js` (4,688 lines). Nothing here requires a rewrite, and a rewrite is
explicitly not the plan. The sequence is extraction in dependency order, each
step shipping a working app:

1. **Add a build step and TypeScript** alongside the existing files, with the
   current pure modules (`chord-chart.js`, `tempo-map.js`, `section-ranges.js`)
   converted first. They are already pure and already unit-tested, so they prove
   the toolchain without risking behavior.
2. **Extract `engine-core`**: the musical model and its migrations. This is
   where the lyrics model and bundle serialization are born, so it happens before
   the lyrics and sharing features, not after.
3. **Extract `engine-analysis`** from `server.js` when the analysis engine work
   next touches it — the sequence-decoder change is that moment. Extraction and
   the decoder change ship together; the algorithms are moved, not rewritten.
4. **Define the provider interfaces** and make `server.js` a host that implements
   them, rather than a monolith that contains them.
5. **Extract `ui-controls`** incrementally, starting with the components a
   redesign touches anyway: transport, chord grid, lyrics lane.
6. **Stand up the iOS shell** once the capability set is real, beginning with the
   read-only reader — the smallest useful iOS product and the one that validates
   bundles, playback, and layout on a real device.

Steps 1–3 are prerequisites for the iOS work but deliver value on the desktop
app on their own. Step 6 is not blocked on the analysis engine reaching any
particular accuracy.

## How compliance is verified

- Shared packages build and their tests run in a Node environment with no DOM and
  no filesystem access available to the module under test.
- A lint rule denies platform imports inside `packages/engine-*` and
  `packages/ui-controls`.
- The analysis engine's regression tests feed it `Float32Array` input directly,
  never a file path.
- Engine outputs are asserted to survive a JSON round trip.
- Before any iOS claim is made, a real device gate is required: an actual iPad
  and an actual iPhone, not a simulator and not a resized browser window.
