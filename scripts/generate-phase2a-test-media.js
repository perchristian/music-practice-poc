import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(repoRoot, "test-media", "phase-2a-source.wav");
const phase2gOutputPath = join(repoRoot, "test-media", "phase-2g-piano-mix.wav");
const phase2hOutputPath = join(repoRoot, "test-media", "phase-2h-bar-grid.wav");
const sampleRate = 44100;
const durationSeconds = 6;
const phase2hDownbeatOffsetSeconds = 0.65;
const channels = 1;
const bitsPerSample = 16;

function createWavBuffer(sampleFn, options = {}) {
  const outputDurationSeconds = options.durationSeconds || durationSeconds;
  const totalSamples = Math.round(sampleRate * outputDurationSeconds);
  const dataBytes = totalSamples * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataBytes);

  writeString(buffer, 0, "RIFF");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  writeString(buffer, 8, "WAVE");
  writeString(buffer, 12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  writeString(buffer, 36, "data");
  buffer.writeUInt32LE(dataBytes, 40);

  for (let sample = 0; sample < totalSamples; sample += 1) {
    const time = sample / sampleRate;
    const envelope = Math.min(1, time / 0.03, (outputDurationSeconds - time) / 0.08);
    const value = Math.max(-1, Math.min(1, sampleFn(time) * envelope));
    const intSample = Math.round(value * 32767);
    buffer.writeInt16LE(intSample, 44 + sample * 2);
  }

  return buffer;
}

function writeString(buffer, offset, value) {
  buffer.write(value, offset, value.length, "ascii");
}

const chordFrequencies = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23]
];

function phase2aSample(time) {
  const chord = chordFrequencies[Math.min(3, Math.floor(time / 1.5))];
  return (
    chord.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time), 0) /
    chord.length *
    0.32
  );
}

function pianoBandSample(time) {
  const chord = chordFrequencies[Math.min(3, Math.floor(time / 1.5))];
  const beat = time % 0.75;
  const envelope = Math.exp(-beat * 2.7);
  return chord.reduce((sum, frequency) => {
    return sum + Math.sin(2 * Math.PI * frequency * time) * 0.12 * envelope;
  }, 0);
}

function bassSample(time) {
  const bassFrequencies = [65.41, 55.0, 43.65, 49.0];
  const frequency = bassFrequencies[Math.min(3, Math.floor(time / 1.5))];
  const beat = time % 0.75;
  return (
    Math.sin(2 * Math.PI * frequency * time) * 0.28 +
    Math.sin(2 * Math.PI * frequency * 2 * time) * 0.08
  ) * (0.75 + 0.25 * Math.exp(-beat * 5));
}

function highPercussionSample(time) {
  const sixteenth = time % 0.375;
  if (sixteenth > 0.045) return 0;
  const noise = Math.sin(time * 18_731.3) * Math.sin(time * 8_411.7);
  return noise * Math.exp(-sixteenth * 90) * 0.16;
}

function brightPadSample(time) {
  const root = [1046.5, 880.0, 698.46, 783.99][Math.min(3, Math.floor(time / 1.5))];
  return Math.sin(2 * Math.PI * root * time) * 0.08;
}

function phase2gSample(time) {
  return pianoBandSample(time) + bassSample(time) + highPercussionSample(time) + brightPadSample(time);
}

function phase2hChordIndex(time) {
  return Math.min(3, Math.floor(time / 4));
}

function phase2hPulse(time) {
  const beat = time % 1;
  if (beat > 0.055) return 0;
  const downbeat = time % 4 < 0.08 ? 1.5 : 0.75;
  const click = Math.sin(2 * Math.PI * 95 * time) + Math.sin(2 * Math.PI * 190 * time) * 0.35;
  return click * Math.exp(-beat * 55) * 0.2 * downbeat;
}

function phase2hSample(time) {
  const musicalTime = time - phase2hDownbeatOffsetSeconds;
  if (musicalTime < 0) {
    const pickup = time > 0.22 && time < 0.32
      ? Math.sin(2 * Math.PI * 392 * time) * Math.exp(-(time - 0.22) * 18) * 0.08
      : 0;
    return pickup;
  }

  const chord = chordFrequencies[phase2hChordIndex(musicalTime)];
  const bassFrequencies = [65.41, 55.0, 43.65, 49.0];
  const bassFrequency = bassFrequencies[phase2hChordIndex(musicalTime)];
  const beat = musicalTime % 1;
  const chordEnvelope = 0.65 + 0.35 * Math.exp(-beat * 2.5);
  const harmony = chord.reduce((sum, frequency) => {
    return sum + Math.sin(2 * Math.PI * frequency * time) * 0.13 * chordEnvelope;
  }, 0);
  const bass = Math.sin(2 * Math.PI * bassFrequency * time) * 0.24;
  return harmony + bass + phase2hPulse(musicalTime);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, createWavBuffer(phase2aSample));
console.log(`Generated ${outputPath}`);
await writeFile(phase2gOutputPath, createWavBuffer(phase2gSample));
console.log(`Generated ${phase2gOutputPath}`);
await writeFile(phase2hOutputPath, createWavBuffer(phase2hSample, { durationSeconds: 16 + phase2hDownbeatOffsetSeconds }));
console.log(`Generated ${phase2hOutputPath}`);
