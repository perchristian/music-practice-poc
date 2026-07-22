import {
  addChordAtCellToChart,
  adjustChordTimingForGrid,
  chordBeatRange,
  chordChartContainsCue,
  chordChartToCues,
  chordGridHit,
  clampedInteger,
  defaultTimeSignature,
  deleteChordFromChart,
  fallbackChartGrid,
  formatBeatNumber,
  keyModes,
  keyTonics,
  maxChordChartDivisions,
  moveChordToCellInChart,
  normalizedChordChart,
  normalizedHarmonyView,
  notePitchClasses,
  recoverChordCueInChart,
  resizeChordToBeatBoundaryInChart,
  romanNumeralForChord,
  seedChordChart as seedChordChartState,
  updateChordNameInChart
} from "./chord-chart.js";
import {
  addSectionToList,
  createSectionId,
  normalizeSections,
  sectionDisplayText,
  updateSectionInList
} from "./section-ranges.js";
import {
  absoluteBeatToSeconds,
  enumerateBeatTimes,
  localTempoAtSeconds,
  musicalPositionToSeconds,
  normalizeTempoMap,
  secondsToAbsoluteBeat,
  tempoMapWithAnchor,
  tempoMapWithoutAnchor
} from "./tempo-map.js";

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
const practiceSaveStatus = document.querySelector("#practiceSaveStatus");
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
const failedDeleteButton = document.querySelector("#failedDeleteButton");
const stemDeck = document.querySelector("#stemDeck");
const stemMixer = document.querySelector("#stemMixer");
const playButton = document.querySelector("#playButton");
const backToStartButton = document.querySelector("#backToStartButton");
const scrubber = document.querySelector("#scrubber");
const gridTimeline = document.querySelector("#gridTimeline");
const timelineViewport = document.querySelector("#timelineViewport");
const timelineTrack = document.querySelector("#timelineTrack");
const waveformCanvas = document.querySelector("#waveformCanvas");
const editTimingButton = document.querySelector("#editTimingButton");
const timingEditorControls = document.querySelector("#timingEditorControls");
const timingZoom = document.querySelector("#timingZoom");
const timingFitButton = document.querySelector("#timingFitButton");
const timingDoneButton = document.querySelector("#timingDoneButton");
const timingAnchorControls = document.querySelector("#timingAnchorControls");
const timingAnchorLabel = document.querySelector("#timingAnchorLabel");
const timingCorrectionSelect = document.querySelector("#timingCorrectionSelect");
const timingPreviousAnchor = document.querySelector("#timingPreviousAnchor");
const timingNextAnchor = document.querySelector("#timingNextAnchor");
const timingAnchorTime = document.querySelector("#timingAnchorTime");
const timingNudgeLeft = document.querySelector("#timingNudgeLeft");
const timingNudgeRight = document.querySelector("#timingNudgeRight");
const timingRemoveAnchor = document.querySelector("#timingRemoveAnchor");
const speedControls = document.querySelector("#speedControls");
const loopStart = document.querySelector("#loopStart");
const loopEnd = document.querySelector("#loopEnd");
const loopStartLabel = document.querySelector("#loopStartLabel");
const loopEndLabel = document.querySelector("#loopEndLabel");
const loopEnabled = document.querySelector("#loopEnabled");
const loopSettings = document.querySelector("#loopSettings");
const countInBars = document.querySelector("#countInBars");
const startAtBarOne = document.querySelector("#startAtBarOne");
const timeReadout = document.querySelector("#timeReadout");
const keySelect = document.querySelector("#keySelect");
const tempoControl = document.querySelector("#tempoControl");
const tempoHalf = document.querySelector("#tempoHalf");
const tempoDisplay = document.querySelector("#tempoDisplay");
const tempoInput = document.querySelector("#tempoInput");
const tempoDouble = document.querySelector("#tempoDouble");
const gridCorrection = document.querySelector("#gridCorrection");
const meterSelect = document.querySelector("#meterSelect");
const chordList = document.querySelector("#chordList");
const reanalyzeHarmonyButton = document.querySelector("#reanalyzeHarmonyButton");
const harmonyAnalysisStatus = document.querySelector("#harmonyAnalysisStatus");
const suppressedSuggestionsButton = document.querySelector("#suppressedSuggestionsButton");
const suppressedSuggestionsDialog = document.querySelector("#suppressedSuggestionsDialog");
const suppressedSuggestionsList = document.querySelector("#suppressedSuggestionsList");
const suppressedSuggestionsDone = document.querySelector("#suppressedSuggestionsDone");
const chordDisplaySelect = document.querySelector("#chordDisplaySelect");
const barsPerRowSelect = document.querySelector("#barsPerRowSelect");
const sectionInfoToggle = document.querySelector("#sectionInfoToggle");
const createSectionButton = document.querySelector("#createSectionButton");
const sectionSelectionSummary = document.querySelector("#sectionSelectionSummary");
const sectionCreateDialog = document.querySelector("#sectionCreateDialog");
const sectionCreateForm = document.querySelector("#sectionCreateForm");
const sectionCreateSymbolInput = document.querySelector("#sectionCreateSymbolInput");
const sectionCreateLabelInput = document.querySelector("#sectionCreateLabelInput");
const sectionCreateColorInput = document.querySelector("#sectionCreateColorInput");
const sectionCreateError = document.querySelector("#sectionCreateError");
const sectionCreateCancel = document.querySelector("#sectionCreateCancel");
const sectionCreateSave = document.querySelector("#sectionCreateSave");
const sectionEditDialog = document.querySelector("#sectionEditDialog");
const sectionEditForm = document.querySelector("#sectionEditForm");
const sectionEditSymbolInput = document.querySelector("#sectionEditSymbolInput");
const sectionEditLabelInput = document.querySelector("#sectionEditLabelInput");
const sectionEditStartInput = document.querySelector("#sectionEditStartInput");
const sectionEditEndInput = document.querySelector("#sectionEditEndInput");
const sectionEditError = document.querySelector("#sectionEditError");
const sectionEditCancel = document.querySelector("#sectionEditCancel");
const sectionEditSave = document.querySelector("#sectionEditSave");
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
let countInTimer = null;
let isCountingIn = false;
let countInTargetTime = 0;
let audioContext = null;
let audioContextActivation = null;
let scheduledMetronomeBeats = new Set();
let scheduledMetronomeNodes = [];
let currentJob = null;
let currentJobId = null;
let currentAnalyzedMetadata = null;
let gridOverrides = {};
let tempoMap = null;
let keyOverride = null;
let chordChart = null;
let sections = [];
let harmonyView = { barsPerRow: 2, chordDisplay: "both", sectionInfoVisible: true };
let selectedSectionRange = null;
let pendingSectionCreateRange = null;
let chordResizeState = null;
let loopDragState = null;
let metronomeEnabled = false;
let metronomeSolo = false;
let metronomeVolume = 0.45;
let waveformData = null;
let waveformLoadId = 0;
let timingEditMode = false;
let timingZoomFactor = 1;
let selectedTimingAnchorBar = null;
let timingDragState = null;
let suppressTimelineClick = false;
let harmonyReanalysisPending = false;
let timelineHoverClientX = null;
const timingTouchPointers = new Map();
let timingPinchState = null;
let persistTimer = null;
let pendingPracticeStatePersist = null;
let practicePersistVersion = 0;
let practicePersistChain = Promise.resolve(true);
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

