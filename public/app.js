const serviceStatus = document.querySelector("#serviceStatus");
const pipelineEyebrow = document.querySelector("#pipelineEyebrow");
const pipelineModeControls = document.querySelector("#pipelineModeControls");
const uploadForm = document.querySelector("#uploadForm");
const mediaInput = document.querySelector("#mediaInput");
const fileLabel = document.querySelector("#fileLabel");
const uploadButton = document.querySelector("#uploadButton");
const homeView = document.querySelector("#homeView");
const practiceView = document.querySelector("#practiceView");
const songList = document.querySelector("#songList");
const songListEmpty = document.querySelector("#songListEmpty");
const songSearch = document.querySelector("#songSearch");
const selectedSongHeader = document.querySelector("#selectedSongHeader");
const selectedSongEyebrow = document.querySelector("#selectedSongEyebrow");
const selectedSongTitle = document.querySelector("#selectedSongTitle");
const selectedSongMeta = document.querySelector("#selectedSongMeta");
const selectedSongActions = document.querySelector("#selectedSongActions");
const selectedRenameButton = document.querySelector("#selectedRenameButton");
const selectedDeleteButton = document.querySelector("#selectedDeleteButton");
const emptyDetail = document.querySelector("#emptyDetail");
const processingDetail = document.querySelector("#processingDetail");
const processingStatus = document.querySelector("#processingStatus");
const processingPercent = document.querySelector("#processingPercent");
const processingProgress = document.querySelector("#processingProgress");
const readyDetail = document.querySelector("#readyDetail");
const failedDetail = document.querySelector("#failedDetail");
const failedMessage = document.querySelector("#failedMessage");
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
const libraryFilters = document.querySelector("#libraryFilters");
const learningStatusSelect = document.querySelector("#learningStatus");
const backToHomeButton = document.querySelector("#backToHomeButton");
const urlParams = new URLSearchParams(window.location.search);

let currentMetadata = null;
const queueJobs = new Map();
let libraryEntries = [];
let activeLibraryFilter = "all";
let pipelineMode = "mock";
let pipelineModeRequestId = 0;
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
let selectedQueueLocalId = null;
let selectedReadyJobId = null;
let isUploading = false;
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

function statusLabel(status) {
  return statusLabels[status] || "Not started";
}

function modeLabel(mode) {
  return mode === "real" ? "Real" : "Mock";
}

function renderPipelineMode(mode) {
  pipelineMode = mode === "real" ? "real" : "mock";
  if (pipelineEyebrow) {
    pipelineEyebrow.textContent = `${modeLabel(pipelineMode)} pipeline`;
  }
  for (const button of pipelineModeControls?.querySelectorAll("button[data-mode]") || []) {
    button.classList.toggle("active", button.dataset.mode === pipelineMode);
    button.setAttribute("aria-pressed", String(button.dataset.mode === pipelineMode));
  }
}

