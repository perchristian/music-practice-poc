import { timingFixtures } from "../benchmarks/timing-fixtures.js";
import { evaluateTimingFixture, fitStableTimingSpans } from "../timing-analysis.js";

const rows = timingFixtures.map((fixture) => {
  const result = fitStableTimingSpans(fixture);
  return evaluateTimingFixture(fixture, result);
});

console.table(rows.map((row) => ({
  fixture: row.name,
  meanBarErrorMs: Math.round(row.barLineMeanAbsoluteErrorSeconds * 1000),
  maxBarErrorMs: Math.round(row.barLineMaxErrorSeconds * 1000),
  finalDriftMs: Math.round(row.cumulativePhaseDriftSeconds * 1000),
  beatF1: Number((2 * row.beatPrecision * row.beatRecall / Math.max(0.0001, row.beatPrecision + row.beatRecall)).toFixed(3)),
  downbeatF1: Number((2 * row.downbeatPrecision * row.downbeatRecall / Math.max(0.0001, row.downbeatPrecision + row.downbeatRecall)).toFixed(3)),
  boundaryErrorBars: row.changeBoundaryMeanErrorBars,
  meterAccuracy: row.meterAccuracy,
  candidates: row.candidateBars.map((candidate) => `${candidate.type}@${candidate.bar}`).join(", ") || "none"
})));
