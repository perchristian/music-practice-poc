#!/usr/bin/env node
import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(scriptDir, "..");

function parseArgs(argv) {
  const options = {
    archive: join(repoRoot, ".benchmark-data", "RWC-P.zip"),
    manifest: join(repoRoot, "benchmarks", "rwc-popular-pilot.json"),
    output: join(repoRoot, ".benchmark-data", "rwc-pilot-audio"),
    force: false,
    skipChecksum: false,
    prune: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--force") options.force = true;
    else if (argument === "--skip-checksum") options.skipChecksum = true;
    else if (argument === "--prune") options.prune = true;
    else if (["--archive", "--manifest", "--output"].includes(argument)) {
      const value = argv[++index];
      if (!value) throw new Error(`Missing value for ${argument}.`);
      options[argument.slice(2)] = resolve(value);
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function runCapture(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(stdout) : reject(new Error(stderr.trim() || `unzip exited with ${code}`)));
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

async function md5(path) {
  const hash = createHash("md5");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export function selectArchiveMembers(listing, trackIds) {
  const members = String(listing).replace(/\r/g, "").split("\n").filter(Boolean);
  return trackIds.map((trackId) => {
    const matches = members.filter((member) => basename(member).toLowerCase() === `${trackId.toLowerCase()}.wav`);
    if (matches.length !== 1) throw new Error(`Expected one WAV member for ${trackId}, found ${matches.length}.`);
    return { trackId, member: matches[0] };
  });
}

function extractMember(archive, member, target) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("unzip", ["-p", archive, member], { stdio: ["ignore", "pipe", "pipe"] });
    const output = createWriteStream(target);
    let stderr = "";
    let childFinished = false;
    let outputFinished = false;
    let failed = false;
    const finish = () => {
      if (!failed && childFinished && outputFinished) resolvePromise();
    };
    const fail = (error) => {
      if (failed) return;
      failed = true;
      reject(error);
    };
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.stdout.pipe(output);
    child.on("error", fail);
    output.on("error", fail);
    output.on("close", () => {
      outputFinished = true;
      finish();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        fail(new Error(stderr.trim() || `Could not extract ${member}.`));
        return;
      }
      childFinished = true;
      finish();
    });
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
  if (!options.skipChecksum) {
    console.log("Verifying RWC-P archive checksum...");
    const actual = await md5(options.archive);
    if (actual !== manifest.dataset.audioMd5) throw new Error(`Archive MD5 mismatch: ${actual}`);
  }
  const listing = await runCapture("unzip", ["-Z1", options.archive]);
  const selected = selectArchiveMembers(listing, manifest.tracks.map((track) => track.trackId));
  await mkdir(options.output, { recursive: true });
  if (options.prune) {
    const selectedNames = new Set(selected.map(({ trackId }) => `${trackId}.wav`));
    for (const filename of await readdir(options.output)) {
      if (/^RWC_P\d{3}\.wav$/.test(filename) && !selectedNames.has(filename)) {
        await rm(join(options.output, filename));
        console.log(`pruned stale pilot copy ${filename}`);
      }
    }
  }
  for (const [index, { trackId, member }] of selected.entries()) {
    const target = join(options.output, `${trackId}.wav`);
    if (!options.force && await exists(target)) {
      console.log(`[${index + 1}/${selected.length}] keeping ${trackId}.wav`);
      continue;
    }
    console.log(`[${index + 1}/${selected.length}] extracting ${member}`);
    try {
      await extractMember(options.archive, member, target);
    } catch (error) {
      await rm(target, { force: true });
      throw error;
    }
  }
  console.log(`Prepared ${selected.length} pilot WAV files in ${options.output}`);
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
