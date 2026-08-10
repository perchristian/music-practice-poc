export const timingMapVersion = 2;
export const maxTimingMapEvents = 2048;

const defaultSignature = Object.freeze({ beatsPerBar: 4, beatUnit: 4 });
const supportedSignatures = new Set(["3/4", "4/4", "5/4", "6/8", "7/8", "12/8"]);

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeTimeSignature(value, fallback = null) {
  const beatsPerBar = Math.round(Number(value?.beatsPerBar));
  const beatUnit = Math.round(Number(value?.beatUnit));
  if (!supportedSignatures.has(`${beatsPerBar}/${beatUnit}`)) {
    return fallback ? normalizeTimeSignature(fallback) : null;
  }
  return { beatsPerBar, beatUnit };
}

function baseSignature(grid) {
  return normalizeTimeSignature({
    beatsPerBar: grid?.beatsPerBar || grid?.meter?.beatsPerBar || grid?.timeSignature?.beatsPerBar,
    beatUnit: grid?.beatUnit || grid?.meter?.beatUnit || grid?.timeSignature?.beatUnit
  }, defaultSignature);
}

// Compound 6/8 and 12/8 use dotted-quarter pulses. Other supported meters use
// one pulse per written beat. Chord positions still use the written beat cells.
export function meterPulseShape(signature) {
  const normalized = normalizeTimeSignature(signature, defaultSignature);
  const compound = normalized.beatUnit === 8 && normalized.beatsPerBar >= 6 && normalized.beatsPerBar % 3 === 0;
  const subdivisionsPerPulse = compound ? 3 : 1;
  return {
    ...normalized,
    subdivisionsPerPulse,
    pulsesPerBar: normalized.beatsPerBar / subdivisionsPerPulse,
    pulseUnit: compound ? 8 / 3 : normalized.beatUnit,
    grouping: compound ? "compound" : "simple"
  };
}

export function normalizeTimingMap(value, {
  maxBar = 10000,
  minTimeSeconds = -60,
  maxTimeSeconds = 60 * 60,
  maxEvents = maxTimingMapEvents,
  requireBarOne = true
} = {}) {
  if (value == null) return null;
  if (typeof value !== "object" || Number(value.version) !== timingMapVersion || !Array.isArray(value.events)) {
    return null;
  }
  if (!value.events.length || value.events.length > maxEvents) return null;

  const events = [];
  let previousTimedEvent = null;
  for (const candidate of value.events) {
    const bar = Math.round(Number(candidate?.bar));
    const hasTime = Object.prototype.hasOwnProperty.call(candidate || {}, "timeSeconds");
    const timeSeconds = hasTime ? finiteNumber(candidate.timeSeconds) : null;
    const hasSignature = Object.prototype.hasOwnProperty.call(candidate || {}, "timeSignature");
    const timeSignature = hasSignature ? normalizeTimeSignature(candidate.timeSignature) : null;
    if (
      !Number.isInteger(bar) || bar < 1 || bar > maxBar ||
      (hasTime && (timeSeconds === null || timeSeconds < minTimeSeconds || timeSeconds > maxTimeSeconds)) ||
      (hasSignature && !timeSignature) ||
      (!hasTime && !hasSignature)
    ) return null;

    const previous = events.at(-1);
    if (previous && bar <= previous.bar) return null;
    const event = {
      bar,
      ...(hasTime ? { timeSeconds: Number(timeSeconds.toFixed(3)) } : {}),
      ...(hasSignature ? { timeSignature } : {})
    };
    if (hasTime) {
      if (previousTimedEvent && event.timeSeconds <= previousTimedEvent.timeSeconds) return null;
      previousTimedEvent = event;
    }
    events.push(event);
  }
  if (requireBarOne && events[0]?.bar !== 1) return null;
  return { version: timingMapVersion, events };
}

export function gridTimingMap(grid) {
  return normalizeTimingMap(grid?.timingMap);
}

