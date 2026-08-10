# CR1 Inspectable Baseline and Failure Fixtures

Date: 2026-08-10

## Outcome

Milestone 1 passes. The analyzer can now emit opt-in benchmark diagnostics for
every beat without changing normal job metadata or chord output. Six generated
known-answer scenarios isolate the failure mechanisms required by CR1. The
locked eight-track RWC-P development split was benchmarked with full-mix-only
evidence and with real Demucs `htdemucs_6s` stems, using both oracle/reference
timing and analyzer timing.

The four-track RWC holdout was not opened. No analyzer weights, score formula,
sequence rule, or public chord label behavior changed.

## Generated scenarios

| Fixture | Evidence/control reproduced |
| --- | --- |
| `vocal-melody` | Strong audible vocal chroma remains inspectable while vocals are excluded from current direct scoring; accompaniment evidence changes raw winners on affected beats. |
| `no-dedicated-bass` | The source list contains no bass stem and still exposes comp/source low-note evidence. |
| `comp-bass-fallback` | A silent bass stem is measured as unreliable while piano and guitar expose the expected C low-note candidate. |
| `brief-ornament` | The F-sharp ornament is audible in only one of four subframes (0.25 persistence) and the stable C control remains intact. |
| `repeated-different-melody` | Corresponding piano chroma remains similar while vocal/full-mix chroma differs between the repeated C-F instances. |
| `legitimate-repeat-variation` | The final repeated-section chord remains a distinct G instead of being forced to the earlier F. |

## Development baselines

All accuracy and boundary values are percentages. Density is estimated chord
changes per minute; the reference is 27.4 changes/minute.

| Evidence | Timing | Root | MajMin | Triads | MIREX | Boundary F1 | Density | Runtime | Peak RSS estimate |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Full mix | Oracle | 65.0 | 53.6 | 50.0 | 55.6 | 48.8 | 73.8 | 63.1 s | 561 MiB |
| Demucs-assisted | Oracle | 70.0 | 61.0 | 57.3 | 64.2 | 53.0 | 65.0 | 374.3 s | 589 MiB |
| Full mix | End to end | 60.8 | 48.1 | 44.7 | 50.8 | 39.0 | 60.3 | 55.6 s | 1,081 MiB |
| Demucs-assisted | End to end | 66.7 | 57.5 | 53.7 | 60.8 | 40.5 | 53.4 | 359.4 s | 1,226 MiB |

Peak RSS is a benchmark-process estimate sampled after each track. It includes
retained diagnostic artifacts and is not a pure peak for the analyzer function.
Detailed per-beat JSON and derived Demucs audio remain in ignored local artifact
directories.

## Public-output comparison

- The focused fixture check compared analyzer results with diagnostics off and
  on after removing only the random analysis identity, elapsed duration, and
  opt-in diagnostics; the remaining public result was deeply equal.
- The pre-change and post-change full-mix RWC evaluation structures were equal
  for both oracle and end-to-end timing, including metrics, boundaries, cue
  density, and error classification.
- Normal real jobs and corrected-timing reanalysis do not request diagnostics.

## Dominant error review

Wrong root remains the largest scored error class. With oracle timing, Demucs
reduced wrong-root duration from 677.4 s to 558.3 s and wrong-quality duration
from 212.1 s to 188.7 s. End-to-end wrong-root duration fell from 749.0 s to
619.6 s. This confirms that separated evidence helps, but does not resolve root
selection.

Over-segmentation remains the clearer boundary failure. With oracle timing,
Demucs produced 1,400 false-extra boundaries and 101 missing boundaries; its
65.0 changes/minute is 2.37 times the 27.4 reference rate. The proposed density
gate is at most 1.5 times reference. End-to-end Demucs still produced 1,280
false extras and 382 missing boundaries.

The oracle Demucs diagnostic artifact covers 4,096 beats. Separated stems
changed the selected winner relative to full mix on 2,446 beats, bass evidence
changed it on 969 beats, weak-extension simplification changed the raw quality
on 2,131 beats, and isolated smoothing changed 272 beats. The weakest MajMin
tracks remain `RWC_P006` (44.2%), `RWC_P083` (49.4%), and `RWC_P004` (50.5%).
These results support CR2's accompaniment-first experiment: source roles and
reliability need to be tested directly before adding bass fallback or more
sequence logic.

## Proposed-gate comparison

The development result does not approve or reject the unopened holdout, but it
makes the proposed threshold review actionable:

- Oracle Demucs remains below the proposed Root 75%, MajMin 65%, Triads 60%,
  MIREX 65%, and boundary F1 60% bars.
- End-to-end Demucs clears the proposed Root 65% and MajMin 55% bars, but misses
  boundary F1 50%.
- Both timing modes miss the proposed maximum 1.5x cue-density ratio.

## Verification commands

```sh
npm run generate:test-media
node --test tests/harmony-analysis.test.js tests/chord-benchmark.test.js
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split development --timing both \
  --output benchmark-results/chord-reliability/cr1/full-mix
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --stems .benchmark-data/chord-reliability-rwc-demucs \
  --split development --timing both \
  --output benchmark-results/chord-reliability/cr1/demucs-assisted
npm test
```
