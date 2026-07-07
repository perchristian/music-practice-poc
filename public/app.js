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
const selectedSongArt = document.querySelector("#selectedSongArt");
const selectedSongEyebrow = document.querySelector("#selectedSongEyebrow");
const selectedSongTitle = document.querySelector("#selectedSongTitle");
const selectedSongMeta = document.querySelector("#selectedSongMeta");
const selectedSongActions = document.querySelector("#selectedSongActions");
const selectedMoreButton = document.querySelector("#selectedMoreButton");
const selectedMoreMenu = document.querySelector("#selectedMoreMenu");
const selectedRenameButton = document.querySelector("#selectedRenameButton");
const selectedDeleteButton = document.querySelector("#selectedDeleteButton");
const selectedStatusControl = document.querySelector(".selected-status-control");
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
const backToStartButton = document.querySelector("#backToStartButton");
const scrubber = document.querySelector("#scrubber");
const gridTimeline = document.querySelector("#gridTimeline");
const speedControls = document.querySelector("#speedControls");
const loopStart = document.querySelector("#loopStart");
const loopEnd = document.querySelector("#loopEnd");
const loopEnabled = document.querySelector("#loopEnabled");
const loopSettings = document.querySelector("#loopSettings");
const countInBars = document.querySelector("#countInBars");
const timeReadout = document.querySelector("#timeReadout");
const keySelect = document.querySelector("#keySelect");
const tempoControl = document.querySelector("#tempoControl");
const tempoHalf = document.querySelector("#tempoHalf");
const tempoDisplay = document.querySelector("#tempoDisplay");
const tempoInput = document.querySelector("#tempoInput");
const tempoDouble = document.querySelector("#tempoDouble");
const gridCorrection = document.querySelector("#gridCorrection");
const barStartInput = document.querySelector("#barStartInput");
const meterSelect = document.querySelector("#meterSelect");
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
let knownTransportDuration = 0;
let transportFrame = null;
let audioContext = null;
let scheduledMetronomeBeats = new Set();
let scheduledMetronomeNodes = [];
let currentJob = null;
let currentJobId = null;
let currentAnalyzedMetadata = null;
let gridOverrides = {};
let keyOverride = null;
let metronomeEnabled = false;
let metronomeSolo = false;
let metronomeVolume = 0.45;
let persistTimer = null;
let selectedQueueLocalId = null;
let selectedReadyJobId = null;
let isUploading = false;
const loadProcessedDemo =
  urlParams.get("demo") === "processed";

const statusLabels = {
  not_started: "Not started",
  practicing: "Practicing",
  learned: "Learned"
};

const pipelineStageLabels = {
  "source-audio-extraction": "Extracting audio",
  "piano-focused-separation": "Separating stems",
  "audio-analysis": "Analyzing harmony",
  "piano-focused-separated": "Preparing result"
};

const notePitchClasses = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};
const pitchClassNames = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const keyTonics = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const keyModes = ["major", "minor"];
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const minorScale = [0, 2, 3, 5, 7, 8, 10];
const romanDegrees = ["I", "II", "III", "IV", "V", "VI", "VII"];
const defaultTimeSignature = { beatsPerBar: 4, beatUnit: 4 };

