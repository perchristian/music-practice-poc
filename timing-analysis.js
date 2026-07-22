import { enumerateGridBeats, musicalPositionToSeconds, timeSignatureAtBar } from "./public/tempo-map.js";

export const defaultTimingThresholds = Object.freeze({
  phaseThresholdRelative: 0.18,
  tempoThresholdRelative: 0.08,
  persistenceBeats: 4,
  meterPersistenceBars: 2,
  minimumBoundaryBars: 2
});

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function observationAtBeat(observations, beatIndex) {
  const exact = observations.find((observation) => observation.beatIndex === beatIndex);
  if (exact) return exact;
  const left = [...observations].reverse().find((observation) => observation.beatIndex < beatIndex);
  const right = observations.find((observation) => observation.beatIndex > beatIndex);
  if (!left || !right) return null;
  const ratio = (beatIndex - left.beatIndex) / (right.beatIndex - left.beatIndex);
  return {
    beatIndex,
    timeSeconds: left.timeSeconds + ratio * (right.timeSeconds - left.timeSeconds),
    strength: Math.min(left.strength ?? 1, right.strength ?? 1)
  };
}

function normalizedObservations(value) {
  return (Array.isArray(value) ? value : [])
    .map((candidate) => ({
      beatIndex: Math.round(Number(candidate?.beatIndex)),
      timeSeconds: finite(candidate?.timeSeconds),
      strength: Math.max(0, finite(candidate?.strength) ?? 1)
    }))
    .filter((candidate) => Number.isInteger(candidate.beatIndex) && candidate.timeSeconds !== null)
    .sort((left, right) => left.beatIndex - right.beatIndex)
    .filter((candidate, index, values) => !index || candidate.beatIndex > values[index - 1].beatIndex);
}

function meterCandidatesFromObservations(meterObservations, baseMeter, thresholds) {
  const normalized = (Array.isArray(meterObservations) ? meterObservations : [])
    .map((candidate) => ({
      bar: Math.max(1, Math.round(Number(candidate?.bar) || 1)),
      beatsPerBar: Math.round(Number(candidate?.beatsPerBar)),
      beatUnit: Math.round(Number(candidate?.beatUnit) || 4),
      confidence: Math.max(0, Math.min(1, finite(candidate?.confidence) ?? 0))
    }))
    .filter((candidate) => ["3/4", "4/4", "5/4", "6/8", "7/8", "12/8"].includes(`${candidate.beatsPerBar}/${candidate.beatUnit}`))
    .sort((left, right) => left.bar - right.bar);
  const candidates = [];
  let active = `${baseMeter.beatsPerBar}/${baseMeter.beatUnit}`;
  let run = [];
  for (const observation of normalized) {
    const signature = `${observation.beatsPerBar}/${observation.beatUnit}`;
    const consecutive = run.length && run.at(-1).bar + 1 === observation.bar && `${run.at(-1).beatsPerBar}/${run.at(-1).beatUnit}` === signature;
    run = consecutive ? [...run, observation] : [observation];
    if (signature === active || run.length < thresholds.meterPersistenceBars) continue;
    const first = run[0];
    candidates.push({
      type: "meter",
      bar: first.bar,
      timeSignature: { beatsPerBar: first.beatsPerBar, beatUnit: first.beatUnit },
      confidence: Number((run.reduce((sum, item) => sum + item.confidence, 0) / run.length).toFixed(2)),
      reason: `meter persisted for ${run.length} bars`
    });
    active = signature;
    run = [];
  }
  return candidates;
}

