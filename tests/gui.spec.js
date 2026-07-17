import { test, expect } from "@playwright/test";

test.afterEach(async ({ request }) => {
  await request.put("/api/settings/pipeline-mode", { data: { mode: "mock" } });
  const testSongNames = [
    "demo-processed-screen-recording.mov",
    "Renamed Phase 1 song"
  ];
  const testSongPrefixes = [
    "screen-recording-",
    "phase-one-library-",
    "save-reliability-",
    "persistent-job-",
    "persistent-failed-",
    "queue-first-",
    "queue-second-",
    "recent-",
    "mobile-workspace-",
    "editable-chords-",
    "flat-sections-",
    "section-ranges-",
    "section-selection-",
    "resize-chords-",
    "delete-last-chord-",
    "loop-bars-",
    "timing-map-"
  ];
  const entries = await request.get("/api/jobs").then((response) => (response.ok() ? response.json() : []));
  await Promise.all(
    entries
      .filter((entry) => testSongNames.includes(entry.originalFilename) || testSongPrefixes.some((prefix) => entry.originalFilename.startsWith(prefix)))
      .map((entry) => request.delete(`/api/jobs/${entry.id}`))
  );
});

async function setPlaybackPosition(page, seconds) {
  await page.locator("#scrubber").evaluate((scrubber, value) => {
    scrubber.value = String(value);
    scrubber.dispatchEvent(new Event("input", { bubbles: true }));
    scrubber.dispatchEvent(new Event("change", { bubbles: true }));
  }, seconds);
}

async function waitForLibraryJob(page, filename) {
  return expect
    .poll(async () => {
      return page.evaluate(async (name) => {
        const response = await fetch("/api/library");
        const entries = await response.json();
        return entries.find((entry) => entry.originalFilename === name)?.id || null;
      }, filename);
    }, { timeout: 15_000 })
    .not.toBeNull();
}

async function libraryJobId(page, filename) {
  await waitForLibraryJob(page, filename);
  return page.evaluate(async (name) => {
    const response = await fetch("/api/library");
    const entries = await response.json();
    return entries.find((entry) => entry.originalFilename === name).id;
  }, filename);
}

async function createProcessedJob(page, filename) {
  const jobId = await page.evaluate(async (name) => {
    const createResponse = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename: name, size: 1234, type: "video/quicktime" })
    });
    const job = await createResponse.json();
    return job.id;
  }, filename);

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        return (await response.json()).status;
      }, jobId);
    }, { timeout: 15_000 })
    .toBe("complete");

  return jobId;
}

async function dragChordToBarBeat(page, chordIndex, bar, beat) {
  const source = page.getByTestId(`chord-card-${chordIndex}`);
  const target = page.locator(`.chord-bar-segment[data-bar="${bar}"]`);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  const beatsPerBar = await target.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--beats-per-bar")) || 4);
  if (!sourceBox || !targetBox) {
    throw new Error("Could not resolve drag target boxes.");
  }

  await source.dragTo(target, {
    sourcePosition: {
      x: sourceBox.width / 2,
      y: sourceBox.height / 2
    },
    targetPosition: {
      x: targetBox.width * ((beat - 0.5) / beatsPerBar),
      y: targetBox.height / 2
    }
  });
}

async function resizeChordToBarBoundary(page, chordIndex, bar, boundaryBeat) {
  const handle = page.getByTestId(`chord-resize-${chordIndex}`);
  const target = page.locator(`.chord-bar-segment[data-bar="${bar}"]`);
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  const beatsPerBar = await target.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--beats-per-bar")) || 4);
  if (!handleBox || !targetBox) {
    throw new Error("Could not resolve resize target boxes.");
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width * (boundaryBeat / beatsPerBar), targetBox.y + targetBox.height / 2);
  await page.mouse.up();
}

async function beginLoopHandleDragToBar(page, action, fromBar, toBar) {
  const handle = page.getByTestId(`chord-loop-${action}-${fromBar}`);
  const target = page.locator(`.chord-bar-segment[data-bar="${toBar}"]`);
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!handleBox || !targetBox) {
    throw new Error("Could not resolve loop drag target boxes.");
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  return async () => {
    await page.mouse.up();
  };
}

async function dragLoopHandleToBar(page, action, fromBar, toBar) {
  const finishDrag = await beginLoopHandleDragToBar(page, action, fromBar, toBar);
  await finishDrag();
}

async function selectSectionBars(page, startBar, endBar = startBar) {
  await page.locator(`.chord-bar-segment[data-bar="${startBar}"]`).click({ position: { x: 8, y: 8 } });
  if (endBar !== startBar) {
    await page.locator(`.chord-bar-segment[data-bar="${endBar}"]`).click({ position: { x: 8, y: 8 }, modifiers: ["Shift"] });
  }
}

async function dragTimelineBarToSeconds(page, bar, seconds, duration = 16) {
  const marker = page.locator(`.grid-marker.downbeat[data-bar="${bar}"]`);
  const track = page.locator("#timelineTrack");
  await marker.scrollIntoViewIfNeeded();
  const markerBox = await marker.boundingBox();
  const trackBox = await track.boundingBox();
  if (!markerBox || !trackBox) throw new Error("Could not resolve timing marker drag boxes.");
  await page.mouse.move(markerBox.x + markerBox.width / 2, markerBox.y + markerBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trackBox.x + trackBox.width * (seconds / duration), markerBox.y + markerBox.height / 2);
  await page.mouse.up();
}

async function setBarOneStart(page, seconds, { done = true } = {}) {
  if (!(await page.getByTestId("timing-editor-controls").isVisible())) {
    await page.getByTestId("edit-timing").click();
  }
  await page.getByTestId("timing-correction-select").selectOption("1");
  await page.getByTestId("timing-anchor-time").fill(String(seconds));
  await page.getByTestId("timing-anchor-time").press("Enter");
  if (done) await page.getByTestId("timing-done").click();
}

async function createSectionFromBars(page, startBar, endBar, { symbol = "", label = "", color = "" } = {}) {
  await selectSectionBars(page, startBar, endBar);
  await page.getByTestId("create-section-button").click();
  await expect(page.getByTestId("section-create-dialog")).toBeVisible();
  await page.getByTestId("section-create-symbol").fill(symbol);
  await page.getByTestId("section-create-label").fill(label);
  if (color) {
    await page.getByTestId("section-create-color").selectOption(color);
  }
  await page.getByTestId("section-create-save").click();
  await expect(page.getByTestId("section-create-dialog")).not.toBeVisible();
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
  await expect(page.getByTestId("mode-mock")).toHaveClass(/active/);
  await page.getByTestId("mode-real").click();
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: real");
  await expect(page.getByTestId("mode-real")).toHaveClass(/active/);
  await page.getByTestId("mode-mock").click();
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: mock");
  await expect(page.getByTestId("mode-mock")).toHaveClass(/active/);

  const filename = `screen-recording-${Date.now()}.mov`;
  await page.getByTestId("media-input").setInputFiles({
    name: filename,
    mimeType: "video/quicktime",
    buffer: Buffer.from("mock media bytes")
  });

  const jobId = await libraryJobId(page, filename);
  await expect(page.getByTestId("home-view")).toBeVisible();
  await expect(page.getByTestId("practice-view")).toBeHidden();
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText(filename);
  await expect(page.getByTestId(`song-row-${jobId}`)).not.toContainText("complete");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("selected-song-title")).toHaveText(filename);

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

  await page.getByTestId("loop-enabled").check();
  await expect(page.getByTestId("loop-settings")).toBeVisible();
  await page.getByTestId("loop-start").fill("1");
  await page.getByTestId("loop-end").fill("3");
  await expect(page.getByTestId("loop-enabled")).toBeChecked();

  await expect(page.getByTestId("key-select")).toHaveValue("C:major");
  await expect(page.getByTestId("tempo-display")).toHaveText("60 BPM");
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Cmaj7");
  await expect(page.locator(".cue-roman").first()).toHaveText("Imaj7");
  await expect(page.getByText("E4 G4")).toHaveCount(0);
});

