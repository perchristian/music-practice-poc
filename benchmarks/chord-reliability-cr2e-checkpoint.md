# CR2E Chordino Holdout Checkpoint

Date: 2026-08-10

## Outcome

`STOP/REFRAME`. Chordino remains materially better than the unchanged local
analyzer, but it missed the frozen oracle root threshold: 73.1% against the
75.0% minimum. The four-track RWC-P holdout is now consumed and must not be used
for tuning or another candidate decision.

The approved manual screen-recording check remains blocked by the failed RWC
gate. No product adapter is authorized and Chordino remains outside mock and
real application setup. CR3–CR5 should not resume automatically: the next step
is a product-owner decision on whether to stop automatic chord-analysis work or
reframe it around a different validation strategy.

## Frozen aggregate gate

All accuracy and boundary values are percentages. Density is estimated chord
changes per minute divided by the reference density after adjacent equal labels
are merged.

| Analyzer | Timing | Root | MajMin | Triads | MIREX | Boundary F1 | Density | Runtime factor |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Frozen minimum / maximum | Oracle | **75.0** | 65.0 | 60.0 | 65.0 | 60.0 | ≤1.50 | ≤0.50 |
| Chordino | Oracle | **73.1 FAIL** | 73.9 | 68.1 | 76.9 | 72.9 | 1.01 | 0.0136 |
| Local CR1 baseline | Oracle | 63.6 | 59.0 | 53.3 | 61.4 | 53.6 | 2.23 | 0.1801 |
| Frozen minimum / maximum | End to end | 65.0 | 55.0 | — | — | 50.0 | ≤1.50 | ≤0.50 |
| Chordino | End to end | 74.4 | 75.2 | 69.3 | 78.1 | 76.0 | 1.01 | 0.0136 |
| Local CR1 baseline | End to end | 60.1 | 53.8 | 48.8 | 58.0 | 41.3 | 1.68 | 0.1758 |

Chordino processed 973 seconds of holdout audio in 13.3 seconds. The recorded
RSS is only the Node benchmark driver, so Chordino subprocess peak memory is
still unmeasured. That unresolved performance measurement does not alter the
failed root gate.

## Per-track comparison

Chordino improved oracle MajMin on three of four tracks and end-to-end MajMin on
all four. `RWC_P024` regressed 4.7 oracle MajMin points while its boundary F1
improved by 8.8 points.

| Track | Oracle local | Oracle Chordino | Change | End-to-end local | End-to-end Chordino | Change |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `RWC_P024` | 67.7 | 63.0 | **−4.7** | 58.5 | 63.4 | +4.8 |
| `RWC_P036` | 65.0 | 80.6 | +15.6 | 63.6 | 85.5 | +21.9 |
| `RWC_P002` | 50.6 | 66.7 | +16.1 | 45.4 | 65.5 | +20.1 |
| `RWC_P075` | 49.6 | 84.0 | +34.4 | 42.9 | 83.7 | +40.8 |

The regression is recorded as a diagnostic, not used to revise either analyzer.
The frozen aggregate thresholds remain unchanged.

## Guard and artifacts

- Issue #8 approved the exact thresholds and three-recording manual scope before
  the holdout was opened.
- Local used `legacy`, isolated smoothing, the full mix, and the already fixed
  six-source Demucs stems. Chordino used the pinned transform and full mix.
- Both analyzers ran once with `--split holdout --timing both --allow-holdout`.
- Detailed results remain ignored under
  `benchmark-results/chord-reliability/cr2e/`.
- Local-only target labels were generated while assembling the manual packet,
  before the complete threshold table exposed the root miss. No human review
  issue was opened, the labels were not used for tuning, and the blocked manual
  gate was not used to reinterpret the RWC result.
- The benchmark did not start the application server or create application jobs.

## Commands

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --stems .benchmark-data/chord-reliability-rwc-demucs \
  --split holdout --timing both --evidence-policy legacy \
  --allow-holdout \
  --output benchmark-results/chord-reliability/cr2e/local

npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split holdout --timing both --analyzer chordino \
  --sonic-annotator /path/to/sonic-annotator \
  --allow-holdout \
  --output benchmark-results/chord-reliability/cr2e/chordino
```
