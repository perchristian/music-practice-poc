# CR2F Candidate Contract

Date frozen: 2026-08-10

The consumed CR2E holdout is unavailable. Candidate selection uses only the
eight-track RWC-P development split and the already consumed local recordings.

## Candidate A: musical-window-v1

- Keep the pinned Chordino transform and raw intervals unchanged.
- For each authoritative beat window, sum the overlap duration of every raw
  label and select the label with the greatest occupancy.
- Break an exact occupancy tie with the existing midpoint label.
- Merge adjacent equal beat labels.
- With `--smoothing isolated`, replace only a single A–B–A beat label with A.
  A real short or off-beat change that wins two consecutive beat windows must
  survive this rule.
- Use reference beats for the primary oracle run and the existing lightweight
  estimated beat grid for the separately reported end-to-end diagnostic.
- Identify the derived analyzer as `chordino-v5-musical-window-v1`; never
  overwrite or relabel raw Chordino evidence.

## Automated retention gate

Against raw Chordino on the eight development tracks, Candidate A passes only
if all of these hold for oracle timing:

- root, MajMin, and 250 ms boundary F1 each regress by no more than 1.0 point;
- false-extra boundaries decrease;
- missing boundaries increase by no more than 5%;
- cue density does not increase.

End-to-end results are diagnostic and cannot override the oracle decision.

## Stop and escalation

If Candidate A passes, prepare the raw/candidate local comparison before asking
for review of the three consumed recordings. Candidate B is allowed only if
that comparison still shows persistent confidently wrong roots; it must use
beat-aggregated NNLS bass/treble chroma and the existing scorer. No other label
rules, Chordino parameters, vocabulary, or product behavior may change in CR2F.