test("pipeline mode switch ignores stale startup health response", async ({ page }) => {
  let releaseStartupHealth;
  let interceptedStartupHealth = false;

  await page.route("**/api/health", async (route) => {
    if (interceptedStartupHealth) {
      await route.continue();
      return;
    }

    interceptedStartupHealth = true;
    await new Promise((resolve) => {
      releaseStartupHealth = resolve;
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, mode: "mock", startupMode: "mock", ffmpegPath: "ffmpeg" })
    });
  });

  await page.goto("/");
  await page.getByTestId("mode-real").click();
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: real");
  await expect(page.getByTestId("mode-real")).toHaveClass(/active/);

  releaseStartupHealth();
  await page.waitForTimeout(100);

  await expect(page.getByTestId("service-status")).toContainText("Backend ready: real");
  await expect(page.getByTestId("mode-real")).toHaveClass(/active/);
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
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("file-label")).toHaveText("Upload");
  await expect(page.getByTestId("stem-row-piano")).toBeVisible();
  await expect(page.getByTestId("key-select")).toHaveValue("C:major");
  await expect(page.getByTestId("tempo-display")).toHaveText("60 BPM");
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Cmaj7");
});

test("beat grid timeline and metronome click follow the analyzed grid", async ({ page }) => {
  await page.addInitScript(() => {
    window.__metronomeClicks = [];
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
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      pausedStates.set(this, true);
    };

    class MockAudioContext {
      constructor() {
        this.currentTime = 10;
        this.destination = {};
        this.state = "running";
      }

      createOscillator() {
        const oscillator = {
          type: "sine",
          frequency: { value: 0 },
          connect() {},
          start(time) {
            window.__metronomeClicks.push({
              time,
              frequency: oscillator.frequency.value
            });
          },
          stop() {}
        };
        return oscillator;
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {}
          },
          connect() {}
        };
      }

      resume() {
        return Promise.resolve();
      }
    }

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
  });

  await page.goto("/?demo=processed");
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("grid-timeline")).not.toHaveClass(/empty/);
  await expect(page.locator(".grid-marker.downbeat")).toHaveCount(5);
  await expect(page.locator(".grid-marker").first()).toHaveAttribute("data-time", "0");
  await expect(page.getByTestId("meter-select")).toHaveValue("4/4");

  await setBarOneStart(page, 0.5);
  await page.getByTestId("meter-select").selectOption("3/4");
  await expect(page.locator(".grid-marker").first()).toHaveAttribute("data-time", "0.5");
  await expect(page.locator(".grid-marker.downbeat")).toHaveCount(6);
  await expect(page.getByTestId("meter-select")).toHaveValue("3/4");

  await page.getByTestId("metronome-mute").click();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await expect
    .poll(async () => page.evaluate(() => window.__metronomeClicks.length))
    .toBeGreaterThan(0);
  const clicks = await page.evaluate(() => window.__metronomeClicks);
  expect(clicks[0]).toMatchObject({ time: 10.5, frequency: 1320 });
});

test("count-in works without a loop and repeats after a loop jump", async ({ page }) => {
  await page.addInitScript(() => {
    window.__playCalls = [];
    window.__metronomeClicks = [];
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
        currentTime: this.currentTime
      });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      pausedStates.set(this, true);
    };

    class MockAudioContext {
      constructor() {
        this.currentTime = 20;
        this.destination = {};
        this.state = "running";
      }

      createOscillator() {
        const oscillator = {
          type: "sine",
          frequency: { value: 0 },
          connect() {},
          start(time) {
            window.__metronomeClicks.push({
              time: Math.round(time * 100) / 100,
              frequency: oscillator.frequency.value
            });
          },
          stop() {}
        };
        return oscillator;
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            exponentialRampToValueAtTime() {}
          },
          connect() {}
        };
      }

      resume() {
        return Promise.resolve();
      }
    }

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
  });

  await page.goto("/?demo=processed");
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await page.getByTestId("tempo-display").click();
  await page.getByTestId("tempo-input").fill("240");
  await page.getByTestId("tempo-input").press("Enter");
  await setBarOneStart(page, 0.5);
  await page.getByTestId("start-at-bar-one").check();
  await page.getByTestId("count-in-bars").selectOption("1");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  expect(await page.evaluate(() => window.__playCalls)).toEqual([]);
  expect(await page.evaluate(() => window.__metronomeClicks)).toEqual([
    { time: 20, frequency: 1320 },
    { time: 20.25, frequency: 880 },
    { time: 20.5, frequency: 880 },
    { time: 20.75, frequency: 880 }
  ]);

  await expect
    .poll(async () => page.evaluate(() => window.__playCalls.length), { timeout: 2_000 })
    .toBeGreaterThan(0);

  const playCalls = await page.evaluate(() => window.__playCalls);
  expect(playCalls.every((call) => call.currentTime === 0.5)).toBe(true);

  await page.getByTestId("loop-enabled").check();
  await page.getByTestId("loop-start").fill("1");
  await page.getByTestId("loop-end").fill("1");

  await expect
    .poll(async () => page.evaluate(() => window.__metronomeClicks.length), { timeout: 4_000 })
    .toBeGreaterThan(4);
});

test("loop range can be marked and extended from the harmony chord grid", async ({ page }) => {
  await page.goto("/?demo=processed");
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await page.getByTestId("bars-per-row-select").selectOption("2");
  await page.getByTestId("loop-enabled").check();
  await page.getByTestId("loop-start").fill("2");
  await page.getByTestId("loop-end").fill("2");

  await expect(page.getByTestId("chord-loop-region-2")).toBeVisible();
  await expect(page.getByTestId("chord-loop-region-3")).toHaveCount(0);

  const finishEndDrag = await beginLoopHandleDragToBar(page, "end", 2, 3);
  await expect(page.getByTestId("chord-loop-preview-2")).toBeVisible();
  await expect(page.getByTestId("chord-loop-preview-3")).toBeVisible();
  await finishEndDrag();
  await expect(page.locator(".chord-loop-preview-region")).toHaveCount(0);
  await expect(page.getByTestId("loop-start")).toHaveValue("2");
  await expect(page.getByTestId("loop-end")).toHaveValue("3");
  await expect(page.getByTestId("chord-loop-region-2")).toBeVisible();
  await expect(page.getByTestId("chord-loop-region-3")).toBeVisible();

  const finishStartDrag = await beginLoopHandleDragToBar(page, "start", 2, 1);
  await expect(page.getByTestId("chord-loop-preview-1")).toBeVisible();
  await expect(page.getByTestId("chord-loop-preview-3")).toBeVisible();
  await finishStartDrag();
  await expect(page.getByTestId("loop-start")).toHaveValue("1");
  await expect(page.getByTestId("loop-end")).toHaveValue("3");
  await expect(page.getByTestId("chord-loop-region-1")).toBeVisible();
  await expect(page.getByTestId("chord-loop-region-3")).toBeVisible();
  await expect(page.getByTestId("chord-loop-region-2")).toHaveCount(0);
});

