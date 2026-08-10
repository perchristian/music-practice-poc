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

## Decision 42 amendment — required musical report

Do not return the prior one-line response by itself. First complete the report
defined in `docs/research/musical-chord-review-method.md`:

1. review question and evidence;
2. musical map for each relevant passage;
3. what works and why;
4. what needs improvement, with timestamps and bar/beat positions;
5. competing causal theories, evidence for and against, confidence, and the
   smallest discriminating test;
6. what the metrics support and hide;
7. recommended experiments from simple to complex;
8. judgment and learning.

After the report, end with one workflow code so issue ownership remains clear:

- `PASS — Shape: <1-5>/5; TeAmo: <1-5>/5; Changes: <1-5>/5; repeated wrong roots: no; rewrite churn: no; systematic late timing: no; notes: <short notes>.`
- `PERSISTENT_ROOTS — Shape: <1-5>/5; repeated wrong roots: yes; examples: <timestamps/labels>; other notes: <short notes>.`
- `FAIL_OTHER — scenario: <name>; reason: <non-root failure>; notes: <short notes>.`

`PASS` makes fresh validation and adapter feasibility ready without authorizing
integration. `PERSISTENT_ROOTS` authorizes Candidate B only when the report also
supports the proposed root-evidence mechanism and identifies a discriminating
simple test. `FAIL_OTHER` ends CR2F without Candidate B.
