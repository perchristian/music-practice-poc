import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  appChordNameToHarte,
  buildOracleTimingGrid,
  contractRootScore,
  readRwcTrack,
  validateAudioFilename,
  validateIntervals
} from "../scripts/chord-benchmark-lib.js";
import { assertHoldoutAccess, lockedHoldoutIndexes } from "../scripts/benchmark-chords.js";
import { selectArchiveMembers } from "../scripts/extract-rwc-pilot.js";

describe("RWC chord benchmark contract", () => {
  it("maps application labels to Harte labels", () => {
    assert.equal(appChordNameToHarte("C"), "C:maj");
    assert.equal(appChordNameToHarte("Bbm7"), "Bb:min7");
    assert.equal(appChordNameToHarte("F#maj7"), "F#:maj7");
    assert.equal(appChordNameToHarte("G7"), "G:7");
    assert.equal(appChordNameToHarte("N"), "N");
  });

  it("scores reference against itself at 100 percent", () => {
    const reference = [
      { start: 0, end: 1, label: "C:maj" },
      { start: 1, end: 2, label: "G:maj" }
    ];
    assert.equal(contractRootScore(reference, reference, 2), 1);
  });

  it("detects a one-semitone root shift", () => {
    const reference = [{ start: 0, end: 2, label: "C:maj" }];
    const shifted = [{ start: 0, end: 2, label: "Db:maj" }];
    assert.equal(contractRootScore(reference, shifted, 2), 0);
  });

  it("does not change duration-weighted score when identical labels split or merge", () => {
    const reference = [{ start: 0, end: 2, label: "C:maj" }];
    const split = [
      { start: 0, end: 0.5, label: "C:maj" },
      { start: 0.5, end: 2, label: "C:maj" }
    ];
    assert.equal(contractRootScore(reference, split, 2), 1);
  });

  it("reads official annotation shapes and creates downbeat anchors", async () => {
    const root = await mkdtemp(join(tmpdir(), "rwc-adapter-"));
    try {
      await mkdir(join(root, "01_annotations_preprocessed", "chords", "RWC-P"), { recursive: true });
      await mkdir(join(root, "01_annotations_preprocessed", "beats", "RWC-P"), { recursive: true });
      await writeFile(join(root, "metadata.csv"), [
        "RWCID;CollID;PieceNo;CDNo;TrackNo;Title;Artist;SingerInformation;SingingLanguage;Tempo;Variation;LiveInstruments;DrumInformation;Composer;CompositionType;GenreMain;GenreSub;audio_start;audio_end;duration",
        "RWC_P001;P;1;1;1;Fixture;Artist;Male;Japanese;120;;Gt;Drum;;;Popular;Fixture;0;2;2"
      ].join("\n"));
      await writeFile(
        join(root, "01_annotations_preprocessed", "chords", "RWC-P", "RWC_P001.csv"),
        "t_start;t_end;chord\n0;1;C:maj\n1;2;G:maj\n"
      );
      await writeFile(
        join(root, "01_annotations_preprocessed", "beats", "RWC-P", "RWC_P001.csv"),
        "t;beat\n0;1\n0.5;2\n1;1\n1.5;2\n"
      );
      const track = await readRwcTrack(root, "RWC_P001.wav");
      assert.equal(track.title, "Fixture");
      assert.deepEqual(track.chords[1], { start: 1, end: 2, label: "G:maj" });
      assert.deepEqual(buildOracleTimingGrid(track).tempoMap.anchors, [
        { bar: 1, timeSeconds: 0 },
        { bar: 2, timeSeconds: 1 }
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects mismatched filenames and impossible declared durations", () => {
    assert.throws(() => validateAudioFilename("/tmp/RWC_P002.wav", "RWC_P001"), /does not match/);
    assert.throws(() => validateIntervals(
      [{ start: 0, end: 2.1, label: "C:maj" }],
      { durationSeconds: 2, label: "fixture" }
    ), /declared duration/);
  });

  it("selects only exact pilot WAV members from the archive", () => {
    assert.deepEqual(
      selectArchiveMembers("RWC-P/RWC_P001.wav\nRWC-P/notes.txt\nRWC-P/RWC_P002.wav\n", ["RWC_P002"]),
      [{ trackId: "RWC_P002", member: "RWC-P/RWC_P002.wav" }]
    );
  });

  it("distributes the locked 8/4 split across all complexity strata", () => {
    assert.deepEqual([...lockedHoldoutIndexes(12, 4)], [2, 5, 7, 10]);
  });

  it("allows holdout availability checks but guards analyzer results", () => {
    const tracks = [{ trackId: "RWC_P024", split: "holdout" }];
    assert.doesNotThrow(() => assertHoldoutAccess(tracks, { dryRun: true, allowHoldout: false }));
    assert.throws(
      () => assertHoldoutAccess(tracks, { dryRun: false, allowHoldout: false }),
      /Holdout analyzer results are locked/
    );
    assert.doesNotThrow(() => assertHoldoutAccess(tracks, { dryRun: false, allowHoldout: true }));
  });
});
