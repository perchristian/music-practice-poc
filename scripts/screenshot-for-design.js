// Run with: node scripts/screenshot-for-design.js
// Requires: npx playwright install chromium (if not already installed)
// Output: design-screenshots/ directory

import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = "design-screenshots";

async function createProcessedJob(page, filename) {
  const jobId = await page.evaluate(async (name) => {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: name, size: 1234, type: "video/quicktime" })
    });
    return (await res.json()).id;
  }, filename);

  // Wait for job to complete
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const status = await page.evaluate(async (id) => {
      const res = await fetch(`/api/jobs/${id}`);
      return (await res.json()).status;
    }, jobId);
    if (status === "complete") break;
  }
  return jobId;
}

async function deleteJob(page, jobId) {
  await page.evaluate(async (id) => fetch(`/api/jobs/${id}`, { method: "DELETE" }), jobId);
}

async function shot(page, name, opts = {}) {
  const path = `${OUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false, ...opts });
  console.log(`  ✓ ${name}.png`);
}

async function run() {
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  // ── 1. Empty library ──────────────────────────────────────────────────────
  console.log("1. Empty library");
  await shot(page, "01-empty-library");

  // ── 2. Upload a mock job ──────────────────────────────────────────────────
  console.log("2. Creating mock song...");
  const jobId = await createProcessedJob(page, "screenshot-design-TeAmo.mov");
  await page.waitForTimeout(800);
  await shot(page, "02-library-with-song");

  // ── 3. Open the song ──────────────────────────────────────────────────────
  console.log("3. Opening song...");
  await page.locator(".song-row").first().click();
  await page.waitForSelector("#practiceView", { state: "visible" });
  await page.waitForTimeout(600);
  await shot(page, "03-practice-view-full");

  // ── 4. Mixer close-up ────────────────────────────────────────────────────
  console.log("4. Mixer");
  const mixer = page.locator("#stemMixer");
  await mixer.scrollIntoViewIfNeeded();
  await shot(page, "04-mixer", { clip: await mixer.boundingBox() });

  // ── 5. Chord grid – basic ─────────────────────────────────────────────────
  console.log("5. Chord grid (basic)");
  const chordList = page.locator("#chordList");
  await chordList.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "05-chord-grid-basic", { clip: await chordList.boundingBox() });

  // ── 6. Chord grid with section info on (default) ─────────────────────────
  // sectionInfoVisible defaults to true in app.js, so "+" buttons are already visible
  console.log("6. Chord grid with section info on...");
  await shot(page, "06-chord-grid-section-info");

  // ── 7. Bar range selection screenshot ────────────────────────────────────
  // Click bottom-half of bar segments to avoid the "+" section-add-bar button at top
  console.log("7. Bar range selection...");
  const seg1Box = await page.locator('.chord-bar-segment[data-bar="1"]').boundingBox();
  const seg2Box = await page.locator('.chord-bar-segment[data-bar="2"]').boundingBox();
  if (seg1Box && seg2Box) {
    await page.mouse.click(seg1Box.x + 4, seg1Box.y + seg1Box.height * 0.75);
    await page.waitForTimeout(100);
    await page.mouse.click(seg2Box.x + 4, seg2Box.y + seg2Box.height * 0.75, { modifiers: ["Shift"] });
    await page.waitForTimeout(200);
  }
  await shot(page, "07-bar-range-selected");
  // Clear selection by clicking elsewhere
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);

  // ── 8. Section create via "+" button ─────────────────────────────────────
  console.log("8. Section create dialog (via + button on bar 1)...");
  await page.getByTestId("section-add-bar-1").click();
  await page.getByTestId("section-create-dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(200);
  await shot(page, "08-section-create-dialog-empty");
  await page.getByTestId("section-create-symbol").fill("Verse");
  await page.getByTestId("section-create-label").fill("First Verse");
  await shot(page, "08b-section-create-dialog-filled");
  await page.getByTestId("section-create-save").click();
  await page.getByTestId("section-create-dialog").waitFor({ state: "hidden" });
  await page.waitForTimeout(400);
  await shot(page, "09-chord-grid-one-section");

  // ── 9. Add second section via "+" on bar 2 ───────────────────────────────
  console.log("9. Adding second section (bar 2, green)...");
  await page.getByTestId("section-add-bar-2").click();
  await page.getByTestId("section-create-dialog").waitFor({ state: "visible" });
  await page.getByTestId("section-create-symbol").fill("Chorus");
  await page.getByTestId("section-create-label").fill("First Chorus");
  await page.getByTestId("section-create-color").selectOption("green");
  await page.getByTestId("section-create-save").click();
  await page.getByTestId("section-create-dialog").waitFor({ state: "hidden" });
  await page.waitForTimeout(400);
  await shot(page, "09b-chord-grid-two-sections");

  // ── 10. Section edit dialog ───────────────────────────────────────────────
  console.log("10. Section edit dialog...");
  const editBtn = page.getByTestId("section-edit-1");
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await page.getByTestId("section-edit-dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(200);
    await shot(page, "10-section-edit-dialog");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }

  // ── 11. Loop enabled on chord grid ───────────────────────────────────────
  console.log("11. Loop on chord grid");
  const loopCheckbox = page.locator("#loopEnabled");
  if (!(await loopCheckbox.isChecked())) await loopCheckbox.click();
  await page.waitForTimeout(300);
  await shot(page, "11-loop-on-chord-grid");

  // ── 12. Timing edit mode ─────────────────────────────────────────────────
  console.log("12. Timing edit mode");
  const loopCheck2 = page.locator("#loopEnabled");
  if (await loopCheck2.isChecked()) await loopCheck2.click();
  const editTimingBtn = page.locator('[data-testid="edit-timing"]');
  if (await editTimingBtn.isVisible()) {
    await editTimingBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "12-timing-edit-mode");
    // Close-up of timeline area
    const viewport = page.locator(".timeline-viewport");
    if (await viewport.isVisible()) {
      await shot(page, "12b-waveform-close", { clip: await viewport.boundingBox() });
    }
    // Anchor panel
    const anchorPanel = page.locator('[data-testid="timing-editor-controls"]');
    if (await anchorPanel.isVisible()) {
      await shot(page, "12c-timing-anchor-panel", { clip: await anchorPanel.boundingBox() });
    }
    await page.locator('[data-testid="timing-done"]').click();
    await page.waitForTimeout(300);
  }

  // ── 13. Transport / time controls ────────────────────────────────────────
  console.log("13. Transport controls");
  const timePanel = page.locator('[aria-labelledby="timeTitle"]');
  if (await timePanel.isVisible()) {
    await shot(page, "13-time-panel", { clip: await timePanel.boundingBox() });
  }

  // ── 14. Speed controls close-up ──────────────────────────────────────────
  console.log("14. Speed controls + transport");
  const transport = page.locator(".transport");
  if (await transport.isVisible()) {
    await shot(page, "14-transport-controls", { clip: await transport.boundingBox() });
  }

  // ── 15. Chord grid bars-per-row = 4 ──────────────────────────────────────
  console.log("15. Chord grid 4-per-row");
  const barsPerRow = page.locator("#barsPerRowSelect");
  if (await barsPerRow.isVisible()) {
    await barsPerRow.selectOption("4");
    await page.waitForTimeout(300);
    await shot(page, "15-chord-grid-4-per-row");
    await barsPerRow.selectOption("2");
  }

  // ── 16. Full practice view — labelled regions ─────────────────────────────
  console.log("16. Full view (annotated)");
  await page.waitForTimeout(300);
  await shot(page, "16-practice-view-final");

  // ── Clean up ──────────────────────────────────────────────────────────────
  await deleteJob(page, jobId);
  await browser.close();
  console.log(`\nDone. Screenshots saved to ./${OUT_DIR}/`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
