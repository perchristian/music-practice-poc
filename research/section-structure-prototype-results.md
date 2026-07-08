# Section Structure Prototype Results

Date: 2026-07-08

## Summary

This pass compares three paper prototypes for repeated song sections against the shared test scenario from `research/section-structure-prototype-plan.md`.

Recommendation:
- Build Flat Sections as the first product prototype.
- Add Assisted Sections as a non-destructive suggestion layer on top of the flat model.
- Defer Linked Sections until user testing proves that labels plus suggestions do not solve the maintenance problem.

Reason:
Flat Sections and Assisted Sections fit the current grid-first `practiceState.chordChart` model and keep edit scope obvious. Linked Sections may eventually save more time, but they introduce the highest risk: users must constantly understand whether an edit affects one occurrence or every occurrence.

No agents were delegated for this pass. No model switch was used.

## Shared Scenario

Use a 48-bar 4/4 chart:

| Bars | Section | Role | Chord shape |
|---:|---|---|---|
| 1-4 | Intro | unique | C / G/B / Am / G |
| 5-12 | A / Verse 1 | source repeat | C / G / Am / F / C / G / F / G |
| 13-20 | B / Chorus | exact repeat | F / C / G / Am / F / C / G / G |
| 21-28 | A' / Verse 2 | near repeat | C / G / Am / F / C / Dm / F / G |
| 29-36 | C / Bridge | unique | Am / F / C / G / Am / F / Dm / G |
| 37-44 | B / Chorus | exact repeat | F / C / G / Am / F / C / G / G |
| 45-48 | Outro | unique | C / G/B / Am / C |

This scenario intentionally includes:
- one exact repeated section: Chorus at bars 13-20 and 37-44
- one near repeated section: Verse 1 at bars 5-12 and Verse 2 at bars 21-28, differing in bar 26
- unique bookends: Intro, Bridge, Outro

## Prototype A: Flat Sections

### Concept

The user labels bar ranges, but chord events stay physically independent.

Example UI sketch:

```text
Harmony

[Intro]  1 | C   2 | G/B 3 | Am  4 | G
[A Verse]5 | C   6 | G   7 | Am  8 | F
         9 | C  10 | G  11 | F  12 | G
[B Chorus]13 | F 14 | C 15 | G 16 | Am
           17 | F 18 | C 19 | G 20 | G
[A' Verse 2]21 | C 22 | G 23 | Am 24 | F
             25 | C 26 | Dm 27 | F 28 | G
```

The section label is an overlay around existing bars. Editing a chord always affects the visible occurrence only.

### Data Shape

Store labels beside the existing chart:

```json
{
  "practiceState": {
    "chordChart": {
      "version": 1,
      "divisionsPerQuarter": 4,
      "chords": []
    },
    "sections": [
      {
        "id": "sec-a1",
        "label": "Verse",
        "symbol": "A",
        "startBar": 5,
        "endBar": 12,
        "source": "user"
      }
    ]
  }
}
```

This does not require a new permanent chord model. It is compatible with `practiceState.chordChart` because sections reference bar ranges only.

### Core Interactions

- Select bars 5-12, then label as `A / Verse`.
- Select bars 13-20, then label as `B / Chorus`.
- Copy bars 13-20 and paste at bar 37; the pasted chords are independent events.
- Rename a section label without changing chords.
- Remove a section label without deleting chords.
- Optional first shortcut: duplicate a labeled section to a destination bar.

### Edit Scope Rule

Every chord edit is local.

Visible copy:

```text
Editing bar 15 G -> G7 changes only bar 15.
Bar 39 remains G unless the user edits it separately.
```

This rule is easy to explain and low risk.

### What It Tests

- Whether section labels make long charts easier to scan.
- Whether users can manage repetition with simple labeled ranges and copy/paste.
- Whether exact and near repeats can be understood without linked templates.

### Strengths

- Lowest mental-model cost.
- Lowest accidental-change risk.
- Smallest implementation path.
- Fits the current grid-first chart without migration.
- Works even when analyzer chords are imperfect.

### Weaknesses