const minBarStartSeconds = -60;
const maxBarStartSeconds = 60 * 60;

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

  const downbeatOffsetSeconds = roundedSeconds(source.downbeatOffsetSeconds, minBarStartSeconds, maxBarStartSeconds);
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
  const downbeatOffsetSeconds = roundedSeconds(grid.downbeatOffsetSeconds ?? grid.beatOffsetSeconds ?? 0, minBarStartSeconds, maxBarStartSeconds) ?? 0;
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

  const correctedAnalysis = metadata.correctedTimingAnalysis;
  const analysisMetadata = correctedAnalysis
    ? {
      ...metadata,
      harmonySource: correctedAnalysis.harmonySource,
      analysisSource: correctedAnalysis.analysisSource,
      key: correctedAnalysis.key,
      chords: correctedAnalysis.chords,
      suppressedChordSuggestions: correctedAnalysis.suppressedChordSuggestions || [],
      analysis: correctedAnalysis.analysis
    }
    : metadata;
  const defaults = metadataGridDefaults(metadata);
  const bpm = roundedBpm(gridOverrides.bpm) || defaults.bpm;
  const beatDurationSeconds = bpm ? 60 / bpm : defaults.beatDurationSeconds;
  const beatsPerBar = gridOverrides.beatsPerBar || defaults.beatsPerBar;
  const beatUnit = gridOverrides.beatUnit || defaults.beatUnit;
  const baseDownbeat = hasGridOverride(gridOverrides, "downbeatOffsetSeconds")
    ? gridOverrides.downbeatOffsetSeconds
    : defaults.downbeatOffsetSeconds;
  const downbeatOffsetSeconds = roundedSeconds(baseDownbeat, minBarStartSeconds, maxBarStartSeconds) ?? 0;

  const key = keyOverride || analysisMetadata.key;
  const effectiveGrid = bpm || beatDurationSeconds
    ? {
      bpm,
      beatDurationSeconds,
      beatsPerBar,
      beatUnit,
      downbeatOffsetSeconds,
      tempoMap
    }
    : null;
  const hasTimingGridOverride =
    Boolean(roundedBpm(gridOverrides.bpm)) ||
    Boolean(gridOverrides.beatsPerBar || gridOverrides.beatUnit) ||
    hasGridOverride(gridOverrides, "downbeatOffsetSeconds") ||
    Boolean(tempoMap);
  const chartChords = chordChartToCues(chordChart, effectiveGrid, key);
  const sourceChords = chartChords || analysisMetadata.chords || [];
  const chords = sourceChords.map((chord) => ({
    ...(chord.source === "user" || chord.source === "corrected-timing-chroma"
      ? chord
      : hasTimingGridOverride ? adjustChordTimingForGrid(chord, defaults, effectiveGrid) : chord),
    roman: romanNumeralForChord(chord.name, key) || chord.roman || "",
    source: chord.source || "analysis"
  }));
  const suppressedChordSuggestions = (analysisMetadata.suppressedChordSuggestions || []).map((chord) => ({
    ...(chord.source === "suppressed-corrected-timing-chroma" || !hasTimingGridOverride
      ? chord
      : adjustChordTimingForGrid(chord, defaults, effectiveGrid)),
    roman: romanNumeralForChord(chord.name, key) || chord.roman || ""
  }));

  if (!bpm && !beatDurationSeconds) {
    return {
      ...analysisMetadata,
      key,
      chords,
      suppressedChordSuggestions
    };
  }

  return {
    ...analysisMetadata,
    key,
    chords,
    suppressedChordSuggestions,
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
      tempoMap,
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
  const effectiveTempoMap = normalizeTempoMap(grid.tempoMap);
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
    tempoMap: effectiveTempoMap,
    durationSeconds
  };
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
  if (practiceSaveStatus) {
    practiceSaveStatus.hidden = true;
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

function setPracticeSaveStatus(state) {
  if (!practiceSaveStatus) return;
  const labels = {
    saving: "Saving...",
    saved: "Saved",
    error: "Save failed"
  };
  practiceSaveStatus.textContent = labels[state] || labels.saved;
  practiceSaveStatus.dataset.state = state;
  practiceSaveStatus.hidden = false;
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

function currentLoopGrid() {
  return normalizedBeatGrid(currentMetadata, transportDuration());
}

function loopMode() {
  return currentLoopGrid() ? "bars" : "seconds";
}

function loopSecondsFromValue(value, mode = loopMode(), edge = "start") {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;

  if (mode !== "bars") {
    return boundTransportTime(numericValue);
  }

  const grid = currentLoopGrid();
  if (!grid) return boundTransportTime(numericValue);
  const barPosition = Math.max(1, Math.round(numericValue));
  const boundaryBar = edge === "end" ? barPosition + 1 : barPosition;
  return boundTransportTime(musicalPositionToSeconds(grid, { bar: boundaryBar, beat: 1 }));
}

function loopBarPositionFromSeconds(seconds, edge = "start") {
  const grid = currentLoopGrid();
  if (!grid) return null;
  const beatOffset = secondsToAbsoluteBeat(grid, Number(seconds));
  if (!Number.isFinite(beatOffset)) return null;
  const barOffset = beatOffset / grid.beatsPerBar;
  return edge === "end"
    ? Math.max(1, Math.ceil(barOffset - 0.001))
    : Math.max(1, Math.floor(barOffset + 0.001) + 1);
}

function loopInputSeconds(input) {
  return loopSecondsFromValue(input?.value, input?.dataset.loopMode || loopMode(), input === loopEnd ? "end" : "start");
}

function setLoopInputFromSeconds(input, seconds, mode = loopMode(), edge = input === loopEnd ? "end" : "start") {
  if (!input) return;

  if (mode === "bars") {
    const barPosition = loopBarPositionFromSeconds(seconds, edge);
    input.value = String(barPosition || 1);
    return;
  }

  input.value = String(roundedSeconds(seconds, 0, 60 * 60) ?? 0);
}

function sanitizeLoopBarInput(input) {
  if (!input || input.dataset.loopMode !== "bars") return;
  const nextValue = Math.max(1, Math.round(Number(input.value) || 1));
  input.value = String(nextValue);
}

function normalizeLoopBarInputs(changedInput = null) {
  if (!loopStart || !loopEnd || loopStart.dataset.loopMode !== "bars") return;
  sanitizeLoopBarInput(loopStart);
  sanitizeLoopBarInput(loopEnd);

  const startBar = Math.max(1, Math.round(Number(loopStart.value) || 1));
  const endBar = Math.max(1, Math.round(Number(loopEnd.value) || 1));
  if (endBar >= startBar) return;

  if (changedInput === loopStart || changedInput === null) {
    loopEnd.value = String(startBar);
  } else {
    loopStart.value = String(endBar);
  }
}

function updateLoopControlMode() {
  if (!loopStart || !loopEnd) return;

  const nextMode = loopMode();
  const previousMode = loopStart.dataset.loopMode || "seconds";
  const startSeconds = loopSecondsFromValue(loopStart.value, previousMode, "start");
  const endSeconds = loopSecondsFromValue(loopEnd.value, previousMode, "end");

  loopStart.dataset.loopMode = nextMode;
  loopEnd.dataset.loopMode = nextMode;

  if (nextMode === "bars") {
    loopStart.min = "1";
    loopEnd.min = "1";
    loopStart.step = "1";
    loopEnd.step = "1";
    loopStart.inputMode = "numeric";
    loopEnd.inputMode = "numeric";
    if (loopStartLabel) loopStartLabel.textContent = "Start bar";
    if (loopEndLabel) loopEndLabel.textContent = "End bar";
  } else {
    loopStart.min = "0";
    loopEnd.min = "0";
    loopStart.step = "0.1";
    loopEnd.step = "0.1";
    loopStart.inputMode = "decimal";
    loopEnd.inputMode = "decimal";
    if (loopStartLabel) loopStartLabel.textContent = "Start seconds";
    if (loopEndLabel) loopEndLabel.textContent = "End seconds";
  }

  if (previousMode !== nextMode) {
    setLoopInputFromSeconds(loopStart, startSeconds, nextMode, "start");
    setLoopInputFromSeconds(loopEnd, endSeconds, nextMode, "end");
  } else if (nextMode === "bars") {
    normalizeLoopBarInputs();
  }
}

function normalizedSections(state = null) {
  return normalizeSections(state);
}

function normalizedSectionRange(startBar, endBar = startBar) {
  const safeStart = Math.max(1, Math.round(Number(startBar) || 1));
  const safeEnd = Math.max(1, Math.round(Number(endBar) || safeStart));
  return {
    startBar: Math.min(safeStart, safeEnd),
    endBar: Math.max(safeStart, safeEnd)
  };
}

function sectionRangeLabel(range) {
  if (!range) return "";
  return range.startBar === range.endBar ? `Bar ${range.startBar}` : `Bars ${range.startBar}-${range.endBar}`;
}

function sectionRangeOverlaps(startBar, endBar) {
  return sections.some((section) => startBar <= section.endBar && section.startBar <= endBar);
}

function selectedSectionRangeIsCreatable(range = selectedSectionRange) {
  return Boolean(range) && !sectionRangeOverlaps(range.startBar, range.endBar);
}

function updateSectionSelectionControls() {
  const range = selectedSectionRange;
  const hasRange = Boolean(range);
  const hasOverlap = hasRange && !selectedSectionRangeIsCreatable(range);

  if (createSectionButton) {
    createSectionButton.hidden = !hasRange || !harmonyView.sectionInfoVisible;
    createSectionButton.disabled = hasOverlap;
  }
  if (sectionSelectionSummary) {
    sectionSelectionSummary.textContent = hasRange
      ? `${sectionRangeLabel(range)}${hasOverlap ? " already has section info" : " selected"}`
      : "";
  }
}

function setSelectedSectionRange(startBar, endBar = startBar, anchorBar = startBar, options = {}) {
  const range = normalizedSectionRange(startBar, endBar);
  selectedSectionRange = {
    ...range,
    anchorBar: Math.max(1, Math.round(Number(anchorBar) || range.startBar))
  };
  updateSectionSelectionControls();
  if (options.render !== false) {
    renderMetadata(currentAnalyzedMetadata);
  }
}

function clearSelectedSectionRange(options = {}) {
  selectedSectionRange = null;
  updateSectionSelectionControls();
  if (options.render !== false) {
    renderMetadata(currentAnalyzedMetadata);
  }
}

function selectSectionBar(bar, extend = false) {
  if (!Number.isFinite(bar) || bar < 1) return;
  if (extend && selectedSectionRange?.anchorBar) {
    setSelectedSectionRange(selectedSectionRange.anchorBar, bar, selectedSectionRange.anchorBar);
    return;
  }
  setSelectedSectionRange(bar, bar, bar);
}

function sectionCreateDialogSupported() {
  return typeof sectionCreateDialog?.showModal === "function";
}

function setSectionCreateError(message = "") {
  if (sectionCreateError) {
    sectionCreateError.textContent = message;
    sectionCreateError.hidden = !message;
  }
  sectionCreateSave?.setCustomValidity(message);
}

function openSectionCreateDialog(range) {
  const nextRange = normalizedSectionRange(range?.startBar, range?.endBar);
  if (sectionRangeOverlaps(nextRange.startBar, nextRange.endBar)) {
    updateSectionSelectionControls();
    return;
  }

  pendingSectionCreateRange = nextRange;
  setSectionCreateError("");
  if (sectionCreateSymbolInput) sectionCreateSymbolInput.value = "";
  if (sectionCreateLabelInput) sectionCreateLabelInput.value = "";
  if (sectionCreateColorInput) sectionCreateColorInput.value = "";

  if (sectionCreateDialogSupported()) {
    sectionCreateDialog.showModal();
  } else {
    sectionCreateDialog?.removeAttribute("hidden");
    sectionCreateSymbolInput?.focus();
  }
}

function closeSectionCreateDialog() {
  pendingSectionCreateRange = null;
  setSectionCreateError("");
  if (sectionCreateDialog?.open) {
    sectionCreateDialog.close();
  } else {
    sectionCreateDialog?.setAttribute("hidden", "");
  }
}

function createSectionFromDialog() {
  if (!pendingSectionCreateRange) return;
  setSectionCreateError("");
  const colorKey = String(sectionCreateColorInput?.value || "").trim().slice(0, 24);
  const candidate = {
    id: createSectionId(),
    label: String(sectionCreateLabelInput?.value || "").trim().slice(0, 40),
    symbol: String(sectionCreateSymbolInput?.value || "").trim().slice(0, 12),
    startBar: pendingSectionCreateRange.startBar,
    endBar: pendingSectionCreateRange.endBar,
    source: "user"
  };
  if (colorKey) {
    candidate.colorKey = colorKey;
  }

  const result = addSectionToList(sections, candidate);
  if (!result.ok) {
    setSectionCreateError(result.error === "overlap" ? "Section overlaps an existing section." : "Section could not be saved.");
    sectionCreateSave?.reportValidity();
    return;
  }

  commitSections(result.sections);
  closeSectionCreateDialog();
  clearSelectedSectionRange();
}

function commitSections(nextSections) {
  sections = normalizedSections({ sections: nextSections });
  if (currentJob?.practiceState) {
    currentJob.practiceState.sections = sections;
  }
  renderMetadata(currentAnalyzedMetadata);
  queuePracticeStatePersist();
}

let editingSectionId = null;

function sectionDialogSupported() {
  return typeof sectionEditDialog?.showModal === "function";
}

function setSectionEditError(message = "") {
  if (sectionEditError) {
    sectionEditError.textContent = message;
    sectionEditError.hidden = !message;
  }
  sectionEditStartInput?.setCustomValidity(message);
}

function sectionAccessibleText(section) {
  return sectionDisplayText(section) || `Section bars ${section.startBar}-${section.endBar}`;
}

function openSectionEditDialog(sectionId) {
  const section = sections.find((candidate) => candidate.id === sectionId);
  if (!section) return;
  editingSectionId = section.id;
  setSectionEditError("");

  if (sectionEditSymbolInput) sectionEditSymbolInput.value = section.symbol;
  if (sectionEditLabelInput) sectionEditLabelInput.value = section.label;
  if (sectionEditStartInput) sectionEditStartInput.value = String(section.startBar);
  if (sectionEditEndInput) sectionEditEndInput.value = String(section.endBar);

  if (sectionDialogSupported()) {
    sectionEditDialog.showModal();
  } else {
    sectionEditDialog?.removeAttribute("hidden");
    sectionEditSymbolInput?.focus();
  }
}

function closeSectionEditDialog() {
  editingSectionId = null;
  setSectionEditError("");
  if (sectionEditDialog?.open) {
    sectionEditDialog.close();
  } else {
    sectionEditDialog?.setAttribute("hidden", "");
  }
}

function saveSectionEdit() {
  if (!editingSectionId) return;
  setSectionEditError("");
  const startBar = Math.max(1, Math.round(Number(sectionEditStartInput?.value) || 1));
  const endBar = Math.max(startBar, Math.round(Number(sectionEditEndInput?.value) || startBar));
  if (sectionEditStartInput) sectionEditStartInput.value = String(startBar);
  if (sectionEditEndInput) sectionEditEndInput.value = String(endBar);

  const result = updateSectionInList(sections, editingSectionId, {
    symbol: String(sectionEditSymbolInput?.value || "").trim().slice(0, 12),
    label: String(sectionEditLabelInput?.value || "").trim().slice(0, 40),
    startBar,
    endBar
  });
  if (!result.ok) {
    const message = result.error === "overlap"
      ? "Section overlaps an existing section."
      : "Section could not be saved.";
    setSectionEditError(message);
    sectionEditStartInput?.reportValidity();
    return;
  }

  commitSections(result.sections);
  closeSectionEditDialog();
}

function removeSection(sectionId) {
  commitSections(sections.filter((section) => section.id !== sectionId));
}

function practiceStatePayload() {
  return {
    learningStatus: learningStatusSelect?.value || "not_started",
    playbackRate,
    loopStart: loopInputSeconds(loopStart),
    loopEnd: loopInputSeconds(loopEnd),
    loopEnabled: loopEnabled.checked,
    countInBars: Number(countInBars?.value) || 0,
    startAtBarOne: Boolean(startAtBarOne?.checked),
    lastPosition: transportTime(),
    metronomeEnabled,
    metronomeVolume,
    metronomeAccent: true,
    metronomeSolo,
    gridOverrides,
    tempoMap,
    keyOverride,
    chordChart,
    sections,
    harmonyView,
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
}

function queuePracticeStatePersist(refreshLibrary = false) {
  if (!currentJobId) return;

  if (persistTimer) {
    window.clearTimeout(persistTimer);
  }

  practicePersistVersion += 1;
  pendingPracticeStatePersist = {
    jobId: currentJobId,
    body: JSON.stringify(practiceStatePayload()),
    refreshLibrary: refreshLibrary || pendingPracticeStatePersist?.refreshLibrary || false,
    version: practicePersistVersion
  };
  setPracticeSaveStatus("saving");

  persistTimer = window.setTimeout(() => {
    void flushPendingPracticeState();
  }, 200);
}

function flushPendingPracticeState() {
  if (persistTimer) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  const pending = pendingPracticeStatePersist;
  pendingPracticeStatePersist = null;
  if (!pending) return practicePersistChain;

  practicePersistChain = practicePersistChain.then(
    () => persistPracticeState(pending),
    () => persistPracticeState(pending)
  );
  return practicePersistChain;
}

async function persistPracticeState(pending) {
  try {
    const response = await fetch(`/api/jobs/${pending.jobId}/practice-state`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: pending.body
    });
    if (!response.ok) {
      throw new Error("Could not save practice settings.");
    }
    const savedJob = await response.json();
    if (currentJobId === pending.jobId && practicePersistVersion === pending.version) {
      currentJob = savedJob;
      setPracticeSaveStatus("saved");
    }
    if (pending.refreshLibrary) {
      await loadLibrary();
    }
    return true;
  } catch (error) {
    console.error(error);
    if (!pendingPracticeStatePersist && practicePersistVersion === pending.version) {
      pendingPracticeStatePersist = pending;
    }
    if (currentJobId === pending.jobId && practicePersistVersion === pending.version) {
      setPracticeSaveStatus("error");
    }
    return false;
  }
}

function applySavedPracticeState(job) {
  const state = job?.practiceState || {};
  gridOverrides = normalizedGridOverrides(state);
  tempoMap = normalizeTempoMap(state.tempoMap);
  keyOverride = normalizedKeyOverride(state);
  chordChart = normalizedChordChart(state);
  sections = normalizedSections(state);
  harmonyView = normalizedHarmonyView(state);
  if (chordDisplaySelect) {
    chordDisplaySelect.value = harmonyView.chordDisplay;
  }
  if (barsPerRowSelect) {
    barsPerRowSelect.value = String(harmonyView.barsPerRow);
  }
  if (sectionInfoToggle) {
    sectionInfoToggle.checked = harmonyView.sectionInfoVisible;
  }
  clearSelectedSectionRange({ render: false });
  playbackRate = Number(state.playbackRate) || 1;
  loopStart.dataset.loopMode = "seconds";
  loopEnd.dataset.loopMode = "seconds";
  loopStart.value = String(Number(state.loopStart) || 0);
  loopEnd.value = String(Number(state.loopEnd) || 4);
  loopEnabled.checked = Boolean(state.loopEnabled);
  updateLoopSettingsVisibility();
  if (countInBars) {
    countInBars.value = String(Number(state.countInBars ?? 0));
  }
  if (startAtBarOne) {
    startAtBarOne.checked = Boolean(state.startAtBarOne);
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
    void selectQueueJob(item.queueJob);
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
    const [response, jobsResponse] = await Promise.all([
      fetch("/api/library"),
      fetch("/api/jobs")
    ]);
    if (response.status === 404) {
      throw new Error("Restart the backend to enable the processed song library.");
    }
    if (!response.ok) throw new Error("Could not load processed song library.");
    const entries = await response.json();
    if (jobsResponse.ok) {
      recoverPersistedJobs(await jobsResponse.json());
    } else {
      console.error("Could not restore active and failed jobs.");
    }
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
  if (!(await flushPendingPracticeState())) return;
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
  tempoMap = normalizeTempoMap(job.practiceState?.tempoMap);
  keyOverride = normalizedKeyOverride(job.practiceState);
  chordChart = normalizedChordChart(job.practiceState);
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
  setPracticeSaveStatus("saved");
  renderSongList();
  setTimingEditMode(false);
  void loadWaveform(job.result.waveformUrl);
}

function renderMetadata(metadata) {
  currentAnalyzedMetadata = metadata;
  currentMetadata = effectiveMetadata(metadata);
  updateKeyControl();
  updateHarmonyViewControls();
  updateHarmonyReanalysisControls();
  updateSuppressedSuggestionControls();
  updateTempoControl();
  updateGridCorrectionControls();
  updateLoopControlMode();
  renderGridTimeline(currentMetadata);

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  chordList.replaceChildren(...renderChordGrid(currentMetadata.chords, grid));
}

function updateHarmonyReanalysisControls(message = "") {
  const available = currentJob?.mode === "real" && Boolean(tempoMap);
  if (reanalyzeHarmonyButton) {
    reanalyzeHarmonyButton.hidden = !available;
    reanalyzeHarmonyButton.disabled = harmonyReanalysisPending;
    reanalyzeHarmonyButton.textContent = harmonyReanalysisPending ? "Analysing…" : "Reanalyse chords";
  }
  if (!harmonyAnalysisStatus) return;
  const completed = currentAnalyzedMetadata?.correctedTimingAnalysis;
  const status = message || (completed
    ? `Reanalysed from corrected timing · ${completed.chords?.length || 0} chord cues · ${keyLabel(completed)}`
    : "");
  harmonyAnalysisStatus.textContent = status;
  harmonyAnalysisStatus.hidden = !status;
}

function recoverableSuppressedSuggestions() {
  const grid = currentChartGrid();
  return (currentMetadata?.suppressedChordSuggestions || []).filter(
    (suggestion) => !chordChartContainsCue(chordChart, grid, suggestion)
  );
}

function renderSuppressedSuggestionsDialog() {
  if (!suppressedSuggestionsList) return;
  const suggestions = recoverableSuppressedSuggestions();
  if (!suggestions.length) {
    const empty = document.createElement("p");
    empty.className = "harmony-analysis-status";
    empty.textContent = "All hidden suggestions have been reviewed or added.";
    suppressedSuggestionsList.replaceChildren(empty);
    return;
  }

  suppressedSuggestionsList.replaceChildren(...suggestions.map((suggestion, index) => {
    const row = document.createElement("div");
    row.className = "suppressed-suggestion-row";

    const label = document.createElement("span");
    label.className = "suppressed-suggestion-label";
    const name = document.createElement("strong");
    name.textContent = suggestion.roman
      ? `${suggestion.name} · ${suggestion.roman}`
      : suggestion.name;
    const position = document.createElement("span");
    position.textContent = `Bar ${suggestion.bar}, beat ${formatBeatNumber(suggestion.beat)}`;
    label.append(name, position);

    const add = document.createElement("button");
    add.type = "button";
    add.className = "secondary-button compact-button";
    add.dataset.suppressedSuggestionIndex = String(index);
    add.dataset.testid = `recover-suppressed-${index}`;
    add.textContent = "Add";
    add.setAttribute("aria-label", `Add ${suggestion.name} at bar ${suggestion.bar}, beat ${formatBeatNumber(suggestion.beat)}`);

    row.append(label, add);
    return row;
  }));
}

function updateSuppressedSuggestionControls() {
  const count = recoverableSuppressedSuggestions().length;
  if (suppressedSuggestionsButton) {
    suppressedSuggestionsButton.hidden = count === 0;
    suppressedSuggestionsButton.textContent = count === 1
      ? "Review 1 hidden chord"
      : `Review ${count} hidden chords`;
  }
  renderSuppressedSuggestionsDialog();
}

function openSuppressedSuggestionsDialog() {
  if (!suppressedSuggestionsDialog) return;
  renderSuppressedSuggestionsDialog();
  suppressedSuggestionsDialog.showModal();
}

function recoverSuppressedSuggestion(index) {
  const suggestion = recoverableSuppressedSuggestions()[index];
  if (!suggestion) return;
  seedChordChart();
  commitChordChart(recoverChordCueInChart(chordChart, currentChartGrid(), suggestion));
}

async function reanalyzeHarmonyFromCorrectedTiming() {
  if (!currentJobId || harmonyReanalysisPending || currentJob?.mode !== "real" || !tempoMap) return;
  const existingCount = chordChart?.chords?.length || 0;
  const keyBasis = keyOverride
    ? ` The selected key ${keyOverride.tonic} ${keyOverride.mode} will be used as the analysis key.`
    : " The key will be estimated because no user key is selected.";
  const warning = existingCount
    ? `Reanalyse chords from the corrected timing and replace the current working chart with new suggestions? The current chart has ${existingCount} chord events and will be kept as a backup.${keyBasis}`
    : `Reanalyse chords from the corrected timing and replace the current suggestions?${keyBasis}`;
  if (!window.confirm(warning)) return;
  if (!(await flushPendingPracticeState())) return;

  harmonyReanalysisPending = true;
  let failureMessage = "";
  updateHarmonyReanalysisControls("Analysing source audio with corrected bar boundaries…");
  try {
    const response = await fetch(`/api/jobs/${currentJobId}/reanalyze-harmony`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ replaceWorkingChart: true })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Chord reanalysis failed.");
    currentJob = payload;
    gridOverrides = normalizedGridOverrides(payload.practiceState);
    tempoMap = normalizeTempoMap(payload.practiceState?.tempoMap);
    keyOverride = normalizedKeyOverride(payload.practiceState);
    chordChart = normalizedChordChart(payload.practiceState);
    renderMetadata(payload.result.metadata);
    updateSelectedSongMeta();
    setPracticeSaveStatus("saved");
    await loadLibrary();
  } catch (error) {
    console.error(error);
    failureMessage = error.message || "Chord reanalysis failed.";
  } finally {
    harmonyReanalysisPending = false;
    updateHarmonyReanalysisControls(failureMessage);
  }
}

function updateHarmonyViewControls() {
  if (chordDisplaySelect && chordDisplaySelect.value !== harmonyView.chordDisplay) {
    chordDisplaySelect.value = harmonyView.chordDisplay;
  }
  if (barsPerRowSelect && barsPerRowSelect.value !== String(harmonyView.barsPerRow)) {
    barsPerRowSelect.value = String(harmonyView.barsPerRow);
  }
  if (sectionInfoToggle && sectionInfoToggle.checked !== harmonyView.sectionInfoVisible) {
    sectionInfoToggle.checked = harmonyView.sectionInfoVisible;
  }
  updateSectionSelectionControls();
}

function activeLoopBeatRange(grid) {
  if (!loopEnabled?.checked || !grid || !Number.isFinite(grid.beatDurationSeconds) || grid.beatDurationSeconds <= 0) {
    return null;
  }

  const start = loopInputSeconds(loopStart);
  const end = loopInputSeconds(loopEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  return {
    startBeat: Math.max(0, secondsToAbsoluteBeat(grid, start)),
    endBeat: Math.max(0, secondsToAbsoluteBeat(grid, end))
  };
}

function activeLoopBarRange() {
  if (!loopEnabled?.checked || loopStart?.dataset.loopMode !== "bars") return null;
  const startBar = Math.max(1, Math.round(Number(loopStart?.value) || 1));
  const endBar = Math.max(startBar, Math.round(Number(loopEnd?.value) || startBar));
  return { startBar, endBar };
}

function loopGridRangeForBar(bar, grid, beatsPerBar) {
  const range = activeLoopBeatRange(grid);
  if (!range) return null;

  const barStartBeat = (bar - 1) * beatsPerBar;
  const barEndBeat = barStartBeat + beatsPerBar;
  const startBeat = Math.max(barStartBeat, range.startBeat);
  const endBeat = Math.min(barEndBeat, range.endBeat);
  if (endBeat <= startBeat) return null;

  const startCell = Math.min(beatsPerBar, Math.max(1, Math.floor(startBeat - barStartBeat + 0.001) + 1));
  const endBoundary = Math.min(beatsPerBar + 1, Math.max(startCell + 1, Math.ceil(endBeat - barStartBeat - 0.001) + 1));
  return { startCell, endBoundary };
}

function renderChordGrid(chords, grid) {
  const chartGrid = fallbackChartGrid(grid);
  const beatsPerBar = Math.max(1, Math.round(Number(chartGrid.beatsPerBar) || defaultTimeSignature.beatsPerBar));
  const barsPerRow = harmonyView.barsPerRow;
  const entriesByBar = new Map();
  let highestChordBar = 1;
  let highestSectionBar = 1;

  chords.forEach((chord, index) => {
    const hit = chordGridHit(chord, chartGrid);
    const beatCell = Math.min(beatsPerBar, Math.max(1, Math.floor(hit.beat - 1 + 0.001) + 1));
    highestChordBar = Math.max(highestChordBar, hit.bar);
    const row = entriesByBar.get(hit.bar) || [];
    row.push({ chord, index, hit, beatCell });
    entriesByBar.set(hit.bar, row);
  });

  const finalBeat = chartGrid.durationSeconds ? secondsToAbsoluteBeat(chartGrid, chartGrid.durationSeconds) : null;
  const gridBarCount = Number.isFinite(finalBeat)
    ? Math.ceil(Math.max(1, finalBeat) / beatsPerBar)
    : 1;
  for (const section of sections) {
    highestSectionBar = Math.max(highestSectionBar, section.endBar);
  }

  const barCount = Math.max(highestChordBar, highestSectionBar, gridBarCount);
  const rows = [];
  for (let startBar = 1; startBar <= barCount; startBar += barsPerRow) {
    const rowBars = [];
    for (let bar = startBar; bar < startBar + barsPerRow && bar <= barCount; bar += 1) {
      rowBars.push(bar);
    }
    rows.push(renderChordChartRow(rowBars, entriesByBar, chartGrid, beatsPerBar, barsPerRow));
  }
  return rows;
}

function renderChordChartRow(bars, entriesByBar, grid, beatsPerBar, barsPerRow) {
  const row = document.createElement("div");
  row.className = "chord-chart-row";
  row.style.setProperty("--bars-per-row", String(barsPerRow));
  const rowStartBar = bars[0] || 1;
  const rowEndBar = bars[bars.length - 1] || rowStartBar;
  row.dataset.rowStartBar = String(rowStartBar);
  row.dataset.rowEndBar = String(rowEndBar);
  row.classList.toggle("section-info-visible", harmonyView.sectionInfoVisible);

  const sectionBands = harmonyView.sectionInfoVisible ? renderSectionBandsForRow(rowStartBar, rowEndBar) : [];
  row.classList.toggle("has-section-row", sectionBands.length > 0);

  const segments = bars.map((bar, index) => {
    const segment = renderChordBarSegment(bar, entriesByBar.get(bar) || [], grid, beatsPerBar);
    segment.style.gridColumn = String(index + 1);
    segment.style.gridRow = "1";
    return segment;
  });

  row.append(...segments, ...sectionBands, ...renderLoopRegionsForRow(rowStartBar, rowEndBar));
  return row;
}

function chordEntrySpan(entry, entries, grid, beatsPerBar) {
  const absoluteStartBeat = (entry.hit.bar - 1) * beatsPerBar + (entry.beatCell - 1);
  const range = chordBeatRange(entry.chord, grid);
  const rawSpan = range
    ? Math.ceil(Math.max(1, range.endBeat - absoluteStartBeat - 0.001))
    : 1;
  const nextEntry = entries
    .filter((candidate) => candidate.beatCell > entry.beatCell)
    .sort((left, right) => left.beatCell - right.beatCell)[0];
  const nextLimit = nextEntry ? nextEntry.beatCell - entry.beatCell : beatsPerBar - entry.beatCell + 1;
  return Math.max(1, Math.min(rawSpan, nextLimit, beatsPerBar - entry.beatCell + 1));
}

function sectionForBar(bar) {
  return sections.find((section) => bar >= section.startBar && bar <= section.endBar) || null;
}

function rangeChunkForRow(startBar, endBar, rowStartBar, rowEndBar) {
  const chunkStartBar = Math.max(startBar, rowStartBar);
  const chunkEndBar = Math.min(endBar, rowEndBar);
  if (chunkEndBar < chunkStartBar) return null;

  return {
    startBar: chunkStartBar,
    endBar: chunkEndBar,
    startColumn: chunkStartBar - rowStartBar + 1,
    endColumn: chunkEndBar - rowStartBar + 2
  };
}

function renderSectionBandsForRow(rowStartBar, rowEndBar) {
  return sections
    .map((section) => {
      const chunk = rangeChunkForRow(section.startBar, section.endBar, rowStartBar, rowEndBar);
      return chunk ? renderSectionBand(section, chunk) : null;
    })
    .filter(Boolean);
}

function renderSectionBand(section, chunk) {
  const band = document.createElement("div");
  band.className = "section-band";
  band.dataset.sectionId = section.id;
  if (section.colorKey) {
    band.dataset.sectionColor = section.colorKey;
  }
  band.dataset.rangeStart = String(chunk.startBar);
  band.dataset.rangeEnd = String(chunk.endBar);
  band.dataset.testid = `section-band-${chunk.startBar}`;
  band.style.gridColumn = `${chunk.startColumn} / ${chunk.endColumn}`;
  band.style.gridRow = "1";

  const isFirstChunk = chunk.startBar === section.startBar;
  if (isFirstChunk) {
    const text = sectionDisplayText(section);
    if (text) {
      const label = document.createElement("span");
      label.className = "section-band-label";
      label.textContent = text;
      band.append(label);
    }
  } else {
    band.setAttribute("aria-label", sectionAccessibleText(section));
  }

  if (isFirstChunk) {
    band.setAttribute("aria-label", sectionAccessibleText(section));

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.sectionAction = "edit";
    editButton.dataset.sectionId = section.id;
    editButton.dataset.testid = `section-edit-${section.startBar}`;
    editButton.setAttribute("aria-label", `Edit ${sectionAccessibleText(section)}`);
    editButton.setAttribute("title", "Edit section");
    editButton.textContent = "Edit";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.dataset.sectionAction = "remove";
    removeButton.dataset.sectionId = section.id;
    removeButton.dataset.testid = `section-remove-${section.startBar}`;
    removeButton.setAttribute("aria-label", `Remove ${sectionAccessibleText(section)}`);
    removeButton.textContent = "x";

    band.append(editButton, removeButton);
  }

  return band;
}

function renderLoopRegionsForRow(rowStartBar, rowEndBar) {
  const loopBars = activeLoopBarRange();
  if (!loopBars) return [];

  const chunk = rangeChunkForRow(loopBars.startBar, loopBars.endBar, rowStartBar, rowEndBar);
  return chunk ? [renderChordLoopRegion(chunk, loopBars)] : [];
}

function renderChordBarSegment(bar, entries, grid, beatsPerBar) {
  const segment = document.createElement("div");
  segment.className = "chord-bar-segment";
  segment.dataset.bar = String(bar);
  segment.style.setProperty("--beats-per-bar", String(beatsPerBar));
  segment.style.setProperty("--beat-width", `${100 / beatsPerBar}%`);
  const activeSection = sectionForBar(bar);
  const selectedForSection = Boolean(selectedSectionRange && bar >= selectedSectionRange.startBar && bar <= selectedSectionRange.endBar);
  segment.classList.toggle("has-section", harmonyView.sectionInfoVisible && Boolean(activeSection));
  segment.classList.toggle("section-selected", harmonyView.sectionInfoVisible && selectedForSection);
  segment.classList.toggle("section-selection-start", harmonyView.sectionInfoVisible && selectedSectionRange?.startBar === bar);
  segment.classList.toggle("section-selection-end", harmonyView.sectionInfoVisible && selectedSectionRange?.endBar === bar);
  if (activeSection) {
    segment.dataset.sectionId = activeSection.id;
  }

  const barNumber = document.createElement("span");
  barNumber.className = "chord-bar-number";
  barNumber.textContent = String(bar);

  const loopRange = loopGridRangeForBar(bar, grid, beatsPerBar);

  const sortedEntries = entries.sort((left, right) => left.hit.beat - right.hit.beat || left.index - right.index);
  const occupiedCells = new Set();
  const cards = sortedEntries.map((entry) => {
    const span = chordEntrySpan(entry, sortedEntries, grid, beatsPerBar);
    for (let beat = entry.beatCell; beat < entry.beatCell + span && beat <= beatsPerBar; beat += 1) {
      occupiedCells.add(beat);
    }
    const card = renderChordCard(entry.chord, entry.index, grid, entry.hit);
    card.style.gridColumn = `${entry.beatCell} / span ${span}`;
    card.style.gridRow = "1";
    return card;
  });

  const addButtons = Array.from({ length: beatsPerBar }, (_, index) => {
    const beat = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chord-add-cell";
    button.dataset.chordAction = "add-at-cell";
    button.dataset.bar = String(bar);
    button.dataset.beat = String(beat);
    button.dataset.testid = `chord-add-${bar}-${beat}`;
    button.setAttribute("aria-label", `Add chord in bar ${bar}, beat ${beat}`);
    button.textContent = "+";
    button.style.gridColumn = String(beat);
    button.style.gridRow = "1";
    button.hidden = occupiedCells.has(beat);
    return button;
  });

  segment.classList.toggle("loop-active", Boolean(loopRange));
  segment.append(barNumber);
  if (harmonyView.sectionInfoVisible && !activeSection) {
    segment.append(renderSectionAddButton(bar));
  }
  segment.append(...addButtons, ...cards);
  return segment;
}

function renderSectionAddButton(bar) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-add-bar";
  button.dataset.sectionAction = "create-at-bar";
  button.dataset.bar = String(bar);
  button.dataset.testid = `section-add-bar-${bar}`;
  button.setAttribute("aria-label", `Create section at bar ${bar}`);
  button.setAttribute("title", "Create section");
  button.textContent = "+";
  return button;
}

function renderChordLoopRegion(chunk, loopBars) {
  const region = document.createElement("div");
  region.className = "chord-loop-region";
  region.dataset.loopAction = "move";
  region.dataset.rangeStart = String(chunk.startBar);
  region.dataset.rangeEnd = String(chunk.endBar);
  region.dataset.testid = `chord-loop-region-${chunk.startBar}`;
  region.style.gridColumn = `${chunk.startColumn} / ${chunk.endColumn}`;
  region.style.gridRow = "1";

  if (loopBars?.startBar === chunk.startBar) {
    region.append(renderChordLoopHandle("start", loopBars.startBar));
  }
  if (loopBars?.endBar === chunk.endBar) {
    region.append(renderChordLoopHandle("end", loopBars.endBar));
  }
  return region;
}

function renderChordLoopHandle(action, bar) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = `chord-loop-handle chord-loop-${action}`;
  handle.dataset.loopAction = action;
  handle.dataset.bar = String(bar);
  handle.dataset.testid = `chord-loop-${action}-${bar}`;
  handle.setAttribute("aria-label", action === "start" ? "Move loop start" : "Move loop end");
  handle.setAttribute("title", action === "start" ? "Move loop start" : "Move loop end");
  return handle;
}

function renderChordCard(chord, index, grid, hit = null) {
  const card = document.createElement("div");
  card.className = "chord-card";
  card.dataset.index = String(index);
  card.dataset.testid = `chord-card-${index}`;
  card.draggable = true;
  const position = hit || chordGridHit(chord, grid);
  card.dataset.bar = String(position.bar);
  card.dataset.beat = formatBeatNumber(position.beat);
  card.classList.toggle("user-edited", chord.source === "user");

  const nameInput = document.createElement("input");
  nameInput.className = "cue-name-input";
  nameInput.value = chord.name;
  nameInput.dataset.chordAction = "name";
  nameInput.dataset.index = String(index);
  nameInput.dataset.testid = `chord-name-${index}`;
  nameInput.setAttribute("aria-label", `Chord ${index + 1} name`);

  const roman = document.createElement("span");
  roman.className = "cue-roman";
  roman.textContent = chord.roman;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "chord-delete-button";
  deleteButton.dataset.chordAction = "delete";
  deleteButton.dataset.index = String(index);
  deleteButton.dataset.testid = `chord-delete-${index}`;
  deleteButton.setAttribute("aria-label", `Delete chord ${index + 1}`);
  deleteButton.textContent = "x";

  const resizeHandle = document.createElement("button");
  resizeHandle.type = "button";
  resizeHandle.className = "chord-resize-handle";
  resizeHandle.dataset.chordAction = "resize";
  resizeHandle.dataset.index = String(index);
  resizeHandle.dataset.testid = `chord-resize-${index}`;
  resizeHandle.setAttribute("aria-label", `Resize chord ${index + 1}`);
  resizeHandle.setAttribute("title", "Resize chord");

  if (harmonyView.chordDisplay !== "roman") {
    card.append(nameInput);
  }
  if (harmonyView.chordDisplay !== "name") {
    card.append(roman);
  }
  card.append(deleteButton, resizeHandle);
  return card;
}

function currentChartGrid() {
  return fallbackChartGrid(normalizedBeatGrid(currentMetadata, transportDuration()));
}

function seedChordChart() {
  chordChart = seedChordChartState({
    chordChart,
    sourceChords: currentMetadata?.chords || [],
    grid: currentChartGrid()
  });
}

function commitChordChart(nextChart) {
  chordChart = normalizedChordChart({ chordChart: nextChart });
  if (currentJob?.practiceState) {
    currentJob.practiceState.chordChart = chordChart;
    delete currentJob.practiceState.chordEdits;
  }
  renderMetadata(currentAnalyzedMetadata);
  queuePracticeStatePersist();
}

function deleteChord(index) {
  seedChordChart();
  commitChordChart(deleteChordFromChart(chordChart, index));
}

function updateChordName(index, value) {
  seedChordChart();
  commitChordChart(updateChordNameInChart(chordChart, index, value));
}

function addChordAtCell(bar, beat) {
  seedChordChart();
  commitChordChart(addChordAtCellToChart(chordChart, currentChartGrid(), bar, beat));
}

function moveChordToCell(index, bar, beat) {
  seedChordChart();
  commitChordChart(moveChordToCellInChart(chordChart, currentChartGrid(), index, bar, beat));
}

function resizeChordToBeatBoundary(index, bar, boundaryBeat) {
  seedChordChart();
  commitChordChart(resizeChordToBeatBoundaryInChart(chordChart, currentChartGrid(), index, bar, boundaryBeat));
}

function chordResizeBoundaryFromPointer(state, clientX) {
  const rect = state.segment.getBoundingClientRect();
  const beatsPerBar = Number(getComputedStyle(state.segment).getPropertyValue("--beats-per-bar")) || defaultTimeSignature.beatsPerBar;
  const ratio = (clientX - rect.left) / Math.max(1, rect.width);
  return clampedInteger(Math.round(ratio * beatsPerBar), 1, 1, beatsPerBar);
}

function chordCardGridStart(card) {
  const explicitStart = String(card.style.gridColumn || "").match(/^\s*(\d+)\s*\//)?.[1];
  const fallbackStart = Math.floor(Number(card.dataset.beat) || 1);
  return clampedInteger(explicitStart || fallbackStart, 1, 1, maxChordChartDivisions);
}

function chordCardGridSpan(card) {
  const explicitSpan = String(card.style.gridColumn || "").match(/span\s+(\d+)/)?.[1];
  return clampedInteger(explicitSpan, 1, 1, maxChordChartDivisions);
}

function setChordResizeCoveredCells(segment, resizingCard, previewSpan) {
  const beatsPerBar = Number(getComputedStyle(segment).getPropertyValue("--beats-per-bar")) || defaultTimeSignature.beatsPerBar;
  const occupiedCells = new Set();
  for (const card of segment.querySelectorAll(".chord-card")) {
    const start = chordCardGridStart(card);
    const span = card === resizingCard ? previewSpan : chordCardGridSpan(card);
    for (let beat = start; beat < start + span && beat <= beatsPerBar; beat += 1) {
      occupiedCells.add(beat);
    }
  }
  for (const button of segment.querySelectorAll(".chord-add-cell")) {
    button.hidden = occupiedCells.has(Number(button.dataset.beat));
  }
}

function updateChordResizePreview(state, boundaryBeat) {
  const beatsPerBar = Number(getComputedStyle(state.segment).getPropertyValue("--beats-per-bar")) || defaultTimeSignature.beatsPerBar;
  const start = state.startBeatCell;
  const nextStart = [...state.segment.querySelectorAll(".chord-card")]
    .filter((card) => card !== state.card)
    .map(chordCardGridStart)
    .filter((candidateStart) => candidateStart > start)
    .sort((left, right) => left - right)[0];
  const maxSpan = Math.max(1, (nextStart || beatsPerBar + 1) - start);
  const requestedSpan = Number(boundaryBeat) - start + 1;
  const previewSpan = Math.max(1, Math.min(requestedSpan, maxSpan, beatsPerBar - start + 1));
  state.card.style.gridColumn = `${start} / span ${previewSpan}`;
  setChordResizeCoveredCells(state.segment, state.card, previewSpan);
}

function clearChordResizePreview(restore = false) {
  if (!chordResizeState) return;
  chordResizeState.card.classList.remove("resizing");
  if (restore && currentAnalyzedMetadata) {
    renderMetadata(currentAnalyzedMetadata);
  }
  chordResizeState = null;
}

function setLoopBarInputs(startBar, endBar) {
  if (!loopStart || !loopEnd) return;
  const safeStart = Math.max(1, Math.round(Number(startBar) || 1));
  const safeEnd = Math.max(safeStart, Math.round(Number(endBar) || safeStart));
  loopStart.value = String(safeStart);
  loopEnd.value = String(safeEnd);
  loopEnabled.checked = true;
  updateLoopSettingsVisibility();
  renderTimelineIndicators();
}

function loopBarFromPointer(clientX, clientY) {
  const segments = [...(chordList?.querySelectorAll(".chord-bar-segment") || [])];
  const segment = segments.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  });
  const bar = Number(segment?.dataset.bar);
  return Number.isFinite(bar) && bar > 0 ? Math.round(bar) : null;
}

