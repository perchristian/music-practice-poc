import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

test("manual Chordino review loads lab cues", async ({ page }) => {
  await page.setContent(await readFile("benchmarks/chordino-manual-review.html", "utf8"));
  await page.locator("#label-file").setInputFiles({
    name: "review.lab",
    mimeType: "text/plain",
    buffer: Buffer.from('0\t2\t"C"\n2\t4\t"G:7"\n')
  });

  await expect(page.locator("#cues button")).toHaveText(["0:00  C", "0:02  G:7"]);
  await expect(page.locator("#current")).toContainText("C");
});
