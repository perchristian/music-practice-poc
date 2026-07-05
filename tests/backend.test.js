import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const port = Number(process.env.BACKEND_TEST_PORT || 3210);
const baseUrl = `http://127.0.0.1:${port}`;
let server;

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
    server = spawn(process.execPath, ["server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        PIPELINE_MODE: "mock"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    server.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
    });

    await waitForHealth();
  });

  after(() => {
    server?.kill();
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

    const stems = completedJob.result.stems.map((stem) => stem.id).sort();
    assert.deepEqual(stems, ["bass", "drums", "guitar", "piano"]);

    for (const stemId of stems) {
      const response = await fetch(`${baseUrl}/api/jobs/${completedJob.id}/stems/${stemId}.wav`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "audio/wav");
      assert.ok((await response.arrayBuffer()).byteLength > 44);
    }
  });
});
