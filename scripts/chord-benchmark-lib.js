import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const RWC_COLLECTION = "RWC-P";

function parseDelimitedLine(line, delimiter = ";") {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

export function parseSemicolonTable(text) {
  const lines = String(text).replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = parseDelimitedLine(lines[0]).map((value) => value.trim());
  return lines.slice(1).map((line, rowIndex) => {
    const fields = parseDelimitedLine(line);
    if (fields.length !== headers.length) {
      throw new Error(`Malformed semicolon table at data row ${rowIndex + 1}.`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, fields[index].trim()]));
  });
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${label}: ${value}`);
  return number;
}

export function normalizeTrackId(value) {
  const trackId = String(value || "").trim().replace(/\.wav$/i, "");
  if (!/^RWC_P\d{3}$/.test(trackId)) throw new Error(`Invalid RWC-P track id: ${value}`);
  return trackId;
}

export function validateIntervals(intervals, { durationSeconds = null, label = "intervals" } = {}) {
  let previousEnd = null;
  for (const [index, interval] of intervals.entries()) {
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || interval.end <= interval.start) {
      throw new Error(`${label} row ${index + 1} has an invalid duration.`);
    }
    if (interval.start < 0 || (previousEnd !== null && interval.start < previousEnd - 0.011)) {
      throw new Error(`${label} row ${index + 1} is out of order or overlaps.`);
    }
    if (durationSeconds !== null && interval.end > durationSeconds + 0.05) {
      throw new Error(`${label} extends beyond the declared duration.`);
    }
    previousEnd = interval.end;
  }
  if (!intervals.length) throw new Error(`${label} is empty.`);
  return intervals;
}

export async function readRwcMetadata(annotationsRoot) {
  const rows = parseSemicolonTable(await readFile(join(annotationsRoot, "metadata.csv"), "utf8"));
  return rows.filter((row) => row.CollID === "P").map((row) => ({
    trackId: normalizeTrackId(row.RWCID),
    title: row.Title,
    artist: row.Artist,
    tempo: finiteNumber(row.Tempo, "metadata tempo"),
    liveInstruments: row.LiveInstruments,
    sourceDurationSeconds: finiteNumber(row.duration, "metadata duration")
  }));
}

export async function readRwcTrack(annotationsRoot, trackId) {
  const id = normalizeTrackId(trackId);
  const metadata = (await readRwcMetadata(annotationsRoot)).find((entry) => entry.trackId === id);
  if (!metadata) throw new Error(`Missing metadata for ${id}.`);

  const chordRows = parseSemicolonTable(await readFile(
    join(annotationsRoot, "01_annotations_preprocessed", "chords", RWC_COLLECTION, `${id}.csv`),
    "utf8"
  ));
  const chords = chordRows.map((row) => ({
    start: finiteNumber(row.t_start, "chord start"),
    end: finiteNumber(row.t_end, "chord end"),
    label: row.chord
  }));
  validateIntervals(chords, { label: `${id} chords` });
  const annotationEndSeconds = chords.at(-1).end;

  const beatRows = parseSemicolonTable(await readFile(
    join(annotationsRoot, "01_annotations_preprocessed", "beats", RWC_COLLECTION, `${id}.csv`),
    "utf8"
  ));
  const beats = beatRows.map((row) => ({
    time: finiteNumber(row.t, "beat time"),
    beat: Math.round(finiteNumber(row.beat, "beat number"))
  }));
  for (let index = 0; index < beats.length; index += 1) {
    if (beats[index].time < 0 || beats[index].beat < 1 || (index && beats[index].time <= beats[index - 1].time)) {
      throw new Error(`${id} has malformed beat annotations at row ${index + 1}.`);
    }
  }

  return {
    ...metadata,
    durationSeconds: metadata.sourceDurationSeconds,
    annotationEndSeconds,
    chords,
    beats
  };
}

export function buildOracleTimingGrid(track) {
  const beatsPerBar = Math.max(...track.beats.map((beat) => beat.beat));
  const downbeats = track.beats.filter((beat) => beat.beat === 1);
  if (downbeats.length < 2) throw new Error(`${track.trackId} needs at least two annotated downbeats.`);
  const beatDurations = track.beats.slice(1).map((beat, index) => beat.time - track.beats[index].time).sort((a, b) => a - b);
  const medianBeatDuration = beatDurations[Math.floor(beatDurations.length / 2)];
  return {
    bpm: Number((60 / medianBeatDuration).toFixed(3)),
    beatsPerBar,
    beatUnit: 4,
    beatDurationSeconds: medianBeatDuration,
    beatOffsetSeconds: downbeats[0].time,
    downbeatOffsetSeconds: downbeats[0].time,
    durationSeconds: track.durationSeconds,
    timingMap: {
      version: 2,
      events: downbeats.map((beat, index) => ({
        bar: index + 1,
        timeSeconds: beat.time,
        ...(index === 0 ? { timeSignature: { beatsPerBar, beatUnit: 4 } } : {})
      }))
    }
  };
}

const APP_QUALITY_TO_HARTE = [
  [/maj7$/, ":maj7"],
  [/m7$/, ":min7"],
  [/sus2$/, ":sus2"],
  [/sus4$/, ":sus4"],
  [/dim$/, ":dim"],
  [/7$/, ":7"],
  [/m$/, ":min"],
  [/$/, ":maj"]
];

export function appChordNameToHarte(value) {
  const label = String(value || "").trim();
  if (!label || label === "N") return "N";
  const match = label.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) throw new Error(`Unsupported application chord label: ${value}`);
  const [, root, quality] = match;
  for (const [pattern, replacement] of APP_QUALITY_TO_HARTE) {
    if (pattern.test(quality)) return `${root}${quality.replace(pattern, replacement)}`;
  }
  throw new Error(`Unsupported application chord quality: ${value}`);
}

export function predictionsToIntervals(chords) {
  return validateIntervals(chords.map((chord) => ({
    start: Number(chord.start),
    end: Number(chord.end),
    label: appChordNameToHarte(chord.name)
  })), { label: "predicted chords" });
}

function rootPitchClass(label) {
  if (label === "N") return null;
  const match = String(label).match(/^([A-G])([#b]?)/);
  if (!match) return undefined;
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]];
  return (natural + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0) + 12) % 12;
}

function labelAt(intervals, time) {
  return intervals.find((interval) => interval.start <= time && interval.end > time)?.label || "N";
}

export function contractRootScore(reference, estimated, durationSeconds) {
  const boundaries = new Set([0, durationSeconds]);
  for (const interval of [...reference, ...estimated]) {
    if (interval.start > 0 && interval.start < durationSeconds) boundaries.add(interval.start);
    if (interval.end > 0 && interval.end < durationSeconds) boundaries.add(interval.end);
  }
  const times = [...boundaries].sort((a, b) => a - b);
  let correctDuration = 0;
  for (let index = 0; index < times.length - 1; index += 1) {
    const start = times[index];
    const end = times[index + 1];
    const midpoint = (start + end) / 2;
    if (rootPitchClass(labelAt(reference, midpoint)) === rootPitchClass(labelAt(estimated, midpoint))) {
      correctDuration += end - start;
    }
  }
  return correctDuration / durationSeconds;
}

export function trackComplexity(track) {
  const intervalDuration = (chord) => Math.max(0, Math.min(chord.end, track.durationSeconds) - chord.start);
  const annotatedDuration = track.chords.reduce((sum, chord) => sum + intervalDuration(chord), 0);
  const sounding = track.chords.filter((chord) => chord.label !== "N");
  const uniqueLabels = new Set(sounding.map((chord) => chord.label)).size;
  const complexDuration = sounding
    .filter((chord) => !/^[A-G](?:#|b)?:(?:maj|min)$/.test(chord.label))
    .reduce((sum, chord) => sum + intervalDuration(chord), 0);
  const oovDuration = sounding
    .filter((chord) => !/^[A-G](?:#|b)?:(?:maj|min|7|min7|maj7|sus2|sus4|dim)$/.test(chord.label))
    .reduce((sum, chord) => sum + intervalDuration(chord), 0);
  const labelDurations = new Map();
  for (const chord of sounding) {
    labelDurations.set(chord.label, (labelDurations.get(chord.label) || 0) + intervalDuration(chord));
  }
  const soundingDuration = [...labelDurations.values()].reduce((sum, duration) => sum + duration, 0);
  const labelEntropy = [...labelDurations.values()].reduce((entropy, duration) => {
    const probability = duration / Math.max(soundingDuration, 0.001);
    return entropy - probability * Math.log2(probability);
  }, 0);
  let internalChanges = 0;
  for (let index = 1; index < track.chords.length; index += 1) {
    if (track.chords[index].start < track.durationSeconds && track.chords[index].label !== track.chords[index - 1].label) {
      internalChanges += 1;
    }
  }
  const changesPerMinute = internalChanges / Math.max(annotatedDuration / 60, 1 / 60);
  const complexDurationRatio = complexDuration / Math.max(annotatedDuration, 0.001);
  const oovDurationRatio = oovDuration / Math.max(annotatedDuration, 0.001);
  const instrumentCount = String(track.liveInstruments || "").split(",").filter((value) => value.trim()).length;
  return {
    uniqueLabels,
    changesPerMinute: Number(changesPerMinute.toFixed(3)),
    complexDurationRatio: Number(complexDurationRatio.toFixed(4)),
    oovDurationRatio: Number(oovDurationRatio.toFixed(4)),
    labelEntropy: Number(labelEntropy.toFixed(4)),
    tempo: track.tempo,
    durationSeconds: Number(track.durationSeconds.toFixed(3)),
    instrumentCount
  };
}

export function selectStratifiedPilot(tracks, count = 12) {
  if (tracks.length < count || count % 3 !== 0) throw new Error("Pilot size must be divisible by three and fit the corpus.");
  const candidates = tracks.map((track) => ({ track, complexity: trackComplexity(track) }));
  const weights = {
    changesPerMinute: 1,
    uniqueLabels: 0.8,
    labelEntropy: 1,
    complexDurationRatio: 1,
    oovDurationRatio: 0.8,
    instrumentCount: 0.5,
    tempo: 0.25,
    durationSeconds: 0.25
  };
  const moments = Object.fromEntries(Object.keys(weights).map((feature) => {
    const values = candidates.map(({ complexity }) => complexity[feature]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    return [feature, { mean, deviation: Math.sqrt(variance) || 1 }];
  }));
  for (const candidate of candidates) {
    candidate.complexity.score = Number(Object.entries(weights).reduce((score, [feature, weight]) => {
      const { mean, deviation } = moments[feature];
      return score + weight * ((candidate.complexity[feature] - mean) / deviation);
    }, 0).toFixed(4));
  }
  const ranked = candidates
    .sort((left, right) => left.complexity.score - right.complexity.score || left.track.trackId.localeCompare(right.track.trackId));
  const perStratum = count / 3;
  const selected = [];
  for (let stratum = 0; stratum < 3; stratum += 1) {
    const start = Math.floor((stratum * ranked.length) / 3);
    const end = Math.floor(((stratum + 1) * ranked.length) / 3);
    const group = ranked.slice(start, end);
    for (let slot = 0; slot < perStratum; slot += 1) {
      const index = Math.round(((slot + 0.5) * group.length) / perStratum - 0.5);
      selected.push({ ...group[Math.max(0, Math.min(group.length - 1, index))], stratum: ["low", "medium", "high"][stratum] });
    }
  }
  return selected;
}

export function audioCandidates(audioRoot, trackId) {
  const filename = `${normalizeTrackId(trackId)}.wav`;
  return [join(audioRoot, filename), join(audioRoot, RWC_COLLECTION, filename), join(audioRoot, "audio", filename)];
}

export function validateAudioFilename(path, trackId) {
  if (basename(path).toLowerCase() !== `${normalizeTrackId(trackId).toLowerCase()}.wav`) {
    throw new Error(`Audio filename does not match ${trackId}: ${path}`);
  }
  return path;
}
