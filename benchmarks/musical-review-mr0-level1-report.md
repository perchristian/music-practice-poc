# MR0 Level-1 Musical Review

Date: 2026-08-11

Judgment: `repeat this level`

## Review question and evidence

Can the review method and current local analyzer recover a sparse,
root-position triad progression before either is exposed to inversions,
ornaments, off-beat changes, dense arrangement, or capture noise?

The frozen source is the generated 10-second
`test-media/phase-2h-three-four-90.wav` fixture, SHA-256
`651cc3c8138f2b70f8cb2574fd6bb0d88152e0822cf931d0e607d0931669e2d9`.
It contains two review excerpts: bars 1–3 at 0–6 seconds and bars 4–5 at
6–10 seconds. The authoritative grid is 90 BPM, 3/4, one chord per bar, with
no pre-roll. The reference, generator identity, analyzer identity, reviewer
identity, and disclosure order are frozen in
`benchmarks/musical-review-mr0-level1.json`.

`npm run prepare:mr0-review` regenerated the audio, verified every frozen
checksum, ran `beat-aware-chroma-corrected-timing-v2` twice, confirmed stable
results, and wrote separate Arm B, C, and D files under the ignored
`benchmark-results/musical-review/mr0/level1/` directory.

Evidence limits:

- Arm A was not run. The available `gpt-5.3-codex` Workspace Agent does not
  accept audio, and no separately configured audio-input reviewer is available
  in this workflow.
- Arms B–D are prepared but have not yet been run twice through an independent
  reviewer with staged disclosure. This report can audit the complete packet,
  but it is not a blinded model-capability result.
- No direct listening claim is made. Acoustic facts below come from the
  deterministic generator contract and measured signal representation.

## Musical map

The generated source is in C major, at a stable 90 BPM in 3/4. Every bar starts
with a root-position triad and retains it for three beats. The phrase is:

| Time | Grid | Chord | Function | Acoustic construction |
| --- | --- | --- | --- | --- |
| 0–2 s | bar 1, beat 1 | C | I | C–E–G with C bass |
| 2–4 s | bar 2, beat 1 | F | IV | F–A–C with F bass |
| 4–6 s | bar 3, beat 1 | G | V | G–B–D with G bass |
| 6–8 s | bar 4, beat 1 | C | I | C–E–G with C bass |
| 8–10 s | bar 5, beat 1 | Dm | ii | D–F–A with D bass |

The first excerpt isolates primary major functions. The second isolates the
major/minor quality distinction. There is no intended inversion, suspension,
extension, alternate root, modulation, or harmonic ambiguity.

## What works

- The final chart is exactly `C | F | G | C | Dm`, with `I | IV | V | I | ii`
  in C major. All five labels, roots, qualities, bar positions, and change
  times match the generated reference.
- The chart has the correct slow harmonic rhythm: one cue per bar, with no
  false extra or missing boundaries. A learner would not need to rewrite this
  Level-1 chart.
- The strongest measured low note is the intended root on every beat, and bass
  reliability is marked reliable throughout. That agrees with the generated
  root-position construction.
- Two analyzer runs produced identical stable evidence and labels. The result
  does not depend on an isolated smoothing rewrite.

This success establishes only that authoritative timing, clear roots, and
sparse triads are sufficient for the current final-label path on this generated
source. It does not generalize to real recordings.

## What needs improvement

### The staged reviewer capability is still unmeasured

The packet is ready, but Arms B–D have not been independently run and Arm A has
no available audio-input reviewer. This is a method-level evidence gap, not a
chord-chart error. It prevents a claim that the specialist can derive the
musical map without being anchored by labels or reference answers.

### Raw template winners invent extensions on every beat

Before conservative simplification, every one of the 15 beat candidates is an
unsupported seventh chord: `Cmaj7`, `Fmaj7`, `Gmaj7`, `C7`, or `Dm7`. The
displayed triads are correct only because weak-extension simplification changes
all 15 raw winners. Margins are small, from roughly 0.003 to 0.067.

This is not a learner-visible failure on the current fixture, but it is a
fragile success. A later source containing a real seventh could be
over-simplified, while a source with leakage could expose the raw extension.
The cause must be isolated before interpreting raw vocabulary behavior as
musical understanding.

