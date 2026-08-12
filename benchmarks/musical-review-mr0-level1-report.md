# MR0 Level-1 Musical Review

Date: 2026-08-12

Judgment: `repeat this level`

## Review question and evidence

Can the review method and current local analyzer recover a sparse,
root-position triad progression before either is exposed to inversions,
ornaments, off-beat changes, dense arrangement, or capture noise?

The frozen source is the generated 10-second
`test-media/phase-2h-three-four-90.wav` fixture, SHA-256
`8fe1322c4f60b9f2753554251899767c157caddd0632df16085e996f413e2075`.
It contains two excerpts: bars 1–3 at 0–6 seconds and bars 4–5 at 6–10
seconds. The authoritative grid is 90 BPM, 3/4, one chord per bar, with no
pre-roll. Issue #16 records Per's `USABLE` decision: the unprocessed source's
bass-plus-chords register is natural and identifiable.

`npm run prepare:mr0-review` regenerates the source, verifies the frozen source,
generator, method, and capability-test checksums, runs the analyzer twice, and
writes separate Arm B, C, and D files under the ignored
`benchmark-results/musical-review/mr0/level1/` directory.

Evidence limits:

- Arm A was not run. The configured Workspace Agent does not accept audio, and
  no separate audio-input reviewer is available in this workflow.
- Arms B–D are prepared but have not been run twice through independent fresh
  reviewer conversations with staged disclosure.
- Per's listening decision establishes source usability only; it is not an
  independent judgment of the analyzer labels or diagnostics.

## Musical map

The generated source is in C major. Each two-second 3/4 bar sustains one
root-position triad:

| Time | Grid | Chord | Function | Construction |
| --- | --- | --- | --- | --- |
| 0–2 s | bar 1, beat 1 | C | I | C–E–G with C3 bass |
| 2–4 s | bar 2, beat 1 | F | IV | F–A–C with F3 bass |
| 4–6 s | bar 3, beat 1 | G | V | G–B–D with G2 bass |
| 6–8 s | bar 4, beat 1 | C | I | C–E–G with C3 bass |
| 8–10 s | bar 5, beat 1 | Dm | ii | D–F–A with D3 bass |

There is no intended inversion, suspension, extension, alternate root,
modulation, or harmonic ambiguity.

## What works

- The final chart is exactly `C | F | G | C | Dm`, with
  `I | IV | V | I | ii` in C major. All five labels, bar positions, and change
  times match the generated reference.
- The chart has the correct one-chord-per-bar harmonic rhythm with no false,
  missing, or displaced boundaries.
- Two analyzer runs produced identical diagnostics and labels.
- The source passed its human listening gate after the register was raised one
  octave. This closes the material-usability gap that invalidated version 1.

This establishes only that the final-label path handles this generated source
with authoritative timing. It does not generalize to real recordings.

## What needs improvement

### The staged reviewer capability is still unmeasured

Arms B–D have not been independently run, and Arm A has no available audio
reviewer. The packet is reproducible, but specialist accuracy and run-to-run
stability remain unknown.

### Raw winners still invent extensions on every beat

All 15 raw beat winners are unsupported seventh chords: `Cmaj7`, `C7`,
`Fmaj7`, `Gmaj7`, or `Dm7`. The final triads are correct only after
weak-extension simplification. Raw margins range from 0.001 to 0.134; the F
bar now has the largest margins. The raised register changed the score margins
but did not remove the systematic extension bias. Learner severity is currently
low because the displayed triads are correct, but the behavior is a rewrite risk
for later passages containing real or leakage-induced extensions.

### The neutral bass diagnostic cannot represent the F3 root

The analyzer's low-note range ends at MIDI 52 (E3), while the raised F bass is
MIDI 53 (F3). Arm B therefore reports E3 as its strongest in-range low-note
candidate during the F bar even though full chroma and the final chord label
correctly support F. A reviewer must not treat that bounded diagnostic as a
complete bass transcription. This has no current learner-visible severity; it
is a local evidence-quality limitation.

### Chordality still understates the generated triads

The full chroma contains the chord tones, but the diagnostic chordality summary
reports roughly one active pitch class per subframe. This is neutral-evidence
quality debt, not a displayed chart failure, so current learner severity is
none.

## Causal theories

| Theory | Musical rationale | Evidence for | Evidence against | Confidence | Discriminating test |
| --- | --- | --- | --- | --- | --- |
| Persistent roots and authoritative timing drive final-label success. | Stable roots and bar-long triads make both harmonic identity and change points unusually explicit. | Four bars have reliable intended-root low-note evidence; all boundaries and final labels are exact. | F3 falls outside the low-note diagnostic, yet F still succeeds. | Medium | Compare the same progression without reinforced bass and with inversions. |
| Template weighting creates false seventh winners and simplification masks it. | No generated chord contains a seventh, so a seventh in every raw label cannot represent the intended harmony. | Every raw winner adds an absent seventh in both source registers. | Extension type and margin vary by chord and register. | High that the bias exists; medium on cause | Generate matched triad/seventh pairs at equal level and compare raw scores. |
| Fixed low-note range, not musical ambiguity, causes the F-bar bass mismatch. | F is the unambiguous constructed bass and chord root for the whole bar. | F3 is exactly one semitone above the configured upper bound; the source and full chroma contain F. | Not tested on real bass timbres or octave harmonics. | High for this fixture | Raise the diagnostic ceiling in benchmark-only analysis and compare F-bar evidence. |
| The reviewer can derive useful harmony from Arm B before labels are disclosed. | The progression is diatonic, root-position, and slow enough to infer from tonal and pitch-class evidence. | Timing and full chroma expose the intended pitch classes. | No independent staged runs exist; the bass and chordality summaries may mislead. | Low | Run Arm B twice in fresh conversations before revealing C and D. |

## Role of the metrics

Final root and MajMin accuracy are 100% over 10 seconds. Boundary precision,
recall, and F1 are 100% because all four changes coincide with authoritative bar
lines. Cue density also matches the reference.

Those figures support a narrow statement: the displayed chart is correct on
this generated known-answer source. They hide the 0/15 raw exact-label result,
the F3 diagnostic ceiling, and the unmeasured specialist behavior. They say
nothing about capture noise, real arrangements, or generalization.

## Recommended experiments

1. Run Arms B, C, and D twice in fresh reviewer conversations, preserving
   disclosure order. Record the inferred map, hypotheses, disagreements, and
   run-to-run stability.
2. Add one matched generated triad/seventh control without changing the product
   analyzer.
3. Treat the F3 diagnostic ceiling as explicit evidence when interpreting Arm
   B; do not change product range until a dedicated benchmark demonstrates a
   user-visible benefit without harming bass discrimination.
4. Only after these checks, consider Level 2 material. Do not combine multiple
   new complexities in one passage.

## Judgment and learning

`repeat this level`.

The source is now human-approved and the displayed analyzer chart is fully
correct and stable. The review still exposes two bounded uncertainties: staged
reviewer capability is unmeasured, and correct final triads conceal systematic
raw seventh winners. Raising the source also revealed a precise diagnostic
boundary at F3. The next authorized action is the staged Level-1 reviewer run;
this does not authorize Candidate B, Level 2, or product integration.
