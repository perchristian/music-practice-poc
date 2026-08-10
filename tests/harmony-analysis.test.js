import { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { analyzeHarmonyFromAudio, smoothIsolatedChordDrafts } from "../server.js";

const major = { suffix: "", romanSuffix: "", intervals: [0, 4, 7], label: "major" };
const minor = { suffix: "m", romanSuffix: "", intervals: [0, 3, 7], label: "minor" };
const cr1Root = join(process.cwd(), "test-media", "cr1");
let cr1Fixtures;

before(async () => {
  const generated = spawnSync(process.execPath, ["scripts/generate-phase2a-test-media.js"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  assert.equal(generated.status, 0, "CR1 test media generation should succeed");
  cr1Fixtures = JSON.parse(await readFile(join(cr1Root, "fixtures.json"), "utf8")).fixtures;
});

async function analyzeCr1Fixture(id, includeDiagnostics = true) {
  const fixture = cr1Fixtures.find((candidate) => candidate.id === id);
  const beatDurationSeconds = 60 / fixture.bpm;
  const barDurationSeconds = beatDurationSeconds * fixture.beatsPerBar;
  const bars = fixture.chords.map((_, index) => ({
    bar: index + 1,
    start: index * barDurationSeconds,
    end: (index + 1) * barDurationSeconds
  }));
  return analyzeHarmonyFromAudio(
    {
      path: join(cr1Root, fixture.source),
      durationSeconds: bars.at(-1).end,
      filename: "source-audio.wav"
    },
    { outputs: fixture.stemIds.map((stemId) => ({ id: stemId, filename: `${stemId}.wav` })) },
    {
      timingGrid: {
        bpm: fixture.bpm,
        beatDurationSeconds,
        beatsPerBar: fixture.beatsPerBar,
        bars
      },
      includeDiagnostics
    }
  );
}

function stablePublicResult(result) {
  const copy = structuredClone(result);
  delete copy.analysisIdentity;
  delete copy.diagnostics;
  delete copy.analysis.durationMs;
  return copy;
}

function sourceAt(result, beatIndex, sourceId) {
  return result.diagnostics.beats[beatIndex].sources.find((source) => source.id === sourceId);
}

function chromaDistance(left, right) {
  return left.reduce((sum, value, index) => sum + Math.abs(value - right[index]), 0);
}

function draft(root, quality, beat, confidence = 0.8) {
  return {
    bar: 1,
    beat,
    start: beat - 1,
    end: beat,
    root,
    quality,
    confidence
  };
}

describe("chord sequence smoothing", () => {
  it("replaces one isolated beat when both neighboring labels agree", () => {
    const input = [
      draft(0, major, 1, 0.72),
      draft(7, major, 2, 0.9),
      draft(0, major, 3, 0.68)
    ];

    const result = smoothIsolatedChordDrafts(input);

    assert.equal(result[1].root, 0);
    assert.equal(result[1].quality.label, "major");
    assert.equal(result[1].confidence, 0.68);
    assert.equal(input[1].root, 7);
  });

  it("preserves sustained changes and does not cascade replacements", () => {
    const input = [
      draft(0, major, 1),
      draft(7, major, 2),
      draft(7, major, 3),
      draft(0, major, 4)
    ];

    assert.deepEqual(
      smoothIsolatedChordDrafts(input).map((chord) => chord.root),
      [0, 7, 7, 0]
    );
  });

  it("requires matching root and quality on both sides", () => {
    const input = [
      draft(9, minor, 1),
      draft(7, major, 2),
      draft(9, major, 3)
    ];

    const result = smoothIsolatedChordDrafts(input);

    assert.equal(result[1].root, 7);
    assert.equal(result[1].quality.label, "major");
  });
});

describe("CR1 evidence diagnostics", () => {
  it("is opt-in and leaves the public analyzer result semantically unchanged", async () => {
    const withoutDiagnostics = await analyzeCr1Fixture("vocal-melody", false);
    const withDiagnostics = await analyzeCr1Fixture("vocal-melody", true);

    assert.equal(withoutDiagnostics.diagnostics, undefined);
    assert.deepEqual(stablePublicResult(withDiagnostics), stablePublicResult(withoutDiagnostics));
    assert.equal(withDiagnostics.diagnostics.version, 1);
    assert.equal(withDiagnostics.diagnostics.beats[0].candidateScores.length, 96);
    assert.equal(
      withDiagnostics.diagnostics.beats[0].candidateScores[0].name,
      withDiagnostics.diagnostics.beats[0].rawWinner.name
    );
    assert.ok(withDiagnostics.diagnostics.beats[0].sources.every((source) =>
      source.chroma.length === 12 &&
      source.bassChroma.length === 12 &&
      source.lowNoteCandidates.length === 3 &&
      source.persistence.pitchClasses.length === 12 &&
      source.measuredFeaturesAffectScoring === false &&
      Number.isFinite(source.chordality.meanActivePitchClasses)
    ));
    assert.ok(withDiagnostics.diagnostics.beats.some((beat) =>
      beat.winnerChanges.some((change) => change.evidence === "isolated-between-matching-neighbors")
    ));
  });

  it("reproduces the six isolated failure and control scenarios", async () => {
    assert.deepEqual(cr1Fixtures.map((fixture) => fixture.id), [
      "vocal-melody",
      "no-dedicated-bass",
      "comp-bass-fallback",
      "brief-ornament",
      "repeated-different-melody",
      "legitimate-repeat-variation"
    ]);

    const vocal = await analyzeCr1Fixture("vocal-melody");
    assert.equal(sourceAt(vocal, 0, "vocals").audible, true);
    assert.equal(sourceAt(vocal, 0, "vocals").included, false);
    assert.ok(vocal.diagnostics.beats.some((beat) =>
      beat.winnerChanges.some((change) => change.evidence === "separated-stems")
    ));

    const noBass = await analyzeCr1Fixture("no-dedicated-bass");
    assert.ok(noBass.diagnostics.beats.every((beat) => !beat.sources.some((source) => source.id === "bass")));

    const fallback = await analyzeCr1Fixture("comp-bass-fallback");
    assert.equal(sourceAt(fallback, 0, "bass").bassReliability.reliable, false);
    for (const sourceId of ["piano", "guitar"]) {
      assert.equal(sourceAt(fallback, 0, sourceId).lowNoteCandidates[0].pitchClass, 0);
      assert.equal(sourceAt(fallback, 0, sourceId).bassReliability.reliable, true);
    }

    const ornament = await analyzeCr1Fixture("brief-ornament");
    assert.equal(sourceAt(ornament, 1, "other").audible, true);
    assert.equal(sourceAt(ornament, 1, "other").persistence.pitchClasses[6], 0.25);
    assert.deepEqual(ornament.chords.map((chord) => chord.name), ["C", "C", "C", "C"]);

    const repeated = await analyzeCr1Fixture("repeated-different-melody");
    assert.ok(chromaDistance(sourceAt(repeated, 0, "piano").chroma, sourceAt(repeated, 8, "piano").chroma) < 0.3);
    assert.ok(chromaDistance(sourceAt(repeated, 0, "vocals").chroma, sourceAt(repeated, 8, "vocals").chroma) > 1);
    assert.deepEqual(repeated.chords.map((chord) => chord.name), ["C", "F", "C", "F"]);

    const variation = await analyzeCr1Fixture("legitimate-repeat-variation");
    assert.deepEqual(variation.chords.map((chord) => chord.name), ["C", "F", "C", "G"]);
  });
});
