#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const jobsRoot = join(repoRoot, "data", "jobs");
const manifest = join(repoRoot, "benchmarks", "chord-reliability-rwc-v1.json");
const audioRoot = join(repoRoot, ".benchmark-data", "chord-reliability-rwc-audio");

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function snapshotJobs() {
  const entries = await readdir(jobsRoot, { withFileTypes: true }).catch(() => []);
  const snapshot = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;
    const jobPath = join(jobsRoot, entry.name, "job.json");
    const metadata = await stat(jobPath).catch(() => null);
    const content = await readFile(jobPath).catch(() => null);
    snapshot.push({
      id: entry.name,
      size: metadata?.size ?? null,
      sha256: content ? createHash("sha256").update(content).digest("hex") : null
    });
  }
  return snapshot;
}

async function main() {
  const before = await snapshotJobs();
  await run(process.execPath, [join(scriptDir, "validate-chord-reliability-contract.js")]);
  await run(process.execPath, [
    join(scriptDir, "extract-rwc-pilot.js"),
    "--manifest", manifest,
    "--output", audioRoot
  ]);
  await run(process.execPath, [
    join(scriptDir, "benchmark-chords.js"),
    "--manifest", manifest,
    "--audio", audioRoot,
    "--split", "all",
    "--timing", "both",
    "--dry-run"
  ]);
  const after = await snapshotJobs();
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error("CR0 dry run changed application library jobs.");
  }
  console.log(`CR0 dry run created no application jobs (${after.length} existing job directories unchanged).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
