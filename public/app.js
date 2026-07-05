const serviceStatus = document.querySelector("#serviceStatus");
const uploadForm = document.querySelector("#uploadForm");
const mediaInput = document.querySelector("#mediaInput");
const fileLabel = document.querySelector("#fileLabel");
const uploadButton = document.querySelector("#uploadButton");
const jobProgress = document.querySelector("#jobProgress");
const jobStatus = document.querySelector("#jobStatus");
const jobPercent = document.querySelector("#jobPercent");
const progressBar = document.querySelector("#progressBar");
const practiceView = document.querySelector("#practiceView");
const stemDeck = document.querySelector("#stemDeck");
const stemMixer = document.querySelector("#stemMixer");
const playButton = document.querySelector("#playButton");
const scrubber = document.querySelector("#scrubber");
const speedControls = document.querySelector("#speedControls");
const loopStart = document.querySelector("#loopStart");
const loopEnd = document.querySelector("#loopEnd");
const loopEnabled = document.querySelector("#loopEnabled");
const timeReadout = document.querySelector("#timeReadout");
const keyBadge = document.querySelector("#keyBadge");
const chordList = document.querySelector("#chordList");
const urlParams = new URLSearchParams(window.location.search);

let currentMetadata = null;
let pollTimer = null;
let pipelineMode = "mock";
let stemPlayers = [];
let primaryPlayer = null;
let isPlaying = false;
let isSeeking = false;
let playbackRate = 1;
let transportPosition = 0;
let transportStartedAt = 0;
let transportFrame = null;
const loadProcessedDemo =
  urlParams.get("demo") === "processed" ||
  urlParams.get("skipUpload") === "1";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${wholeSeconds}`;
}

function updateProgress(job) {
  jobProgress.hidden = false;
  jobStatus.textContent = job.status;
  jobPercent.textContent = `${job.progress}%`;
  progressBar.style.width = `${job.progress}%`;
}

function renderCompletedJob(job) {
  const stems = job.result.stems?.length
    ? job.result.stems
    : [{ id: "piano", name: "Piano", audioUrl: job.result.audioUrl }];
  renderStemPlayers(stems);
  renderMetadata(job.result.metadata);
  practiceView.hidden = false;
}

function renderMetadata(metadata) {
  currentMetadata = metadata;
  keyBadge.textContent = `${metadata.key.tonic} ${metadata.key.mode}`;

  chordList.replaceChildren(
    ...metadata.chords.map((chord, index) => {
      const card = document.createElement("div");
      card.className = "chord-card";
      card.dataset.index = String(index);
      card.innerHTML = `
        <span class="cue-time">${formatTime(chord.start)}-${formatTime(chord.end)}</span>
        <span class="cue-name">${chord.name}</span>
        <span class="cue-roman">${chord.roman}</span>
      `;
      return card;
    })
  );
}

function transportTime() {
  if (!isPlaying) return boundTransportTime(transportPosition);

  const elapsed = (performance.now() - transportStartedAt) / 1000;
  return boundTransportTime(transportPosition + elapsed * playbackRate);
}

function transportDuration() {
  const preferredPlayers = [primaryPlayer, ...stemPlayers].filter(Boolean);
  const player = preferredPlayers.find((candidate) => Number.isFinite(candidate.audio.duration) && candidate.audio.duration > 0);
  return player ? player.audio.duration : 0;
}

function boundTransportTime(seconds) {
  const duration = transportDuration();
  if (Number.isFinite(duration) && duration > 0) {
    return Math.max(0, Math.min(seconds, duration));
  }
  return Math.max(0, seconds);
}

function anchorTransport(seconds) {
  transportPosition = boundTransportTime(seconds);
  transportStartedAt = performance.now();
}

function updateTimeDisplay() {
  const current = transportTime();
  const duration = transportDuration();
  timeReadout.textContent = `${formatTime(current)} / ${formatTime(duration)}`;

  if (Number.isFinite(duration) && duration > 0) {
    scrubber.max = String(duration);
  }

  if (!isSeeking) {
    scrubber.value = String(current);
  }
}

function highlightCurrentChord() {
  if (!currentMetadata) return;
  const time = transportTime();
  const activeIndex = currentMetadata.chords.findIndex((chord) => time >= chord.start && time < chord.end);

  for (const card of chordList.querySelectorAll(".chord-card")) {
    card.classList.toggle("active", card.dataset.index === String(activeIndex));
  }
}

function syncStemTimes(seconds, threshold = 0) {
  for (const player of stemPlayers) {
    if (Math.abs(player.audio.currentTime - seconds) > threshold) {
      player.audio.currentTime = seconds;
    }
  }
}

function setTransportTime(seconds) {
  const bounded = boundTransportTime(seconds);
  anchorTransport(bounded);
  syncStemTimes(bounded);
  updateTimeDisplay();
  highlightCurrentChord();
}

function stopTransportTick() {
  if (transportFrame !== null) {
    cancelAnimationFrame(transportFrame);
    transportFrame = null;
  }
}

function tickTransport() {
  if (!isPlaying) return;

  const start = Number(loopStart.value);
  const end = Number(loopEnd.value);
  let current = transportTime();

  if (loopEnabled.checked && Number.isFinite(start) && Number.isFinite(end) && end > start && current >= end) {
    setTransportTime(start);
    current = transportTime();
  }

  updateTimeDisplay();
  highlightCurrentChord();

  const duration = transportDuration();
  if (Number.isFinite(duration) && duration > 0 && current >= duration) {
    pauseAll();
    setTransportTime(0);
    return;
  }

  transportFrame = requestAnimationFrame(tickTransport);
}

function startTransportTick() {
  stopTransportTick();
  transportFrame = requestAnimationFrame(tickTransport);
}

function pauseAll() {
  const current = transportTime();
  for (const player of stemPlayers) {
    player.audio.pause();
  }
  isPlaying = false;
  anchorTransport(current);
  stopTransportTick();
  playButton.textContent = "Play";
  updateTimeDisplay();
  highlightCurrentChord();
}

async function playAll() {
  if (!stemPlayers.length) return;

  const current = transportTime();
  anchorTransport(current);
  for (const player of stemPlayers) {
    player.audio.currentTime = current;
    player.audio.playbackRate = playbackRate;
  }

  const results = await Promise.allSettled(stemPlayers.map((player) => player.audio.play()));
  if (results.some((result) => result.status === "fulfilled")) {
    isPlaying = true;
    anchorTransport(current);
    startTransportTick();
    playButton.textContent = "Pause";
  }
}

function resumeAudibleStem(player) {
  if (!isPlaying || player.audio.muted) return;

  const current = transportTime();
  player.audio.playbackRate = playbackRate;

  if (player.audio.paused) {
    player.audio.currentTime = current;
    player.audio.play().catch(console.error);
    return;
  }

  if (Math.abs(player.audio.currentTime - current) > 0.75) {
    player.audio.currentTime = current;
  }
}

function updateStemAudibility() {
  const hasSolo = stemPlayers.some((player) => player.solo);
  const playersToResume = [];

  for (const player of stemPlayers) {
    const wasMuted = player.audio.muted;
    const nextMuted = hasSolo ? !player.solo : player.muted;

    player.audio.muted = nextMuted;
    player.row.classList.toggle("muted", player.muted);
    player.row.classList.toggle("solo", player.solo);
    player.muteButton.textContent = player.muted ? "Unmute" : "Mute";
    player.muteButton.setAttribute("aria-pressed", String(player.muted));
    player.soloButton.textContent = player.solo ? "Unsolo" : "Solo";
    player.soloButton.setAttribute("aria-pressed", String(player.solo));

    if (wasMuted && !nextMuted) {
      playersToResume.push(player);
    }
  }

  for (const player of playersToResume) {
    resumeAudibleStem(player);
  }
}

function setStemMuted(stemId, muted) {
  const player = stemPlayers.find((candidate) => candidate.id === stemId);
  if (!player) return;

  player.muted = muted;
  if (muted) {
    player.solo = false;
  }
  updateStemAudibility();
}

function setStemSolo(stemId, solo) {
  const player = stemPlayers.find((candidate) => candidate.id === stemId);
  if (!player) return;

  player.solo = solo;
  if (solo) {
    player.muted = false;
  }
  updateStemAudibility();
}

function renderStemPlayers(stems) {
  pauseAll();
  stemPlayers = [];
  primaryPlayer = null;
  anchorTransport(0);
  stemDeck.replaceChildren();
  stemMixer.replaceChildren();

  for (const stem of stems) {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = stem.audioUrl;
    audio.dataset.stemId = stem.id;
    audio.muted = Boolean(stem.defaultMuted);
    audio.playbackRate = playbackRate;
    stemDeck.append(audio);

    const row = document.createElement("div");
    row.className = "stem-row";
    row.dataset.testid = `stem-row-${stem.id}`;
    row.innerHTML = `
      <div>
        <span class="stem-name">${stem.name}</span>
      </div>
    `;

    const controls = document.createElement("div");
    controls.className = "stem-controls";

    const muteButton = document.createElement("button");
    muteButton.type = "button";
    muteButton.className = "stem-toggle";
    muteButton.dataset.stemId = stem.id;
    muteButton.dataset.stemAction = "mute";
    muteButton.dataset.testid = `stem-mute-${stem.id}`;
    controls.append(muteButton);

    const soloButton = document.createElement("button");
    soloButton.type = "button";
    soloButton.className = "stem-toggle stem-solo";
    soloButton.dataset.stemId = stem.id;
    soloButton.dataset.stemAction = "solo";
    soloButton.dataset.testid = `stem-solo-${stem.id}`;
    controls.append(soloButton);

    row.append(controls);
    stemMixer.append(row);

    const player = {
      ...stem,
      audio,
      row,
      muteButton,
      soloButton,
      muted: Boolean(stem.defaultMuted),
      solo: false
    };
    stemPlayers.push(player);

    if (stem.id === "piano") {
      primaryPlayer = player;
    }
  }

  updateStemAudibility();
  primaryPlayer ||= stemPlayers[0] || null;
  if (!primaryPlayer) return;

  for (const player of stemPlayers) {
    player.audio.addEventListener("loadedmetadata", () => {
      const duration = transportDuration();
      loopEnd.value = Math.min(4, duration || 4);
      scrubber.max = String(duration || 16);
      updateTimeDisplay();
    });

    player.audio.addEventListener("ended", () => {
      const duration = transportDuration();
      if (Number.isFinite(duration) && duration > 0 && transportTime() >= duration) {
        pauseAll();
        setTransportTime(0);
      }
    });
  }
}

async function pollJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (!response.ok) throw new Error("Could not fetch job status.");
  const job = await response.json();
  updateProgress(job);

  if (job.status === "complete") {
    clearInterval(pollTimer);
    renderCompletedJob(job);
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload and process";
  }

  if (job.status === "failed") {
    clearInterval(pollTimer);
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload and process";
    jobStatus.textContent = "failed";
  }
}

async function createJob(file) {
  if (pipelineMode === "mock") {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Mock job creation failed." }));
      throw new Error(error.error);
    }

    return response.json();
  }

  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch("/api/jobs", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed." }));
    throw new Error(error.error);
  }

  return response.json();
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    pipelineMode = health.mode;
    serviceStatus.textContent = loadProcessedDemo
      ? `Backend ready: ${health.mode} · processed demo`
      : `Backend ready: ${health.mode}`;
  } catch {
    serviceStatus.textContent = "Backend unavailable";
  }
}

async function showProcessedDemo() {
  clearInterval(pollTimer);
  pauseAll();
  practiceView.hidden = true;
  uploadButton.disabled = true;
  uploadButton.textContent = "Demo loaded";
  fileLabel.textContent = "Processed demo";
  updateProgress({ status: "loading processed demo", progress: 65 });

  const response = await fetch("/api/demo/processed-job");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Could not load processed demo." }));
    throw new Error(error.error);
  }

  const job = await response.json();
  updateProgress(job);
  renderCompletedJob(job);
  uploadButton.disabled = false;
  uploadButton.textContent = "Upload and process";
}

mediaInput.addEventListener("change", () => {
  const file = mediaInput.files?.[0];
  fileLabel.textContent = file ? file.name : "Select screen recording";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = mediaInput.files?.[0];
  if (!file) return;

  clearInterval(pollTimer);
  pauseAll();
  practiceView.hidden = true;
  uploadButton.disabled = true;
  uploadButton.textContent = "Uploading";
  updateProgress({ status: pipelineMode === "mock" ? "simulating upload" : "uploading", progress: 3 });

  try {
    const job = await createJob(file);
    updateProgress(job);
    uploadButton.textContent = "Processing";
    pollTimer = setInterval(() => pollJob(job.id).catch(console.error), 500);
    await pollJob(job.id);
  } catch (error) {
    jobStatus.textContent = error.message;
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload and process";
  }
});

playButton.addEventListener("click", () => {
  if (isPlaying) {
    pauseAll();
  } else {
    playAll().catch(console.error);
  }
});

scrubber.addEventListener("input", () => {
  isSeeking = true;
  timeReadout.textContent = `${formatTime(Number(scrubber.value))} / ${formatTime(transportDuration())}`;
});

scrubber.addEventListener("change", () => {
  setTransportTime(Number(scrubber.value));
  isSeeking = false;
});

stemMixer.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-stem-id][data-stem-action]");
  if (!button) return;

  const player = stemPlayers.find((candidate) => candidate.id === button.dataset.stemId);
  if (!player) return;

  if (button.dataset.stemAction === "solo") {
    setStemSolo(player.id, !player.solo);
  } else {
    setStemMuted(player.id, !player.muted);
  }
});

speedControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-speed]");
  if (!button) return;

  const current = transportTime();
  playbackRate = Number(button.dataset.speed);
  anchorTransport(current);
  for (const player of stemPlayers) {
    player.audio.playbackRate = playbackRate;
  }

  for (const speedButton of speedControls.querySelectorAll("button")) {
    speedButton.classList.toggle("active", speedButton === button);
  }
});

async function boot() {
  await checkHealth();
  if (!loadProcessedDemo) return;

  try {
    await showProcessedDemo();
  } catch (error) {
    jobStatus.textContent = error.message;
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload and process";
  }
}

boot();
