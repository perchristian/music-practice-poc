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
`research/chord-reliability-cr0-contract.md`.

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
