# IDEAS.md

## Purpose

This file holds useful but unscheduled work. Items here are not rejected; they are intentionally kept out of the chronological execution plan until evidence, a human decision, or a blocking condition gives them a defined position.

When promoting an idea to `TASKS.md`, add:
- a clear goal and demonstrable outcome
- entry criteria
- verification and cleanup expectations
- its exact position relative to existing planned tasks

## Musical Analysis and Presentation

### Advanced Chord Vocabulary

Candidate scope:
- 9, 11, 13, altered dominants, slash chords, borrowed chords, and other extensions.
- Expose a detailed label only when evidence is strong; otherwise retain the simpler useful chord.

Why parked:
- The current problem is false/missing changes and trustworthy presentation, not vocabulary breadth.

Promotion trigger:
- Phase 2J shows that simpler labels are stable and users are blocked by missing harmonic detail.

### Melody Extraction and Lyrics

Candidate scope:
- Extract or plausibly mock a melody line separately from chord analysis.
- Use timed lyrics to help users orient themselves in the chord chart and practise singing with piano.
- Evaluate screen recordings with synchronized Spotify-style lyric highlighting as an analysis source.

Why parked:
- Neither feature has a defined validation sequence, and lyrics introduce source availability and copyright questions.

Promotion trigger:
- User testing shows navigation or combined singing/piano practice is a higher-value problem than current chord and transport reliability.

### Audible Chord Preview and Generated Instrument Stem

Candidate scope:
- Preview a chord from its card.
- Generate an optional chart-following instrument stem.
- Consider piano, electric piano, guitar, and strings timbres.
- Evaluate Apple DLSMusicDevice on native platforms and a lightweight Web Audio/SoundFont fallback in the browser.

Why parked:
- This is a separate timing, synthesis, and mixer iteration with no current place ahead of the practice-shell and editing work.

Promotion trigger:
- Users cannot validate or correct chord labels reliably by listening to the source alone.

### Key Transposition With Audio

Candidate scope:
- Preserve the detected/actual key while allowing the working chart and audio to transpose for practice in another key.

Why parked:
- Audio pitch shifting and notation transposition have different quality and state-model concerns.

Promotion trigger:
- User testing confirms practising in alternate keys is a frequent core workflow.

## Practice Workflows

### Multiple Saved Loops and Practice Notes

Candidate scope:
- Multiple named loops per song.
- Notes and status such as `difficult`, `improving`, or `learned`.
- Quick selection from the practice view.

Why parked:
- One grid-snapped loop must first prove sufficient and understandable in real practice.

Promotion trigger:
- Manual/user testing validates the single-loop flow and demonstrates repeated demand for saving several passages.

### Additional Practice Targets

Candidate scope:
- A `practiceTarget` model for piano, synth, guitar, lead vocal, bass, drums, or rest.
- Dynamic stem sets without breaking the player.

Why parked:
- Piano remains the hypothesis-validation target; broadening now would dilute learning.

Promotion trigger:
- Piano user testing succeeds or clearly shows another target is required to validate the same workflow.

### Import separated stems
The user may have other services that are more advanced at separating than  this tool provides. It could therefore be relevant to enable an import of allready separated stems.

### Supported file formats
The user need to know the possibilities and limitations to what they can load into the app for separation and analysis. We should therefore audit suported formats, expand if needed, and display supported formats to the user.

## Song Structure

### Assisted Section Suggestions

Candidate scope:
- Detect repeated or near-repeated chord ranges.
- Ask the user to accept, reject, or relabel each suggestion.
- Accepted suggestions create ordinary independent Flat Sections.

Why parked:
- Direct Flat Section workflows and selection still need completion and user validation.

Promotion trigger:
- Users repeatedly spend time finding and labeling repeated regions manually.

### Linked Section Templates

Candidate scope:
- Reusable section templates and arrangement order such as `Intro A B A C B Outro`.
- Explicit local overrides for near-repeated sections.

Why parked:
- Requires a new template/arrangement/override model and carries significant edit-scope confusion.

Promotion trigger:
- Flat and Assisted Sections prove insufficient for maintaining repeated song regions.

## Platform and UI Architecture

### Broad Internal Design-System Pass

Candidate scope:
- Inventory and consolidate tokens, buttons, segmented controls, fields, toggles, panels, menus, list rows, progress, and mixer rows.
- Consider a separate primitive stylesheet only if it improves clarity.
- Reconsider a focused web-component dependency only after repeated primitive maintenance becomes measurable.

Why parked:
- Phase 5D addresses concrete usability problems first; a broader abstraction pass has no independent learning outcome yet.

Promotion trigger:
- Repeated UI inconsistency materially slows feature work after the compact shell pass.

### Native iOS Feasibility Spike

Candidate scope:
- Photos selection, upload to the existing backend, processed result playback, and local stem caching.

Entry signals:
- The web POC has demonstrated learning value with real users.
- Import, storage, caching, background audio, or mobile workflow is a bigger blocker than feature maturity.

Why parked:
- Native setup does not answer the product hypothesis before the web workflow proves useful.

## Process and Context Experiments

### On-Demand Context Overhead Audit

Candidate scope:
- Log at least three explicitly requested sessions, measuring repeated reconstruction before recommending better docs, a lighter startup protocol, or a context agent.

Why parked:
- Logging itself adds overhead and there is no evidence yet that context recovery is a blocking problem.

Promotion trigger:
- A human explicitly requests the audit or three sessions show repeated context loss.

### OKF-Style Context Bundle

Reference:
- `research/open-knowledge-format-context-assessment.md`

Candidate scope:
- A small `context/` index and curated OKF-style Markdown summaries linking canonical architecture, status, decisions, risks, and tasks.
- Runtime JSON/API models remain unchanged.

Why parked:
- It should follow evidence from a context-overhead audit, not precede it.

Promotion trigger:
- Context recovery is measured as a real bottleneck and existing canonical documents are insufficient.
