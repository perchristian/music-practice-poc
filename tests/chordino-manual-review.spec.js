import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test("manual Chordino review compares raw and candidate lab cues", async ({ page }) => {
  await page.setContent(await readFile("benchmarks/chordino-manual-review.html", "utf8"));
  await page.locator("#raw-label-file").setInputFiles({
    name: "raw.lab",
    mimeType: "text/plain",
    buffer: Buffer.from('0\t2\t"C"\n2\t4\t"G:7"\n')
  });
  await page.locator("#candidate-label-file").setInputFiles({
    name: "candidate.lab",
    mimeType: "text/plain",
    buffer: Buffer.from('0\t4\t"C"\n')
  });

  await expect(page.locator("#raw-cues button")).toHaveText(["0:00  C", "0:02  G:7"]);
  await expect(page.locator("#candidate-cues button")).toHaveText(["0:00  C"]);
  await expect(page.locator("#raw-current")).toContainText("C");
  await expect(page.locator("#candidate-current")).toContainText("C");
});
