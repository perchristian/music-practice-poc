#!/usr/bin/env node
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeHarmonyFromAudio,
  chordSegmentsForTimingGrid,
  readPcm16WavFromFile
} from "../server.js";
import {
  audioCandidates,
  buildOracleTimingGrid,
  diagnosticsForBenchmarkResult,
  predictionsToIntervals,
  readRwcTrack,
  selectStratifiedPilot,
  validateAudioFilename
} from "./chord-benchmark-lib.js";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const defaults = {
  annotations: join(repoRoot, ".benchmark-data", "rwc-annotations"),
  audio: join(repoRoot, ".benchmark-data", "rwc-pilot-audio"),
  manifest: join(repoRoot, "benchmarks", "rwc-popular-pilot.json"),
  output: join(repoRoot, "benchmark-results"),
  python: join(repoRoot, ".venv-eval", "bin", "python"),
  chordinoTransform: join(repoRoot, "benchmarks", "chordino-transform.n3"),
  sonicAnnotator: process.env.SONIC_ANNOTATOR || "sonic-annotator"
};

function usage() {
  return `Usage:
  npm run benchmark:chords -- --timing oracle|estimated|both [--analyzer local|chordino] [--split development|holdout|all] [--smoothing isolated|none] [--evidence-policy POLICY] [--limit N]
  npm run benchmark:chords -- --create-manifest [--exclude-manifest PATH] [--count N] [--holdout-count N]

Options:
  --annotations PATH   RWC annotations checkout (default: .benchmark-data/rwc-annotations)
  --audio PATH         directory containing RWC_Pxxx.wav files
  --stems PATH         optional Demucs output root containing htdemucs_6s/RWC_Pxxx/*.wav
  --manifest PATH      locked benchmark manifest
  --exclude-manifest PATH
                       manifest whose consumed tracks cannot enter a new split
  --output PATH        ignored artifact output directory
  --python PATH        Python with requirements-eval.txt installed
  --track RWC_Pxxx     run one manifest track
  --split NAME         defaults to development, protecting the holdout
  --smoothing NAME     isolated (product default) or none (baseline control)
  --evidence-policy NAME
                       legacy, accompaniment-role, or accompaniment-chordal
  --analyzer NAME      local (default) or chordino external control
  --sonic-annotator PATH
                       Sonic Annotator executable used by --analyzer chordino
  --chordino-transform PATH
                       fixed Chordino transform configuration
  --limit N            run the first N selected tracks
  --count N            manifest creation only; defaults to 12
  --holdout-count N    manifest creation only; defaults to 4
  --allow-holdout      required to produce holdout/all analyzer results
  --dry-run            validate manifest, annotations, and audio only
`;
}

