# Open Knowledge Format Context Assessment

Date: 2026-07-08

Source:
- Google Cloud Blog, "Introducing the Open Knowledge Format", published 2026-06-12: https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing

## Question

Should Open Knowledge Format be considered for more structured context handling in this project?

## Summary

Yes, but only as a lightweight project-context and handoff format. It should not become the runtime model for songs, jobs, stems, beat grids, chord charts, sections, loops, or practice state.

The project already depends on Markdown project memory:

- `STATUS.md`
- `TASKS.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `RISKS.md`
- `DEMO.md`
- `research/`

OKF is relevant because it formalizes this kind of Markdown-plus-metadata knowledge bundle. Its useful contribution here is not a new service or SDK; it is a small convention for making project context easier for agents and humans to navigate.

## Recommended Use

Use OKF-style conventions for context management only if context recovery starts to cost real time or causes repeated mistakes.

Best first candidate:

```text
context/
  index.md
  architecture.md
  current-status.md
  decisions.md
  risks.md
  task-map.md
  research/
    section-structure.md
    chord-editor.md
    okf-context.md
```

Each file can use minimal YAML frontmatter:

```yaml
---
type: project-context
title: Current Status
description: Short agent-readable summary of implemented work, current architecture, and next task.
resource: ../STATUS.md
tags: [context, status, handoff]
timestamp: 2026-07-08T00:00:00Z
---
```

The Markdown body should remain short and curated. It should point to source documents instead of duplicating them in full.

## Do Not Use OKF For

- `job.json` as the local source of truth.
- `practiceState.chordChart`.
- `practiceState.sections`.
- beat-grid timing data.
- stem result manifests.
- playback, loop, or metronome state.
- backend API contracts.

Those need precise JSON structures and direct runtime validation. Markdown frontmatter would make interactive editing and playback logic more fragile.

## Useful Experiments

1. Add frontmatter to a small number of new context-summary files, not to every existing Markdown file.
2. Run the existing Context Recovery Review using only the context bundle plus the canonical source files it links to.
3. Measure whether a new session can identify:
   - current architecture
   - completed phases
   - current risks
   - next recommended task
   - files most likely to need edits
4. Keep or discard the convention based on recovery quality, not format enthusiasm.

## Recommendation

Plan an OKF-style context-bundle spike as a process task. Do not implement it before higher-priority demo or usability work unless context recovery becomes a bottleneck.

The first implementation should be reversible: a small `context/` directory with curated summaries and source links. Avoid changing the canonical project documents until the format proves useful.