test("song selection waits for real media duration instead of using a 16 second fallback", async ({ page }) => {
  await page.addInitScript(() => {
    window.__mediaDuration = Number.NaN;
    HTMLMediaElement.prototype.load = function () {};
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return window.__mediaDuration;
      }
    });
  });

  await page.goto("/?demo=processed");
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.locator("#timeReadout")).toHaveText("0:00 / --");
  await expect(page.locator("#scrubber")).toHaveAttribute("max", "0");

  await page.evaluate(() => {
    window.__mediaDuration = 74;
    for (const audio of document.querySelectorAll("audio")) {
      audio.dispatchEvent(new Event("durationchange"));
    }
  });

  await expect(page.locator("#timeReadout")).toHaveText("0:00 / 1:14");
  await expect(page.locator("#scrubber")).toHaveAttribute("max", "74");
});

test("song duration labels prefer media metadata over harmonic cue length", async ({ page }) => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  await page.route("**/api/library", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: jobId,
          mode: "real",
          status: "complete",
          progress: 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          originalFilename: "long-upload.mov",
          practiceState: { learningStatus: "not_started", stemStates: {} },
          result: {
            stems: [],
            metadata: {
              durationSeconds: 74,
              key: { tonic: "C", mode: "major" },
              chords: [{ start: 0, end: 16, name: "Cmaj7", roman: "Imaj7" }],
              melody: []
            }
          }
        }
      ])
    });
  });

  await page.goto("/");

  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText("1:14");
  await expect(page.getByTestId(`song-row-${jobId}`)).not.toContainText("0:16");
});

test("long song timeline skips dense bar labels", async ({ page }) => {
  const jobId = "44444444-4444-4444-8444-444444444444";
  const job = {
    id: jobId,
    mode: "real",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFilename: "full-song.mov",
    practiceState: { learningStatus: "not_started", stemStates: {} },
    result: {
      stems: [{ id: "piano", name: "Piano", audioUrl: `/api/jobs/${jobId}/stems/piano.wav` }],
      metadata: {
        durationSeconds: 240,
        key: { tonic: "C", mode: "major" },
        beatGrid: { bpm: 120, beatsPerBar: 4, beatUnit: 4, beatDurationSeconds: 0.5, downbeatOffsetSeconds: 0 },
        chords: [
          { bar: 1, beat: 1, start: 0, end: 120, name: "C", roman: "I" },
          { bar: 61, beat: 1, start: 120, end: 240, name: "F", roman: "IV" }
        ],
        melody: []
      }
    }
  };

  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return 240;
      }
    });
  });
  await page.route("**/api/library", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([job])
    });
  });
  await page.route(`**/api/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });

  await page.goto("/");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("practice-view")).toBeVisible();

  const markerCounts = await page.evaluate(() => ({
    markers: document.querySelectorAll(".grid-marker").length,
    downbeats: document.querySelectorAll(".grid-marker.downbeat").length,
    labels: document.querySelectorAll(".grid-marker.downbeat span").length
  }));

  expect(markerCounts.downbeats).toBeGreaterThan(100);
  expect(markerCounts.markers).toBe(markerCounts.downbeats);
  expect(markerCounts.labels).toBeLessThan(40);
  await expect(page.locator(".grid-marker.downbeat span").first()).toHaveText("1");
});

test("saved song thumbnails render in the list and selected song header", async ({ page }) => {
  const jobId = "33333333-3333-4333-8333-333333333333";
  const thumbnailDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const job = {
    id: jobId,
    mode: "mock",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFilename: "thumbnail-source.mov",
    thumbnailDataUrl,
    practiceState: { learningStatus: "not_started", stemStates: {} },
    result: {
      stems: [{ id: "piano", name: "Piano", audioUrl: `/api/jobs/${jobId}/stems/piano.wav` }],
      metadata: {
        durationSeconds: 16,
        key: { tonic: "C", mode: "major" },
        beatGrid: { bpm: 60, beatsPerBar: 4, beatUnit: 4, beatDurationSeconds: 1, downbeatOffsetSeconds: 0 },
        chords: [{ bar: 1, start: 0, end: 4, name: "C", roman: "I" }],
        melody: []
      }
    }
  };

  await page.route("**/api/library", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([job])
    });
  });
  await page.route(`**/api/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });

  await page.goto("/");
  await expect(page.getByTestId(`song-row-${jobId}`).locator("img")).toHaveAttribute("src", thumbnailDataUrl);
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("selected-song-art").locator("img")).toHaveAttribute("src", thumbnailDataUrl);
});

