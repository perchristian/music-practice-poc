import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(repoRoot, "test-media", "phase-2a-source.wav");
const sampleRate = 44100;
const durationSeconds = 6;
const channels = 1;
const bitsPerSample = 16;
const totalSamples = sampleRate * durationSeconds;
const dataBytes = totalSamples * channels * (bitsPerSample / 8);
const buffer = Buffer.alloc(44 + dataBytes);

function writeString(offset, value) {
  buffer.write(value, offset, value.length, "ascii");
}

writeString(0, "RIFF");
buffer.writeUInt32LE(36 + dataBytes, 4);
writeString(8, "WAVE");
writeString(12, "fmt ");
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
buffer.writeUInt16LE(bitsPerSample, 34);
writeString(36, "data");
buffer.writeUInt32LE(dataBytes, 40);

const chordFrequencies = [
  [261.63, 329.63, 392.0],
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 329.63],
  [196.0, 246.94, 293.66, 349.23]
];

for (let sample = 0; sample < totalSamples; sample += 1) {
  const time = sample / sampleRate;
  const chord = chordFrequencies[Math.min(3, Math.floor(time / 1.5))];
  const envelope = Math.min(1, time / 0.03, (durationSeconds - time) / 0.08);
  const value =
    chord.reduce((sum, frequency) => sum + Math.sin(2 * Math.PI * frequency * time), 0) /
    chord.length;
  const intSample = Math.round(value * envelope * 0.32 * 32767);
  buffer.writeInt16LE(intSample, 44 + sample * 2);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, buffer);
console.log(`Generated ${outputPath}`);
