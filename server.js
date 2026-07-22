import { createServer } from "node:http";
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { normalizeSections as normalizeSectionRanges } from "./public/section-ranges.js";
import { absoluteBeatToSeconds, normalizeTempoMap } from "./public/tempo-map.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const startupPipelineMode = process.env.PIPELINE_MODE === "real" ? "real" : "mock";
let activePipelineMode = startupPipelineMode;
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const REAL_SEPARATOR = process.env.REAL_SEPARATOR === "ffmpeg-spectral" ? "ffmpeg-spectral" : "demucs";
const DEMUCS_MODEL = process.env.DEMUCS_MODEL || "htdemucs_6s";
const DEMUCS_PATH = process.env.DEMUCS_PATH || join(__dirname, ".venv-real", "bin", "demucs");
const DEMUCS_TORCH_HOME = process.env.TORCH_HOME || join(__dirname, ".cache", "torch");
const FFMPEG_SEPARATOR_NAME = "ffmpeg-spectral-piano-v1";
const DEMUCS_SEPARATOR_NAME = `demucs-${DEMUCS_MODEL}`;
const REAL_SEPARATOR_NAME = REAL_SEPARATOR === "ffmpeg-spectral" ? FFMPEG_SEPARATOR_NAME : DEMUCS_SEPARATOR_NAME;
const SOURCE_AUDIO_FILENAME = "source-audio.wav";
const WAVEFORM_FILENAME = "waveform.json";
const SOURCE_AUDIO_CODEC = "pcm_s16le";
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const JOBS_DIR = join(DATA_DIR, "jobs");
const PUBLIC_DIR = join(__dirname, "public");
const MAX_UPLOAD_MEGABYTES = 150;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEGABYTES * 1024 * 1024;
const MAX_UPLOAD_REQUEST_OVERHEAD_BYTES = 1024 * 1024;
const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_BYTES + MAX_UPLOAD_REQUEST_OVERHEAD_BYTES;
const MOCK_DURATION_SECONDS = 16;
const DEFAULT_BEATS_PER_BAR = 4;
const METER_CANDIDATES = [4, 3];
const ANALYSIS_SAMPLE_RATE = 8000;
const MIN_BAR_START_SECONDS = -60;
const MAX_BAR_START_SECONDS = 60 * 60;
const CHORD_CHART_VERSION = 1;
const DEFAULT_CHORD_DIVISIONS_PER_QUARTER = 4;
const MAX_CHORD_CHART_CHORDS = 4096;
const MAX_CHORD_CHART_BARS = 10000;
const MAX_CHORD_CHART_DIVISIONS = 4096;
const MAX_SECTION_COUNT = 64;
const WAVEFORM_PEAKS_PER_SECOND = 80;
const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const NOTE_PITCH_CLASSES = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11
};
const MIN_ANALYSIS_STEM_RMS = 0.001;
const HARMONIC_STEM_WEIGHTS = {
  other: 1.4,
  accompaniment: 1.2,
  guitar: 0.9,
  piano: 0.7
};
const BASS_STEM_WEIGHTS = {
  bass: 1.6,
  accompaniment: 0.4
};

const jobs = new Map();

class UploadTooLargeError extends Error {
  constructor() {
    super(`Upload too large. Use a file up to ${MAX_UPLOAD_MEGABYTES} MB for the POC.`);
    this.name = "UploadTooLargeError";
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4"
};

const generatedMockStems = [
  { id: "drums", name: "Drums" },
  { id: "bass", name: "Bass" },
  { id: "guitar", name: "Guitar" },
  { id: "piano", name: "Piano" }
];

const externalMockStemSources = [
  {
    id: "accompaniment",
    name: "Accompaniment",
    sourceFilename: "Uten piano.m4a",
    filename: "accompaniment.m4a",
    contentType: "audio/mp4"
  },
  {
    id: "piano",
    name: "Piano",
    sourceFilename: "Bare piano.m4a",
    filename: "piano.m4a",
    contentType: "audio/mp4"
  }
];

async function ensureBaseDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(JOBS_DIR, { recursive: true });
}

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function notFound(res) {
  json(res, 404, { error: "Not found" });
}

function badRequest(res, message) {
  json(res, 400, { error: message });
}

function generatedStemDescriptors() {
  return generatedMockStems.map((stem) => ({
    ...stem,
    filename: `${stem.id}.wav`,
    contentType: "audio/wav"
  }));
}

function stemsForJob(job) {
  return job.stems?.length ? job.stems : generatedStemDescriptors();
}

function stemAudioUrl(job, stem) {
  const ext = extname(stem.filename || `${stem.id}.wav`) || ".wav";
  return `/api/jobs/${job.id}/stems/${stem.id}${ext}`;
}

function publicStem(job, stem) {
  return {
    id: stem.id,
    name: stem.name,
    audioUrl: stemAudioUrl(job, stem),
    defaultMuted: false
  };
}

function stemFilePath(job, stem) {
  if (stem.kind === "source-audio") {
    return join(job.dir, stem.filename);
  }
  return join(job.dir, "stems", stem.filename);
}

function finitePositiveNumber(value) {
  return Number.isFinite(value) && value > 0;
}

function durationSecondsFromMetadata(metadata) {
  const duration = Number(metadata?.durationSeconds ?? metadata?.duration);
  return finitePositiveNumber(duration) ? duration : null;
}

function normalizedDurationSeconds(value) {
  const duration = Number(value);
  return finitePositiveNumber(duration) && duration < 24 * 60 * 60 ? duration : null;
}

function normalizedThumbnailDataUrl(value) {
  if (typeof value !== "string") return null;
  if (!/^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)) return null;
  if (Buffer.byteLength(value, "utf8") > 180_000) return null;
  return value;
}

function wavDurationSeconds(buffer) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }

  let byteRate = null;
  let dataBytes = null;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkSize > buffer.length) break;

    if (chunkId === "fmt " && chunkSize >= 16) {
      byteRate = buffer.readUInt32LE(chunkStart + 8);
    } else if (chunkId === "data") {
      dataBytes = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!finitePositiveNumber(byteRate) || !finitePositiveNumber(dataBytes)) return null;
  return dataBytes / byteRate;
}

async function wavDurationSecondsFromFile(filePath) {
  try {
    return wavDurationSeconds(await readFile(filePath));
  } catch {
    return null;
  }
}

function readPcm16Wav(buffer) {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Audio analysis currently requires an uncompressed WAV source.");
  }

  let channels = null;
  let sampleRate = null;
  let bitsPerSample = null;
  let dataStart = null;
  let dataBytes = null;
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkStart + chunkSize > buffer.length) break;

    if (chunkId === "fmt " && chunkSize >= 16) {
      const audioFormat = buffer.readUInt16LE(chunkStart);
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
      if (audioFormat !== 1 || bitsPerSample !== 16) {
        throw new Error("Audio analysis currently supports PCM16 WAV input only.");
      }
    } else if (chunkId === "data") {
      dataStart = chunkStart;
      dataBytes = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!channels || !sampleRate || !dataStart || !dataBytes) {
    throw new Error("Could not read WAV audio data for analysis.");
  }

  const frameCount = Math.floor(dataBytes / (channels * 2));
  const durationSeconds = frameCount / sampleRate;
  const frameStride = Math.max(1, Math.floor(sampleRate / ANALYSIS_SAMPLE_RATE));
  const analysisSampleRate = sampleRate / frameStride;
  const sampleCount = Math.ceil(frameCount / frameStride);
  const samples = new Float32Array(sampleCount);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    let sum = 0;
    const frame = Math.min(frameCount - 1, sample * frameStride);
    const frameOffset = dataStart + frame * channels * 2;
    for (let channel = 0; channel < channels; channel += 1) {
      sum += buffer.readInt16LE(frameOffset + channel * 2) / 32768;
    }
    samples[sample] = sum / channels;
  }

  return {
    sampleRate: analysisSampleRate,
    channels,
    durationSeconds,
    samples,
    analyzedDurationSeconds: durationSeconds
  };
}

async function readPcm16WavFromFile(filePath) {
  return readPcm16Wav(await readFile(filePath));
}

function rmsEnvelope(audio, frameSeconds = 0.05) {
  const frameSize = Math.max(1, Math.round(audio.sampleRate * frameSeconds));
  const envelope = [];

  for (let start = 0; start < audio.samples.length; start += frameSize) {
    let sumSquares = 0;
    let count = 0;
    for (let index = start; index < Math.min(start + frameSize, audio.samples.length); index += 1) {
      sumSquares += audio.samples[index] * audio.samples[index];
      count += 1;
    }
    envelope.push(Math.sqrt(sumSquares / Math.max(1, count)));
  }

  return { values: envelope, frameSeconds };
}

function waveformEnvelope(audio, peaksPerSecond = WAVEFORM_PEAKS_PER_SECOND) {
  const bucketSize = Math.max(1, Math.round(audio.sampleRate / peaksPerSecond));
  const peaks = [];
  let overallPeak = 0;

  for (let start = 0; start < audio.samples.length; start += bucketSize) {
    let min = 1;
    let max = -1;
    const end = Math.min(audio.samples.length, start + bucketSize);
    for (let index = start; index < end; index += 1) {
      const sample = audio.samples[index];
      min = Math.min(min, sample);
      max = Math.max(max, sample);
    }
    if (end === start) {
      min = 0;
      max = 0;
    }
    overallPeak = Math.max(overallPeak, Math.abs(min), Math.abs(max));
    peaks.push([min, max]);
  }

  const scale = overallPeak > 0 ? 1 / overallPeak : 1;
  return {
    version: 1,
    durationSeconds: Number(audio.durationSeconds.toFixed(3)),
    peaksPerSecond,
    peaks: peaks.map(([min, max]) => [
      Number((min * scale).toFixed(3)),
      Number((max * scale).toFixed(3))
    ])
  };
}

function mockWaveformEnvelope(durationSeconds = MOCK_DURATION_SECONDS) {
  const safeDuration = Math.max(1, Math.min(60 * 60, Number(durationSeconds) || MOCK_DURATION_SECONDS));
  const peaks = [];
  const count = Math.ceil(safeDuration * WAVEFORM_PEAKS_PER_SECOND);
  for (let index = 0; index < count; index += 1) {
    const time = index / WAVEFORM_PEAKS_PER_SECOND;
    let min = 1;
    let max = -1;
    for (let probe = 0; probe < 8; probe += 1) {
      const sampleTime = time + probe / (WAVEFORM_PEAKS_PER_SECOND * 8);
      const sample = Math.max(-1, Math.min(1, pianoSample(sampleTime) + drumSample(sampleTime) * 0.45));
      min = Math.min(min, sample);
      max = Math.max(max, sample);
    }
    peaks.push([Number(min.toFixed(3)), Number(max.toFixed(3))]);
  }
  return {
    version: 1,
    durationSeconds: Number(safeDuration.toFixed(3)),
    peaksPerSecond: WAVEFORM_PEAKS_PER_SECOND,
    peaks
  };
}

async function writeWaveformAsset(job, envelope) {
  await writeFile(join(job.dir, WAVEFORM_FILENAME), JSON.stringify(envelope));
}

function onsetEnvelope(rmsValues) {
  const flux = [];
  for (let index = 0; index < rmsValues.length; index += 1) {
    const previous = index > 0 ? rmsValues[index - 1] : rmsValues[index];
    flux.push(Math.max(0, rmsValues[index] - previous));
  }
  return flux;
}

function envelopeCorrelation(values, lagFrames) {
  let sum = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = 0; index + lagFrames < values.length; index += 1) {
    const left = values[index];
    const right = values[index + lagFrames];
    sum += left * right;
    leftEnergy += left * left;
    rightEnergy += right * right;
  }

  if (!leftEnergy || !rightEnergy) return 0;
  return sum / Math.sqrt(leftEnergy * rightEnergy);
}

