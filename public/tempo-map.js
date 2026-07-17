export const tempoMapVersion = 1;
export const maxTempoMapAnchors = 2048;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeTempoMap(value, {
  maxBar = 10000,
  minTimeSeconds = -60,
  maxTimeSeconds = 60 * 60,
  maxAnchors = maxTempoMapAnchors,
  requireBarOne = true
} = {}) {
  if (value == null) return null;
  if (typeof value !== "object" || Number(value.version) !== tempoMapVersion || !Array.isArray(value.anchors)) {
    return null;
  }

  if (!value.anchors.length || value.anchors.length > maxAnchors) return null;

  const anchors = [];
  for (const candidate of value.anchors) {
    const bar = Math.round(Number(candidate?.bar));
    const timeSeconds = finiteNumber(candidate?.timeSeconds);
    if (
      !Number.isInteger(bar) ||
      bar < 1 ||
      bar > maxBar ||
      timeSeconds === null ||
      timeSeconds < minTimeSeconds ||
      timeSeconds > maxTimeSeconds
    ) {
      return null;
    }

    const anchor = {
      bar,
      timeSeconds: Number(timeSeconds.toFixed(3))
    };
    const previous = anchors.at(-1);
    if (previous && (anchor.bar <= previous.bar || anchor.timeSeconds <= previous.timeSeconds)) {
      return null;
    }
    anchors.push(anchor);
  }

  if (requireBarOne && anchors[0]?.bar !== 1) return null;
  return { version: tempoMapVersion, anchors };
}

export function tempoMapWithAnchor(value, anchor, options = {}) {
  const current = normalizeTempoMap(value, { ...options, requireBarOne: false });
  const nextAnchor = {
    bar: Math.round(Number(anchor?.bar)),
    timeSeconds: Number(anchor?.timeSeconds)
  };
  if (!Number.isInteger(nextAnchor.bar) || !Number.isFinite(nextAnchor.timeSeconds)) return null;

  const anchors = [...(current?.anchors || [])];
  const existingIndex = anchors.findIndex((entry) => entry.bar === nextAnchor.bar);
  if (existingIndex >= 0) {
    anchors[existingIndex] = nextAnchor;
  } else {
    anchors.push(nextAnchor);
  }
  anchors.sort((left, right) => left.bar - right.bar);
  return normalizeTempoMap({ version: tempoMapVersion, anchors }, options);
}

export function tempoMapWithoutAnchor(value, bar, options = {}) {
  const current = normalizeTempoMap(value, options);
  if (!current || Number(bar) === 1) return current;
  return normalizeTempoMap({
    version: tempoMapVersion,
    anchors: current.anchors.filter((anchor) => anchor.bar !== Number(bar))
  }, options);
}

function baseBeatDuration(grid) {
  const direct = finiteNumber(grid?.beatDurationSeconds);
  if (direct && direct > 0) return direct;
  const bpm = finiteNumber(grid?.bpm);
  return bpm && bpm > 0 ? 60 / bpm : null;
}

function baseDownbeat(grid) {
  return finiteNumber(grid?.downbeatOffsetSeconds ?? grid?.beatOffsetSeconds) ?? 0;
}

function beatsPerBar(grid) {
  const value = Math.round(Number(grid?.beatsPerBar || grid?.meter?.beatsPerBar || 4));
  return Math.max(1, value || 4);
}

export function gridTempoMap(grid) {
  return normalizeTempoMap(grid?.tempoMap, { requireBarOne: true });
}

function anchorPoints(grid) {
  const map = gridTempoMap(grid);
  if (!map) return [];
  const barBeats = beatsPerBar(grid);
  return map.anchors.map((anchor) => ({
    ...anchor,
    beatIndex: (anchor.bar - 1) * barBeats
  }));
}

function baseSecondsForBeat(grid, beatIndex) {
  const beatDuration = baseBeatDuration(grid);
  if (!beatDuration) return null;
  return baseDownbeat(grid) + beatIndex * beatDuration;
}

function segmentForBeat(grid, beatIndex) {
  const points = anchorPoints(grid);
  if (points.length < 2) return null;
  if (beatIndex <= points[0].beatIndex) return [points[0], points[1]];
  if (beatIndex >= points.at(-1).beatIndex) return [points.at(-2), points.at(-1)];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (beatIndex >= points[index].beatIndex && beatIndex <= points[index + 1].beatIndex) {
      return [points[index], points[index + 1]];
    }
  }
  return null;
}

