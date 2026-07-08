import assert from "node:assert/strict";
import test from "node:test";

import {
  addSectionToList,
  normalizeSections,
  updateSectionInList
} from "../public/section-ranges.js";

test("section ranges normalize text and reject overlaps while allowing adjacency", () => {
  const sections = normalizeSections([
    { id: "a", startBar: 1, endBar: 4, symbol: " A ", label: " Verse " },
    { id: "overlap", startBar: 3, endBar: 6, symbol: "B", label: "Overlap" },
    { id: "c", startBar: 5, endBar: 8, symbol: "C", label: "Chorus" },
    { id: "blank", startBar: 9, endBar: 10, symbol: "", label: "" }
  ]);

  assert.deepEqual(sections, [
    { id: "a", startBar: 1, endBar: 4, symbol: "A", label: "Verse", source: "user" },
    { id: "c", startBar: 5, endBar: 8, symbol: "C", label: "Chorus", source: "user" }
  ]);
});

test("section range helpers update symbols and reject edited overlaps", () => {
  const sections = [
    { id: "a", startBar: 1, endBar: 4, symbol: "A", label: "Verse", source: "user" },
    { id: "b", startBar: 5, endBar: 8, symbol: "B", label: "Chorus", source: "user" }
  ];

  const updated = updateSectionInList(sections, "a", { symbol: "V", label: "Verse 1" });
  assert.equal(updated.ok, true);
  assert.equal(updated.sections[0].symbol, "V");
  assert.equal(updated.sections[0].label, "Verse 1");

  const rejectedUpdate = updateSectionInList(sections, "a", { startBar: 4, endBar: 6 });
  assert.equal(rejectedUpdate.ok, false);
  assert.equal(rejectedUpdate.error, "overlap");
  assert.deepEqual(rejectedUpdate.sections, sections);

  const rejectedAdd = addSectionToList(sections, { id: "c", startBar: 8, endBar: 10, symbol: "C", label: "Outro" });
  assert.equal(rejectedAdd.ok, false);
  assert.equal(rejectedAdd.error, "overlap");
});