function loopDragRangeForTarget(state, targetBar) {
  if (state.action === "start") {
    return { startBar: Math.min(targetBar, state.endBar), endBar: state.endBar };
  }

  if (state.action === "end") {
    return { startBar: state.startBar, endBar: Math.max(targetBar, state.startBar) };
  }

  const nextStart = Math.max(1, targetBar);
  return { startBar: nextStart, endBar: nextStart + state.lengthBars - 1 };
}

function clearLoopDragPreview() {
  chordList?.querySelectorAll(".chord-loop-preview-region").forEach((element) => element.remove());
  chordList?.querySelectorAll(".loop-preview-active, .loop-preview-start, .loop-preview-end").forEach((element) => {
    element.classList.remove("loop-preview-active", "loop-preview-start", "loop-preview-end");
  });
}

function renderLoopDragPreview(startBar, endBar) {
  clearLoopDragPreview();
  if (!Number.isFinite(startBar) || !Number.isFinite(endBar)) return;

  for (const row of chordList?.querySelectorAll(".chord-chart-row") || []) {
    const rowStartBar = Number(row.dataset.rowStartBar);
    const rowEndBar = Number(row.dataset.rowEndBar);
    if (!Number.isFinite(rowStartBar) || !Number.isFinite(rowEndBar)) continue;
    const chunk = rangeChunkForRow(startBar, endBar, rowStartBar, rowEndBar);
    if (!chunk) continue;

    const preview = document.createElement("div");
    preview.className = "chord-loop-preview-region";
    preview.dataset.testid = `chord-loop-preview-${chunk.startBar}`;
    preview.style.gridColumn = `${chunk.startColumn} / ${chunk.endColumn}`;
    preview.style.gridRow = "1";

    row.classList.add("loop-preview-active");
    row.classList.toggle("loop-preview-start", chunk.startBar === startBar);
    row.classList.toggle("loop-preview-end", chunk.endBar === endBar);
    row.append(preview);
  }
}

