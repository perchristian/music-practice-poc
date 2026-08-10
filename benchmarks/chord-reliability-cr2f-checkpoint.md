# CR2F Candidate A Checkpoint

Date: 2026-08-10

## Outcome

Candidate A, `chordino-musical-window-v1`, passes its frozen RWC-P development
gate. It selects the raw Chordino label with the most duration inside each
authoritative beat and applies the existing isolated A–B–A rule. The consumed
CR2E holdout was not opened, and no product behavior changed.
The CLI also rejects this candidate policy on any holdout track.

The pass makes the three-recording raw-versus-candidate review ready in issue
#12. Candidate B remains conditional: it is authorized only if that review
confirms persistent confidently wrong roots.

The automated pass is a safety/retention result, not a demonstrated-benefit
result. Candidate A removed one false-extra boundary while adding nine missing
boundaries and lowering F1 by 0.52 points. Those values satisfy the frozen
limits but do not establish a meaningful musical improvement; issue #12 carries
that judgment.

## Frozen development gate

All accuracy and boundary values are percentages. The missing-boundary increase
is `(194 - 185) / 185 = 4.86%`, within the frozen 5% limit.

| Oracle metric | Raw Chordino | Candidate A | Gate | Result |
| --- | ---: | ---: | --- | --- |
| Root | 81.0 | 80.9 | Regression ≤1.0 point | PASS — −0.06 |
| MajMin | 78.1 | 78.1 | Regression ≤1.0 point | PASS — −0.02 |
| Boundary F1, 250 ms | 75.6 | 75.1 | Regression ≤1.0 point | PASS — −0.52 |
| False-extra boundaries | 307 | 306 | Must decrease | PASS — −1 |
| Missing boundaries | 185 | 194 | Increase ≤5% | PASS — +4.86% |
| Changes/minute | 30.9 | 30.7 | Must not increase | PASS |

## Diagnostic evidence

Across the eight development tracks, 758 of 1,074 raw boundaries were within
100 ms of a beat and 195 were within 100 ms of an off-beat; none was farther
than 250 ms from both. Of the authoritative beat windows, 1,035 contained more
than one raw label and 34 contained more than two. Duration voting disagreed
with midpoint sampling on zero development windows, with mean winning occupancy
95.7%. Candidate A's small aggregate change therefore comes almost entirely
from isolated-beat stabilization rather than duration voting.

On the three consumed local recordings:

| Scenario | Raw cues | Candidate cues | Midpoint disagreements | Mean winner occupancy |
| --- | ---: | ---: | ---: | ---: |
| `TeAmo` | 109 | 105 | 1 | 92.6% |
| `Changes part 1` | 13 | 12 | 1 | 94.4% |
| `ShapeOfMyHeart` | 32 | 29 | 1 | 94.1% |

This reduction is too small to infer that the reported wrong roots are fixed.
That musical judgment belongs to the ready comparison review.

## End-to-end diagnostic

Estimated-grid results are separately reported and do not override the oracle
gate. Candidate A root was 76.1%, MajMin 73.6%, boundary F1 56.8%, and density
28.3/min, versus raw Chordino's 80.5%, 77.5%, 77.7%, and 31.1/min. Snapping
labels to the existing estimated grid materially hurts boundary alignment; a
product path would require corrected timing or a separate timing decision.

## Reproduction

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split development --timing both --analyzer chordino \
  --chordino-policy musical-window \
  --sonic-annotator /path/to/sonic-annotator \
  --output benchmark-results/chord-reliability/cr2f/candidate-a
npm run prepare:cr2f-review
```

Detailed JSON and the local audio/label artifacts remain ignored under
`benchmark-results/`. Neither command starts the application server or writes
application jobs.
