import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.REAL_BACKEND_TEST_PORT || 3211);
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let testDataDir;

async function waitForHealth() {
  const deadline = Date.now() + 10_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
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

describe("real-mode upload contract", () => {
  before(async () => {
    testDataDir = await mkdtemp(join(tmpdir(), "piano-poc-real-backend-"));
    server = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        PIPELINE_MODE: "real",
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

  it("accepts multipart media, stores source media, and returns API-visible failure state", async () => {
    const formData = new FormData();
    const mediaBytes = await readFile(join(process.cwd(), "test-media", "phase-2a-source.wav"));
    formData.append("media", new Blob([mediaBytes], { type: "audio/wav" }), "phase-2a-source.wav");

    const createResponse = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      body: formData
    });

    assert.equal(createResponse.status, 202);
    const createdJob = await createResponse.json();
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

    const { job: failedJob, statuses } = await waitForFailed(createdJob.id);
    assert.ok(statuses.includes("processing"));
    assert.equal(failedJob.status, "failed");
    assert.match(failedJob.error, /FFmpeg extraction is not implemented yet/);
    assert.equal(failedJob.result, null);
    assert.equal(failedJob.source.filename, "source.wav");

    const persistedJob = JSON.parse(await readFile(join(jobDir, "job.json"), "utf8"));
    assert.equal(persistedJob.status, "failed");
    assert.equal(persistedJob.sourceFilename, "source.wav");
    assert.equal(persistedJob.originalType, "audio/wav");
    assert.equal(persistedJob.originalSize, mediaBytes.length);
    assert.match(persistedJob.error, /FFmpeg extraction is not implemented yet/);
    assert.equal(persistedJob.metadata.failure.sourceStored, true);
  });
});
