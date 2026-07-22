import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { resolveDemucsInvocation } from "../demucs-command.js";

describe("Demucs command resolution", () => {
  it("uses the relocated virtualenv Python instead of its absolute-path entrypoint", () => {
    const repoRoot = join("/", "new", "repository", "location");
    const invocation = resolveDemucsInvocation({ repoRoot, env: {} });

    assert.equal(invocation.command, join(repoRoot, ".venv-real", "bin", "python"));
    assert.deepEqual(invocation.argumentPrefix, ["-m", "demucs"]);
    assert.equal(invocation.displayCommand, `${invocation.command} -m demucs`);

    const legacyDocumentedInvocation = resolveDemucsInvocation({
      repoRoot,
      env: { DEMUCS_PATH: ".venv-real/bin/demucs" }
    });
    assert.deepEqual(legacyDocumentedInvocation, invocation);
  });

  it("keeps explicit Python and entrypoint overrides", () => {
    const pythonInvocation = resolveDemucsInvocation({
      repoRoot: "/repo",
      env: { DEMUCS_PYTHON: "/custom/python" }
    });
    assert.equal(pythonInvocation.command, "/custom/python");
    assert.deepEqual(pythonInvocation.argumentPrefix, ["-m", "demucs"]);

    const entrypointInvocation = resolveDemucsInvocation({
      repoRoot: "/repo",
      env: { DEMUCS_PATH: "/custom/demucs", DEMUCS_PYTHON: "/ignored/python" }
    });
    assert.equal(entrypointInvocation.command, "/custom/demucs");
    assert.deepEqual(entrypointInvocation.argumentPrefix, []);
  });
});