function segmentRms(audio, startSeconds = 0, endSeconds = audio.analyzedDurationSeconds || audio.durationSeconds) {
  const start = Math.max(0, Math.floor(startSeconds * audio.sampleRate));
  const end = Math.min(audio.samples.length, Math.floor(endSeconds * audio.sampleRate));
  let sumSquares = 0;
  let count = 0;

  for (let index = start; index < end; index += 1) {
    sumSquares += audio.samples[index] * audio.samples[index];
    count += 1;
  }

  return count ? Math.sqrt(sumSquares / count) : 0;
}

function localOnsetStrength(onsets, frame, radius = 1) {
  let strength = 0;
  for (let offset = -radius; offset <= radius; offset += 1) {
    strength += onsets[frame + offset] || 0;
  }
  return strength;
}

function beatStrengths(onsets, firstBeatFrame, beatFrames) {
  const strengths = [];
  for (let frame = firstBeatFrame; frame < onsets.length; frame += beatFrames) {
    strengths.push(localOnsetStrength(onsets, frame));
  }
  return strengths;
}

function strongestBeatPhase(values, onsets, beatFrames) {
  let bestPhase = 0;
  let bestPhaseScore = -Infinity;
  for (let phase = 0; phase < beatFrames; phase += 1) {
    let score = 0;
    for (let frame = phase; frame < values.length; frame += beatFrames) {
      score += onsets[frame] || 0;
    }
    if (score > bestPhaseScore) {
      bestPhaseScore = score;
      bestPhase = phase;
    }
  }
  return bestPhase;
}

function alternatingBeatDominance(strengths) {
  let evenSum = 0;
  let evenCount = 0;
  let oddSum = 0;
  let oddCount = 0;

  for (let index = 0; index < strengths.length; index += 1) {
    if (index % 2 === 0) {
      evenSum += strengths[index];
      evenCount += 1;
    } else {
      oddSum += strengths[index];
      oddCount += 1;
    }
  }

  const evenAverage = evenCount ? evenSum / evenCount : 0;
  const oddAverage = oddCount ? oddSum / oddCount : 0;
  const stronger = Math.max(evenAverage, oddAverage);
  const weaker = Math.max(0.000001, Math.min(evenAverage, oddAverage));
  return stronger / weaker;
}

function estimateDownbeatPhase(strengths, beatsPerBar = DEFAULT_BEATS_PER_BAR) {
  let bestPhase = 0;
  let bestScore = -Infinity;
  const scores = [];

  for (let phase = 0; phase < beatsPerBar; phase += 1) {
    let score = 0;
    let count = 0;
    for (let beatIndex = phase; beatIndex < strengths.length; beatIndex += beatsPerBar) {
      const nextBeat = strengths[beatIndex + 1] || 0;
      const previousBeat = strengths[beatIndex - 1] || 0;
      score += strengths[beatIndex] * 1.4 - Math.max(nextBeat, previousBeat) * 0.15;
      count += 1;
    }
    const normalizedScore = count ? score / count : 0;
    scores.push(normalizedScore);
    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestPhase = phase;
    }
  }

  const sorted = [...scores].sort((left, right) => right - left);
  const margin = (sorted[0] || 0) - (sorted[1] || 0);
  const confidence = Math.max(0.1, Math.min(0.95, 0.35 + margin * 8));
  return { phase: bestPhase, confidence, score: bestScore, scores };
}

function estimateMeter(strengths) {
  let best = null;
  const candidates = [];

  for (const beatsPerBar of METER_CANDIDATES) {
    const periodicity = envelopeCorrelation(strengths, beatsPerBar);
    const candidate = {
      beatsPerBar,
      periodicity,
      ...estimateDownbeatPhase(strengths, beatsPerBar)
    };
    const prior = beatsPerBar === DEFAULT_BEATS_PER_BAR ? 0.02 : 0;
    const scoreWithPrior = candidate.score + periodicity * 0.5 + prior;
    candidates.push({
      beatsPerBar,
      phase: candidate.phase,
      score: Number(candidate.score.toFixed(4)),
      periodicity: Number(periodicity.toFixed(4)),
      scoreWithPrior: Number(scoreWithPrior.toFixed(4))
    });
    if (!best || scoreWithPrior > best.scoreWithPrior) {
      best = { ...candidate, scoreWithPrior };
    }
  }

  return best ? { ...best, candidates } : {
    beatsPerBar: DEFAULT_BEATS_PER_BAR,
    phase: 0,
    confidence: 0.1,
    score: 0,
    scores: [],
    candidates
  };
}

function tempoScoreForBeatDuration(onsets, frameSeconds, beatDurationSeconds) {
  const lag = Math.max(1, Math.round(beatDurationSeconds / frameSeconds));
  return (
    envelopeCorrelation(onsets, lag) +
    envelopeCorrelation(onsets, lag * 2) * 0.45 +
    envelopeCorrelation(onsets, lag * DEFAULT_BEATS_PER_BAR) * 0.25
  );
}

function estimateBeatGrid(audio) {
  const { values, frameSeconds } = rmsEnvelope(audio);
  const onsets = onsetEnvelope(values);
  const minBeatSeconds = 60 / 170;
  const maxBeatSeconds = 60 / 60;
  let best = {
    beatDurationSeconds: 1,
    bpm: 60,
    score: 0
  };

  for (let beatSeconds = minBeatSeconds; beatSeconds <= maxBeatSeconds; beatSeconds += frameSeconds) {
    const score = tempoScoreForBeatDuration(onsets, frameSeconds, beatSeconds);
    if (score > best.score) {
      best = {
        beatDurationSeconds: beatSeconds,
        bpm: 60 / beatSeconds,
        score
      };
    }
  }

  const wholeClipRms = segmentRms(audio);
  const openingRms = segmentRms(audio, 0, Math.min(0.25, audio.analyzedDurationSeconds));
  const startsWithAudio = openingRms > 0.005 && openingRms > wholeClipRms * 0.2;
  if (startsWithAudio) {
    for (const beatsPerBar of METER_CANDIDATES) {
      const maxBars = Math.floor(audio.analyzedDurationSeconds / (minBeatSeconds * beatsPerBar));
      for (let barCount = 2; barCount <= Math.min(64, maxBars); barCount += 1) {
        const beatDurationSeconds = audio.analyzedDurationSeconds / (barCount * beatsPerBar);
        if (beatDurationSeconds < minBeatSeconds || beatDurationSeconds > maxBeatSeconds) continue;

        const rawScore = tempoScoreForBeatDuration(onsets, frameSeconds, beatDurationSeconds);
        // Keep 3/4 as a narrow POC path; a broad 3/4 prior misread the local 106 BPM calibration clip.
        const boundaryBonus = beatsPerBar === DEFAULT_BEATS_PER_BAR
          ? 0.65
          : barCount <= 5 ? 0.72 : 0.15;
        const shortClipBarPenalty = Math.max(0, 8 - barCount) * 0.03;
        const score = rawScore + boundaryBonus - shortClipBarPenalty;
        if (score > best.score) {
          best = {
            beatDurationSeconds,
            bpm: 60 / beatDurationSeconds,
            score,
            rawScore,
            startAligned: true,
            barCount,
            beatsPerBar
          };
        }
      }
    }
  }

  const halfTimeBeatSeconds = best.beatDurationSeconds * 2;
  const bestBeatFrames = Math.max(1, Math.round(best.beatDurationSeconds / frameSeconds));
  const halfTimePhase = strongestBeatPhase(values, onsets, bestBeatFrames);
  const halfTimeStrengths = beatStrengths(onsets, halfTimePhase, bestBeatFrames);
  if (
    best.bpm > 110 &&
    best.bpm / 2 >= 55 &&
    halfTimeBeatSeconds <= 60 / 55 &&
    alternatingBeatDominance(halfTimeStrengths) >= 1.7
  ) {
    best = {
      beatDurationSeconds: halfTimeBeatSeconds,
      bpm: best.bpm / 2,
      score: best.score * 0.9,
      rawScore: best.rawScore,
      startAligned: best.startAligned,
      barCount: best.barCount,
      beatsPerBar: best.beatsPerBar
    };
  }

  const beatFrames = Math.max(1, Math.round(best.beatDurationSeconds / frameSeconds));
  let bestPhase = 0;
  if (!best.startAligned) {
    bestPhase = strongestBeatPhase(values, onsets, beatFrames);
  }

  const offsetSeconds = bestPhase * frameSeconds;
  const beatDurationSeconds = best.beatDurationSeconds;
  const strengths = beatStrengths(onsets, bestPhase, beatFrames);
  const meter = estimateMeter(strengths);
  const beatsPerBar = best.beatsPerBar || meter.beatsPerBar || DEFAULT_BEATS_PER_BAR;
  const downbeat = best.startAligned
    ? { ...meter, beatsPerBar, phase: 0, confidence: Math.max(0.75, meter.confidence) }
    : { ...meter, beatsPerBar };
  const downbeatOffsetSeconds = offsetSeconds + downbeat.phase * beatDurationSeconds;
  const barDurationSeconds = beatDurationSeconds * beatsPerBar;
  const confidence = Math.max(0.1, Math.min(0.95, best.score));
  const beats = [];
  for (let time = offsetSeconds, index = 0; time < audio.analyzedDurationSeconds; time += beatDurationSeconds, index += 1) {
    const relativeBeatIndex = index - downbeat.phase;
    beats.push({
      time: Number(time.toFixed(3)),
      beat: ((relativeBeatIndex % beatsPerBar) + beatsPerBar) % beatsPerBar + 1,
      bar: Math.floor(relativeBeatIndex / beatsPerBar) + 1,
      downbeat: relativeBeatIndex >= 0 && relativeBeatIndex % beatsPerBar === 0
    });
  }

  const bars = [];
  for (let start = downbeatOffsetSeconds; start < audio.analyzedDurationSeconds; start += barDurationSeconds) {
    const end = Math.min(audio.durationSeconds, start + barDurationSeconds);
    if (end - start < Math.min(1, barDurationSeconds * 0.35)) continue;
    bars.push({
      bar: bars.length + 1,
      start: Number(Math.max(0, start).toFixed(3)),
      end: Number(end.toFixed(3))
    });
  }

  return {
    bpm: Number(best.bpm.toFixed(1)),
    beatDurationSeconds: Number(beatDurationSeconds.toFixed(3)),
    beatsPerBar,
    barDurationSeconds: Number(barDurationSeconds.toFixed(3)),
    offsetSeconds: Number(offsetSeconds.toFixed(3)),
    beatOffsetSeconds: Number(offsetSeconds.toFixed(3)),
    downbeatOffsetSeconds: Number(downbeatOffsetSeconds.toFixed(3)),
    downbeatConfidence: Number(downbeat.confidence.toFixed(2)),
    meterCandidates: meter.candidates,
    confidence: Number(confidence.toFixed(2)),
    beats,
    bars
  };
}

function pitchClassEnergyDetails(audio, startSeconds, endSeconds, options = {}) {
  const {
    minMidi = 36,
    maxMidi = 83,
    stride = Math.max(1, Math.floor(audio.sampleRate / ANALYSIS_SAMPLE_RATE))
  } = options;
  const start = Math.max(0, Math.floor(startSeconds * audio.sampleRate));
  const end = Math.min(audio.samples.length, Math.floor(endSeconds * audio.sampleRate));
  const chroma = Array(12).fill(0);

  if (end <= start) return { chroma, peak: 0 };

  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const angular = (2 * Math.PI * frequency * stride) / audio.sampleRate;
    let real = 0;
    let imaginary = 0;
    let count = 0;

    for (let index = start; index < end; index += stride) {
      const phase = angular * count;
      const sample = audio.samples[index];
      real += sample * Math.cos(phase);
      imaginary -= sample * Math.sin(phase);
      count += 1;
    }

    chroma[midi % 12] += Math.sqrt(real * real + imaginary * imaginary) / Math.max(1, count);
  }

  const peak = Math.max(...chroma);
  return {
    chroma: peak > 0 ? chroma.map((value) => value / peak) : chroma,
    peak
  };
}

