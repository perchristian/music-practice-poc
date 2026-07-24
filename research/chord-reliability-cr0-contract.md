# CR0 Chord-Reliability Validation Contract

Date: 2026-07-24

Status: Codex preparation complete; product-owner approval and two untouched
target recordings are required before CR0 can close.

## Purpose

This contract freezes the data identities, scenario coverage, reference process,
metrics, thresholds, artifact locations, and commands used by CR1-CR6. It does
not change analyzer behavior.

The machine-readable source of truth is
`benchmarks/chord-reliability-contract-v1.json`. Its component checksums lock:

- `benchmarks/chord-reliability-rwc-v1.json`;
- `benchmarks/chord-reliability-target-v1.json`.

Any component change after the first baseline is inspected requires a new
contract version and an explicit reason. Thresholds cannot change within v1.

## Locked RWC-P split

The split uses the existing deterministic complexity stratification after
excluding all 12 tracks in the consumed Phase 2J pilot. The official RWC-P v2
audio checksum and annotation commit remain unchanged.

| Split | Complexity | Tracks |
| --- | --- | --- |
| Development | Low | `RWC_P006`, `RWC_P096`, `RWC_P029` |
| Development | Medium | `RWC_P060`, `RWC_P051` |
| Development | High | `RWC_P004`, `RWC_P027`, `RWC_P083` |
| Holdout | Low | `RWC_P024` |
| Holdout | Medium | `RWC_P036`, `RWC_P002` |
| Holdout | High | `RWC_P075` |

The benchmark CLI permits holdout availability checks in `--dry-run` mode but
requires `--allow-holdout` before producing analyzer results. Use that flag only
at a precommitted milestone gate.

## Target-domain inventory and scenario map

All current files are local iOS screen recordings with HEVC video and 44.1 kHz
stereo AAC audio. Exact SHA-256, duration, size, and prior-use records are locked
in `benchmarks/chord-reliability-target-v1.json`.

| Candidate | Proposed development scenarios | Why it is not holdout |
| --- | --- | --- |
| `Changes part 1.mov` | no dedicated bass; piano/guitar and vocal; melody prominent | timing/chart development |
| `Changes part 2.mov` | alternate short no-bass/melody excerpt | too short; prior status needs confirmation |
| `MakeYouFeelMyLovePart2.mov` | full band with bass; compressed capture | separation and play-along review |
| `ShapeOfMyHeart.mov` | bass; melody/ornaments; repeated variation | timing and chord-quality review |
| `TeAmo.mov` | bass; melody; repeats/variation; three-minute correction test | timing and corrected-harmony review |

The proposed development set is Changes part 1, Make You Feel My Love part 2,
Shape of My Heart, and Te Amo. The product owner must confirm local evaluation
rights and the scenario claims before these become references.

No current file is eligible for untouched target holdout. CR0 therefore reserves
two identities that must be filled before target baselines are inspected:

1. a full-length (at least two minutes) full-band screen recording with audible
   bass, repeated sections, and one legitimate repeat variation;
2. a full-length (at least two minutes) piano/guitar-and-vocal screen recording
   without dedicated bass, with prominent melody and ornaments.

Both must be legally usable for local non-commercial evaluation, must not have
been processed or reviewed with this analyzer, and must remain outside Git and
`data/jobs`.

## Independent reference process

References live under
`.benchmark-data/chord-reliability-target/references/<recording-id>.reference.json`.
They are detailed local artifacts and are never committed.

The process is deliberately blind to analyzer output:

1. Record the exact source SHA-256 and reviewer identities.
2. Reviewer A listens to the source without opening the app's analyzer chart and
   marks bar/downbeat times. Timing is reviewed first so chord errors are not
   hidden by window errors.
3. Reviewer A writes contiguous Harte chord intervals against the locked timing.
   Use `N` for no chord and the simplest defensible label when extensions are
   ambiguous.
4. Reviewer A labels sections by bar range, assigns repeat groups, and explicitly
   marks legitimate variations. Repeated labels are not copied automatically.
5. Reviewer B, a different musician who has not seen analyzer output, checks
   every chord boundary, all disagreements, repeat groups, and variation flags
   against the audio. Reviewer B records approval or returns corrections.
6. The validator checks source identity, ordered/non-overlapping chord intervals,
   strictly increasing timed bars, valid section ranges, repeat/variation fields,
   and distinct reviewer identities.