function formatActivityTime(value) {
  if (!value) return "Now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Now";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "Now";

  const sameDay = date.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
  if (sameDay) return `Today ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  const dayMonth = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(date);
  if (date.getFullYear() === now.getFullYear()) return dayMonth;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function jobDurationLabel(job) {
  const chords = job?.result?.metadata?.chords || [];
  const duration = Math.max(0, ...chords.map((chord) => Number(chord.end) || 0));
  return duration > 0 ? formatTime(duration) : "--";
}

function queueStatusLabel(queueJob) {
  if (queueJob.status === "queued") return "Queued";
  if (queueJob.status === "processing") return "Processing stems";
  if (queueJob.status === "complete") return "Ready";
  if (queueJob.status === "failed") return "Failed";
  return queueJob.status || "Processing";
}

function completedStatusLabel(entry) {
  const learningStatus = entry.practiceState?.learningStatus || "not_started";
  return learningStatus === "not_started" ? "Ready" : statusLabel(learningStatus);
}

function showDetailPane(paneName) {
  emptyDetail.hidden = paneName !== "empty";
  processingDetail.hidden = paneName !== "processing";
  readyDetail.hidden = paneName !== "ready";
  failedDetail.hidden = paneName !== "failed";
  practiceView.hidden = paneName !== "practice";

  if (paneName !== "practice") {
    pauseAll();
  }
}

function showSelectedHeader({ eyebrow, title, meta, actions = false }) {
  selectedSongHeader.hidden = false;
  selectedSongEyebrow.textContent = eyebrow;
  selectedSongTitle.textContent = title;
  selectedSongMeta.textContent = meta;
  selectedSongActions.hidden = !actions;
}

function clearSelection() {
  selectedQueueLocalId = null;
  selectedReadyJobId = null;
  currentJobId = null;
  currentJob = null;
  selectedSongHeader.hidden = true;
  homeView.classList.remove("detail-open");
  showDetailPane("empty");
  renderSongList();
}

function openMobileDetail() {
  homeView.classList.add("detail-open");
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

function songSearchValue() {
  return (songSearch?.value || "").trim().toLowerCase();
}

function queueRowItem(queueJob) {
  const active = !["complete", "failed"].includes(queueJob.status);
  return {
    type: active ? "active" : "failed",
    key: queueJob.localId,
    id: queueJob.jobId || queueJob.localId,
    title: queueJob.filename,
    activityAt: queueJob.updatedAt || queueJob.createdAt,
    status: queueStatusLabel(queueJob),
    duration: "--",
    progress: queueJob.progress,
    queueJob
  };
}

function completedRowItem(entry) {
  return {
    type: "complete",
    key: entry.id,
    id: entry.id,
    title: entry.originalFilename,
    activityAt: entry.createdAt,
    status: completedStatusLabel(entry),
    duration: jobDurationLabel(entry),
    entry
  };
}

function orderedSongItems() {
  const query = songSearchValue();
  const queueItems = [...queueJobs.values()].map(queueRowItem);
  const completedItems = libraryEntries
    .filter((entry) => activeLibraryFilter === "all" || (entry.practiceState?.learningStatus || "not_started") === activeLibraryFilter)
    .map(completedRowItem);

  return [...queueItems, ...completedItems]
    .filter((item) => !query || item.title.toLowerCase().includes(query))
    .sort((left, right) => {
      const rank = { active: 0, complete: 1, failed: 2 };
      const rankDiff = rank[left.type] - rank[right.type];
      if (rankDiff !== 0) return rankDiff;

      return new Date(right.activityAt || 0) - new Date(left.activityAt || 0);
    });
}

function renderSongRow(item) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = `song-row ${item.type}`;
  row.dataset.testid = `song-row-${item.id}`;
  row.classList.toggle("selected", item.id === currentJobId || item.key === selectedQueueLocalId || item.id === selectedReadyJobId);

  const art = document.createElement("span");
  art.className = "song-art";
  art.textContent = item.title.slice(0, 1).toUpperCase();

  const copy = document.createElement("span");
  copy.className = "song-row-copy";
  const title = document.createElement("span");
  title.className = "song-row-title";
  title.textContent = item.title;
  const meta = document.createElement("span");
  meta.className = "song-row-meta";
  meta.textContent = `${formatActivityTime(item.activityAt)} - ${item.status}`;
  copy.append(title, meta);

  const side = document.createElement("span");
  side.className = "song-row-side";
  side.textContent = item.type === "active" ? `${item.progress}%` : item.duration;

  row.append(art, copy, side);
  row.addEventListener("click", () => {
    if (item.type === "complete") {
      void loadJob(item.id);
      return;
    }
    selectQueueJob(item.queueJob);
  });

  return row;
}

function renderSongList() {
  const items = orderedSongItems();
  songList.replaceChildren(...items.map(renderSongRow));
  songListEmpty.hidden = items.length > 0;
  if (!items.length) {
    songListEmpty.textContent = songSearchValue() ? "No songs match this search." : "Add a screen recording to start.";
  }
}

function renderLibraryEntries(entries) {
  libraryEntries = entries;
  renderSongList();
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
    libraryEntries = [];
    songList.replaceChildren();
    songListEmpty.hidden = false;
    songListEmpty.textContent = error.message || "Could not load the processed song library.";
  }
}

async function loadJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (!response.ok) throw new Error("Could not load processed song.");
  const job = await response.json();
  currentJob = job;
  currentJobId = job.id;
  selectedQueueLocalId = null;
  selectedReadyJobId = null;
  renderCompletedJob(job);
  await loadLibrary();
}

function renderCompletedJob(job) {
  currentJob = job;
  currentJobId = job.id;
  selectedQueueLocalId = null;
  selectedReadyJobId = null;
  const stems = job.result.stems?.length
    ? job.result.stems
    : [{ id: "piano", name: "Piano", audioUrl: job.result.audioUrl }];
  showSelectedHeader({
    eyebrow: "Ready",
    title: job.originalFilename,
    meta: `${formatActivityTime(job.createdAt)} - ${jobDurationLabel(job)} - Key: ${job.result.metadata.key.tonic} ${job.result.metadata.key.mode}`,
    actions: true
  });
  renderStemPlayers(stems);
  renderMetadata(job.result.metadata);
  applySavedPracticeState(job);
  showDetailPane("practice");
  openMobileDetail();
  if (learningStatusSelect) {
    learningStatusSelect.value = job.practiceState?.learningStatus || "not_started";
  }
  renderSongList();
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

function seekAudioTo(audio, seconds) {
  return new Promise((resolve) => {
    if (Math.abs(audio.currentTime - seconds) <= 0.25) {
      resolve();
      return;
    }

    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("seeked", finish);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      resolve();
    };

    audio.addEventListener("seeked", finish);
    timeoutId = window.setTimeout(finish, 750);

    try {
      audio.currentTime = seconds;
    } catch (error) {
      console.error(error);
      finish();
      return;
    }
  });
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
    player.audio.playbackRate = playbackRate;
  }

  await Promise.all(stemPlayers.map((player) => seekAudioTo(player.audio, current)));

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
    player.muteButton.textContent = "M";
    player.muteButton.setAttribute("aria-label", `${player.muted ? "Unmute" : "Mute"} ${player.name}`);
    player.muteButton.setAttribute("aria-pressed", String(player.muted));
    player.soloButton.textContent = "S";
    player.soloButton.setAttribute("aria-label", `${player.solo ? "Unsolo" : "Solo"} ${player.name}`);
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
    muteButton.title = `Mute ${stem.name}`;
    controls.append(volumeSlider, muteButton);

    const soloButton = document.createElement("button");
    soloButton.type = "button";
    soloButton.className = "stem-toggle stem-solo";
    soloButton.dataset.stemId = stem.id;
    soloButton.dataset.stemAction = "solo";
    soloButton.dataset.testid = `stem-solo-${stem.id}`;
    soloButton.title = `Solo ${stem.name}`;
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

function updateQueueJob(queueJob, job) {
  queueJob.status = job.status;
  queueJob.progress = job.progress;
  queueJob.updatedAt = new Date().toISOString();
  renderSongList();
  if (selectedQueueLocalId === queueJob.localId) {
    renderProcessingJob(queueJob);
  }
}

function removeQueueJob(localId) {
  const queueJob = queueJobs.get(localId);
  if (!queueJob) return;
  window.clearInterval(queueJob.timer);
  queueJobs.delete(localId);
  renderSongList();
}

function selectQueueJob(queueJob) {
  selectedQueueLocalId = queueJob.localId;
  selectedReadyJobId = null;
  currentJobId = null;
  currentJob = null;
  openMobileDetail();
  renderProcessingJob(queueJob);
  renderSongList();
}

function renderProcessingJob(queueJob) {
  showSelectedHeader({
    eyebrow: queueJob.status === "failed" ? "Failed" : "Processing",
    title: queueJob.filename,
    meta: `${formatActivityTime(queueJob.updatedAt || queueJob.createdAt)} - ${queueStatusLabel(queueJob)}`,
    actions: false
  });

  if (queueJob.status === "failed") {
    failedMessage.textContent = queueJob.error || "The job could not be processed.";
    showDetailPane("failed");
    return;
  }

  processingStatus.textContent = queueStatusLabel(queueJob);
  processingPercent.textContent = `${queueJob.progress}%`;
  processingProgress.style.width = `${queueJob.progress}%`;
  showDetailPane("processing");
}

function renderReadyJob(job) {
  selectedQueueLocalId = null;
  selectedReadyJobId = job.id;
  showSelectedHeader({
    eyebrow: "Ready",
    title: job.originalFilename,
    meta: `${formatActivityTime(job.createdAt)} - ${jobDurationLabel(job)} - Key: ${job.result.metadata.key.tonic} ${job.result.metadata.key.mode}`,
    actions: true
  });
  showDetailPane("ready");
  openMobileDetail();
  renderSongList();
}

async function pollQueueJob(localId) {
  const queueJob = queueJobs.get(localId);
  if (!queueJob?.jobId) return;

  const response = await fetch(`/api/jobs/${queueJob.jobId}`);
  if (!response.ok) throw new Error("Could not fetch job status.");
  const job = await response.json();

  if (job.status === "complete") {
    const wasSelected = selectedQueueLocalId === localId;
    removeQueueJob(localId);
    await loadLibrary();
    if (wasSelected) {
      renderReadyJob(job);
    }
    return;
  }

  if (job.status === "failed") {
    window.clearInterval(queueJob.timer);
    queueJob.error = job.error || "Processing failed.";
    updateQueueJob(queueJob, job);
    return;
  }

  updateQueueJob(queueJob, job);
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
  const requestId = pipelineModeRequestId;
  try {
    const response = await fetch("/api/health");
    const health = await response.json();
    if (requestId !== pipelineModeRequestId) return;
    renderPipelineMode(health.mode);
    serviceStatus.textContent = loadProcessedDemo
      ? `Backend ready: ${health.mode} · processed demo`
      : `Backend ready: ${health.mode}`;
  } catch {
    if (requestId !== pipelineModeRequestId) return;
    serviceStatus.textContent = "Backend unavailable";
  }
}

async function setPipelineMode(mode) {
  const requestId = ++pipelineModeRequestId;
  renderPipelineMode(mode);
  serviceStatus.textContent = `Switching to ${mode}`;
  try {
    const response = await fetch("/api/settings/pipeline-mode", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Could not switch pipeline mode." }));
      throw new Error(error.error);
    }
    const settings = await response.json();
    if (requestId !== pipelineModeRequestId) return;
    renderPipelineMode(settings.mode);
    serviceStatus.textContent = `Backend ready: ${settings.mode}`;
  } catch (error) {
    if (requestId !== pipelineModeRequestId) return;
    console.error(error);
    serviceStatus.textContent = error.message || "Could not switch pipeline mode";
    await checkHealth();
  }
}

async function showProcessedDemo() {
  pauseAll();
  uploadButton.disabled = true;
  fileLabel.textContent = "Loading";

  const response = await fetch("/api/demo/processed-job");
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Could not load processed demo." }));
    throw new Error(error.error);
  }

  const job = await response.json();
  renderCompletedJob(job);
  await loadLibrary();
  uploadButton.disabled = false;
  fileLabel.textContent = "Upload";
}

async function uploadFiles(files) {
  if (!files.length || isUploading) return;

  isUploading = true;
  uploadButton.disabled = true;
  fileLabel.textContent = "Uploading";

  try {
    for (const file of files) {
      const localId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const queueJob = {
        localId,
        filename: file.name,
        status: pipelineMode === "mock" ? "simulating upload" : "uploading",
        progress: 3,
        timer: null,
        jobId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: null
      };
      queueJobs.set(localId, queueJob);
      renderSongList();

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
        queueJob.error = error.message;
        updateQueueJob(queueJob, { status: "failed", progress: queueJob.progress });
      }
    }
  } finally {
    mediaInput.value = "";
    fileLabel.textContent = "Upload";
    uploadButton.disabled = false;
    isUploading = false;
    homeView.classList.remove("detail-open");
  }
}

mediaInput.addEventListener("change", () => {
  const files = [...(mediaInput.files || [])];
  void uploadFiles(files);
});

uploadButton.addEventListener("click", () => {
  if (isUploading) return;
  mediaInput.click();
});

uploadForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

pipelineModeControls?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mode]");
  if (!button || button.dataset.mode === pipelineMode) return;
  void setPipelineMode(button.dataset.mode);
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

backToHomeButton.addEventListener("click", async () => {
  await loadLibrary();
  homeView.classList.remove("detail-open");
});

libraryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-filter]");
  if (!button) return;

  activeLibraryFilter = button.dataset.filter;
  for (const filterButton of libraryFilters.querySelectorAll("button[data-filter]")) {
    filterButton.classList.toggle("active", filterButton === button);
  }
  renderSongList();
});

songSearch.addEventListener("input", () => {
  renderSongList();
});

selectedRenameButton.addEventListener("click", async () => {
  const jobId = currentJobId || selectedReadyJobId;
  const entry = libraryEntries.find((candidate) => candidate.id === jobId) || currentJob;
  if (!jobId || !entry) return;

  const nextName = window.prompt("Rename processed song", entry.originalFilename);
  if (!nextName) return;
  const response = await fetch(`/api/jobs/${jobId}/rename`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ originalFilename: nextName })
  });
  if (!response.ok) return;

  const renamed = await response.json();
  if (currentJobId === jobId) {
    currentJob = renamed;
    selectedSongTitle.textContent = renamed.originalFilename;
  }
  if (selectedReadyJobId === jobId) {
    selectedSongTitle.textContent = renamed.originalFilename;
  }
  await loadLibrary();
});

selectedDeleteButton.addEventListener("click", async () => {
  const jobId = currentJobId || selectedReadyJobId;
  const entry = libraryEntries.find((candidate) => candidate.id === jobId) || currentJob;
  if (!jobId || !entry) return;
  if (!window.confirm(`Delete ${entry.originalFilename}?`)) return;

  const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
  if (!response.ok) return;

  await loadLibrary();
  clearSelection();
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
    uploadButton.textContent = "Upload";
  }
}

boot();
