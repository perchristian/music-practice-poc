# RWC-P development baseline

Date: 2026-07-21

This is the pre-tuning Phase 2J baseline for the eight development tracks in
`rwc-popular-pilot.json`. The four holdout tracks were not run or inspected.

Reproducibility:

- RWC annotation commit: `0a1a6c31dbe73a7f5d44f7caef8cd0999402a4c2`
- Manifest SHA-256: `25053f85537c7a3ff388075c88add2f2c8425bc3a693599a58893192b499578f`
- Analyzer `server.js` SHA-256: `f584473d683e3793b84e14917bd7ecdea8c99e1ccca6d158f52dc6c6d6589d1e`
- Evaluator: `mir_eval==0.8.2`
- Boundary tolerance: 100 ms and 250 ms after merging adjacent equal labels

## Aggregate results

| Measure | Oracle timing | Estimated timing |
| --- | ---: | ---: |
| Root WCSR | 71.7% | 66.0% |
| MajMin WCSR | 58.6% | 53.7% |
| MajMin track median | 58.8% | 51.9% |
| Triads WCSR | 55.7% | 50.8% |
| MIREX WCSR | 58.4% | 54.6% |
| Boundary F1, 100 ms | 51.4% | 19.4% |
| Boundary F1, 250 ms | 53.1% | 44.1% |
| Estimated changes/min | 69.7 | 57.2 |
| Reference changes/min | 30.2 | 30.2 |
| Raw analyzer cues/min | 71.6 | 61.6 |
| Wrong-root duration | 539.7 s | 653.0 s |
| Wrong-quality duration | 265.9 s | 248.8 s |
| MajMin reference OOV | 142.7 s | 142.7 s |
| Total runtime / real-time factor | 20.9 s / 0.0100 | 20.8 s / 0.0100 |

Oracle MajMin by complexity stratum was 53.2% low, 68.4% medium, and 58.2%
high. Estimated-timing MajMin was 48.8%, 56.7%, and 56.5%. The weakest oracle
track was low-complexity `RWC_P005` at 46.5%, which is
consistent with over-segmentation harming simple songs rather than errors being
limited to advanced harmony.

## Decision from the baseline

Port 0 passes: self-score, semitone-shift, equal-label split invariance, and
media-contract tests behave as expected. Port 1 does not support another small
chord-template tweak:

- Oracle timing improves MajMin by 4.9 percentage points and makes 100 ms
  boundaries much better, so beat/grid errors matter.
- Oracle MajMin is still only 58.6%, so harmonic root/quality evidence is also
  a material problem.
- Both modes create far too many changes. Oracle produces 2.31 times and
  estimated timing 1.89 times the reference change density.
- Runtime is already inexpensive, so the next iteration should optimize
  reliability rather than speed.

The next single experiment should be a conservative temporal sequence/smoothing
layer evaluated on development only. Keep it only if it improves MajMin by at
least two percentage points or materially reduces false boundaries without
degrading MajMin, the track median, or a majority of tracks. If that experiment
and one follow-up do not generalize, stop local tuning and run Chordino through
the same evaluator. Holdout remains protected until the regression checkpoint.