function pitchClassEnergy(audio, startSeconds, endSeconds, options = {}) {
  return pitchClassEnergyDetails(audio, startSeconds, endSeconds, options).chroma;
}

function addWeightedChroma(target, chroma, weight) {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += chroma[index] * weight;
  }
}

function normalizeChroma(chroma) {
  const max = Math.max(...chroma);
  return max > 0 ? chroma.map((value) => value / max) : chroma;
}

async function loadAnalysisStemAudios(extracted, separation) {
  const stemsDir = join(dirname(extracted.path), "stems");
  const loaded = [];

  for (const stem of separation.outputs || []) {
    const harmonicWeight = HARMONIC_STEM_WEIGHTS[stem.id] || 0;
    const bassWeight = BASS_STEM_WEIGHTS[stem.id] || 0;
    if (!harmonicWeight && !bassWeight) continue;
    if (extname(stem.filename || "").toLowerCase() !== ".wav") continue;

    try {
      loaded.push({
        id: stem.id,
        audio: await readPcm16WavFromFile(join(stemsDir, stem.filename)),
        harmonicWeight,
        bassWeight
      });
    } catch {
      // Stem-specific analysis is opportunistic; the full mix remains the fallback.
    }
  }

  return loaded;
}

function chromaEvidenceForBar(audio, stemAudios, bar) {
  const chroma = Array(12).fill(0);
  const bassChroma = Array(12).fill(0);
  let harmonicWeight = 0;
  let bassWeight = 0;

  const sourceChroma = pitchClassEnergy(audio, bar.start, bar.end, { minMidi: 36, maxMidi: 84 });
  const sourceBassChroma = pitchClassEnergy(audio, bar.start, bar.end, { minMidi: 28, maxMidi: 52 });
  addWeightedChroma(chroma, sourceChroma, 0.45);
  addWeightedChroma(bassChroma, sourceBassChroma, 0.7);
  harmonicWeight += 0.45;
  bassWeight += 0.7;

  for (const stem of stemAudios) {
    if (segmentRms(stem.audio, bar.start, bar.end) < MIN_ANALYSIS_STEM_RMS) continue;

    if (stem.harmonicWeight) {
      const stemChroma = pitchClassEnergy(stem.audio, bar.start, bar.end, { minMidi: 36, maxMidi: 84 });
      addWeightedChroma(chroma, stemChroma, stem.harmonicWeight);
      harmonicWeight += stem.harmonicWeight;
    }

    if (stem.bassWeight) {
      const stemBassChroma = pitchClassEnergy(stem.audio, bar.start, bar.end, { minMidi: 28, maxMidi: 52 });
      addWeightedChroma(bassChroma, stemBassChroma, stem.bassWeight);
      bassWeight += stem.bassWeight;
    }
  }

  return {
    chroma: normalizeChroma(harmonicWeight ? chroma.map((value) => value / harmonicWeight) : chroma),
    bassChroma: normalizeChroma(bassWeight ? bassChroma.map((value) => value / bassWeight) : bassChroma)
  };
}

const chordQualities = [
  { suffix: "", romanSuffix: "", intervals: [0, 4, 7], label: "major" },
  { suffix: "m", romanSuffix: "", intervals: [0, 3, 7], label: "minor" },
  { suffix: "7", romanSuffix: "7", intervals: [0, 4, 7, 10], label: "dominant7" },
  { suffix: "m7", romanSuffix: "7", intervals: [0, 3, 7, 10], label: "minor7" },
  { suffix: "maj7", romanSuffix: "maj7", intervals: [0, 4, 7, 11], label: "major7" },
  { suffix: "sus2", romanSuffix: "sus2", intervals: [0, 2, 7], label: "sus2" },
  { suffix: "sus4", romanSuffix: "sus4", intervals: [0, 5, 7], label: "sus4" },
  { suffix: "dim", romanSuffix: "dim", intervals: [0, 3, 6], label: "diminished" }
];

function scoreChord(chroma, bassChroma, root, quality) {
  const template = new Set(quality.intervals.map((interval) => (root + interval) % 12));
  const templateEnergy = [...template].reduce((sum, pitchClass) => sum + chroma[pitchClass], 0);
  const outsideEnergy = chroma.reduce((sum, value, pitchClass) => {
    return template.has(pitchClass) ? sum : sum + value;
  }, 0);
  const rootBonus = chroma[root] * 0.8 + bassChroma[root] * 0.55;
  const bassChordToneBonus = [...template].reduce((sum, pitchClass) => sum + bassChroma[pitchClass], 0) * 0.22;
  const thirdOrSuspensionBonus = quality.intervals.some((interval) => [2, 3, 4, 5].includes(interval))
    ? Math.max(...quality.intervals.filter((interval) => [2, 3, 4, 5].includes(interval)).map((interval) => chroma[(root + interval) % 12])) * 0.5
    : 0;
  return templateEnergy + rootBonus + bassChordToneBonus + thirdOrSuspensionBonus - outsideEnergy * 0.08;
}

function chordName(root, quality) {
  return `${NOTE_NAMES[root]}${quality.suffix}`;
}

function simplifyWeakExtension(root, quality, chroma) {
  const simpleQualityByLabel = {
    dominant7: "major",
    major7: "major",
    minor7: "minor"
  };
  const simpleLabel = simpleQualityByLabel[quality.label];
  if (!simpleLabel) return quality;

  const seventhInterval = quality.label === "major7" ? 11 : 10;
  const triadIntervals = simpleLabel === "minor" ? [0, 3, 7] : [0, 4, 7];
  const triadEnergy = Math.max(...triadIntervals.map((interval) => chroma[(root + interval) % 12]));
  const seventhEnergy = chroma[(root + seventhInterval) % 12];
  if (seventhEnergy >= triadEnergy * 0.55) return quality;

  return chordQualities.find((candidate) => candidate.label === simpleLabel) || quality;
}

function estimateChord(chroma, bassChroma) {
  let best = null;
  let secondBestScore = -Infinity;

  for (let root = 0; root < 12; root += 1) {
    for (const quality of chordQualities) {
      const score = scoreChord(chroma, bassChroma, root, quality);
      if (!best || score > best.score) {
        secondBestScore = best?.score ?? -Infinity;
        best = { root, quality, score };
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }
  }

  const margin = best ? best.score - secondBestScore : 0;
  const confidence = Math.max(0.15, Math.min(0.92, 0.35 + margin / 4));
  return {
    root: best?.root ?? 0,
    quality: best ? simplifyWeakExtension(best.root, best.quality, chroma) : chordQualities[0],
    confidence: Number(confidence.toFixed(2))
  };
}

function keyProfileScore(chroma, tonic, mode) {
  const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  const profile = mode === "minor" ? minorProfile : majorProfile;
  return profile.reduce((sum, weight, index) => sum + weight * chroma[(tonic + index) % 12], 0);
}

function estimateKey(aggregateChroma) {
  let best = { tonic: 0, mode: "major", score: -Infinity };
  let secondBestScore = -Infinity;

  for (let tonic = 0; tonic < 12; tonic += 1) {
    for (const mode of ["major", "minor"]) {
      const score = keyProfileScore(aggregateChroma, tonic, mode);
      if (score > best.score) {
        secondBestScore = best.score;
        best = { tonic, mode, score };
      } else if (score > secondBestScore) {
        secondBestScore = score;
      }
    }
  }

  const margin = best.score - secondBestScore;
  return {
    tonic: NOTE_NAMES[best.tonic],
    mode: best.mode,
    confidence: Number(Math.max(0.2, Math.min(0.9, 0.4 + margin / 8)).toFixed(2)),
    tonicPitchClass: best.tonic
  };
}

function adjustKeyWithChordSequence(key, chordDrafts) {
  const firstChord = chordDrafts[0];
  if (!firstChord || key.mode !== "minor") return key;

  const relativeMajor = (key.tonicPitchClass + 3) % 12;
  const startsOnRelativeMajor =
    firstChord.root === relativeMajor &&
    firstChord.quality.label === "major";
  if (!startsOnRelativeMajor) return key;

  return {
    tonic: NOTE_NAMES[relativeMajor],
    mode: "major",
    confidence: Number(Math.min(key.confidence, 0.58).toFixed(2)),
    tonicPitchClass: relativeMajor
  };
}

function userProvidedAnalysisKey(value) {
  const tonicPitchClass = NOTE_PITCH_CLASSES[value?.tonic];
  if (!Number.isInteger(tonicPitchClass) || !["major", "minor"].includes(value?.mode)) return null;
  return {
    tonic: value.tonic,
    mode: value.mode,
    confidence: 1,
    tonicPitchClass,
    source: "user"
  };
}

function romanNumeral(root, quality, key) {
  const majorScale = [0, 2, 4, 5, 7, 9, 11];
  const minorScale = [0, 2, 3, 5, 7, 8, 10];
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
  const scale = key.mode === "minor" ? minorScale : majorScale;
  const tonic = key.tonicPitchClass ?? NOTE_NAMES.indexOf(key.tonic);
  const relative = (root - tonic + 12) % 12;
  const degree = scale.indexOf(relative);
  const base = degree === -1 ? NOTE_NAMES[root] : numerals[degree];
  const minorish = quality.label === "minor" || quality.label === "minor7" || quality.label === "diminished";
  const numeral = degree === -1 ? base : minorish ? base.toLowerCase() : base;
  return `${numeral}${quality.romanSuffix}`;
}

function chordSegmentsForTimingGrid(beatGrid, durationSeconds) {
  if (!beatGrid?.tempoMap) return null;
  const segments = [];
  const beatsPerBar = Math.max(1, Math.round(Number(beatGrid.beatsPerBar) || DEFAULT_BEATS_PER_BAR));

  for (let beatIndex = 0; beatIndex < MAX_CHORD_CHART_CHORDS * beatsPerBar; beatIndex += 1) {
    const rawStart = absoluteBeatToSeconds(beatGrid, beatIndex);
    const rawEnd = absoluteBeatToSeconds(beatGrid, beatIndex + 1);
    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || rawEnd <= rawStart) break;
    if (rawStart >= durationSeconds) break;
    if (rawEnd <= 0) continue;
    const start = Math.max(0, rawStart);
    const end = Math.min(durationSeconds, rawEnd);
    if (end - start < Math.min(0.18, (rawEnd - rawStart) * 0.4)) continue;
    segments.push({
      bar: Math.floor(beatIndex / beatsPerBar) + 1,
      beat: (beatIndex % beatsPerBar) + 1,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3))
    });
  }

  return segments.length ? segments : null;
}

function chordSegmentsForBeatGrid(beatGrid, durationSeconds) {
  const timingSegments = chordSegmentsForTimingGrid(beatGrid, durationSeconds);
  if (timingSegments) return timingSegments;
  if (!beatGrid.bars?.length || !finitePositiveNumber(beatGrid.beatDurationSeconds)) {
    return [{ bar: 1, beat: 1, start: 0, end: durationSeconds }];
  }

  const segments = [];
  for (const bar of beatGrid.bars) {
    for (let beatIndex = 0; beatIndex < beatGrid.beatsPerBar; beatIndex += 1) {
      const start = bar.start + beatIndex * beatGrid.beatDurationSeconds;
      const end = Math.min(bar.end, start + beatGrid.beatDurationSeconds);
      const segmentDuration = end - start;
      if (segmentDuration < Math.min(0.28, beatGrid.beatDurationSeconds * 0.5)) continue;
      segments.push({
        bar: bar.bar,
        beat: beatIndex + 1,
        start: Number(Math.max(0, start).toFixed(3)),
        end: Number(end.toFixed(3))
      });
    }
  }

  return segments.length ? segments : [{ bar: 1, beat: 1, start: 0, end: durationSeconds }];
}

