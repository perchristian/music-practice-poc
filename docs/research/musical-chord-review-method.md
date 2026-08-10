# Musical Chord Review Method

Status: Adopted for the next chord-reliability review on 2026-08-10 by Decision
42. This method supplements quantitative benchmarking; it does not replace the
protected development/holdout contract.

## Purpose

Judge whether an automatic chord chart is musically credible and useful to a
band member learning a cover. Aggregate scores are evidence, never the verdict.
Every retained or rejected analyzer change needs a musical explanation of what
worked, what failed, why it may have failed, and which smallest experiment can
distinguish the competing explanations.

## Evidence layers

Keep three layers separate:

1. **Acoustic observation:** audible notes, bass movement, attacks, sustain,
   tuning, instrumentation, leakage, and timing.
2. **Musical interpretation:** the most plausible harmony in phrase and tonal
   context, including defensible alternatives.
3. **Analyzer behavior:** the mechanism that may have produced the label or
   boundary.

Do not describe an algorithmic label as musically correct merely because it
matches a reference string. Do not describe a musical interpretation as an
acoustic observation without listening evidence.

## Musical questions

Reviewers consider, where relevant:

- tonal center, local tonic, modulation, and modal ambiguity;
- tonic, predominant, dominant, cadential, and prolongational function;
- phrase structure and harmonic rhythm;
- root versus sounding bass, inversions, slash chords, and pedal points;
- arpeggios, suspensions, anticipations, passing and neighbor tones;
- chromatic bass motion and line clichés;
- secondary dominants, tonicization, modal mixture, and sequences;
- repeated sections, changed repetitions, arrangement, and voice-leading;
- power chords, riffs, non-functional harmony, ambiguous and no-chord passages.

Functional harmony is one explanatory model, not a universal rule. Modal,
riff-based, chromatically planed, static, or genuinely ambiguous passages must
not be forced into a conventional tonic/dominant narrative.

## Progressive complexity ladder

Start with the smallest material that isolates the open question. Advance one
source of complexity at a time.

### Level 1 — clear harmonic ground truth

- major/minor triads;
- audible roots;
- regular meter and stable tempo;
- one chord per bar or another slow, explicit harmonic rhythm;
- sparse arrangement with little melodic interference.

### Level 2 — ordinary diatonic songs

- common diatonic progressions;
- inversions and ordinary accompaniment patterns;
- more than one chord per bar;
- clear phrases, cadences, and repeated sections.

### Level 3 — contextual interpretation

- arpeggios, suspensions, anticipations, pedal tones, and passing bass;
- line clichés and off-beat changes;
- melody notes that disagree with the prevailing chord;
- altered repetitions and denser arrangements.

### Level 4 — advanced or ambiguous harmony

- secondary dominants, borrowed harmony, modulation, and extensions;
- root ambiguity, modal or non-functional passages, and riffs;
- dense orchestration, missing roots, and separation leakage.

### Level 5 — performance and capture variation

- live or alternate performances;
- rubato and variable tempo;
- compressed screen recordings, noise, unusual tuning, and weak stems;
- the same composition in materially different arrangements.

The ladder classifies passages as well as complete songs. A complex song can
contain a Level-1 passage useful for isolating a failure.

## Advancement rule

Do not advance because an aggregate threshold passes. Advance when:

- there are no unexplained rewrite-level failures at the current level;
- important failures have specific musical descriptions and causal theories;
- at least one discriminating test has challenged each leading theory;
- remaining disagreements are documented as bounded limitations or legitimate
  alternative readings;
- the resulting chart is useful to learn from without checking every beat.

When these conditions are not met, repeat the level with a simpler or more
diagnostic passage. A numerical regression guard can prevent obvious harm but
cannot establish musical improvement.

## Review protocol

1. Record the review question, input identities, timing source, analyzer/policy
   identities, and which evidence is development, consumed, or protected.
2. Listen without using the candidate labels to create a short musical map:
   tonal center, pulse/meter, harmonic rhythm, phrases, bass behavior, and
   characteristic patterns.
3. Compare raw and candidate labels at a synchronized playhead. Locate findings
   by timestamp and, when available, bar, beat, and subdivision.
4. Record what works, not only errors. State why each useful passage is
   musically convincing.
5. For every material failure, state the produced label, preferred
   interpretation, credible alternatives, and severity for a learner.
6. Develop competing causal theories. For each, record musical rationale,
   evidence for, evidence against, confidence, and the smallest discriminating
   experiment.
7. Inspect numerical results after the musical review. Explain what the metrics
   support, what they hide, and whether their units match the musical question.
8. End with the learning and next decision, not only a pass/fail code.

## Required report

Every review produces:

### Review question and evidence

What was judged, what was available, and what was missing.

### Musical map

Tonal centers, meter/pulse, harmonic rhythm, form, bass behavior, characteristic
patterns, and meaningful ambiguities.

### What works

Specific passages, why the interpretation is useful, and whether the success
generalizes beyond the example.

### What needs improvement

Specific passages, expected versus produced interpretation, learner severity,
and whether correction is local or rewrite-level.

### Causal theories

| Theory | Musical rationale | Evidence for | Evidence against | Confidence | Discriminating test |
| --- | --- | --- | --- | --- | --- |

### Role of the metrics

What quantitative evidence contributes and where it is musically incomplete.
Timing should include beat-, subdivision-, or grid-normalized measures alongside
milliseconds when a reliable musical grid exists.

### Recommended experiments

The smallest ordered tests, adding one source of complexity at a time.

### Judgment and learning

Choose `ready for the next complexity level`, `repeat this level`, `stop and
reshape the method`, or `insufficient evidence`. Explain what was learned and
the next decision it enables. A workflow code such as `PASS` or
`PERSISTENT_ROOTS` may follow this analysis, but never replaces it.

## Specialist agent

The draft Workspace Agent `Musical Harmony Reviewer` implements this method as
an advisory reviewer. It maintains a song-complexity ladder and causal-hypothesis
ledger across its own runs when Memory is available.

The agent is not an authority, product validator, or hidden dependency. A human
or any capable agent can reproduce the review from this document, supplied
audio, synchronized label files, and benchmark artifacts. All project decisions
and evidence still belong in version-controlled reports and the decision log.

## Source and test-material constraints

- Use only recordings the user holds, appropriately licensed material, or
  generated fixtures.
- Never use a protected holdout to choose or tune a method.
- Mark already consumed recordings as development/diagnostic evidence.
- Freeze song identity, performance, excerpt, reference interpretation, and
  analyzer version before a validation decision.
- Preserve credible alternative analyses rather than forcing one exact label
  when the musical evidence is ambiguous.
