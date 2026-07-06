import { createServer } from "node:http";
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const startupPipelineMode = process.env.PIPELINE_MODE === "real" ? "real" : "mock";
let activePipelineMode = startupPipelineMode;
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
const DATA_DIR = process.env.DATA_DIR || join(__dirname, "data");
const JOBS_DIR = join(DATA_DIR, "jobs");
const PUBLIC_DIR = join(__dirname, "public");
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const jobs = new Map();

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

function contentTypeForPath(path, fallback = "application/octet-stream") {
  return mimeTypes[extname(path)] || fallback;
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

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) {
      throw new Error("Upload too large. Use a file under 100 MB for the POC.");
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

function createMockMetadata() {
  return {
    key: {
      tonic: "C",
      mode: "major",
      confidence: 0.72
    },
    chords: [
      { start: 0, end: 4, name: "Cmaj7", roman: "Imaj7" },
      { start: 4, end: 8, name: "Am7", roman: "vi7" },
      { start: 8, end: 12, name: "Fmaj7", roman: "IVmaj7" },
      { start: 12, end: 16, name: "G7", roman: "V7" }
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
  const durationSeconds = 16;
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
      lastPosition: 0,
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

function ensurePracticeState(job) {
  const existingStemStates = job.practiceState?.stemStates || {};
  const stemStates = {};

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
    lastPosition: clampNumber(Number(job.practiceState?.lastPosition), 0, 0, 60 * 60),
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
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    originalFilename: job.originalFilename,
    originalSize: job.originalSize,
    originalType: job.originalType,
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
  job.metadata = createMockMetadata();
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

function runProcess(command, args) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
    });

    child.on("error", (error) => {
      resolve({
        ok: false,
        code: null,
        error,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });

    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code,
        error: null,
        stderr,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function extractSourceAudio(job) {
  const outputFilename = "source-audio.wav";
  const outputPath = join(job.dir, outputFilename);
  const args = [
    "-hide_banner",
    "-y",
    "-i",
    job.sourcePath,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "44100",
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
  return {
    filename: outputFilename,
    path: outputPath,
    size: outputStats.size,
    durationMs: result.durationMs,
    command: FFMPEG_PATH,
    args
  };
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
      outputFilename: "source-audio.wav",
      outputSize: null
    },
    limitations: [
      "Only source-audio extraction is real in this phase.",
      "Stem separation remains unavailable in real mode.",
      "Harmony cues are mocked so the practice UI remains usable."
    ]
  };
  job.updatedAt = new Date().toISOString();
  await saveJob(job);

  try {
    const extracted = await extractSourceAudio(job);
    job.stems = [
      {
        id: "source",
        name: "Extracted source audio",
        filename: extracted.filename,
        contentType: "audio/wav",
        kind: "source-audio"
      }
    ];
    job.status = "complete";
    job.progress = 100;
    job.metadata = {
      ...job.metadata,
      pipelineStage: "source-audio-extracted",
      harmonySource: "mock",
      key: createMockMetadata().key,
      chords: createMockMetadata().chords,
      melody: createMockMetadata().melody,
      ffmpeg: {
        command: extracted.command,
        available: true,
        durationMs: extracted.durationMs,
        outputFilename: extracted.filename,
        outputSize: extracted.size
      }
    };
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  } catch (error) {
    await failJob(job, error.message || "Real-mode source-audio extraction failed.", {
      pipelineStage: "source-audio-extraction",
      sourceStored: Boolean(job.sourcePath),
      ffmpeg: error.ffmpeg || {
        command: FFMPEG_PATH,
        available: false
      }
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
    if (!media) {
      badRequest(res, "Upload must include a file field named media.");
      return;
    }

    const sourceExt = extname(media.filename) || ".upload";
    const sourceFilename = `source${sourceExt}`;
    job = await createJobRecord({
      originalFilename: media.filename,
      originalSize: media.data.length,
      originalType: media.contentType,
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

async function handleUpdatePracticeState(req, id, res) {
  const job = await readJobFromDisk(id);
  if (!job) {
    notFound(res);
    return;
  }

  const payload = await readJsonBody(req);
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
  if (typeof payload.lastPosition === "number") {
    practiceState.lastPosition = clampNumber(payload.lastPosition, practiceState.lastPosition, 0, 60 * 60);
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
  json(res, 200, { ok: true, mode: activePipelineMode, startupMode: startupPipelineMode });
}

async function readJobFromDisk(id) {
  if (jobs.has(id)) return jobs.get(id);
  try {
    const job = JSON.parse(await readFile(join(JOBS_DIR, id, "job.json"), "utf8"));
    job.dir = join(JOBS_DIR, id);
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

async function handleGetAudio(id, res) {
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

  res.writeHead(200, { "content-type": streamContentType });
  createReadStream(streamPath).pipe(res);
}

async function handleGetStem(id, stemId, res) {
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

  res.writeHead(200, { "content-type": stem.contentType || contentTypeForPath(stemPath, "audio/wav") });
  createReadStream(stemPath).pipe(res);
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, {
      ok: true,
      mode: activePipelineMode,
      startupMode: startupPipelineMode,
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
    await handleGetAudio(audioMatch[1], res);
    return;
  }

  const stemMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/stems\/([a-z]+)\.(?:wav|m4a)$/);
  if (req.method === "GET" && stemMatch) {
    await handleGetStem(stemMatch[1], stemMatch[2], res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  notFound(res);
}

await ensureBaseDirs();

createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error(error);
    json(res, 500, { error: "Internal server error" });
  });
}).listen(PORT, HOST, () => {
  console.log(`Piano Practice POC running at http://${HOST}:${PORT}`);
  console.log(`PIPELINE_MODE=${activePipelineMode}`);
});