test("harmony panel shows analysis tempo and chord beat placement", async ({ page }) => {
  const jobId = "22222222-2222-4222-8222-222222222222";
  const job = {
    id: jobId,
    mode: "real",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFilename: "downbeat-offset.mov",
    practiceState: { learningStatus: "not_started", stemStates: {} },
    result: {
      stems: [{ id: "piano", name: "Piano", audioUrl: `/api/jobs/${jobId}/stems/piano.wav` }],
      metadata: {
        durationSeconds: 16.65,
        key: { tonic: "C", mode: "major" },
        beatGrid: {
          bpm: 72.5,
          beatOffsetSeconds: 0.15,
          downbeatOffsetSeconds: 0.65,
          downbeatConfidence: 0.72
        },
        chords: [{ bar: 1, start: 0.65, end: 4.65, name: "C", roman: "I" }],
        melody: []
      }
    }
  };

  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return 16.65;
      }
    });
  });

  await page.route("**/api/library", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([job])
    });
  });
  await page.route(`**/api/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });
  await page.route(`**/api/jobs/${jobId}/practice-state`, async (route) => {
    const payload = route.request().postDataJSON();
    job.practiceState = { ...job.practiceState, ...payload };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });

  await page.goto("/");
  await page.getByTestId(`song-row-${jobId}`).click();

  await expect(page.getByTestId("key-select")).toHaveValue("C:major");
  await expect(page.getByTestId("tempo-display")).toHaveText("72.5 BPM");
  await expect(page.getByTestId("selected-song-meta")).toContainText("C major · 72.5 BPM");
  await expect(page.getByTestId("bars-per-row-select")).toHaveValue("2");
  await expect(page.getByTestId("chord-display-select")).toHaveValue("both");
  await expect(page.locator(".chord-bar-number").first()).toHaveText("1");
  await expect(page.locator(".beat-label")).toHaveCount(0);
  await expect(page.locator(".cue-time")).toHaveCount(0);
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "1");

  await page.getByTestId("tempo-display").click();
  await page.getByTestId("tempo-input").fill("145");
  await page.getByTestId("tempo-input").press("Enter");
  await expect(page.getByTestId("tempo-display")).toHaveText("145 BPM");
  await expect(page.getByTestId("selected-song-meta")).toContainText("C major · 145 BPM");

  await page.getByTestId("key-select").selectOption("A:minor");
  await expect(page.getByTestId("selected-song-meta")).toContainText("A minor · 145 BPM");
  await expect(page.locator(".cue-roman").first()).toHaveText("III");
});

test("corrected timing can drive a guarded chord reanalysis", async ({ page }) => {
  const jobId = "33333333-3333-4333-8333-333333333333";
  const tempoMap = {
    version: 1,
    anchors: [
      { bar: 1, timeSeconds: 0 },
      { bar: 2, timeSeconds: 5 }
    ]
  };
  const job = {
    id: jobId,
    mode: "real",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFilename: "corrected-reanalysis.mov",
    practiceState: {
      learningStatus: "not_started",
      stemStates: {},
      tempoMap,
      gridOverrides: {},
      keyOverride: { tonic: "C", mode: "major" },
      chordChart: {
        version: 1,
        divisionsPerQuarter: 4,
        chords: [{ id: "old", bar: 1, offsetDiv: 0, durationDiv: 16, raw: "C", source: "user" }]
      }
    },
    result: {
      stems: [{ id: "piano", name: "Piano", audioUrl: `/api/jobs/${jobId}/stems/piano.wav` }],
      metadata: {
        durationSeconds: 10,
        key: { tonic: "C", mode: "major" },
        beatGrid: { bpm: 60, beatsPerBar: 4, beatUnit: 4, beatDurationSeconds: 1, downbeatOffsetSeconds: 0 },
        chords: [{ bar: 1, beat: 1, start: 0, end: 4, name: "C", roman: "I", source: "beat-aligned-chroma" }],
        melody: []
      }
    }
  };

  await page.route("**/api/library", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([job]) });
  });
  await page.route(`**/api/jobs/${jobId}`, async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(job) });
  });
  await page.route(`**/api/jobs/${jobId}/reanalyze-harmony`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ replaceWorkingChart: true });
    job.practiceState.chordChart = null;
    job.result.metadata.correctedTimingAnalysis = {
      createdAt: new Date().toISOString(),
      harmonySource: "real-audio-corrected-timing-v1",
      analysisSource: "source-audio.wav",
      key: { tonic: "C", mode: "major", confidence: 1, source: "user" },
      chords: [
        { bar: 1, beat: 1, start: 0, end: 5, name: "G", roman: "V", source: "corrected-timing-chroma" },
        { bar: 2, beat: 1, start: 5, end: 10, name: "D", roman: "II", source: "corrected-timing-chroma" }
      ],
      analysis: { name: "beat-aware-chroma-corrected-timing-v1" }
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(job) });
  });

  await page.goto("/");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("reanalyze-harmony")).toBeVisible();
  await expect(page.getByTestId("chord-name-0")).toHaveValue("C");
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("selected key C major");
    dialog.accept();
  });
  await page.getByTestId("reanalyze-harmony").click();
  await expect(page.getByTestId("harmony-analysis-status")).toContainText("2 chord cues");
  await expect(page.getByTestId("key-select")).toHaveValue("C:major");
  await expect(page.getByTestId("chord-name-0")).toHaveValue("G");
  await expect(page.getByTestId("chord-name-1")).toHaveValue("D");
});

test("waveform timing editor persists variable-tempo downbeats and keeps playback consumers aligned", async ({ page }) => {
  await page.goto("/");
  const filename = `timing-map-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("waveform-canvas")).toBeVisible();
  await expect(page.getByTestId("timing-editor-controls")).not.toBeVisible();
  await expect(page.locator('.grid-marker.downbeat[data-bar="2"]')).not.toHaveClass(/anchored/);

  await page.getByTestId("edit-timing").click();
  await expect(page.getByTestId("timing-editor-controls")).toBeVisible();
  await setPlaybackPosition(page, 8);
  await page.getByTestId("timing-zoom").fill("2");
  await expect
    .poll(async () => page.locator("#timelineTrack").evaluate((element) => element.clientWidth))
    .toBeGreaterThan(await page.getByTestId("timeline-viewport").evaluate((element) => element.clientWidth));
  await expect
    .poll(async () => page.getByTestId("timeline-viewport").evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);

  await dragTimelineBarToSeconds(page, 2, 6);
  await expect(page.locator('.grid-marker.downbeat[data-bar="1"]')).toHaveClass(/anchored/);
  await expect(page.locator('.grid-marker.downbeat[data-bar="2"]')).toHaveClass(/anchored/);
  await expect(page.getByTestId("timing-anchor-controls")).toBeVisible();
  await expect(page.getByTestId("tempo-display")).toHaveText("40 BPM");

  await page.locator('.grid-marker.downbeat[data-bar="3"]').click();
  await expect(page.locator('.grid-marker.downbeat[data-bar="3"]')).toHaveClass(/anchored/);
  await expect(page.getByTestId("timing-correction-select").locator("option")).toHaveCount(3);
  await expect(page.getByTestId("timing-correction-select")).toHaveValue("3");
  await page.getByTestId("timing-anchor-time").fill("10");
  await page.getByTestId("timing-anchor-time").press("Enter");
  await page.getByTestId("timing-previous-anchor").click();
  await expect(page.getByTestId("timing-correction-select")).toHaveValue("2");
  await page.getByTestId("timing-next-anchor").click();
  await expect(page.getByTestId("timing-correction-select")).toHaveValue("3");

  await expect
    .poll(async () => page.evaluate(async (id) => {
      const response = await fetch(`/api/jobs/${id}`);
      return (await response.json()).practiceState.tempoMap;
    }, jobId))
    .toEqual({
      version: 1,
      anchors: [
        { bar: 1, timeSeconds: 0 },
        { bar: 2, timeSeconds: 6 },
        { bar: 3, timeSeconds: 10 }
      ]
    });

  await setPlaybackPosition(page, 5);
  await expect(page.getByTestId("tempo-display")).toHaveText("40 BPM");
  await expect(page.getByTestId("chord-card-0")).toHaveClass(/active/);
  await setPlaybackPosition(page, 6.1);
  await expect(page.getByTestId("tempo-display")).toHaveText("60 BPM");
  await expect(page.getByTestId("chord-card-1")).toHaveClass(/active/);

  await page.getByTestId("loop-enabled").check();
  await page.getByTestId("loop-start").fill("2");
  await page.getByTestId("loop-start").dispatchEvent("change");
  await page.getByTestId("loop-end").fill("2");
  await page.getByTestId("loop-end").dispatchEvent("change");
  await expect
    .poll(async () => page.evaluate(async (id) => {
      const response = await fetch(`/api/jobs/${id}`);
      const state = (await response.json()).practiceState;
      return { loopStart: state.loopStart, loopEnd: state.loopEnd };
    }, jobId))
    .toEqual({ loopStart: 6, loopEnd: 10 });

  await page.getByTestId("timing-done").click();
  await expect(page.getByTestId("timing-editor-controls")).not.toBeVisible();
  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await page.getByTestId("edit-timing").click();
  await expect(page.locator('.grid-marker.downbeat[data-bar="2"]')).toHaveClass(/anchored/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
  await expect(page.getByTestId("timing-editor-controls")).toBeVisible();
});

