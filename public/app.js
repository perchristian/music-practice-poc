const serviceStatus = document.querySelector("#serviceStatus");
const uploadForm = document.querySelector("#uploadForm");
const mediaInput = document.querySelector("#mediaInput");
const fileLabel = document.querySelector("#fileLabel");
const uploadButton = document.querySelector("#uploadButton");
const homeView = document.querySelector("#homeView");
const allSongsView = document.querySelector("#allSongsView");
const practiceView = document.querySelector("#practiceView");
const queuePanel = document.querySelector("#queuePanel");
const queueList = document.querySelector("#queueList");
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
const recentList = document.querySelector("#recentList");
const recentEmpty = document.querySelector("#recentEmpty");
const libraryList = document.querySelector("#libraryList");
const libraryEmpty = document.querySelector("#libraryEmpty");
const libraryFilters = document.querySelector("#libraryFilters");
const learningStatusSelect = document.querySelector("#learningStatus");
const allSongsButton = document.querySelector("#allSongsButton");
const homeButton = document.querySelector("#homeButton");
const backToHomeButton = document.querySelector("#backToHomeButton");
const urlParams = new URLSearchParams(window.location.search);

let currentMetadata = null;
const queueJobs = new Map();
let libraryEntries = [];
let activeLibraryFilter = "all";
let pipelineMode = "mock";
let stemPlayers = [];
let primaryPlayer = null;
let isPlaying = false;
let isSeeking = false;
let playbackRate = 1;
let transportPosition = 0;
let transportStartedAt = 0;
let transportFrame = null;
let currentJob = null;
let currentJobId = null;
let persistTimer = null;
let currentPreviewAudio = null;
let practiceReturnView = "home";
const loadProcessedDemo =
  urlParams.get("demo") === "processed" ||
  urlParams.get("skipUpload") === "1";

