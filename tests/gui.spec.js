import { test, expect } from "@playwright/test";

test("mock-mode upload-to-practice GUI flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: mock");

  await page.getByTestId("media-input").setInputFiles({
    name: "screen-recording.mov",
    mimeType: "video/quicktime",
    buffer: Buffer.from("mock media bytes")
  });
  await expect(page.getByTestId("file-label")).toHaveText("screen-recording.mov");

  await page.getByTestId("upload-button").click();
  await expect(page.getByTestId("job-status")).toHaveText("complete", { timeout: 15_000 });
  await expect(page.getByTestId("practice-view")).toBeVisible();

  await expect(page.getByTestId("stem-row-drums")).toBeVisible();
  await expect(page.getByTestId("stem-row-bass")).toBeVisible();
  await expect(page.getByTestId("stem-row-guitar")).toBeVisible();
  await expect(page.getByTestId("stem-row-piano")).toBeVisible();

  await page.getByTestId("mute-piano-button").click();
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/muted/);
  await expect(page.getByTestId("stem-toggle-piano")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stem-row-drums")).not.toHaveClass(/muted/);

  await page.getByTestId("full-mix-button").click();
  await expect(page.getByTestId("stem-row-piano")).not.toHaveClass(/muted/);
  await expect(page.getByTestId("stem-toggle-piano")).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("speed-075").click();
  await expect(page.getByTestId("speed-075")).toHaveClass(/active/);

  await page.getByTestId("loop-start").fill("1");
  await page.getByTestId("loop-end").fill("3");
  await page.getByTestId("loop-enabled").check();
  await expect(page.getByTestId("loop-enabled")).toBeChecked();

  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByText("Cmaj7")).toBeVisible();
  await expect(page.getByText("Imaj7")).toBeVisible();
  await expect(page.getByText("E4 G4")).toBeVisible();
});
