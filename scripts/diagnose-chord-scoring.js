import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import process from "node:process";

import { analyzeHarmonyFromAudio, estimateBeatGrid, readPcm16WavFromFile } from "../server.js";

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function usage() {
  console.error(
    "Usage: node scripts/diagnose-chord-scoring.js <path-to-pcm16-mono-wav>\n" +
    "Input must already be extracted to mono PCM16 WAV, e.g.:\n" +
    "  ffmpeg -i input.m4a -ac 1 -ar 44100 -sample_fmt s16 source-audio.wav\n" +
    "This is a diagnostic tool only. It does not create application jobs, tune any\n" +
    "threshold, or touch the locked RWC development/holdout split."
  );
  process.exit(1);
}

const [, , wavPath] = process.argv;
if (!wavPath) usage();

const audio = await readPcm16WavFromFile(wavPath);
const audioSha256 = createHash("sha256").update(await readFile(wavPath)).digest("hex");
const beatGrid = estimateBeatGrid(audio);

const result = await analyzeHarmonyFromAudio(
  { path: wavPath, filename: "source-audio.wav", durationSeconds: audio.durationSeconds },
  { outputs: [] },
  { timingGrid: beatGrid, includeDiagnostics: true, evidencePolicy: "legacy", sequenceSmoothing: "isolated" }
);

const fmtChroma = (chroma) => chroma.map((value, index) => `${NOTE_NAMES[index]}:${value.toFixed(2)}`).join(" ");

console.log(`Input: ${wavPath}`);
console.log(`SHA256: ${audioSha256}`);
console.log(`Duration: ${audio.durationSeconds.toFixed(3)}s  Sample rate: ${audio.sampleRate}`);
console.log(`Beat grid: ${beatGrid.bpm.toFixed(1)} BPM, ${beatGrid.beatsPerBar}/4, ${beatGrid.bars?.length ?? 0} bars (estimated, not corrected)`);
console.log(`Key: ${JSON.stringify(result.key)}`);

console.log("\nChord chart (legacy analyzer, isolated smoothing):");
for (const chord of result.chords) {
  console.log(
    `  bar ${chord.bar} beat ${chord.beat} [${chord.start.toFixed(2)}-${chord.end.toFixed(2)}s]  ` +
    `${chord.name}  (roman ${chord.roman}, confidence ${chord.confidence})`
  );
}

console.log("\nPer-beat diagnostics (full-mix chroma, bass chroma, top candidates):");
for (const beat of result.diagnostics.beats) {
  const fullMix = beat.sources.find((source) => source.id === "fullMix");
  console.log(`\n  bar ${beat.bar} beat ${beat.beat} [${beat.start.toFixed(2)}-${beat.end.toFixed(2)}s]`);
  console.log(`    full chroma: ${fmtChroma(fullMix.chroma)}`);
  console.log(`    bass chroma: ${fmtChroma(fullMix.bassChroma)}`);
  console.log(`    raw winner:  ${beat.rawWinner.name}   final winner: ${beat.finalWinner?.name ?? beat.selectedWinner?.name}`);
  for (const candidate of beat.candidateScores.slice(0, 5)) {
    console.log(
      `      ${candidate.name.padEnd(8)} score=${candidate.score.toFixed(3)} ` +
      `templateEnergy=${candidate.templateEnergy.toFixed(3)} rootBonus=${candidate.rootBonus.toFixed(3)} ` +
      `bassChordToneBonus=${candidate.bassChordToneBonus.toFixed(3)} outsidePenalty=${candidate.outsidePenalty.toFixed(3)}`
    );
  }
}