test("harmony chord beat labels stay musical through manual grid tempo and bar start corrections", async ({ page }) => {
  const jobId = "44444444-4444-4444-8444-444444444444";
  const job = {
    id: jobId,
    mode: "real",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalFilename: "grid-correction.mov",
    practiceState: { learningStatus: "not_started", stemStates: {} },
    result: {
      stems: [{ id: "piano", name: "Piano", audioUrl: `/api/jobs/${jobId}/stems/piano.wav` }],
      metadata: {
        durationSeconds: 12,
        key: { tonic: "C", mode: "major" },
        beatGrid: {
          bpm: 60,
          beatsPerBar: 4,
          beatUnit: 4,
          beatDurationSeconds: 1,
          downbeatOffsetSeconds: 1
        },
        chords: [
          { bar: 1, beat: 1, start: 1, end: 5, name: "C", roman: "I" },
          { bar: 2, beat: 1, start: 5, end: 9, name: "F", roman: "IV" }
        ],
        melody: []
      }
    }
  };

  await page.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      get() {
        return 12;
      }
    });
  });

  await page.route("**/api/library", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([job])
    });
  });
  await page.route(`**/api/jobs/${jobId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });
  await page.route(`**/api/jobs/${jobId}/practice-state`, async (route) => {
    const payload = route.request().postDataJSON();
    job.practiceState = { ...job.practiceState, ...payload };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(job)
    });
  });

  await page.goto("/");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "1");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-bar", "2");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-beat", "1");

  await page.getByTestId("tempo-display").click();
  await page.getByTestId("tempo-input").fill("120");
  await page.getByTestId("tempo-input").press("Enter");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "1");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-bar", "2");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-beat", "1");

  await setBarOneStart(page, 2);
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "1");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-bar", "2");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-beat", "1");
});

test("editable chord chart persists user overrides without replacing analyzer metadata", async ({ page }) => {
  await page.goto("/");
  const filename = `editable-chords-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Cmaj7");
  await expect(page.locator(".chord-card")).toHaveCount(4);

  await page.getByTestId("chord-name-0").fill("Csus2/G");
  await page.getByTestId("chord-name-0").press("Tab");
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Csus2/G");
  await expect(page.locator(".cue-roman").first()).toHaveText("Isus2");

  await page.getByTestId("chord-display-select").selectOption("roman");
  await expect(page.getByTestId("chord-name-0")).toHaveCount(0);
  await expect(page.locator(".cue-roman").first()).toHaveText("Isus2");
  await page.getByTestId("chord-display-select").selectOption("both");
  await page.getByTestId("bars-per-row-select").selectOption("4");
  await expect(page.locator(".chord-chart-row").first().locator(".chord-bar-segment")).toHaveCount(4);

  await dragChordToBarBeat(page, 0, 1, 2);
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "2");

  await page.getByTestId("chord-add-1-1").click();
  await expect(page.locator(".chord-card")).toHaveCount(5);
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Csus2/G");

  await page.getByTestId("chord-delete-0").click();
  await expect(page.locator(".chord-card")).toHaveCount(4);
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "2");

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        const firstChartChord = job.practiceState.chordChart?.chords?.[0];
        return {
          analyzerName: job.result.metadata.chords[0].name,
          chartRaw: firstChartChord?.raw,
          chartBar: firstChartChord?.bar,
          chartOffsetDiv: firstChartChord?.offsetDiv,
          chartDurationDiv: firstChartChord?.durationDiv,
          harmonyView: job.practiceState.harmonyView,
          legacyEditsPresent: Object.prototype.hasOwnProperty.call(job.practiceState, "chordEdits")
        };
      }, jobId);
    })
    .toEqual({
      analyzerName: "Cmaj7",
      chartRaw: "Csus2/G",
      chartBar: 1,
      chartOffsetDiv: 4,
      chartDurationDiv: 12,
      harmonyView: {
        barsPerRow: 4,
        chordDisplay: "both",
        sectionInfoVisible: true
      },
      legacyEditsPresent: false
    });

  await page.getByTestId("tempo-display").click();
  await page.getByTestId("tempo-input").fill("120");
  await page.getByTestId("tempo-input").press("Enter");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "2");

  await setBarOneStart(page, 2);
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "2");

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        const firstChartChord = job.practiceState.chordChart?.chords?.[0];
        return {
          chartBar: firstChartChord?.bar,
          chartOffsetDiv: firstChartChord?.offsetDiv,
          chartDurationDiv: firstChartChord?.durationDiv,
          bpm: job.practiceState.gridOverrides?.bpm,
          downbeatOffsetSeconds: job.practiceState.gridOverrides?.downbeatOffsetSeconds,
          harmonyView: job.practiceState.harmonyView
        };
      }, jobId);
    })
    .toEqual({
      chartBar: 1,
      chartOffsetDiv: 4,
      chartDurationDiv: 12,
      bpm: 120,
      downbeatOffsetSeconds: 2,
      harmonyView: {
        barsPerRow: 4,
        chordDisplay: "both",
        sectionInfoVisible: true
      }
    });

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("bars-per-row-select")).toHaveValue("4");
  await expect(page.getByTestId("chord-display-select")).toHaveValue("both");
  await expect(page.getByTestId("chord-name-0")).toHaveValue("Csus2/G");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-0")).toHaveAttribute("data-beat", "2");
});

test("flat section labels can be added renamed removed and persisted", async ({ page }) => {
  await page.goto("/");
  const filename = `flat-sections-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await page.getByTestId("bars-per-row-select").selectOption("4");
  await expect(page.getByTestId("create-section-button")).toBeHidden();
  await createSectionFromBars(page, 1, 4, { symbol: "A", label: "Verse" });

  await expect(page.getByTestId("section-band-1")).toContainText("A Verse");
  await expect(page.locator(".section-band")).toHaveCount(1);
  await expect(page.getByTestId("section-edit-1")).toHaveCount(1);
  await expect(page.locator(".chord-bar-segment.has-section")).toHaveCount(4);

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.sections;
      }, jobId);
    })
    .toEqual([
      {
        id: expect.any(String),
        label: "Verse",
        symbol: "A",
        startBar: 1,
        endBar: 4,
        source: "user"
      }
    ]);

  await page.getByTestId("section-edit-1").click();
  await expect(page.getByTestId("section-edit-dialog")).toBeVisible();
  await page.getByTestId("section-edit-symbol").fill("I");
  await page.getByTestId("section-edit-label").fill("Intro");
  await page.getByTestId("section-edit-save").click();
  await expect(page.getByTestId("section-band-1")).toContainText("I Intro");
  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.sections[0];
      }, jobId);
    })
    .toMatchObject({ symbol: "I", label: "Intro" });

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("section-band-1")).toContainText("I Intro");

  await page.getByTestId("section-info-toggle").uncheck();
  await expect(page.locator(".section-band")).toHaveCount(0);
  await expect(page.getByTestId("section-add-bar-5")).toHaveCount(0);
  await page.getByTestId("section-info-toggle").check();
  await expect(page.getByTestId("section-band-1")).toContainText("I Intro");

  await page.getByTestId("section-remove-1").click();
  await expect(page.locator(".section-band")).toHaveCount(0);

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.sections;
      }, jobId);
    })
    .toEqual([]);

  await createSectionFromBars(page, 2, 3);
  await expect(page.getByTestId("section-band-2")).toHaveCount(1);
  await expect(page.getByTestId("section-band-2")).toHaveAttribute("aria-label", "Section bars 2-3");
  await expect(page.locator(".section-band-label")).toHaveCount(0);

  await page.getByTestId("section-edit-2").click();
  await expect(page.getByTestId("section-edit-dialog")).toBeVisible();
  await page.getByTestId("section-edit-save").click();
  await expect(page.getByTestId("section-edit-dialog")).not.toBeVisible();

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.sections;
      }, jobId);
    })
    .toEqual([
      {
        id: expect.any(String),
        label: "",
        symbol: "",
        startBar: 2,
        endBar: 3,
        source: "user"
      }
    ]);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("section-band-2")).toHaveCount(1);
  await expect(page.locator(".section-band-label")).toHaveCount(0);
});

test("section ranges reject overlap and render one label across bars-per-row layouts", async ({ page }) => {
  await page.goto("/");
  const filename = `section-ranges-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await createSectionFromBars(page, 1, 4, { symbol: "A", label: "Verse" });

  await selectSectionBars(page, 3, 4);
  await expect(page.getByTestId("create-section-button")).toBeDisabled();
  await expect(page.getByTestId("section-selection-summary")).toContainText("already has section info");

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.sections;
      }, jobId);
    })
    .toHaveLength(1);

  for (const barsPerRow of ["1", "2", "4", "8"]) {
    await page.getByTestId("bars-per-row-select").selectOption(barsPerRow);
    await expect(page.locator(".section-band-label", { hasText: "A Verse" })).toHaveCount(1);
    await expect(page.getByTestId("section-edit-1")).toHaveCount(1);
  }

  await page.getByTestId("section-band-1").dblclick();
  await expect(page.getByTestId("section-edit-dialog")).toBeVisible();
  await page.getByTestId("section-edit-symbol").fill("C");
  await page.getByTestId("section-edit-label").fill("Chorus");
  await page.getByTestId("section-edit-save").click();
  await expect(page.getByTestId("section-band-1")).toContainText("C Chorus");
});