function sameChord(left, right) {
  return left.root === right.root && left.quality.label === right.quality.label;
}

function smoothIsolatedChordDrafts(chordDrafts) {
  return chordDrafts.map((chord, index) => {
    const previous = chordDrafts[index - 1];
    const next = chordDrafts[index + 1];
    if (!previous || !next || sameChord(chord, previous) || !sameChord(previous, next)) {
      return { ...chord };
    }

    return {
      ...chord,
      root: previous.root,
      quality: previous.quality,
      confidence: Number(Math.min(previous.confidence, next.confidence).toFixed(2))
    };
  });
}

function mergeAdjacentChordDrafts(chordDrafts) {
  const merged = [];

  for (const chord of chordDrafts) {
    const previous = merged[merged.length - 1];
    if (previous && previous.bar === chord.bar && sameChord(previous, chord)) {
      previous.end = chord.end;
      previous.confidence = Number(Math.min(previous.confidence, chord.confidence).toFixed(2));
      continue;
    }
    merged.push({ ...chord });
  }

  return merged;
}

async function analyzeHarmonyFromAudio(
  extracted,
  separation,
  { timingGrid = null, fixedKey = null, sequenceSmoothing = "isolated" } = {}
) {
  const startedAt = Date.now();
  const audio = await readPcm16WavFromFile(extracted.path);
  const stemAudios = await loadAnalysisStemAudios(extracted, separation);
  const beatGrid = timingGrid || estimateBeatGrid(audio);
  const segments = chordSegmentsForBeatGrid(beatGrid, audio.durationSeconds);
  const aggregateChroma = Array(12).fill(0);
  const chordDrafts = [];

  for (const segment of segments) {
    const { chroma, bassChroma } = chromaEvidenceForBar(audio, stemAudios, segment);
    for (let index = 0; index < 12; index += 1) {
      aggregateChroma[index] += chroma[index];
    }
    const estimated = estimateChord(chroma, bassChroma);
    chordDrafts.push({ ...segment, ...estimated });
  }

  const sequenceChordDrafts = sequenceSmoothing === "none"
    ? chordDrafts
    : smoothIsolatedChordDrafts(chordDrafts);
  const mergedChordDrafts = mergeAdjacentChordDrafts(sequenceChordDrafts);
  const aggregateMax = Math.max(...aggregateChroma);
  const normalizedAggregate = aggregateMax > 0
    ? aggregateChroma.map((value) => value / aggregateMax)
    : aggregateChroma;
  const key = userProvidedAnalysisKey(fixedKey) ||
    adjustKeyWithChordSequence(estimateKey(normalizedAggregate), mergedChordDrafts);
  const chords = mergedChordDrafts.map((chord) => ({
    start: chord.start,
    end: chord.end,
    bar: chord.bar,
    beat: chord.beat,
    name: chordName(chord.root, chord.quality),
    roman: romanNumeral(chord.root, chord.quality, key),
    confidence: chord.confidence,
    source: timingGrid ? "corrected-timing-chroma" : "beat-aligned-chroma"
  }));
  const { tonicPitchClass, ...publicKey } = key;

  return {
    durationSeconds: extracted.durationSeconds || audio.durationSeconds,
    harmonySource: timingGrid ? "real-audio-corrected-timing-v2" : "real-audio-analysis-v2",
    analysisSource: "source-audio.wav",
    key: publicKey,
    chords,
    melody: [],
    beatGrid,
    analysis: {
      name: timingGrid ? "beat-aware-chroma-corrected-timing-v2" : "beat-aware-chroma-v3",
      available: true,
      durationMs: Date.now() - startedAt,
      keySource: key.source === "user" ? "user-override" : "estimated",
      sequenceSmoothing,
      sources: {
        fullMix: SOURCE_AUDIO_FILENAME,
        stems: separation.outputs?.map((stem) => stem.id) || []
      },
      vocabulary: [
        "major",
        "minor",
        "dominant7",
        "minor7",
        "major7",
        "sus2",
        "sus4",
        "diminished"
      ],
      limitations: [
        timingGrid
          ? "Bar and beat boundaries come from the user-corrected timing map."
          : "Beat, downbeat, meter, and bar positions are estimated from broad onset energy, not a dedicated tempo model.",
        "Chord labels are scored on beat-aligned segments; isolated one-beat changes between matching neighbors are smoothed before adjacent repeated labels are merged within each bar.",
        "The first pass favors useful conservative labels over precise extensions."
      ]
    }
  };
}

function contentTypeForPath(path, fallback = "application/octet-stream") {
  return mimeTypes[extname(path)] || fallback;
}

async function streamMediaFile(req, res, filePath, contentType) {
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;
  const range = req.headers.range;
  const baseHeaders = {
    "accept-ranges": "bytes",
    "content-type": contentType,
    "content-length": fileSize
  };

  if (!range) {
    res.writeHead(200, baseHeaders);
    createReadStream(filePath).pipe(res);
    return;
  }

  const match = range.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    res.writeHead(416, { "content-range": `bytes */${fileSize}` });
    res.end();
    return;
  }

  let start = match[1] === "" ? null : Number(match[1]);
  let end = match[2] === "" ? null : Number(match[2]);

  if (start === null && end !== null) {
    start = Math.max(fileSize - end, 0);
    end = fileSize - 1;
  } else {
    start ??= 0;
    end ??= fileSize - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    res.writeHead(416, { "content-range": `bytes */${fileSize}` });
    res.end();
    return;
  }

  end = Math.min(end, fileSize - 1);
  res.writeHead(206, {
    ...baseHeaders,
    "content-length": end - start + 1,
    "content-range": `bytes ${start}-${end}/${fileSize}`
  });
  createReadStream(filePath, { start, end }).pipe(res);
}

function safePublicPath(urlPath) {
  const pathOnly = urlPath.split("?")[0];
  const requested = pathOnly === "/" ? "/index.html" : pathOnly;
  const decoded = decodeURIComponent(requested);
  const fullPath = normalize(join(PUBLIC_DIR, decoded));
  if (!fullPath.startsWith(PUBLIC_DIR)) return null;
  return fullPath;
}

async function serveStatic(req, res) {
  const fullPath = safePublicPath(req.url || "/");
  if (!fullPath) {
    notFound(res);
    return;
  }

  try {
    const ext = extname(fullPath);
    const body = await readFile(fullPath);
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "content-length": body.length
    });
    res.end(body);
  } catch {
    notFound(res);
  }
}

async function readRequestBody(req) {
  const chunks = [];
  let size = 0;
  const contentLengthHeader = req.headers["content-length"];
  const contentLength = Array.isArray(contentLengthHeader)
    ? Number(contentLengthHeader[0])
    : Number(contentLengthHeader);

  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_REQUEST_BYTES) {
    throw new UploadTooLargeError();
  }

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD_REQUEST_BYTES) {
      throw new UploadTooLargeError();
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function parseContentDisposition(value) {
  const result = {};
  for (const part of value.split(";")) {
    const [rawKey, rawValue] = part.trim().split("=");
    if (!rawValue) continue;
    result[rawKey] = rawValue.replace(/^"|"$/g, "");
  }
  return result;
}

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let cursor = buffer.indexOf(delimiter);

  while (cursor !== -1) {
    cursor += delimiter.length;
    if (buffer.slice(cursor, cursor + 2).toString() === "--") break;
    if (buffer.slice(cursor, cursor + 2).toString() === "\r\n") cursor += 2;

    const next = buffer.indexOf(delimiter, cursor);
    if (next === -1) break;

    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd === -1 || headerEnd > next) break;

    const headerText = buffer.slice(cursor, headerEnd).toString("utf8");
    const headers = new Map();
    for (const line of headerText.split("\r\n")) {
      const separator = line.indexOf(":");
      if (separator === -1) continue;
      headers.set(line.slice(0, separator).toLowerCase(), line.slice(separator + 1).trim());
    }

    let contentEnd = next;
    if (buffer.slice(contentEnd - 2, contentEnd).toString() === "\r\n") {
      contentEnd -= 2;
    }

    const disposition = parseContentDisposition(headers.get("content-disposition") || "");
    parts.push({
      name: disposition.name,
      filename: disposition.filename,
      contentType: headers.get("content-type") || "application/octet-stream",
      data: buffer.slice(headerEnd + 4, contentEnd)
    });

    cursor = next;
  }

  return parts;
}

function createMockMetadata(durationSeconds = MOCK_DURATION_SECONDS) {
  const beatDurationSeconds = 1;
  const beatsPerBar = 4;
  const bars = [];
  for (let start = 0, number = 1; start < durationSeconds; start += beatDurationSeconds * beatsPerBar, number += 1) {
    bars.push({
      number,
      start,
      end: Math.min(durationSeconds, start + beatDurationSeconds * beatsPerBar)
    });
  }

  return {
    durationSeconds,
    key: {
      tonic: "C",
      mode: "major",
      confidence: 0.72
    },
    beatGrid: {
      bpm: 60,
      beatsPerBar,
      beatDurationSeconds,
      beatOffsetSeconds: 0,
      downbeatOffsetSeconds: 0,
      downbeatConfidence: 1,
      bars
    },
    chords: [
      { bar: 1, beat: 1, start: 0, end: 4, name: "Cmaj7", roman: "Imaj7" },
      { bar: 2, beat: 1, start: 4, end: 8, name: "Am7", roman: "vi7" },
      { bar: 3, beat: 1, start: 8, end: 12, name: "Fmaj7", roman: "IVmaj7" },
      { bar: 4, beat: 1, start: 12, end: 16, name: "G7", roman: "V7" }
    ],
    melody: [
      { time: 0, notes: ["E4", "G4"] },
      { time: 2, notes: ["D4", "E4"] },
      { time: 4, notes: ["C4", "E4"] },
      { time: 6, notes: ["A3", "C4"] },
      { time: 8, notes: ["F3", "A3"] },
      { time: 10, notes: ["G3", "A3"] },
      { time: 12, notes: ["B3", "D4"] },
      { time: 14, notes: ["G3", "C4"] }
    ]
  };
}