- Exact repeated choruses can drift apart after edits.
- Near-repeat awareness is manual unless assisted suggestions are added.
- Does not by itself answer "apply this change everywhere?" workflows.

## Prototype B: Linked Sections

### Concept

The user defines reusable section templates and builds an arrangement from those templates.

Example UI sketch:

```text
Arrangement
Intro | A | B | A' | C | B | Outro

Editing: B Chorus
( ) Only this occurrence
(*) All B occurrences

B Chorus template
1 | F  2 | C  3 | G  4 | Am
5 | F  6 | C  7 | G  8 | G
```

### Data Shape

Linked sections require a second layer beyond flat chord events:

```json
{
  "practiceState": {
    "sectionTemplates": [
      {
        "id": "template-b",
        "label": "Chorus",
        "symbol": "B",
        "lengthBars": 8,
        "chords": []
      }
    ],
    "arrangement": [
      { "templateId": "template-b", "startBar": 13 },
      { "templateId": "template-b", "startBar": 37 }
    ],
    "sectionOverrides": [
      {
        "occurrenceId": "verse-2",
        "barOffset": 5,
        "chordRaw": "Dm"
      }
    ]
  }
}
```

This is no longer just metadata around `practiceState.chordChart`; it changes how the working chart is authored.

### Core Interactions

- Create template `B / Chorus`.
- Place `B` at bars 13 and 37.
- Edit `B` once and update both chorus occurrences.
- Convert one occurrence to `B'` or detach it for variation.
- Resolve conflicts when a local override exists and the template changes later.

### Edit Scope Rule

The UI must force scope selection before template edits:

```text
Edit all B occurrences
Edit only this chorus
Detach this chorus as B'
```

If this is not always visible, accidental-change risk is high.

### What It Tests

- Whether template reuse is natural enough to justify a more complex data model.
- Whether users trust global edits in a practice chart.
- Whether local overrides can be explained without turning the chord editor into an arrangement editor.

### Strengths

- Best support for exact repetition.
- Fastest bulk correction when repeated sections are truly identical.
- Opens the door to compact arrangement views.

### Weaknesses

- Highest edit-scope confusion risk.
- Requires new model, rendering, persistence, and likely undo semantics.
- Near repeats need override rules that can become hard to explain.
- Higher risk of breaking current grid editing and loop assumptions.

## Prototype C: Assisted Sections

### Concept

The app scans the current flat chord chart for repeated or near-repeated bar ranges and suggests labels. Accepted suggestions become ordinary Flat Sections.

Example UI sketch:

```text
Suggested structure

High confidence
[Accept] B Chorus: bars 13-20 match bars 37-44 exactly

Possible variation
[Accept as A'] Verse 2: bars 21-28 match bars 5-12 except bar 26
[Ignore]

Detected song form
Intro | A | B | A' | C | B | Outro
```

### Data Shape

Suggestions can stay transient until accepted:

```json
{
  "sectionSuggestions": [
    {
      "id": "suggest-b-repeat",
      "label": "Chorus",
      "symbol": "B",
      "ranges": [
        { "startBar": 13, "endBar": 20 },
        { "startBar": 37, "endBar": 44 }
      ],
      "similarity": 1,
      "differences": []
    },
    {
      "id": "suggest-a-prime",
      "label": "Verse",
      "symbol": "A'",
      "ranges": [
        { "startBar": 5, "endBar": 12 },
        { "startBar": 21, "endBar": 28 }
      ],
      "similarity": 0.875,
      "differences": [
        { "bar": 26, "reference": "G", "candidate": "Dm" }
      ]
    }
  ]
}
```

Accepted suggestions should initially write flat `practiceState.sections`, not linked templates.

### Detection Sketch

Use the existing grid-first chart as input:

1. Convert each bar to a normalized chord signature.
2. Ignore roman numerals for matching; use raw chord names normalized for whitespace and simple enharmonic spelling later.
3. Compare candidate windows of 4, 8, and 16 bars.
4. Score exact matches as `1.0`.
5. Score near matches by bar-level edit distance.
6. Suggest exact repeats above `0.95`.
7. Suggest variations above `0.75` when differences are sparse and easy to list.
8. Never auto-apply labels; user accepts or ignores.

Example:

```text
bars 13-20 == bars 37-44
similarity: 1.00
suggest: B / Chorus

bars 5-12 ~= bars 21-28
similarity: 0.875
difference: bar 26 is Dm instead of G
suggest: A' / Verse 2
```

### Core Interactions

- Open suggestions panel.
- Accept exact repeated chorus as `B`.
- Accept near repeated verse as `A'`.
- Rename labels before accepting.
- Ignore suggestions that feel musically wrong.
- Re-run detection after user edits the chart.

### Edit Scope Rule

Suggestions do not change chords.

Accepted suggestions create labels only:

```text
Editing a chord after accepting a suggestion still affects only that visible occurrence.
```

This keeps the scope rule identical to Flat Sections.

### What It Tests

- Whether AI/pattern assistance helps users notice structure faster.
- Whether users trust suggestions enough when the chart is approximate.
- Whether "variation detected" is more valuable than linked editing.

### Strengths

- High learning value with low model risk.
- Makes the app feel AI-assisted without making hidden edits.
- Helps identify near repeats, which are the hardest case for manual maintenance.
- Can run on the existing `practiceState.chordChart`.

### Weaknesses

- Suggestions can be noisy if the chord chart is wrong.
- Similarity thresholds need calibration on real songs.
- Does not solve global maintenance of repeated exact sections by itself.

## Comparative Evaluation

Scores: High is favorable for the criterion.

| Criterion | Flat Sections | Linked Sections | Assisted Sections |
|---|---|---|---|
| Understandability | High | Medium-low | High |
| Edit speed | Medium | High for exact repeats | Medium-high |
| Accidental-change safety | High | Low without very careful UI | High |
| Variation support | Medium | Medium if overrides are clear | High for discovery |
| Visual calm | High | Medium | Medium-high |
| Current-model compatibility | High | Low | High |
| Implementation complexity | Low | High | Medium |
| Best first-user-test value | High | Medium | High |

## Recommendation

Implement in this order:

1. Flat Sections MVP.
2. Assisted Sections detection and accept/ignore workflow.
3. Reassess Linked Sections only after user testing.

The first implementation should not add linked templates, local overrides, or global edit semantics. Those are irreversible enough to require stronger evidence.

## Proposed Next Implementation Slice

Build Flat Sections as a small, reversible addition:

- Add `practiceState.sections` with `id`, `label`, `symbol`, `startBar`, `endBar`, and `source`.
- Render section labels as compact headers or bands in the Harmony grid.
- Add a minimal "label selected bars" flow.
- Let users rename or remove a section label.
- Do not change chord editing behavior.
- Keep loops, current-chord highlighting, and stem playback unchanged.

Then add Assisted Sections as a pure function plus UI suggestions:

- `detectSectionSuggestions(chordChart, grid)` returns candidate repeated ranges.
- Accepted suggestions create flat section labels.
- Ignored suggestions are not persisted at first unless repeated noise becomes annoying.

## Exit Criteria Answers

Which prototype was tested:
- Paper prototypes for Flat Sections, Linked Sections, and Assisted Sections.

What user task it improved:
- Maintaining and scanning repeated song parts in a chord chart, especially verse/chorus structures.

Where users could misunderstand edit scope:
- Linked Sections. Users may not know whether a chord edit changes one occurrence or every occurrence.

Whether the approach requires a new permanent data model:
- Flat Sections: no; it adds bar-range labels beside the existing chart.
- Assisted Sections: no for the first version; accepted suggestions become flat labels.
- Linked Sections: yes; it requires templates, arrangement occurrences, and local overrides.

Whether it should become a Phase 5 task, remain a research prototype, or be discarded:
- Flat Sections should become the next implementation candidate if section structure is prioritized.
- Assisted Sections should follow as the next research-backed product feature.
- Linked Sections should remain a research prototype for now.

## Verification

This was a documentation and paper-prototype pass. Verification completed by:
- checking each prototype against the same 48-bar scenario
- checking compatibility with current `practiceState.chordChart`
- explicitly defining edit-scope behavior for each prototype
- confirming no test-created songs/jobs were created

Runtime verification is not required until a prototype is implemented in the app.
