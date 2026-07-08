export const maxSectionCount = 64;
export const maxSectionBar = 10000;

export function createSectionId() {
  return globalThis.crypto?.randomUUID?.() || `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.max(min, Math.min(max, number)));
}

function sourceSections(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.sections)) return value.sections;
  return [];
}

function normalizedSection(section, idFactory, maxBar) {
  const startBar = clampedInteger(section?.startBar, 1, 1, maxBar);
  const endBar = clampedInteger(section?.endBar, startBar, startBar, maxBar);
  const label = String(section?.label || "").trim().slice(0, 40);
  const symbol = String(section?.symbol || "").trim().slice(0, 12);

  const next = {
    id: String(section?.id || idFactory()).trim().slice(0, 64) || idFactory(),
    label,
    symbol,
    startBar,
    endBar,
    source: section?.source === "suggested" ? "suggested" : "user"
  };

  const colorKey = String(section?.colorKey || "").trim().slice(0, 24);
  if (colorKey) next.colorKey = colorKey;

  return next;
}

export function sectionDisplayText(section) {
  return [section?.symbol, section?.label].filter(Boolean).join(" ");
}

export function sectionRangesOverlap(left, right) {
  return left.startBar <= right.endBar && right.startBar <= left.endBar;
}

export function hasSectionOverlap(sections, candidate, excludeId = null) {
  return sections.some((section) => section.id !== excludeId && sectionRangesOverlap(section, candidate));
}

export function normalizeSections(value = null, options = {}) {
  const idFactory = options.idFactory || createSectionId;
  const maxBar = options.maxBar || maxSectionBar;
  const maxCount = options.maxCount || maxSectionCount;
  const accepted = [];

  const normalized = sourceSections(value)
    .map((section) => normalizedSection(section, idFactory, maxBar))
    .filter(Boolean)
    .sort((left, right) => left.startBar - right.startBar || left.endBar - right.endBar || left.id.localeCompare(right.id));

  for (const section of normalized) {
    if (accepted.length >= maxCount) break;
    if (hasSectionOverlap(accepted, section)) continue;
    accepted.push(section);
  }

  return accepted;
}

export function addSectionToList(sections, candidate, options = {}) {
  const idFactory = options.idFactory || createSectionId;
  const normalizedCandidate = normalizeSections([{ ...candidate, id: candidate?.id || idFactory() }], { ...options, idFactory })[0];
  if (!normalizedCandidate) {
    return { ok: false, error: "empty", sections: normalizeSections(sections, options) };
  }

  const currentSections = normalizeSections(sections, options);
  if (hasSectionOverlap(currentSections, normalizedCandidate)) {
    return { ok: false, error: "overlap", sections: currentSections };
  }

  return {
    ok: true,
    sections: normalizeSections([...currentSections, normalizedCandidate], options),
    section: normalizedCandidate
  };
}

export function updateSectionInList(sections, sectionId, patch, options = {}) {
  const currentSections = normalizeSections(sections, options);
  const existing = currentSections.find((section) => section.id === sectionId);
  if (!existing) {
    return { ok: false, error: "missing", sections: currentSections };
  }

  const candidate = normalizeSections([{ ...existing, ...patch, id: existing.id }], options)[0];
  if (!candidate) {
    return { ok: false, error: "empty", sections: currentSections };
  }

  if (hasSectionOverlap(currentSections, candidate, existing.id)) {
    return { ok: false, error: "overlap", sections: currentSections };
  }

  return {
    ok: true,
    sections: normalizeSections(currentSections.map((section) => (section.id === existing.id ? candidate : section)), options),
    section: candidate
  };
}