function noteFrequency(note) {
  const match = note.match(/^([A-G])(#|b)?(-?\d)$/);
  if (!match) return 440;

  const semitones = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11
  };

  const [, name, accidental, octaveText] = match;
  const accidentalOffset = accidental === "#" ? 1 : accidental === "b" ? -1 : 0;
  const octave = Number(octaveText);
  const midi = (octave + 1) * 12 + semitones[name] + accidentalOffset;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function activePianoNotesAt(time) {
  if (time < 4) return ["C3", "E3", "G3", "E4"];
  if (time < 8) return ["A3", "C4", "E4", "G4"];
  if (time < 12) return ["F3", "A3", "C4", "E4"];
  return ["G3", "B3", "D4", "F3"];
}

function activeBassNoteAt(time) {
  if (time < 4) return "C2";
  if (time < 8) return "A1";
  if (time < 12) return "F2";
  return "G1";
}

function activeGuitarNotesAt(time) {
  if (time < 4) return ["C4", "E4", "B4"];
  if (time < 8) return ["A3", "E4", "G4"];
  if (time < 12) return ["F3", "C4", "E4"];
  return ["G3", "D4", "F4"];
}

function drumSample(time) {
  const beat = time % 1;
  const halfBeat = time % 0.5;
  const bar = time % 4;
  let sample = 0;

  if (beat < 0.13 && bar < 0.18) {
    sample += Math.sin(2 * Math.PI * (62 - beat * 190) * time) * Math.exp(-beat * 32) * 0.95;
  }

  if (beat < 0.12 && bar > 1.95 && bar < 2.25) {
    const noise = Math.sin(time * 9281.3) * Math.sin(time * 1237.9);
    sample += noise * Math.exp(-beat * 23) * 0.55;
  }

  if (halfBeat < 0.035) {
    const noise = Math.sin(time * 14831.7) * Math.sin(time * 5341.1);
    sample += noise * Math.exp(-halfBeat * 85) * 0.16;
  }

  return sample;
}

function bassSample(time) {
  const frequency = noteFrequency(activeBassNoteAt(time));
  const beat = time % 1;
  const envelope = 0.65 + 0.35 * Math.exp(-beat * 5);
  return (
    Math.sin(2 * Math.PI * frequency * time) * 0.46 +
    Math.sin(2 * Math.PI * frequency * 2 * time) * 0.12
  ) * envelope;
}

function guitarSample(time) {
  const notes = activeGuitarNotesAt(time);
  const beat = time % 0.5;
  const strum = beat < 0.23 ? Math.exp(-beat * 9) : 0;
  let sample = 0;

  for (const note of notes) {
    const frequency = noteFrequency(note);
    sample += Math.sin(2 * Math.PI * frequency * time) * 0.12 * strum;
    sample += Math.sin(2 * Math.PI * frequency * 3 * time) * 0.025 * strum;
  }

  return sample;
}

function pianoSample(time) {
  const beat = time % 1;
  const envelope = Math.exp(-beat * 2.8);
  const notes = activePianoNotesAt(time);
  let sample = 0;

  for (const note of notes) {
    const frequency = noteFrequency(note);
    sample += Math.sin(2 * Math.PI * frequency * time) * 0.17 * envelope;
    sample += Math.sin(2 * Math.PI * frequency * 2 * time) * 0.04 * envelope;
  }

  const tremolo = 0.88 + 0.12 * Math.sin(2 * Math.PI * 5 * time);
  return sample * tremolo;
}

function stemSample(stemId, time) {
  if (stemId === "drums") return drumSample(time);
  if (stemId === "bass") return bassSample(time);
  if (stemId === "guitar") return guitarSample(time);
  return pianoSample(time);
}

function generateMockWav(stemId = "piano") {
  const sampleRate = 44100;
  const durationSeconds = MOCK_DURATION_SECONDS;
  const totalSamples = sampleRate * durationSeconds;
  const dataBytes = totalSamples * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < totalSamples; i += 1) {
    const time = i / sampleRate;
    const value = Math.max(-1, Math.min(1, stemSample(stemId, time)));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }

  return buffer;
}

async function saveJob(job) {
  await writeFile(join(job.dir, "job.json"), JSON.stringify(job, null, 2));
}

async function createJobRecord({
  originalFilename,
  originalSize = null,
  originalType = null,
  sourcePath = null,
  sourceFilename = null,
  mockUpload = false,
  originalDurationSeconds = null,
  thumbnailDataUrl = null,
  mode = activePipelineMode
}) {
  const id = randomUUID();
  const dir = join(JOBS_DIR, id);
  await mkdir(dir, { recursive: true });

  const job = {
    id,
    mode,
    status: "queued",
    progress: 0,
    originalFilename,
    originalSize,
    originalType,
    originalDurationSeconds: normalizedDurationSeconds(originalDurationSeconds),
    thumbnailDataUrl: normalizedThumbnailDataUrl(thumbnailDataUrl),
    sourcePath,
    sourceFilename,
    mockUpload,
    dir,
    metadata: null,
    error: null,
    practiceState: {
      learningStatus: "not_started",
      playbackRate: 1,
      loopStart: 0,
      loopEnd: 4,
      loopEnabled: false,
      countInBars: 0,
      startAtBarOne: false,
      lastPosition: 0,
      metronomeEnabled: false,
      metronomeVolume: 0.45,
      metronomeAccent: true,
      metronomeSolo: false,
      gridOverrides: {},
      tempoMap: null,
      keyOverride: null,
      chordChart: null,
      chordChartBackup: null,
      sections: [],
      harmonyView: {
        barsPerRow: 2,
        chordDisplay: "both",
        sectionInfoVisible: true
      },
      stemStates: {}
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(id, job);
  await saveJob(job);
  return job;
}

function defaultStemState(stemId) {
  return { muted: false, solo: false, volume: 1, stemId };
}

function clampNumber(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function normalizeChordChart(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.chords)) return null;

  const divisionsPerQuarter = Math.round(
    clampNumber(Number(value.divisionsPerQuarter), DEFAULT_CHORD_DIVISIONS_PER_QUARTER, 1, 24)
  );

  const chords = value.chords
    .map((chord) => {
      const raw = String(chord?.raw || "").trim().slice(0, 48);
      const rawDurationDiv = Number(chord?.durationDiv);
      const bar = Math.round(clampNumber(Number(chord?.bar), 1, 1, MAX_CHORD_CHART_BARS));
      const offsetDiv = Math.round(clampNumber(Number(chord?.offsetDiv), 0, 0, MAX_CHORD_CHART_DIVISIONS));
      const durationDiv = Math.round(clampNumber(rawDurationDiv, null, 1, MAX_CHORD_CHART_DIVISIONS));
      if (!raw || !Number.isFinite(bar) || !Number.isFinite(offsetDiv) || !Number.isFinite(durationDiv)) return null;

      const id = String(chord?.id || randomUUID()).trim().slice(0, 64) || randomUUID();
      return {
        id,
        bar,
        offsetDiv,
        durationDiv,
        raw,
        source: "user"
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.bar - right.bar || left.offsetDiv - right.offsetDiv)
    .slice(0, MAX_CHORD_CHART_CHORDS);

  return {
    version: CHORD_CHART_VERSION,
    divisionsPerQuarter,
    chords
  };
}

function normalizeHarmonyView(value) {
  const supportedBarsPerRow = new Set([1, 2, 4, 8]);
  const supportedChordDisplays = new Set(["both", "name", "roman"]);
  const barsPerRow = Math.round(clampNumber(Number(value?.barsPerRow), 2, 1, 8));
  const chordDisplay = supportedChordDisplays.has(value?.chordDisplay) ? value.chordDisplay : "both";
  return {
    barsPerRow: supportedBarsPerRow.has(barsPerRow) ? barsPerRow : 2,
    chordDisplay,
    sectionInfoVisible: value?.sectionInfoVisible !== false
  };
}

function normalizeSections(value) {
  return normalizeSectionRanges(value, {
    idFactory: randomUUID,
    maxBar: MAX_CHORD_CHART_BARS,
    maxCount: MAX_SECTION_COUNT
  });
}

function ensurePracticeState(job) {
  const existingStemStates = job.practiceState?.stemStates || {};
  const stemStates = {};
  const gridOverrides = {};
  const overrideBpm = Number(job.practiceState?.gridOverrides?.bpm);
  if (Number.isFinite(overrideBpm) && overrideBpm > 0) {
    gridOverrides.bpm = Number(clampNumber(overrideBpm, 60, 30, 260).toFixed(1));
  }
  const overrideBeatsPerBar = Number(job.practiceState?.gridOverrides?.beatsPerBar);
  const overrideBeatUnit = Number(job.practiceState?.gridOverrides?.beatUnit) || 4;
  const supportedMeters = new Set(["3/4", "4/4", "5/4", "6/8", "7/8", "12/8"]);
  if (supportedMeters.has(`${overrideBeatsPerBar}/${overrideBeatUnit}`)) {
    gridOverrides.beatsPerBar = overrideBeatsPerBar;
    gridOverrides.beatUnit = overrideBeatUnit;
  }
  const overrideDownbeat = Number(job.practiceState?.gridOverrides?.downbeatOffsetSeconds);
  if (Number.isFinite(overrideDownbeat)) {
    gridOverrides.downbeatOffsetSeconds = Number(
      clampNumber(overrideDownbeat, 0, MIN_BAR_START_SECONDS, MAX_BAR_START_SECONDS).toFixed(2)
    );
  }

  const keyOverride = job.practiceState?.keyOverride;
  const noteNames = new Set(["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]);
  const normalizedKeyOverride =
    keyOverride &&
    typeof keyOverride.tonic === "string" &&
    noteNames.has(keyOverride.tonic) &&
    ["major", "minor"].includes(keyOverride.mode)
      ? { tonic: keyOverride.tonic, mode: keyOverride.mode }
      : null;

  for (const stem of stemsForJob(job)) {
    stemStates[stem.id] = {
      muted: false,
      solo: false,
      volume: 1,
      ...(existingStemStates[stem.id] || {})
    };
  }

  job.practiceState = {
    learningStatus: ["not_started", "practicing", "learned"].includes(job.practiceState?.learningStatus)
      ? job.practiceState.learningStatus
      : "not_started",
    playbackRate: clampNumber(Number(job.practiceState?.playbackRate), 1, 0.25, 2),
    loopStart: clampNumber(Number(job.practiceState?.loopStart), 0, 0, 60 * 60),
    loopEnd: clampNumber(Number(job.practiceState?.loopEnd), 4, 0, 60 * 60),
    loopEnabled: Boolean(job.practiceState?.loopEnabled),
    countInBars: [0, 1].includes(Number(job.practiceState?.countInBars)) ? Number(job.practiceState.countInBars) : 0,
    startAtBarOne: Boolean(job.practiceState?.startAtBarOne),
    lastPosition: clampNumber(Number(job.practiceState?.lastPosition), 0, 0, 60 * 60),
    metronomeEnabled: Boolean(job.practiceState?.metronomeEnabled),
    metronomeVolume: clampNumber(Number(job.practiceState?.metronomeVolume), 0.45, 0, 1),
    metronomeAccent: true,
    metronomeSolo: Boolean(job.practiceState?.metronomeSolo),
    gridOverrides,
    tempoMap: normalizeTempoMap(job.practiceState?.tempoMap),
    keyOverride: normalizedKeyOverride,
    chordChart: normalizeChordChart(job.practiceState?.chordChart),
    chordChartBackup: job.practiceState?.chordChartBackup?.chordChart
      ? {
          createdAt: String(job.practiceState.chordChartBackup.createdAt || ""),
          reason: "corrected-timing-reanalysis",
          chordChart: normalizeChordChart(job.practiceState.chordChartBackup.chordChart)
        }
      : null,
    sections: normalizeSections(job.practiceState?.sections),
    harmonyView: normalizeHarmonyView(job.practiceState?.harmonyView),
    stemStates
  };

  return job.practiceState;
}

function publicJob(job) {
  const stems = stemsForJob(job);

  return {
    id: job.id,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    pipelineStage: job.metadata?.pipelineStage || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    originalFilename: job.originalFilename,
    originalSize: job.originalSize,
    originalType: job.originalType,
    thumbnailDataUrl: job.thumbnailDataUrl || null,
    mockUpload: job.mockUpload,
    error: job.error || null,
    source: job.sourceFilename
      ? {
          filename: job.sourceFilename,
          contentType: job.originalType,
          size: job.originalSize
        }
      : null,
    practiceState: ensurePracticeState(job),
    result: job.status === "complete"
      ? {
          audioUrl: `/api/jobs/${job.id}/piano.wav`,
          waveformUrl: `/api/jobs/${job.id}/waveform.json`,
          stems: stems.map((stem) => publicStem(job, stem)),
          metadata: job.metadata
        }
      : null
  };
}

async function availableExternalMockStems() {
  const resolved = [];

  for (const stem of externalMockStemSources) {
    const sourcePath = join(JOBS_DIR, stem.sourceFilename);
    try {
      await access(sourcePath);
    } catch {
      return null;
    }
    resolved.push({ ...stem, sourcePath });
  }

  return resolved;
}

async function copyExternalMockStems(job) {
  const externalStems = await availableExternalMockStems();
  if (!externalStems) return false;

  await mkdir(join(job.dir, "stems"), { recursive: true });

  for (const stem of externalStems) {
    await copyFile(stem.sourcePath, join(job.dir, "stems", stem.filename));
  }

  job.stems = externalStems.map(({ sourceFilename, sourcePath, ...stem }) => stem);
  return true;
}

async function generateFallbackMockStems(job) {
  await mkdir(join(job.dir, "stems"), { recursive: true });
  job.stems = generatedStemDescriptors();

  for (const stem of job.stems) {
    const wav = generateMockWav(stem.id);
    await writeFile(join(job.dir, "stems", stem.filename), wav);
    if (stem.id === "piano") {
      await writeFile(join(job.dir, "piano.wav"), wav);
    }
  }
}

async function completeMockJob(job) {
  const usedExternalStems = await copyExternalMockStems(job);
  if (!usedExternalStems) {
    await generateFallbackMockStems(job);
  }

  job.status = "complete";
  job.progress = 100;
  job.metadata = createMockMetadata(job.originalDurationSeconds || MOCK_DURATION_SECONDS);
  await writeWaveformAsset(job, mockWaveformEnvelope(job.metadata.durationSeconds));
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
}

async function runMockPipeline(job) {
  const steps = [
    { status: "queued", progress: 10, delay: 350 },
    { status: "processing", progress: 35, delay: 700 },
    { status: "processing", progress: 68, delay: 900 },
    { status: "processing", progress: 90, delay: 700 }
  ];

  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, step.delay));
    job.status = step.status;
    job.progress = step.progress;
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  }

  await completeMockJob(job);
}

async function failJob(job, message, details = {}) {
  const { progress, ...failureDetails } = details;
  job.status = "failed";
  job.progress = Number.isFinite(progress) ? progress : Math.max(Number(job.progress) || 0, 15);
  job.error = message;
  job.metadata = {
    ...(job.metadata || {}),
    failure: {
      message,
      ...failureDetails,
      failedAt: new Date().toISOString()
    }
  };
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const { onStdout, onStderr, ...spawnOptions } = options;
    const startedAt = Date.now();
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...spawnOptions });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stdout = `${stdout}${text}`.slice(-4000);
      onStdout?.(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr = `${stderr}${text}`.slice(-4000);
      onStderr?.(text);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        code: null,
        error,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        error: null,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function updateProcessingProgress(job, progress, metadataPatch = {}) {
  if (job.status !== "processing") return;

  const nextProgress = Math.min(99, Math.max(Number(job.progress) || 0, Math.round(progress)));
  if (nextProgress <= (Number(job.progress) || 0)) return;

  job.progress = nextProgress;
  job.metadata = {
    ...(job.metadata || {}),
    ...metadataPatch
  };
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
}

function demucsProgressFromOutput(text) {
  const matches = [...text.matchAll(/(^|[^\d])(\d{1,3})(?:\.\d+)?%/g)];
  const values = matches
    .map((match) => Number(match[2]))
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100);
  return values.length ? values.at(-1) : null;
}

function jobProgressFromSeparatorPercent(percent) {
  return Math.min(96, Math.max(56, 55 + Math.round((percent / 100) * 41)));
}

async function ffmpegVersionLine() {
  const result = await runProcess(FFMPEG_PATH, ["-version"]);
  if (!result.ok) return null;
  return result.stdout.split(/\r?\n/).find(Boolean) || null;
}

async function demucsVersionLine() {
  const result = await runProcess(DEMUCS_PATH, ["--version"], {
    env: { ...process.env, TORCH_HOME: DEMUCS_TORCH_HOME }
  });
  if (!result.ok) return null;
  return result.stdout.split(/\r?\n/).find(Boolean) || null;
}

async function extractSourceAudio(job) {
  const outputFilename = SOURCE_AUDIO_FILENAME;
  const outputPath = join(job.dir, outputFilename);
  const args = [
    "-hide_banner",
    "-y",
    "-i",
    job.sourcePath,
    "-map",
    "0:a:0",
    "-vn",
    "-c:a",
    SOURCE_AUDIO_CODEC,
    outputPath
  ];
  const result = await runProcess(FFMPEG_PATH, args);

  if (!result.ok) {
    const missingCommand = result.error?.code === "ENOENT";
    const message = missingCommand
      ? `FFmpeg was not found at "${FFMPEG_PATH}". Install FFmpeg or set FFMPEG_PATH, then retry real mode.`
      : "FFmpeg could not extract audio from the uploaded media.";
    throw Object.assign(new Error(message), {
      ffmpeg: {
        command: FFMPEG_PATH,
        args,
        exitCode: result.code,
        missingCommand,
        stderr: result.stderr.trim(),
        durationMs: result.durationMs
      }
    });
  }

  const outputStats = await stat(outputPath);
  const durationSeconds = await wavDurationSecondsFromFile(outputPath);
  return {
    filename: outputFilename,
    path: outputPath,
    size: outputStats.size,
    durationSeconds,
    durationMs: result.durationMs,
    command: FFMPEG_PATH,
    args,
    codec: SOURCE_AUDIO_CODEC
  };
}

async function separatePianoAndAccompaniment(job, extracted) {
  const stemsDir = join(job.dir, "stems");
  await mkdir(stemsDir, { recursive: true });

  const pianoFilename = "piano.wav";
  const accompanimentFilename = "accompaniment.wav";
  const pianoPath = join(stemsDir, pianoFilename);
  const accompanimentPath = join(stemsDir, accompanimentFilename);
  const filterGraph = [
    "[0:a]asplit=3[piano_source][low_source][high_source]",
    "[piano_source]highpass=f=170,lowpass=f=1400,volume=1.35[piano]",
    "[low_source]lowpass=f=160,volume=1.2[low]",
    "[high_source]highpass=f=1500,volume=1.0[high]",
    "[low][high]amix=inputs=2:normalize=0,alimiter=limit=0.95[accompaniment]"
  ].join(";");
  const args = [
    "-hide_banner",
    "-y",
    "-i",
    extracted.path,
    "-filter_complex",
    filterGraph,
    "-map",
    "[piano]",
    "-ac",
    "1",
    "-ar",
    "44100",
    pianoPath,
    "-map",
    "[accompaniment]",
    "-ac",
    "1",
    "-ar",
    "44100",
    accompanimentPath
  ];
  const [version, result] = await Promise.all([
    ffmpegVersionLine(),
    runProcess(FFMPEG_PATH, args)
  ]);

  if (!result.ok) {
    throw Object.assign(new Error("FFmpeg could not create piano-focused separated stems."), {
      separator: {
        name: FFMPEG_SEPARATOR_NAME,
        version,
        command: FFMPEG_PATH,
        args,
        exitCode: result.code,
        stderr: result.stderr.trim(),
        durationMs: result.durationMs
      }
    });
  }

  const [pianoStats, accompanimentStats] = await Promise.all([
    stat(pianoPath),
    stat(accompanimentPath)
  ]);
  const outputs = [
    {
      id: "piano",
      name: "Piano",
      filename: pianoFilename,
      contentType: "audio/wav",
      size: pianoStats.size
    },
    {
      id: "accompaniment",
      name: "Accompaniment",
      filename: accompanimentFilename,
      contentType: "audio/wav",
      size: accompanimentStats.size
    }
  ];

  return {
    name: FFMPEG_SEPARATOR_NAME,
    version,
    command: FFMPEG_PATH,
    args,
    filterGraph,
    durationMs: result.durationMs,
    outputs,
    limitations: [
      "This is a lightweight FFmpeg spectral split, not ML source separation.",
      "The accompaniment is made from low and high frequency bands, so midrange instruments may be removed with the piano.",
      "The piano stem is a broad midrange band and may contain vocals, guitar, synths, or other pitched material."
    ]
  };
}

async function separateWithDemucs(job, extracted) {
  const stemsDir = join(job.dir, "stems");
  const demucsOutputDir = join(job.dir, "demucs-output");
  await mkdir(stemsDir, { recursive: true });
  await mkdir(demucsOutputDir, { recursive: true });

  const args = [
    "-n",
    DEMUCS_MODEL,
    "--out",
    demucsOutputDir,
    extracted.path
  ];
  let progressBuffer = "";
  const progressSaves = [];
  const [version, result] = await Promise.all([
    demucsVersionLine(),
    runProcess(DEMUCS_PATH, args, {
      env: { ...process.env, TORCH_HOME: DEMUCS_TORCH_HOME },
      onStderr: (text) => {
        progressBuffer = `${progressBuffer}${text}`.slice(-1000);
        const separatorProgress = demucsProgressFromOutput(progressBuffer);
        if (separatorProgress === null) return;

        progressSaves.push(
          updateProcessingProgress(job, jobProgressFromSeparatorPercent(separatorProgress), {
            separator: {
              ...(job.metadata?.separator || {}),
              progressPercent: separatorProgress
            }
          })
        );
      }
    })
  ]);
  await Promise.allSettled(progressSaves);

  if (!result.ok) {
    const missingCommand = result.error?.code === "ENOENT";
    const message = missingCommand
      ? `Demucs was not found at "${DEMUCS_PATH}". Install real-mode dependencies or set DEMUCS_PATH, then retry real mode.`
      : "Demucs could not create separated stems.";
    throw Object.assign(new Error(message), {
      separator: {
        name: DEMUCS_SEPARATOR_NAME,
        version,
        command: DEMUCS_PATH,
        args,
        model: DEMUCS_MODEL,
        torchHome: DEMUCS_TORCH_HOME,
        exitCode: result.code,
        missingCommand,
        stderr: result.stderr.trim(),
        durationMs: result.durationMs
      }
    });
  }

  const sourceName = extracted.filename.replace(/\.[^.]+$/, "");
  const demucsStemDir = join(demucsOutputDir, DEMUCS_MODEL, sourceName);
  const stemIds = ["drums", "bass", "guitar", "piano", "vocals", "other"];
  const outputs = [];

  await updateProcessingProgress(job, 97, {
    separator: {
      ...(job.metadata?.separator || {}),
      progressPercent: 100
    }
  });

  for (const stemId of stemIds) {
    const filename = `${stemId}.wav`;
    const sourcePath = join(demucsStemDir, filename);
    const targetPath = join(stemsDir, filename);
    await copyFile(sourcePath, targetPath);
    const outputStats = await stat(targetPath);
    outputs.push({
      id: stemId,
      name: stemId.charAt(0).toUpperCase() + stemId.slice(1),
      filename,
      contentType: "audio/wav",
      size: outputStats.size
    });
  }

  return {
    name: DEMUCS_SEPARATOR_NAME,
    version,
    command: DEMUCS_PATH,
    args,
    model: DEMUCS_MODEL,
    torchHome: DEMUCS_TORCH_HOME,
    durationMs: result.durationMs,
    outputs,
    limitations: [
      "Demucs is the first accepted real separator for the POC after listening tests.",
      "The main use case is muting/removing piano for play-along; solo piano may contain artifacts or crackle.",
      "Dense mixes and screen-recorded audio may still leak piano into other stems."
    ]
  };
}

async function runSelectedSeparator(job, extracted) {
  if (REAL_SEPARATOR === "ffmpeg-spectral") {
    return separatePianoAndAccompaniment(job, extracted);
  }
  return separateWithDemucs(job, extracted);
}

async function runRealPipeline(job) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  job.status = "processing";
  job.progress = 15;
  job.metadata = {
    realMode: true,
    pipelineStage: "source-audio-extraction",
    source: {
      filename: job.sourceFilename,
      contentType: job.originalType,
      size: job.originalSize
    },
    ffmpeg: {
      command: FFMPEG_PATH,
      available: null,
      durationMs: null,
      outputFilename: SOURCE_AUDIO_FILENAME,
      outputCodec: SOURCE_AUDIO_CODEC,
      outputSize: null
    },
    separator: {
      name: REAL_SEPARATOR_NAME,
      available: null,
      durationMs: null,
      outputs: []
    },
    limitations: [
      REAL_SEPARATOR === "ffmpeg-spectral"
        ? "Source-audio extraction and a narrow piano-focused FFmpeg spectral split are real in this phase."
        : "Source-audio extraction and Demucs stem separation are real in this phase.",
      REAL_SEPARATOR === "ffmpeg-spectral"
        ? "The separator is a heuristic spike, not production-quality source separation."
        : "Demucs output is accepted for play-along piano removal in the POC, but solo piano may contain artifacts.",
      "Harmony cues are estimated from bar-aligned full-mix audio analysis and should be treated as approximate."
    ]
  };
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  try {
    const extracted = await extractSourceAudio(job);
    await writeWaveformAsset(job, waveformEnvelope(await readPcm16WavFromFile(extracted.path)));
    job.progress = 55;
    job.metadata = {
      ...job.metadata,
      pipelineStage: "piano-focused-separation",
      ffmpeg: {
        command: extracted.command,
        available: true,
        durationMs: extracted.durationMs,
        durationSeconds: extracted.durationSeconds,
        outputFilename: extracted.filename,
        outputCodec: extracted.codec,
        outputSize: extracted.size
      }
    };
    job.updatedAt = new Date().toISOString();
    await saveJob(job);

    const separation = await runSelectedSeparator(job, extracted);
    await updateProcessingProgress(job, 98, {
      pipelineStage: "audio-analysis"
    });
    const harmonicMetadata = await analyzeHarmonyFromAudio(extracted, separation);
    job.stems = separation.outputs.map((stem) => ({
      id: stem.id,
      name: stem.name,
      filename: stem.filename,
      contentType: stem.contentType,
      kind: "separated-stem"
    }));
    job.status = "complete";
    job.progress = 100;
    job.metadata = {
      ...job.metadata,
      ...harmonicMetadata,
      pipelineStage: "piano-focused-separated",
      durationSeconds: extracted.durationSeconds || harmonicMetadata.durationSeconds,
      ffmpeg: {
        command: extracted.command,
        available: true,
        durationMs: extracted.durationMs,
        durationSeconds: extracted.durationSeconds,
        outputFilename: extracted.filename,
        outputCodec: extracted.codec,
        outputSize: extracted.size
      },
      separator: {
        ...separation,
        available: true
      }
    };
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  } catch (error) {
    await failJob(job, error.message || "Real-mode audio processing failed.", {
      pipelineStage: job.metadata?.pipelineStage || "source-audio-extraction",
      sourceStored: Boolean(job.sourcePath),
      ffmpeg: error.ffmpeg || {
        command: FFMPEG_PATH,
        available: false
      },
      separator: error.separator
    });
  }
}

async function handleCreateJob(req, res) {
  const contentType = req.headers["content-type"] || "";
  const selectedMode = activePipelineMode;
  let job;

  if (selectedMode === "mock" && contentType.includes("application/json")) {
    const payload = await readJsonBody(req);
    if (!payload.filename) {
      badRequest(res, "Mock job must include filename.");
      return;
    }

    job = await createJobRecord({
      originalFilename: payload.filename,
      originalSize: payload.size,
      originalType: payload.type,
      originalDurationSeconds: payload.durationSeconds,
      thumbnailDataUrl: payload.thumbnailDataUrl,
      mockUpload: true,
      mode: selectedMode
    });
  } else {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      badRequest(res, "Expected multipart/form-data upload.");
      return;
    }

    const body = await readRequestBody(req);
    const parts = parseMultipart(body, boundaryMatch[1] || boundaryMatch[2]);
    const media = parts.find((part) => part.name === "media" && part.filename);
    const durationPart = parts.find((part) => part.name === "durationSeconds" && !part.filename);
    const thumbnailPart = parts.find((part) => part.name === "thumbnailDataUrl" && !part.filename);
    if (!media) {
      badRequest(res, "Upload must include a file field named media.");
      return;
    }
    if (media.data.length > MAX_UPLOAD_BYTES) {
      throw new UploadTooLargeError();
    }

    const sourceExt = extname(media.filename) || ".upload";
    const sourceFilename = `source${sourceExt}`;
    job = await createJobRecord({
      originalFilename: media.filename,
      originalSize: media.data.length,
      originalType: media.contentType,
      originalDurationSeconds: durationPart?.data?.toString("utf8"),
      thumbnailDataUrl: thumbnailPart?.data?.toString("utf8"),
      sourceFilename,
      mode: selectedMode
    });
    job.sourcePath = join(job.dir, sourceFilename);
    await writeFile(job.sourcePath, media.data);
    await saveJob(job);
  }

  if (job.mode === "mock") {
    runMockPipeline(job).catch(async (error) => {
      job.status = "failed";
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      await saveJob(job);
    });
  } else {
    runRealPipeline(job).catch(async (error) => {
      await failJob(job, error.message || "Real-mode processing failed unexpectedly.", {
        pipelineStage: "source-audio-extraction"
      });
    });
  }

  json(res, 202, publicJob(job));
}

