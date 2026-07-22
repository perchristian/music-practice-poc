import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addChordAtCellToChart,
  chordChartContainsCue,
  chordChartToCues,
  deleteChordFromChart,
  moveChordToCellInChart,
  normalizedChordChart,
  resizeChordToBeatBoundaryInChart,
  recoverChordCueInChart,
  seedChordChart,
  updateChordNameInChart
} from "../public/chord-chart.js";

const grid = {
  bpm: 60,
  beatDurationSeconds: 1,
  beatsPerBar: 4,
  beatUnit: 4,
  downbeatOffsetSeconds: 0,
  durationSeconds: 16
};

function ids(prefix = "chord") {
  let index = 0;
  return () => `${prefix}-${++index}`;
}

function baseChart() {
  return normalizedChordChart({
    chordChart: {
      version: 1,
      divisionsPerQuarter: 4,
      chords: [
        { id: "c", bar: 1, offsetDiv: 0, durationDiv: 16, raw: "Cmaj7" },
        { id: "f", bar: 2, offsetDiv: 0, durationDiv: 16, raw: "F" }
      ]
    }
  });
}

describe("chord chart transforms", () => {
  it("normalizes an explicit empty chord chart instead of treating it as missing", () => {
    const chart = normalizedChordChart({
      chordChart: {
        version: 1,
        divisionsPerQuarter: 4,
        chords: []
      }
    });

    assert.deepEqual(chart, {
      version: 1,
      divisionsPerQuarter: 4,
      chords: []
    });
  });

  it("retains full-song working charts with more than 128 chord events", () => {
    const chart = normalizedChordChart({
      chordChart: {
        version: 1,
        divisionsPerQuarter: 4,
        chords: Array.from({ length: 160 }, (_, index) => ({
          id: `long-${index + 1}`,
          bar: index + 1,
          offsetDiv: 0,
          durationDiv: 16,
          raw: index % 2 ? "F" : "C"
        }))
      }
    });

    assert.equal(chart.chords.length, 160);
    assert.equal(chart.chords.at(-1).bar, 160);
  });

  it("seeds analyzer chords only when no user chart exists", () => {
    const chart = seedChordChart({
      chordChart: null,
      sourceChords: [{ start: 0, end: 4, name: "C" }],
      grid,
      idFactory: ids("seed")
    });

    assert.equal(chart.chords.length, 1);
    assert.deepEqual(chart.chords[0], {
      id: "seed-1",
      bar: 1,
      offsetDiv: 0,
      durationDiv: 16,
      raw: "C",
      source: "user"
    });

    const emptyChart = seedChordChart({
      chordChart: { version: 1, divisionsPerQuarter: 4, chords: [] },
      sourceChords: [{ start: 0, end: 4, name: "C" }],
      grid,
      idFactory: ids("empty")
    });
    assert.deepEqual(emptyChart.chords, []);
  });

  it("adds a chord at a beat cell and shortens the previous spanning chord", () => {
    const chart = addChordAtCellToChart(baseChart(), grid, 1, 3, ids("add"));

    assert.deepEqual(
      chart.chords.map(({ id, bar, offsetDiv, durationDiv, raw }) => ({ id, bar, offsetDiv, durationDiv, raw })),
      [
        { id: "c", bar: 1, offsetDiv: 0, durationDiv: 8, raw: "Cmaj7" },
        { id: "add-1", bar: 1, offsetDiv: 8, durationDiv: 8, raw: "Cmaj7" },
        { id: "f", bar: 2, offsetDiv: 0, durationDiv: 16, raw: "F" }
      ]
    );
  });

  it("recovers a suppressed beat without overwriting the surrounding working chord", () => {
    const chart = {
      version: 1,
      divisionsPerQuarter: 4,
      chords: [{ id: "whole", bar: 1, offsetDiv: 0, durationDiv: 16, raw: "C", source: "user" }]
    };
    const grid = { bpm: 60, beatDurationSeconds: 1, beatsPerBar: 4, beatUnit: 4, downbeatOffsetSeconds: 0 };
    const cue = { bar: 1, beat: 2, start: 1, end: 2, name: "G" };

    const recovered = recoverChordCueInChart(chart, grid, cue, ids("recover"));

    assert.deepEqual(recovered.chords.map(({ bar, offsetDiv, durationDiv, raw }) => ({ bar, offsetDiv, durationDiv, raw })), [
      { bar: 1, offsetDiv: 0, durationDiv: 4, raw: "C" },
      { bar: 1, offsetDiv: 4, durationDiv: 4, raw: "G" },
      { bar: 1, offsetDiv: 8, durationDiv: 8, raw: "C" }
    ]);
    assert.equal(chordChartContainsCue(recovered, grid, cue), true);
    assert.equal(chordChartContainsCue(chart, grid, cue), false);
  });

  it("moves a chord to a beat cell and preserves beat-bounded duration", () => {
    const chart = moveChordToCellInChart(baseChart(), grid, 0, 1, 2);

    assert.deepEqual(
      chart.chords.map(({ id, bar, offsetDiv, durationDiv }) => ({ id, bar, offsetDiv, durationDiv })),
      [
        { id: "c", bar: 1, offsetDiv: 4, durationDiv: 12 },
        { id: "f", bar: 2, offsetDiv: 0, durationDiv: 16 }
      ]
    );
  });

  it("resizes a chord to a beat boundary without crossing the next chord", () => {
    const chart = resizeChordToBeatBoundaryInChart(baseChart(), grid, 0, 1, 2);
    assert.equal(chart.chords[0].durationDiv, 8);

    const blocked = resizeChordToBeatBoundaryInChart(baseChart(), grid, 0, 1, 4);
    assert.equal(blocked.chords[0].durationDiv, 16);
  });

  it("updates and deletes user chords while preserving analyzer provenance outside the chart", () => {
    const renamed = updateChordNameInChart(baseChart(), 0, "Csus2/G");
    assert.equal(renamed.chords[0].raw, "Csus2/G");

    const deleted = deleteChordFromChart(renamed, 0);
    assert.deepEqual(
      deleted.chords.map(({ id, raw }) => ({ id, raw })),
      [{ id: "f", raw: "F" }]
    );
  });

  it("converts grid-first chart events to timed cues with roman numerals", () => {
    const cues = chordChartToCues(baseChart(), grid, { tonic: "C", mode: "major" });

    assert.deepEqual(
      cues.map(({ chartId, start, end, bar, beat, name, roman, source }) => ({
        chartId,
        start,
        end,
        bar,
        beat,
        name,
        roman,
        source
      })),
      [
        { chartId: "c", start: 0, end: 4, bar: 1, beat: 1, name: "Cmaj7", roman: "Imaj7", source: "user" },
        { chartId: "f", start: 4, end: 8, bar: 2, beat: 1, name: "F", roman: "IV", source: "user" }
      ]
    );
  });

  it("derives working-chart cue times from a variable tempo map without moving musical positions", () => {
    const cues = chordChartToCues(baseChart(), {
      ...grid,
      tempoMap: {
        version: 1,
        anchors: [
          { bar: 1, timeSeconds: 0 },
          { bar: 2, timeSeconds: 6 },
          { bar: 3, timeSeconds: 11 }
        ]
      }
    }, { tonic: "C", mode: "major" });

    assert.deepEqual(
      cues.map(({ bar, beat, start, end }) => ({ bar, beat, start, end })),
      [
        { bar: 1, beat: 1, start: 0, end: 6 },
        { bar: 2, beat: 1, start: 6, end: 11 }
      ]
    );
  });
});