function updateLoopDragFromPointer(state, clientX, clientY) {
  const targetBar = loopBarFromPointer(clientX, clientY);
  if (!targetBar) return;

  const nextRange = loopDragRangeForTarget(state, targetBar);
  state.previewStartBar = nextRange.startBar;
  state.previewEndBar = nextRange.endBar;
  setLoopBarInputs(nextRange.startBar, nextRange.endBar);
  renderLoopDragPreview(nextRange.startBar, nextRange.endBar);
}

function finishLoopDrag(cancelled = false) {
  if (!loopDragState) return;
  chordList?.classList.remove("loop-dragging");
  chordList?.querySelectorAll(".chord-loop-region.dragging").forEach((element) => element.classList.remove("dragging"));
  clearLoopDragPreview();
  if (!cancelled) {
    normalizeLoopBarInputs();
    resetMetronomeSchedule();
    if (currentAnalyzedMetadata) {
      renderMetadata(currentAnalyzedMetadata);
    }
    queuePracticeStatePersist();
  } else {
    setLoopBarInputs(loopDragState.startBar, loopDragState.endBar);
    if (currentAnalyzedMetadata) {
      renderMetadata(currentAnalyzedMetadata);
    }
  }
  loopDragState = null;
}

function applyHarmonyView(nextView = {}) {
  harmonyView = normalizedHarmonyView({ harmonyView: { ...harmonyView, ...nextView } });
  if (currentJob?.practiceState) {
    currentJob.practiceState.harmonyView = harmonyView;
  }
  if (currentAnalyzedMetadata) {
    renderMetadata(currentAnalyzedMetadata);
  }
  queuePracticeStatePersist();
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

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  const contextualBpm = tempoMap && grid
    ? localTempoAtSeconds(grid, transportTime())
    : null;
  const displayBpm = roundedBpm(contextualBpm) || roundedBpm(currentMetadata.beatGrid?.bpm);
  const label = displayBpm ? `${displayBpm} BPM` : "";
  tempoControl.hidden = !label;
  tempoDisplay.textContent = label || "Tempo";
  tempoDisplay.classList.toggle("overridden", Boolean(roundedBpm(gridOverrides.bpm)) || Boolean(tempoMap));
  tempoDisplay.setAttribute("aria-label", tempoMap ? "Edit tempo for current segment" : "Edit tempo");
  if (tempoHalf) tempoHalf.disabled = Boolean(tempoMap);
  if (tempoDouble) tempoDouble.disabled = Boolean(tempoMap);
  if (tempoInput && document.activeElement !== tempoInput) {
    tempoInput.value = displayBpm || "";
  }
}