async function handleGetProcessedDemoJob(res) {
  if (activePipelineMode !== "mock") {
    json(res, 409, { error: "Processed demo shortcut is only available in PIPELINE_MODE=mock." });
    return;
  }

  const job = await createJobRecord({
    originalFilename: "demo-processed-screen-recording.mov",
    originalSize: 500_000_000,
    originalType: "video/quicktime",
    mockUpload: true
  });
  job.demoShortcut = true;
  await completeMockJob(job);

  json(res, 200, publicJob(job));
}

async function handleListLibrary(res) {
  try {
    const entries = [];
    const jobDirs = await readdir(JOBS_DIR, { withFileTypes: true });

    for (const jobDir of jobDirs) {
      if (!jobDir.isDirectory()) continue;
      const job = await readJobFromDisk(jobDir.name);
      if (!job || job.status !== "complete") continue;
      entries.push(publicJob(job));
    }

    entries.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
    json(res, 200, entries);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "Could not load processed song library." });
  }
}

async function handleListJobs(res) {
  try {
    const entries = [];
    const jobDirs = await readdir(JOBS_DIR, { withFileTypes: true });

    for (const jobDir of jobDirs) {
      if (!jobDir.isDirectory()) continue;
      const job = await readJobFromDisk(jobDir.name);
      if (!job) continue;
      entries.push(publicJob(job));
    }

    entries.sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt));
    json(res, 200, entries);
  } catch (error) {
    console.error(error);
    json(res, 500, { error: "Could not load jobs." });
  }
}

