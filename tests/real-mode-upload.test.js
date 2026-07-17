import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeHarmonyFromAudio } from "../server.js";

const port = Number(process.env.REAL_BACKEND_TEST_PORT || 3211);
const baseUrl = `http://127.0.0.1:${port}`;
const extractionPort = Number(process.env.REAL_EXTRACTION_TEST_PORT || 3212);
const extractionBaseUrl = `http://127.0.0.1:${extractionPort}`;
const maxUploadBytes = 150 * 1024 * 1024;
const maxUploadRequestBytes = maxUploadBytes + 1024 * 1024;
let server;
let extractionServer;
let demucsServer;
let testDataDir;
let extractionDataDir;
let demucsDataDir;

async function waitForHealth(url = baseUrl) {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw lastError || new Error("Real-mode backend did not become ready.");
}

async function waitForFailed(jobId) {
  const deadline = Date.now() + 10_000;
  const statuses = [];
  let latestJob;

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`);
    assert.equal(response.status, 200);
    latestJob = await response.json();
    statuses.push(latestJob.status);
    if (latestJob.status === "failed") return { job: latestJob, statuses };
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Real-mode job did not fail clearly. Latest status: ${latestJob?.status ?? "unknown"}`);
}

async function waitForComplete(jobId, url = baseUrl) {
  const deadline = Date.now() + 15_000;
  let latestJob;

  while (Date.now() < deadline) {
    const response = await fetch(`${url}/api/jobs/${jobId}`);
    assert.equal(response.status, 200);
    latestJob = await response.json();
    if (latestJob.status === "complete") return latestJob;
    if (latestJob.status === "failed") {
      throw new Error(`Real-mode job failed unexpectedly: ${latestJob.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Real-mode job did not complete. Latest status: ${latestJob?.status ?? "unknown"}`);
}

async function waitForProgressAtLeast(jobId, minimum, url = baseUrl) {
  const deadline = Date.now() + 10_000;
  let latestJob;

  while (Date.now() < deadline) {
    const response = await fetch(`${url}/api/jobs/${jobId}`);
    assert.equal(response.status, 200);
    latestJob = await response.json();
    if (latestJob.status === "failed") {
      throw new Error(`Real-mode job failed unexpectedly: ${latestJob.error}`);
    }
    if (latestJob.status === "processing" && latestJob.progress >= minimum && latestJob.progress < 100) {
      return latestJob;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `Real-mode job did not report progress >= ${minimum}. Latest progress: ${latestJob?.progress ?? "unknown"}`
  );
}

async function uploadSample(url = baseUrl, filename = "phase-2a-source.wav") {
  const formData = new FormData();
  const mediaBytes = await readTestMedia(filename);
  formData.append("media", new Blob([mediaBytes], { type: "audio/wav" }), filename);

  const createResponse = await fetch(`${url}/api/jobs`, {
    method: "POST",
    body: formData
  });

  assert.equal(createResponse.status, 202);
  return { job: await createResponse.json(), mediaBytes };
}

async function postDeclaredOversizedUpload(url = baseUrl) {
  const target = new URL(`${url}/api/jobs`);
  return new Promise((resolve, reject) => {
    const req = request(target, {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=poc-oversized-upload",
        "content-length": String(maxUploadRequestBytes + 1)
      }
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Oversized upload request timed out."));
    });
    req.on("error", reject);
    req.end();
  });
}

async function readTestMedia(filename) {
  const mediaPath = join(process.cwd(), "test-media", filename);
  if (filename === "phase-2h-bar-grid.wav") {
    const generated = spawnSync(process.execPath, ["scripts/generate-phase2a-test-media.js"], {
      cwd: process.cwd(),
      stdio: "ignore"
    });
    assert.equal(generated.status, 0, "test media generation should succeed");
    return readFile(mediaPath);
  }

  try {
    return await readFile(mediaPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const generated = spawnSync(process.execPath, ["scripts/generate-phase2a-test-media.js"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  assert.equal(generated.status, 0, "test media generation should succeed");
  return readFile(mediaPath);
}

function generateTestMedia() {
  const generated = spawnSync(process.execPath, ["scripts/generate-phase2a-test-media.js"], {
    cwd: process.cwd(),
    stdio: "ignore"
  });
  assert.equal(generated.status, 0, "test media generation should succeed");
}

async function analyzeGeneratedHarmony(filename) {
  generateTestMedia();
  const sourcePath = join(process.cwd(), "test-media", filename);
  return analyzeHarmonyFromAudio(
    { path: sourcePath, filename },
    { outputs: [] }
  );
}

describe("real-mode upload contract with missing FFmpeg", () => {
  before(async () => {
    testDataDir = await mkdtemp(join(tmpdir(), "piano-poc-real-backend-"));
    server = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        PIPELINE_MODE: "real",
        FFMPEG_PATH: "__missing_ffmpeg_for_poc_test__",
        DATA_DIR: testDataDir
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    server.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    await waitForHealth();
  });

  after(async () => {
    server?.kill();
    if (testDataDir) {
      await rm(testDataDir, { recursive: true, force: true });
    }
  });

  it("accepts multipart media, stores source media, and returns API-visible FFmpeg setup failure", async () => {
    const { job: createdJob, mediaBytes } = await uploadSample();
    assert.equal(createdJob.mode, "real");
    assert.equal(createdJob.status, "queued");
    assert.equal(createdJob.mockUpload, false);
    assert.equal(createdJob.originalFilename, "phase-2a-source.wav");
    assert.equal(createdJob.source.filename, "source.wav");
    assert.equal(createdJob.source.contentType, "audio/wav");
    assert.equal(createdJob.source.size, mediaBytes.length);

    const jobDir = join(testDataDir, "jobs", createdJob.id);
    const source = await stat(join(jobDir, "source.wav"));
    assert.equal(source.size, mediaBytes.length);

    const { job: failedJob } = await waitForFailed(createdJob.id);
    assert.equal(failedJob.status, "failed");
    assert.ok(failedJob.progress >= 15);
    assert.match(failedJob.error, /FFmpeg was not found/);
    assert.equal(failedJob.result, null);
    assert.equal(failedJob.source.filename, "source.wav");

    const persistedJob = JSON.parse(await readFile(join(jobDir, "job.json"), "utf8"));
    assert.equal(persistedJob.status, "failed");
    assert.equal(persistedJob.sourceFilename, "source.wav");
    assert.equal(persistedJob.originalType, "audio/wav");
    assert.equal(persistedJob.originalSize, mediaBytes.length);
    assert.match(persistedJob.error, /FFmpeg was not found/);
    assert.equal(persistedJob.metadata.failure.sourceStored, true);
    assert.equal(persistedJob.metadata.failure.ffmpeg.missingCommand, true);

    const jobsResponse = await fetch(`${baseUrl}/api/jobs`);
    assert.equal(jobsResponse.status, 200);
    const listedFailure = (await jobsResponse.json()).find((entry) => entry.id === createdJob.id);
    assert.equal(listedFailure.status, "failed");
    assert.match(listedFailure.error, /FFmpeg was not found/);
  });

  it("rejects real-mode multipart uploads larger than 150 MB", async () => {
    const response = await postDeclaredOversizedUpload();

    assert.equal(response.statusCode, 413);
    const payload = JSON.parse(response.body);
    assert.match(payload.error, /150 MB/);
  });
});

describe("real-mode FFmpeg extraction", () => {
  before(async (t) => {
    const ffmpegCheck = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status !== 0) {
      t.skip("FFmpeg is not available; skipping real-mode extraction smoke.");
      return;
    }

    extractionDataDir = await mkdtemp(join(tmpdir(), "piano-poc-real-extraction-"));
    extractionServer = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(extractionPort),
        PIPELINE_MODE: "real",
        REAL_SEPARATOR: "ffmpeg-spectral",
        DATA_DIR: extractionDataDir
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    extractionServer.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    await waitForHealth(extractionBaseUrl);
  });

  after(async () => {
    extractionServer?.kill();
    if (extractionDataDir) {
      await rm(extractionDataDir, { recursive: true, force: true });
    }
  });

  it("extracts source audio, creates piano-focused stems, and exposes them as a practice result", async (t) => {
    const ffmpegCheck = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status !== 0) {
      t.skip("FFmpeg is not available; skipping real-mode extraction smoke.");
      return;
    }

    const { job: createdJob } = await uploadSample(extractionBaseUrl, "phase-2g-piano-mix.wav");
    const completedJob = await waitForComplete(createdJob.id, extractionBaseUrl);
    assert.equal(completedJob.status, "complete");
    assert.equal(completedJob.progress, 100);
    assert.deepEqual(completedJob.result.stems.map((stem) => stem.id).sort(), ["accompaniment", "piano"]);
    assert.equal(completedJob.result.metadata.ffmpeg.available, true);
    assert.equal(completedJob.result.metadata.ffmpeg.outputFilename, "source-audio.wav");
    assert.equal(completedJob.result.metadata.ffmpeg.outputCodec, "pcm_s16le");
    assert.ok(completedJob.result.metadata.ffmpeg.outputSize > 44);
    assert.equal(completedJob.result.metadata.durationSeconds, 6);
    assert.equal(completedJob.result.metadata.ffmpeg.durationSeconds, 6);
    assert.equal(completedJob.result.metadata.separator.available, true);
    assert.equal(completedJob.result.metadata.separator.name, "ffmpeg-spectral-piano-v1");
    assert.ok(completedJob.result.metadata.separator.durationMs >= 0);
    assert.equal(completedJob.result.metadata.separator.outputs.length, 2);
    assert.match(completedJob.result.metadata.separator.version, /^ffmpeg version /);
    assert.equal(completedJob.result.metadata.harmonySource, "real-audio-analysis-v1");
    assert.equal(completedJob.result.metadata.analysis.name, "beat-aware-chroma-v2");
    assert.equal(completedJob.result.metadata.analysis.sources.fullMix, "source-audio.wav");
    assert.ok(completedJob.result.metadata.beatGrid.bpm > 0);
    assert.ok(completedJob.result.metadata.beatGrid.bars.length >= 1);
    assert.ok(completedJob.result.metadata.chords.every((chord) => Number.isFinite(chord.bar)));

    const jobDir = join(extractionDataDir, "jobs", createdJob.id);
    const output = await stat(join(jobDir, "source-audio.wav"));
    assert.ok(output.size > 44);
    const piano = await stat(join(jobDir, "stems", "piano.wav"));
    const accompaniment = await stat(join(jobDir, "stems", "accompaniment.wav"));
    assert.ok(piano.size > 44);
    assert.ok(accompaniment.size > 44);

    for (const stem of completedJob.result.stems) {
      const audioResponse = await fetch(`${extractionBaseUrl}${stem.audioUrl}`);
      assert.equal(audioResponse.status, 200);
      assert.match(audioResponse.headers.get("content-type"), /^audio\/wav/);
      assert.ok((await audioResponse.arrayBuffer()).byteLength > 44);
    }

    const pianoResponse = await fetch(`${extractionBaseUrl}/api/jobs/${completedJob.id}/piano.wav`);
    assert.equal(pianoResponse.status, 200);
    assert.match(pianoResponse.headers.get("content-type"), /^audio\/wav/);

    const sourceAudioResponse = await fetch(`${extractionBaseUrl}/api/jobs/${completedJob.id}/source-audio.wav`);
    assert.equal(sourceAudioResponse.status, 200);
    assert.match(sourceAudioResponse.headers.get("content-type"), /^audio\/wav/);
    assert.ok((await sourceAudioResponse.arrayBuffer()).byteLength > 44);
  });

  it("aligns first-pass real chord cues to an estimated bar grid", async (t) => {
    const ffmpegCheck = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status !== 0) {
      t.skip("FFmpeg is not available; skipping real-mode harmonic analysis smoke.");
      return;
    }

    const { job: createdJob } = await uploadSample(extractionBaseUrl, "phase-2h-bar-grid.wav");
    const completedJob = await waitForComplete(createdJob.id, extractionBaseUrl);
    const metadata = completedJob.result.metadata;

    assert.equal(metadata.harmonySource, "real-audio-analysis-v1");
    assert.equal(metadata.analysisSource, "source-audio.wav");
    assert.equal(metadata.beatGrid.beatsPerBar, 4);
    assert.ok(metadata.beatGrid.confidence >= 0.1);
    assert.ok(Math.abs(metadata.beatGrid.bpm - 60) <= 8, JSON.stringify(metadata.beatGrid));
    assert.ok(Math.abs(metadata.beatGrid.downbeatOffsetSeconds - 0.65) <= 0.25, JSON.stringify(metadata.beatGrid));
    assert.ok(metadata.chords.length >= 3);
    assert.equal(metadata.chords[0].bar, 1);
    assert.ok(Math.abs(metadata.chords[0].start - metadata.beatGrid.downbeatOffsetSeconds) <= 0.25);
    assert.ok(Math.abs(metadata.chords[0].end - 4.65) <= 0.75);
    assert.ok(metadata.chords.slice(0, 4).every((chord) => chord.source === "beat-aligned-chroma"));
    assert.ok(metadata.chords.some((chord) => chord.name.startsWith("C")));
    assert.ok(metadata.chords.some((chord) => chord.name.startsWith("A")));
    assert.ok(metadata.chords.some((chord) => chord.name.startsWith("F")));
    assert.ok(metadata.chords.some((chord) => chord.name.startsWith("G")));
  });
});

describe("real-mode Demucs separator contract", () => {
  const demucsPort = Number(process.env.REAL_DEMUCS_TEST_PORT || 3213);
  const demucsBaseUrl = `http://127.0.0.1:${demucsPort}`;

  before(async (t) => {
    const ffmpegCheck = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status !== 0) {
      t.skip("FFmpeg is not available; skipping Demucs separator contract smoke.");
      return;
    }

    demucsDataDir = await mkdtemp(join(tmpdir(), "piano-poc-real-demucs-"));
    const fakeDemucsPath = join(demucsDataDir, "fake-demucs.mjs");
    await writeFile(
      fakeDemucsPath,
      `#!/usr/bin/env node
import { copyFile, mkdir } from "node:fs/promises";
import { join, parse } from "node:path";

const args = process.argv.slice(2);
if (args.includes("--version")) {
  console.log("fake-demucs 0.0.0");
  process.exit(0);
}

const model = args[args.indexOf("-n") + 1];
const outDir = args[args.indexOf("--out") + 1];
const input = args[args.length - 1];
const targetDir = join(outDir, model, parse(input).name);
await mkdir(targetDir, { recursive: true });
for (const percent of [10, 45, 80, 100]) {
  process.stderr.write(percent + "%| fake-demucs progress\\n");
  await new Promise((resolve) => setTimeout(resolve, 150));
}
for (const stem of ["drums", "bass", "guitar", "piano", "vocals", "other"]) {
  await copyFile(input, join(targetDir, stem + ".wav"));
}
`
    );
    await chmod(fakeDemucsPath, 0o755);

    demucsServer = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(demucsPort),
        PIPELINE_MODE: "real",
        REAL_SEPARATOR: "demucs",
        DEMUCS_PATH: fakeDemucsPath,
        DEMUCS_MODEL: "fake_model",
        TORCH_HOME: join(demucsDataDir, "torch-cache"),
        DATA_DIR: demucsDataDir
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    demucsServer.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    await waitForHealth(demucsBaseUrl);
  });

  after(async () => {
    demucsServer?.kill();
    if (demucsDataDir) {
      await rm(demucsDataDir, { recursive: true, force: true });
    }
  });

  it("creates six Demucs-compatible stems and exposes them as a practice result", async (t) => {
    const ffmpegCheck = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status !== 0) {
      t.skip("FFmpeg is not available; skipping Demucs separator contract smoke.");
      return;
    }

    const { job: createdJob } = await uploadSample(demucsBaseUrl, "phase-2g-piano-mix.wav");
    const progressJob = await waitForProgressAtLeast(createdJob.id, 60, demucsBaseUrl);
    assert.equal(progressJob.pipelineStage, "piano-focused-separation");
    assert.ok(progressJob.progress > 55);
    assert.ok(progressJob.progress < 100);

    const completedJob = await waitForComplete(createdJob.id, demucsBaseUrl);

    assert.equal(completedJob.status, "complete");
    assert.deepEqual(completedJob.result.stems.map((stem) => stem.id).sort(), [
      "bass",
      "drums",
      "guitar",
      "other",
      "piano",
      "vocals"
    ]);
    assert.equal(completedJob.result.metadata.separator.available, true);
    assert.equal(completedJob.result.metadata.separator.name, "demucs-fake_model");
    assert.equal(completedJob.result.metadata.separator.model, "fake_model");
    assert.equal(completedJob.result.metadata.separator.outputs.length, 6);
    assert.match(completedJob.result.metadata.separator.version, /fake-demucs/);
    assert.equal(completedJob.result.metadata.durationSeconds, 6);
    assert.equal(completedJob.result.metadata.ffmpeg.durationSeconds, 6);
    assert.equal(completedJob.result.metadata.harmonySource, "real-audio-analysis-v1");
    assert.equal(completedJob.result.metadata.analysis.name, "beat-aware-chroma-v2");

    const jobDir = join(demucsDataDir, "jobs", createdJob.id);
    for (const stemId of ["drums", "bass", "guitar", "piano", "vocals", "other"]) {
      const output = await stat(join(jobDir, "stems", `${stemId}.wav`));
      assert.ok(output.size > 44);
      const audioResponse = await fetch(`${demucsBaseUrl}/api/jobs/${completedJob.id}/stems/${stemId}.wav`);
      assert.equal(audioResponse.status, 200);
      assert.match(audioResponse.headers.get("content-type"), /^audio\/wav/);
    }
  });
});

describe("generated harmonic-analysis fixtures", () => {
  it("detects multiple chord changes inside 4/4 bars at 120 BPM", async () => {
    const metadata = await analyzeGeneratedHarmony("phase-2h-multi-chord-120.wav");

    assert.equal(metadata.beatGrid.beatsPerBar, 4);
    assert.ok(Math.abs(metadata.beatGrid.bpm - 120) <= 8, JSON.stringify(metadata.beatGrid));
    assert.deepEqual(metadata.chords.map((chord) => chord.name), ["C", "G", "Am", "F", "Dm", "G", "C"]);
    assert.deepEqual(metadata.chords.map((chord) => [chord.bar, chord.beat]), [
      [1, 1],
      [1, 3],
      [2, 1],
      [2, 3],
      [3, 1],
      [3, 3],
      [4, 1]
    ]);
  });

  it("detects a 3/4 harmonic grid at 90 BPM", async () => {
    const metadata = await analyzeGeneratedHarmony("phase-2h-three-four-90.wav");

    assert.equal(metadata.beatGrid.beatsPerBar, 3);
    assert.ok(Math.abs(metadata.beatGrid.bpm - 90) <= 8, JSON.stringify(metadata.beatGrid));
    assert.deepEqual(metadata.chords.map((chord) => chord.name), ["C", "F", "G", "C", "Dm"]);
    assert.deepEqual(metadata.chords.map((chord) => chord.bar), [1, 2, 3, 4, 5]);
  });

  it("keeps chord roots stable when the bass plays inversions", async () => {
    const metadata = await analyzeGeneratedHarmony("phase-2h-inversions-100.wav");

    assert.equal(metadata.beatGrid.beatsPerBar, 4);
    assert.ok(Math.abs(metadata.beatGrid.bpm - 100) <= 8, JSON.stringify(metadata.beatGrid));
    assert.deepEqual(metadata.chords.map((chord) => chord.name), ["C", "F", "G", "C"]);
  });
});

describe("local harmonic-analysis calibration", () => {
  it("matches the f9e9cf9d known 106 BPM C Dm Am fixture when present", async (t) => {
    const jobDir = join(process.cwd(), "data", "jobs", "f9e9cf9d-0998-494d-82cf-3dc89fcf4d76");
    const sourcePath = join(jobDir, "source-audio.wav");
    try {
      await stat(sourcePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        t.skip("Local calibration job f9e9cf9d is not available.");
        return;
      }
      throw error;
    }

    const outputs = ["drums", "bass", "guitar", "piano", "vocals", "other"].map((id) => ({
      id,
      filename: `${id}.wav`
    }));
    const metadata = await analyzeHarmonyFromAudio(
      { path: sourcePath, durationSeconds: 18.113208333333333, filename: "source-audio.wav" },
      { outputs }
    );

    assert.equal(metadata.beatGrid.bpm, 106);
    assert.equal(metadata.beatGrid.beatsPerBar, 4);
    assert.equal(metadata.beatGrid.downbeatOffsetSeconds, 0);
    assert.deepEqual(metadata.chords.slice(0, 8).map((chord) => chord.name), [
      "C",
      "Dm",
      "Am",
      "Am",
      "C",
      "Dm",
      "Am",
      "Am"
    ]);
  });
});