function updateSelectedSongMeta() {
  if (!currentJob || !selectedSongMeta || !currentMetadata) return;
  selectedSongMeta.textContent = `${formatActivityTime(currentJob.createdAt)} - ${jobDurationLabel(currentJob)} - ${keyTempoLabel(currentMetadata)}`;
}

function activeTempoAnchorSegment() {
  const anchors = tempoMap?.anchors || [];
  if (!anchors.length) return null;

  const selectedIndex = anchors.findIndex((anchor) => anchor.bar === selectedTimingAnchorBar);
  if (timingEditMode && selectedIndex >= 0) {
    if (selectedIndex > 0) return { left: anchors[selectedIndex - 1], right: anchors[selectedIndex] };
    if (anchors[1]) return { left: anchors[0], right: anchors[1] };
    return { left: anchors[0], right: null };
  }

  const time = transportTime();
  if (time < anchors[0].timeSeconds) {
    return { left: anchors[0], right: anchors[1] || null };
  }
  for (let index = 0; index < anchors.length - 1; index += 1) {
    if (time < anchors[index + 1].timeSeconds) {
      return { left: anchors[index], right: anchors[index + 1] };
    }
  }
  return { left: anchors.at(-1), right: null };
}

function applyTempoOverride(nextBpm) {
  const bpm = roundedBpm(nextBpm);
  if (!bpm || !currentAnalyzedMetadata) return;

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  const segment = tempoMap && grid ? activeTempoAnchorSegment() : null;
  if (segment) {
    const rightBar = segment.right?.bar || segment.left.bar + 1;
    const beatCount = (rightBar - segment.left.bar) * grid.beatsPerBar;
    const nextRightTime = segment.left.timeSeconds + beatCount * (60 / bpm);
    const nextMap = tempoMapWithAnchor(tempoMap, {
      bar: rightBar,
      timeSeconds: nextRightTime
    });
    if (nextMap) {
      commitTempoMap(nextMap, rightBar);
    } else {
      updateTempoControl();
    }
    return;
  }

  applyGridOverrides({ bpm });
}

function commitTempoMap(nextMap, selectedBar = selectedTimingAnchorBar) {
  tempoMap = normalizeTempoMap(nextMap);
  selectedTimingAnchorBar = tempoMap?.anchors.some((anchor) => anchor.bar === selectedBar) ? selectedBar : null;
  if (currentJob?.practiceState) {
    currentJob.practiceState.tempoMap = tempoMap;
  }
  resetMetronomeSchedule();
  renderMetadata(currentAnalyzedMetadata);
  updateSelectedSongMeta();
  updateTimingAnchorControls();
  queuePracticeStatePersist();
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

  const effectiveGrid = normalizedBeatGrid(currentMetadata, transportDuration());
  gridCorrection.hidden = !effectiveGrid;
  if (!effectiveGrid) return;

  if (meterSelect && document.activeElement !== meterSelect) {
    meterSelect.value = timeSignatureValue(effectiveGrid);
  }
  if (meterSelect) {
    meterSelect.disabled = Boolean(tempoMap);
    meterSelect.title = tempoMap ? "Remove timing corrections before changing time signature." : "";
  }
}

function openTempoInput() {
  if (!tempoInput || !tempoDisplay || !currentMetadata) return;
  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  tempoInput.value = roundedBpm(tempoMap && grid ? localTempoAtSeconds(grid, transportTime()) : currentMetadata.beatGrid?.bpm) || "";
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

async function loadWaveform(url) {
  const requestId = ++waveformLoadId;
  waveformData = null;
  drawWaveform();
  if (!url) return;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Waveform unavailable.");
    const payload = await response.json();
    if (
      requestId !== waveformLoadId ||
      Number(payload?.version) !== 1 ||
      !Number.isFinite(Number(payload?.durationSeconds)) ||
      !Array.isArray(payload?.peaks)
    ) {
      return;
    }
    waveformData = payload;
    drawWaveform();
  } catch (error) {
    if (requestId === waveformLoadId) {
      console.error(error);
    }
  }
}

