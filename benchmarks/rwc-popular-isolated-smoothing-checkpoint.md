# RWC-P isolated-beat smoothing checkpoint

Date: 2026-07-22

This is the first post-baseline Phase 2J experiment. The analyzer now replaces
an isolated one-beat `A–B–A` label sequence with `A–A–A` before merging adjacent
equal cues. Chord scoring, vocabulary, key estimation, timing, and stem evidence
are unchanged.

The eight development tracks were evaluated first. The four locked holdout
tracks were opened only after the development gate passed. Detailed JSON and
per-run Markdown remain ignored under `benchmark-results/`; no RWC audio or
application jobs are committed.

Reproducibility:

- RWC annotation commit: `0a1a6c31dbe73a7f5d44f7caef8cd0999402a4c2`
- Manifest SHA-256: `25053f85537c7a3ff388075c88add2f2c8425bc3a693599a58893192b499578f`
- Evaluator: `mir_eval==0.8.2`
- Product/default experiment: `--smoothing isolated`
- Pre-smoothing control: `--smoothing none`
- Boundary comparison: 250 ms after merging adjacent equal labels

## Development result

| Measure | Oracle none | Oracle isolated | Estimated none | Estimated isolated |
| --- | ---: | ---: | ---: | ---: |
| Root WCSR | 71.7% | 72.7% | 66.0% | 67.1% |
| MajMin WCSR | 58.6% | 60.8% | 53.7% | 55.7% |
| MajMin track median | 58.8% | 61.3% | 51.9% | 53.3% |
| MIREX WCSR | 58.4% | 60.2% | 54.6% | 56.3% |
| Boundary F1 | 53.1% | 57.2% | 44.1% | 45.2% |
| False-extra boundaries | 1503 | 1162 | 1321 | 1079 |
| Estimated changes/min | 69.7 | 58.8 | 57.2 | 48.9 |

Oracle MajMin improved on seven tracks and was unchanged on one. Estimated
MajMin improved on six tracks; the two regressions were 0.6 and 0.9 percentage
points. Runtime remained about 0.01 real time. The development gate passed
because both timing modes gained about two MajMin points, both medians improved,
a majority of tracks improved, and false-extra boundaries fell materially.

## Holdout checkpoint

| Measure | Oracle none | Oracle isolated | Estimated none | Estimated isolated |
| --- | ---: | ---: | ---: | ---: |
| Root WCSR | 62.6% | 63.5% | 54.3% | 54.0% |
| MajMin WCSR | 48.1% | 49.0% | 40.2% | 39.9% |
| MajMin track median | 44.3% | 45.5% | 38.1% | 38.1% |
| MIREX WCSR | 49.0% | 49.8% | 42.1% | 41.7% |
| Boundary F1 | 49.8% | 53.7% | 44.2% | 42.5% |
| False-extra boundaries | 1112 | 920 | 502 | 451 |
| Missing boundaries | 28 | 38 | 283 | 312 |
| Estimated changes/min | 112.9 | 99.3 | 54.7 | 49.3 |

Oracle timing improved. Estimated timing lost 0.3 MajMin points and 1.7 boundary
F1 points while still removing 51 false-extra boundaries; three estimated
tracks regressed slightly and one improved. The largest per-track MajMin
regression was 1.0 percentage point before rounding. This remains within the
locked maximum one-point holdout regression, but shows that unconditional
smoothing trades some true changes for fewer false changes when timing is weak.

## Decision

Retain isolated-beat smoothing as the conservative default and version the
analyzer as `beat-aware-chroma-v3`. The experiment generalizes within the locked
gate and directly reduces the excessive cue density that made corrected real
songs difficult to read.

Do not tune this rule against the now-consumed holdout. The next Phase 2J task
is to define separate raw candidate evidence and conservative presentation so a
user can recover plausible short changes without allowing analysis to overwrite
the working chart.
