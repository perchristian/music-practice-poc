import { test, expect } from "@playwright/test";

async function setPlaybackPosition(page, seconds) {
  await page.locator("#scrubber").evaluate((scrubber, value) => {
    scrubber.value = String(value);
    scrubber.dispatchEvent(new Event("input", { bubbles: true }));
    scrubber.dispatchEvent(new Event("change", { bubbles: true }));
  }, seconds);
}

test("mock-mode upload-to-practice GUI flow", async ({ page }) => {
  await page.addInitScript(() => {
    window.__playCalls = [];
    const currentTimes = new WeakMap();
    const pausedStates = new WeakMap();
    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      get() {
        return currentTimes.get(this) ?? 0;
      },
      set(value) {
        currentTimes.set(this, Number(value) || 0);
      }
    });
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return 16;
      }
    });
    Object.defineProperty(HTMLMediaElement.prototype, "paused", {
      get() {
        return pausedStates.get(this) ?? true;
      }
    });
    HTMLMediaElement.prototype.play = function () {
      pausedStates.set(this, false);
      window.__playCalls.push({
        stemId: this.dataset.stemId,
        muted: this.muted,
        currentTime: this.currentTime
      });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      pausedStates.set(this, true);
    };
  });

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

  await expect(page.getByTestId("stem-row-piano")).toBeVisible();
  await expect(page.getByTestId("full-mix-button")).toHaveCount(0);
  await expect(page.getByTestId("mute-piano-button")).toHaveCount(0);
  await expect(page.getByTestId("mute-all-button")).toHaveCount(0);
  await expect(page.getByText("Melody cues")).toHaveCount(0);
  await expect(page.getByText("practice target")).toHaveCount(0);
  await expect(page.getByText("without piano")).toHaveCount(0);

  const accompanimentRow = page.getByTestId("stem-row-accompaniment");
  const hasAccompanimentStem = await accompanimentRow.count();
  if (hasAccompanimentStem) {
    await expect(accompanimentRow).toBeVisible();
  } else {
    await expect(page.getByTestId("stem-row-drums")).toBeVisible();
    await expect(page.getByTestId("stem-row-bass")).toBeVisible();
    await expect(page.getByTestId("stem-row-guitar")).toBeVisible();
  }

  const backingStemId = hasAccompanimentStem ? "accompaniment" : "drums";

  await page.getByTestId("stem-mute-piano").click();
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/muted/);
  await expect(page.getByTestId("stem-mute-piano")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stem-solo-piano")).toHaveAttribute("aria-pressed", "false");
  if (hasAccompanimentStem) {
    await expect(accompanimentRow).not.toHaveClass(/muted/);
  } else {
    await expect(page.getByTestId("stem-row-drums")).not.toHaveClass(/muted/);
  }

  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  const mutedPianoPlayCalls = await page.evaluate(() => window.__playCalls);
  expect(mutedPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "piano", muted: true }));
  if (hasAccompanimentStem) {
    expect(mutedPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "accompaniment", muted: false }));
  } else {
    expect(mutedPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "drums", muted: false }));
    expect(mutedPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "bass", muted: false }));
    expect(mutedPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "guitar", muted: false }));
  }
  await page.getByRole("button", { name: "Pause" }).click();

  await page.getByTestId("stem-solo-piano").click();
  await expect(page.getByTestId("stem-row-piano")).not.toHaveClass(/muted/);
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/solo/);
  await expect(page.getByTestId("stem-mute-piano")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("stem-solo-piano")).toHaveAttribute("aria-pressed", "true");

  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  const soloPianoPlayCalls = await page.evaluate(() => window.__playCalls);
  expect(soloPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "piano", muted: false }));
  if (hasAccompanimentStem) {
    expect(soloPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "accompaniment", muted: true }));
  } else {
    expect(soloPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "drums", muted: true }));
    expect(soloPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "bass", muted: true }));
    expect(soloPianoPlayCalls).toContainEqual(expect.objectContaining({ stemId: "guitar", muted: true }));
  }
  await page.getByRole("button", { name: "Pause" }).click();

  await page.getByTestId("stem-mute-piano").click();
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/muted/);
  await expect(page.getByTestId("stem-row-piano")).not.toHaveClass(/solo/);
  await expect(page.getByTestId("stem-mute-piano")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stem-solo-piano")).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("stem-mute-piano").click();
  await page.getByTestId(`stem-mute-${backingStemId}`).click();
  await expect(page.getByTestId(`stem-row-${backingStemId}`)).toHaveClass(/muted/);
  await expect(page.getByTestId(`stem-mute-${backingStemId}`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", true);

  await page.getByTestId(`stem-mute-${backingStemId}`).click();
  await expect(page.getByTestId(`stem-row-${backingStemId}`)).not.toHaveClass(/muted/);
  await expect(page.getByTestId(`stem-mute-${backingStemId}`)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", false);

  await page.getByTestId("stem-solo-piano").click();
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", true);

  await page.getByTestId("stem-solo-piano").click();
  await expect(page.getByTestId("stem-row-piano")).not.toHaveClass(/solo/);
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", false);

  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await setPlaybackPosition(page, 5);
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("currentTime", 5);

  await page.getByTestId(`stem-mute-${backingStemId}`).click();
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", true);
  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByTestId(`stem-mute-${backingStemId}`).click();
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", false);
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).not.toHaveJSProperty("currentTime", 0);
  expect(await page.evaluate(() => window.__playCalls)).toEqual([]);

  await page.getByTestId("stem-solo-piano").click();
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", true);
  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByTestId("stem-solo-piano").click();
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).toHaveJSProperty("muted", false);
  await expect(page.locator(`audio[data-stem-id="${backingStemId}"]`)).not.toHaveJSProperty("currentTime", 0);
  expect(await page.evaluate(() => window.__playCalls)).toEqual([]);
  await page.getByRole("button", { name: "Pause" }).click();

  await page.getByTestId("speed-075").click();
  await expect(page.getByTestId("speed-075")).toHaveClass(/active/);

  await page.getByTestId("loop-start").fill("1");
  await page.getByTestId("loop-end").fill("3");
  await page.getByTestId("loop-enabled").check();
  await expect(page.getByTestId("loop-enabled")).toBeChecked();

  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByText("Cmaj7")).toBeVisible();
  await expect(page.getByText("Imaj7")).toBeVisible();
  await expect(page.getByText("E4 G4")).toHaveCount(0);
});

test("processed demo shortcut opens practice view without selecting a file", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return 16;
      }
    });
  });

  await page.goto("/?demo=processed");
  await expect(page.getByTestId("service-status")).toContainText("processed demo");
  await expect(page.getByTestId("job-status")).toHaveText("complete", { timeout: 15_000 });
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("file-label")).toHaveText("Processed demo");
  await expect(page.getByTestId("stem-row-piano")).toBeVisible();
  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByText("Cmaj7")).toBeVisible();
});
