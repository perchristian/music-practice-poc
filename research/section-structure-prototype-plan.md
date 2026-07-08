# Section Structure Prototype Plan

Date: 2026-07-08

## Purpose

Evaluate whether repeated song-section support makes chord editing easier or adds confusing structure-management overhead.

This is a product-model experiment, not a commitment to a permanent data model. The goal is to compare small prototypes before adding section templates, linked copies, local overrides, or AI section detection to `main`.

## Product Question

Can the app help a user maintain repeated song parts such as verse, chorus, bridge, and outro without making them unsure whether an edit affects one occurrence or every occurrence?

## Test Scenario

Use the same chord chart shape for every prototype:

```text
Intro: 4 bars
A / Verse: 8 bars
B / Chorus: 8 bars
A' / Verse 2: 8 bars, with 1-2 different chords
C / Bridge: 8 bars
B / Chorus: 8 bars
Outro: 4 bars
```

The chart should include at least one repeated section that is identical and one repeated section that is mostly identical but musically different in a small number of bars.

## Evaluation Criteria

Score each prototype qualitatively against:

- Understandability: the user can explain what will happen before editing.
- Edit speed: repeated material can be labeled, reused, or corrected faster than flat editing.
- Accidental-change risk: the UI makes it hard to unintentionally change every occurrence.
- Variation support: nearly identical sections can be represented without duplicating everything manually.
- Visual calm: structure aids scanning without dominating the practice view.
- Current-model compatibility: the approach fits the existing grid-first `practiceState.chordChart`.
- Implementation complexity: the prototype is small enough to validate before broad architecture changes.

## Prototype A: Flat Sections

Shape:
- User labels bar ranges as `Intro`, `A`, `B`, `Verse`, `Chorus`, etc.
- Copy/paste remains physical duplication of chord events.
- Repeated sections are visually marked but not linked.

What it tests:
- Whether section labels plus better range workflows solve enough of the problem.

Expected strengths:
- Lowest implementation and mental-model complexity.
- Minimal risk of surprising edits.
- Compatible with the current flat chord chart model.

Expected weaknesses:
- Repeated sections still require manual maintenance.
- Variation awareness depends on the user noticing differences.

## Prototype B: Linked Sections

Shape:
- User defines section templates such as `A` and `B`.
- Arrangement order can be represented as `Intro A B A C B Outro`.
- Editing template `A` changes all `A` occurrences.
- A visible control is required to choose between "edit all occurrences" and "edit only this occurrence".

What it tests:
- Whether linked section reuse feels natural enough to justify the additional data model.

Expected strengths:
- Strongest support for true repetition.
- Potentially large speed-up when many sections repeat exactly.

Expected weaknesses:
- High accidental-change risk if edit scope is unclear.
- Requires a model beyond flat chord events.
- Needs a clear escape hatch for independent copies.

## Prototype C: Assisted Sections

Shape:
- The app scans the working chord chart for repeated or near-repeated bar ranges.
- It suggests possible sections such as `A`, `A'`, and `B`.
- The user accepts, rejects, relabels, or ignores suggestions.
- Initial storage may remain flat after acceptance.

What it tests:
- Whether AI-assisted pattern discovery provides value without committing to linked editing.

Expected strengths:
- Helps users find patterns they would otherwise maintain manually.
- Keeps the user in charge of the musical decision.
- Can start as a non-destructive overlay on the current chart.

Expected weaknesses:
- Suggestions may be noisy if the chord chart is wrong.
- Similarity thresholds can be hard to explain.
- Does not by itself solve synchronized maintenance unless paired with linked sections later.

## Recommended Order

1. Build Flat Sections first if the immediate goal is minimal product risk.
2. Build Assisted Sections next if the goal is to test AI support without changing the storage model.
3. Defer Linked Sections with local overrides until the first two prototypes show that flat labels and suggestions are insufficient.

This order prioritizes learning value and demo quality while limiting irreversible model complexity.

## Agent Strategy

Use one lead agent for the first planning and prototype-spec pass.

Do not parallelize builders until the shared test scenario and evaluation criteria above are stable. Multiple agents are only worth the token cost if the goal is intentionally divergent design exploration, for example independent UI proposals for Flat, Linked, and Assisted prototypes.

If multiple agents are used later:

- Architect/lead: owns shared scenario, evaluation criteria, data-model review, and final recommendation.
- Builder A: implements Flat Sections prototype.
- Builder B: implements Linked Sections prototype.
- Builder C: implements Assisted Sections prototype.
- Reviewer: compares prototypes against the same scenario and checks for regressions.

Any agent use, delegation, or model switch must be recorded in `STATUS.md`.

## Exit Criteria

Before promoting any approach into `main`, document:

- which prototype was tested
- what user task it improved
- where users could misunderstand edit scope
- whether the approach requires a new permanent data model
- whether it should become a Phase 5 task, remain a research prototype, or be discarded