function segmentForSeconds(grid, seconds) {
  const points = anchorPoints(grid);
  if (points.length < 2) return null;
  if (seconds <= points[0].timeSeconds) return [points[0], points[1]];
  if (seconds >= points.at(-1).timeSeconds) return [points.at(-2), points.at(-1)];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (seconds >= points[index].timeSeconds && seconds <= points[index + 1].timeSeconds) {
      return [points[index], points[index + 1]];
    }
  }
  return null;
}

function secondsPerBeat(segment) {
  if (!segment) return null;
  const [left, right] = segment;
  const beatDistance = right.beatIndex - left.beatIndex;
  if (beatDistance <= 0) return null;
  const value = (right.timeSeconds - left.timeSeconds) / beatDistance;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function absoluteBeatToSeconds(grid, beatIndex) {
  const beat = finiteNumber(beatIndex);
  if (beat === null) return null;
  const points = anchorPoints(grid);
  if (!points.length) return baseSecondsForBeat(grid, beat);
  if (points.length === 1) {
    const duration = baseBeatDuration(grid);
    return duration ? points[0].timeSeconds + (beat - points[0].beatIndex) * duration : null;
  }
  const segment = segmentForBeat(grid, beat);
  const duration = secondsPerBeat(segment);
  return duration ? segment[0].timeSeconds + (beat - segment[0].beatIndex) * duration : null;
}

export function secondsToAbsoluteBeat(grid, seconds) {
  const time = finiteNumber(seconds);
  if (time === null) return null;
  const points = anchorPoints(grid);
  if (!points.length) {
    const duration = baseBeatDuration(grid);
    return duration ? (time - baseDownbeat(grid)) / duration : null;
  }
  if (points.length === 1) {
    const duration = baseBeatDuration(grid);
    return duration ? points[0].beatIndex + (time - points[0].timeSeconds) / duration : null;
  }
  const segment = segmentForSeconds(grid, time);
  const duration = secondsPerBeat(segment);
  return duration ? segment[0].beatIndex + (time - segment[0].timeSeconds) / duration : null;
}

export function musicalPositionToSeconds(grid, { bar = 1, beat = 1, beatOffset = 0 } = {}) {
  const barBeats = beatsPerBar(grid);
  const absoluteBeat = (Number(bar) - 1) * barBeats + (Number(beat) - 1) + Number(beatOffset || 0);
  return absoluteBeatToSeconds(grid, absoluteBeat);
}

export function secondsToMusicalPosition(grid, seconds) {
  const absoluteBeat = secondsToAbsoluteBeat(grid, seconds);
  if (!Number.isFinite(absoluteBeat)) return null;
  const barBeats = beatsPerBar(grid);
  const barIndex = Math.floor(absoluteBeat / barBeats);
  return {
    absoluteBeat,
    bar: barIndex + 1,
    beat: absoluteBeat - barIndex * barBeats + 1
  };
}

export function localTempoAtSeconds(grid, seconds) {
  const segment = segmentForSeconds(grid, Number(seconds));
  const duration = secondsPerBeat(segment) || baseBeatDuration(grid);
  return duration ? 60 / duration : null;
}

export function enumerateBeatTimes(grid, startSeconds, endSeconds, { paddingBeats = 1 } = {}) {
  const startBeat = secondsToAbsoluteBeat(grid, startSeconds);
  const endBeat = secondsToAbsoluteBeat(grid, endSeconds);
  if (!Number.isFinite(startBeat) || !Number.isFinite(endBeat)) return [];
  const first = Math.floor(Math.min(startBeat, endBeat)) - paddingBeats;
  const last = Math.ceil(Math.max(startBeat, endBeat)) + paddingBeats;
  const result = [];
  for (let beatIndex = first; beatIndex <= last; beatIndex += 1) {
    const timeSeconds = absoluteBeatToSeconds(grid, beatIndex);
    if (Number.isFinite(timeSeconds)) result.push({ beatIndex, timeSeconds });
  }
  return result;
}

export function segmentAroundSeconds(grid, seconds) {
  const segment = segmentForSeconds(grid, Number(seconds));
  if (!segment) return null;
  return {
    left: { bar: segment[0].bar, timeSeconds: segment[0].timeSeconds },
    right: { bar: segment[1].bar, timeSeconds: segment[1].timeSeconds },
    bpm: 60 / secondsPerBeat(segment)
  };
}