export function fitStableTimingSpans({
  observations,
  baseBpm,
  beatsPerBar = 4,
  beatUnit = 4,
  downbeatTime = 0,
  meterObservations = []
}, options = {}) {
  const thresholds = { ...defaultTimingThresholds, ...options };
  const normalized = normalizedObservations(observations);
  const baseDuration = 60 / Number(baseBpm);
  if (!Number.isFinite(baseDuration) || baseDuration <= 0 || normalized.length < 2) {
    return { version: 1, thresholds, observations: normalized, candidates: [], timingMap: null };
  }

  const baseMeter = { beatsPerBar: Math.max(1, Math.round(beatsPerBar)), beatUnit: Math.max(1, Math.round(beatUnit)) };
  const timingCandidates = [];
  let baselineBeat = 0;
  let baselineTime = Number(downbeatTime) || 0;
  let activeDuration = baseDuration;
  let run = [];
  let lastBoundaryBar = 1;

  for (let index = 1; index < normalized.length; index += 1) {
    const current = normalized[index];
    const previous = normalized[index - 1];
    const beatDistance = current.beatIndex - previous.beatIndex;
    if (beatDistance <= 0) continue;
    const localDuration = (current.timeSeconds - previous.timeSeconds) / beatDistance;
    const predicted = baselineTime + (current.beatIndex - baselineBeat) * activeDuration;
    const phaseError = current.timeSeconds - predicted;
    const tempoDeviation = (localDuration - activeDuration) / activeDuration;
    const exceeds = Math.abs(tempoDeviation) >= thresholds.tempoThresholdRelative
      || Math.abs(phaseError) >= activeDuration * thresholds.phaseThresholdRelative;
    const sign = Math.sign(Math.abs(tempoDeviation) >= thresholds.tempoThresholdRelative ? tempoDeviation : phaseError);
    const continues = exceeds && run.length && run.at(-1).sign === sign && run.at(-1).beatIndex + beatDistance === current.beatIndex;
    run = exceeds
      ? [...(continues ? run : []), { beatIndex: current.beatIndex, localDuration, phaseError, tempoDeviation, sign }]
      : [];
    if (run.length < thresholds.persistenceBeats) continue;

    const firstChangedBeat = run[0].beatIndex - 1;
    const boundaryBar = Math.max(2, Math.ceil(firstChangedBeat / baseMeter.beatsPerBar) + 1);
    if (boundaryBar - lastBoundaryBar < thresholds.minimumBoundaryBars) continue;
    const boundaryBeat = (boundaryBar - 1) * baseMeter.beatsPerBar;
    const boundaryObservation = observationAtBeat(normalized, boundaryBeat);
    if (!boundaryObservation) continue;
    const nextDuration = median(run.map((entry) => entry.localDuration));
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) continue;
    const confirmationBar = boundaryBar + 1;
    const confirmationBeat = (confirmationBar - 1) * baseMeter.beatsPerBar;
    const confirmationObservation = observationAtBeat(normalized, confirmationBeat);
    if (!confirmationObservation) continue;
    const averageDeviation = run.reduce((sum, entry) => sum + Math.abs(entry.tempoDeviation), 0) / run.length;
    timingCandidates.push({
      type: "tempo",
      bar: boundaryBar,
      timeSeconds: Number(boundaryObservation.timeSeconds.toFixed(3)),
      confirmationBar,
      confirmationTimeSeconds: Number(confirmationObservation.timeSeconds.toFixed(3)),
      bpm: Number((60 / nextDuration).toFixed(1)),
      confidence: Number(Math.min(0.98, 0.55 + averageDeviation).toFixed(2)),
      phaseErrorSeconds: Number(run.at(-1).phaseError.toFixed(3)),
      reason: `relative deviation persisted for ${run.length} beats`
    });
    baselineBeat = boundaryBeat;
    baselineTime = boundaryObservation.timeSeconds;
    activeDuration = nextDuration;
    lastBoundaryBar = boundaryBar;
    run = [];
  }

  const meterCandidates = meterCandidatesFromObservations(meterObservations, baseMeter, thresholds);
  const candidates = [...timingCandidates, ...meterCandidates].sort((left, right) => left.bar - right.bar || left.type.localeCompare(right.type));
  const eventMap = new Map([[1, {
    bar: 1,
    timeSeconds: Number((Number(downbeatTime) || 0).toFixed(3)),
    timeSignature: baseMeter
  }]]);
  for (const candidate of candidates) {
    const event = eventMap.get(candidate.bar) || { bar: candidate.bar };
    if (candidate.type === "tempo") event.timeSeconds = candidate.timeSeconds;
    if (candidate.type === "meter") event.timeSignature = candidate.timeSignature;
    eventMap.set(candidate.bar, event);
    if (candidate.type === "tempo") {
      const confirmationEvent = eventMap.get(candidate.confirmationBar) || { bar: candidate.confirmationBar };
      confirmationEvent.timeSeconds = candidate.confirmationTimeSeconds;
      eventMap.set(candidate.confirmationBar, confirmationEvent);
    }
  }
  const events = [...eventMap.values()].sort((left, right) => left.bar - right.bar);
  return {
    version: 1,
    method: "persistent-relative-deviation-v1",
    thresholds,
    observations: normalized,
    candidates,
    timingMap: candidates.length ? { version: 2, events } : null
  };
}