async function handleUpdatePracticeState(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job) {
    notFound(res);
    return;
  }

  const payload = await readJsonBody(req);
  let requestedTempoMap = null;
  if (Object.prototype.hasOwnProperty.call(payload, "tempoMap") && payload.tempoMap !== null) {
    requestedTempoMap = normalizeTempoMap(payload.tempoMap);
    if (!requestedTempoMap) {
      badRequest(res, "Tempo map must contain ordered downbeat anchors beginning at bar 1.");
      return;
    }
  }
  const practiceState = ensurePracticeState(job);

  if (typeof payload.learningStatus === "string" && ["not_started", "practicing", "learned"].includes(payload.learningStatus)) {
    practiceState.learningStatus = payload.learningStatus;
  }
  if (typeof payload.playbackRate === "number") {
    practiceState.playbackRate = clampNumber(payload.playbackRate, practiceState.playbackRate, 0.25, 2);
  }
  if (typeof payload.loopStart === "number") {
    practiceState.loopStart = clampNumber(payload.loopStart, practiceState.loopStart, 0, 60 * 60);
  }
  if (typeof payload.loopEnd === "number") {
    practiceState.loopEnd = clampNumber(payload.loopEnd, practiceState.loopEnd, 0, 60 * 60);
  }
  if (typeof payload.loopEnabled === "boolean") {
    practiceState.loopEnabled = payload.loopEnabled;
  }
  if (typeof payload.countInBars === "number") {
    practiceState.countInBars = [0, 1].includes(payload.countInBars) ? payload.countInBars : practiceState.countInBars;
  }
  if (typeof payload.startAtBarOne === "boolean") {
    practiceState.startAtBarOne = payload.startAtBarOne;
  }
  if (typeof payload.lastPosition === "number") {
    practiceState.lastPosition = clampNumber(payload.lastPosition, practiceState.lastPosition, 0, 60 * 60);
  }
  if (typeof payload.metronomeEnabled === "boolean") {
    practiceState.metronomeEnabled = payload.metronomeEnabled;
  }
  if (typeof payload.metronomeVolume === "number") {
    practiceState.metronomeVolume = clampNumber(payload.metronomeVolume, practiceState.metronomeVolume, 0, 1);
  }
  if (typeof payload.metronomeAccent === "boolean") {
    practiceState.metronomeAccent = true;
  }
  if (typeof payload.metronomeSolo === "boolean") {
    practiceState.metronomeSolo = payload.metronomeSolo;
  }
  if (payload.gridOverrides && typeof payload.gridOverrides === "object") {
    const bpm = Number(payload.gridOverrides.bpm);
    practiceState.gridOverrides = {};
    if (Number.isFinite(bpm) && bpm > 0) {
      practiceState.gridOverrides.bpm = Number(clampNumber(bpm, 60, 30, 260).toFixed(1));
    }
    const beatsPerBar = Number(payload.gridOverrides.beatsPerBar);
    const beatUnit = Number(payload.gridOverrides.beatUnit) || 4;
    const supportedMeters = new Set(["3/4", "4/4", "5/4", "6/8", "7/8", "12/8"]);
    if (supportedMeters.has(`${beatsPerBar}/${beatUnit}`)) {
      practiceState.gridOverrides.beatsPerBar = beatsPerBar;
      practiceState.gridOverrides.beatUnit = beatUnit;
    }
    const downbeatOffsetSeconds = Number(payload.gridOverrides.downbeatOffsetSeconds);
    if (Number.isFinite(downbeatOffsetSeconds)) {
      practiceState.gridOverrides.downbeatOffsetSeconds = Number(
        clampNumber(downbeatOffsetSeconds, 0, MIN_BAR_START_SECONDS, MAX_BAR_START_SECONDS).toFixed(2)
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, "tempoMap")) {
    practiceState.tempoMap = payload.tempoMap === null ? null : requestedTempoMap;
  }
  if (payload.keyOverride && typeof payload.keyOverride === "object") {
    const noteNames = new Set(["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"]);
    if (noteNames.has(payload.keyOverride.tonic) && ["major", "minor"].includes(payload.keyOverride.mode)) {
      practiceState.keyOverride = {
        tonic: payload.keyOverride.tonic,
        mode: payload.keyOverride.mode
      };
    }
  }
  if (Object.prototype.hasOwnProperty.call(payload, "chordChart")) {
    practiceState.chordChart = normalizeChordChart(payload.chordChart);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "sections")) {
    practiceState.sections = normalizeSections(payload.sections);
  }
  if (payload.harmonyView && typeof payload.harmonyView === "object") {
    practiceState.harmonyView = normalizeHarmonyView(payload.harmonyView);
  }
  if (payload.stemStates && typeof payload.stemStates === "object") {
    practiceState.stemStates = {
      ...practiceState.stemStates,
      ...Object.fromEntries(
        Object.entries(payload.stemStates).map(([stemId, state]) => [
          stemId,
          {
            ...(practiceState.stemStates[stemId] || defaultStemState(stemId)),
            muted: Boolean(state?.muted),
            solo: Boolean(state?.solo),
            volume: clampNumber(Number(state?.volume), practiceState.stemStates[stemId]?.volume ?? 1, 0, 1)
          }
        ])
      )
    };
  }

  job.updatedAt = new Date().toISOString();
  await saveJob(job);
  json(res, 200, publicJob(job));
}

