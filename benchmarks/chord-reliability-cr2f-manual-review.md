# CR2F Candidate A Manual Review

Date prepared: 2026-08-10

## Boundary

Candidate A passed its development gate; CR2E remains failed and its holdout
remains consumed. This comparison uses the same three already consumed local
recordings. It can choose between Candidate B, `STOP`, and a future fresh-
validation decision, but it cannot validate or authorize product integration.

## Review steps

1. Open `benchmarks/chordino-manual-review.html` in a browser.
2. For each row below, load the WAV, raw label file, and Candidate A label file
   from `benchmark-results/chord-reliability/cr2e/manual/`.
3. Listen through `ShapeOfMyHeart` first. Compare both labels at the same
   playhead and note timestamps for repeated confidently wrong roots,
   rewrite-level churn, or systematic late-resolution timing.
4. Confirm that the candidate versions of `TeAmo` and `Changes part 1` remain
   at least 4/5 and did not acquire the same failure patterns.

| Scenario | WAV prefix | Raw suffix | Candidate suffix |
| --- | --- | --- | --- |
| `TeAmo` | `full-band-three-minute` | `_vamp_nnls-chroma_chordino_simplechord.lab` | `_chordino-musical-window-v1.lab` |
| `Changes part 1` | `no-dedicated-bass` | `_vamp_nnls-chroma_chordino_simplechord.lab` | `_chordino-musical-window-v1.lab` |
| `ShapeOfMyHeart` | `ornament-heavy-repeat` | `_vamp_nnls-chroma_chordino_simplechord.lab` | `_chordino-musical-window-v1.lab` |

## Frozen response

Reply on issue #12 with exactly one of:

- `PASS — Shape: <1-5>/5; TeAmo: <1-5>/5; Changes: <1-5>/5; repeated wrong roots: no; rewrite churn: no; systematic late timing: no; notes: <short notes>.`
- `PERSISTENT_ROOTS — Shape: <1-5>/5; repeated wrong roots: yes; examples: <timestamps/labels>; other notes: <short notes>.`
- `FAIL_OTHER — scenario: <name>; reason: <non-root failure>; notes: <short notes>.`

`PASS` makes fresh validation and adapter feasibility ready without authorizing
integration. `PERSISTENT_ROOTS` authorizes the already bounded NNLS bass/treble
Candidate B. `FAIL_OTHER` ends CR2F without Candidate B.
