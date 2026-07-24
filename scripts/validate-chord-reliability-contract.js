#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readRwcTrack, validateIntervals } from "./chord-benchmark-lib.js";
import { selectArchiveMembers } from "./extract-rwc-pilot.js";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const defaultContract = join(repoRoot, "benchmarks", "chord-reliability-contract-v1.json");

function parseArgs(argv) {
  const options = {
    contract: defaultContract,
    skipArchiveChecksum: false,
    requireTargetReferences: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--skip-archive-checksum") options.skipArchiveChecksum = true;
    else if (argument === "--require-target-references") options.requireTargetReferences = true;
    else if (argument === "--contract") {
      const value = argv[++index];
      if (!value) throw new Error("Missing value for --contract.");
      options.contract = resolve(value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function digest(path, algorithm) {
  const hash = createHash(algorithm);
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function runCapture(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(stderr.trim() || `${command} exited with ${code}`));
    });
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveFromContract(contractPath, path) {
  return resolve(dirname(contractPath), "..", path);
}

function validateSplits(manifest) {
  const ids = manifest.tracks.map((track) => track.trackId);
  assert(new Set(ids).size === ids.length, "RWC manifest contains duplicate track ids.");
  const excluded = new Set(manifest.selection?.excludedTrackIds || []);
  const overlap = ids.filter((id) => excluded.has(id));
  assert(!overlap.length, `Consumed Phase 2J tracks entered CR0: ${overlap.join(", ")}`);
  const development = manifest.tracks.filter((track) => track.split === "development");
  const holdout = manifest.tracks.filter((track) => track.split === "holdout");
  assert(development.length === 8, `Expected 8 RWC development tracks, found ${development.length}.`);
  assert(holdout.length === 4, `Expected 4 RWC holdout tracks, found ${holdout.length}.`);
  for (const stratum of ["low", "medium", "high"]) {
    assert(manifest.tracks.some((track) => track.stratum === stratum && track.split === "development"), `Missing ${stratum} development track.`);
    assert(manifest.tracks.some((track) => track.stratum === stratum && track.split === "holdout"), `Missing ${stratum} holdout track.`);
  }
}

async function validateRwc(contract, contractPath, options) {
  const component = contract.components.rwc;
  const manifestPath = resolveFromContract(contractPath, component.manifest);
  assert(await digest(manifestPath, "sha256") === component.sha256, "RWC manifest SHA-256 mismatch.");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  validateSplits(manifest);

  const annotationsRoot = resolveFromContract(contractPath, contract.paths.rwcAnnotations);
  const annotationHead = (await runCapture("git", ["rev-parse", "HEAD"], { cwd: annotationsRoot })).trim();
  assert(annotationHead === manifest.dataset.annotationCommit, `RWC annotation commit mismatch: ${annotationHead}`);

  const archivePath = resolveFromContract(contractPath, contract.paths.rwcArchive);
  if (!options.skipArchiveChecksum) {
    assert(await digest(archivePath, "md5") === manifest.dataset.audioMd5, "RWC archive MD5 mismatch.");
  }
  const archiveListing = await runCapture("unzip", ["-Z1", archivePath]);
  selectArchiveMembers(archiveListing, manifest.tracks.map((track) => track.trackId));

  for (const selected of manifest.tracks) {
    const track = await readRwcTrack(annotationsRoot, selected.trackId);
    validateIntervals(track.chords, {
      durationSeconds: Math.max(track.durationSeconds, track.annotationEndSeconds),
      label: `${selected.trackId} reference chords`
    });
    assert(track.beats.length > 1, `${selected.trackId} has no usable timing reference.`);
  }
  return manifest;
}

async function probeMedia(path) {
  const output = await runCapture("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration,size:stream=codec_type,codec_name,sample_rate,channels",
    "-of", "json",
    path
  ]);
  return JSON.parse(output);
}

function closeEnough(actual, expected, tolerance) {
  return Math.abs(Number(actual) - Number(expected)) <= tolerance;
}

function validateScenarioContract(manifest) {
  const candidates = new Map(manifest.candidates.map((candidate) => [candidate.id, candidate]));
  for (const id of manifest.proposedDevelopmentIds) {
    assert(candidates.has(id), `Unknown proposed target development id: ${id}`);
  }
  const covered = new Set(manifest.proposedDevelopmentIds.flatMap((id) => candidates.get(id).proposedScenarios));
  for (const scenario of [
    "full-band-with-bass",
    "no-dedicated-bass",
    "piano-or-guitar-and-vocal",
    "melody-prominent",
    "ornament-heavy",
    "repeated-sections-with-legitimate-variation",
    "representative-three-minute-correction"
  ]) {
    assert(covered.has(scenario), `Proposed target development set does not cover ${scenario}.`);
  }
  assert(manifest.requiredUntouchedHoldoutSlots.length === 2, "Exactly two untouched target holdout slots must be locked.");
}

function validateReferenceDocument(reference, candidate, referencePath) {
  assert(reference.version === 1, `${referencePath} has an unsupported reference version.`);
  assert(reference.recordingId === candidate.id, `${referencePath} recording id mismatch.`);
  assert(reference.audioSha256 === candidate.sha256, `${referencePath} audio checksum mismatch.`);
  validateIntervals(reference.chords, {
    durationSeconds: candidate.durationSeconds,
    label: `${candidate.id} reference chords`
  });
  assert(Array.isArray(reference.timing?.bars) && reference.timing.bars.length >= 2, `${referencePath} needs at least two timed bars.`);
  let priorBar = -Infinity;
  let priorTime = -Infinity;
  for (const event of reference.timing.bars) {
    assert(Number.isInteger(event.bar) && event.bar > priorBar, `${referencePath} timing bars must increase.`);
    assert(Number.isFinite(event.timeSeconds) && event.timeSeconds > priorTime, `${referencePath} timing seconds must increase.`);
    priorBar = event.bar;
    priorTime = event.timeSeconds;
  }
  assert(Array.isArray(reference.sections) && reference.sections.length > 0, `${referencePath} needs reviewed sections.`);
  for (const section of reference.sections) {
    assert(Number.isInteger(section.startBar) && Number.isInteger(section.endBar) && section.endBar >= section.startBar, `${referencePath} has an invalid section range.`);
    assert(typeof section.repeatGroup === "string" || section.repeatGroup === null, `${referencePath} section repeatGroup must be a string or null.`);
    assert(typeof section.legitimateVariation === "boolean", `${referencePath} section variation flag must be boolean.`);
  }
  assert(reference.review?.timing?.reviewer && reference.review?.chords?.reviewer && reference.review?.sections?.reviewer, `${referencePath} is missing review identities.`);
  assert(reference.review?.verification?.reviewer, `${referencePath} is missing independent verification.`);
  assert(reference.review.verification.reviewer !== reference.review.chords.reviewer, `${referencePath} verifier must differ from the chord transcriber.`);
}

async function validateTargets(contract, contractPath, options) {
  const component = contract.components.target;
  const manifestPath = resolveFromContract(contractPath, component.manifest);
  assert(await digest(manifestPath, "sha256") === component.sha256, "Target manifest SHA-256 mismatch.");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  validateScenarioContract(manifest);
  const mediaRoot = resolveFromContract(contractPath, manifest.mediaRoot);
  const referenceRoot = resolveFromContract(contractPath, manifest.referenceRoot);
  let referenceCount = 0;

  for (const candidate of manifest.candidates) {
    const mediaPath = join(mediaRoot, candidate.path);
    const mediaStat = await stat(mediaPath);
    assert(mediaStat.size === candidate.bytes, `${candidate.id} size mismatch.`);
    assert(await digest(mediaPath, "sha256") === candidate.sha256, `${candidate.id} SHA-256 mismatch.`);
    const probe = await probeMedia(mediaPath);
    const audio = probe.streams.find((stream) => stream.codec_type === "audio");
    assert(audio, `${candidate.id} has no audio stream.`);
    assert(audio.codec_name === candidate.audio.codec, `${candidate.id} audio codec mismatch.`);
    assert(Number(audio.sample_rate) === candidate.audio.sampleRate, `${candidate.id} sample rate mismatch.`);
    assert(Number(audio.channels) === candidate.audio.channels, `${candidate.id} channel count mismatch.`);
    assert(closeEnough(probe.format.duration, candidate.durationSeconds, 0.02), `${candidate.id} duration mismatch.`);

    const referencePath = join(referenceRoot, `${candidate.id}.reference.json`);
    if (await exists(referencePath)) {
      validateReferenceDocument(JSON.parse(await readFile(referencePath, "utf8")), candidate, referencePath);
      referenceCount += 1;
    } else if (options.requireTargetReferences && manifest.proposedDevelopmentIds.includes(candidate.id)) {
      throw new Error(`Missing target reference: ${referencePath}`);
    }
  }
  return { manifest, referenceCount };
}

export async function validateContract(options) {
  const contract = JSON.parse(await readFile(options.contract, "utf8"));
  assert(contract.version === 1 && contract.contractId === "chord-reliability-cr0-v1", "Unsupported CR0 contract.");
  const rwc = await validateRwc(contract, options.contract, options);
  const target = await validateTargets(contract, options.contract, options);
  return {
    rwcDevelopmentTracks: rwc.tracks.filter((track) => track.split === "development").length,
    rwcHoldoutTracks: rwc.tracks.filter((track) => track.split === "holdout").length,
    targetCandidates: target.manifest.candidates.length,
    targetReferences: target.referenceCount,
    targetHoldoutSlots: target.manifest.requiredUntouchedHoldoutSlots.length
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await validateContract(options);
  console.log(
    `CR0 contract valid: ${result.rwcDevelopmentTracks} RWC development, ` +
    `${result.rwcHoldoutTracks} locked RWC holdout, ${result.targetCandidates} target candidates, ` +
    `${result.targetHoldoutSlots} required untouched target slots.`
  );
  console.log(`${result.targetReferences} independently reviewed target reference files are currently available.`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