test("section creation starts from selected bars and keeps chord card height stable", async ({ page }) => {
  await page.goto("/");
  const filename = `section-selection-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await page.getByTestId("bars-per-row-select").selectOption("4");
  await expect(page.getByTestId("create-section-button")).toBeHidden();
  await expect(page.getByTestId("section-add-bar-1")).toBeVisible();

  await selectSectionBars(page, 1, 3);
  await expect(page.getByTestId("create-section-button")).toBeVisible();
  await expect(page.getByTestId("section-selection-summary")).toContainText("Bars 1-3 selected");
  await page.getByTestId("create-section-button").click();
  await expect(page.getByTestId("section-create-dialog")).toBeVisible();
  await expect(page.getByTestId("section-create-dialog").getByTestId("section-edit-start")).toHaveCount(0);
  await page.getByTestId("section-create-symbol").fill("I");
  await page.getByTestId("section-create-label").fill("Intro");
  await page.getByTestId("section-create-color").selectOption("green");
  await page.getByTestId("section-create-save").click();

  await expect(page.getByTestId("section-band-1")).toContainText("I Intro");
  await expect(page.getByTestId("section-band-1")).toHaveAttribute("data-section-color", "green");
  await expect(page.getByTestId("section-add-bar-4")).toBeVisible();

  const cardHeights = await page.evaluate(() => {
    const bar1Card = document.querySelector('.chord-bar-segment[data-bar="1"] .chord-card');
    const bar4Card = document.querySelector('.chord-bar-segment[data-bar="4"] .chord-card');
    return [bar1Card, bar4Card].map((element) => element?.getBoundingClientRect().height || 0);
  });
  expect(Math.abs(cardHeights[0] - cardHeights[1])).toBeLessThanOrEqual(1);

  await page.getByTestId("section-add-bar-4").click();
  await expect(page.getByTestId("section-create-dialog")).toBeVisible();
  await page.getByTestId("section-create-symbol").fill("O");
  await page.getByTestId("section-create-label").fill("Outro");
  await page.getByTestId("section-create-save").click();
  await expect(page.getByTestId("section-band-4")).toContainText("O Outro");
});

test("chord cards can be resized to expose beat cells for inserting chords", async ({ page }) => {
  await page.goto("/");
  const filename = `resize-chords-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await page.getByTestId("bars-per-row-select").selectOption("4");
  await expect(page.locator(".chord-card")).toHaveCount(4);
  await expect(page.getByTestId("chord-add-1-2")).toBeHidden();
  await expect(page.getByTestId("chord-add-1-3")).toBeHidden();

  const handle = page.getByTestId("chord-resize-0");
  const target = page.locator('.chord-bar-segment[data-bar="1"]');
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  const beatsPerBar = await target.evaluate((element) => Number(getComputedStyle(element).getPropertyValue("--beats-per-bar")) || 4);
  if (!handleBox || !targetBox) {
    throw new Error("Could not resolve resize preview target boxes.");
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width * (2 / beatsPerBar), targetBox.y + targetBox.height / 2);
  await expect
    .poll(async () => page.getByTestId("chord-card-0").evaluate((card) => card.style.gridColumn))
    .toBe("1 / span 2");
  await expect(page.getByTestId("chord-add-1-2")).toBeHidden();
  await expect(page.getByTestId("chord-add-1-3")).toBeVisible();
  await page.mouse.up();

  await expect(page.getByTestId("chord-add-1-3")).toBeVisible();
  await page.getByTestId("chord-add-1-3").click();
  await expect(page.locator(".chord-card")).toHaveCount(5);
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-bar", "1");
  await expect(page.getByTestId("chord-card-1")).toHaveAttribute("data-beat", "3");

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        const chords = job.practiceState.chordChart?.chords || [];
        return {
          firstDurationDiv: chords[0]?.durationDiv,
          insertedOffsetDiv: chords[1]?.offsetDiv
        };
      }, jobId);
    })
    .toEqual({
      firstDurationDiv: 8,
      insertedOffsetDiv: 8
    });
});

