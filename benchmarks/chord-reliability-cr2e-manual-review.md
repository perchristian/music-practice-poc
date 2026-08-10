# CR2E Reframed Manual Review

Date prepared: 2026-08-10

## Authorization and boundary

The product owner replied `REFRAME` in issue #10 after the frozen RWC gate
failed. CR2E remains recorded as a failure, the consumed holdout must not be
reused, and this review does not authorize product integration.

Question:

> Does Chordino provide a useful editable starting chart on representative iOS
> screen recordings without requiring the musician to check every beat?

This is a qualitative product-risk check, not a new scored holdout.

## Fixed recordings

The three recordings were selected from the checksum inventory before this
review. They stay local and ignored by Git.

| Scenario | Source | Derived WAV | Chord labels |
| --- | --- | --- | --- |
| Full band with bass; representative correction burden | `test-media/TeAmo.mov` | `full-band-three-minute.wav` | `full-band-three-minute_vamp_nnls-chroma_chordino_simplechord.lab` |
| Piano/guitar plus vocal; no dedicated bass | `test-media/Changes part 1.mov` | `no-dedicated-bass.wav` | `no-dedicated-bass_vamp_nnls-chroma_chordino_simplechord.lab` |
| Melody/ornament-heavy repeated section with legitimate variation | `test-media/ShapeOfMyHeart.mov` | `ornament-heavy-repeat.wav` | `ornament-heavy-repeat_vamp_nnls-chroma_chordino_simplechord.lab` |

Derived files are under
`benchmark-results/chord-reliability/cr2e/manual/`. Current local copies are
already prepared. To reproduce them, extract 44.1 kHz stereo PCM WAV with
FFmpeg, then run the pinned transform:

```sh
mkdir -p benchmark-results/chord-reliability/cr2e/manual
ffmpeg -hide_banner -loglevel error -y -i 'test-media/TeAmo.mov' -vn -ac 2 -ar 44100 -c:a pcm_s16le \
  benchmark-results/chord-reliability/cr2e/manual/full-band-three-minute.wav
ffmpeg -hide_banner -loglevel error -y -i 'test-media/Changes part 1.mov' -vn -ac 2 -ar 44100 -c:a pcm_s16le \
  benchmark-results/chord-reliability/cr2e/manual/no-dedicated-bass.wav
ffmpeg -hide_banner -loglevel error -y -i 'test-media/ShapeOfMyHeart.mov' -vn -ac 2 -ar 44100 -c:a pcm_s16le \
  benchmark-results/chord-reliability/cr2e/manual/ornament-heavy-repeat.wav
/path/to/sonic-annotator -q \
  -t benchmarks/chordino-transform.n3 \
  -w lab --lab-fill-ends --lab-force \
  --lab-basedir benchmark-results/chord-reliability/cr2e/manual \
  benchmark-results/chord-reliability/cr2e/manual/full-band-three-minute.wav \
  benchmark-results/chord-reliability/cr2e/manual/no-dedicated-bass.wav \
  benchmark-results/chord-reliability/cr2e/manual/ornament-heavy-repeat.wav
```

## Review steps

1. Confirm that all three source recordings may be used locally for this
   non-commercial evaluation.
2. Open `benchmarks/chordino-manual-review.html` in a browser.
3. For each scenario, choose its derived WAV and matching `.lab` file. Listen
   through the full recording while the page displays and highlights the active
   Chordino label. Click any timestamp to replay it.
4. For `TeAmo`, time how long it takes to identify and write down every label or
   boundary correction needed for a useful starting chart. Give the unedited
   Chordino chart a usefulness rating from 1 to 5 and record whether you had to
   check every beat.
5. For `Changes part 1` and `ShapeOfMyHeart`, record whether each is a useful
   starting chart. Note repeated confidently wrong roots, misleading quality,
   or boundary churn that would force a complete rewrite.

Do not compare another analyzer, modify the pinned transform, or use the
consumed RWC holdout during this review.

## Frozen verdict rule

`PASS` requires all of the following:

- rights confirmed for all three local recordings;
- `TeAmo` correction audit at or below 300 seconds;
- unedited `TeAmo` usefulness at least 4/5;
- the reviewer did not need to check every beat;
- both shorter scenario charts are useful starting points rather than complete
  rewrites;
- no scenario contains repeated confidently wrong roots that would materially
  mislead practice.

Anything else is `FAIL`. A pass only makes a separate product-integration
decision ready; it does not authorize integration by itself.

## Requested response

Reply on issue #10 with exactly one of:

- `PASS — rights confirmed; TeAmo correction audit: <seconds>; usefulness: <1-5>/5; checked every beat: <yes/no>; Changes: <pass/fail>; Shape: <pass/fail>; notes: <short notes>.`
- `FAIL — rights confirmed: <yes/no>; scenario: <name>; reason: <what made the chart misleading or too costly to correct>.`

Pass meaning: prepare a separate product-owner decision packet covering the
optional adapter, packaging/licensing, subprocess memory, and failure behavior.

Fail meaning: stop Chordino integration work and reframe automatic harmony as an
explicitly unreliable aid or remove it from the user-test critical path.
