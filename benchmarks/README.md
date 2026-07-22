# Chord benchmark

The Phase 2J benchmark runs the current application analyzer directly against a
locked RWC Popular Music Database v2 pilot. Its low/medium/high strata combine
change density, unique labels, label entropy, vocabulary coverage, tempo,
duration, and available instrumentation metadata. It does not create songs or
jobs in the application library.

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
npm run benchmark:chords -- --timing both --split all
```

Detailed JSON is written under ignored `benchmark-results/`. Reports contain
Root, MajMin, Triads, and MIREX duration-weighted scores, boundary
precision/recall/F1, cue density, OOV duration, and runtime. Do not tune against
the four holdout tracks.

The chord timelines usually extend roughly two seconds beyond the released v2
WAV. The adapter uses the official metadata duration, verifies it against the
decoded WAV, and lets `mir_eval` clip the trailing annotation interval at the
audio boundary.
