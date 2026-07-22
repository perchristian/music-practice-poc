import { join, resolve } from "node:path";

export function resolveDemucsInvocation({ repoRoot, env = process.env }) {
  const configuredEntrypoint = env.DEMUCS_PATH || null;
  const localEntrypoint = join(repoRoot, ".venv-real", "bin", "demucs");
  const usesLocalEntrypoint = !configuredEntrypoint
    || resolve(repoRoot, configuredEntrypoint) === resolve(localEntrypoint);
  const entrypoint = usesLocalEntrypoint ? null : configuredEntrypoint;
  const command = entrypoint || env.DEMUCS_PYTHON || join(repoRoot, ".venv-real", "bin", "python");
  const argumentPrefix = entrypoint ? [] : ["-m", "demucs"];

  return {
    command,
    argumentPrefix,
    displayCommand: [command, ...argumentPrefix].join(" ")
  };
}
