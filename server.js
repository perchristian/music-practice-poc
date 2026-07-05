import { createServer } from "node:http";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const PIPELINE_MODE = process.env.PIPELINE_MODE || "mock";
const DATA_DIR = join(__dirname, "data");
const PUBLIC_DIR = join(__dirname, "public");
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const jobs = new Map();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wav": "audio/wav"
};

const mockStems = [
  { id: "drums", name: "Drums", role: "rhythm bed" },
  { id: "bass", name: "Bass", role: "low harmony" },
  { id: "guitar", name: "Guitar", role: "comping" },
  { id: "piano", name: "Piano", role: "practice target" }
];

async function ensureBaseDirs() {
  await mkdir(DATA_DIR, { recursive: true });
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

function safePublicPath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const decoded = decodeURIComponent(requested.split("?")[0]);
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

async function createJobRecord({ originalFilename, originalSize = null, originalType = null, sourcePath = null, mockUpload = false }) {
  const id = randomUUID();
  const dir = join(DATA_DIR, "jobs", id);
  await mkdir(dir, { recursive: true });

  const job = {
    id,
    mode: PIPELINE_MODE,
    status: "queued",
    progress: 0,
    originalFilename,
    originalSize,
    originalType,
    sourcePath,
    mockUpload,
    dir,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(id, job);
  await saveJob(job);
  return job;
}

function publicJob(job) {
  return {
    id: job.id,
    mode: job.mode,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    originalFilename: job.originalFilename,
    originalSize: job.originalSize,
    mockUpload: job.mockUpload,
    result: job.status === "complete"
      ? {
          audioUrl: `/api/jobs/${job.id}/piano.wav`,
          stems: mockStems.map((stem) => ({
            ...stem,
            audioUrl: `/api/jobs/${job.id}/stems/${stem.id}.wav`,
            defaultMuted: false
          })),
          metadata: job.metadata
        }
      : null
  };
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

  await mkdir(join(job.dir, "stems"), { recursive: true });
  for (const stem of mockStems) {
    const wav = generateMockWav(stem.id);
    await writeFile(join(job.dir, "stems", `${stem.id}.wav`), wav);
    if (stem.id === "piano") {
      await writeFile(join(job.dir, "piano.wav"), wav);
    }
  }
  job.status = "complete";
  job.progress = 100;
  job.metadata = createMockMetadata();
  job.updatedAt = new Date().toISOString();
  await saveJob(job);
}

async function handleCreateJob(req, res) {
  const contentType = req.headers["content-type"] || "";
  let job;

  if (PIPELINE_MODE === "mock" && contentType.includes("application/json")) {
    const payload = await readJsonBody(req);
    if (!payload.filename) {
      badRequest(res, "Mock job must include filename.");
      return;
    }

    job = await createJobRecord({
      originalFilename: payload.filename,
      originalSize: payload.size,
      originalType: payload.type,
      mockUpload: true
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

    job = await createJobRecord({
      originalFilename: media.filename,
      originalSize: media.data.length,
      originalType: media.contentType
    });
    const sourceExt = extname(media.filename) || ".upload";
    job.sourcePath = join(job.dir, `source${sourceExt}`);
    await writeFile(job.sourcePath, media.data);
    await saveJob(job);
  }

  if (PIPELINE_MODE === "mock") {
    runMockPipeline(job).catch(async (error) => {
      job.status = "failed";
      job.error = error.message;
      job.updatedAt = new Date().toISOString();
      await saveJob(job);
    });
  } else {
    job.status = "failed";
    job.error = "PIPELINE_MODE=real is not implemented yet. Use PIPELINE_MODE=mock.";
    job.updatedAt = new Date().toISOString();
    await saveJob(job);
  }

  json(res, 202, publicJob(job));
}

async function readJobFromDisk(id) {
  if (jobs.has(id)) return jobs.get(id);
  try {
    const job = JSON.parse(await readFile(join(DATA_DIR, "jobs", id, "job.json"), "utf8"));
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

  const audioPath = join(job.dir, "piano.wav");
  try {
    await access(audioPath);
  } catch {
    notFound(res);
    return;
  }

  res.writeHead(200, { "content-type": "audio/wav" });
  createReadStream(audioPath).pipe(res);
}

async function handleGetStem(id, stemId, res) {
  const job = await readJobFromDisk(id);
  if (!job || job.status !== "complete" || !mockStems.some((stem) => stem.id === stemId)) {
    notFound(res);
    return;
  }

  const stemPath = join(job.dir, "stems", `${stemId}.wav`);
  try {
    await access(stemPath);
  } catch {
    notFound(res);
    return;
  }

  res.writeHead(200, { "content-type": "audio/wav" });
  createReadStream(stemPath).pipe(res);
}

async function route(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, mode: PIPELINE_MODE });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/jobs") {
    await handleCreateJob(req, res);
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)$/);
  if (req.method === "GET" && jobMatch) {
    await handleGetJob(jobMatch[1], res);
    return;
  }

  const audioMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/piano\.wav$/);
  if (req.method === "GET" && audioMatch) {
    await handleGetAudio(audioMatch[1], res);
    return;
  }

  const stemMatch = url.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)\/stems\/([a-z]+)\.wav$/);
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
  console.log(`PIPELINE_MODE=${PIPELINE_MODE}`);
});