test("last chord can be deleted without restoring analyzer chords", async ({ page }) => {
  await page.goto("/");
  const filename = `delete-last-chord-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await page.getByTestId("bars-per-row-select").selectOption("4");

  while ((await page.locator(".chord-card").count()) > 0) {
    await page.getByTestId("chord-delete-0").click();
  }

  await expect(page.locator(".chord-card")).toHaveCount(0);
  await expect(page.getByTestId("chord-add-1-1")).toBeVisible();

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        const job = await response.json();
        return job.practiceState.chordChart?.chords?.length;
      }, jobId);
    })
    .toBe(0);

  await page.reload();
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.locator(".chord-card")).toHaveCount(0);
  await expect(page.getByTestId("chord-add-1-1")).toBeVisible();
});

test("play after pause resumes stem audio from the paused timeline position", async ({ page }) => {
  await page.addInitScript(() => {
    window.__playCalls = [];
    const currentTimes = new WeakMap();
    const pausedStates = new WeakMap();
    const seekingStates = new WeakMap();
    const seekTimers = new WeakMap();

    Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
      get() {
        return currentTimes.get(this) ?? 0;
      },
      set(value) {
        const nextValue = Number(value) || 0;
        seekingStates.set(this, true);
        window.clearTimeout(seekTimers.get(this));
        seekTimers.set(this, window.setTimeout(() => {
          currentTimes.set(this, nextValue);
          seekingStates.set(this, false);
          this.dispatchEvent(new Event("seeked"));
        }, 25));
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
    Object.defineProperty(HTMLMediaElement.prototype, "seeking", {
      get() {
        return seekingStates.get(this) ?? false;
      }
    });
    HTMLMediaElement.prototype.play = function () {
      if (this.seeking) {
        currentTimes.set(this, 0);
      }
      pausedStates.set(this, false);
      window.__playCalls.push({
        stemId: this.dataset.stemId,
        currentTime: this.currentTime
      });
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      pausedStates.set(this, true);
    };
  });

  await page.goto("/?demo=processed");
  await expect(page.getByTestId("practice-view")).toBeVisible();

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

  const pausedPosition = Number(await page.locator("#scrubber").inputValue());
  expect(pausedPosition).toBeGreaterThan(0.2);

  await page.evaluate(() => {
    window.__playCalls = [];
  });
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  const resumedPlayCalls = await page.evaluate(() => window.__playCalls);
  expect(resumedPlayCalls.length).toBeGreaterThan(0);
  for (const call of resumedPlayCalls) {
    expect(call.currentTime).toBeGreaterThan(pausedPosition - 0.08);
  }
});

test("processed song library reopens songs and persists practice state", async ({ page }) => {
  await page.addInitScript(() => {
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
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      pausedStates.set(this, true);
    };
  });

  const filename = `phase-one-library-${Date.now()}.mov`;
  await page.goto("/");
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: mock");

  await page.getByTestId("media-input").setInputFiles({
    name: filename,
    mimeType: "video/quicktime",
    buffer: Buffer.from("mock media bytes")
  });
  const jobId = await libraryJobId(page, filename);
  await expect(page.getByTestId("home-view")).toBeVisible();
  await expect(page.getByTestId("practice-view")).toBeHidden();

  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText(filename);
  await expect(page.getByTestId(`song-row-${jobId}`)).not.toContainText("complete");

  await page.reload();
  await expect(page.getByTestId("practice-view")).toBeHidden();
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText(filename);

  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("selected-song-title")).toHaveText(filename);
  await expect(page.getByTestId("stem-row-piano")).toBeVisible();

  await page.getByTestId("speed-075").click();
  await page.getByTestId("loop-enabled").check();
  await expect(page.getByTestId("loop-settings")).toBeVisible();
  await page.getByTestId("loop-start").fill("2");
  await page.getByTestId("loop-end").fill("2");
  await page.getByTestId("count-in-bars").selectOption("1");
  await page.getByTestId("start-at-bar-one").check();
  await page.getByTestId("metronome-mute").click();
  await page.getByTestId("metronome-volume").evaluate((slider) => {
    slider.value = "0.65";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByTestId("metronome-solo").click();
  await page.getByTestId("key-select").selectOption("D:major");
  await page.getByTestId("tempo-double").click();
  await setBarOneStart(page, -0.25);
  await page.getByTestId("meter-select").selectOption("6/8");
  await setPlaybackPosition(page, 3.2);
  await page.getByTestId("stem-mute-piano").click();
  await page.getByTestId("stem-volume-piano").evaluate((slider) => {
    slider.value = "0.35";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByTestId("learning-status").selectOption("practicing");

  await expect
    .poll(async () => {
      const state = await page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        return (await response.json()).practiceState;
      }, jobId);
      return {
        learningStatus: state.learningStatus,
        playbackRate: state.playbackRate,
        loopStart: state.loopStart,
        loopEnd: state.loopEnd,
        loopEnabled: state.loopEnabled,
        countInBars: state.countInBars,
        lastPosition: Math.round(state.lastPosition * 10) / 10,
        metronomeEnabled: state.metronomeEnabled,
        metronomeVolume: state.metronomeVolume,
        metronomeSolo: state.metronomeSolo,
        tempoBpm: state.gridOverrides?.bpm,
        beatsPerBar: state.gridOverrides?.beatsPerBar,
        beatUnit: state.gridOverrides?.beatUnit,
        downbeatOffsetSeconds: state.gridOverrides?.downbeatOffsetSeconds,
        keyOverride: state.keyOverride,
        pianoMuted: state.stemStates.piano.muted,
        pianoVolume: state.stemStates.piano.volume
      };
    })
    .toEqual({
      learningStatus: "practicing",
      playbackRate: 0.75,
      loopStart: 2.75,
      loopEnd: 5.75,
      loopEnabled: true,
      countInBars: 1,
      lastPosition: 3.2,
      metronomeEnabled: true,
      metronomeVolume: 0.65,
      metronomeSolo: true,
      tempoBpm: 120,
      beatsPerBar: 6,
      beatUnit: 8,
      downbeatOffsetSeconds: -0.25,
      keyOverride: { tonic: "D", mode: "major" },
      pianoMuted: true,
      pianoVolume: 0.35
    });

  await page.reload();
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText("Practicing");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("learning-status")).toHaveValue("practicing");
  await expect(page.getByTestId("speed-075")).toHaveClass(/active/);
  await expect(page.getByTestId("loop-start")).toHaveValue("2");
  await expect(page.getByTestId("loop-end")).toHaveValue("2");
  await expect(page.getByTestId("loop-enabled")).toBeChecked();
  await expect(page.getByTestId("count-in-bars")).toHaveValue("1");
  await expect(page.getByTestId("start-at-bar-one")).toBeChecked();
  await expect(page.getByTestId("metronome-mute")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("metronome-volume")).toHaveValue("0.65");
  await expect(page.getByTestId("metronome-solo")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("key-select")).toHaveValue("D:major");
  await expect(page.getByTestId("tempo-display")).toHaveText("120 BPM");
  await page.getByTestId("edit-timing").click();
  await expect(page.getByTestId("timing-anchor-time")).toHaveValue("-0.250");
  await page.getByTestId("timing-done").click();
  await expect(page.getByTestId("meter-select")).toHaveValue("6/8");
  await expect(page.locator("#scrubber")).toHaveValue("3.2");
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/muted/);
  await expect(page.getByTestId("stem-volume-piano")).toHaveValue("0.35");

  page.once("dialog", (dialog) => dialog.accept("Renamed Phase 1 song"));
  await page.getByTestId("selected-more-button").click();
  await page.getByTestId("selected-rename-button").click();
  await expect(page.getByTestId("selected-song-title")).toHaveText("Renamed Phase 1 song");
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText("Renamed Phase 1 song");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("selected-more-button").click();
  await page.getByTestId("selected-delete-button").click();
  await expect(page.getByTestId(`song-row-${jobId}`)).toHaveCount(0);
  await expect(page.getByTestId("empty-detail")).toBeVisible();

  const deletedStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/jobs/${id}`);
    return response.status;
  }, jobId);
  expect(deletedStatus).toBe(404);
});

