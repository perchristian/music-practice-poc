# Chord benchmark

The Phase 2J benchmark runs the current application analyzer directly against a
locked RWC Popular Music Database v2 pilot. Its low/medium/high strata combine
change density, unique labels, label entropy, vocabulary coverage, tempo,
duration, and available instrumentation metadata. It does not create songs or
jobs in the application library.

## CR0 chord-reliability contract

The current gate is locked by:

- `chord-reliability-contract-v1.json`: component checksums, metrics, exact
  thresholds, artifact roots, and holdout policy;
- `chord-reliability-rwc-v1.json`: a new 8-development/4-holdout RWC-P split
  that excludes every consumed Phase 2J pilot track;
- `chord-reliability-target-v1.json`: checksum inventory, proposed development
  scenarios, and two required untouched target-domain holdout slots.

Run the complete checksum/availability/reference/dry-run isolation check:

```sh
npm run verify:chord-contract
```

This extracts selected RWC WAVs only into
`.benchmark-data/chord-reliability-rwc-audio`, never into `data/jobs`. It checks
both development and holdout availability without producing analyzer results.
Detailed target references belong under
`.benchmark-data/chord-reliability-target/references` and must pass:

```sh
node scripts/validate-chord-reliability-contract.js \
  --require-target-references
```

Do not use `--allow-holdout` until a precommitted milestone gate. The full CR0
contract and review process are documented in
`docs/research/chord-reliability-cr0-contract.md`.

## CR1 evidence diagnostics

Generate the six dependency-free failure/control fixtures and run their focused
known-answer checks:

```sh
npm run generate:test-media
node --test tests/harmony-analysis.test.js tests/chord-benchmark.test.js
```

The fixtures cover strong vocal melody, no dedicated bass, piano/guitar low-note
fallback evidence, brief ornaments, repeated accompaniment with different
melodies, and a legitimate repeated-section variation. Generated WAV files stay
under ignored `test-media/cr1/`; the versioned generator and assertions are the
reproducible source of truth.

CR1 benchmark JSON opts into analyzer diagnostics and records, for every beat:

- per-source harmonic and bass chroma, weights, RMS, and inclusion state;
- low-note candidates and a measured bass-reliability score;
- four-subframe persistence and chordality features;
- all 96 raw chord-candidate scores with their score components;
- winner changes caused by separated stems, bass evidence, weak-extension
  simplification, or isolated-beat smoothing.

Normal real-mode jobs do not request or persist this data. Detailed artifacts
remain under ignored `benchmark-results/`. The new low-note reliability,
persistence, and chordality measurements are explicitly diagnostic-only in CR1;
they do not alter weights, candidate scores, or labels.

## CR2 variants and Chordino control

CR2 keeps three local evidence policies selectable with `--evidence-policy`:

- `legacy` — unchanged product/default behavior;
- `accompaniment-role` — accompaniment stems are primary and full mix is
  chord-quality fallback only;
- `accompaniment-chordal` — the same role gate plus a four-subframe polyphony
  check.

