import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { analyzeHarmonyFromAudio } from "../server.js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const contract = JSON.parse(await readFile(
  join(repoRoot, "benchmarks", "musical-review-mr0-level1.json"),
  "utf8"
));
const outputRoot = join(repoRoot, "benchmark-results", "musical-review", "mr0", "level1");

await import("./generate-phase2a-test-media.js");

const audioPath = join(repoRoot, contract.input.path);
const audioSha256 = createHash("sha256").update(await readFile(audioPath)).digest("hex");
assert.equal(audioSha256, contract.input.audioSha256, "MR0 audio checksum changed");

for (const field of ["generator", "methodPath", "capabilityTestPath"]) {
  const owner = field === "generator" ? contract.input : contract.reviewer;
  const expectedField = `${field.replace("Path", "")}Sha256`;
  const actual = createHash("sha256")
    .update(await readFile(join(repoRoot, owner[field])))
    .digest("hex");
  assert.equal(actual, owner[expectedField], `MR0 ${field} checksum changed`);
}

const beatDurationSeconds = contract.timing.beatDurationSeconds;
const barDurationSeconds = beatDurationSeconds * contract.timing.beatsPerBar;
const timingGrid = {
  bpm: contract.timing.bpm,
  beatDurationSeconds,
  beatsPerBar: contract.timing.beatsPerBar,
  bars: Array.from({ length: contract.timing.bars }, (_, index) => ({
    bar: index + 1,
    start: contract.timing.downbeatOffsetSeconds + index * barDurationSeconds,
    end: contract.timing.downbeatOffsetSeconds + (index + 1) * barDurationSeconds
  }))
};

const analyze = () => analyzeHarmonyFromAudio(
  {
    path: audioPath,
    filename: "source-audio.wav",
    durationSeconds: contract.input.durationSeconds
  },
  { outputs: [] },
  {
    timingGrid,
    includeDiagnostics: true,
    evidencePolicy: contract.analyzer.evidencePolicy,
    sequenceSmoothing: contract.analyzer.sequenceSmoothing
  }
);
const [first, second] = await Promise.all([analyze(), analyze()]);
const stable = (result) => ({
  key: result.key,
  chords: result.chords,
  suppressedChordSuggestions: result.suppressedChordSuggestions,
  beats: result.diagnostics.beats.map((beat) => ({
    bar: beat.bar,
    beat: beat.beat,
    start: beat.start,
    end: beat.end,
    combined: beat.combined,
    sources: beat.sources,
    rawWinner: beat.rawWinner,
    selectedWinner: beat.selectedWinner,
    finalWinner: beat.finalWinner,
    winnerChanges: beat.winnerChanges
  }))
});
assert.deepEqual(stable(first), stable(second), "MR0 analyzer output was not stable across two runs");

const reference = contract.excerpts.flatMap((excerpt) => excerpt.reference);
assert.deepEqual(
  first.chords.map(({ start, end, bar, beat, name, roman }) => ({
    startSeconds: start,
    endSeconds: end,
    bar,
    beat,
    label: name,
    roman
  })),
  reference.map(({ allowedAlternatives, ...chord }) => chord),
  "MR0 candidate no longer matches the frozen Level-1 reference"
);

const neutralEvidence = {
  reviewId: contract.reviewId,
  disclosureArm: "B",
  warning: "Do not reveal candidate labels or the reference before reviewing this file.",
  timing: contract.timing,
  signalRepresentation: contract.signalRepresentation,
  excerpts: contract.excerpts.map(({ reference: _reference, ...excerpt }) => excerpt),
  beats: first.diagnostics.beats.map(({ bar, beat, start, end, combined, sources }) => ({
    bar,
    beat,
    start,
    end,
    combined,
    sources: sources.map(({
      id,
      audible,
      rms,
      chroma,
      bassChroma,
      lowNoteCandidates,
      bassReliability,
      persistence,
      chordality
    }) => ({
      id,
      audible,
      rms,
      chroma,
      bassChroma,
      lowNoteCandidates,
      bassReliability,
      persistence,
      chordality
    }))
  }))
};
const candidateLabels = {
  reviewId: contract.reviewId,
  disclosureArm: "C",
  analyzer: contract.analyzer,
  key: first.key,
  rawBeatCandidates: first.diagnostics.beats.map((beat) => ({
    bar: beat.bar,
    beat: beat.beat,
    start: beat.start,
    end: beat.end,
    raw: beat.rawWinner,
    selected: beat.selectedWinner,
    final: beat.finalWinner,
    winnerChanges: beat.winnerChanges
  })),
  finalChords: first.chords
};
const referenceEvidence = {
  reviewId: contract.reviewId,
  disclosureArm: "D",
  source: "generated-known-answer",
  excerpts: contract.excerpts
};
const summary = {
  reviewId: contract.reviewId,
  preparedAt: new Date().toISOString(),
  audioPath: contract.input.path,
  audioSha256,
  analyzerRunCount: 2,
  analyzerStable: true,
  candidateMatchesReference: true,
  armA: {
    input: contract.input.path,
    status: "not-run",
    reason: "No separately configured audio-input reviewer is available in this workflow."
  },
  stagedFiles: [
    "arm-b-neutral-evidence.json",
    "arm-c-candidate-labels.json",
    "arm-d-reference.json"
  ]
};

await mkdir(outputRoot, { recursive: true });
for (const [filename, contents] of [
  ["arm-b-neutral-evidence.json", neutralEvidence],
  ["arm-c-candidate-labels.json", candidateLabels],
  ["arm-d-reference.json", referenceEvidence],
  ["run-summary.json", summary]
]) {
  await writeFile(join(outputRoot, filename), `${JSON.stringify(contents, null, 2)}\n`);
}

console.log(`Prepared MR0 Level-1 review packet at ${outputRoot}`);
console.log("Analyzer stability: PASS (2/2 identical runs)");
console.log("Frozen reference match: PASS (5/5 chords)");
console.log("Arm A: NOT RUN (audio-input reviewer unavailable)");