test("practice state saves to the edited song before an immediate song switch", async ({ page }) => {
  const suffix = Date.now();
  const firstFilename = `save-reliability-first-${suffix}.mov`;
  const secondFilename = `save-reliability-second-${suffix}.mov`;

  await page.goto("/");
  const firstJobId = await createProcessedJob(page, firstFilename);
  const secondJobId = await createProcessedJob(page, secondFilename);
  await page.reload();

  await page.getByTestId(`song-row-${firstJobId}`).click();
  await expect(page.getByTestId("selected-song-title")).toHaveText(firstFilename);
  await expect(page.getByTestId("practice-save-status")).toHaveText("Saved");

  await page.getByTestId("speed-05").click();
  await expect(page.getByTestId("practice-save-status")).toHaveText("Saving...");
  await page.getByTestId(`song-row-${secondJobId}`).click();
  await expect(page.getByTestId("selected-song-title")).toHaveText(secondFilename);

  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        return (await response.json()).practiceState.playbackRate;
      }, firstJobId);
    })
    .toBe(0.5);
  await expect(page.getByTestId("practice-save-status")).toHaveText("Saved");

  await page.route(`**/api/jobs/${secondJobId}/practice-state`, (route) => {
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "test save failure" }) });
  });
  await page.getByTestId("speed-075").click();
  await expect(page.getByTestId("practice-save-status")).toHaveText("Save failed");

  await page.unroute(`**/api/jobs/${secondJobId}/practice-state`);
  await page.getByTestId("speed-1").click();
  await expect(page.getByTestId("practice-save-status")).toHaveText("Saved");
});

test("active and failed backend jobs remain available after reload", async ({ page }) => {
  const suffix = Date.now();
  const activeFilename = `persistent-job-${suffix}.mov`;
  const failedFilename = `persistent-failed-${suffix}.mov`;

  await page.goto("/");
  const activeJob = await page.evaluate(async (filename) => {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename, size: 128, type: "video/quicktime" })
    });
    return response.json();
  }, activeFilename);

  await page.reload();
  await expect(page.getByTestId(`song-row-${activeJob.id}`)).toBeVisible();
  await page.getByTestId(`song-row-${activeJob.id}`).click();
  await expect(page.getByTestId("processing-detail")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId(`song-row-${activeJob.id}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${activeJob.id}`)).toContainText("Not started", { timeout: 15_000 });

  await page.evaluate(async () => {
    await fetch("/api/settings/pipeline-mode", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "real" })
    });
  });
  const failedJob = await page.evaluate(async (filename) => {
    const formData = new FormData();
    formData.append("media", new File(["not valid media"], filename, { type: "video/quicktime" }));
    const response = await fetch("/api/jobs", { method: "POST", body: formData });
    return response.json();
  }, failedFilename);
  await expect
    .poll(async () => {
      return page.evaluate(async (id) => {
        const response = await fetch(`/api/jobs/${id}`);
        return (await response.json()).status;
      }, failedJob.id);
    }, { timeout: 15_000 })
    .toBe("failed");
  await page.evaluate(async () => {
    await fetch("/api/settings/pipeline-mode", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "mock" })
    });
  });

  await page.reload();
  const failedRow = page.getByTestId(`song-row-${failedJob.id}`);
  await expect(failedRow).toContainText("Failed");
  await failedRow.click();
  await expect(page.getByTestId("failed-detail")).toBeVisible();
  await expect(page.locator("#failedMessage")).not.toHaveText("The job could not be processed.");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("failed-delete-button").click();
  await expect(failedRow).toHaveCount(0);
});

test("home upload queue processes multiple files without opening practice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: mock");

  const firstFilename = `queue-first-${Date.now()}.mov`;
  const secondFilename = `queue-second-${Date.now()}.mov`;
  await page.getByTestId("media-input").setInputFiles([
    {
      name: firstFilename,
      mimeType: "video/quicktime",
      buffer: Buffer.from("first mock media bytes")
    },
    {
      name: secondFilename,
      mimeType: "video/quicktime",
      buffer: Buffer.from("second mock media bytes")
    }
  ]);

  await expect(page.getByTestId("song-list")).toContainText(firstFilename);
  await expect(page.getByTestId("song-list")).toContainText(secondFilename);

  const firstJobId = await libraryJobId(page, firstFilename);
  const secondJobId = await libraryJobId(page, secondFilename);
  await expect(page.getByTestId("home-view")).toBeVisible();
  await expect(page.getByTestId("practice-view")).toBeHidden();

  await expect(page.getByTestId(`song-row-${firstJobId}`)).toContainText(firstFilename);
  await expect(page.getByTestId(`song-row-${secondJobId}`)).toContainText(secondFilename);
  await expect(page.getByTestId(`song-row-${firstJobId}`)).not.toContainText("complete");
  await expect(page.getByTestId(`song-row-${secondJobId}`)).not.toContainText("complete");
});

test("unified song list shows completed songs and filters by learning status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("service-status")).toContainText("Backend ready: mock");

  const prefix = `recent-${Date.now()}`;
  const filenames = Array.from({ length: 6 }, (_, index) => `${prefix}-${index + 1}.mov`);
  const jobIds = [];

  for (const filename of filenames) {
    jobIds.push(await createProcessedJob(page, filename));
  }

  await page.evaluate(async (ids) => {
    const statuses = ["not_started", "practicing", "learned", "not_started", "practicing", "learned"];
    for (const [index, id] of ids.entries()) {
      await fetch(`/api/jobs/${id}/practice-state`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ learningStatus: statuses[index] })
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }, jobIds);

  await page.reload();
  await expect(page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix })).toHaveCount(6);
  await expect(
    page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix }).locator(".song-row-title")
  ).toHaveText([...filenames].reverse());
  await expect(page.getByTestId(`song-row-${jobIds[5]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[4]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[3]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[0]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[5]}`)).toContainText("Learned");
  await expect(page.getByTestId(`song-row-${jobIds[4]}`)).toContainText("Practicing");
  await expect(page.getByTestId(`song-row-${jobIds[3]}`)).toContainText("Not started");

  await page.getByTestId("filter-practicing").click();
  await expect(page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix })).toHaveCount(2);
  await expect(
    page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix }).locator(".song-row-title")
  ).toHaveText([filenames[4], filenames[1]]);
  await expect(page.getByTestId(`song-row-${jobIds[1]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[4]}`)).toBeVisible();

  await page.getByTestId("filter-learned").click();
  await expect(page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix })).toHaveCount(2);
  await expect(
    page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix }).locator(".song-row-title")
  ).toHaveText([filenames[5], filenames[2]]);
  await expect(page.getByTestId(`song-row-${jobIds[2]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[5]}`)).toBeVisible();

  await page.getByTestId("filter-not-started").click();
  await expect(page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix })).toHaveCount(2);
  await expect(
    page.getByTestId("song-list").locator(".song-row").filter({ hasText: prefix }).locator(".song-row-title")
  ).toHaveText([filenames[3], filenames[0]]);
  await expect(page.getByTestId(`song-row-${jobIds[0]}`)).toBeVisible();
  await expect(page.getByTestId(`song-row-${jobIds[3]}`)).toBeVisible();
});

test("mobile uses a list-first song workspace stack", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/");
  const filename = `mobile-workspace-${Date.now()}.mov`;
  const jobId = await createProcessedJob(page, filename);

  await page.reload();
  await expect(page.getByTestId("song-sidebar")).toBeVisible();
  await expect(page.getByTestId("song-detail")).toBeHidden();
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText(filename);

  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("song-sidebar")).toBeHidden();
  await expect(page.getByTestId("song-detail")).toBeVisible();
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("selected-song-title")).toHaveText(filename);

  await page.getByTestId("back-to-home-button").click();
  await expect(page.getByTestId("song-sidebar")).toBeVisible();
  await expect(page.getByTestId("song-detail")).toBeHidden();
  await expect(page.getByTestId(`song-row-${jobId}`)).toBeVisible();
});