export function evaluateTimingFixture(fixture, result) {
  const grid = {
    bpm: fixture.baseBpm,
    beatDurationSeconds: 60 / fixture.baseBpm,
    beatsPerBar: fixture.beatsPerBar,
    beatUnit: fixture.beatUnit,
    downbeatOffsetSeconds: fixture.downbeatTime,
    timingMap: result.timingMap
  };
  const errors = fixture.barTimes.map((referenceTime, index) =>
    Math.abs(musicalPositionToSeconds(grid, { bar: index + 1, beat: 1 }) - referenceTime)
  );
  const referenceMeter = fixture.meterByBar || [];
  const meterMatches = referenceMeter.map((signature, index) => {
    const actual = timeSignatureAtBar(grid, index + 1);
    return actual.beatsPerBar === signature.beatsPerBar && actual.beatUnit === signature.beatUnit;
  });
  const endSeconds = Math.max(...fixture.observations.map((observation) => observation.timeSeconds));
  const estimatedBeats = enumerateGridBeats(grid, Math.min(0, fixture.downbeatTime), endSeconds, { paddingBeats: 0 });
  const referenceBeatTimes = fixture.observations
    .filter((observation) => observation.beatIndex >= 0)
    .map((observation) => observation.timeSeconds);
  const matchWithin = (referenceTimes, estimatedTimes, toleranceSeconds = 0.075) => {
    const available = [...estimatedTimes];
    let matches = 0;
    for (const referenceTime of referenceTimes) {
      let bestIndex = -1;
      let bestError = Infinity;
      available.forEach((estimatedTime, index) => {
        const error = Math.abs(estimatedTime - referenceTime);
        if (error < bestError) {
          bestError = error;
          bestIndex = index;
        }
      });
      if (bestIndex >= 0 && bestError <= toleranceSeconds) {
        matches += 1;
        available.splice(bestIndex, 1);
      }
    }
    return {
      precision: estimatedTimes.length ? matches / estimatedTimes.length : 0,
      recall: referenceTimes.length ? matches / referenceTimes.length : 0
    };
  };
  const beatMatches = matchWithin(referenceBeatTimes, estimatedBeats.map((beat) => beat.timeSeconds));
  const downbeatMatches = matchWithin(fixture.barTimes, estimatedBeats.filter((beat) => beat.downbeat).map((beat) => beat.timeSeconds));
  const detectedBoundaryBars = result.candidates.map((candidate) => candidate.bar);
  const boundaryErrors = (fixture.expectedCandidateBars || []).map((expectedBar) =>
    Math.min(Infinity, ...detectedBoundaryBars.map((bar) => Math.abs(bar - expectedBar)))
  );
  return {
    name: fixture.name,
    barLineMeanAbsoluteErrorSeconds: Number((errors.reduce((sum, error) => sum + error, 0) / Math.max(1, errors.length)).toFixed(4)),
    barLineMaxErrorSeconds: Number(Math.max(0, ...errors).toFixed(4)),
    cumulativePhaseDriftSeconds: Number((errors.at(-1) || 0).toFixed(4)),
    barOneErrorSeconds: Number(Math.abs(musicalPositionToSeconds(grid, { bar: 1, beat: 1 }) - fixture.barTimes[0]).toFixed(4)),
    beatPrecision: Number(beatMatches.precision.toFixed(4)),
    beatRecall: Number(beatMatches.recall.toFixed(4)),
    downbeatPrecision: Number(downbeatMatches.precision.toFixed(4)),
    downbeatRecall: Number(downbeatMatches.recall.toFixed(4)),
    changeBoundaryMeanErrorBars: boundaryErrors.length
      ? Number((boundaryErrors.reduce((sum, error) => sum + error, 0) / boundaryErrors.length).toFixed(4))
      : null,
    meterAccuracy: meterMatches.length
      ? Number((meterMatches.filter(Boolean).length / meterMatches.length).toFixed(4))
      : null,
    candidateBars: result.candidates.map((candidate) => ({ type: candidate.type, bar: candidate.bar }))
  };
}
