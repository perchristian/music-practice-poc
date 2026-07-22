import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteBeatToSeconds,
  enumerateGridBeats,
  enumerateBeatTimes,
  localTempoAtSeconds,
  normalizeTimingMap,
  normalizeTempoMap,
  secondsToAbsoluteBeat,
  secondsToMusicalPosition,
  segmentAroundSeconds,
  timeSignatureAtBar,
  timingMapFromTempoMap,
  timingMapWithEvent,
  timingMapWithoutEventAspect,
  tempoMapWithAnchor,
  tempoMapWithoutAnchor
} from "../public/tempo-map.js";
import { chordSegmentsForTimingGrid } from "../server.js";

const baseGrid = {
  bpm: 60,
  beatDurationSeconds: 1,
  beatsPerBar: 4,
  beatUnit: 4,
  downbeatOffsetSeconds: 0
};

describe("tempo map", () => {
  it("normalizes strictly ordered downbeat anchors", () => {
    assert.deepEqual(normalizeTempoMap({
      version: 1,
      anchors: [
        { bar: 1, timeSeconds: 0.6549 },
        { bar: 5, timeSeconds: 17.1254 }
      ]
    }), {
      version: 1,
      anchors: [
        { bar: 1, timeSeconds: 0.655 },
        { bar: 5, timeSeconds: 17.125 }
      ]
    });

    assert.equal(normalizeTempoMap({ version: 1, anchors: [{ bar: 2, timeSeconds: 1 }] }), null);
    assert.equal(normalizeTempoMap({
      version: 1,
      anchors: [{ bar: 1, timeSeconds: 1 }, { bar: 3, timeSeconds: 0.5 }]
    }), null);
  });

  it("maps beats piecewise between sparse downbeats and inverts the mapping", () => {
    const grid = {
      ...baseGrid,
      tempoMap: {
        version: 1,
        anchors: [
          { bar: 1, timeSeconds: 0 },
          { bar: 3, timeSeconds: 10 },
          { bar: 5, timeSeconds: 18 }
        ]
      }
    };

    assert.equal(absoluteBeatToSeconds(grid, 4), 5);
    assert.equal(absoluteBeatToSeconds(grid, 12), 14);
    assert.equal(secondsToAbsoluteBeat(grid, 14), 12);
    assert.equal(localTempoAtSeconds(grid, 4), 48);
    assert.equal(localTempoAtSeconds(grid, 14), 60);
    assert.deepEqual(segmentAroundSeconds(grid, 14), {
      left: { bar: 3, timeSeconds: 10 },
      right: { bar: 5, timeSeconds: 18 },
      bpm: 60
    });
  });

  it("extrapolates with the nearest segment and enumerates click times", () => {
    const grid = {
      ...baseGrid,
      tempoMap: {
        version: 1,
        anchors: [
          { bar: 1, timeSeconds: 1 },
          { bar: 2, timeSeconds: 5 }
        ]
      }
    };
    assert.equal(absoluteBeatToSeconds(grid, -1), 0);
    assert.equal(absoluteBeatToSeconds(grid, 8), 9);
    assert.deepEqual(
      enumerateBeatTimes(grid, 1, 3, { paddingBeats: 0 }),
      [
        { beatIndex: 0, timeSeconds: 1 },
        { beatIndex: 1, timeSeconds: 2 },
        { beatIndex: 2, timeSeconds: 3 }
      ]
    );
  });

  it("adds, replaces, and removes anchors while preserving monotonic order", () => {
    const initial = { version: 1, anchors: [{ bar: 1, timeSeconds: 0 }] };
    const withBarThree = tempoMapWithAnchor(initial, { bar: 3, timeSeconds: 9 });
    assert.equal(withBarThree.anchors[1].bar, 3);
    const replaced = tempoMapWithAnchor(withBarThree, { bar: 3, timeSeconds: 8.5 });
    assert.equal(replaced.anchors[1].timeSeconds, 8.5);
    assert.equal(tempoMapWithAnchor(replaced, { bar: 2, timeSeconds: 9 }), null);
    assert.deepEqual(tempoMapWithoutAnchor(replaced, 3), initial);
    assert.deepEqual(tempoMapWithoutAnchor(replaced, 1), replaced);
  });

  it("creates chord-analysis windows from corrected variable-tempo beat boundaries", () => {
    const segments = chordSegmentsForTimingGrid({
      ...baseGrid,
      tempoMap: {
        version: 1,
        anchors: [
          { bar: 1, timeSeconds: 0 },
          { bar: 2, timeSeconds: 4 },
          { bar: 3, timeSeconds: 10 }
        ]
      }
    }, 10);

    assert.deepEqual(segments.slice(0, 5), [
      { bar: 1, beat: 1, start: 0, end: 1 },
      { bar: 1, beat: 2, start: 1, end: 2 },
      { bar: 1, beat: 3, start: 2, end: 3 },
      { bar: 1, beat: 4, start: 3, end: 4 },
      { bar: 2, beat: 1, start: 4, end: 5.5 }
    ]);
  });

  it("migrates version-one anchors into ordered version-two timing events", () => {
    assert.deepEqual(timingMapFromTempoMap({
      version: 1,
      anchors: [
        { bar: 1, timeSeconds: 0.5 },
        { bar: 4, timeSeconds: 12.5 }
      ]
    }, { timeSignature: { beatsPerBar: 3, beatUnit: 4 } }), {
      version: 2,
      events: [
        { bar: 1, timeSeconds: 0.5, timeSignature: { beatsPerBar: 3, beatUnit: 4 } },
        { bar: 4, timeSeconds: 12.5 }
      ]
    });
  });

  it("maps and inverts written beats across a mid-song meter change", () => {
    const grid = {
      ...baseGrid,
      timingMap: {
        version: 2,
        events: [
          { bar: 1, timeSeconds: 0, timeSignature: { beatsPerBar: 4, beatUnit: 4 } },
          { bar: 3, timeSeconds: 8, timeSignature: { beatsPerBar: 3, beatUnit: 4 } },
          { bar: 5, timeSeconds: 14 }
        ]
      }
    };

    assert.equal(absoluteBeatToSeconds(grid, 8), 8);
    assert.equal(absoluteBeatToSeconds(grid, 11), 11);
    assert.equal(absoluteBeatToSeconds(grid, 14), 14);
    assert.deepEqual(timeSignatureAtBar(grid, 4), { beatsPerBar: 3, beatUnit: 4 });
    assert.deepEqual(secondsToMusicalPosition(grid, 12), {
      absoluteBeat: 12,
      bar: 4,
      beat: 2,
      beatWithinBar: 1,
      timeSignature: { beatsPerBar: 3, beatUnit: 4 },
      subdivisionsPerPulse: 1,
      primaryPulse: true,
      downbeat: false
    });
    const chordSegments = chordSegmentsForTimingGrid(grid, 14);
    assert.deepEqual(chordSegments.slice(8, 12).map(({ bar, beat, start }) => ({ bar, beat, start })), [
      { bar: 3, beat: 1, start: 8 },
      { bar: 3, beat: 2, start: 9 },
      { bar: 3, beat: 3, start: 10 },
      { bar: 4, beat: 1, start: 11 }
    ]);
  });

  it("uses dotted-quarter primary pulses for compound meter clicks", () => {
    const grid = {
      ...baseGrid,
      timingMap: {
        version: 2,
        events: [
          { bar: 1, timeSeconds: 0, timeSignature: { beatsPerBar: 6, beatUnit: 8 } },
          { bar: 2, timeSeconds: 2 }
        ]
      }
    };
    const beats = enumerateGridBeats(grid, 0, 2, { paddingBeats: 0 });
    assert.equal(localTempoAtSeconds(grid, 1), 60);
    assert.deepEqual(
      beats.filter((beat) => beat.primaryPulse).map((beat) => [beat.bar, beat.beat, beat.timeSeconds, beat.downbeat]),
      [[1, 1, 0, true], [1, 4, 1, false], [2, 1, 2, true]]
    );
  });

  it("removes timing and meter aspects independently", () => {
    const initial = normalizeTimingMap({
      version: 2,
      events: [
        { bar: 1, timeSeconds: 0, timeSignature: { beatsPerBar: 4, beatUnit: 4 } },
        { bar: 5, timeSeconds: 16, timeSignature: { beatsPerBar: 3, beatUnit: 4 } }
      ]
    });
    const withoutTime = timingMapWithoutEventAspect(initial, 5, "timeSeconds");
    assert.deepEqual(withoutTime.events[1], { bar: 5, timeSignature: { beatsPerBar: 3, beatUnit: 4 } });
    const restoredTime = timingMapWithEvent(withoutTime, { bar: 5, timeSeconds: 16 });
    const withoutMeter = timingMapWithoutEventAspect(restoredTime, 5, "timeSignature");
    assert.deepEqual(withoutMeter.events[1], { bar: 5, timeSeconds: 16 });
  });
});
