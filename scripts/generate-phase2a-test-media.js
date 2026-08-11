import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const outputPath = join(repoRoot, "test-media", "phase-2a-source.wav");
const phase2gOutputPath = join(repoRoot, "test-media", "phase-2g-piano-mix.wav");
const phase2hOutputPath = join(repoRoot, "test-media", "phase-2h-bar-grid.wav");
const multiChordOutputPath = join(repoRoot, "test-media", "phase-2h-multi-chord-120.wav");
const threeFourOutputPath = join(repoRoot, "test-media", "phase-2h-three-four-90.wav");
const inversionOutputPath = join(repoRoot, "test-media", "phase-2h-inversions-100.wav");
const cr1OutputRoot = join(repoRoot, "test-media", "cr1");
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

async function writeGeneratedFile(path, contents) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, contents);
  await rename(temporaryPath, path);
}

const noteSemitones = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
};

function noteFrequency(note) {
  const match = /^([A-G])([#b]?)(-?\d+)$/.exec(note);
  if (!match) throw new Error(`Unsupported note: ${note}`);
  const [, name, accidental, octaveText] = match;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const midi = (Number(octaveText) + 1) * 12 + noteSemitones[name] + accidentalOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
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

const chordVoicings = {
  C: ["C3", "E3", "G3", "C4"],
  Dm: ["D3", "F3", "A3", "D4"],
  F: ["F2", "A2", "C3", "F3"],
  G: ["G2", "B2", "D3", "G3"],
  Am: ["A2", "C3", "E3", "A3"]
};

const chordBassRoots = {
  C: "C2",
  Dm: "D2",
  F: "F2",
  G: "G1",
  Am: "A1"
};

const harmonyFixtures = [
  {
    path: multiChordOutputPath,
    bpm: 120,
    beatsPerBar: 4,
    bars: 4,
    progression: [
      { bar: 1, beat: 1, beats: 2, chord: "C" },
      { bar: 1, beat: 3, beats: 2, chord: "G" },
      { bar: 2, beat: 1, beats: 2, chord: "Am" },
      { bar: 2, beat: 3, beats: 2, chord: "F" },
      { bar: 3, beat: 1, beats: 2, chord: "Dm" },
      { bar: 3, beat: 3, beats: 2, chord: "G" },
      { bar: 4, beat: 1, beats: 4, chord: "C" }
    ]
  },
  {
    path: threeFourOutputPath,
    bpm: 90,
    beatsPerBar: 3,
    bars: 5,
    octaveShift: 1,
    progression: [
      { bar: 1, beat: 1, beats: 3, chord: "C" },
      { bar: 2, beat: 1, beats: 3, chord: "F" },
      { bar: 3, beat: 1, beats: 3, chord: "G" },
      { bar: 4, beat: 1, beats: 3, chord: "C" },
      { bar: 5, beat: 1, beats: 3, chord: "Dm" }
    ]
  },
  {
    path: inversionOutputPath,
    bpm: 100,
    beatsPerBar: 4,
    bars: 4,
    progression: [
      { bar: 1, beat: 1, beats: 4, chord: "C", bass: "E2" },
      { bar: 2, beat: 1, beats: 4, chord: "F", bass: "A1" },
      { bar: 3, beat: 1, beats: 4, chord: "G", bass: "B1" },
      { bar: 4, beat: 1, beats: 4, chord: "C", bass: "G1" }
    ]
  }
];

const cr1Fixtures = [
  {
    id: "vocal-melody",
    description: "Strong monophonic vocal melody over a stable C accompaniment.",
    chords: ["C", "C", "C", "C"],
    stems: {
      piano: { kind: "chord", amplitude: 0.08 },
      vocals: { kind: "melody", notes: ["G4", "D5", "A4", "B4", "E5", "D5", "A4", "G4"], amplitude: 0.3 },
      drums: { kind: "pulse" }
    }
  },
  {
    id: "no-dedicated-bass",
    description: "Changing harmony with no bass stem and only ordinary comp voicings.",
    chords: ["C", "F", "G", "C"],
    stems: {
      piano: { kind: "chord", amplitude: 0.09 },
      guitar: { kind: "chord", amplitude: 0.07 },
      drums: { kind: "pulse" }
    }
  },
  {
    id: "comp-bass-fallback",
    description: "Silent dedicated bass with functional low notes in piano and guitar.",
    chords: ["C", "F", "G", "C"],
    stems: {
      piano: { kind: "chord", amplitude: 0.07, lowRoot: true },
      guitar: { kind: "chord", amplitude: 0.07, lowRoot: true },
      bass: { kind: "silence" },
      drums: { kind: "pulse" }
    }
  },
  {
    id: "brief-ornament",
    description: "A brief F-sharp ornament over stable C accompaniment.",
    chords: ["C", "C", "C", "C"],
    stems: {
      guitar: { kind: "chord", amplitude: 0.08 },
      other: { kind: "ornament", note: "F#5", beats: [1, 5, 9, 13], amplitude: 0.48 },
      drums: { kind: "pulse" }
    }
  },
  {
    id: "repeated-different-melody",
    description: "Repeated C-F accompaniment with different melody notes in the second instance.",
    chords: ["C", "F", "C", "F"],
    repeatGroups: [[1, 3], [2, 4]],
    stems: {
      piano: { kind: "chord", amplitude: 0.09 },
      vocals: { kind: "melody", notes: ["E4", "G4", "A4", "C5", "F#4", "B4", "C#5", "E5"], amplitude: 0.25 },
      drums: { kind: "pulse" }
    }
  },
  {
    id: "legitimate-repeat-variation",
    description: "A repeated two-bar phrase whose final F chord legitimately changes to G.",
    chords: ["C", "F", "C", "G"],
    repeatGroups: [[1, 3], [2, 4]],
    legitimateVariationBars: [4],
    stems: {
      piano: { kind: "chord", amplitude: 0.1, lowRoot: true },
      drums: { kind: "pulse" }
    }
  }
].map((fixture) => ({ bpm: 120, beatsPerBar: 4, ...fixture }));

function fixtureSegmentAt(fixture, musicalTime) {
  const beatDuration = 60 / fixture.bpm;
  const absoluteBeat = Math.floor(musicalTime / beatDuration);

  for (const segment of fixture.progression) {
    const startBeat = (segment.bar - 1) * fixture.beatsPerBar + (segment.beat - 1);
    const endBeat = startBeat + segment.beats;
    if (absoluteBeat >= startBeat && absoluteBeat < endBeat) return segment;
  }

  return fixture.progression[fixture.progression.length - 1];
}

function fixturePulse(time, fixture) {
  const beatDuration = 60 / fixture.bpm;
  const beat = time % beatDuration;
  if (beat > Math.min(0.045, beatDuration * 0.12)) return 0;
  const beatIndex = Math.floor(time / beatDuration);
  const downbeat = beatIndex % fixture.beatsPerBar === 0 ? 3.0 : 0.35;
  const click = Math.sin(2 * Math.PI * 110 * time) + Math.sin(2 * Math.PI * 220 * time) * 0.35;
  return click * Math.exp(-beat * 70) * 0.22 * downbeat;
}

function fixtureSample(fixture) {
  const pitchMultiplier = 2 ** (fixture.octaveShift || 0);
  return (time) => {
    const segment = fixtureSegmentAt(fixture, time);
    const chordNotes = chordVoicings[segment.chord];
    const bassNote = segment.bass || chordBassRoots[segment.chord];
    const beatDuration = 60 / fixture.bpm;
    const beat = time % beatDuration;
    const envelope = 0.7 + 0.3 * Math.exp(-beat * 4);
    const harmony = chordNotes.reduce((sum, note) => {
      const frequency = noteFrequency(note) * pitchMultiplier;
      return sum + Math.sin(2 * Math.PI * frequency * time) * 0.11 * envelope;
    }, 0);
    const bassFrequency = noteFrequency(bassNote) * pitchMultiplier;
    const bass = (
      Math.sin(2 * Math.PI * bassFrequency * time) * 0.23 +
      Math.sin(2 * Math.PI * bassFrequency * 2 * time) * 0.06
    ) * (0.8 + 0.2 * Math.exp(-beat * 6));
    return harmony + bass + fixturePulse(time, fixture);
  };
}

function cr1LayerSample(fixture, layer, time) {
  const beatDuration = 60 / fixture.bpm;
  const barDuration = beatDuration * fixture.beatsPerBar;
  const barIndex = Math.min(fixture.chords.length - 1, Math.floor(time / barDuration));
  const chord = fixture.chords[barIndex];
  const beatIndex = Math.min(fixture.chords.length * fixture.beatsPerBar - 1, Math.floor(time / beatDuration));
  const beatPhase = time % beatDuration;

  if (layer.kind === "silence") return 0;
  if (layer.kind === "pulse") return fixturePulse(time, fixture) * 0.7;
  if (layer.kind === "melody") {
    const note = layer.notes[Math.min(layer.notes.length - 1, Math.floor(beatIndex / 2))];
    return Math.sin(2 * Math.PI * noteFrequency(note) * time) * layer.amplitude;
  }
  if (layer.kind === "ornament") {
    if (!layer.beats.includes(beatIndex) || beatPhase > beatDuration * 0.22) return 0;
    return Math.sin(2 * Math.PI * noteFrequency(layer.note) * time) *
      Math.exp(-beatPhase * 18) * layer.amplitude;
  }

  const envelope = 0.72 + 0.28 * Math.exp(-beatPhase * 5);
  const chordTone = chordVoicings[chord].reduce((sum, note) => {
    return sum + Math.sin(2 * Math.PI * noteFrequency(note) * time) * layer.amplitude * envelope;
  }, 0);
  if (!layer.lowRoot) return chordTone;
  return chordTone + Math.sin(2 * Math.PI * noteFrequency(chordBassRoots[chord]) * time) * layer.amplitude * 1.8;
}

await mkdir(dirname(outputPath), { recursive: true });
await writeGeneratedFile(outputPath, createWavBuffer(phase2aSample));
console.log(`Generated ${outputPath}`);
await writeGeneratedFile(phase2gOutputPath, createWavBuffer(phase2gSample));
console.log(`Generated ${phase2gOutputPath}`);
await writeGeneratedFile(phase2hOutputPath, createWavBuffer(phase2hSample, { durationSeconds: 16 + phase2hDownbeatOffsetSeconds }));
console.log(`Generated ${phase2hOutputPath}`);
for (const fixture of harmonyFixtures) {
  const beatDuration = 60 / fixture.bpm;
  const outputDurationSeconds = fixture.bars * fixture.beatsPerBar * beatDuration;
  await writeGeneratedFile(fixture.path, createWavBuffer(fixtureSample(fixture), { durationSeconds: outputDurationSeconds }));
  console.log(`Generated ${fixture.path}`);
}
for (const fixture of cr1Fixtures) {
  const directory = join(cr1OutputRoot, fixture.id);
  const outputDurationSeconds = fixture.chords.length * fixture.beatsPerBar * (60 / fixture.bpm);
  await mkdir(join(directory, "stems"), { recursive: true });
  const layers = Object.entries(fixture.stems);
  const source = (time) => layers.reduce((sum, [, layer]) => sum + cr1LayerSample(fixture, layer, time), 0);
  await writeGeneratedFile(join(directory, "source-audio.wav"), createWavBuffer(source, { durationSeconds: outputDurationSeconds }));
  for (const [id, layer] of layers) {
    await writeGeneratedFile(
      join(directory, "stems", `${id}.wav`),
      createWavBuffer((time) => cr1LayerSample(fixture, layer, time), { durationSeconds: outputDurationSeconds })
    );
  }
  console.log(`Generated ${directory}`);
}
await writeGeneratedFile(join(cr1OutputRoot, "fixtures.json"), `${JSON.stringify({
  version: 1,
  fixtures: cr1Fixtures.map(({ stems, ...fixture }) => ({
    ...fixture,
    stemIds: Object.keys(stems),
    source: `${fixture.id}/source-audio.wav`
  }))
}, null, 2)}\n`);
