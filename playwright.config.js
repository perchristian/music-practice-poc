import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 3200);

// Browser tests must never write into the developer's local song library.
// Each run gets its own DATA_DIR so a failed run cannot leave jobs behind and
// the suite does not depend on cleanup discipline. Set PLAYWRIGHT_DATA_DIR to
// point a run at a specific directory instead.
const dataDir = process.env.PLAYWRIGHT_DATA_DIR || mkdtempSync(join(tmpdir(), "piano-poc-gui-"));

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `env PORT=${port} PIPELINE_MODE=mock DATA_DIR=${JSON.stringify(dataDir)} node server.js`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
