# CR2 Accompaniment-First and External-Control Checkpoint

Date: 2026-08-10

## Outcome

CR2 followed Milestone 2's external-analyzer escape rule. Both precommitted
local variants removed the false vocal-driven change in the generated control,
but both regressed the locked RWC-P development split. Neither is retained as
the application default, and local weight tuning stops here.

Chordino is the clear development replacement candidate. It substantially
outperformed the local Demucs-assisted analyzer through the same evaluator and
on all eight development tracks. Issue #8 approved the proposed thresholds and
three-recording manual-domain-check scope after this result was recorded. The
four-track RWC holdout remains unopened for the guarded CR2E run in issue #10.

## Generated melody control

On `vocal-melody`, the legacy policy emitted a transient raw `Cmaj7` between
stable `C` estimates, creating two false raw boundaries. Both
`accompaniment-role` and `accompaniment-chordal` held `C` throughout. Full-mix
fallback with no usable stems and all bass evidence remained unchanged.

## Development results

All accuracy and boundary values are percentages. Chordino oracle timing samples
its labels at the locked reference-beat segments; Chordino end to end uses its
own raw boundaries. Detailed JSON remains in ignored `benchmark-results/`.

| Analyzer / variant | Timing | Root | MajMin | Triads | MIREX | Boundary F1 | Extra | Missing | Changes/min |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local CR1 baseline | Oracle | 70.0 | 61.0 | 57.3 | 64.2 | 53.0 | 1,400 | 101 | 65.0 |
| `accompaniment-role` | Oracle | 67.0 | 57.7 | 54.2 | 61.6 | 53.0 | 1,403 | 101 | 65.1 |
| `accompaniment-chordal` | Oracle | 67.2 | 58.1 | 54.4 | 61.1 | 51.2 | 1,506 | 103 | 68.0 |
| Chordino | Oracle | 81.0 | 78.1 | 74.3 | 82.0 | 75.6 | 307 | 185 | 30.9 |
| Local CR1 baseline | End to end | 66.7 | 57.5 | 53.7 | 60.8 | 40.5 | 1,280 | 382 | 53.4 |
| `accompaniment-role` | End to end | 63.9 | 54.9 | 51.4 | 59.0 | 40.8 | 1,303 | 371 | 54.4 |
| `accompaniment-chordal` | End to end | 63.7 | 54.3 | 50.7 | 58.0 | 39.6 | 1,374 | 374 | 56.3 |
| Chordino | End to end | 80.5 | 77.5 | 73.8 | 81.6 | 77.7 | 288 | 162 | 31.1 |

The reference density is 27.4 changes/minute. Chordino's end-to-end density is
1.13x reference, below the proposed 1.5x gate; the local baseline is 1.95x.
Chordino took 27.7 seconds for 2,075 seconds of audio (real-time factor 0.013).
The recorded RSS is the Node benchmark driver only, not Chordino's subprocess
peak, so external peak memory remains unmeasured.

## Precommitted decision rule

| Requirement | Role variant | Chordal variant |
| --- | --- | --- |
| Improve at least 5/8 oracle MajMin tracks | FAIL — 1/8 | FAIL — 2/8 |
| Gain at least 2 points aggregate MajMin | FAIL — −3.3 | FAIL — −2.9 |
| Reduce false-extra boundaries | FAIL — +3 | FAIL — +106 |
| Stay within missing-boundary tolerance | PASS — unchanged | PASS — +2 |

Both variants failed the same accuracy and false-extra class, so the external
comparison was mandatory. Chordino improved oracle MajMin by 17.1 points,
boundary F1 by 22.6 points, and every development track. This is strong enough
to preempt CR3–CR5 until the locked holdout and manual domain check decide
whether Chordino should replace the local analyzer.

## Implementation and dependency boundary

- `legacy`, `accompaniment-role`, and `accompaniment-chordal` remain explicitly
  selectable for reproduction; `legacy` stays the product default.
- `benchmarks/chordino-transform.n3` pins Chordino v5's default pop settings and
  Harte label output.
- The benchmark accepts `--analyzer chordino` and uses the existing evaluator.
- Sonic Annotator 1.7 and Vamp Plugin Pack 2.0 are optional benchmark tools,
  installed separately. Mock mode and normal application setup gain no
  dependency.
- The external tools are GPL/AGPL-distributed; no binary is bundled and no
  product integration decision has been made.

## Verification commands

```sh
npm run generate:test-media
node --test tests/harmony-analysis.test.js tests/chord-benchmark.test.js
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --stems .benchmark-data/chord-reliability-rwc-demucs \
  --split development --timing both \
  --evidence-policy accompaniment-role \
  --output benchmark-results/chord-reliability/cr2/accompaniment-role
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --stems .benchmark-data/chord-reliability-rwc-demucs \
  --split development --timing both \
  --evidence-policy accompaniment-chordal \
  --output benchmark-results/chord-reliability/cr2/accompaniment-chordal
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split development --timing both --analyzer chordino \
  --sonic-annotator /path/to/sonic-annotator \
  --output benchmark-results/chord-reliability/cr2/chordino
npm test
```