function drawWaveform() {
  if (!waveformCanvas || !timelineTrack) return;
  const cssWidth = Math.max(1, timelineTrack.clientWidth || timelineViewport?.clientWidth || 720);
  const cssHeight = Math.max(1, timelineTrack.clientHeight || 58);
  const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.max(1, Math.min(16384, Math.round(cssWidth * pixelRatio)));
  const height = Math.max(1, Math.round(cssHeight * pixelRatio));
  if (waveformCanvas.width !== width) waveformCanvas.width = width;
  if (waveformCanvas.height !== height) waveformCanvas.height = height;

  const context = waveformCanvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  const peaks = waveformData?.peaks;
  if (!Array.isArray(peaks) || !peaks.length) return;

  const middle = height / 2;
  context.fillStyle = "rgba(15, 118, 110, 0.58)";
  for (let x = 0; x < width; x += 1) {
    const startIndex = Math.floor((x / width) * peaks.length);
    const endIndex = Math.max(startIndex + 1, Math.ceil(((x + 1) / width) * peaks.length));
    let min = 0;
    let max = 0;
    for (let index = startIndex; index < Math.min(peaks.length, endIndex); index += 1) {
      min = Math.min(min, Number(peaks[index]?.[0]) || 0);
      max = Math.max(max, Number(peaks[index]?.[1]) || 0);
    }
    const top = middle - max * middle * 0.88;
    const bottom = middle - min * middle * 0.88;
    context.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
}

function updateTimelineTrackSize({ anchorRatio = null, viewportX = null } = {}) {
  if (!timelineTrack || !timelineViewport) return;
  const previousWidth = timelineTrack.clientWidth || timelineViewport.clientWidth;
  const resolvedViewportX = Number.isFinite(viewportX) ? viewportX : timelineViewport.clientWidth / 2;
  const resolvedAnchorRatio = Number.isFinite(anchorRatio)
    ? Math.min(1, Math.max(0, anchorRatio))
    : previousWidth > 0
      ? (timelineViewport.scrollLeft + resolvedViewportX) / previousWidth
      : 0;
  timelineTrack.style.width = timingEditMode ? `${Math.max(1, timingZoomFactor) * 100}%` : "100%";
  requestAnimationFrame(() => {
    if (timingEditMode) {
      timelineViewport.scrollLeft = Math.max(0, resolvedAnchorRatio * timelineTrack.clientWidth - resolvedViewportX);
    }
    drawWaveform();
    if (currentMetadata) renderGridTimeline(currentMetadata);
  });
}

function setTimingZoom(nextZoom, { clientX = timelineHoverClientX } = {}) {
  if (!timingEditMode || !timelineViewport || !timelineTrack) return;
  const rect = timelineViewport.getBoundingClientRect();
  const pointerIsOverWaveform = Number.isFinite(clientX) && clientX >= rect.left && clientX <= rect.right;
  const viewportX = pointerIsOverWaveform ? clientX - rect.left : timelineViewport.clientWidth / 2;
  const anchorRatio = pointerIsOverWaveform
    ? (timelineViewport.scrollLeft + viewportX) / Math.max(1, timelineTrack.clientWidth)
    : timelinePercent(transportTime()) / 100;
  timingZoomFactor = Math.min(24, Math.max(1, Number(nextZoom) || 1));
  if (timingZoom) timingZoom.value = String(Math.round(timingZoomFactor));
  updateTimelineTrackSize({ anchorRatio, viewportX });
}

function setTimingEditMode(enabled) {
  timingEditMode = Boolean(enabled && currentMetadata);
  timingViewportState();
  if (!timingEditMode) {
    timingZoomFactor = 1;
    selectedTimingAnchorBar = null;
    timingDragState = null;
    if (timingZoom) timingZoom.value = "1";
    if (timelineViewport) timelineViewport.scrollLeft = 0;
  }
  updateTimelineTrackSize({ anchorRatio: timelinePercent(transportTime()) / 100 });
  updateTimingAnchorControls();
}

function timingViewportState() {
  timelineViewport?.classList.toggle("editing", timingEditMode);
  if (editTimingButton) editTimingButton.hidden = timingEditMode || !currentMetadata;
  if (timingEditorControls) timingEditorControls.hidden = !timingEditMode;
  gridTimeline?.setAttribute("aria-label", timingEditMode
    ? "Editable beat and bar grid over waveform"
    : "Beat and bar grid");
}

function selectedTimingAnchor() {
  const mapped = tempoMap?.anchors.find((anchor) => anchor.bar === selectedTimingAnchorBar);
  if (mapped) return mapped;
  if (selectedTimingAnchorBar === 1 && currentMetadata) {
    const grid = normalizedBeatGrid(currentMetadata, transportDuration());
    const timeSeconds = grid ? musicalPositionToSeconds(grid, { bar: 1, beat: 1 }) : null;
    return Number.isFinite(timeSeconds) ? { bar: 1, timeSeconds } : null;
  }
  return null;
}

function updateTimingAnchorControls() {
  if (timingEditMode && selectedTimingAnchorBar === null) selectedTimingAnchorBar = 1;
  const anchor = selectedTimingAnchor();
  const visible = timingEditMode && Boolean(anchor);
  if (timingAnchorControls) timingAnchorControls.hidden = !visible;
  if (!visible) {
    if (currentMetadata) updateTempoControl();
    return;
  }
  if (timingAnchorLabel) {
    timingAnchorLabel.textContent = `Bar ${anchor.bar}`;
  }
  if (timingAnchorTime && document.activeElement !== timingAnchorTime) {
    timingAnchorTime.value = anchor.timeSeconds.toFixed(3);
  }
  const corrections = [anchor.bar === 1 ? anchor : selectedTimingAnchor()].filter(Boolean);
  for (const candidate of tempoMap?.anchors || []) {
    if (!corrections.some((entry) => entry.bar === candidate.bar)) corrections.push(candidate);
  }
  corrections.sort((left, right) => left.bar - right.bar);
  if (timingCorrectionSelect) {
    timingCorrectionSelect.replaceChildren(...corrections.map((correction) => {
      const option = document.createElement("option");
      option.value = String(correction.bar);
      option.textContent = `Bar ${correction.bar} · ${correction.timeSeconds.toFixed(3)}s`;
      return option;
    }));
    timingCorrectionSelect.value = String(anchor.bar);
  }
  const selectedIndex = corrections.findIndex((correction) => correction.bar === anchor.bar);
  if (timingPreviousAnchor) timingPreviousAnchor.disabled = selectedIndex <= 0;
  if (timingNextAnchor) timingNextAnchor.disabled = selectedIndex < 0 || selectedIndex >= corrections.length - 1;
  if (timingRemoveAnchor) {
    timingRemoveAnchor.disabled = !tempoMap;
    timingRemoveAnchor.textContent = anchor.bar === 1 ? "Reset corrections" : "Remove correction";
  }
  updateTempoControl();
}

function selectTimingCorrection(bar) {
  const nextBar = Number(bar);
  if (!Number.isInteger(nextBar)) return;
  selectedTimingAnchorBar = nextBar;
  renderGridTimeline(currentMetadata);
  updateTimingAnchorControls();
  const marker = gridTimeline?.querySelector(`.grid-marker.downbeat[data-bar="${nextBar}"]`);
  marker?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
}

function moveTimingCorrectionSelection(delta) {
  const bars = [1, ...(tempoMap?.anchors || []).map((anchor) => anchor.bar).filter((bar) => bar !== 1)]
    .sort((left, right) => left - right);
  const index = bars.indexOf(selectedTimingAnchorBar);
  selectTimingCorrection(bars[Math.min(bars.length - 1, Math.max(0, index + delta))]);
}

function baseTempoMapForEditing(grid) {
  if (tempoMap) return tempoMap;
  const barOneSeconds = musicalPositionToSeconds(grid, { bar: 1, beat: 1 });
  return normalizeTempoMap({
    version: 1,
    anchors: [{ bar: 1, timeSeconds: barOneSeconds }]
  });
}

function placeTimingAnchor(bar, timeSeconds) {
  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  if (!grid) return false;
  if (bar === 1 && !tempoMap) {
    selectedTimingAnchorBar = 1;
    applyGridOverrides({ downbeatOffsetSeconds: timeSeconds });
    updateTimingAnchorControls();
    return true;
  }
  const startingMap = baseTempoMapForEditing(grid);
  const nextMap = tempoMapWithAnchor(startingMap, { bar, timeSeconds });
  if (!nextMap) return false;
  if (bar === 1) {
    gridOverrides = normalizedGridOverrides({
      gridOverrides: { ...gridOverrides, downbeatOffsetSeconds: timeSeconds }
    });
    if (currentJob?.practiceState) currentJob.practiceState.gridOverrides = gridOverrides;
  }
  commitTempoMap(nextMap, bar);
  return true;
}

function nudgeSelectedTimingAnchor(deltaSeconds) {
  const anchor = selectedTimingAnchor();
  if (!anchor) return;
  placeTimingAnchor(anchor.bar, anchor.timeSeconds + Number(deltaSeconds));
}

function removeSelectedTimingAnchor() {
  const anchor = selectedTimingAnchor();
  if (!anchor) return;
  if (anchor.bar === 1) {
    commitTempoMap(null, null);
    return;
  }
  commitTempoMap(tempoMapWithoutAnchor(tempoMap, anchor.bar), null);
}

function timelineSecondsForClientX(clientX) {
  if (!timelineTrack) return 0;
  const rect = timelineTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
  return ratio * transportDuration();
}

function beginTimingMarkerDrag(event, marker) {
  if (!timingEditMode || !marker?.classList.contains("downbeat")) return;
  const bar = Number(marker.dataset.bar);
  if (!Number.isInteger(bar) || bar < 1) return;
  event.preventDefault();
  selectedTimingAnchorBar = tempoMap?.anchors.some((anchor) => anchor.bar === bar) ? bar : null;
  timingDragState = {
    pointerId: event.pointerId,
    bar,
    marker,
    startX: event.clientX,
    moved: false,
    previewSeconds: Number(marker.dataset.time)
  };
  marker.setPointerCapture?.(event.pointerId);
  marker.classList.add("selected");
  updateTimingAnchorControls();
}

function updateTimingMarkerDrag(event) {
  if (!timingDragState || event.pointerId !== timingDragState.pointerId) return;
  const seconds = timelineSecondsForClientX(event.clientX);
  timingDragState.moved ||= Math.abs(event.clientX - timingDragState.startX) > 2;
  timingDragState.previewSeconds = seconds;
  timingDragState.marker.style.left = `${timelinePercent(seconds)}%`;
}

function finishTimingMarkerDrag(event, cancelled = false) {
  if (!timingDragState || event.pointerId !== timingDragState.pointerId) return;
  const state = timingDragState;
  timingDragState = null;
  if (!cancelled && state.moved) {
    suppressTimelineClick = true;
    window.setTimeout(() => {
      suppressTimelineClick = false;
    }, 0);
    if (!placeTimingAnchor(state.bar, state.previewSeconds)) {
      renderGridTimeline(currentMetadata);
    }
  } else {
    placeTimingAnchor(state.bar, Number(state.marker.dataset.time));
  }
}

function renderGridTimeline(metadata) {
  if (!gridTimeline) return;

  timingViewportState();

  const grid = normalizedBeatGrid(metadata, transportDuration());
  gridTimeline.replaceChildren();
  gridTimeline.classList.toggle("empty", !grid);
  if (!grid) return;

  const beats = enumerateBeatTimes(grid, 0, grid.durationSeconds, { paddingBeats: 1 });
  const timelineWidth = timelineTrack?.clientWidth || gridTimeline.clientWidth || 720;
  const visibleBeatCount = Math.max(1, beats.length);
  const beatSpacing = timelineWidth / visibleBeatCount;
  const showBeatMarkers = beatSpacing >= 4;
  const downbeatCount = Math.max(1, Math.ceil(visibleBeatCount / grid.beatsPerBar));
  const rawBarLabelInterval = Math.ceil((downbeatCount * 46) / timelineWidth);
  const barLabelInterval = rawBarLabelInterval <= 1
    ? 1
    : 2 ** Math.ceil(Math.log2(rawBarLabelInterval));

  for (const { beatIndex, timeSeconds: time } of beats) {
    if (time < 0 || time > grid.durationSeconds) continue;

    const beatWithinBar = ((beatIndex % grid.beatsPerBar) + grid.beatsPerBar) % grid.beatsPerBar;
    const isDownbeat = beatWithinBar === 0;
    if (!isDownbeat && !showBeatMarkers) continue;

    const marker = document.createElement("span");
    marker.className = "grid-marker";
    marker.classList.toggle("downbeat", isDownbeat);
    marker.style.left = `${Math.min(100, Math.max(0, (time / grid.durationSeconds) * 100))}%`;
    marker.dataset.time = String(Math.round(time * 1000) / 1000);
    marker.dataset.beat = String(beatWithinBar + 1);

    if (isDownbeat) {
      const barNumber = Math.floor(beatIndex / grid.beatsPerBar) + 1;
      marker.dataset.bar = String(barNumber);
      const anchored = tempoMap?.anchors.some((anchor) => anchor.bar === barNumber);
      marker.classList.toggle("anchored", Boolean(anchored));
      marker.classList.toggle("selected", barNumber === selectedTimingAnchorBar);
      if (timingEditMode) {
        marker.tabIndex = 0;
        marker.setAttribute("role", "button");
        marker.setAttribute("aria-label", `${anchored ? "Adjusted" : "Calculated"} downbeat for bar ${barNumber}`);
      }
      const label = document.createElement("span");
      label.textContent = String(barNumber);
      if (barNumber === 1 || (barNumber > 0 && (barNumber - 1) % barLabelInterval === 0)) {
        marker.append(label);
      }
    }

    gridTimeline.append(marker);
  }

  renderTimelineIndicators();
  drawWaveform();
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

  const start = loopInputSeconds(loopStart);
  const end = loopInputSeconds(loopEnd);
  if (loopEnabled.checked && Number.isFinite(start) && Number.isFinite(end) && end > start) {
    gridTimeline.append(markerElement("loop-marker loop-start-marker", "L", start));
    gridTimeline.append(markerElement("loop-marker loop-end-marker", "R", end));
  }
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ||= new AudioContextClass();
  return audioContext;
}

async function activateAudioContext() {
  const context = ensureAudioContext();
  if (!context || context.state !== "suspended" || typeof context.resume !== "function") {
    return context;
  }

  if (!audioContextActivation) {
    audioContextActivation = Promise.resolve(context.resume())
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        audioContextActivation = null;
      });
  }
  await audioContextActivation;
  return context;
}