7. Only after validation may an analyzer result be generated. Reference-timed
   and end-to-end results remain separate artifacts.

A target reference has this minimum shape:

```json
{
  "version": 1,
  "recordingId": "example",
  "audioSha256": "...",
  "timing": {
    "bars": [
      { "bar": 1, "timeSeconds": 0.42 },
      { "bar": 2, "timeSeconds": 2.31 }
    ]
  },
  "chords": [
    { "start": 0.42, "end": 2.31, "label": "C:maj" }
  ],
  "sections": [
    {
      "id": "verse-1",
      "label": "Verse",
      "startBar": 1,
      "endBar": 8,
      "repeatGroup": "verse",
      "legitimateVariation": false
    }
  ],
  "review": {
    "timing": { "reviewer": "reviewer-a" },
    "chords": { "reviewer": "reviewer-a" },
    "sections": { "reviewer": "reviewer-a" },
    "verification": { "reviewer": "reviewer-b", "status": "approved" }
  }
}
```

## Reports and artifact paths

Every experiment produces two independent reports:

- reference/corrected timing under
  `benchmark-results/chord-reliability/<stage>/reference-timing/`;
- analyzer end-to-end timing under
  `benchmark-results/chord-reliability/<stage>/end-to-end-timing/`.

Detailed JSON, per-track results, diagnostic evidence, derived audio, and
reference files remain ignored. Only aggregate checkpoint Markdown and
conclusions are committed.

Each report records Root, MajMin, Triads, and MIREX WCSR; 250 ms boundary
precision/recall/F1 plus false-extra and missing counts; chord changes/minute;
suppressed candidates; largest per-track regressions; scenario groups; repeat
disagreement; false forced equality; runtime; peak resident-memory estimate; and
musician correction burden.

## Locked thresholds

The exact numeric source of truth is the contract JSON. In summary:

- target holdout with reference/corrected timing: Root at least 80%, MajMin 70%,
  Triads 65%, MIREX 70%, and boundary F1 65%;
- no target scenario group below 55% MajMin;
- target holdout end-to-end: Root at least 70%, MajMin 60%, boundary F1 55%;
- repeat disagreement at most 10% after annotated variations; zero false forced
  equality;
- missing boundaries fail only when both two extra misses and a 10% increase
  over baseline are exceeded;
- a retained experiment improves MajMin on at least five of eight RWC
  development tracks and three of four target development recordings, plus
  either two points aggregate target MajMin or 10% less correction time;
- untouched holdout regression tolerance is two points for each WCSR metric and
  three points for boundary F1;
- a representative recording of at least three minutes must be correctable in
  at most five minutes, score at least 4/5 as a useful first draft, and not
  require checking every beat;
- harmony analysis alone must stay at or below 0.5 real-time factor and 1.5 GiB
  peak resident memory on the target M3 Mac.

RWC-P remains a regression corpus, not a substitute for the target-domain gate.

## Reproducible commands

Validate checksums, official references, target media, selected archive members,
the 8/4 split, and dry-run isolation:

```sh
npm run verify:chord-contract
```

The command prepares only ignored benchmark audio, validates both timing modes
for all selected tracks without running the analyzer, and proves that existing
`data/jobs` identities and `job.json` content did not change.

After approval, produce the locked development baseline:

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split development \
  --timing both \
  --output benchmark-results/chord-reliability/development
```

At a precommitted gate only, inspect the untouched RWC holdout:

```sh
npm run benchmark:chords -- \
  --manifest benchmarks/chord-reliability-rwc-v1.json \
  --audio .benchmark-data/chord-reliability-rwc-audio \
  --split holdout \
  --timing both \
  --allow-holdout \
  --output benchmark-results/chord-reliability/holdout
```

CR1 adds the target-reference adapter and diagnostic artifact fields before
either target split is analyzed. That adapter must consume this reference shape
and threshold contract without changing them.

## CR0 completion rule

Codex preparation is complete when the manifests, validator, dry run, docs, and
approval packet are committed. Milestone 0 itself passes only after:

- the product owner approves the recordings, scenario claims, reference process,
  and thresholds;
- two untouched holdout files are supplied and added in a checksum-only manifest
  revision before any v1 target result is inspected;
- all selected development and holdout references receive independent approval
  and pass `--require-target-references`.