function parseArgs(argv) {
  const result = {
    ...defaults,
    timing: "oracle",
    split: "development",
    smoothing: "isolated",
    evidencePolicy: "legacy",
    analyzer: "local",
    limit: null,
    track: null,
    dryRun: false,
    createManifest: false,
    excludeManifest: null,
    count: 12,
    holdoutCount: 4,
    allowHoldout: false
  };
  const pathKeys = new Set([
    "annotations", "audio", "stems", "manifest", "output", "python", "exclude-manifest",
    "sonic-annotator", "chordino-transform"
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (argument === "--create-manifest") {
      result.createManifest = true;
      continue;
    }
    if (argument === "--allow-holdout") {
      result.allowHoldout = true;
      continue;
    }
    const key = argument.startsWith("--") ? argument.slice(2) : null;
    if (![...pathKeys, "timing", "split", "smoothing", "evidence-policy", "analyzer", "limit", "track", "count", "holdout-count"].includes(key)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    index += 1;
    const normalizedKey = key.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    result[normalizedKey] = pathKeys.has(key) ? resolve(value) : value;
  }
  if (!new Set(["oracle", "estimated", "both"]).has(result.timing)) throw new Error(`Invalid timing mode: ${result.timing}`);
  if (!new Set(["local", "chordino"]).has(result.analyzer)) throw new Error(`Invalid analyzer: ${result.analyzer}`);
  if (!new Set(["development", "holdout", "all"]).has(result.split)) throw new Error(`Invalid split: ${result.split}`);
  if (!new Set(["isolated", "none"]).has(result.smoothing)) throw new Error(`Invalid smoothing mode: ${result.smoothing}`);
  if (!new Set(["legacy", "accompaniment-role", "accompaniment-chordal"]).has(result.evidencePolicy)) {
    throw new Error(`Invalid evidence policy: ${result.evidencePolicy}`);
  }
  for (const [key, flag] of [["limit", "--limit"], ["count", "--count"], ["holdoutCount", "--holdout-count"]]) {
    if (result[key] === null) continue;
    result[key] = Number(result[key]);
    if (!Number.isInteger(result[key]) || result[key] < 1) throw new Error(`${flag} must be a positive integer.`);
  }
  if (result.count % 3 !== 0) throw new Error("--count must be divisible by three.");
  if (result.holdoutCount >= result.count) throw new Error("--holdout-count must be smaller than --count.");
  return result;
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readGitHead(repository) {
  const gitDirectory = join(repository, ".git");
  const head = (await readFile(join(gitDirectory, "HEAD"), "utf8")).trim();
  if (/^[a-f0-9]{40}$/.test(head)) return head;
  const reference = head.match(/^ref: (.+)$/)?.[1];
  if (!reference) return "unknown";
  const loose = await readFile(join(gitDirectory, reference), "utf8").catch(() => null);
  if (loose?.trim()) return loose.trim();
  const packed = await readFile(join(gitDirectory, "packed-refs"), "utf8").catch(() => "");
  return packed.split("\n").find((line) => line.endsWith(` ${reference}`))?.split(" ")[0] || "unknown";
}

export function lockedHoldoutIndexes(count, holdoutCount) {
  if (!Number.isInteger(count) || count < 3 || count % 3 !== 0) throw new Error("Track count must be divisible by three.");
  if (!Number.isInteger(holdoutCount) || holdoutCount < 1 || holdoutCount >= count) throw new Error("Invalid holdout count.");
  const perStratum = count / 3;
  const holdoutPerStratum = [0, 0, 0];
  for (let index = 0; index < holdoutCount; index += 1) {
    holdoutPerStratum[[1, 0, 2][index % 3]] += 1;
  }
  const indexes = new Set();
  for (let stratum = 0; stratum < 3; stratum += 1) {
    for (let slot = 0; slot < holdoutPerStratum[stratum]; slot += 1) {
      const localIndex = Math.round(((slot + 0.5) * perStratum) / holdoutPerStratum[stratum] - 0.5);
      indexes.add(stratum * perStratum + localIndex);
    }
  }
  return indexes;
}

export function assertHoldoutAccess(selectedTracks, { dryRun, allowHoldout }) {
  if (!dryRun && selectedTracks.some((track) => track.split === "holdout") && !allowHoldout) {
    throw new Error("Holdout analyzer results are locked. Re-run with --allow-holdout only at a precommitted milestone gate.");
  }
}

async function createManifest(options) {
  const tracks = [];
  for (let piece = 1; piece <= 100; piece += 1) {
    tracks.push(await readRwcTrack(options.annotations, `RWC_P${String(piece).padStart(3, "0")}`));
  }
  const excludedManifest = options.excludeManifest
    ? JSON.parse(await readFile(options.excludeManifest, "utf8"))
    : null;
  const excludedTrackIds = new Set((excludedManifest?.tracks || []).map((track) => track.trackId));
  const eligibleTracks = tracks.filter((track) => !excludedTrackIds.has(track.trackId));
  const selected = selectStratifiedPilot(eligibleTracks, options.count);
  const perStratum = options.count / 3;
  const holdoutIndexes = lockedHoldoutIndexes(options.count, options.holdoutCount);
  const annotationCommit = await readGitHead(options.annotations);
  const isReliabilityGate = Boolean(excludedManifest);
  const manifest = {
    version: isReliabilityGate ? 2 : 1,
    benchmark: isReliabilityGate
      ? "RWC Popular Music Database v2 chord reliability gate"
      : "RWC Popular Music Database v2 chord pilot",
    dataset: {
      record: "https://zenodo.org/records/18656623",
      audioArchive: "RWC-P.zip",
      audioMd5: "960a11a2d7fb603ad0dae8428f53d4f0",
      license: "CC BY-NC 4.0",
      annotations: "https://github.com/rwc-music/rwc-annotations",
      annotationCommit
    },
    selection: {
      method: `Weighted standardized chord-density, vocabulary, entropy, tempo, duration, and instrumentation features; three equal complexity strata with ${perStratum} deterministic quantile samples each.`,
      policy: `${options.count - options.holdoutCount} development tracks and ${options.holdoutCount} untouched holdout tracks. Do not tune against holdout results.`,
      ...(excludedManifest ? {
        excludedManifest: relative(repoRoot, options.excludeManifest),
        excludedTrackIds: [...excludedTrackIds].sort(),
        exclusionReason: "The Phase 2J pilot and its holdout were consumed before CR0 and are unavailable for tuning or a new holdout."
      } : {})
    },
    tracks: selected.map(({ track, complexity, stratum }, index) => ({
      trackId: track.trackId,
      title: track.title,
      artist: track.artist,
      split: holdoutIndexes.has(index) ? "holdout" : "development",
      stratum,
      complexity
    }))
  };
  await mkdir(dirname(options.manifest), { recursive: true });
  await writeFile(options.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote locked ${options.count - options.holdoutCount}/${options.holdoutCount} manifest to ${options.manifest}`);
  for (const track of manifest.tracks) {
    console.log(`${track.split.padEnd(11)} ${track.stratum.padEnd(6)} ${track.trackId} ${track.title}`);
  }
}

async function findAudio(audioRoot, trackId) {
  for (const candidate of audioCandidates(audioRoot, trackId)) {
    if (await fileExists(candidate)) return validateAudioFilename(candidate, trackId);
  }
  throw new Error(`Missing ${trackId}.wav under ${audioRoot}. See docs/research/chord-analysis-benchmark-strategy.md.`);
}

async function findStemOutputs(stemsRoot, trackId) {
  if (!stemsRoot) return [];
  const stemIds = ["drums", "bass", "guitar", "piano", "vocals", "other"];
  const directories = [
    join(stemsRoot, "htdemucs_6s", trackId),
    join(stemsRoot, trackId)
  ];
  for (const directory of directories) {
    const paths = stemIds.map((id) => ({ id, analysisPath: join(directory, `${id}.wav`) }));
    if ((await Promise.all(paths.map((stem) => fileExists(stem.analysisPath)))).every(Boolean)) {
      return paths.map((stem) => ({ ...stem, filename: `${stem.id}.wav` }));
    }
  }
  throw new Error(`Missing six-source Demucs stems for ${trackId} under ${stemsRoot}.`);
}

function runProcess(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
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

function mergeAdjacentIntervals(intervals) {
  const merged = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous?.label === interval.label && Math.abs(previous.end - interval.start) < 0.001) {
      previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function parseChordinoCsv(text, durationSeconds) {
  const events = String(text).trim().split("\n").filter(Boolean).map((line, index) => {
    const match = line.match(/^(?:"(?:[^"]|"")*"|),([0-9.]+),"([^"]+)"$/);
    if (!match) throw new Error(`Malformed Chordino CSV row ${index + 1}.`);
    return { time: Number(match[1]), label: match[2] };
  }).filter((event) => event.time < durationSeconds);
  if (!events.length) throw new Error("Chordino returned no chord events.");
  if (events.some((event, index) => index && event.time <= events[index - 1].time)) {
    throw new Error("Chordino events must be strictly increasing.");
  }
  return mergeAdjacentIntervals(events.map((event, index) => ({
    start: event.time,
    end: events[index + 1]?.time ?? durationSeconds,
    label: event.label
  })).filter((interval) => interval.end > interval.start));
}

function labelAt(intervals, time) {
  return intervals.find((interval) => interval.start <= time && interval.end > time)?.label || "N";
}

export function alignChordinoToSegments(intervals, segments) {
  return mergeAdjacentIntervals(segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    label: labelAt(intervals, (segment.start + segment.end) / 2)
  })));
}

async function analyzeWithChordino(options, audioPath, durationSeconds, cache) {
  if (!cache.has(audioPath)) {
    cache.set(audioPath, (async () => {
      const startedAt = performance.now();
      const stdout = await runProcess(options.sonicAnnotator, [
        "-q", "-t", options.chordinoTransform, "-w", "csv", "--csv-stdout", audioPath
      ]);
      return {
        intervals: parseChordinoCsv(stdout, durationSeconds),
        runtimeMs: performance.now() - startedAt
      };
    })());
  }
  return cache.get(audioPath);
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function markdownReport(report, jsonFilename) {
  const { aggregate, complexityGroups } = report.evaluation;
  const winnerChanges = Object.entries(report.diagnosticsSummary.winnerChangeCounts)
    .map(([evidence, count]) => `${evidence} ${count}`)
    .join(", ") || "none";
  const lines = [
    `# RWC-P ${report.timing} ${report.split} report`,
    "",
    `Tracks: ${report.trackCount} · analyzer: ${report.analyzer} · evidence: ${report.evidenceMode}/${report.evidencePolicy} · smoothing: ${report.smoothing} · evaluator: mir_eval ${report.evaluation.evaluator.version} · detailed JSON: \`${jsonFilename}\``,
    "",
    "| Metric | Duration weighted | Track median | OOV seconds |",
    "| --- | ---: | ---: | ---: |",
    ...["root", "majmin", "triads", "mirex"].map((metric) => {
      const value = aggregate.metrics[metric];
      return `| ${metric} | ${percent(value.score)} | ${percent(value.medianTrackScore)} | ${value.oovDurationSeconds.toFixed(1)} |`;
    }),
    "",
    "| Boundary tolerance | Precision | Recall | F1 | Extra | Missing |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...["100ms", "250ms"].map((name) => {
      const value = aggregate.boundaries.tolerances[name];
      return `| ${name} | ${percent(value.precision)} | ${percent(value.recall)} | ${percent(value.f1)} | ${value.falseExtraCount} | ${value.missingCount} |`;
    }),
    "",
    `Reference changes/min: ${aggregate.cueDensity.referenceChangesPerMinute.toFixed(1)}; estimated changes/min: ${aggregate.cueDensity.estimatedChangesPerMinute.toFixed(1)}; raw analyzer cues/min: ${aggregate.cueDensity.rawEstimatedCuesPerMinute.toFixed(1)}.`,
    `Runtime: ${(aggregate.runtimeMs.total / 1000).toFixed(1)}s total; real-time factor ${aggregate.runtimeMs.realTimeFactor.toFixed(4)}; peak RSS estimate ${(report.peakResidentMemoryEstimateBytes / 1024 / 1024).toFixed(1)} MiB.`,
    `Diagnostics: ${report.diagnosticsSummary.beatCount} beats; sources ${report.diagnosticsSummary.sourceIds.join(", ")}; winner changes: ${winnerChanges}.`,
    "",
    "| Complexity | MajMin | MIREX | Changes/min |",
    "| --- | ---: | ---: | ---: |",
    ...Object.entries(complexityGroups).map(([stratum, value]) =>
      `| ${stratum} | ${percent(value.metrics.majmin.score)} | ${percent(value.metrics.mirex.score)} | ${value.cueDensity.estimatedChangesPerMinute.toFixed(1)} |`
    ),
    "",
    "Weakest tracks by MajMin:",
    "",
    ...aggregate.errors.lowestMajMinTracks.map((track) => `- ${track.trackId}: ${percent(track.score)}`),
    "",
    `Error duration: wrong root ${aggregate.errors.durationSeconds["wrong-root"].toFixed(1)}s; wrong quality ${aggregate.errors.durationSeconds["wrong-quality"].toFixed(1)}s; reference OOV ${aggregate.errors.durationSeconds["reference-oov"].toFixed(1)}s.`,
    ""
  ];
  return lines.join("\n");
}

async function evaluateWithMirEval(options, payload) {
  if (!(await fileExists(options.python))) {
    throw new Error(`Evaluation Python not found at ${options.python}. Create it and install requirements-eval.txt.`);
  }
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "piano-chord-benchmark-"));
  const inputPath = join(temporaryDirectory, "predictions.json");
  try {
    await writeFile(inputPath, JSON.stringify(payload));
    const stdout = await runProcess(options.python, [join(scriptDir, "evaluate-chords.py"), inputPath]);
    return JSON.parse(stdout);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function runTimingMode(options, manifest, selectedTracks, timing, chordinoCache) {
  const predictions = [];
  let peakResidentMemoryEstimateBytes = process.memoryUsage().rss;
  for (const [index, selected] of selectedTracks.entries()) {
    const track = await readRwcTrack(options.annotations, selected.trackId);
    const audioPath = await findAudio(options.audio, track.trackId);
    const audio = await readPcm16WavFromFile(audioPath);
    if (Math.abs(audio.durationSeconds - track.durationSeconds) > 0.1) {
      throw new Error(`${track.trackId} audio duration ${audio.durationSeconds.toFixed(3)}s does not match metadata ${track.durationSeconds.toFixed(3)}s.`);
    }
    console.log(`[${index + 1}/${selectedTracks.length}] ${timing} ${track.trackId} (${audio.durationSeconds.toFixed(1)}s)`);
    const outputs = options.analyzer === "local" ? await findStemOutputs(options.stems, track.trackId) : [];
    if (options.dryRun) continue;
    const result = options.analyzer === "local"
      ? await analyzeHarmonyFromAudio(
        { path: audioPath, durationSeconds: audio.durationSeconds },
        { outputs },
        {
          ...(timing === "oracle" ? { timingGrid: buildOracleTimingGrid(track) } : {}),
          sequenceSmoothing: options.smoothing,
          evidencePolicy: options.evidencePolicy,
          includeDiagnostics: true
        }
      )
      : await analyzeWithChordino(options, audioPath, audio.durationSeconds, chordinoCache);
    const estimated = options.analyzer === "local"
      ? predictionsToIntervals(result.chords)
      : timing === "oracle"
        ? alignChordinoToSegments(
          result.intervals,
          chordSegmentsForTimingGrid(buildOracleTimingGrid(track), audio.durationSeconds)
        )
        : result.intervals;
    peakResidentMemoryEstimateBytes = Math.max(peakResidentMemoryEstimateBytes, process.memoryUsage().rss);
    predictions.push({
      trackId: track.trackId,
      split: selected.split,
      stratum: selected.stratum,
      durationSeconds: audio.durationSeconds,
      runtimeMs: options.analyzer === "local" ? result.analysis.durationMs : result.runtimeMs,
      reference: track.chords,
      estimated,
      estimatedKey: options.analyzer === "local" ? result.key : null,
      analyzer: options.analyzer === "local" ? result.analysis.name : "chordino-v5",
      ...(options.analyzer === "local" ? { diagnostics: diagnosticsForBenchmarkResult(result) } : {})
    });
  }
  if (options.dryRun) return null;

  const evaluation = await evaluateWithMirEval(options, {
    tracks: predictions.map(({ diagnostics, ...prediction }) => prediction)
  });
  const diagnostics = predictions
    .filter((prediction) => prediction.diagnostics)
    .map(({ trackId, diagnostics }) => ({ trackId, ...diagnostics }));
  const diagnosticBeats = diagnostics.flatMap((track) => track.beats);
  const winnerChangeCounts = {};
  for (const change of diagnosticBeats.flatMap((beat) => beat.winnerChanges)) {
    winnerChangeCounts[change.evidence] = (winnerChangeCounts[change.evidence] || 0) + 1;
  }
  const report = {
    version: 4,
    createdAt: new Date().toISOString(),
    timing,
    split: options.split,
    smoothing: options.smoothing,
    analyzer: options.analyzer,
    evidencePolicy: options.analyzer === "local" ? options.evidencePolicy : "chordino-defaults",
    evidenceMode: options.analyzer === "local" && options.stems ? "demucs-assisted" : "full-mix",
    manifest: options.manifest,
    dataset: manifest.dataset,
    trackCount: predictions.length,
    peakResidentMemoryEstimateBytes,
    memoryMeasurement: options.analyzer === "local" ? "benchmark-process" : "benchmark-driver-only",
    diagnosticsSummary: {
      beatCount: diagnosticBeats.length,
      sourceIds: [...new Set(diagnostics.flatMap((track) => track.sourceIds))],
      winnerChangeCounts
    },
    diagnostics,
    evaluation
  };
  await mkdir(options.output, { recursive: true });
  const filename = `rwc-popular-${timing}-${report.analyzer}-${report.evidenceMode}-${report.evidencePolicy}-${options.smoothing}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outputPath = join(options.output, filename);
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  const markdownPath = outputPath.replace(/\.json$/, ".md");
  await writeFile(markdownPath, markdownReport(report, filename));
  const aggregate = evaluation.aggregate;
  console.log(
    `Result ${timing}: MajMin ${(aggregate.metrics.majmin.score * 100).toFixed(1)}%, ` +
    `MIREX ${(aggregate.metrics.mirex.score * 100).toFixed(1)}%, boundary F1 ${(aggregate.boundaries.f1 * 100).toFixed(1)}%`
  );
  console.log(`Detailed ignored artifacts: ${outputPath} and ${markdownPath}`);
  return report;
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.createManifest) {
    await createManifest(options);
    return;
  }
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  let selectedTracks = options.split === "all" ? manifest.tracks : manifest.tracks.filter((track) => track.split === options.split);
  if (options.track) selectedTracks = selectedTracks.filter((track) => track.trackId === options.track);
  if (options.limit !== null) selectedTracks = selectedTracks.slice(0, options.limit);
  if (!selectedTracks.length) throw new Error("No manifest tracks matched the requested selection.");
  assertHoldoutAccess(selectedTracks, options);
  const modes = options.timing === "both" ? ["oracle", "estimated"] : [options.timing];
  const chordinoCache = new Map();
  for (const timing of modes) await runTimingMode(options, manifest, selectedTracks, timing, chordinoCache);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