function playMetronomeClick(delaySeconds, accented) {
  const context = ensureAudioContext();
  if (!context || context.state === "suspended") return false;

  const volume = Number(metronomeVolume) || 0;
  if (volume <= 0) return false;

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
  return true;
}

function cancelLoopCountIn() {
  if (countInTimer !== null) {
    window.clearTimeout(countInTimer);
    countInTimer = null;
  }
  isCountingIn = false;
}

function countInConfig(targetTime = null, { loopOnly = false } = {}) {
  if ((loopOnly && !loopEnabled.checked) || !currentMetadata) return null;
  const bars = Number(countInBars?.value) || 0;
  if (bars <= 0) return null;

  const start = Number.isFinite(targetTime) ? targetTime : loopInputSeconds(loopStart);
  if (!Number.isFinite(start)) return null;
  if (loopOnly) {
    const end = loopInputSeconds(loopEnd);
    if (!Number.isFinite(end) || end <= start) return null;
  }

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  if (!grid) return null;

  const beats = Math.max(1, Math.round(bars * grid.beatsPerBar));
  const targetBeatIndex = Math.round(secondsToAbsoluteBeat(grid, start));
  const firstBeatIndex = targetBeatIndex - beats;
  const firstBeatTime = absoluteBeatToSeconds(grid, firstBeatIndex);
  const targetBeatTime = absoluteBeatToSeconds(grid, targetBeatIndex);
  const clickOffsetsSeconds = Array.from({ length: beats }, (_, index) =>
    Math.max(0, absoluteBeatToSeconds(grid, firstBeatIndex + index) - firstBeatTime)
  );
  const durationSeconds = Math.max(0.05, targetBeatTime - firstBeatTime);
  return {
    targetTime: boundTransportTime(start),
    beats,
    durationSeconds,
    clickOffsetsSeconds,
    beatsPerBar: grid.beatsPerBar,
    targetBeatIndex
  };
}

function playbackStartSeconds() {
  if (!startAtBarOne?.checked || !currentMetadata) return 0;
  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  const barOne = grid ? musicalPositionToSeconds(grid, { bar: 1, beat: 1 }) : 0;
  return boundTransportTime(Math.max(0, Number(barOne) || 0));
}

function scheduleLoopCountInClicks(config) {
  resetMetronomeSchedule();
  const firstBeatIndex = config.targetBeatIndex - config.beats;
  for (let index = 0; index < config.beats; index += 1) {
    const beatIndex = firstBeatIndex + index;
    const beatWithinBar = ((beatIndex % config.beatsPerBar) + config.beatsPerBar) % config.beatsPerBar;
    const delaySeconds = config.clickOffsetsSeconds[index] / Math.max(0.1, playbackRate);
    playMetronomeClick(delaySeconds, beatWithinBar === 0);
  }
}

async function beginLoopCountIn(countIn) {
  if (!countIn) return false;
  await activateAudioContext();
  for (const player of stemPlayers) {
    player.audio.pause();
  }
  isPlaying = false;
  countInTargetTime = countIn.targetTime;
  isCountingIn = true;
  anchorTransport(countIn.targetTime);
  syncStemTimes(countIn.targetTime);
  stopTransportTick();
  scheduleLoopCountInClicks(countIn);
  updateTimeDisplay();
  highlightCurrentChord();
  playButton.textContent = "||";
  playButton.setAttribute("aria-label", "Pause");

  const delayMs = Math.max(0, (countIn.durationSeconds / Math.max(0.1, playbackRate)) * 1000);
  countInTimer = window.setTimeout(() => {
    countInTimer = null;
    isCountingIn = false;
    startStemPlaybackAt(countIn.targetTime).catch(console.error);
  }, delayMs);
  return true;
}

function scheduleMetronomeClicks(currentTime = transportTime()) {
  if (!metronomeEnabled || !isPlaying || !currentMetadata) return;

  const grid = normalizedBeatGrid(currentMetadata, transportDuration());
  if (!grid) return;

  const lookaheadSeconds = 0.45;
  const startBeatIndex = Math.floor(secondsToAbsoluteBeat(grid, currentTime - 0.04));
  const loopStartSeconds = loopInputSeconds(loopStart);
  const loopEndSeconds = loopInputSeconds(loopEnd);
  const hasActiveLoop =
    loopEnabled.checked &&
    Number.isFinite(loopStartSeconds) &&
    Number.isFinite(loopEndSeconds) &&
    loopEndSeconds > loopStartSeconds &&
    currentTime >= loopStartSeconds - 0.02 &&
    currentTime < loopEndSeconds;
  const scheduleEndTime = hasActiveLoop ? Math.min(grid.durationSeconds, loopEndSeconds) : grid.durationSeconds;
  const endBeatIndex = Math.ceil(secondsToAbsoluteBeat(grid, currentTime + lookaheadSeconds * playbackRate));

  for (let beatIndex = startBeatIndex; beatIndex <= endBeatIndex; beatIndex += 1) {
    const beatTime = absoluteBeatToSeconds(grid, beatIndex);
    if (beatTime < 0 || beatTime < currentTime - 0.06 || beatTime >= scheduleEndTime) continue;
    const key = `${beatIndex}:${Math.round(beatTime * 1000)}`;
    if (scheduledMetronomeBeats.has(key)) continue;

    const beatWithinBar = ((beatIndex % grid.beatsPerBar) + grid.beatsPerBar) % grid.beatsPerBar;
    const accented = beatWithinBar === 0;
    const delaySeconds = (beatTime - currentTime) / Math.max(0.1, playbackRate);
    if (playMetronomeClick(delaySeconds, accented)) {
      scheduledMetronomeBeats.add(key);
    }
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
  if (tempoMap) updateTempoControl();
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
  cancelLoopCountIn();
  const bounded = boundTransportTime(seconds);
  anchorTransport(bounded);
  syncStemTimes(bounded);
  resetMetronomeSchedule();
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

  const start = loopInputSeconds(loopStart);
  const end = loopInputSeconds(loopEnd);
  let current = transportTime();

  if (loopEnabled.checked && Number.isFinite(start) && Number.isFinite(end) && end > start && current >= end) {
    const countIn = countInConfig(start, { loopOnly: true });
    if (countIn) {
      beginLoopCountIn(countIn).catch(console.error);
      return;
    }
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
    setTransportTime(playbackStartSeconds());
    return;
  }

  transportFrame = requestAnimationFrame(tickTransport);
}

function startTransportTick() {
  stopTransportTick();
  transportFrame = requestAnimationFrame(tickTransport);
}

function pauseAll({ persist = true } = {}) {
  const current = isCountingIn ? countInTargetTime : transportTime();
  cancelLoopCountIn();
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

async function startStemPlaybackAt(seconds) {
  if (!stemPlayers.length) return;

  if (metronomeEnabled) {
    await activateAudioContext();
  }

  const current = boundTransportTime(seconds);
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
  } else {
    isPlaying = false;
    playButton.textContent = "▶";
    playButton.setAttribute("aria-label", "Play");
  }
}

async function playAll() {
  if (!stemPlayers.length) return;

  const minimumStart = playbackStartSeconds();
  const current = transportTime();
  const target = startAtBarOne?.checked && current < minimumStart ? minimumStart : current;
  const countIn = countInConfig(target);
  if (countIn) {
    await beginLoopCountIn(countIn);
  } else {
    await startStemPlaybackAt(target);
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
    updateLoopControlMode();
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

function startQueuePolling(queueJob) {
  if (!queueJob?.jobId || queueJob.timer || ["complete", "failed"].includes(queueJob.status)) return;
  queueJob.timer = window.setInterval(() => {
    pollQueueJob(queueJob.localId).catch((error) => {
      console.error(error);
      const latestQueueJob = queueJobs.get(queueJob.localId);
      if (!latestQueueJob) return;
      window.clearInterval(latestQueueJob.timer);
      latestQueueJob.timer = null;
    });
  }, 500);
}

function recoverPersistedJobs(entries) {
  const incompleteIds = new Set(entries.filter((entry) => entry.status !== "complete").map((entry) => entry.id));

  for (const [localId, queueJob] of queueJobs) {
    if (queueJob.recovered && !incompleteIds.has(queueJob.jobId)) {
      removeQueueJob(localId);
    }
  }

  for (const entry of entries) {
    if (entry.status === "complete") continue;
    let queueJob = [...queueJobs.values()].find((candidate) => candidate.jobId === entry.id);
    if (!queueJob) {
      const localId = `persisted-${entry.id}`;
      queueJob = {
        localId,
        filename: entry.originalFilename,
        status: entry.status,
        progress: Number(entry.progress) || 0,
        pipelineStage: entry.pipelineStage || null,
        timer: null,
        jobId: entry.id,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        error: entry.error || null,
        thumbnailDataUrl: entry.thumbnailDataUrl || null,
        recovered: true
      };
      queueJobs.set(localId, queueJob);
    } else {
      queueJob.filename = entry.originalFilename;
      queueJob.status = entry.status;
      queueJob.progress = Number(entry.progress) || 0;
      queueJob.pipelineStage = entry.pipelineStage || null;
      queueJob.updatedAt = entry.updatedAt;
      queueJob.error = entry.error || null;
      queueJob.thumbnailDataUrl = entry.thumbnailDataUrl || queueJob.thumbnailDataUrl || null;
    }
    startQueuePolling(queueJob);
  }
}

async function selectQueueJob(queueJob) {
  if (!(await flushPendingPracticeState())) return;
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
        startQueuePolling(queueJob);
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
  if (isPlaying || isCountingIn) {
    pauseAll();
  } else {
    playAll().catch(console.error);
  }
});

backToStartButton?.addEventListener("click", () => {
  pauseAll({ persist: false });
  setTransportTime(playbackStartSeconds());
});

scrubber.addEventListener("input", () => {
  isSeeking = true;
  const previewTime = Number(scrubber.value);
  anchorTransport(previewTime);
  timeReadout.textContent = `${formatTime(previewTime)} / ${formatDuration(transportDuration())}`;
  renderTimelineIndicators();
  if (tempoMap) updateTempoControl();
});

scrubber.addEventListener("change", () => {
  setTransportTime(Number(scrubber.value));
  isSeeking = false;
});

editTimingButton?.addEventListener("click", () => setTimingEditMode(true));
timingDoneButton?.addEventListener("click", () => setTimingEditMode(false));
timingFitButton?.addEventListener("click", () => {
  timingZoomFactor = 1;
  if (timingZoom) timingZoom.value = "1";
  if (timelineViewport) timelineViewport.scrollLeft = 0;
  updateTimelineTrackSize({ anchorRatio: 0, viewportX: 0 });
});
timingZoom?.addEventListener("input", () => {
  setTimingZoom(Number(timingZoom.value));
});
timingNudgeLeft?.addEventListener("click", () => nudgeSelectedTimingAnchor(-0.01));
timingNudgeRight?.addEventListener("click", () => nudgeSelectedTimingAnchor(0.01));
timingRemoveAnchor?.addEventListener("click", removeSelectedTimingAnchor);
timingCorrectionSelect?.addEventListener("change", () => selectTimingCorrection(timingCorrectionSelect.value));
timingPreviousAnchor?.addEventListener("click", () => moveTimingCorrectionSelection(-1));
timingNextAnchor?.addEventListener("click", () => moveTimingCorrectionSelection(1));
timingAnchorTime?.addEventListener("change", () => {
  const seconds = roundedSeconds(timingAnchorTime.value, minBarStartSeconds, 60 * 60);
  if (seconds !== null) placeTimingAnchor(selectedTimingAnchorBar, seconds);
});
timingAnchorTime?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    timingAnchorTime.dispatchEvent(new Event("change", { bubbles: true }));
    timingAnchorTime.blur();
  }
});

