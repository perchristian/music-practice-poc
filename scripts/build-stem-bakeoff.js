import { access, copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { basename, dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDemucsInvocation } from "../demucs-command.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const dataDir = process.env.DATA_DIR || join(repoRoot, "data");
const jobsDir = join(dataDir, "jobs");
const sourceMedia = join(repoRoot, "test-media", "MakeYouFeelMyLovePart2.mov");
const logicStemsDir = join(repoRoot, "test-media", "stems from logic");
const suiteId = "make-you-feel-my-love-part2-stem-bakeoff";
const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
const demucsInvocation = resolveDemucsInvocation({ repoRoot });
const runDemucs = process.argv.includes("--demucs") || process.env.BAKEOFF_DEMUCS === "1";
const sourceAudioCodec = "pcm_s16le";

const stemNames = {
  drums: "Drums",
  bass: "Bass",
  guitar: "Guitar",
  piano: "Piano",
  vocals: "Vocals",
  other: "Other",
  accompaniment: "Accompaniment"
};

const mockMetadata = {
  key: {
    tonic: "C",
    mode: "major",
    confidence: 0.5
  },
  chords: [
    { start: 0, end: 4, name: "C", roman: "I" },
    { start: 4, end: 8, name: "Am", roman: "vi" },
    { start: 8, end: 12, name: "F", roman: "IV" },
    { start: 12, end: 16, name: "G", roman: "V" }
  ],
  melody: []
};

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout = `${stdout}${chunk.toString("utf8")}`.slice(-8000);
    });

    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-8000);
    });

    child.on("error", (error) => {
      resolve({ ok: false, code: null, error, stdout, stderr, durationMs: Date.now() - startedAt });
    });

    child.on("close", (code) => {
      resolve({ ok: code === 0, code, error: null, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureSourceAudio(jobDir) {
  const outputPath = join(jobDir, "source-audio.wav");
  if (await exists(outputPath)) return outputPath;

  const result = await runProcess(ffmpegPath, [
    "-hide_banner",
    "-y",
    "-i",
    sourceMedia,
    "-map",
    "0:a:0",
    "-vn",
    "-c:a",
    sourceAudioCodec,
    outputPath
  ]);

  if (!result.ok) {
    throw new Error(`FFmpeg source extraction failed: ${result.stderr || result.error?.message || result.code}`);
  }

  return outputPath;
}

async function findExistingJob(method) {
  if (!(await exists(jobsDir))) return null;

  const entries = await readdir(jobsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    try {
      const jobPath = join(jobsDir, entry.name, "job.json");
      const job = JSON.parse(await readFile(jobPath, "utf8"));
      if (job.metadata?.bakeoff?.suiteId === suiteId && job.metadata?.bakeoff?.method === method) {
        return { id: entry.name, dir: join(jobsDir, entry.name) };
      }
    } catch {
      // Ignore unrelated or malformed local jobs.
    }
  }

  const id = randomUUID();
  return { id, dir: join(jobsDir, id) };
}

async function writeJob({ method, title, stems, metadata, target = null }) {
  target ||= await findExistingJob(method);
  await mkdir(join(target.dir, "stems"), { recursive: true });

  const sourceStats = await stat(sourceMedia);
  const now = new Date().toISOString();
  const job = {
    id: target.id,
    mode: "real",
    status: "complete",
    progress: 100,
    originalFilename: title,
    originalSize: sourceStats.size,
    originalType: "video/quicktime",
    sourcePath: sourceMedia,
    sourceFilename: basename(sourceMedia),
    mockUpload: false,
    dir: target.dir,
    metadata: {
      ...mockMetadata,
      pipelineStage: "stem-bakeoff",
      harmonySource: "mock",
      bakeoff: {
        suiteId,
        sourceMedia: "test-media/MakeYouFeelMyLovePart2.mov",
        method,
        title,
        createdBy: "scripts/build-stem-bakeoff.js",
        ...metadata
      }
    },
    error: null,
    stems,
    practiceState: {
      learningStatus: "not_started",
      playbackRate: 1,
      loopStart: 0,
      loopEnd: 4,
      loopEnabled: false,
      lastPosition: 0,
      stemStates: Object.fromEntries(stems.map((stem) => [stem.id, { muted: false, solo: false, volume: 1, stemId: stem.id }]))
    },
    createdAt: now,
    updatedAt: now
  };

  await writeFile(join(target.dir, "job.json"), JSON.stringify(job, null, 2));
  return job;
}

async function copyStem(sourcePath, targetDir, stemId) {
  const filename = `${stemId}.wav`;
  await copyFile(sourcePath, join(targetDir, "stems", filename));
  return {
    id: stemId,
    name: stemNames[stemId] || stemId,
    filename,
    contentType: "audio/wav",
    kind: "bakeoff-stem"
  };
}

async function importLogicBaseline() {
  const target = await findExistingJob("logic-pro-stem-splitter");
  await mkdir(join(target.dir, "stems"), { recursive: true });

  const files = await readdir(logicStemsDir);
  const stems = [];
  for (const stemId of ["drums", "bass", "guitar", "piano", "vocals", "other"]) {
    const sourceFile = files.find((file) => file.toLowerCase().includes(`_${stemId}_`));
    if (!sourceFile) {
      throw new Error(`Missing Logic stem for ${stemId} in ${logicStemsDir}`);
    }
    stems.push(await copyStem(join(logicStemsDir, sourceFile), target.dir, stemId));
  }

  return writeJob({
    method: "logic-pro-stem-splitter",
    title: "MakeYouFeelMyLovePart2 - Logic baseline",
    stems,
    target,
    metadata: {
      separator: "Logic Pro Stem Splitter",
      limitations: ["Manual Logic Pro export; useful as QA baseline, not an automated backend pipeline."]
    }
  });
}

async function createDemucsSplit() {
  const target = await findExistingJob("demucs-htdemucs-6s");
  await mkdir(join(target.dir, "stems"), { recursive: true });
  const sourceAudio = await ensureSourceAudio(target.dir);
  const outDir = join(target.dir, "demucs-output");
  const result = await runProcess(demucsInvocation.command, [
    ...demucsInvocation.argumentPrefix,
    "-n",
    "htdemucs_6s",
    "--out",
    outDir,
    sourceAudio
  ]);

  if (!result.ok) {
    throw new Error(`Demucs split failed: ${result.stderr || result.error?.message || result.code}`);
  }

  const sourceName = parse(sourceAudio).name;
  const demucsStemDir = join(outDir, "htdemucs_6s", sourceName);
  const stems = [];
  for (const stemId of ["drums", "bass", "guitar", "piano", "vocals", "other"]) {
    const sourcePath = join(demucsStemDir, `${stemId}.wav`);
    stems.push(await copyStem(sourcePath, target.dir, stemId));
  }

  return writeJob({
    method: "demucs-htdemucs-6s",
    title: "MakeYouFeelMyLovePart2 - Demucs htdemucs_6s",
    stems,
    target,
    metadata: {
      separator: "Demucs htdemucs_6s",
      durationMs: result.durationMs,
      limitations: ["Local ML separator; quality and runtime need human listening on the target clip."]
    }
  });
}

async function main() {
  await mkdir(jobsDir, { recursive: true });
  for (const requiredPath of [sourceMedia, logicStemsDir]) {
    if (!(await exists(requiredPath))) throw new Error(`Missing required path: ${requiredPath}`);
  }

  const created = [];
  created.push(await importLogicBaseline());

  if (runDemucs) {
    created.push(await createDemucsSplit());
  }

  const output = createWriteStream(null, { fd: 1 });
  for (const job of created) {
    output.write(`${job.originalFilename}\n`);
    output.write(`  id: ${job.id}\n`);
    output.write(`  stems: ${job.stems.map((stem) => stem.id).join(", ")}\n`);
  }
  if (!runDemucs) {
    output.write("Demucs skipped. Run with BAKOEFF_DEMUCS=1 or --demucs after installing demucs.\n".replace("BAKOEFF", "BAKEOFF"));
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