function correctedTimingGridForJob(job) {
  const source = job.metadata?.beatGrid || {};
  const overrides = job.practiceState?.gridOverrides || {};
  const tempoMap = normalizeTempoMap(job.practiceState?.tempoMap);
  const bpm = Number(overrides.bpm || source.bpm);
  const beatDurationSeconds = Number(source.beatDurationSeconds) || (bpm > 0 ? 60 / bpm : null);
  const beatsPerBar = Math.max(1, Math.round(Number(overrides.beatsPerBar || source.beatsPerBar) || DEFAULT_BEATS_PER_BAR));
  const beatUnit = Math.max(1, Math.round(Number(overrides.beatUnit || source.beatUnit) || 4));
  const downbeatOffsetSeconds = Number(
    overrides.downbeatOffsetSeconds ?? source.downbeatOffsetSeconds ?? source.beatOffsetSeconds ?? 0
  );
  if (!finitePositiveNumber(beatDurationSeconds)) return null;
  return {
    bpm: finitePositiveNumber(bpm) ? bpm : 60 / beatDurationSeconds,
    beatDurationSeconds,
    beatsPerBar,
    beatUnit,
    downbeatOffsetSeconds: Number.isFinite(downbeatOffsetSeconds) ? downbeatOffsetSeconds : 0,
    tempoMap
  };
}

async function handleReanalyzeHarmony(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job || job.status !== "complete") {
    notFound(res);
    return;
  }
  if (job.mode !== "real") {
    badRequest(res, "Corrected-timing chord analysis is available for real-mode songs only.");
    return;
  }

  const payload = await readJsonBody(req);
  if (payload.replaceWorkingChart !== true) {
    badRequest(res, "Confirm replacement of the working chord chart before reanalysis.");
    return;
  }

  const timingGrid = correctedTimingGridForJob(job);
  if (!timingGrid?.tempoMap) {
    badRequest(res, "Add at least one timing correction before reanalyzing chords.");
    return;
  }

  const sourceAudioPath = join(job.dir, SOURCE_AUDIO_FILENAME);
  try {
    await access(sourceAudioPath);
  } catch {
    badRequest(res, "The source-audio WAV required for reanalysis is unavailable.");
    return;
  }

  const analysis = await analyzeHarmonyFromAudio({
    path: sourceAudioPath,
    durationSeconds: Number(job.metadata?.durationSeconds) || null
  }, {
    outputs: stemsForJob(job)
  }, {
    timingGrid,
    fixedKey: job.practiceState?.keyOverride
  });

  const previousChordCount = job.practiceState?.chordChart?.chords?.length || 0;
  job.metadata.correctedTimingAnalysis = {
    createdAt: new Date().toISOString(),
    harmonySource: analysis.harmonySource,
    analysisSource: analysis.analysisSource,
    key: analysis.key,
    chords: analysis.chords,
    analysis: analysis.analysis,
    timing: {
      gridOverrides: { ...(job.practiceState?.gridOverrides || {}) },
      tempoMap: timingGrid.tempoMap
    },
    replacedWorkingChordCount: previousChordCount
  };
  job.practiceState.chordChartBackup = job.practiceState?.chordChart
    ? {
        createdAt: new Date().toISOString(),
        reason: "corrected-timing-reanalysis",
        chordChart: normalizeChordChart(job.practiceState.chordChart)
      }
    : job.practiceState?.chordChartBackup || null;
  job.practiceState.chordChart = null;
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
  json(res, 200, publicJob(job));
}

async function handleDeleteJob(id, res) {
  const job = await readJobFromDisk(id);
  if (!job) {
    notFound(res);
    return;
  }

  jobs.delete(id);
  await rm(join(JOBS_DIR, id), { recursive: true, force: true });
  json(res, 200, { ok: true, id });
}

async function handleRenameJob(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job) {
    notFound(res);
    return;
  }

  const payload = await readJsonBody(req);
  const label = typeof payload.originalFilename === "string" ? payload.originalFilename.trim() : "";
  if (!label) {
    badRequest(res, "A filename is required.");
    return;
  }

  job.originalFilename = label;
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
  json(res, 200, publicJob(job));
}

async function handleSetPipelineMode(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    badRequest(res, "Invalid JSON body.");
    return;
  }

  const mode = typeof payload.mode === "string" ? payload.mode : "";
  if (!["mock", "real"].includes(mode)) {
    badRequest(res, "Pipeline mode must be mock or real.");
    return;
  }

  activePipelineMode = mode;
  json(res, 200, {
    ok: true,
    mode: activePipelineMode,
    startupMode: startupPipelineMode,
    realSeparator: REAL_SEPARATOR_NAME
  });
}

async function ensureJobDurationMetadata(job) {
  if (!job || job.status !== "complete" || durationSecondsFromMetadata(job.metadata)) return job;

  const candidates = [
    join(job.dir, SOURCE_AUDIO_FILENAME),
    ...stemsForJob(job)
      .filter((stem) => extname(stem.filename || "").toLowerCase() === ".wav")
      .map((stem) => stemFilePath(job, stem))
  ];

  for (const candidatePath of candidates) {
    const durationSeconds = await wavDurationSecondsFromFile(candidatePath);
    if (!durationSeconds) continue;

    job.metadata = {
      ...(job.metadata || {}),
      durationSeconds
    };
    await saveJob(job);
    return job;
  }

  return job;
}

async function readJobFromDisk(id) {
  if (jobs.has(id)) return ensureJobDurationMetadata(jobs.get(id));
  try {
    const job = JSON.parse(await readFile(join(JOBS_DIR, id, "job.json"), "utf8"));
    job.dir = join(JOBS_DIR, id);
    await ensureJobDurationMetadata(job);
    jobs.set(id, job);
    return job;
  } catch {
    return null;
  }
}

async function handleGetJob(id, res) {
  const job = await readJobFromDisk(id);
  if (!job) {
    notFound(res);
    return;
  }
  json(res, 200, publicJob(job));
}

async function handleGetAudio(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job || job.status !== "complete") {
    notFound(res);
    return;
  }

  const stems = stemsForJob(job);
  const preferredStem = stems.find((stem) => stem.id === "piano") || stems[0] || null;
  let streamPath = preferredStem
    ? stemFilePath(job, preferredStem)
    : join(job.dir, "piano.wav");
  let streamContentType = preferredStem?.contentType || contentTypeForPath(streamPath, "audio/wav");
  try {
    await access(streamPath);
  } catch {
    const fallbackPath = join(job.dir, "piano.wav");
    try {
      await access(fallbackPath);
      streamPath = fallbackPath;
      streamContentType = contentTypeForPath(streamPath, "audio/wav");
    } catch {
      notFound(res);
      return;
    }
  }

  await streamMediaFile(req, res, streamPath, streamContentType);
}

async function handleGetStem(req, id, stemId, res) {
  const job = await readJobFromDisk(id);
  const stem = job ? stemsForJob(job).find((candidate) => candidate.id === stemId) : null;
  if (!job || job.status !== "complete" || !stem) {
    notFound(res);
    return;
  }

  const stemPath = stemFilePath(job, stem);
  try {
    await access(stemPath);
  } catch {
    notFound(res);
    return;
  }

  await streamMediaFile(req, res, stemPath, stem.contentType || contentTypeForPath(stemPath, "audio/wav"));
}

async function handleGetSourceAudio(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job || job.status !== "complete") {
    notFound(res);
    return;
  }

  const sourceAudioPath = join(job.dir, SOURCE_AUDIO_FILENAME);
  try {
    await access(sourceAudioPath);
  } catch {
    notFound(res);
    return;
  }

  await streamMediaFile(req, res, sourceAudioPath, "audio/wav");
}

async function handleGetWaveform(id, res) {
  const job = await readJobFromDisk(id);
  if (!job || job.status !== "complete") {
    notFound(res);
    return;
  }

  try {
    const envelope = JSON.parse(await readFile(join(job.dir, WAVEFORM_FILENAME), "utf8"));
    json(res, 200, envelope);
  } catch {
    try {
      let envelope;
      if (job.mode === "real") {
        envelope = waveformEnvelope(await readPcm16WavFromFile(join(job.dir, SOURCE_AUDIO_FILENAME)));
      } else {
        envelope = mockWaveformEnvelope(durationSecondsFromMetadata(job.metadata) || MOCK_DURATION_SECONDS);
      }
      await writeWaveformAsset(job, envelope);
      json(res, 200, envelope);
    } catch {
      notFound(res);
    }
  }
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      mode: activePipelineMode,
      startupMode: startupPipelineMode,
      realSeparator: REAL_SEPARATOR_NAME,
      ffmpegPath: FFMPEG_PATH
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/settings/pipeline-mode") {
    await handleSetPipelineMode(req, res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/jobs") {
    await handleCreateJob(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/jobs") {
    await handleListJobs(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/demo/processed-job") {
    await handleGetProcessedDemoJob(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/library") {
    await handleListLibrary(res);
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)$/);
  if (req.method === "GET" && jobMatch) {
    await handleGetJob(jobMatch[1], res);
    return;
  }

  const practiceStateMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/practice-state$/);
  if (req.method === "PUT" && practiceStateMatch) {
    await handleUpdatePracticeState(req, practiceStateMatch[1], res);
    return;
  }
  const reanalyzeHarmonyMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/reanalyze-harmony$/);
  if (req.method === "POST" && reanalyzeHarmonyMatch) {
    await handleReanalyzeHarmony(req, reanalyzeHarmonyMatch[1], res);
    return;
  }
  const renameJobMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/rename$/);
  if (req.method === "PUT" && renameJobMatch) {
    await handleRenameJob(req, renameJobMatch[1], res);
    return;
  }

  const deleteJobMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)$/);
  if (req.method === "DELETE" && deleteJobMatch) {
    await handleDeleteJob(deleteJobMatch[1], res);
    return;
  }

  const audioMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/piano\.wav$/);
  if (req.method === "GET" && audioMatch) {
    await handleGetAudio(req, audioMatch[1], res);
    return;
  }

  const sourceAudioMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/source-audio\.wav$/);
  if (req.method === "GET" && sourceAudioMatch) {
    await handleGetSourceAudio(req, sourceAudioMatch[1], res);
    return;
  }

  const waveformMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/waveform\.json$/);
  if (req.method === "GET" && waveformMatch) {
    await handleGetWaveform(waveformMatch[1], res);
    return;
  }

  const stemMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/stems\/([a-z]+)\.(?:wav|m4a)$/);
  if (req.method === "GET" && stemMatch) {
    await handleGetStem(req, stemMatch[1], stemMatch[2], res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  notFound(res);
}

export {
  analyzeHarmonyFromAudio,
  chordSegmentsForTimingGrid,
  estimateBeatGrid,
  readPcm16WavFromFile,
  smoothIsolatedChordDrafts
};

async function startServer() {
  await ensureBaseDirs();

  return createServer((req, res) => {
    route(req, res).catch((error) => {
      if (error instanceof UploadTooLargeError) {
        json(res, 413, { error: error.message });
        return;
      }
      console.error(error);
      json(res, 500, { error: "Internal server error" });
    });
  }).listen(PORT, HOST, () => {
    console.log(`Piano Practice POC running at http://${HOST}:${PORT}`);
    console.log(`PIPELINE_MODE=${activePipelineMode}`);
  });
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  await startServer();
}