### The neutral chordality feature understates obvious triads

Arm B's full chroma contains the intended chord tones, but the diagnostic
chordality feature reports one active pitch class for most C, F, and Dm beats;
G is the exception, at roughly three active pitch classes. A reviewer that
treats `chordality` as authoritative could be misled even though the chroma and
low-note evidence are useful. This is local to the neutral evidence packet and
does not change the final labels.

## Causal theories

| Theory | Musical rationale | Evidence for | Evidence against | Confidence | Discriminating test |
| --- | --- | --- | --- | --- | --- |
| Clear, persistent root evidence is the main reason final roots succeed. | Each chord is in root position and retains one root for a full bar. | Intended roots are the strongest low-note candidates on all 15 beats; bass reliability is 0.781–0.842. | The fixture does not test inversions, missing roots, or competing bass motion. | High for this fixture | Regenerate the same progression with the bass removed, then with chord-tone inversions, changing nothing else. |
| Template leakage or weighting creates false seventh winners, and the generic weak-extension rule masks it. | None of the generated chords contains a seventh, yet every raw winner does. | All 15 raw winners add a seventh with small margins; final labels become correct only after the same simplification rule. | Different roots choose `maj7` versus `7`, so a single leakage bin may not explain every case. | High that the bias exists; medium on cause | Generate matched triad/seventh pairs at equal level for each root and compare raw component scores before simplification. |
| The chordality diagnostic threshold misses sustained upper chord tones when one bass/root component dominates. | The chroma shows triad energy while the subframe summary often reports one active pitch class. | C, F, and Dm have root-dominant spectra and mostly monophonic chordality summaries; G has more balanced upper tones and reads polyphonic. | The exact threshold path has not been isolated, and the final scorer still finds the right triad family. | Medium | Generate equal-amplitude root-position triads without click or reinforced bass and inspect the four subframes directly. |
| The current reviewer can add theory-led value from neutral evidence before seeing labels. | Arm B exposes roots, chroma, timing, and persistence without answer labels. | The packet contains enough structured evidence to form the intended five-bar map. | No independent staged runs exist, so success and run-to-run stability are unknown. | Low | Run Arm B twice in fresh reviewer conversations, record the map and hypotheses, then disclose C and D in order. |

## Role of the metrics

Final root accuracy and MajMin accuracy are both 100% over 10 seconds. All four
reference change boundaries are present at the exact generated bar lines, so
boundary precision, recall, and F1 are 100% at both zero-grid-error and the
existing 100/250 ms tolerances. Cue density also matches the reference.

Those numbers support a narrow statement: the final local analyzer output is
correct on this generated known-answer fixture with authoritative timing. They
hide that raw exact-label accuracy is 0/15 beats because every raw winner adds
an unsupported seventh, and they say nothing about blind audio perception,
reviewer competence, real capture variation, or generalization. Grid positions
are the meaningful timing unit here; milliseconds add no information because
the source and grid are generated from the same contract.

## Recommended experiments

1. Have the product owner listen once to confirm that the generated source is
   perceptually usable as the intended clear-triad baseline and that this report
   is understandable enough to guide the next experiment.
2. Run Arms B, C, and D twice in fresh `Musical Harmony Reviewer` conversations,
   preserving disclosure order. Record disagreements, run-to-run stability, and
   whether the extension bias is identified before the reference is shown.
3. Add one matched generated triad/seventh control, without changing the
   analyzer, to distinguish a useful conservative simplification from a raw
   template-scoring defect.
4. Only after those checks, add a second source of complexity: root-position
   4/4 material first, then inversions or multiple changes per bar—not both at
   once.

## Judgment and learning

`repeat this level`.

The displayed analyzer chart is fully correct and stable on the frozen
Level-1 excerpts, so clear root-position triads are not currently a rewrite-
level failure. The review nevertheless uncovered two concrete uncertainties:
the specialist's staged capability has not been measured, and correct final
triads conceal systematic raw seventh-chord winners. The next authorized work
is the bounded Level-1 reviewer run and matched triad/seventh diagnostic. This
does not authorize Candidate B, Level 2, fresh validation, or product
integration.