The two accompaniment variants failed the locked development rule and are not
product defaults. The benchmark also accepts `--analyzer chordino`, using the
pinned `chordino-transform.n3` and the same evaluator. Install the optional
[Sonic Annotator 1.7](https://github.com/sonic-visualiser/sonic-annotator/releases/tag/sonic-annotator-1.7)
and [Vamp Plugin Pack 2.0](https://github.com/vamp-plugins/vamp-plugin-pack/releases/tag/v2.0),
selecting Chordino and NNLS Chroma from the plugin installer. Then run:

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split development --timing both --analyzer chordino \
  --sonic-annotator /path/to/sonic-annotator \
  --output benchmark-results/chord-reliability/cr2/chordino
```

Sonic Annotator and Chordino remain optional benchmark tools. They are not
installed by `npm install`, required by mock mode, or integrated into the real
pipeline. See `chord-reliability-cr2-checkpoint.md` for results and the guarded
next step.

## CR2E terminal holdout result

Issue #8 approved the proposed thresholds unchanged before CR2E opened the
holdout. The unchanged Demucs-assisted local analyzer and Chordino each ran once
with oracle and end-to-end timing. Chordino passed every gate except oracle root
accuracy: 73.1% against the frozen 75.0% minimum. The holdout is now consumed;
do not rerun it for tuning or another candidate decision.

The result is `STOP/REFRAME`. The manual screen-recording gate and product
integration remain blocked. Aggregate, per-track, density, runtime, and command
details are in `chord-reliability-cr2e-checkpoint.md`.

The product owner subsequently selected `REFRAME` in issue #10. A new bounded
qualitative review asks whether Chordino is a useful editable starting chart
without treating CR2E as passed or authorizing integration. Use
`chordino-manual-review.html` with the ignored local artifacts and follow the
frozen steps and response format in
`chord-reliability-cr2e-manual-review.md`.

## CR2F musical-window candidate

Candidate A is selected explicitly with `--chordino-policy musical-window`. It
uses duration evidence inside authoritative beat windows, preserves raw
Chordino intervals, and records the derived identity
`chordino-v5-musical-window-v1`. It is a benchmark policy, not an application
analyzer. The CLI rejects this policy for holdout tracks even when
`--allow-holdout` is supplied.

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

The candidate passed its frozen development gate. Review details and the exact
human response are in `chord-reliability-cr2f-checkpoint.md` and
`chord-reliability-cr2f-manual-review.md`. Do not run Candidate B unless that
review returns `PERSISTENT_ROOTS`.

## MR0 progressive musical review

MR0 starts with two frozen excerpts from the generated
`phase-2h-three-four-90.wav` Level-1 fixture. The contract keeps neutral signal
evidence, analyzer labels, and the generated reference in separate disclosure
arms:

```sh
npm run prepare:mr0-review
```

The command regenerates the fixture, verifies its checksum and the review
contract inputs, runs the local analyzer twice, and fails unless both runs are
stable and the final five-chord chart matches the frozen known answer. It writes
the staged local packet under ignored
`benchmark-results/musical-review/mr0/level1/`; the durable contract and first
case report are `musical-review-mr0-level1.json` and
`musical-review-mr0-level1-report.md`.

Arm A remains unrun until a separately configured audio-input reviewer is
available. Do not give the current text/image reviewer the candidate or
reference files before it has completed Arm B.

## One-time setup

1. Check out the annotations at the commit in the manifest:

   ```sh
   git clone https://github.com/rwc-music/rwc-annotations.git .benchmark-data/rwc-annotations
   git -C .benchmark-data/rwc-annotations checkout 0a1a6c31dbe73a7f5d44f7caef8cd0999402a4c2
   ```

2. Download the 4.1 GB `RWC-P.zip` archive from the Zenodo record in the
   manifest:

   ```sh
   curl -L --fail --continue-at - --output .benchmark-data/RWC-P.zip \
     'https://zenodo.org/records/18656623/files/RWC-P.zip?download=1'
   ```
3. Extract only the 12 selected tracks:

   ```sh
   npm run prepare:benchmark-audio -- --prune
   ```

4. Install the optional evaluator separately from the app:

   ```sh
   python3 -m venv .venv-eval
   .venv-eval/bin/python -m pip install -r requirements-eval.txt
   ```

The archive, extracted audio, evaluation environment, and detailed results are
ignored by Git. RWC-P v2 is CC BY-NC 4.0 and must not be bundled as product or
demo media.

## Runs

Validate the local inputs without analyzing them:

```sh
npm run benchmark:chords -- --dry-run --timing oracle
```

Run the eight development tracks with reference timing first:

```sh
npm run benchmark:chords -- --timing oracle
```

To run the same development benchmark with previously generated Demucs
`htdemucs_6s` outputs, point `--stems` at a root containing either
`htdemucs_6s/RWC_Pxxx/*.wav` or `RWC_Pxxx/*.wav`:

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --stems .benchmark-data/chord-reliability-rwc-demucs \
  --split development \
  --timing both \
  --output benchmark-results/chord-reliability/cr1/demucs-assisted
```

The application default uses conservative isolated-beat smoothing. Reproduce
the pre-smoothing control explicitly with:

```sh
npm run benchmark:chords -- --timing both --smoothing none
```

Development is the default split. Use `--track` with the corresponding
`--split` for a single diagnostic track. A complete checkpoint may run both
timing modes over all 12 tracks:

```sh
npm run benchmark:chords -- --timing both --split all --allow-holdout
```

Detailed JSON is written under ignored `benchmark-results/`. Reports contain
Root, MajMin, Triads, and MIREX duration-weighted scores, boundary
precision/recall/F1, cue density, OOV duration, and runtime. Do not tune against
the four holdout tracks. For CR0 and later, `--allow-holdout` is permitted only
at a precommitted gate; use `--dry-run` for ordinary availability checks.

The chord timelines usually extend roughly two seconds beyond the released v2
WAV. The adapter uses the official metadata duration, verifies it against the
decoded WAV, and lets `mir_eval` clip the trailing annotation interval at the
audio boundary.
