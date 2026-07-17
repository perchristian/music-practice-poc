import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteBeatToSeconds,
  enumerateBeatTimes,
  localTempoAtSeconds,
  normalizeTempoMap,
  secondsToAbsoluteBeat,
  segmentAroundSeconds,
  tempoMapWithAnchor,
  tempoMapWithoutAnchor
} from "../public/tempo-map.js";

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
});
