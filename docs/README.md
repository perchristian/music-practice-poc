# Documentation Map

Everything that is not code lives here. Start with the group that matches what
you are trying to do.

## planning/ — changes constantly

The working set. These are rewritten as work lands, so they are the only docs
that should be assumed current.

- [TASKS.md](planning/TASKS.md) — the execution plan for pending work, with a status index
- [STATUS.md](planning/STATUS.md) — current technical status, known limitations, and next task
- [DECISIONS.md](planning/DECISIONS.md) — the numbered decision log; cited from tasks and contracts
- [RISKS.md](planning/RISKS.md) — domain and delivery risks with mitigations and current status
- [RETROSPECTIVES.md](planning/RETROSPECTIVES.md) — append-only retrospective reports

## engineering/ — stable reference

How the system is built and the behavior it must preserve. Read before changing
the relevant subsystem.

- [ARCHITECTURE.md](engineering/ARCHITECTURE.md) — component layout, pipeline stages, and the mock/real seam
- [CHORD_ANALYSIS_STRATEGY.md](engineering/CHORD_ANALYSIS_STRATEGY.md) — how chord detection currently works and where it fails
- [TIMELINE_INTERACTION_CONTRACT.md](engineering/TIMELINE_INTERACTION_CONTRACT.md) — normative timeline input behavior across trackpad, mouse, touch, and keyboard
- [AI_TOKEN_OPTIMIZATION.md](engineering/AI_TOKEN_OPTIMIZATION.md) — conventions that keep agent context cost down
- [DEMO.md](engineering/DEMO.md) — the demo flow and its known limitations

## product/ — why the thing exists

- [VISION.md](product/VISION.md) — the product question and what would answer it
- [DESIGN_BRIEF.md](product/DESIGN_BRIEF.md) — visual design context, with prototype screenshots
- [UX_FLOOR_PLANS.md](product/UX_FLOOR_PLANS.md) — library and navigation shape exploration
- [IDEAS.md](product/IDEAS.md) — useful but unscheduled work, deliberately outside the plan
- [MOISES_ANALYSIS.md](product/MOISES_ANALYSIS.md) — competitive and pattern analysis of Moises and peer apps

## research/ — dated investigations

Point-in-time reports. Each carries its own date and status; several are
explicitly superseded. Do not treat these as current unless the header says so.

- [direction-options-backend-vs-gui.md](research/direction-options-backend-vs-gui.md)
- [chord-reliability-validation-plan.md](research/chord-reliability-validation-plan.md)
- [chord-reliability-cr0-contract.md](research/chord-reliability-cr0-contract.md)
- [chord-reliability-cr0-approval-packet.md](research/chord-reliability-cr0-approval-packet.md)
- [chord-analysis-benchmark-strategy.md](research/chord-analysis-benchmark-strategy.md)
- [musical-chord-review-method.md](research/musical-chord-review-method.md) — progressive, theory-led review method for automatic chord charts
- [section-structure-prototype-plan.md](research/section-structure-prototype-plan.md)
- [section-structure-prototype-results.md](research/section-structure-prototype-results.md)
- [open-knowledge-format-context-assessment.md](research/open-knowledge-format-context-assessment.md)
- [band-practice-repositioning-review.md](research/band-practice-repositioning-review.md)
- [ponytail-audit-2026-08-09.md](research/ponytail-audit-2026-08-09.md) — ranked repository-wide over-engineering cuts; findings not applied
- [lyrics-transcription-options.md](research/lyrics-transcription-options.md)
- [source-legality-and-legal-posture.md](research/source-legality-and-legal-posture.md)
- [chord-editor-deep-research-report.md](research/chord-editor-deep-research-report.md) — Norwegian; chord/bar presentation in an editable app

Everything in `research/` is committed. New notes need no allowlist entry — add
the file and it is tracked. Keep this index updated when adding one, so the
directory stays navigable.

## archive/ — historical, do not edit

Split out of the live docs so the working set stays small. Content is frozen as
of the day it was moved.

- [TASKS_ARCHIVE.md](archive/TASKS_ARCHIVE.md) — completed task records
- [STATUS_ARCHIVE.md](archive/STATUS_ARCHIVE.md) — dated status history, completed-work list, and verification log

## Elsewhere in the repo

- [AGENTS.md](../AGENTS.md) — the agent operating manual: workflow, roles, definition of done
- [CHANGELOG.md](../CHANGELOG.md) — notable additions, improvements, and fixes over time
- [benchmarks/README.md](../benchmarks/README.md) — benchmark datasets, contracts, and baselines
- [chord-reliability-cr1-checkpoint.md](../benchmarks/chord-reliability-cr1-checkpoint.md) — inspectable full-mix/Demucs development baseline and dominant error review
- [chord-reliability-cr2-checkpoint.md](../benchmarks/chord-reliability-cr2-checkpoint.md) — rejected accompaniment variants, Chordino development control, and replacement gate
- [chord-reliability-cr2f-checkpoint.md](../benchmarks/chord-reliability-cr2f-checkpoint.md) — musical-window Candidate A development gate and diagnostic result
- [chord-reliability-cr2f-manual-review.md](../benchmarks/chord-reliability-cr2f-manual-review.md) — raw-versus-candidate review packet and frozen response
- [assets/design-screenshots/](../assets/design-screenshots/) — prototype screenshots used by the design brief
- [assets/moises-screenshots/](../assets/moises-screenshots/) — Moises reference captures used by the competitive analysis
