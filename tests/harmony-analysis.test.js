import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { smoothIsolatedChordDrafts } from "../server.js";

const major = { suffix: "", romanSuffix: "", intervals: [0, 4, 7], label: "major" };
const minor = { suffix: "m", romanSuffix: "", intervals: [0, 3, 7], label: "minor" };

function draft(root, quality, beat, confidence = 0.8) {
  return {
    bar: 1,
    beat,
    start: beat - 1,
    end: beat,
    root,
    quality,
    confidence
  };
}

describe("chord sequence smoothing", () => {
  it("replaces one isolated beat when both neighboring labels agree", () => {
    const input = [
      draft(0, major, 1, 0.72),
      draft(7, major, 2, 0.9),
      draft(0, major, 3, 0.68)
    ];

    const result = smoothIsolatedChordDrafts(input);

    assert.equal(result[1].root, 0);
    assert.equal(result[1].quality.label, "major");
    assert.equal(result[1].confidence, 0.68);
    assert.equal(input[1].root, 7);
  });

  it("preserves sustained changes and does not cascade replacements", () => {
    const input = [
      draft(0, major, 1),
      draft(7, major, 2),
      draft(7, major, 3),
      draft(0, major, 4)
    ];

    assert.deepEqual(
      smoothIsolatedChordDrafts(input).map((chord) => chord.root),
      [0, 7, 7, 0]
    );
  });

  it("requires matching root and quality on both sides", () => {
    const input = [
      draft(9, minor, 1),
      draft(7, major, 2),
      draft(9, major, 3)
    ];

    const result = smoothIsolatedChordDrafts(input);

    assert.equal(result[1].root, 7);
    assert.equal(result[1].quality.label, "major");
  });
});
