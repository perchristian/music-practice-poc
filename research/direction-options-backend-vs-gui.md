# Direction options: analyzer accuracy versus interface

Status: Research input for a product-owner prioritization decision. Nothing here
is committed. Cost and benefit figures are deliberately rough and are meant to be
argued with, not accepted.

Author context: written 2026-07-25, after the product owner reported that the
concept was tested with manually corrected chord charts and delivered value, and
that Mosies demonstrates market demand for the same category.

---

## The question this note answers

Given that the concept is validated but the delivery is not, should the next
effort go into analyzer accuracy or into the interface?

The note evaluates six options against each other: the currently committed
analyzer plan, three alternative analyzer directions, and the interface work
already present in `TASKS.md` and `IDEAS.md`.

---

## What changed in the premise

Two product-owner statements move the ground under the current roadmap.

**1. The value hypothesis is answered.** `TASKS.md` still treats chord
reliability as the gate for user testing — issue #1 is literally named
*"Validate chord reliability for user testing"*. But the product owner has now
tested the workflow with corrected charts and found value. That means analyzer
accuracy was never the thing blocking the product question; it is a delivery
cost, not a validity question.

**2. Presentation is the stated bottleneck.** *"Om ikke GUI klarer å presentere
innholdet på en god måte, så gir ikke 100 % nøyaktig analyse verdi."* This is a
claim about the chord chart's information design. It is not represented anywhere
in the current roadmap. Phase 5D covers shell and transport friction; Phase 5B
covers editing gestures; the design-system pass in `IDEAS.md` covers primitives.
None of them is "is the chart readable while playing".

Both points should be recorded in `DECISIONS.md` regardless of what is
prioritized next, because they invalidate the stated reason for the current
task order.

---

## A target that cannot be expressed as one number

The product owner's target — roughly 95 %, where correction is rare and
disagreements are preference-level (D9 instead of D7, reharmonization) — cannot
be expressed as a single accuracy figure, for two independent reasons.

**It is above the human agreement ceiling.** Automatic chord recognition has a
well-documented plateau in the low-to-mid 80s for major/minor vocabulary,
attributed to annotator subjectivity: expert annotators disagree with each other
in the same range. A 95 % match against one reference annotation is not a hard
target; it is an undefined one. No model reaches it, including dedicated ones.

**Errors are not equivalent.** The product owner's own distinction is the correct
basis for measurement:

| Class | Example | User experience |
|---|---|---|
| Equivalent | D vs D7, inversions, add9 | No correction |
| Preference | Am7 vs C6, D# vs Eb | Might change, not wrong |
| Wrong quality | D vs Dm | Sounds wrong, one click to fix |
| Wrong root | D vs D#, D vs G | Destroys trust |
| Structural | Right chords, wrong boundaries | The original 279-vs-95 complaint |

The existing evaluation already produces this decomposition for free. The spread
between `root`, `majmin`, `triads`, and `mirex` WCSR on one run *is* the error
class distribution: high Root with low MajMin means quality errors; low Root
means catastrophic errors; cue density against the reference rate means
structural errors.

**Recommendation:** replace the single-threshold formulation in
`thresholds.rwcPrimaryGate` with a severity-class target — for example
"catastrophic errors under X % of duration, cue density within Y× reference,
MajMin reported but not gating". This also resolves the open product-owner input
currently deferred in `TASKS.md`, and it does so in terms the product owner has
already shown they think in.

> Literature figures in this section are from memory and should be verified
> against sources before any of them are written into the contract.

---

## Cost units used below

- **1 session** ≈ one focused agent implementation iteration with tests and
  documentation, roughly half a day of elapsed product-owner attention.
- **Human gate** = a review the product owner must personally perform. These are
  the genuinely scarce resource in this project, so they are counted separately.

---

# Backend options

## A0. Continue the committed CR1–CR6 plan (the status quo)

This is the opportunity cost of everything else, so it belongs in the comparison
even though it was not one of the requested alternatives.

**What it is:** diagnostics (CR1), melody suppression (CR2), bass fallback and
ornament resistance (CR3), repeat pooling with known groups (CR4), automatic
repeat detection (CR5), integrated checkpoint (CR6). Incremental improvement of
the existing hand-written analyzer.

