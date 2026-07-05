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
const fullMixButton = document.querySelector("#fullMixButton");
const mutePianoButton = document.querySelector("#mutePianoButton");
const speedControls = document.querySelector("#speedControls");
const loopStart = document.querySelector("#loopStart");
const loopEnd = document.querySelector("#loopEnd");
const loopEnabled = document.querySelector("#loopEnabled");
const timeReadout = document.querySelector("#timeReadout");
const keyBadge = document.querySelector("#keyBadge");
const chordList = document.querySelector("#chordList");
const melodyList = document.querySelector("#melodyList");

let currentMetadata = null;
let pollTimer = null;
let pipelineMode = "mock";
let stemPlayers = [];
let primaryPlayer = null;
let isPlaying = false;
let isSeeking = false;
let playbackRate = 1;

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

  melodyList.replaceChildren(
    ...metadata.melody.map((cue) => {
      const card = document.createElement("div");
      card.className = "melody-card";
      card.innerHTML = `
        <span class="cue-time">${formatTime(cue.time)}</span>
        <span class="cue-name">${cue.notes.join(" ")}</span>
        <span class="cue-roman">melody</span>
      `;
      return card;
    })
  );
}

function transportTime() {
  return primaryPlayer ? primaryPlayer.audio.currentTime : 0;
}

function transportDuration() {
  return primaryPlayer ? primaryPlayer.audio.duration : 0;
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

function syncStemDrift() {
  if (!primaryPlayer || isSeeking) return;
  const current = primaryPlayer.audio.currentTime;

  for (const player of stemPlayers) {
    if (player === primaryPlayer) continue;
    if (Math.abs(player.audio.currentTime - current) > 0.08) {
      player.audio.currentTime = current;
    }
  }
}

function setTransportTime(seconds) {
  const duration = transportDuration();
  const bounded = Number.isFinite(duration) && duration > 0
    ? Math.max(0, Math.min(seconds, duration))
    : Math.max(0, seconds);

  for (const player of stemPlayers) {
    player.audio.currentTime = bounded;
  }

  updateTimeDisplay();
  highlightCurrentChord();
}

function pauseAll() {
  for (const player of stemPlayers) {
    player.audio.pause();
  }
  isPlaying = false;
  playButton.textContent = "Play";
}

async function playAll() {
  if (!stemPlayers.length) return;

  const current = transportTime();
  for (const player of stemPlayers) {
    player.audio.currentTime = current;
    player.audio.playbackRate = playbackRate;
  }

  const results = await Promise.allSettled(stemPlayers.map((player) => player.audio.play()));
  if (results.some((result) => result.status === "fulfilled")) {
    isPlaying = true;
    playButton.textContent = "Pause";
  }
}

function setStemMuted(stemId, muted) {
  const player = stemPlayers.find((candidate) => candidate.id === stemId);
  if (!player) return;

  player.audio.muted = muted;
  player.row.classList.toggle("muted", muted);
  player.button.textContent = muted ? "Unmute" : "Mute";
  player.button.setAttribute("aria-pressed", String(muted));
}

function setMixPreset(mutedByStem) {
  for (const player of stemPlayers) {
    setStemMuted(player.id, Boolean(mutedByStem[player.id]));
  }
}

function renderStemPlayers(stems) {
  pauseAll();
  stemPlayers = [];
  primaryPlayer = null;
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
    row.className = `stem-row stem-${stem.id}`;
    row.dataset.testid = `stem-row-${stem.id}`;
    row.innerHTML = `
      <div>
        <span class="stem-name">${stem.name}</span>
        <span class="stem-role">${stem.role}</span>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "stem-toggle";
    button.dataset.stemId = stem.id;
    button.dataset.testid = `stem-toggle-${stem.id}`;
    row.append(button);
    stemMixer.append(row);

    const player = { ...stem, audio, row, button };
    stemPlayers.push(player);
    setStemMuted(stem.id, Boolean(stem.defaultMuted));

    if (stem.id === "piano") {
      primaryPlayer = player;
    }
  }

  primaryPlayer ||= stemPlayers[0] || null;
  if (!primaryPlayer) return;

  primaryPlayer.audio.addEventListener("loadedmetadata", () => {
    const duration = transportDuration();
    loopEnd.value = Math.min(4, duration || 4);
    scrubber.max = String(duration || 16);
    updateTimeDisplay();
  });

  primaryPlayer.audio.addEventListener("timeupdate", () => {
    const start = Number(loopStart.value);
    const end = Number(loopEnd.value);

    if (loopEnabled.checked && Number.isFinite(start) && Number.isFinite(end) && end > start) {
      if (primaryPlayer.audio.currentTime >= end) {
        setTransportTime(start);
        if (isPlaying) {
          playAll().catch(console.error);
        }
      }
    }

    syncStemDrift();
    updateTimeDisplay();
    highlightCurrentChord();
  });

  primaryPlayer.audio.addEventListener("ended", pauseAll);
}

async function pollJob(jobId) {
  const response = await fetch(`/api/jobs/${jobId}`);
  if (!response.ok) throw new Error("Could not fetch job status.");
  const job = await response.json();
  updateProgress(job);

  if (job.status === "complete") {
    clearInterval(pollTimer);
    const stems = job.result.stems?.length
      ? job.result.stems
      : [{ id: "piano", name: "Piano", role: "practice target", audioUrl: job.result.audioUrl }];
    renderStemPlayers(stems);
    renderMetadata(job.result.metadata);
    practiceView.hidden = false;
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
    serviceStatus.textContent = `Backend ready: ${health.mode}`;
  } catch {
    serviceStatus.textContent = "Backend unavailable";
  }
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
  const button = event.target.closest("button[data-stem-id]");
  if (!button) return;

  const player = stemPlayers.find((candidate) => candidate.id === button.dataset.stemId);
  if (!player) return;

  setStemMuted(player.id, !player.audio.muted);
});

fullMixButton.addEventListener("click", () => {
  setMixPreset({});
});

mutePianoButton.addEventListener("click", () => {
  setMixPreset({ piano: true });
});

speedControls.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-speed]");
  if (!button) return;

  playbackRate = Number(button.dataset.speed);
  for (const player of stemPlayers) {
    player.audio.playbackRate = playbackRate;
  }

  for (const speedButton of speedControls.querySelectorAll("button")) {
    speedButton.classList.toggle("active", speedButton === button);
  }
});

checkHealth();
