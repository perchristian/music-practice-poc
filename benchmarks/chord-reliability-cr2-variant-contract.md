# CR2 Accompaniment-First Variant Contract

Date locked: 2026-08-10, before CR2 variant results were produced.

## Baseline

Compare both focused variants with the CR1 Demucs-assisted development baseline
in `benchmarks/chord-reliability-cr1-checkpoint.md`. Keep bass evidence and
isolated-beat smoothing unchanged so CR2 measures only chord-quality source
selection.

## Focused variants

1. `accompaniment-role`: audible piano, guitar, accompaniment, and `other`
   stems provide chord-quality evidence. The full mix provides chord-quality
   evidence only when none of those stems is audible.
2. `accompaniment-chordal`: apply the same role gate, then require a candidate
   stem segment to be polyphonic in at least half of its four diagnostic
   subframes. The full mix provides chord-quality evidence only when no segment
   passes both gates.

Both variants retain the existing full-mix and dedicated-stem bass evidence.
Vocals and drums remain inspectable diagnostics but cannot provide direct
chord-quality evidence. `legacy` remains selectable as the CR1 control.

## Development decision rule

Retain a variant only if, relative to the oracle-timing CR1 Demucs baseline, it:

- improves MajMin on at least five of eight development tracks;
- improves aggregate MajMin by at least 2 absolute percentage points;
- reduces 250 ms false-extra boundaries; and
- does not exceed the locked missing-boundary regression rule: fail only when
  the increase is both more than 2 boundaries and more than 10%.

Use end-to-end timing as a required regression report, not to select between
variants. Prefer the smaller `accompaniment-role` policy if both pass. If both
focused variants fail the same dominant error class, stop local weight tuning
and follow Milestone 2's external-analyzer comparison escape rule.

The RWC holdout remains closed until issue #8 approves the primary thresholds.
