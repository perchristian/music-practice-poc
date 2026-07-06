import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = Number(process.env.BACKEND_TEST_PORT || 3210);
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

  throw lastError || new Error("Backend did not become ready.");
}

async function waitForComplete(jobId) {
  const deadline = Date.now() + 10_000;
  let latestJob;

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/api/jobs/${jobId}`);
    assert.equal(response.status, 200);
    latestJob = await response.json();
    if (latestJob.status === "complete") return latestJob;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Job did not complete. Latest status: ${latestJob?.status ?? "unknown"}`);
}

describe("mock backend", () => {
  before(async () => {
    testDataDir = await mkdtemp(join(tmpdir(), "piano-poc-backend-"));
    server = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        PIPELINE_MODE: "mock",
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

  it("creates a mock job and exposes practice stems plus harmonic metadata", async () => {
    const createResponse = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "screen-recording.mov",
        size: 500_000_000,
        type: "video/quicktime"
      })
    });

    assert.equal(createResponse.status, 202);
    const createdJob = await createResponse.json();
    assert.equal(createdJob.mockUpload, true);

    const completedJob = await waitForComplete(createdJob.id);
    assert.equal(completedJob.status, "complete");
    assert.equal(completedJob.progress, 100);
    assert.equal(completedJob.result.metadata.key.tonic, "C");

    const stems = completedJob.result.stems;
    const stemIds = stems.map((stem) => stem.id).sort();
    assert.ok(stemIds.includes("piano"));
    assert.ok(
      stemIds.includes("accompaniment") ||
        ["bass", "drums", "guitar"].every((stemId) => stemIds.includes(stemId))
    );

    for (const stem of stems) {
      const response = await fetch(`${baseUrl}${stem.audioUrl}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /^audio\/(mp4|wav)/);
      assert.ok((await response.arrayBuffer()).byteLength > 44);
    }
  });

  it("exposes an already processed mock demo job for skipping upload during development", async () => {
    const response = await fetch(`${baseUrl}/api/demo/processed-job`);

    assert.equal(response.status, 200);
    const job = await response.json();
    assert.equal(job.status, "complete");
    assert.equal(job.progress, 100);
    assert.equal(job.mockUpload, true);
    assert.equal(job.originalFilename, "demo-processed-screen-recording.mov");
    assert.equal(job.result.metadata.key.tonic, "C");
    assert.ok(job.result.stems.some((stem) => stem.id === "piano"));
  });

  it("persists processed song library metadata and practice state", async () => {
    const createResponse = await fetch(`${baseUrl}/api/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filename: "phase-one-screen-recording.mov",
        size: 42_000_000,
        type: "video/quicktime"
      })
    });

    assert.equal(createResponse.status, 202);
    const createdJob = await createResponse.json();
    const completedJob = await waitForComplete(createdJob.id);
    const pianoStem = completedJob.result.stems.find((stem) => stem.id === "piano");
    assert.ok(pianoStem);

    const stateResponse = await fetch(`${baseUrl}/api/jobs/${completedJob.id}/practice-state`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        learningStatus: "practicing",
        playbackRate: 0.75,
        loopStart: 1.5,
        loopEnd: 5.5,
        loopEnabled: true,
        lastPosition: 3.25,
        stemStates: {
          piano: { muted: true, solo: false, volume: 0.35 }
        }
      })
    });
    assert.equal(stateResponse.status, 200);
    const updatedJob = await stateResponse.json();
    assert.equal(updatedJob.practiceState.learningStatus, "practicing");
    assert.equal(updatedJob.practiceState.playbackRate, 0.75);
    assert.equal(updatedJob.practiceState.loopStart, 1.5);
    assert.equal(updatedJob.practiceState.loopEnd, 5.5);
    assert.equal(updatedJob.practiceState.loopEnabled, true);
    assert.equal(updatedJob.practiceState.lastPosition, 3.25);
    assert.equal(updatedJob.practiceState.stemStates.piano.muted, true);
    assert.equal(updatedJob.practiceState.stemStates.piano.volume, 0.35);

    const renameResponse = await fetch(`${baseUrl}/api/jobs/${completedJob.id}/rename`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ originalFilename: "Renamed practice song" })
    });
    assert.equal(renameResponse.status, 200);
    const renamedJob = await renameResponse.json();
    assert.equal(renamedJob.originalFilename, "Renamed practice song");

    const libraryResponse = await fetch(`${baseUrl}/api/library`);
    assert.equal(libraryResponse.status, 200);
    const entries = await libraryResponse.json();
    const libraryEntry = entries.find((entry) => entry.id === completedJob.id);
    assert.ok(libraryEntry);
    assert.equal(libraryEntry.originalFilename, "Renamed practice song");
    assert.equal(libraryEntry.practiceState.learningStatus, "practicing");
    assert.equal(libraryEntry.practiceState.stemStates.piano.muted, true);

    const reopenedResponse = await fetch(`${baseUrl}/api/jobs/${completedJob.id}`);
    assert.equal(reopenedResponse.status, 200);
    const reopenedJob = await reopenedResponse.json();
    assert.equal(reopenedJob.originalFilename, "Renamed practice song");
    assert.equal(reopenedJob.practiceState.playbackRate, 0.75);
    assert.equal(reopenedJob.practiceState.lastPosition, 3.25);

    const deleteResponse = await fetch(`${baseUrl}/api/jobs/${completedJob.id}`, { method: "DELETE" });
    assert.equal(deleteResponse.status, 200);

    const missingResponse = await fetch(`${baseUrl}/api/jobs/${completedJob.id}`);
    assert.equal(missingResponse.status, 404);

    const libraryAfterDeleteResponse = await fetch(`${baseUrl}/api/library`);
    assert.equal(libraryAfterDeleteResponse.status, 200);
    const entriesAfterDelete = await libraryAfterDeleteResponse.json();
    assert.equal(entriesAfterDelete.some((entry) => entry.id === completedJob.id), false);
  });
});
