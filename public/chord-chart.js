import {
  absoluteBeatToMusicalPosition,
  absoluteBeatToSeconds,
  barStartAbsoluteBeat,
  musicalPositionToSeconds,
  secondsToAbsoluteBeat,
  secondsToMusicalPosition,
  timeSignatureAtBar
} from "./tempo-map.js";

export const notePitchClasses = {
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

export const keyTonics = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
export const keyModes = ["major", "minor"];
export const defaultTimeSignature = { beatsPerBar: 4, beatUnit: 4 };
export const defaultChordDivisionsPerQuarter = 4;
export const maxChordChartDivisions = 4096;

const pitchClassNames = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const minorScale = [0, 2, 3, 5, 7, 8, 10];
const romanDegrees = ["I", "II", "III", "IV", "V", "VI", "VII"];
const chordChartVersion = 1;
const maxChordChartChords = 4096;
const maxChordChartBars = 10000;
const supportedBarsPerRow = [1, 2, 4, 8];
const supportedChordDisplays = ["both", "name", "roman"];

export function createChordId() {
  return globalThis.crypto?.randomUUID?.() || `chord-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clampedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.max(min, Math.min(max, number)));
}

export function normalizedChordChart(state = null, idFactory = createChordId) {
  const source = state?.chordChart;
  if (!source || typeof source !== "object" || !Array.isArray(source.chords)) return null;

  const divisionsPerQuarter = clampedInteger(
    source.divisionsPerQuarter,
    defaultChordDivisionsPerQuarter,
    1,
    24
  );

  const chords = source.chords
    .map((chord) => {
      const raw = String(chord?.raw || "").trim().slice(0, 48);
      const durationDiv = clampedInteger(chord?.durationDiv, null, 1, maxChordChartDivisions);
      if (!raw || durationDiv === null) return null;

      return {
        id: String(chord?.id || idFactory()).trim().slice(0, 64) || idFactory(),
        bar: clampedInteger(chord?.bar, 1, 1, maxChordChartBars),
        offsetDiv: clampedInteger(chord?.offsetDiv, 0, 0, maxChordChartDivisions),
        durationDiv,
        raw,
        source: "user"
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.bar - right.bar || left.offsetDiv - right.offsetDiv)
    .slice(0, maxChordChartChords);

  return {
    version: chordChartVersion,
    divisionsPerQuarter,
    chords
  };
}

export function normalizedHarmonyView(state = null) {
  const source = state?.harmonyView || {};
  const barsPerRow = clampedInteger(source.barsPerRow, 2, 1, 8);
  const chordDisplay = supportedChordDisplays.includes(source.chordDisplay) ? source.chordDisplay : "both";
  return {
    barsPerRow: supportedBarsPerRow.includes(barsPerRow) ? barsPerRow : 2,
    chordDisplay,
    sectionInfoVisible: source.sectionInfoVisible !== false
  };
}

export function chartDivisionsPerBeat(grid, divisionsPerQuarter = defaultChordDivisionsPerQuarter) {
  const beatUnit = Number(grid?.beatUnit) || defaultTimeSignature.beatUnit;
  return Math.max(1, Math.round(divisionsPerQuarter * (4 / beatUnit)));
}

export function chartDivisionsPerBar(grid, divisionsPerQuarter = defaultChordDivisionsPerQuarter) {
  const beatsPerBar = Number(grid?.beatsPerBar) || defaultTimeSignature.beatsPerBar;
  return Math.max(1, Math.round(beatsPerBar * chartDivisionsPerBeat(grid, divisionsPerQuarter)));
}

export function fallbackChartGrid(grid = null) {
  const beatDurationSeconds = Number(grid?.beatDurationSeconds);
  return {
    beatDurationSeconds: Number.isFinite(beatDurationSeconds) && beatDurationSeconds > 0 ? beatDurationSeconds : 1,
    beatsPerBar: Number(grid?.beatsPerBar) || defaultTimeSignature.beatsPerBar,
    beatUnit: Number(grid?.beatUnit) || defaultTimeSignature.beatUnit,
    downbeatOffsetSeconds: Number(grid?.downbeatOffsetSeconds) || 0,
    timingMap: grid?.timingMap || null,
    tempoMap: grid?.tempoMap || null,
    durationSeconds: Number(grid?.durationSeconds) || null
  };
}

export function chartChordTotalDiv(chord, grid, divisionsPerQuarter) {
  const bar = Math.max(1, Number(chord.bar) || 1);
  return Math.max(0, chartDivisionsBeforeBar(grid, bar, divisionsPerQuarter) + Math.max(0, Number(chord.offsetDiv) || 0));
}

export function chartPositionFromTotalDiv(totalDiv, grid, divisionsPerQuarter) {
  const bounded = Math.max(0, Math.round(totalDiv));
  let consumed = 0;
  for (let bar = 1; bar <= 10000; bar += 1) {
    const barDivisions = chartDivisionsPerBar(timeSignatureAtBar(grid, bar), divisionsPerQuarter);
    if (bounded < consumed + barDivisions) return { bar, offsetDiv: bounded - consumed };
    consumed += barDivisions;
  }
  return { bar: 10000, offsetDiv: 0 };
}

function chartDivisionsBeforeBar(grid, bar, divisionsPerQuarter) {
  let result = 0;
  for (let currentBar = 1; currentBar < Math.max(1, bar); currentBar += 1) {
    result += chartDivisionsPerBar(timeSignatureAtBar(grid, currentBar), divisionsPerQuarter);
  }
  return result;
}

export function chordCueToChartEvent(chord, grid, divisionsPerQuarter, idFactory = createChordId) {
  const chartGrid = fallbackChartGrid(grid);
  const startSeconds = Number(chord.start);
  const endSeconds = Number(chord.end);
  const startPosition = Number.isFinite(startSeconds)
    ? secondsToMusicalPosition(chartGrid, startSeconds)
    : { bar: Number(chord.bar) || 1, beat: Number(chord.beat) || 1 };
  const startSignature = timeSignatureAtBar(chartGrid, startPosition.bar);
  const startDivPerBeat = chartDivisionsPerBeat(startSignature, divisionsPerQuarter);
  const startDiv = chartDivisionsBeforeBar(chartGrid, startPosition.bar, divisionsPerQuarter)
    + Math.max(0, Math.round((startPosition.beat - 1) * startDivPerBeat));
  const endPosition = Number.isFinite(endSeconds) ? secondsToMusicalPosition(chartGrid, endSeconds) : null;
  const endDiv = endPosition
    ? chartDivisionsBeforeBar(chartGrid, endPosition.bar, divisionsPerQuarter)
      + Math.max(0, Math.round((endPosition.beat - 1) * chartDivisionsPerBeat(timeSignatureAtBar(chartGrid, endPosition.bar), divisionsPerQuarter)))
    : startDiv + chartDivisionsPerBar(startSignature, divisionsPerQuarter);
  const durationDiv = Math.max(1, endDiv - startDiv);
  const position = chartPositionFromTotalDiv(startDiv, chartGrid, divisionsPerQuarter);

  return {
    id: idFactory(),
    ...position,
    durationDiv,
    raw: String(chord.name || chord.raw || "C").trim().slice(0, 48) || "C",
    source: "user"
  };
}

export function chordChartContainsCue(chart, grid, cue) {
  const normalized = normalizedChordChart({ chordChart: chart });
  if (!normalized) return false;
  const candidate = chordCueToChartEvent(cue, grid, normalized.divisionsPerQuarter);
  const candidateStart = chartChordTotalDiv(candidate, grid, normalized.divisionsPerQuarter);
  return normalized.chords.some((chord) =>
    chartChordTotalDiv(chord, grid, normalized.divisionsPerQuarter) === candidateStart &&
    chord.raw === candidate.raw &&
    chord.durationDiv >= candidate.durationDiv
  );
}

export function recoverChordCueInChart(chart, grid, cue, idFactory = createChordId) {
  const normalized = normalizedChordChart({ chordChart: chart }, idFactory);
  if (!normalized) return chart;

  const chartGrid = fallbackChartGrid(grid);
  const divisionsPerQuarter = normalized.divisionsPerQuarter;
  const candidate = chordCueToChartEvent(cue, chartGrid, divisionsPerQuarter, idFactory);
  const candidateStart = chartChordTotalDiv(candidate, chartGrid, divisionsPerQuarter);
  const candidateEnd = candidateStart + candidate.durationDiv;
  const chords = [];

  for (const chord of normalized.chords) {
    const chordStart = chartChordTotalDiv(chord, chartGrid, divisionsPerQuarter);
    const chordEnd = chordStart + chord.durationDiv;
    if (chordEnd <= candidateStart || chordStart >= candidateEnd) {
      chords.push(chord);
      continue;
    }

    if (chordStart < candidateStart) {
      chords.push({ ...chord, durationDiv: candidateStart - chordStart });
    }
    if (chordEnd > candidateEnd) {
      chords.push({
        ...chord,
        id: idFactory(),
        ...chartPositionFromTotalDiv(candidateEnd, chartGrid, divisionsPerQuarter),
        durationDiv: chordEnd - candidateEnd
      });
    }
  }

  chords.push(candidate);
  return normalizeEditedChart(normalized, chords, idFactory);
}

export function chordChartToCues(chart, grid, key) {
  const normalized = normalizedChordChart({ chordChart: chart });
  if (!normalized) return null;

  const chartGrid = fallbackChartGrid(grid);
  return normalized.chords.map((chord) => {
    const startPosition = chartPositionFromTotalDiv(
      chartChordTotalDiv(chord, chartGrid, normalized.divisionsPerQuarter),
      chartGrid,
      normalized.divisionsPerQuarter
    );
    const endPosition = chartPositionFromTotalDiv(
      chartChordTotalDiv(chord, chartGrid, normalized.divisionsPerQuarter) + chord.durationDiv,
      chartGrid,
      normalized.divisionsPerQuarter
    );
    const startDivPerBeat = chartDivisionsPerBeat(timeSignatureAtBar(chartGrid, startPosition.bar), normalized.divisionsPerQuarter);
    const endDivPerBeat = chartDivisionsPerBeat(timeSignatureAtBar(chartGrid, endPosition.bar), normalized.divisionsPerQuarter);
    const startBeat = startPosition.offsetDiv / startDivPerBeat + 1;
    const endBeat = endPosition.offsetDiv / endDivPerBeat + 1;
    const start = musicalPositionToSeconds(chartGrid, { bar: startPosition.bar, beat: startBeat });
    const end = musicalPositionToSeconds(chartGrid, { bar: endPosition.bar, beat: endBeat });
    return {
      chartId: chord.id,
      start,
      end,
      bar: chord.bar,
      beat: Number(startBeat.toFixed(2)),
      name: chord.raw,
      roman: romanNumeralForChord(chord.raw, key),
      source: "user"
    };
  });
}

export function chordBeatRange(chord, grid) {
  if (!grid || !Number.isFinite(grid.beatDurationSeconds) || grid.beatDurationSeconds <= 0) {
    return null;
  }

  const startSeconds = Number(chord.start);
  const endSeconds = Number(chord.end);
  const bar = Number(chord.bar);
  const beat = Number(chord.beat || 1);
  let startBeat = null;

  if (Number.isFinite(startSeconds)) {
    startBeat = secondsToAbsoluteBeat(grid, startSeconds);
  } else if (Number.isFinite(bar) && bar > 0 && Number.isFinite(beat) && beat > 0) {
    startBeat = barStartAbsoluteBeat(grid, bar) + (beat - 1);
  }

  if (!Number.isFinite(startBeat)) return null;

  let endBeat = Number.isFinite(endSeconds)
    ? secondsToAbsoluteBeat(grid, endSeconds)
    : startBeat + 1;
  if (!Number.isFinite(endBeat) || endBeat <= startBeat) {
    endBeat = startBeat + 1;
  }

  return { startBeat, endBeat };
}

export function chordGridPosition(beatIndex, grid) {
  const roundedBeatIndex = Math.max(0, Math.floor(beatIndex + 0.001));
  const position = absoluteBeatToMusicalPosition(grid, roundedBeatIndex);
  return { bar: position?.bar || 1, beat: position?.beat || 1 };
}

export function adjustChordTimingForGrid(chord, sourceGrid, targetGrid) {
  if (!sourceGrid || !targetGrid || !Number.isFinite(targetGrid.beatDurationSeconds) || targetGrid.beatDurationSeconds <= 0) {
    return chord;
  }

  const beatRange = chordBeatRange(chord, sourceGrid);
  if (!beatRange) return chord;

  const start = absoluteBeatToSeconds(targetGrid, beatRange.startBeat);
  const end = absoluteBeatToSeconds(targetGrid, beatRange.endBeat);
  const gridPosition = chordGridPosition(beatRange.startBeat, targetGrid);

  return {
    ...chord,
    start,
    end,
    bar: gridPosition.bar,
    beat: gridPosition.beat
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

export function romanNumeralForChord(chordName, key) {
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

function snapNearInteger(value, epsilon = 0.01) {
  const rounded = Math.round(value);
  return Math.abs(value - rounded) <= epsilon ? rounded : value;
}

export function formatBeatNumber(value) {
  const rounded = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(rounded)) return "1";
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function chordGridHit(chord, grid) {
  const chartGrid = fallbackChartGrid(grid);
  const bar = Number(chord.bar);
  const beat = Number(chord.beat);
  let absoluteBeat = null;

  if (Number.isFinite(bar) && bar > 0 && Number.isFinite(beat) && beat > 0) {
    absoluteBeat = barStartAbsoluteBeat(chartGrid, bar) + (beat - 1);
  } else {
    const start = Number(chord.start);
    if (Number.isFinite(start) && Number.isFinite(chartGrid.beatDurationSeconds) && chartGrid.beatDurationSeconds > 0) {
      absoluteBeat = secondsToAbsoluteBeat(chartGrid, start);
    }
  }

  const rawBeat = Number(absoluteBeat);
  const snappedBeat = Math.max(0, snapNearInteger(Number.isFinite(rawBeat) ? rawBeat : 0));
  const position = absoluteBeatToMusicalPosition(chartGrid, snappedBeat);
  return { bar: position?.bar || 1, beat: position?.beat || 1 };
}

export function seedChordChart({ chordChart, sourceChords = [], grid, idFactory = createChordId }) {
  if (chordChart) {
    const normalized = normalizedChordChart({ chordChart }, idFactory);
    if (normalized) return normalized;
  }

  const chartGrid = fallbackChartGrid(grid);
  const chords = sourceChords.map((chord) =>
    chordCueToChartEvent(chord, chartGrid, defaultChordDivisionsPerQuarter, idFactory)
  );

  return normalizedChordChart({
    chordChart: {
      version: chordChartVersion,
      divisionsPerQuarter: defaultChordDivisionsPerQuarter,
      chords: chords.length
        ? chords
        : [
          {
            id: idFactory(),
            bar: 1,
            offsetDiv: 0,
            durationDiv: chartDivisionsPerBar(chartGrid, defaultChordDivisionsPerQuarter),
            raw: "C",
            source: "user"
          }
        ]
    }
  }, idFactory);
}

function normalizeEditedChart(baseChart, nextChords, idFactory = createChordId) {
  return normalizedChordChart({
    chordChart: {
      ...(baseChart || {
        version: chordChartVersion,
        divisionsPerQuarter: defaultChordDivisionsPerQuarter
      }),
      chords: nextChords
    }
  }, idFactory);
}

export function chartCellTotalDiv(bar, beat, grid, divisionsPerQuarter) {
  const safeBar = clampedInteger(bar, 1, 1, maxChordChartBars);
  const signature = timeSignatureAtBar(grid, safeBar);
  const safeBeat = clampedInteger(beat, 1, 1, signature.beatsPerBar);
  return chartDivisionsBeforeBar(grid, safeBar, divisionsPerQuarter)
    + (safeBeat - 1) * chartDivisionsPerBeat(signature, divisionsPerQuarter);
}

export function deleteChordFromChart(chart, index, idFactory = createChordId) {
  const chords = [...(chart?.chords || [])];
  if (!chords[index]) return chart;
  chords.splice(index, 1);
  return normalizeEditedChart(chart, chords, idFactory);
}

export function updateChordNameInChart(chart, index, value, idFactory = createChordId) {
  const chords = [...(chart?.chords || [])];
  if (!chords[index]) return chart;
  const raw = String(value || "").trim().slice(0, 48);
  if (!raw) return chart;
  chords[index] = { ...chords[index], raw };
  return normalizeEditedChart(chart, chords, idFactory);
}

export function addChordAtCellToChart(chart, grid, bar, beat, idFactory = createChordId) {
  const chartGrid = fallbackChartGrid(grid);
  const divisionsPerQuarter = chart?.divisionsPerQuarter || defaultChordDivisionsPerQuarter;
  const chords = (chart?.chords || []).map((chord) => ({ ...chord }));
  const startDiv = chartCellTotalDiv(bar, beat, chartGrid, divisionsPerQuarter);
  const signature = timeSignatureAtBar(chartGrid, bar);
  const beatDiv = chartDivisionsPerBeat(signature, divisionsPerQuarter);
  const barEnd = chartDivisionsBeforeBar(chartGrid, bar, divisionsPerQuarter)
    + chartDivisionsPerBar(signature, divisionsPerQuarter);
  const sorted = chords
    .map((chord) => ({ chord, start: chartChordTotalDiv(chord, chartGrid, divisionsPerQuarter) }))
    .sort((left, right) => left.start - right.start);
  const previous = [...sorted].reverse().find((entry) => entry.start < startDiv);
  const next = sorted.find((entry) => entry.start > startDiv);
  if (previous && previous.start + previous.chord.durationDiv > startDiv) {
    previous.chord.durationDiv = Math.max(1, startDiv - previous.start);
  }
  const nextStart = next ? Math.min(next.start, barEnd) : barEnd;
  const durationDiv = Math.max(beatDiv, nextStart - startDiv);
  const reference = previous?.chord || next?.chord || chords.at(-1);

  chords.push({
    id: idFactory(),
    ...chartPositionFromTotalDiv(startDiv, chartGrid, divisionsPerQuarter),
    durationDiv,
    raw: reference?.raw || "C",
    source: "user"
  });
  return normalizeEditedChart(chart, chords, idFactory);
}

export function moveChordToCellInChart(chart, grid, index, bar, beat, idFactory = createChordId) {
  const chartGrid = fallbackChartGrid(grid);
  const divisionsPerQuarter = chart?.divisionsPerQuarter || defaultChordDivisionsPerQuarter;
  const chords = [...(chart?.chords || [])];
  const chord = chords[index];
  if (!chord) return chart;

  const startDiv = chartCellTotalDiv(bar, beat, chartGrid, divisionsPerQuarter);
  const nextStart = chords
    .filter((candidate, candidateIndex) => candidateIndex !== index)
    .map((candidate) => chartChordTotalDiv(candidate, chartGrid, divisionsPerQuarter))
    .filter((candidateStart) => candidateStart > startDiv)
    .sort((left, right) => left - right)[0];
  const beatDiv = chartDivisionsPerBeat(timeSignatureAtBar(chartGrid, bar), divisionsPerQuarter);
  chords[index] = {
    ...chord,
    ...chartPositionFromTotalDiv(startDiv, chartGrid, divisionsPerQuarter),
    durationDiv: Math.max(beatDiv, Math.min(chord.durationDiv, (nextStart || startDiv + chord.durationDiv) - startDiv))
  };
  return normalizeEditedChart(chart, chords, idFactory);
}

export function resizeChordToBeatBoundaryInChart(chart, grid, index, bar, boundaryBeat, idFactory = createChordId) {
  const chartGrid = fallbackChartGrid(grid);
  const chords = [...(chart?.chords || [])];
  const chord = chords[index];
  if (!chord) return chart;

  const divisionsPerQuarter = chart?.divisionsPerQuarter || defaultChordDivisionsPerQuarter;
  const signature = timeSignatureAtBar(chartGrid, bar);
  const beatDiv = chartDivisionsPerBeat(signature, divisionsPerQuarter);
  const barDiv = chartDivisionsPerBar(signature, divisionsPerQuarter);
  const startDiv = chartChordTotalDiv(chord, chartGrid, divisionsPerQuarter);
  const barStartDiv = chartDivisionsBeforeBar(chartGrid, bar, divisionsPerQuarter);
  const barEndDiv = barStartDiv + barDiv;
  const requestedEndDiv = barStartDiv + clampedInteger(boundaryBeat, 1, 1, signature.beatsPerBar) * beatDiv;
  const nextStart = chords
    .filter((candidate, candidateIndex) => candidateIndex !== index)
    .map((candidate) => chartChordTotalDiv(candidate, chartGrid, divisionsPerQuarter))
    .filter((candidateStart) => candidateStart > startDiv)
    .sort((left, right) => left - right)[0];
  const maxEndDiv = Math.max(startDiv + beatDiv, Math.min(nextStart || barEndDiv, barEndDiv));
  const endDiv = Math.max(startDiv + beatDiv, Math.min(requestedEndDiv, maxEndDiv));
  chords[index] = {
    ...chord,
    durationDiv: endDiv - startDiv,
    source: "user"
  };
  return normalizeEditedChart(chart, chords, idFactory);
}