function populateKeySelect() {
  if (!keySelect) return;
  const options = [];
  for (const tonic of keyTonics) {
    for (const mode of keyModes) {
      const option = document.createElement("option");
      option.value = `${tonic}:${mode}`;
      option.textContent = `${tonic} ${mode}`;
      options.push(option);
    }
  }
  keySelect.replaceChildren(...options);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${wholeSeconds}`;
}

function formatCueTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const bounded = Math.max(0, seconds);
  const minutes = Math.floor(bounded / 60);
  const remainingSeconds = bounded - minutes * 60;
  const roundedSeconds = Math.round(remainingSeconds);
  if (Math.abs(remainingSeconds - roundedSeconds) < 0.05) {
    return `${minutes}:${String(roundedSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
}

function formatDuration(seconds) {
  return Number.isFinite(seconds) && seconds > 0 ? formatTime(seconds) : "--";
}

function tempoLabel(metadata) {
  const bpm = Number(metadata?.beatGrid?.bpm);
  if (!Number.isFinite(bpm) || bpm <= 0) return "";
  const rounded = Math.round(bpm * 10) / 10;
  return `${Number.isInteger(rounded) ? Math.round(rounded) : rounded} BPM`;
}

function keyLabel(metadata) {
  return `${metadata.key.tonic} ${metadata.key.mode}`;
}

function normalizedKeyOverride(state = null) {
  const source = state?.keyOverride || {};
  const tonic = typeof source.tonic === "string" ? source.tonic : "";
  const mode = typeof source.mode === "string" ? source.mode : "";
  if (!Object.prototype.hasOwnProperty.call(notePitchClasses, tonic)) return null;
  if (!keyModes.includes(mode)) return null;
  return { tonic, mode };
}

function keyValue(key) {
  return key ? `${key.tonic}:${key.mode}` : "";
}

function parseKeyValue(value) {
  const [tonic, mode] = String(value || "").split(":");
  if (!Object.prototype.hasOwnProperty.call(notePitchClasses, tonic) || !keyModes.includes(mode)) {
    return null;
  }
  return { tonic, mode };
}

function keyTempoLabel(metadata) {
  const key = keyLabel(metadata);
  const tempo = tempoLabel(metadata);
  return tempo ? `${key} · ${tempo}` : key;
}

function roundedBpm(value) {
  const bpm = Number(value);
  if (!Number.isFinite(bpm) || bpm <= 0) return null;
  return Math.round(Math.max(30, Math.min(260, bpm)) * 10) / 10;
}

function roundedSeconds(value, min, max) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  return Math.round(Math.max(min, Math.min(max, seconds)) * 100) / 100;
}

function hasGridOverride(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function parseTimeSignature(value) {
  const match = String(value || "").match(/^(\d+)\/(\d+)$/);
  if (!match) return null;
  const beatsPerBar = Number(match[1]);
  const beatUnit = Number(match[2]);
  const supported = [
    [4, 4],
    [3, 4],
    [5, 4],
    [6, 8],
    [7, 8],
    [12, 8]
  ];
  if (!supported.some(([beats, unit]) => beats === beatsPerBar && unit === beatUnit)) return null;
  return { beatsPerBar, beatUnit };
}

function timeSignatureValue(signature) {
  return `${signature?.beatsPerBar || defaultTimeSignature.beatsPerBar}/${signature?.beatUnit || defaultTimeSignature.beatUnit}`;
}

function normalizedGridOverrides(state = null) {
  const source = state?.gridOverrides || {};
  const overrides = {};
  const bpm = roundedBpm(source.bpm);
  if (bpm) {
    overrides.bpm = bpm;
  }

  const beatsPerBar = Number(source.beatsPerBar);
  const beatUnit = Number(source.beatUnit) || 4;
  if (parseTimeSignature(`${beatsPerBar}/${beatUnit}`)) {
    overrides.beatsPerBar = beatsPerBar;
    overrides.beatUnit = beatUnit;
  }

  const downbeatOffsetSeconds = roundedSeconds(source.downbeatOffsetSeconds, 0, 60 * 60);
  if (hasGridOverride(source, "downbeatOffsetSeconds") && downbeatOffsetSeconds !== null) {
    overrides.downbeatOffsetSeconds = downbeatOffsetSeconds;
  }

  return overrides;
}

function metadataGridDefaults(metadata) {
  const grid = metadata?.beatGrid || {};
  const bpm = roundedBpm(grid.bpm);
  const beatsPerBar = Number(grid.beatsPerBar || grid.meter?.beatsPerBar || grid.timeSignature?.beatsPerBar) || 4;
  const beatUnit = Number(grid.beatUnit || grid.meter?.beatUnit || grid.timeSignature?.beatUnit) || 4;
  const downbeatOffsetSeconds = roundedSeconds(grid.downbeatOffsetSeconds ?? grid.beatOffsetSeconds ?? 0, 0, 60 * 60) ?? 0;
  const timeSignature = parseTimeSignature(`${beatsPerBar}/${beatUnit}`) || defaultTimeSignature;
  return {
    bpm,
    beatDurationSeconds: Number(grid.beatDurationSeconds) || (bpm ? 60 / bpm : null),
    beatsPerBar: timeSignature.beatsPerBar,
    beatUnit: timeSignature.beatUnit,
    downbeatOffsetSeconds
  };
}

function effectiveMetadata(metadata) {
  if (!metadata) return metadata;

  const defaults = metadataGridDefaults(metadata);
  const bpm = roundedBpm(gridOverrides.bpm) || defaults.bpm;
  const beatDurationSeconds = bpm ? 60 / bpm : defaults.beatDurationSeconds;
  const beatsPerBar = gridOverrides.beatsPerBar || defaults.beatsPerBar;
  const beatUnit = gridOverrides.beatUnit || defaults.beatUnit;
  const baseDownbeat = hasGridOverride(gridOverrides, "downbeatOffsetSeconds")
    ? gridOverrides.downbeatOffsetSeconds
    : defaults.downbeatOffsetSeconds;
  const downbeatOffsetSeconds = roundedSeconds(baseDownbeat, 0, 60 * 60) ?? 0;

  const key = keyOverride || metadata.key;
  const chords = (metadata.chords || []).map((chord) => ({
    ...chord,
    roman: romanNumeralForChord(chord.name, key) || chord.roman
  }));

  if (!bpm && !beatDurationSeconds) {
    return {
      ...metadata,
      key,
      chords
    };
  }

  return {
    ...metadata,
    key,
    chords,
    beatGrid: {
      ...(metadata.beatGrid || {}),
      bpm,
      beatsPerBar,
      beatUnit,
      beatDurationSeconds,
      beatOffsetSeconds: downbeatOffsetSeconds,
      downbeatOffsetSeconds,
      meter: { beatsPerBar, beatUnit },
      timeSignature: { beatsPerBar, beatUnit },
      tempoOverride: Boolean(roundedBpm(gridOverrides.bpm)),
      gridOverride: Object.keys(gridOverrides).length > 0
    }
  };
}

function normalizedBeatGrid(metadata, durationFallback = null) {
  const grid = metadata?.beatGrid || {};
  const bpm = Number(grid.bpm);
  const beatDurationSeconds = Number(grid.beatDurationSeconds) || (bpm > 0 ? 60 / bpm : null);
  if (!Number.isFinite(beatDurationSeconds) || beatDurationSeconds <= 0) return null;

  const beatsPerBar = Number(grid.beatsPerBar || grid.meter?.beatsPerBar || grid.timeSignature?.beatsPerBar) || 4;
  const beatUnit = Number(grid.beatUnit || grid.meter?.beatUnit || grid.timeSignature?.beatUnit) || 4;
  const downbeatOffsetSeconds = Number(grid.downbeatOffsetSeconds ?? grid.beatOffsetSeconds ?? 0) || 0;
  const metadataDuration = Number(metadata?.durationSeconds ?? metadata?.duration);
  const chordDuration = Math.max(0, ...(metadata?.chords || []).map((chord) => Number(chord.end) || 0));
  const durationSeconds = [durationFallback, metadataDuration, chordDuration]
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  return {
    bpm,
    beatsPerBar,
    beatUnit,
    beatDurationSeconds,
    downbeatOffsetSeconds,
    durationSeconds
  };
}

function chordQualityFromName(chordName) {
  const cleaned = String(chordName || "").replace(/\/.*$/, "");
  const match = cleaned.match(/^[A-G](?:#|b)?(.*)$/);
  const suffix = match?.[1] || "";
  if (/dim/i.test(suffix)) return { label: "diminished", romanSuffix: "dim" };
  if (/^m(?!aj)/.test(suffix)) return { label: suffix.includes("7") ? "minor7" : "minor", romanSuffix: suffix.includes("7") ? "7" : "" };
  if (/maj7/i.test(suffix)) return { label: "major7", romanSuffix: "maj7" };
  if (/7/.test(suffix)) return { label: "dominant7", romanSuffix: "7" };
  if (/sus2/i.test(suffix)) return { label: "sus2", romanSuffix: "sus2" };
  if (/sus4/i.test(suffix)) return { label: "sus4", romanSuffix: "sus4" };
  return { label: "major", romanSuffix: "" };
}

function romanNumeralForChord(chordName, key) {
  const root = String(chordName || "").match(/^([A-G](?:#|b)?)/)?.[1];
  if (!root || !key) return "";
  const rootPitch = notePitchClasses[root];
  const tonicPitch = notePitchClasses[key.tonic];
  if (!Number.isFinite(rootPitch) || !Number.isFinite(tonicPitch)) return "";

  const scale = key.mode === "minor" ? minorScale : majorScale;
  const relative = (rootPitch - tonicPitch + 12) % 12;
  const degree = scale.indexOf(relative);
  const quality = chordQualityFromName(chordName);
  const base = degree === -1 ? pitchClassNames[rootPitch] : romanDegrees[degree];
  const minorish = quality.label === "minor" || quality.label === "minor7" || quality.label === "diminished";
  const numeral = degree === -1 ? base : minorish ? base.toLowerCase() : base;
  return `${numeral}${quality.romanSuffix}`;
}

function chordBarLabel(chord, grid) {
  if (grid && Number.isFinite(Number(chord.start))) {
    const rawBeatIndex = Math.floor((Number(chord.start) - grid.downbeatOffsetSeconds + 0.001) / grid.beatDurationSeconds);
    if (Number.isFinite(rawBeatIndex)) {
      const bar = Math.floor(rawBeatIndex / grid.beatsPerBar) + 1;
      if (bar > 0) return `Bar ${bar} · `;
    }
  }

  return Number.isFinite(Number(chord.bar)) ? `Bar ${chord.bar} · ` : "";
}

function statusLabel(status) {
  return statusLabels[status] || "Not started";
}

function modeLabel(mode) {
  return mode === "real" ? "Real" : "Mock";
}

function separatorLabel(settings) {
  if (settings?.mode !== "real" || !settings.realSeparator) return "";
  return settings.realSeparator === "ffmpeg-spectral-piano-v1"
    ? " · FFmpeg fallback"
    : ` · ${settings.realSeparator}`;
}

function backendReadyLabel(settings, suffix = "") {
  return `Backend ready: ${settings.mode}${separatorLabel(settings)}${suffix}`;
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
  const metadataDuration = Number(job?.result?.metadata?.durationSeconds ?? job?.result?.metadata?.duration);
  if (Number.isFinite(metadataDuration) && metadataDuration > 0) return formatTime(metadataDuration);

  const chords = job?.result?.metadata?.chords || [];
  const duration = Math.max(0, ...chords.map((chord) => Number(chord.end) || 0));
  return duration > 0 ? formatTime(duration) : "--";
}

function queueStatusLabel(queueJob) {
  if (queueJob.status === "queued") return "Queued";
  if (queueJob.status === "processing") {
    return pipelineStageLabels[queueJob.pipelineStage] || "Processing stems";
  }
  if (queueJob.status === "complete") return "Complete";
  if (queueJob.status === "failed") return "Failed";
  return queueJob.status || "Processing";
}

function completedStatusLabel(entry) {
  const learningStatus = entry.practiceState?.learningStatus || "not_started";
  return statusLabel(learningStatus);
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

function renderArtwork(container, title, thumbnailDataUrl = null) {
  if (!container) return;
  container.replaceChildren();
  if (thumbnailDataUrl) {
    const image = document.createElement("img");
    image.src = thumbnailDataUrl;
    image.alt = "";
    container.append(image);
    return;
  }

  container.textContent = String(title || "Song").slice(0, 1).toUpperCase();
}

function showSelectedHeader({ eyebrow, title, meta, actions = false, thumbnailDataUrl = null }) {
  selectedSongHeader.hidden = false;
  selectedSongEyebrow.textContent = eyebrow;
  selectedSongTitle.textContent = title;
  selectedSongMeta.textContent = meta;
  renderArtwork(selectedSongArt, title, thumbnailDataUrl);
  selectedSongActions.hidden = !actions;
  if (selectedStatusControl) {
    selectedStatusControl.hidden = !actions;
  }
  if (selectedMoreMenu) {
    selectedMoreMenu.hidden = true;
  }
  if (selectedMoreButton) {
    selectedMoreButton.setAttribute("aria-expanded", "false");
  }
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

function updateLoopSettingsVisibility() {
  if (!loopSettings || !loopEnabled) return;
  loopSettings.hidden = !loopEnabled.checked;
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
    countInBars: Number(countInBars?.value) || 0,
    lastPosition: transportTime(),
    metronomeEnabled,
    metronomeVolume,
    metronomeAccent: true,
    metronomeSolo,
    gridOverrides,
    keyOverride,
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
  gridOverrides = normalizedGridOverrides(state);
  keyOverride = normalizedKeyOverride(state);
  playbackRate = Number(state.playbackRate) || 1;
  loopStart.value = String(Number(state.loopStart) || 0);
  loopEnd.value = String(Number(state.loopEnd) || 4);
  loopEnabled.checked = Boolean(state.loopEnabled);
  updateLoopSettingsVisibility();
  if (countInBars) {
    countInBars.value = String(Number(state.countInBars ?? 1));
  }
  metronomeEnabled = Boolean(state.metronomeEnabled);
  metronomeVolume = Number(state.metronomeVolume ?? 0.45);
  metronomeSolo = Boolean(state.metronomeSolo);
  if (learningStatusSelect) {
    learningStatusSelect.value = state.learningStatus || "not_started";
  }
  updateTempoControl();
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
    thumbnailDataUrl: queueJob.thumbnailDataUrl || null,
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
    thumbnailDataUrl: entry.thumbnailDataUrl || null,
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
  renderArtwork(art, item.title, item.thumbnailDataUrl);

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
  gridOverrides = normalizedGridOverrides(job.practiceState);
  showSelectedHeader({
    eyebrow: "Song",
    title: job.originalFilename,
    meta: `${formatActivityTime(job.createdAt)} - ${jobDurationLabel(job)} - ${keyTempoLabel(effectiveMetadata(job.result.metadata))}`,
    actions: true,
    thumbnailDataUrl: job.thumbnailDataUrl
  });
  renderStemPlayers(stems);
  applySavedPracticeState(job);
  renderMetadata(job.result.metadata);
  updateSelectedSongMeta();
  showDetailPane("practice");
  openMobileDetail();
  if (learningStatusSelect) {
    learningStatusSelect.value = job.practiceState?.learningStatus || "not_started";
  }
  renderSongList();
}

function renderMetadata(metadata) {
  currentAnalyzedMetadata = metadata;
  currentMetadata = effectiveMetadata(metadata);
  updateKeyControl();
  updateTempoControl();
  updateGridCorrectionControls();
  renderGridTimeline(currentMetadata);

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  chordList.replaceChildren(
    ...currentMetadata.chords.map((chord, index) => {
      const card = document.createElement("div");
      card.className = "chord-card";
      card.dataset.index = String(index);
      const cuePrefix = chordBarLabel(chord, grid);
      card.innerHTML = `
        <span class="cue-time">${cuePrefix}${formatCueTime(chord.start)}-${formatCueTime(chord.end)}</span>
        <span class="cue-name">${chord.name}</span>
        <span class="cue-roman">${chord.roman}</span>
      `;
      return card;
    })
  );
}

function updateKeyControl() {
  if (!keySelect || !currentMetadata) return;
  const value = keyValue(currentMetadata.key);
  if (keySelect.value !== value) {
    keySelect.value = value;
  }
}

function updateTempoControl() {
  if (!tempoControl || !tempoDisplay || !currentMetadata) return;

  const label = tempoLabel(currentMetadata);
  tempoControl.hidden = !label;
  tempoDisplay.textContent = label || "Tempo";
  tempoDisplay.classList.toggle("overridden", Boolean(roundedBpm(gridOverrides.bpm)));
  if (tempoInput && document.activeElement !== tempoInput) {
    tempoInput.value = roundedBpm(currentMetadata.beatGrid?.bpm) || "";
  }
}

function updateSelectedSongMeta() {
  if (!currentJob || !selectedSongMeta || !currentMetadata) return;
  selectedSongMeta.textContent = `${formatActivityTime(currentJob.createdAt)} - ${jobDurationLabel(currentJob)} - ${keyTempoLabel(currentMetadata)}`;
}

function applyTempoOverride(nextBpm) {
  const bpm = roundedBpm(nextBpm);
  if (!bpm || !currentAnalyzedMetadata) return;

  applyGridOverrides({ bpm });
}

function applyGridOverrides(nextOverrides = {}) {
  if (!currentAnalyzedMetadata) return;

  gridOverrides = normalizedGridOverrides({ gridOverrides: { ...gridOverrides, ...nextOverrides } });
  if (currentJob?.practiceState) {
    currentJob.practiceState.gridOverrides = gridOverrides;
  }

  resetMetronomeSchedule();
  renderMetadata(currentAnalyzedMetadata);
  updateSelectedSongMeta();
  queuePracticeStatePersist();
}

function applyKeyOverride(nextKey) {
  if (!currentAnalyzedMetadata) return;

  keyOverride = normalizedKeyOverride({ keyOverride: nextKey }) || null;
  if (currentJob?.practiceState) {
    currentJob.practiceState.keyOverride = keyOverride;
  }

  renderMetadata(currentAnalyzedMetadata);
  updateSelectedSongMeta();
  queuePracticeStatePersist();
}

function updateGridCorrectionControls() {
  if (!gridCorrection || !currentAnalyzedMetadata || !currentMetadata) return;

  const analyzedDefaults = metadataGridDefaults(currentAnalyzedMetadata);
  const effectiveGrid = normalizedBeatGrid(currentMetadata, transportDuration());
  gridCorrection.hidden = !effectiveGrid;
  if (!effectiveGrid) return;

  const baseDownbeat = hasGridOverride(gridOverrides, "downbeatOffsetSeconds")
    ? gridOverrides.downbeatOffsetSeconds
    : analyzedDefaults.downbeatOffsetSeconds;
  if (barStartInput && document.activeElement !== barStartInput) {
    barStartInput.value = String(roundedSeconds(baseDownbeat, 0, 60 * 60) ?? 0);
  }

  if (meterSelect && document.activeElement !== meterSelect) {
    meterSelect.value = timeSignatureValue(effectiveGrid);
  }
}

function applyBarStartFromInput() {
  const seconds = roundedSeconds(barStartInput?.value, 0, 60 * 60);
  if (seconds === null) return;
  applyGridOverrides({ downbeatOffsetSeconds: seconds });
}

function nudgeGridValue(target, delta) {
  const step = Number(delta);
  if (!Number.isFinite(step)) return;

  if (target === "bar-start") {
    const defaults = metadataGridDefaults(currentAnalyzedMetadata);
    const current = hasGridOverride(gridOverrides, "downbeatOffsetSeconds")
      ? gridOverrides.downbeatOffsetSeconds
      : defaults.downbeatOffsetSeconds;
    const next = roundedSeconds(current + step, 0, 60 * 60);
    if (next !== null) {
      applyGridOverrides({ downbeatOffsetSeconds: next });
    }
  }
}

function openTempoInput() {
  if (!tempoInput || !tempoDisplay || !currentMetadata) return;
  tempoInput.value = roundedBpm(currentMetadata.beatGrid?.bpm) || "";
  tempoInput.hidden = false;
  tempoDisplay.hidden = true;
  tempoInput.focus();
  tempoInput.select();
}

function closeTempoInput(commit = false) {
  if (!tempoInput || !tempoDisplay) return;
  if (commit) {
    applyTempoOverride(tempoInput.value);
  }
  tempoInput.hidden = true;
  tempoDisplay.hidden = false;
}

function renderGridTimeline(metadata) {
  if (!gridTimeline) return;

  const grid = normalizedBeatGrid(metadata, transportDuration());
  gridTimeline.replaceChildren();
  gridTimeline.classList.toggle("empty", !grid);
  if (!grid) return;

  const startBeatIndex = Math.floor((0 - grid.downbeatOffsetSeconds) / grid.beatDurationSeconds) - 1;
  const endBeatIndex = Math.ceil((grid.durationSeconds - grid.downbeatOffsetSeconds) / grid.beatDurationSeconds) + 1;

  for (let beatIndex = startBeatIndex; beatIndex <= endBeatIndex; beatIndex += 1) {
    const time = grid.downbeatOffsetSeconds + beatIndex * grid.beatDurationSeconds;
    if (time < 0 || time > grid.durationSeconds) continue;

    const marker = document.createElement("span");
    marker.className = "grid-marker";
    const beatWithinBar = ((beatIndex % grid.beatsPerBar) + grid.beatsPerBar) % grid.beatsPerBar;
    const isDownbeat = beatWithinBar === 0;
    marker.classList.toggle("downbeat", isDownbeat);
    marker.style.left = `${Math.min(100, Math.max(0, (time / grid.durationSeconds) * 100))}%`;
    marker.dataset.time = String(Math.round(time * 1000) / 1000);
    marker.dataset.beat = String(beatWithinBar + 1);

    if (isDownbeat) {
      const label = document.createElement("span");
      label.textContent = String(Math.floor(beatIndex / grid.beatsPerBar) + 1);
      marker.append(label);
    }

    gridTimeline.append(marker);
  }

  renderTimelineIndicators();
}

function cancelScheduledMetronomeAudio() {
  if (!scheduledMetronomeNodes.length) return;
  const now = audioContext?.currentTime || 0;
  for (const node of scheduledMetronomeNodes) {
    try {
      node.oscillator.stop(now);
    } catch {
      // Already stopped or already playing out.
    }
  }
  scheduledMetronomeNodes = [];
}

function resetMetronomeSchedule({ cancelAudio = true } = {}) {
  scheduledMetronomeBeats = new Set();
  if (cancelAudio) {
    cancelScheduledMetronomeAudio();
  }
}

function timelinePercent(seconds, duration = transportDuration()) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (seconds / duration) * 100));
}

function markerElement(className, label, time) {
  const marker = document.createElement("span");
  marker.className = className;
  marker.style.left = `${timelinePercent(time)}%`;
  marker.dataset.time = String(Math.round(time * 1000) / 1000);
  marker.textContent = label;
  return marker;
}

function renderTimelineIndicators() {
  if (!gridTimeline) return;
  gridTimeline.querySelectorAll(".timeline-playhead, .loop-marker").forEach((marker) => marker.remove());

  const duration = transportDuration();
  if (!Number.isFinite(duration) || duration <= 0) return;

  const playhead = document.createElement("span");
  playhead.className = "timeline-playhead";
  playhead.style.left = `${timelinePercent(transportTime(), duration)}%`;
  gridTimeline.append(playhead);

  const start = Number(loopStart.value);
  const end = Number(loopEnd.value);
  if (loopEnabled.checked && Number.isFinite(start) && Number.isFinite(end) && end > start) {
    gridTimeline.append(markerElement("loop-marker loop-start-marker", "L", start));
    gridTimeline.append(markerElement("loop-marker loop-end-marker", "R", end));
  }
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") {
    const resumePromise = audioContext.resume?.();
    if (resumePromise?.catch) {
      resumePromise.catch(console.error);
    }
  }
  return audioContext;
}

function playMetronomeClick(delaySeconds, accented) {
  const context = ensureAudioContext();
  if (!context) return;

  const volume = Number(metronomeVolume) || 0;
  if (volume <= 0) return;

  const startAt = context.currentTime + Math.max(0, delaySeconds);
  const duration = accented ? 0.065 : 0.045;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = accented ? 1320 : 880;
  gain.gain.setValueAtTime(Math.min(0.7, volume * (accented ? 0.55 : 0.34)), startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
  scheduledMetronomeNodes.push({ oscillator, startAt, stopAt: startAt + duration });
  oscillator.onended = () => {
    scheduledMetronomeNodes = scheduledMetronomeNodes.filter((node) => node.oscillator !== oscillator);
  };
}

function scheduleMetronomeClicks(currentTime = transportTime()) {
  if (!metronomeEnabled || !isPlaying || !currentMetadata) return;

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  if (!grid) return;

  const lookaheadSeconds = 0.45;
  const startBeatIndex = Math.floor((currentTime - grid.downbeatOffsetSeconds - 0.04) / grid.beatDurationSeconds);
  const loopStartSeconds = Number(loopStart.value);
  const loopEndSeconds = Number(loopEnd.value);
  const hasActiveLoop =
    loopEnabled.checked &&
    Number.isFinite(loopStartSeconds) &&
    Number.isFinite(loopEndSeconds) &&
    loopEndSeconds > loopStartSeconds &&
    currentTime >= loopStartSeconds - 0.02 &&
    currentTime < loopEndSeconds;
  const scheduleEndTime = hasActiveLoop ? Math.min(grid.durationSeconds, loopEndSeconds) : grid.durationSeconds;
  const endBeatIndex = Math.ceil((currentTime + lookaheadSeconds * playbackRate - grid.downbeatOffsetSeconds) / grid.beatDurationSeconds);

  for (let beatIndex = startBeatIndex; beatIndex <= endBeatIndex; beatIndex += 1) {
    const beatTime = grid.downbeatOffsetSeconds + beatIndex * grid.beatDurationSeconds;
    if (beatTime < 0 || beatTime < currentTime - 0.06 || beatTime >= scheduleEndTime) continue;
    const key = `${beatIndex}:${Math.round(beatTime * 1000)}`;
    if (scheduledMetronomeBeats.has(key)) continue;

    scheduledMetronomeBeats.add(key);
    const beatWithinBar = ((beatIndex % grid.beatsPerBar) + grid.beatsPerBar) % grid.beatsPerBar;
    const accented = beatWithinBar === 0;
    const delaySeconds = (beatTime - currentTime) / Math.max(0.1, playbackRate);
    playMetronomeClick(delaySeconds, accented);
  }
}

function transportTime() {
  if (!isPlaying) return boundTransportTime(transportPosition);

  const elapsed = (performance.now() - transportStartedAt) / 1000;
  return boundTransportTime(transportPosition + elapsed * playbackRate);
}

function transportDuration() {
  const preferredPlayers = [primaryPlayer, ...stemPlayers].filter(Boolean);
  const player = preferredPlayers.find((candidate) => Number.isFinite(candidate.audio.duration) && candidate.audio.duration > 0);
  if (player) {
    knownTransportDuration = player.audio.duration;
  }
  return knownTransportDuration;
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
  timeReadout.textContent = `${formatTime(current)} / ${formatDuration(duration)}`;

  if (Number.isFinite(duration) && duration > 0) {
    scrubber.max = String(duration);
  } else {
    scrubber.max = String(Math.max(current, 0));
  }

  if (!isSeeking) {
    scrubber.value = String(current);
  }

  renderTimelineIndicators();
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
  resetMetronomeSchedule();
  updateTimeDisplay();
  highlightCurrentChord();
  queuePracticeStatePersist();
}

function loopCountInStartTime(current) {
  if (!loopEnabled.checked || !currentMetadata) return current;
  const bars = Number(countInBars?.value) || 0;
  if (bars <= 0) return current;

  const start = Number(loopStart.value);
  const end = Number(loopEnd.value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return current;

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  if (!grid) return current;

  const countInSeconds = bars * grid.beatsPerBar * grid.beatDurationSeconds;
  return Math.max(0, start - countInSeconds);
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
    resetMetronomeSchedule();
    current = transportTime();
  }

  updateTimeDisplay();
  highlightCurrentChord();
  scheduleMetronomeClicks(current);

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
  resetMetronomeSchedule();
  stopTransportTick();
  playButton.textContent = "▶";
  playButton.setAttribute("aria-label", "Play");
  updateTimeDisplay();
  highlightCurrentChord();
  if (persist) {
    queuePracticeStatePersist();
  }
}

async function playAll() {
  if (!stemPlayers.length) return;

  const current = loopCountInStartTime(transportTime());
  anchorTransport(current);
  for (const player of stemPlayers) {
    player.audio.playbackRate = playbackRate;
  }

  await Promise.all(stemPlayers.map((player) => seekAudioTo(player.audio, current)));

  const results = await Promise.allSettled(stemPlayers.map((player) => player.audio.play()));
  if (results.some((result) => result.status === "fulfilled")) {
    isPlaying = true;
    anchorTransport(current);
    resetMetronomeSchedule();
    scheduleMetronomeClicks(current);
    startTransportTick();
    playButton.textContent = "||";
    playButton.setAttribute("aria-label", "Pause");
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
  const hasSolo = stemPlayers.some((player) => player.solo) || metronomeSolo;
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

  updateMetronomeRow();
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

function updateMetronomeRow() {
  const row = stemMixer?.querySelector("[data-testid='metronome-row']");
  if (!row) return;
  const muteButton = row.querySelector("[data-metronome-action='mute']");
  const soloButton = row.querySelector("[data-metronome-action='solo']");
  const volumeSlider = row.querySelector("[data-testid='metronome-volume']");
  row.classList.toggle("muted", !metronomeEnabled);
  row.classList.toggle("solo", metronomeSolo);
  if (muteButton) {
    muteButton.textContent = "M";
    muteButton.setAttribute("aria-label", metronomeEnabled ? "Mute grid click" : "Unmute grid click");
    muteButton.setAttribute("aria-pressed", String(!metronomeEnabled));
  }
  if (soloButton) {
    soloButton.textContent = "S";
    soloButton.setAttribute("aria-label", metronomeSolo ? "Unsolo grid click" : "Solo grid click");
    soloButton.setAttribute("aria-pressed", String(metronomeSolo));
  }
  if (volumeSlider && document.activeElement !== volumeSlider) {
    volumeSlider.value = String(metronomeVolume);
  }
}

function renderMetronomeRow() {
  if (!stemMixer) return;

  const row = document.createElement("div");
  row.className = "stem-row metronome-row";
  row.dataset.testid = "metronome-row";
  row.innerHTML = `
    <div>
      <span class="stem-name">Grid click</span>
    </div>
  `;

  const controls = document.createElement("div");
  controls.className = "stem-controls";

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.05";
  volumeSlider.value = String(metronomeVolume);
  volumeSlider.setAttribute("aria-label", "Grid click volume");
  volumeSlider.dataset.testid = "metronome-volume";
  volumeSlider.addEventListener("input", () => {
    metronomeVolume = Number(volumeSlider.value) || 0;
    queuePracticeStatePersist();
  });

  const muteButton = document.createElement("button");
  muteButton.type = "button";
  muteButton.className = "stem-toggle";
  muteButton.dataset.metronomeAction = "mute";
  muteButton.dataset.testid = "metronome-mute";
  muteButton.title = "Mute grid click";

  const soloButton = document.createElement("button");
  soloButton.type = "button";
  soloButton.className = "stem-toggle stem-solo";
  soloButton.dataset.metronomeAction = "solo";
  soloButton.dataset.testid = "metronome-solo";
  soloButton.title = "Solo grid click";

  controls.append(volumeSlider, muteButton, soloButton);
  row.append(controls);
  stemMixer.append(row);
  updateMetronomeRow();
}

function renderStemPlayers(stems) {
  pauseAll({ persist: false });
  stemPlayers = [];
  primaryPlayer = null;
  knownTransportDuration = 0;
  anchorTransport(0);
  stemDeck.replaceChildren();
  stemMixer.replaceChildren();
  renderMetronomeRow();

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
  updateTimeDisplay();
  if (!primaryPlayer) return;

  const updateLoadedDuration = () => {
    transportDuration();
    updateTimeDisplay();
    renderGridTimeline(currentMetadata);
  };

  for (const player of stemPlayers) {
    player.audio.addEventListener("loadedmetadata", updateLoadedDuration);
    player.audio.addEventListener("durationchange", updateLoadedDuration);

    player.audio.addEventListener("ended", () => {
      const duration = transportDuration();
      if (Number.isFinite(duration) && duration > 0 && transportTime() >= duration) {
        pauseAll();
        setTransportTime(0);
      }
    });

    player.audio.load();
  }
}

function updateQueueJob(queueJob, job) {
  queueJob.status = job.status;
  queueJob.progress = job.progress;
  queueJob.pipelineStage = job.pipelineStage || queueJob.pipelineStage || null;
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
    actions: false,
    thumbnailDataUrl: queueJob.thumbnailDataUrl
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
    eyebrow: "Song",
    title: job.originalFilename,
    meta: `${formatActivityTime(job.createdAt)} - ${jobDurationLabel(job)} - ${keyTempoLabel(job.result.metadata)}`,
    actions: true,
    thumbnailDataUrl: job.thumbnailDataUrl
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

function readMediaDurationWithElement(file, tagName) {
  return new Promise((resolve) => {
    const element = document.createElement(tagName);
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (duration = null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      element.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : null);
    };

    const timeout = window.setTimeout(() => finish(), 1000);
    element.preload = "metadata";
    element.addEventListener("loadedmetadata", () => finish(element.duration), { once: true });
    element.addEventListener("error", () => finish(), { once: true });
    element.src = objectUrl;
    element.load();
  });
}

async function readMediaDuration(file) {
  if (file.type.startsWith("video/")) return readMediaDurationWithElement(file, "video");
  if (file.type.startsWith("audio/")) return readMediaDurationWithElement(file, "audio");
  return null;
}

function readVideoThumbnail(file) {
  if (!file.type.startsWith("video/")) return Promise.resolve(null);

  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (thumbnailDataUrl = null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
      resolve(thumbnailDataUrl);
    };

    const capture = () => {
      try {
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        if (!width || !height) {
          finish();
          return;
        }

        const canvas = document.createElement("canvas");
        const targetWidth = 240;
        canvas.width = targetWidth;
        canvas.height = Math.max(1, Math.round((height / width) * targetWidth));
        const context = canvas.getContext("2d");
        if (!context) {
          finish();
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.72));
      } catch (error) {
        console.error(error);
        finish();
      }
    };

    const timeout = window.setTimeout(() => finish(), 2000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("loadedmetadata", () => {
      const seekTime = Number.isFinite(video.duration) && video.duration > 0.5 ? Math.min(0.5, video.duration / 4) : 0;
      try {
        video.currentTime = seekTime;
      } catch {
        capture();
      }
    }, { once: true });
    video.addEventListener("seeked", capture, { once: true });
    video.addEventListener("loadeddata", capture, { once: true });
    video.addEventListener("error", () => finish(), { once: true });
    video.src = objectUrl;
    video.load();
  });
}

async function readMediaMetadata(file) {
  const [durationSeconds, thumbnailDataUrl] = await Promise.all([
    readMediaDuration(file),
    readVideoThumbnail(file)
  ]);
  return { durationSeconds, thumbnailDataUrl };
}

async function createJob(file, mediaMetadata = {}) {
  const { durationSeconds = null, thumbnailDataUrl = null } = mediaMetadata;

  if (pipelineMode === "mock") {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        filename: file.name,
        size: file.size,
        type: file.type,
        durationSeconds,
        thumbnailDataUrl
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
  if (durationSeconds) {
    formData.append("durationSeconds", String(durationSeconds));
  }
  if (thumbnailDataUrl) {
    formData.append("thumbnailDataUrl", thumbnailDataUrl);
  }

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
      ? backendReadyLabel(health, " · processed demo")
      : backendReadyLabel(health);
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
    serviceStatus.textContent = backendReadyLabel(settings);
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
        pipelineStage: null,
        timer: null,
        jobId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: null,
        thumbnailDataUrl: null
      };
      queueJobs.set(localId, queueJob);
      renderSongList();

      try {
        const mediaMetadata = await readMediaMetadata(file);
        queueJob.thumbnailDataUrl = mediaMetadata.thumbnailDataUrl;
        renderSongList();
        const job = await createJob(file, mediaMetadata);
        queueJob.jobId = job.id;
        queueJob.thumbnailDataUrl = job.thumbnailDataUrl || queueJob.thumbnailDataUrl;
        updateQueueJob(queueJob, job);
        queueJob.timer = window.setInterval(() => {
          pollQueueJob(localId).catch((error) => {
            console.error(error);
            const latestQueueJob = queueJobs.get(localId);
            if (!latestQueueJob) return;
            window.clearInterval(latestQueueJob.timer);
            updateQueueJob(latestQueueJob, {
              status: "failed",
              progress: latestQueueJob.progress,
              pipelineStage: latestQueueJob.pipelineStage
            });
          });
        }, 500);
        await pollQueueJob(localId);
      } catch (error) {
        queueJob.error = error.message;
        updateQueueJob(queueJob, {
          status: "failed",
          progress: queueJob.progress,
          pipelineStage: queueJob.pipelineStage
        });
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

backToStartButton?.addEventListener("click", () => {
  setTransportTime(0);
});

scrubber.addEventListener("input", () => {
  isSeeking = true;
  timeReadout.textContent = `${formatTime(Number(scrubber.value))} / ${formatDuration(transportDuration())}`;
  renderTimelineIndicators();
});

scrubber.addEventListener("change", () => {
  setTransportTime(Number(scrubber.value));
  isSeeking = false;
});

stemMixer.addEventListener("click", (event) => {
  const metronomeButton = event.target.closest("button[data-metronome-action]");
  if (metronomeButton) {
    if (metronomeButton.dataset.metronomeAction === "solo") {
      metronomeSolo = !metronomeSolo;
      if (metronomeSolo) {
        metronomeEnabled = true;
      }
    } else {
      metronomeEnabled = !metronomeEnabled;
      if (!metronomeEnabled) {
        metronomeSolo = false;
      }
    }
    resetMetronomeSchedule();
    updateStemAudibility();
    queuePracticeStatePersist();
    return;
  }

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

  resetMetronomeSchedule();
  setActiveSpeedButton();
  queuePracticeStatePersist();
});

tempoHalf?.addEventListener("click", () => {
  applyTempoOverride((currentMetadata?.beatGrid?.bpm || 0) / 2);
});

tempoDouble?.addEventListener("click", () => {
  applyTempoOverride((currentMetadata?.beatGrid?.bpm || 0) * 2);
});

keySelect?.addEventListener("change", () => {
  const key = parseKeyValue(keySelect.value);
  if (key) {
    applyKeyOverride(key);
  }
});

tempoDisplay?.addEventListener("click", () => {
  openTempoInput();
});

tempoInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    closeTempoInput(true);
  }
  if (event.key === "Escape") {
    event.preventDefault();
    closeTempoInput(false);
  }
});

tempoInput?.addEventListener("blur", () => {
  closeTempoInput(true);
});

barStartInput?.addEventListener("change", applyBarStartFromInput);
barStartInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyBarStartFromInput();
    barStartInput.blur();
  }
});

gridCorrection?.addEventListener("click", (event) => {
  const nudgeButton = event.target.closest("button[data-grid-nudge]");
  if (nudgeButton) {
    const [target, delta] = nudgeButton.dataset.gridNudge.split(":");
    nudgeGridValue(target, delta);
    return;
  }
});

meterSelect?.addEventListener("change", () => {
  const signature = parseTimeSignature(meterSelect.value);
  if (signature) {
    applyGridOverrides(signature);
  }
});

[loopStart, loopEnd, loopEnabled, countInBars].forEach((element) => {
  if (!element) return;
  element.addEventListener("change", () => {
    updateLoopSettingsVisibility();
    renderTimelineIndicators();
    queuePracticeStatePersist();
  });
  element.addEventListener("input", () => {
    updateLoopSettingsVisibility();
    renderTimelineIndicators();
    queuePracticeStatePersist();
  });
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

selectedMoreButton?.addEventListener("click", () => {
  if (!selectedMoreMenu) return;
  selectedMoreMenu.hidden = !selectedMoreMenu.hidden;
  selectedMoreButton.setAttribute("aria-expanded", String(!selectedMoreMenu.hidden));
});

document.addEventListener("click", (event) => {
  if (!selectedMoreMenu || !selectedMoreButton || selectedMoreMenu.hidden) return;
  if (selectedMoreMenu.contains(event.target) || selectedMoreButton.contains(event.target)) return;
  selectedMoreMenu.hidden = true;
  selectedMoreButton.setAttribute("aria-expanded", "false");
});

selectedRenameButton.addEventListener("click", async () => {
  if (selectedMoreMenu && selectedMoreButton) {
    selectedMoreMenu.hidden = true;
    selectedMoreButton.setAttribute("aria-expanded", "false");
  }
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
  if (selectedMoreMenu && selectedMoreButton) {
    selectedMoreMenu.hidden = true;
    selectedMoreButton.setAttribute("aria-expanded", "false");
  }
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
  populateKeySelect();
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
