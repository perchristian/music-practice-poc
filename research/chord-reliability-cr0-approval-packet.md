# CR0 Approval Packet

Prepared: 2026-07-24

Status: **Resolved on 2026-07-24.** This packet is historical. It is kept as the
exact material that was reviewed; do not act on its request for a response.

## Outcome

The product owner answered `CHANGES` in
[#3](https://github.com/perchristian/piano-practice-poc/issues/3):

> Use RWC-P as the primary benchmark first, including its aligned MIDI, beat,
> chord, structure, melody, and vocal annotations. Do not require
> Logic-generated fixtures or two untouched target recordings before running the
> RWC development and holdout evaluation. Once RWC results are satisfactory,
> manually test a small number of representative iOS screen recordings as a
> final domain check.

Consequences are recorded in `DECISIONS.md` Decision 33, the
`## Amendment of 2026-07-25` section of
`research/chord-reliability-cr0-contract.md`, and the `amendments` block of
`benchmarks/chord-reliability-contract-v1.json`.

The parts of this packet that no longer apply: the two untouched holdout slots,
the blind two-musician reference requirement, and the target-domain thresholds
as the terminal gate. The RWC split, checksums, exclusions, and `--allow-holdout`
rule are unchanged.

One follow-up input is still open: the RWC primary gate now needs an absolute
accuracy bar, proposed under `thresholds.rwcPrimaryGate`.

---

The original packet as reviewed follows.

Review only this packet and the machine-readable thresholds. The working research
history is not required.

## What is locked

- New RWC-P split: 8 development / 4 holdout, stratified low/medium/high.
- All 12 consumed Phase 2J tracks are excluded.
- Holdout analyzer output requires an explicit `--allow-holdout` gate flag.
- Five local screen recordings are checksum-inventoried; four are proposed for
  development references only.
- Two untouched, full-length target holdout slots are required because every
  current recording has already influenced development.
- References are transcribed blind to analyzer output and verified by a second
  musician before scoring.
- Reference/corrected timing and end-to-end timing remain separate reports.
- Exact metrics, thresholds, paths, and regression tolerances are locked in
  `benchmarks/chord-reliability-contract-v1.json`.

## Proposed target coverage

| Scenario | Development evidence | Untouched holdout requirement |
| --- | --- | --- |
| Full band with bass | Make You Feel My Love, Shape of My Heart, Te Amo | one new two-minute recording |
| No dedicated bass | Changes part 1 | one new two-minute recording |
| Melody/ornaments | Changes part 1, Shape of My Heart, Te Amo | required in no-bass holdout |
| Repeats with real variation | Shape of My Heart, Te Amo | required in full-band holdout |
| Three-minute correction burden | Te Amo | final holdout may provide another |

Product-owner confirmation is required for both the scenario claims and local
non-commercial evaluation rights.

## Proposed good-enough decision

Reference/corrected target holdout must reach Root 80%, MajMin 70%, Triads 65%,
MIREX 70%, and boundary F1 65%, with no scenario below 55% MajMin. End-to-end
must reach Root 70%, MajMin 60%, and boundary F1 55%. Repeat disagreement must be
at most 10% with zero forced equality across legitimate variations.

A three-minute chart must be correctable in five minutes or less, rate at least
4/5 as a useful first draft, and not require checking every beat. Harmony
analysis must remain at most 0.5x real time and 1.5 GiB peak resident memory on
the M3 Mac.

Retained changes must improve a majority of both development sets and deliver
either at least two MajMin points or 10% lower correction time. Untouched
holdout tolerance is two WCSR points and three boundary-F1 points.

## Exact review

1. Open `benchmarks/chord-reliability-contract-v1.json`.
2. Confirm the proposed scenario mapping above matches what is audible.
3. Confirm each proposed development recording may be used locally for this
   non-commercial evaluation.
4. Confirm the two untouched holdout descriptions are practical to supply
   without first processing them in the app.
5. Confirm a second musician can verify timing, chords, sections, repeats, and
   variations without seeing analyzer output.
6. Accept or challenge the numeric good-enough thresholds.

Respond with exactly one of (answered `CHANGES` on 2026-07-24; see Outcome above):

- `PASS` — approve the mappings, rights, two holdout slots, independent review,
  and thresholds. This unblocks adding the two checksum-only holdout identities
  and creating blind references; it does not authorize viewing holdout analyzer
  results.
- `CHANGES: ...` — list concrete recording, scenario, process, or threshold
  edits. CR0 remains open and no baseline runs.
- `DISCUSS: ...` — identify the decision that needs discussion. CR0 remains open
  and no baseline runs.

## Verification evidence

`npm run verify:chord-contract` is the single dry-run command. It verifies
component and media checksums, the official annotation commit, selected archive
members, RWC chord/timing references, target media properties, scenario
coverage, and the locked split. It also proves the dry run did not create or
modify application jobs.