const statusLabels = {
  not_started: "Not started",
  practicing: "Practicing",
  learned: "Learned"
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${wholeSeconds}`;
}

function showView(viewName) {
  homeView.hidden = viewName !== "home";
  allSongsView.hidden = viewName !== "allSongs";
  practiceView.hidden = viewName !== "practice";

  if (viewName !== "practice") {
    pauseAll();
  }
}

function setPracticeReturnView(viewName) {
  practiceReturnView = viewName === "allSongs" ? "allSongs" : "home";
  backToHomeButton.textContent = practiceReturnView === "allSongs" ? "Back to songs" : "Back to home";
}

function statusLabel(status) {
  return statusLabels[status] || "Not started";
}

function sortByDateField(fieldName) {
  return (left, right) => new Date(right[fieldName] || 0) - new Date(left[fieldName] || 0);
}

function setActiveSpeedButton() {
  for (const speedButton of speedControls.querySelectorAll("button")) {
    const active = Number(speedButton.dataset.speed) === playbackRate;
    speedButton.classList.toggle("active", active);
  }
}

function queuePracticeStatePersist(refreshLibrary = false) {
  if (!currentJobId) return;

  if (persistTimer) {
    window.clearTimeout(persistTimer);
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    void persistPracticeState(refreshLibrary);
  }, 200);
}

async function persistPracticeState(refreshLibrary = false) {
  if (!currentJobId) return;

  const payload = {
    learningStatus: learningStatusSelect?.value || "not_started",
    playbackRate,
    loopStart: Number(loopStart.value),
    loopEnd: Number(loopEnd.value),
    loopEnabled: loopEnabled.checked,
    lastPosition: transportTime(),
    stemStates: Object.fromEntries(
      stemPlayers.map((player) => [
        player.id,
        {
          muted: player.muted,
          solo: player.solo,
          volume: player.volume
        }
      ])
    )
  };

  try {
    const response = await fetch(`/api/jobs/${currentJobId}/practice-state`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      currentJob = await response.json();
      if (refreshLibrary) {
        await loadLibrary();
      }
    }
  } catch (error) {
    console.error(error);
  }
}

function applySavedPracticeState(job) {
  const state = job?.practiceState || {};
  playbackRate = Number(state.playbackRate) || 1;
  loopStart.value = String(Number(state.loopStart) || 0);
  loopEnd.value = String(Number(state.loopEnd) || 4);
  loopEnabled.checked = Boolean(state.loopEnabled);
  if (learningStatusSelect) {
    learningStatusSelect.value = state.learningStatus || "not_started";
  }
  setActiveSpeedButton();

  if (!stemPlayers.length) return;

  for (const player of stemPlayers) {
    const stemState = state.stemStates?.[player.id] || {};
    player.muted = Boolean(stemState.muted);
    player.solo = Boolean(stemState.solo);
    player.volume = Number(stemState.volume ?? 1);
    player.audio.volume = player.volume;
    player.audio.playbackRate = playbackRate;
    if (player.volumeSlider) {
      player.volumeSlider.value = String(player.volume);
    }
  }

  updateStemAudibility();
  const restoredPosition = Number(state.lastPosition) || 0;
  anchorTransport(restoredPosition);
  syncStemTimes(restoredPosition);
  updateTimeDisplay();
  highlightCurrentChord();
}

function renderLibraryCard(entry, { compact = false, testPrefix = "library" } = {}) {
  const card = document.createElement("article");
  card.className = compact ? "library-card compact-card" : "library-card";
  card.dataset.testid = `${testPrefix}-card-${entry.id}`;

  const header = document.createElement("div");
  header.className = "library-card-header";

  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = entry.originalFilename;
  const meta = document.createElement("p");
  meta.className = "library-meta muted";
  meta.textContent = entry.lastOpenedAt
    ? `Opened ${new Date(entry.lastOpenedAt).toLocaleString()}`
    : `Updated ${new Date(entry.updatedAt).toLocaleString()}`;
  titleGroup.append(title, meta);

  const state = document.createElement("span");
  const learningStatus = entry.practiceState?.learningStatus || "not_started";
  state.className = `learning-chip ${learningStatus}`;
  state.textContent = statusLabel(learningStatus);
  state.dataset.testid = `${testPrefix}-status-${entry.id}`;
  header.append(titleGroup, state);

  const actions = document.createElement("div");
  actions.className = "library-actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.textContent = "Open";
  openButton.dataset.testid = `${testPrefix}-open-${entry.id}`;
  openButton.addEventListener("click", () => {
    const returnView = allSongsView.hidden ? "home" : "allSongs";
    void loadJob(entry.id, { markOpened: true, returnView });
  });
  actions.append(openButton);

  let previewAudio = null;

  if (!compact) {
    previewAudio = document.createElement("audio");
    previewAudio.controls = true;
    previewAudio.preload = "metadata";
    previewAudio.hidden = true;
    previewAudio.dataset.testid = `${testPrefix}-preview-audio-${entry.id}`;
    previewAudio.src = entry.result?.stems?.[0]?.audioUrl || entry.result?.audioUrl || "";

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.textContent = "Preview";
    previewButton.dataset.testid = `${testPrefix}-preview-${entry.id}`;
    previewButton.addEventListener("click", () => {
      if (currentPreviewAudio && currentPreviewAudio !== previewAudio) {
        currentPreviewAudio.pause();
        currentPreviewAudio.hidden = true;
      }
      const nextHidden = !previewAudio.hidden;
      previewAudio.hidden = nextHidden;
      previewButton.textContent = nextHidden ? "Preview" : "Hide preview";
      currentPreviewAudio = nextHidden ? null : previewAudio;
    });

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.textContent = "Rename";
    renameButton.dataset.testid = `${testPrefix}-rename-${entry.id}`;
    renameButton.addEventListener("click", async () => {
      const nextName = window.prompt("Rename processed song", entry.originalFilename);
      if (!nextName) return;
      const response = await fetch(`/api/jobs/${entry.id}/rename`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ originalFilename: nextName })
      });
      if (response.ok) {
        await loadLibrary();
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.testid = `${testPrefix}-delete-${entry.id}`;
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`Delete ${entry.originalFilename}?`)) return;
      const response = await fetch(`/api/jobs/${entry.id}`, { method: "DELETE" });
      if (response.ok) {
        await loadLibrary();
        if (currentJobId === entry.id) {
          currentJobId = null;
          currentJob = null;
          if (!practiceView.hidden) {
            showView("home");
          }
        }
      }
    });

    actions.append(previewButton, renameButton, deleteButton);
  }

  card.append(header, actions);
  if (previewAudio) {
    card.append(previewAudio);
  }
  return card;
}

function renderLibraryEntries(entries) {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio = null;
  }

  libraryEntries = entries;
  renderRecentEntries(entries);
  renderAllSongsEntries(entries);
}

function renderRecentEntries(entries) {
  const recentEntries = entries
    .filter((entry) => entry.lastOpenedAt)
    .sort(sortByDateField("lastOpenedAt"))
    .slice(0, 5);

  recentList.replaceChildren();
  recentEmpty.textContent = "Open a processed song to pin it here.";

  if (!recentEntries.length) {
    recentEmpty.hidden = false;
    return;
  }

  recentEmpty.hidden = true;
  recentList.replaceChildren(
    ...recentEntries.map((entry) => renderLibraryCard(entry, { compact: true, testPrefix: "recent" }))
  );
}

function renderAllSongsEntries(entries) {
  libraryList.replaceChildren();
  libraryEmpty.textContent = "No completed songs yet.";

  const filteredEntries = activeLibraryFilter === "all"
    ? entries
    : entries.filter((entry) => (entry.practiceState?.learningStatus || "not_started") === activeLibraryFilter);

  if (!filteredEntries.length) {
    libraryEmpty.hidden = false;
    libraryEmpty.textContent = entries.length
      ? "No songs match this filter."
      : "No completed songs yet.";
    return;
  }

  libraryEmpty.hidden = true;
  libraryList.replaceChildren(...filteredEntries.map((entry) => renderLibraryCard(entry)));
}

async function loadLibrary() {
  try {
    const response = await fetch("/api/library");
    if (response.status === 404) {
      throw new Error("Restart the backend to enable the processed song library.");
    }
    if (!response.ok) throw new Error("Could not load processed song library.");
    const entries = await response.json();
    renderLibraryEntries(entries);
  } catch (error) {
    console.error(error);
    libraryList.replaceChildren();
    recentList.replaceChildren();
    libraryEmpty.hidden = false;
    recentEmpty.hidden = false;
    libraryEmpty.textContent = error.message || "Could not load the processed song library.";
    recentEmpty.textContent = error.message || "Could not load the processed song library.";
  }
}

async function loadJob(jobId, { markOpened = false, returnView = "home" } = {}) {
  if (currentPreviewAudio) {
    currentPreviewAudio.pause();
    currentPreviewAudio = null;
  }
  setPracticeReturnView(returnView);
  const response = await fetch(markOpened ? `/api/jobs/${jobId}/opened` : `/api/jobs/${jobId}`, {
    method: markOpened ? "POST" : "GET"
  });
  if (!response.ok) throw new Error("Could not load processed song.");
  const job = await response.json();
  currentJob = job;
  currentJobId = job.id;
  renderCompletedJob(job);
  await loadLibrary();
}

function renderCompletedJob(job) {
  currentJob = job;
  currentJobId = job.id;
  const stems = job.result.stems?.length
    ? job.result.stems
    : [{ id: "piano", name: "Piano", audioUrl: job.result.audioUrl }];
  renderStemPlayers(stems);
  renderMetadata(job.result.metadata);
  applySavedPracticeState(job);
  showView("practice");
  if (learningStatusSelect) {
    learningStatusSelect.value = job.practiceState?.learningStatus || "not_started";
  }
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
  queuePracticeStatePersist();
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

function pauseAll({ persist = true } = {}) {
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
  if (persist) {
    queuePracticeStatePersist();
  }
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
  queuePracticeStatePersist();
}

function setStemSolo(stemId, solo) {
  const player = stemPlayers.find((candidate) => candidate.id === stemId);
  if (!player) return;

  player.solo = solo;
  if (solo) {
    player.muted = false;
  }
  updateStemAudibility();
  queuePracticeStatePersist();
}

function renderStemPlayers(stems) {
  pauseAll({ persist: false });
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

    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.05";
    volumeSlider.value = "1";
    volumeSlider.setAttribute("aria-label", `${stem.name} volume`);
    volumeSlider.dataset.testid = `stem-volume-${stem.id}`;
    volumeSlider.addEventListener("input", () => {
      player.volume = Number(volumeSlider.value);
      player.audio.volume = player.volume;
      queuePracticeStatePersist();
    });

    const muteButton = document.createElement("button");
    muteButton.type = "button";
    muteButton.className = "stem-toggle";
    muteButton.dataset.stemId = stem.id;
    muteButton.dataset.stemAction = "mute";
    muteButton.dataset.testid = `stem-mute-${stem.id}`;
    controls.append(volumeSlider, muteButton);

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
      volumeSlider,
      muted: Boolean(stem.defaultMuted),
      solo: false,
      volume: 1
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

function updateQueuePanelVisibility() {
  queuePanel.hidden = queueJobs.size === 0;
}

function renderQueueJob(queueJob) {
  const row = document.createElement("article");
  row.className = "queue-card";
  row.dataset.testid = `queue-card-${queueJob.localId}`;

  const copy = document.createElement("div");
  copy.className = "queue-copy";

  const title = document.createElement("h3");
  title.textContent = queueJob.filename;

  const status = document.createElement("p");
  status.className = "muted";
  status.dataset.testid = `queue-status-${queueJob.localId}`;
  status.textContent = queueJob.status;
  copy.append(title, status);

  const percent = document.createElement("span");
  percent.className = "queue-percent";
  percent.dataset.testid = `queue-percent-${queueJob.localId}`;
  percent.textContent = `${queueJob.progress}%`;

  const progressTrack = document.createElement("div");
  progressTrack.className = "progress-track";
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  progressBar.style.width = `${queueJob.progress}%`;
  progressBar.dataset.testid = `queue-progress-${queueJob.localId}`;
  progressTrack.append(progressBar);

  row.append(copy, percent, progressTrack);
  queueJob.row = row;
  queueJob.statusElement = status;
  queueJob.percentElement = percent;
  queueJob.progressElement = progressBar;
  queueList.prepend(row);
  updateQueuePanelVisibility();
}

function updateQueueJob(queueJob, job) {
  queueJob.status = job.status;
  queueJob.progress = job.progress;
  if (queueJob.statusElement) {
    queueJob.statusElement.textContent = job.status;
  }
  if (queueJob.percentElement) {
    queueJob.percentElement.textContent = `${job.progress}%`;
  }
  if (queueJob.progressElement) {
    queueJob.progressElement.style.width = `${job.progress}%`;
  }
}

function removeQueueJob(localId) {
  const queueJob = queueJobs.get(localId);
  if (!queueJob) return;
  window.clearInterval(queueJob.timer);
  queueJob.row?.remove();
  queueJobs.delete(localId);
  updateQueuePanelVisibility();
}

async function pollQueueJob(localId) {
  const queueJob = queueJobs.get(localId);
  if (!queueJob?.jobId) return;

  const response = await fetch(`/api/jobs/${queueJob.jobId}`);
  if (!response.ok) throw new Error("Could not fetch job status.");
  const job = await response.json();
  updateQueueJob(queueJob, job);

  if (job.status === "complete") {
    removeQueueJob(localId);
    await loadLibrary();
  }

  if (job.status === "failed") {
    window.clearInterval(queueJob.timer);
    updateQueueJob(queueJob, job);
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
  pauseAll();
  setPracticeReturnView("home");
  uploadButton.disabled = true;
  uploadButton.textContent = "Demo loaded";
  fileLabel.textContent = "Processed demo";

  const response = await fetch("/api/demo/processed-job");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Could not load processed demo." }));
    throw new Error(error.error);
  }

  const job = await response.json();
  renderCompletedJob(job);
  await loadLibrary();
  uploadButton.disabled = false;
  uploadButton.textContent = "Add to processing queue";
}

mediaInput.addEventListener("change", () => {
  const files = [...(mediaInput.files || [])];
  if (files.length === 0) {
    fileLabel.textContent = "Select screen recordings";
  } else if (files.length === 1) {
    fileLabel.textContent = files[0].name;
  } else {
    fileLabel.textContent = `${files.length} recordings selected`;
  }
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = [...(mediaInput.files || [])];
  if (!files.length) return;

  uploadButton.disabled = true;
  uploadButton.textContent = "Adding";

  for (const file of files) {
    const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const queueJob = {
      localId,
      filename: file.name,
      status: pipelineMode === "mock" ? "simulating upload" : "uploading",
      progress: 3,
      timer: null,
      jobId: null
    };
    queueJobs.set(localId, queueJob);
    renderQueueJob(queueJob);

    try {
      const job = await createJob(file);
      queueJob.jobId = job.id;
      updateQueueJob(queueJob, job);
      queueJob.timer = window.setInterval(() => {
        pollQueueJob(localId).catch((error) => {
          console.error(error);
          const latestQueueJob = queueJobs.get(localId);
          if (!latestQueueJob) return;
          window.clearInterval(latestQueueJob.timer);
          updateQueueJob(latestQueueJob, { status: "failed", progress: latestQueueJob.progress });
        });
      }, 500);
      await pollQueueJob(localId);
    } catch (error) {
      updateQueueJob(queueJob, { status: error.message, progress: queueJob.progress });
    }
  }

  mediaInput.value = "";
  fileLabel.textContent = "Select screen recordings";
  uploadButton.disabled = false;
  uploadButton.textContent = "Add to processing queue";
  showView("home");
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

  setActiveSpeedButton();
  queuePracticeStatePersist();
});

[loopStart, loopEnd, loopEnabled].forEach((element) => {
  if (!element) return;
  element.addEventListener("change", () => queuePracticeStatePersist());
  element.addEventListener("input", () => queuePracticeStatePersist());
});

if (learningStatusSelect) {
  learningStatusSelect.addEventListener("change", () => queuePracticeStatePersist(true));
}

allSongsButton.addEventListener("click", () => {
  renderAllSongsEntries(libraryEntries);
  showView("allSongs");
});

homeButton.addEventListener("click", () => {
  showView("home");
});

backToHomeButton.addEventListener("click", async () => {
  await loadLibrary();
  showView(practiceReturnView);
});

libraryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;

  activeLibraryFilter = button.dataset.filter;
  for (const filterButton of libraryFilters.querySelectorAll("button[data-filter]")) {
    filterButton.classList.toggle("active", filterButton === button);
  }
  renderAllSongsEntries(libraryEntries);
});

async function boot() {
  await checkHealth();
  await loadLibrary();
  if (!loadProcessedDemo) return;

  try {
    await showProcessedDemo();
  } catch (error) {
    console.error(error);
    uploadButton.disabled = false;
    uploadButton.textContent = "Add to processing queue";
  }
}

boot();
