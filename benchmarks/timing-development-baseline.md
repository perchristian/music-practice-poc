# Timing Development Baseline

Date: 2026-07-22

This checkpoint evaluates the dependency-free threshold-aware timing fitter on seven generated known-answer scenarios. It does not use the consumed RWC chord holdout and does not create application jobs.

## Locked thresholds

- relative phase threshold: 18% of the active pulse duration
- relative local-tempo threshold: 8%
- persistence: 4 consecutive beat observations
- meter persistence: 2 bars
- minimum spacing between tempo boundaries: 2 bars
- beat/downbeat matching tolerance: 75 ms

## Results

| Fixture | Mean bar error | Max bar error | Beat F1 | Downbeat F1 | Change-boundary error | Meter accuracy | Sparse candidates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Leading silence | 0 ms | 0 ms | 0.957 | 0.941 | n/a | 1.000 | none |
| Pickup before Bar 1 | 0 ms | 0 ms | 0.971 | 0.941 | n/a | 1.000 | none |
| Stable human-like jitter | 0 ms | 0 ms | 1.000 | 0.941 | n/a | 1.000 | none |
| Abrupt 120 to 90 BPM | 1 ms | 2 ms | 1.000 | 0.952 | 0 bars | 1.000 | tempo at bar 5 |
| Gradual accelerando | 10 ms | 53 ms | 1.000 | 0.952 | 0 bars | 1.000 | tempo at bars 4, 6, and 8 |
| Gradual ritardando | 9 ms | 60 ms | 1.000 | 0.952 | 0 bars | 1.000 | tempo at bars 4, 6, 8, and 10 |
| 4/4 to 3/4 | 0 ms | 0 ms | 1.000 | 0.941 | 0 bars | 1.000 | meter at bar 5 |

The lower downbeat precision/recall at fixture endpoints comes from whether the final boundary is included in the finite evaluation window, not an internal bar shift. Ordinary jitter creates no correction candidate, while persistent changes remain sparse.

## Interpretation and limits

This validates the timing-map math, persistence rule, fixture metrics, and meter-aware downstream contract. It does not validate onset extraction or local meter detection on compressed commercial screen recordings. The next evidence gate is manual click/chord/loop/count-in review on at least two real recordings, including a late start and a tempo or meter change. Thresholds must not be tuned from the consumed chord holdout.