**What the existing analyzer actually is:** DFT energy per pitch class
([server.js:796](server.js#L796)), bar-synchronous chroma weighted across Demucs
stems, template matching with heuristic bonuses
([server.js:892](server.js#L892)), argmax per beat, heuristic smoothing of
isolated beats. This is the method family from roughly 2008–2011. It has no
tuning estimation (fixed A440), no overtone suppression, and no sequence model.

| | |
|---|---|
| Cost | 10–12 sessions, 4–6 human gates |
| Expected outcome | MajMin from ~49 % toward 60–70 % |
| Family ceiling | ~75–80 % even if executed perfectly |
| Confidence | Medium-high that it improves; high that it does not reach the target |

**The structural problem with this option:** the absence of a sequence model is
the direct cause of the over-segmentation complaint. Argmax per beat plus
heuristic smoothing cannot produce stable chord durations; only a transition
model can. CR2 and CR3 tune evidence quality, which is the wrong layer for that
symptom.

**The strategic problem:** CR6 already contains an escape rule — compare an
external analyzer after two failed local improvements. The plan therefore already
anticipates arriving at option A1. Running A1 *first* as a measurement converts
10 sessions of speculative work into an informed decision. This is the single
highest-leverage observation in this note.

## A1. Replace the analyzer with a trained model

**What it is:** substitute a trained chord recognizer behind the existing
analyzer interface. Candidates: `madmom` (deep chroma + CRF chord recognition),
open BTC/CRNN transformer checkpoints.

**Why it is architecturally cheap here:** the Python subprocess boundary already
exists for Demucs, torch is already a real-mode dependency, and — most
importantly — the evaluation harness is already built
(`scripts/chord-benchmark-lib.js`, `scripts/benchmark-chords.js`, the locked
RWC split, checksum-verified manifests). Measuring an alternative analyzer is
cheap *because CR0 was completed*. That investment pays off here more than it
pays off in A0.

| | |
|---|---|
| Spike cost | 1–2 sessions, 0 human gates — measurement only |
| Productionize cost | 2–3 further sessions (timing integration, provenance, mock fallback) |
| Expected outcome | MajMin ~75–85 % on RWC |
| Confidence | High that it beats the current analyzer substantially |

**It also fixes the stated complaint directly.** A trained transition model
produces stable chord durations. Over-segmentation is not a separate problem to
solve afterwards.

**Blocking risk — commercial licensing.** `madmom` is, as I recall, licensed for
academic and non-commercial use with commercial use requiring a separate
agreement, and research checkpoints such as BTC frequently carry similar terms.
**This must be verified before any commitment**, because a paid tier is part of
the product concept. If the licensing does not permit commercial use, A1 becomes
either "use it to establish the ceiling and inform a reimplementation" or
"train/fine-tune on permissively licensed data" — a materially larger project.

**Recommended framing:** run the spike as a *measurement*, explicitly not a
commitment. Two sessions to learn where the ceiling actually is is the cheapest
information available anywhere in this note.

## A2. Transcription first, chords derived from notes

**What it is:** audio → note events → chords, instead of audio → chords.
Candidates: Basic Pitch (Spotify, Apache-2.0, lightweight ONNX — commercially
usable, which is a real advantage over A1), or a dedicated piano transcription
model.

**Why this project is unusually well placed for it:** the pipeline already
produces a separated piano stem via `htdemucs_6s`. Piano transcription is by a
wide margin the most mature transcription task that exists. Most competitors
attempting this would have to transcribe a full mix.

**Why it matters beyond accuracy:** it makes D-vs-D7 a principled question
("is the C present?") rather than a template-matching accident, and it unlocks
several parked `IDEAS.md` items at once — audible chord preview, reharmonization,
notation, and explaining *why* a chord was chosen. It is the only option on this
list with significant option value beyond the immediate metric.

| | |
|---|---|
| Spike cost | 2 sessions (transcription quality on the Demucs piano stem) |
| Full cost | 4–6 further sessions (note→chord derivation is genuinely hard: voicings, passing tones, arpeggios) |
| Expected outcome | Wide variance. Excellent on clean piano, unknown on separated stems |
| Confidence | Low on the outcome, high on the strategic value if it works |

**Main risk:** Demucs piano stems have bleed and artifacts. Transcription quality
on a separated stem is not the same as on a clean recording, and there is no
reason to assume it transfers. This must be measured before any commitment, and
the spike should be allowed to fail.

## A3. Structure-aware evidence pooling

**What it is:** songs repeat. If verse 1 and verse 2 are the same eight bars,
pool the raw evidence across both instances before deciding. Beat-synchronous
self-similarity, then robust pooling.

This is already planned as CR4 and CR5, so it is partly an existing commitment
rather than a new alternative.

| | |
|---|---|
| Cost | 2–3 sessions for known groups; 3 more for automatic detection |
| Expected metric gain | Modest — a few points |
| Expected user-facing gain | Disproportionately large |
| Confidence | Medium-high |

**Why the user-facing gain exceeds the metric gain:** the same section labeled
differently in verse 1 and verse 2 is the most visible possible failure. Users
notice inconsistency far more than they notice absolute error, because
inconsistency is self-evidently wrong without needing a reference. Raw accuracy
is invisible; contradiction is not.

**Sequencing:** this multiplies with whichever front end wins. It should come
after A1 or A2, not before — pooling better evidence is worth more than pooling
weak evidence.

---

# Interface options

## G1. Phase 3G.2A — timeline input-contract hardening

The single item on this entire list with a **known, confirmed defect**: trackpad
pinch fails on real Mac hardware. The pointer-based fix passed synthetic
automation and failed human review. `Follow` also repositions the viewport while
paused.

The normative contract is already written in
`TIMELINE_INTERACTION_CONTRACT.md`, with a ten-step implementation sequence in
`TASKS.md`. The specification cost is already sunk.

| | |
|---|---|
| Cost | 3–4 sessions, 1–2 human gates (real trackpad, required) |
| Benefit | Removes a confirmed user-test blocker |
| Confidence | Highest of any item here — the defect is known, the contract is written |
| Risk | Touches `public/app.js` (4688 lines), the largest integration surface |

## G2. Phase 5D.2 — transport, keyboard, loop, mobile Harmony

Sticky transport while scrolling, Space/Enter shortcuts, touch-friendly targets,
loop handles that stop covering chord names.

| | |
|---|---|
| Cost | 2 sessions, 1 human gate |
| Benefit | Direct friction reduction during actual practice |
| Confidence | High — these are concrete, already-specified, low-ambiguity fixes |

Best cost-to-benefit ratio of anything on the interface side. Loop handles
covering chord names is exactly the class of problem the product owner described.

## G3. Chord chart presentation redesign — *not currently on the roadmap*

**This is the item the product owner actually named, and it does not exist as a
task.**

Scope: how the Harmony grid presents harmonic content while the user is playing.
Bars per row, chord card density and hierarchy, how sections read, when roman
numerals help versus clutter, what stays legible at a glance from a music stand
distance, what happens on a phone. Not primitives — information architecture.

| | |
|---|---|
| Design cost | Low for this product owner — Figma proficiency, prior design systems, components already built |
| Implementation cost | 3–5 sessions depending on how far the redesign departs from the current DOM |
| Benefit | Addresses the stated bottleneck directly |
| Confidence | High on value, unknown on scope until a design exists |

**This is the option where the product owner's own capability is the input, not
the constraint.** Nothing else on this list has that property. It is also the
work an AI agent is least able to originate and most able to implement quickly
from a concrete design.

**Recommended first step:** design it in Figma before scoping the
implementation. That step costs the agent nothing and makes every subsequent
estimate real. It also converts the vaguest item on this list into the
best-specified one.

## G4. Design-system pass (currently parked in `IDEAS.md`)

Tokens, buttons, segmented controls, fields, toggles, panels, list rows, mixer
rows. Currently 2058 lines of hand-written CSS with no token layer.

The parking rationale in `IDEAS.md` — "a broader abstraction pass has no
independent learning outcome yet" — was written under the assumption that design
work is expensive. For this product owner it is not.

| | |
|---|---|
| Design cost | Near zero — existing components and design-system experience |
| Implementation cost | 2–3 sessions for tokens plus primitive extraction |
| Benefit | Every later interface change gets cheaper; raises perceived quality |
| Confidence | High |

**Do this together with G3, not separately.** A redesign of the chart naturally
produces the token and primitive decisions; doing them as two passes over the
same CSS is wasted work. Combined, G3+G4 is realistically 4–6 sessions rather
than 5–8 separately.

The Mosies comparison is relevant here: in a category where a credible competitor
already has good ratings, coherent visual execution is not polish, it is table
stakes.

## G5. Phase 5B.4–5B.6 — section resize, multi-selection, copy/paste

| | |
|---|---|
| Cost | 4–5 sessions |
| Benefit | Conditional on user evidence |
| Confidence | Low |

`TASKS.md` already says these should wait for evidence that they improve the
learning workflow. That judgment still holds. **Defer.**

---

# Summary comparison

| Option | Cost | Human gates | Benefit | Confidence |
|---|---|---|---|---|
| **A1 spike** (measure trained model) | 1–2 | 0 | Resolves the ceiling question | High |
| **G2** transport/loop/mobile | 2 | 1 | Removes daily friction | High |
| **G1** timeline input contract | 3–4 | 1–2 | Fixes known hardware defect | Highest |
| **G3+G4** chart redesign + design system | 4–6 | Figma-led | Addresses stated bottleneck | High value, scope TBD |
| **A1 productionize** | 2–3 | 1 | 49 % → ~80 % | High, licensing risk |
| **A3** structure pooling | 2–3 | 1 | Removes visible inconsistency | Medium-high |
| **A2** transcription-first | 6–8 | 2 | Large option value | Low on outcome |
| **A0** continue CR1–CR6 | 10–12 | 4–6 | 49 % → ~65 % | Poor ratio |
| **G5** editing gestures | 4–5 | 1 | Unproven | Low |

---

# Recommendation

**Prioritize the interface, with one cheap backend measurement first.**

This is not a compromise between the two. The two sides have genuinely different
cost profiles, and one specific backend action costs almost nothing while
determining whether ten sessions of committed work are worth starting.

Suggested order:

1. **A1 spike — 1–2 sessions, no human gate.** Measure a trained model through
   the existing benchmark harness. This is information, not commitment. If it
   reaches ~80 %, CR2–CR5 are largely obsolete and roughly eight sessions are
   saved. If it does not, A0 is vindicated and can proceed with confidence.
   Verify commercial licensing as part of the same spike.

2. **G1 — 3–4 sessions.** The known trackpad defect blocks user testing.
   Everything downstream of user testing depends on this being fixed.

3. **G3 designed in Figma — product-owner work, agent cost zero.** Converts the
   stated bottleneck into a concrete specification.

4. **G3 + G4 implemented — 4–6 sessions.**

5. **G2 — 2 sessions.**

6. **Reopen the backend decision** using the A1 result and whatever user testing
   revealed. A3 becomes attractive at this point.

**Why the interface wins the main allocation:** the value hypothesis is already
answered, so remaining risk is delivery risk. Interface returns are near-certain
and near-term; analyzer returns are capped by a ceiling no one has passed. The
product owner also has an unfair advantage on the interface side and none on the
analyzer side — spending scarce personal attention where that advantage applies
is straightforwardly the better allocation.

**The strongest argument against this recommendation** is that a beautiful
interface presenting wrong chords is still a bad product, and the free tier will
be judged on its analysis. That argument is real. It is also why step 1 exists,
and why the free tier's design goal should be *fewer and more confident* chords
rather than more accurate ones — forty chords that are 80 % right reads as
useful; 279 chords that are 50 % right reads as broken, even though the second
scores better on some metrics.

---

# Open questions for the product owner

1. Do you accept replacing the single-accuracy threshold with severity classes?
   This resolves the deferred `thresholds.rwcPrimaryGate` input.
2. Is commercial use in scope soon enough that A1's licensing must be settled
   before the spike rather than after?
3. Does the free/paid split you described mean *different models*, or *the same
   model with a confidence threshold that suppresses uncertain chords*? These
   have very different implementation costs and the second is much cheaper.
4. Should issue #1 be reframed or closed, given that the workflow was validated
   with corrected charts?
