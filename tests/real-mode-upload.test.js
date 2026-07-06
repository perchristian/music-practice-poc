import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.REAL_BACKEND_TEST_PORT || 3211);
const baseUrl = `http://127.0.0.1:${port}`;
const extractionPort = Number(process.env.REAL_EXTRACTION_TEST_PORT || 3212);
const extractionBaseUrl = `http://127.0.0.1:${extractionPort}`;
let server;
let extractionServer;
let testDataDir;
let extractionDataDir;

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

async function uploadSample(url = baseUrl, filename = "phase-2a-source.wav") {
  const formData = new FormData();
  const mediaBytes = await readFile(join(process.cwd(), "test-media", filename));
  formData.append("media", new Blob([mediaBytes], { type: "audio/wav" }), filename);

  const createResponse = await fetch(`${url}/api/jobs`, {
    method: "POST",
    body: formData
  });

  assert.equal(createResponse.status, 202);
  return { job: await createResponse.json(), mediaBytes };
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
    assert.ok(completedJob.result.metadata.ffmpeg.outputSize > 44);
    assert.equal(completedJob.result.metadata.separator.available, true);
    assert.equal(completedJob.result.metadata.separator.name, "ffmpeg-spectral-piano-v1");
    assert.ok(completedJob.result.metadata.separator.durationMs >= 0);
    assert.equal(completedJob.result.metadata.separator.outputs.length, 2);
    assert.match(completedJob.result.metadata.separator.version, /^ffmpeg version /);
    assert.equal(completedJob.result.metadata.harmonySource, "mock");

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
  });
});