export function timingMapWithEvent(value, nextEvent, options = {}) {
  const current = normalizeTimingMap(value, { ...options, requireBarOne: false });
  const bar = Math.round(Number(nextEvent?.bar));
  if (!Number.isInteger(bar) || bar < 1) return null;
  const events = [...(current?.events || [])];
  const existingIndex = events.findIndex((event) => event.bar === bar);
  const existing = existingIndex >= 0 ? events[existingIndex] : { bar };
  const merged = { ...existing, bar };
  if (Object.prototype.hasOwnProperty.call(nextEvent || {}, "timeSeconds")) {
    if (nextEvent.timeSeconds == null) delete merged.timeSeconds;
    else merged.timeSeconds = Number(nextEvent.timeSeconds);
  }
  if (Object.prototype.hasOwnProperty.call(nextEvent || {}, "timeSignature")) {
    if (nextEvent.timeSignature == null) delete merged.timeSignature;
    else merged.timeSignature = nextEvent.timeSignature;
  }
  if (!Object.prototype.hasOwnProperty.call(merged, "timeSeconds") && !merged.timeSignature) {
    if (existingIndex >= 0) events.splice(existingIndex, 1);
  } else if (existingIndex >= 0) events[existingIndex] = merged;
  else events.push(merged);
  events.sort((left, right) => left.bar - right.bar);
  if (!events.length) return null;
  return normalizeTimingMap({ version: timingMapVersion, events }, options);
}

export function timingMapWithoutEventAspect(value, bar, aspect, options = {}) {
  if (!["timeSeconds", "timeSignature"].includes(aspect)) return normalizeTimingMap(value, options);
  return timingMapWithEvent(value, { bar, [aspect]: null }, options);
}

export function timingMapTimeEvents(value, options = {}) {
  return (normalizeTimingMap(value, options)?.events || [])
    .filter((event) => Number.isFinite(event.timeSeconds));
}

function basePulseDuration(grid) {
  const bpm = finiteNumber(grid?.bpm);
  if (bpm && bpm > 0) return 60 / bpm;
  const direct = finiteNumber(grid?.beatDurationSeconds);
  return direct && direct > 0 ? direct : null;
}

function baseDownbeat(grid) {
  return finiteNumber(grid?.downbeatOffsetSeconds ?? grid?.beatOffsetSeconds) ?? 0;
}

function meterSpans(grid) {
  const map = gridTimingMap(grid);
  let signature = baseSignature(grid);
  const changes = (map?.events || [])
    .filter((event) => event.timeSignature)
    .map((event) => ({ bar: event.bar, timeSignature: event.timeSignature }));
  if (changes[0]?.bar === 1) signature = changes[0].timeSignature;
  const boundaries = [{ bar: 1, timeSignature: signature }];
  for (const change of changes) {
    if (change.bar === 1) boundaries[0] = change;
    else boundaries.push(change);
  }

  const spans = [];
  let startBeat = 0;
  let startPulse = 0;
  for (let index = 0; index < boundaries.length; index += 1) {
    const boundary = boundaries[index];
    const nextBar = boundaries[index + 1]?.bar ?? Infinity;
    const shape = meterPulseShape(boundary.timeSignature);
    spans.push({
      startBar: boundary.bar,
      endBar: nextBar,
      startBeat,
      endBeat: Number.isFinite(nextBar) ? startBeat + (nextBar - boundary.bar) * shape.beatsPerBar : Infinity,
      startPulse,
      endPulse: Number.isFinite(nextBar) ? startPulse + (nextBar - boundary.bar) * shape.pulsesPerBar : Infinity,
      ...shape
    });
    if (Number.isFinite(nextBar)) {
      startBeat += (nextBar - boundary.bar) * shape.beatsPerBar;
      startPulse += (nextBar - boundary.bar) * shape.pulsesPerBar;
    }
  }
  return spans;
}

function spanForBar(spans, bar) {
  return spans.find((span) => bar >= span.startBar && bar < span.endBar) || spans[0];
}