gridTimeline?.addEventListener("pointerdown", (event) => {
  const marker = event.target.closest(".grid-marker.downbeat");
  if (marker) beginTimingMarkerDrag(event, marker);
});
gridTimeline?.addEventListener("pointermove", updateTimingMarkerDrag);
gridTimeline?.addEventListener("pointerup", (event) => finishTimingMarkerDrag(event));
gridTimeline?.addEventListener("pointercancel", (event) => finishTimingMarkerDrag(event, true));
gridTimeline?.addEventListener("click", (event) => {
  if (!timingEditMode || suppressTimelineClick || event.target.closest(".grid-marker.downbeat")) return;
  setTransportTime(timelineSecondsForClientX(event.clientX));
});
gridTimeline?.addEventListener("keydown", (event) => {
  const marker = event.target.closest(".grid-marker.downbeat");
  if (!timingEditMode || !marker || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  const bar = Number(marker.dataset.bar);
  placeTimingAnchor(bar, Number(marker.dataset.time));
});

timelineViewport?.addEventListener("pointerenter", (event) => {
  timelineHoverClientX = event.clientX;
});
timelineViewport?.addEventListener("pointerleave", () => {
  timelineHoverClientX = null;
});
timelineViewport?.addEventListener("pointermove", (event) => {
  timelineHoverClientX = event.clientX;
  if (event.pointerType !== "touch" || !timingTouchPointers.has(event.pointerId)) return;
  timingTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (timingTouchPointers.size < 2 || !timingPinchState) return;
  const [first, second] = [...timingTouchPointers.values()];
  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  const centerX = (first.x + second.x) / 2;
  event.preventDefault();
  setTimingZoom(timingPinchState.zoom * distance / Math.max(1, timingPinchState.distance), { clientX: centerX });
});
timelineViewport?.addEventListener("pointerdown", (event) => {
  if (!timingEditMode || event.pointerType !== "touch") return;
  timingTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (timingTouchPointers.size === 2) {
    const [first, second] = [...timingTouchPointers.values()];
    timingPinchState = {
      distance: Math.hypot(second.x - first.x, second.y - first.y),
      zoom: timingZoomFactor
    };
  }
});
function finishTimingTouch(event) {
  timingTouchPointers.delete(event.pointerId);
  if (timingTouchPointers.size < 2) timingPinchState = null;
}
timelineViewport?.addEventListener("pointerup", finishTimingTouch);
timelineViewport?.addEventListener("pointercancel", finishTimingTouch);
timelineViewport?.addEventListener("wheel", (event) => {
  if (!timingEditMode || (!event.ctrlKey && !event.metaKey)) return;
  event.preventDefault();
  setTimingZoom(timingZoomFactor * Math.exp(-event.deltaY * 0.01), { clientX: event.clientX });
}, { passive: false });

window.addEventListener("resize", () => {
  drawWaveform();
  if (currentMetadata) renderGridTimeline(currentMetadata);
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
    if (metronomeEnabled) {
      activateAudioContext().catch(console.error);
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

reanalyzeHarmonyButton?.addEventListener("click", () => {
  void reanalyzeHarmonyFromCorrectedTiming();
});

suppressedSuggestionsButton?.addEventListener("click", openSuppressedSuggestionsDialog);

suppressedSuggestionsDone?.addEventListener("click", () => suppressedSuggestionsDialog?.close());

suppressedSuggestionsList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-suppressed-suggestion-index]");
  if (!button) return;
  recoverSuppressedSuggestion(Number(button.dataset.suppressedSuggestionIndex));
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

startAtBarOne?.addEventListener("change", () => queuePracticeStatePersist());

meterSelect?.addEventListener("change", () => {
  const signature = parseTimeSignature(meterSelect.value);
  if (signature) {
    applyGridOverrides(signature);
  }
});

chordDisplaySelect?.addEventListener("change", () => {
  applyHarmonyView({ chordDisplay: chordDisplaySelect.value });
});

barsPerRowSelect?.addEventListener("change", () => {
  applyHarmonyView({ barsPerRow: Number(barsPerRowSelect.value) });
});

sectionInfoToggle?.addEventListener("change", () => {
  applyHarmonyView({ sectionInfoVisible: sectionInfoToggle.checked });
});

createSectionButton?.addEventListener("click", () => {
  if (!selectedSectionRangeIsCreatable()) return;
  openSectionCreateDialog(selectedSectionRange);
});

chordList?.addEventListener("click", (event) => {
  const sectionButton = event.target.closest("button[data-section-action]");
  if (sectionButton) {
    event.stopPropagation();
    if (sectionButton.dataset.sectionAction === "edit") {
      openSectionEditDialog(sectionButton.dataset.sectionId);
    } else if (sectionButton.dataset.sectionAction === "remove") {
      removeSection(sectionButton.dataset.sectionId);
    } else if (sectionButton.dataset.sectionAction === "create-at-bar") {
      const bar = Number(sectionButton.dataset.bar);
      const clickedSelectedRange = selectedSectionRange && bar >= selectedSectionRange.startBar && bar <= selectedSectionRange.endBar
        ? selectedSectionRange
        : normalizedSectionRange(bar);
      const range = selectedSectionRangeIsCreatable(clickedSelectedRange) ? clickedSelectedRange : normalizedSectionRange(bar);
      setSelectedSectionRange(range.startBar, range.endBar, range.startBar, { render: false });
      openSectionCreateDialog(range);
    }
    return;
  }

  const button = event.target.closest("button[data-chord-action]");
  if (!button) {
    const segment = event.target.closest(".chord-bar-segment");
    if (segment && !event.target.closest(".chord-card, input")) {
      selectSectionBar(Number(segment.dataset.bar), event.shiftKey);
    }
    return;
  }

  if (button.dataset.chordAction === "add-at-cell") {
    addChordAtCell(Number(button.dataset.bar), Number(button.dataset.beat));
    return;
  }

  const index = Number(button.dataset.index);
  if (Number.isInteger(index) && button.dataset.chordAction === "delete") {
    deleteChord(index);
  }
});

chordList?.addEventListener("dblclick", (event) => {
  if (event.target.closest(".chord-card, button, input")) return;
  const band = event.target.closest(".section-band");
  if (band?.dataset.sectionId) {
    event.preventDefault();
    openSectionEditDialog(band.dataset.sectionId);
    return;
  }

  const segment = event.target.closest(".chord-bar-segment");
  const sectionId = segment?.dataset.sectionId;
  if (!sectionId) return;
  event.preventDefault();
  openSectionEditDialog(sectionId);
});

sectionEditCancel?.addEventListener("click", closeSectionEditDialog);
sectionEditDialog?.addEventListener("cancel", () => {
  editingSectionId = null;
  setSectionEditError("");
});
sectionEditForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveSectionEdit();
});
[sectionEditSymbolInput, sectionEditLabelInput, sectionEditStartInput, sectionEditEndInput].forEach((input) => {
  input?.addEventListener("input", () => setSectionEditError(""));
});

sectionCreateCancel?.addEventListener("click", closeSectionCreateDialog);
sectionCreateDialog?.addEventListener("cancel", () => {
  pendingSectionCreateRange = null;
  setSectionCreateError("");
});
sectionCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  createSectionFromDialog();
});
[sectionCreateSymbolInput, sectionCreateLabelInput, sectionCreateColorInput].forEach((input) => {
  input?.addEventListener("input", () => setSectionCreateError(""));
});

chordList?.addEventListener("dragstart", (event) => {
  if (event.target.closest("input, button")) {
    event.preventDefault();
    return;
  }
  const card = event.target.closest(".chord-card");
  if (!card) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.index);
  card.classList.add("dragging");
});

chordList?.addEventListener("dragend", (event) => {
  event.target.closest(".chord-card")?.classList.remove("dragging");
  chordList.querySelectorAll(".drag-over").forEach((element) => element.classList.remove("drag-over"));
});

chordList?.addEventListener("dragover", (event) => {
  const target = event.target.closest(".chord-add-cell, .chord-bar-segment");
  if (!target) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  target.classList.add("drag-over");
});

chordList?.addEventListener("dragleave", (event) => {
  event.target.closest(".chord-add-cell, .chord-bar-segment")?.classList.remove("drag-over");
});

chordList?.addEventListener("drop", (event) => {
  const target = event.target.closest(".chord-add-cell, .chord-bar-segment");
  if (!target) return;
  event.preventDefault();
  const index = Number(event.dataTransfer.getData("text/plain"));
  if (Number.isInteger(index)) {
    const segment = target.classList.contains("chord-bar-segment") ? target : target.closest(".chord-bar-segment");
    if (!segment) return;
    const bar = Number(target.dataset.bar || segment?.dataset.bar);
    const beatsPerBar = Number(getComputedStyle(segment).getPropertyValue("--beats-per-bar")) || defaultTimeSignature.beatsPerBar;
    const rect = segment.getBoundingClientRect();
    const beat = target.dataset.beat
      ? Number(target.dataset.beat)
      : Math.min(beatsPerBar, Math.max(1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * beatsPerBar) + 1));
    moveChordToCell(index, bar, beat);
  }
});

chordList?.addEventListener("pointerdown", (event) => {
  const loopTarget = event.target.closest("[data-loop-action]");
  if (!loopTarget || event.target.closest(".chord-card, input")) return;
  const loopBars = activeLoopBarRange();
  if (!loopBars || loopStart?.dataset.loopMode !== "bars") return;

  event.preventDefault();
  event.stopPropagation();
  loopTarget.setPointerCapture?.(event.pointerId);
  const action = loopTarget.dataset.loopAction || "move";
  loopDragState = {
    action,
    pointerId: event.pointerId,
    startBar: loopBars.startBar,
    endBar: loopBars.endBar,
    lengthBars: loopBars.endBar - loopBars.startBar + 1
  };
  chordList.classList.add("loop-dragging");
  loopTarget.closest(".chord-loop-region")?.classList.add("dragging");
});

chordList?.addEventListener("pointermove", (event) => {
  if (!loopDragState || loopDragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  updateLoopDragFromPointer(loopDragState, event.clientX, event.clientY);
});

chordList?.addEventListener("pointerup", (event) => {
  if (!loopDragState || loopDragState.pointerId !== event.pointerId) return;
  event.preventDefault();
  updateLoopDragFromPointer(loopDragState, event.clientX, event.clientY);
  finishLoopDrag();
});

chordList?.addEventListener("pointercancel", (event) => {
  if (!loopDragState || loopDragState.pointerId !== event.pointerId) return;
  finishLoopDrag(true);
});

chordList?.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest("button[data-chord-action='resize']");
  if (!handle) return;
  const card = handle.closest(".chord-card");
  const segment = handle.closest(".chord-bar-segment");
  const index = Number(handle.dataset.index);
  if (!card || !segment || !Number.isInteger(index)) return;

  event.preventDefault();
  event.stopPropagation();
  handle.setPointerCapture?.(event.pointerId);
  chordResizeState = {
    card,
    segment,
    index,
    bar: Number(segment.dataset.bar) || 1,
    pointerId: event.pointerId,
    startBeatCell: chordCardGridStart(card),
    boundaryBeat: chordResizeBoundaryFromPointer({ segment }, event.clientX)
  };
  card.classList.add("resizing");
  updateChordResizePreview(chordResizeState, chordResizeState.boundaryBeat);
});

chordList?.addEventListener("pointermove", (event) => {
  if (!chordResizeState || chordResizeState.pointerId !== event.pointerId) return;
  event.preventDefault();
  chordResizeState.boundaryBeat = chordResizeBoundaryFromPointer(chordResizeState, event.clientX);
  updateChordResizePreview(chordResizeState, chordResizeState.boundaryBeat);
});

chordList?.addEventListener("pointerup", (event) => {
  if (!chordResizeState || chordResizeState.pointerId !== event.pointerId) return;
  event.preventDefault();
  const { index, bar, boundaryBeat } = chordResizeState;
  clearChordResizePreview();
  resizeChordToBeatBoundary(index, bar, boundaryBeat);
});

chordList?.addEventListener("pointercancel", (event) => {
  if (!chordResizeState || chordResizeState.pointerId !== event.pointerId) return;
  clearChordResizePreview(true);
});

chordList?.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-chord-action='name']");
  if (!input) return;
  const index = Number(input.dataset.index);
  if (Number.isInteger(index)) {
    updateChordName(index, input.value);
  }
});

[loopStart, loopEnd, loopEnabled, countInBars].forEach((element) => {
  if (!element) return;
  element.addEventListener("change", (event) => {
    normalizeLoopBarInputs(event.target);
    updateLoopSettingsVisibility();
    resetMetronomeSchedule();
    renderTimelineIndicators();
    if (currentAnalyzedMetadata) {
      renderMetadata(currentAnalyzedMetadata);
    }
    queuePracticeStatePersist();
  });
  element.addEventListener("input", () => {
    updateLoopSettingsVisibility();
    resetMetronomeSchedule();
    renderTimelineIndicators();
    if (currentAnalyzedMetadata) {
      renderMetadata(currentAnalyzedMetadata);
    }
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
  if (!(await flushPendingPracticeState())) return;

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
  if (!(await flushPendingPracticeState())) return;

  const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
  if (!response.ok) return;

  await loadLibrary();
  clearSelection();
});

failedDeleteButton?.addEventListener("click", async () => {
  const queueJob = queueJobs.get(selectedQueueLocalId);
  if (!queueJob?.jobId || queueJob.status !== "failed") return;
  if (!window.confirm(`Delete ${queueJob.filename}?`)) return;

  const response = await fetch(`/api/jobs/${queueJob.jobId}`, { method: "DELETE" });
  if (!response.ok) return;

  removeQueueJob(queueJob.localId);
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
