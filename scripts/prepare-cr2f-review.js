#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chordSegmentsForTimingGrid, readPcm16WavFromFile } from "../server.js";
import {
  alignChordinoToMusicalWindows,
  diagnoseChordinoMusicalWindows
} from "./benchmark-chords.js";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifactRoot = join(repoRoot, "benchmark-results", "chord-reliability", "cr2e", "manual");
const gridContractPath = join(repoRoot, "benchmarks", "chord-reliability-cr2f-manual-grids.json");

function parseLab(text, durationSeconds) {
  return String(text).trim().split("\n").filter(Boolean).map((line, index) => {
    const [start, end, label] = line.split("\t");
    const interval = {
      start: Number(start),
      end: Number(end),
      label: label?.replace(/^"|"$/g, "")
    };
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || !interval.label) {
      throw new Error(`Malformed lab row ${index + 1}.`);
    }
    return { ...interval, end: Math.min(interval.end, durationSeconds) };
  }).filter((interval) => interval.start < durationSeconds && interval.end > interval.start);
}

function labText(intervals) {
  return `${intervals.map((interval) =>
    `${interval.start.toFixed(6)}\t${interval.end.toFixed(6)}\t"${interval.label}"`
  ).join("\n")}\n`;
}

async function main() {
  const gridContract = JSON.parse(await readFile(gridContractPath, "utf8"));
  const summaries = [];
  for (const scenario of gridContract.scenarios) {
    const audioPath = join(artifactRoot, `${scenario.id}.wav`);
    const rawPath = join(artifactRoot, `${scenario.id}_vamp_nnls-chroma_chordino_simplechord.lab`);
    const candidatePath = join(artifactRoot, `${scenario.id}_chordino-musical-window-v1.lab`);
    const [audio, rawText] = await Promise.all([
      readPcm16WavFromFile(audioPath),
      readFile(rawPath, "utf8")
    ]);
    const segments = chordSegmentsForTimingGrid(scenario.grid, audio.durationSeconds);
    if (!segments) throw new Error(`${scenario.id} has no authoritative timing segments.`);
    const raw = parseLab(rawText, audio.durationSeconds);
    const candidate = alignChordinoToMusicalWindows(raw, segments, { smoothing: "isolated" });
    await mkdir(dirname(candidatePath), { recursive: true });
    await writeFile(candidatePath, labText(candidate));
    summaries.push({
      scenario: scenario.id,
      sourceId: scenario.sourceId,
      sourceSha256: scenario.sourceSha256,
      timingEventCount: scenario.grid.timingMap.events.length,
      rawCueCount: raw.length,
      candidateCueCount: candidate.length,
      ...diagnoseChordinoMusicalWindows(raw, segments)
    });
    console.log(`${scenario.id}: ${raw.length} raw cues -> ${candidate.length} candidate cues`);
  }
  await writeFile(
    join(artifactRoot, "cr2f-musical-window-v1-diagnostics.json"),
    `${JSON.stringify({ version: 1, policy: "chordino-musical-window-v1", scenarios: summaries }, null, 2)}\n`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
