# CR0 Chord-Reliability Validation Contract

Date: 2026-07-24

Amended: 2026-07-25

Status: Amended after the product-owner `CHANGES` verdict on
[#3](https://github.com/perchristian/piano-practice-poc/issues/3). RWC-P is now
the primary benchmark and runs first; the two untouched target recordings and
any Logic-generated fixtures no longer block it. CR0 closes once the RWC primary
gate thresholds are approved.

## Amendment of 2026-07-25

The product owner reviewed this contract in
[#3](https://github.com/perchristian/piano-practice-poc/issues/3) and responded
`CHANGES`:

> Use RWC-P as the primary benchmark first, including its aligned MIDI, beat,
> chord, structure, melody, and vocal annotations. Do not require
> Logic-generated fixtures or two untouched target recordings before running the
> RWC development and holdout evaluation. Once RWC results are satisfactory,
> manually test a small number of representative iOS screen recordings as a
> final domain check.

What this changes:

- RWC-P is the primary accuracy benchmark and is evaluated first. Its aligned
  MIDI, beat, chord, structure, melody, and vocal annotations are all available
  as evidence sources and diagnostics.
- The two untouched target holdout slots below are **no longer prerequisites**
  for the RWC development and holdout evaluation. They remain defined for a
  possible future scored holdout.
- Logic-generated fixture authoring is optional and is not on the critical path.
- The blind two-musician reference process is no longer required before CR1. It
  applies only if a scored target holdout is reinstated later.
- After RWC results are satisfactory, a small number of representative iOS
  screen recordings are checked manually as the final domain check.

What this deliberately does not change:

- the locked RWC-P 8/4 split, its manifest checksum, and the exclusion of all
  consumed Phase 2J tracks;
- the pinned annotation commit;
- `--allow-holdout` gating, now more important because the RWC holdout became
  the primary gate;
- the metrics, artifact paths, and target candidate checksums;
- separate reference/corrected and end-to-end reporting.

The amendment is recorded in `docs/planning/DECISIONS.md` Decision 33 and in the `amendments`
block of `benchmarks/chord-reliability-contract-v1.json`.

One product-owner input remains open: making the RWC holdout the primary gate
left the terminal decision without an absolute accuracy bar, because the
thresholds locked on 2026-07-24 describe the target-domain holdout only. A
proposal is recorded under `thresholds.rwcPrimaryGate` with
`status: proposed-awaiting-approval`. It must be approved or replaced before the
RWC holdout is opened, and it may not change after holdout results are seen.

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
two identities. Since the 2026-07-25 amendment these are **not** prerequisites
for the RWC evaluation; they are held in reserve in case a scored target holdout
is reinstated after the RWC gate:

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

The exact numeric source of truth is the contract JSON.

Since the 2026-07-25 amendment the primary gate is the RWC holdout. Its
thresholds are **proposed, not locked**, and are recorded under
`thresholds.rwcPrimaryGate`:

- RWC holdout with reference/corrected timing: Root at least 75%, MajMin 65%,
  Triads 60%, MIREX 65%, boundary F1 60%;
- RWC holdout end-to-end: Root at least 65%, MajMin 55%, boundary F1 50%;
- chord changes per minute at most 1.5x the reference rate after merging
  adjacent equal labels, because over-segmentation was the original product
  complaint.

These require product-owner approval before the RWC holdout is opened, and may
not change afterwards.

The thresholds locked on 2026-07-24 describe the target-domain holdout. They are
retained for a possible future scored target holdout and no longer gate CR6 on
their own:

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

RWC-P is the primary accuracy corpus since the 2026-07-25 amendment. It is still
not a substitute for target-domain evidence: it is cleaner than compressed iOS
capture, so the final manual domain check remains required before declaring
chords good enough for piano-player testing.

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

CR1 adds diagnostic artifact fields and works against RWC-P. The target-reference
adapter is only needed if a scored target holdout is reinstated; if it is added,
it must consume this reference shape and threshold contract without changing
them.

## CR0 completion rule

Agent preparation is complete when the manifests, validator, dry run, docs, and
approval packet are committed. Since the 2026-07-25 amendment, Milestone 0
passes when:

- the product owner approves or replaces the proposed `thresholds.rwcPrimaryGate`
  values;
- the scope of the final manual domain check is agreed, at least as a count of
  recordings and the scenarios it must cover.

The following are no longer part of the completion rule. They apply again only
if a scored target holdout is reinstated:

- supplying two untouched target holdout files;
- independent blind approval of target references and
  `--require-target-references`;
- authoring a Logic-generated fixture pack.