function spanForBeat(spans, beat) {
  if (beat < 0) return spans[0];
  return spans.find((span) => beat >= span.startBeat && beat < span.endBeat) || spans.at(-1);
}

function spanForPulse(spans, pulse) {
  if (pulse < 0) return spans[0];
  return spans.find((span) => pulse >= span.startPulse && pulse < span.endPulse) || spans.at(-1);
}

export function barStartAbsoluteBeat(grid, bar) {
  const targetBar = Math.max(1, Math.round(Number(bar) || 1));
  const spans = meterSpans(grid);
  const span = spanForBar(spans, targetBar);
  return span.startBeat + (targetBar - span.startBar) * span.beatsPerBar;
}

export function barStartPulse(grid, bar) {
  const targetBar = Math.max(1, Math.round(Number(bar) || 1));
  const spans = meterSpans(grid);
  const span = spanForBar(spans, targetBar);
  return span.startPulse + (targetBar - span.startBar) * span.pulsesPerBar;
}

export function timeSignatureAtBar(grid, bar) {
  const span = spanForBar(meterSpans(grid), Math.max(1, Math.round(Number(bar) || 1)));
  return { beatsPerBar: span.beatsPerBar, beatUnit: span.beatUnit };
}

export function musicalPulseDistance(grid, startBar, endBar) {
  return barStartPulse(grid, endBar) - barStartPulse(grid, startBar);
}

function absoluteBeatToPulse(grid, absoluteBeat) {
  const beat = finiteNumber(absoluteBeat);
  if (beat === null) return null;
  const span = spanForBeat(meterSpans(grid), beat);
  return span.startPulse + (beat - span.startBeat) / span.subdivisionsPerPulse;
}

function pulseToAbsoluteBeat(grid, pulseIndex) {
  const pulse = finiteNumber(pulseIndex);
  if (pulse === null) return null;
  const span = spanForPulse(meterSpans(grid), pulse);
  return span.startBeat + (pulse - span.startPulse) * span.subdivisionsPerPulse;
}

function positionForAbsoluteBeat(grid, absoluteBeat) {
  const beat = finiteNumber(absoluteBeat);
  if (beat === null) return null;
  const span = spanForBeat(meterSpans(grid), beat);
  const relative = beat - span.startBeat;
  const barOffset = Math.floor(relative / span.beatsPerBar);
  const beatWithinBar = relative - barOffset * span.beatsPerBar;
  return {
    absoluteBeat: beat,
    bar: span.startBar + barOffset,
    beat: beatWithinBar + 1,
    beatWithinBar,
    timeSignature: { beatsPerBar: span.beatsPerBar, beatUnit: span.beatUnit },
    subdivisionsPerPulse: span.subdivisionsPerPulse,
    primaryPulse: Math.abs(beatWithinBar % span.subdivisionsPerPulse) < 1e-7,
    downbeat: Math.abs(beatWithinBar) < 1e-7
  };
}

function anchorPoints(grid) {
  return timingMapTimeEvents(gridTimingMap(grid), { baseTimeSignature: baseSignature(grid) }).map((event) => ({
    ...event,
    pulseIndex: barStartPulse(grid, event.bar)
  }));
}

function segmentForValue(points, value, key) {
  if (points.length < 2) return null;
  if (value <= points[0][key]) return [points[0], points[1]];
  if (value >= points.at(-1)[key]) return [points.at(-2), points.at(-1)];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (value >= points[index][key] && value <= points[index + 1][key]) return [points[index], points[index + 1]];
  }
  return null;
}

