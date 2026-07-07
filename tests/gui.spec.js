import { test, expect } from "@playwright/test";

test.afterEach(async ({ request }) => {
  await request.put("/api/settings/pipeline-mode", { data: { mode: "mock" } });
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

  await page.getByTestId("loop-start").fill("1");
  await page.getByTestId("loop-end").fill("3");
  await page.getByTestId("loop-enabled").check();
  await expect(page.getByTestId("loop-enabled")).toBeChecked();

  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByTestId("tempo-display")).toHaveText("60 BPM");
  await expect(page.getByText("Cmaj7")).toBeVisible();
  await expect(page.getByText("Imaj7")).toBeVisible();
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
  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByTestId("tempo-display")).toHaveText("60 BPM");
  await expect(page.getByText("Cmaj7")).toBeVisible();
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
  await expect(page.getByTestId("bar-start-input")).toHaveValue("0");
  await expect(page.getByTestId("grid-offset-input")).toHaveValue("0");

  await page.getByTestId("bar-start-input").fill("0.5");
  await page.getByTestId("bar-start-input").press("Enter");
  await page.getByTestId("grid-offset-plus").click();
  await page.getByTestId("meter-3").click();
  await expect(page.locator(".grid-marker").first()).toHaveAttribute("data-time", "0.51");
  await expect(page.locator(".grid-marker.downbeat")).toHaveCount(6);
  await expect(page.getByTestId("meter-3")).toHaveClass(/active/);

  await page.getByTestId("metronome-enabled").check();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await expect
    .poll(async () => page.evaluate(() => window.__metronomeClicks.length))
    .toBeGreaterThan(0);
  const clicks = await page.evaluate(() => window.__metronomeClicks);
  expect(clicks[0]).toMatchObject({ time: 10.51, frequency: 1320 });
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

test("harmony panel shows analysis tempo and sub-second cue times", async ({ page }) => {
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

  await expect(page.getByTestId("key-badge")).toHaveText("C major");
  await expect(page.getByTestId("tempo-display")).toHaveText("72.5 BPM");
  await expect(page.getByTestId("selected-song-meta")).toContainText("C major · 72.5 BPM");
  await expect(page.locator(".cue-time").first()).toHaveText("Bar 1 · 0:00.7-0:04.7");

  await page.getByTestId("tempo-display").click();
  await page.getByTestId("tempo-input").fill("145");
  await page.getByTestId("tempo-input").press("Enter");
  await expect(page.getByTestId("tempo-display")).toHaveText("145 BPM");
  await expect(page.getByTestId("selected-song-meta")).toContainText("C major · 145 BPM");
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
  await page.getByTestId("loop-start").fill("1.5");
  await page.getByTestId("loop-end").fill("5.5");
  await page.getByTestId("loop-enabled").check();
  await page.getByTestId("metronome-enabled").check();
  await page.getByTestId("metronome-volume").evaluate((slider) => {
    slider.value = "0.65";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByTestId("metronome-accent").uncheck();
  await page.getByTestId("tempo-double").click();
  await page.getByTestId("bar-start-input").fill("0.25");
  await page.getByTestId("bar-start-input").press("Enter");
  await page.getByTestId("grid-offset-minus").click();
  await page.getByTestId("meter-3").click();
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
        lastPosition: Math.round(state.lastPosition * 10) / 10,
        metronomeEnabled: state.metronomeEnabled,
        metronomeVolume: state.metronomeVolume,
        metronomeAccent: state.metronomeAccent,
        tempoBpm: state.gridOverrides?.bpm,
        beatsPerBar: state.gridOverrides?.beatsPerBar,
        downbeatOffsetSeconds: state.gridOverrides?.downbeatOffsetSeconds,
        gridOffsetSeconds: state.gridOverrides?.gridOffsetSeconds,
        pianoMuted: state.stemStates.piano.muted,
        pianoVolume: state.stemStates.piano.volume
      };
    })
    .toEqual({
      learningStatus: "practicing",
      playbackRate: 0.75,
      loopStart: 1.5,
      loopEnd: 5.5,
      loopEnabled: true,
      lastPosition: 3.2,
      metronomeEnabled: true,
      metronomeVolume: 0.65,
      metronomeAccent: false,
      tempoBpm: 120,
      beatsPerBar: 3,
      downbeatOffsetSeconds: 0.25,
      gridOffsetSeconds: -0.01,
      pianoMuted: true,
      pianoVolume: 0.35
    });

  await page.reload();
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText("Practicing");
  await page.getByTestId(`song-row-${jobId}`).click();
  await expect(page.getByTestId("practice-view")).toBeVisible();
  await expect(page.getByTestId("learning-status")).toHaveValue("practicing");
  await expect(page.getByTestId("speed-075")).toHaveClass(/active/);
  await expect(page.getByTestId("loop-start")).toHaveValue("1.5");
  await expect(page.getByTestId("loop-end")).toHaveValue("5.5");
  await expect(page.getByTestId("loop-enabled")).toBeChecked();
  await expect(page.getByTestId("metronome-enabled")).toBeChecked();
  await expect(page.getByTestId("metronome-volume")).toHaveValue("0.65");
  await expect(page.getByTestId("metronome-accent")).not.toBeChecked();
  await expect(page.getByTestId("tempo-display")).toHaveText("120 BPM");
  await expect(page.getByTestId("bar-start-input")).toHaveValue("0.25");
  await expect(page.getByTestId("grid-offset-input")).toHaveValue("-0.01");
  await expect(page.getByTestId("meter-3")).toHaveClass(/active/);
  await expect(page.locator("#scrubber")).toHaveValue("3.2");
  await expect(page.getByTestId("stem-row-piano")).toHaveClass(/muted/);
  await expect(page.getByTestId("stem-volume-piano")).toHaveValue("0.35");

  page.once("dialog", (dialog) => dialog.accept("Renamed Phase 1 song"));
  await page.getByTestId("selected-rename-button").click();
  await expect(page.getByTestId("selected-song-title")).toHaveText("Renamed Phase 1 song");
  await expect(page.getByTestId(`song-row-${jobId}`)).toContainText("Renamed Phase 1 song");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("selected-delete-button").click();
  await expect(page.getByTestId(`song-row-${jobId}`)).toHaveCount(0);
  await expect(page.getByTestId("empty-detail")).toBeVisible();

  const deletedStatus = await page.evaluate(async (id) => {
    const response = await fetch(`/api/jobs/${id}`);
    return response.status;
  }, jobId);
  expect(deletedStatus).toBe(404);
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
  await expect(page.getByTestId(`song-row-${jobIds[3]}`)).toContainText("Ready");

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
