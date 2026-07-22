import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { timingFixtures } from "../benchmarks/timing-fixtures.js";
import { evaluateTimingFixture, fitStableTimingSpans } from "../timing-analysis.js";

describe("threshold-aware timing analysis", () => {
  for (const fixture of timingFixtures) {
    it(`keeps ${fixture.name} sparse and aligned`, () => {
      const result = fitStableTimingSpans(fixture);
      const metrics = evaluateTimingFixture(fixture, result);
      const detectedBoundaries = result.candidates.map((candidate) => candidate.bar);
      for (const expectedBar of fixture.expectedCandidateBars) {
        assert.ok(detectedBoundaries.some((bar) => Math.abs(bar - expectedBar) <= 1), JSON.stringify({ result, metrics }));
      }
      if (!fixture.expectedCandidateBars.length) assert.equal(result.candidates.length, 0);
      assert.ok(metrics.barLineMeanAbsoluteErrorSeconds <= 0.12, JSON.stringify(metrics));
      assert.ok(metrics.barLineMaxErrorSeconds <= 0.3, JSON.stringify(metrics));
      assert.ok(metrics.beatRecall >= 0.9, JSON.stringify(metrics));
      assert.ok(metrics.downbeatRecall >= 0.9, JSON.stringify(metrics));
      assert.equal(metrics.barOneErrorSeconds, 0);
      if (fixture.name.includes("meter change")) assert.equal(metrics.meterAccuracy, 1);
    });
  }
});