function secondsPerPulse(segment) {
  if (!segment) return null;
  const [left, right] = segment;
  const pulseDistance = right.pulseIndex - left.pulseIndex;
  if (pulseDistance <= 0) return null;
  const value = (right.timeSeconds - left.timeSeconds) / pulseDistance;
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function absoluteBeatToSeconds(grid, beatIndex) {
  const pulse = absoluteBeatToPulse(grid, beatIndex);
  if (pulse === null) return null;
  const points = anchorPoints(grid);
  if (!points.length) {
    const duration = basePulseDuration(grid);
    return duration ? baseDownbeat(grid) + pulse * duration : null;
  }
  if (points.length === 1) {
    const duration = basePulseDuration(grid);
    return duration ? points[0].timeSeconds + (pulse - points[0].pulseIndex) * duration : null;
  }
  const segment = segmentForValue(points, pulse, "pulseIndex");
  const duration = secondsPerPulse(segment);
  return duration ? segment[0].timeSeconds + (pulse - segment[0].pulseIndex) * duration : null;
}

export function secondsToAbsoluteBeat(grid, seconds) {
  const time = finiteNumber(seconds);
  if (time === null) return null;
  const points = anchorPoints(grid);
  let pulse = null;
  if (!points.length) {
    const duration = basePulseDuration(grid);
    pulse = duration ? (time - baseDownbeat(grid)) / duration : null;
  } else if (points.length === 1) {
    const duration = basePulseDuration(grid);
    pulse = duration ? points[0].pulseIndex + (time - points[0].timeSeconds) / duration : null;
  } else {
    const segment = segmentForValue(points, time, "timeSeconds");
    const duration = secondsPerPulse(segment);
    pulse = duration ? segment[0].pulseIndex + (time - segment[0].timeSeconds) / duration : null;
  }
  return pulse === null ? null : pulseToAbsoluteBeat(grid, pulse);
}

export function musicalPositionToSeconds(grid, { bar = 1, beat = 1, beatOffset = 0 } = {}) {
  const absoluteBeat = barStartAbsoluteBeat(grid, bar) + (Number(beat) - 1) + Number(beatOffset || 0);
  return absoluteBeatToSeconds(grid, absoluteBeat);
}

export function secondsToMusicalPosition(grid, seconds) {
  return positionForAbsoluteBeat(grid, secondsToAbsoluteBeat(grid, seconds));
}

export function absoluteBeatToMusicalPosition(grid, absoluteBeat) {
  return positionForAbsoluteBeat(grid, absoluteBeat);
}

export function localTempoAtSeconds(grid, seconds) {
  const segment = segmentForValue(anchorPoints(grid), Number(seconds), "timeSeconds");
  const duration = secondsPerPulse(segment) || basePulseDuration(grid);
  return duration ? 60 / duration : null;
}

export function enumerateGridBeats(grid, startSeconds, endSeconds, { paddingBeats = 1 } = {}) {
  const startBeat = secondsToAbsoluteBeat(grid, startSeconds);
  const endBeat = secondsToAbsoluteBeat(grid, endSeconds);
  if (!Number.isFinite(startBeat) || !Number.isFinite(endBeat)) return [];
  const first = Math.floor(Math.min(startBeat, endBeat)) - paddingBeats;
  const last = Math.ceil(Math.max(startBeat, endBeat)) + paddingBeats;
  const result = [];
  for (let beatIndex = first; beatIndex <= last; beatIndex += 1) {
    const timeSeconds = absoluteBeatToSeconds(grid, beatIndex);
    const position = positionForAbsoluteBeat(grid, beatIndex);
    if (Number.isFinite(timeSeconds) && position) result.push({ beatIndex, timeSeconds, ...position });
  }
  return result;
}

export function enumerateBeatTimes(grid, startSeconds, endSeconds, options = {}) {
  return enumerateGridBeats(grid, startSeconds, endSeconds, options)
    .map(({ beatIndex, timeSeconds }) => ({ beatIndex, timeSeconds }));
}

export function segmentAroundSeconds(grid, seconds) {
  const segment = segmentForValue(anchorPoints(grid), Number(seconds), "timeSeconds");
  if (!segment) return null;
  return {
    left: { bar: segment[0].bar, timeSeconds: segment[0].timeSeconds },
    right: { bar: segment[1].bar, timeSeconds: segment[1].timeSeconds },
    bpm: 60 / secondsPerPulse(segment)
  };
}
