# Direction options: analyzer accuracy versus interface

Status: Research input for a product-owner prioritization decision. Nothing here
is committed. Cost and benefit figures are deliberately rough and are meant to be
argued with, not accepted.

Written 2026-07-25. **Substantially revised the same day** after the product
owner corrected two premises this note originally got wrong: the distribution
model, and what the built-in analyzer is for. The revision changes the
recommendation, not just the details. See "What this note originally got wrong".

---

## The question this note answers

Given that the concept is validated but the delivery is not, should the next
effort go into analyzer accuracy or into the interface?

---

## The premise, as corrected by the product owner

**Distribution:** the app will be open source and is not intended to be
commercially available.

**Analyzer strategy:** a simple local engine ships with the app and is good
enough for many users. Those users **correct the remaining errors themselves** —
that is a normal way to use the product, not a degraded one. Anyone who wants
higher accuracy **plugs in a more advanced model themselves**.

Three consequences follow, and they reorder almost everything below.

### 1. The heavy model never has to ship

The user brings it. No bundled weights, no model hosting, no inference cost, no
packaging burden. This removes the single largest cost driver from every
model-based option in this note.

### 2. Non-commercial licences stop being blocking

An earlier version of this note treated madmom-style non-commercial licensing as
a blocking risk. For a non-commercial open-source app it is not. The constraint
that replaces it is weaker and purely structural: **no restrictively licensed
component may become a hard dependency of the default install.** As an optional
plug-in that a user chooses to connect, licence terms are that user's business.

### 3. The built-in engine's job is not accuracy

This is the important one. Earlier sections of this note judged the existing
analyzer against "reach 95 %", which it obviously loses. That was the wrong
standard. Its actual job is:

- always available, no heavy dependencies
- honest about what it does not know
- a good enough starting point to correct

A chart with 40 chords where the user fixes 8 is usable. A chart with 279 chords
where the user fixes 180 is not — **even though the second may score better on
accuracy metrics.** The dependency-light constraint the project already holds is
exactly right for this role, and the current analyzer is a reasonable engine for
it. It is failing at over-segmentation, not at accuracy.

---

## What this note originally got wrong

Recorded rather than deleted, because the reasoning is what changed.

| Original claim | Corrected |
|---|---|
| Commercial licensing is a blocking risk for A1 | Not commercial; only the default install is constrained |
| Free tier vs paid tier of *your* product | No tiers. One default engine plus an optional user-supplied one |
| The question is which model to adopt | The question is what the **adapter boundary** looks like; the model is the user's choice |
| The built-in analyzer should be improved toward the ceiling | It should be made *conservative*, which is a different and much cheaper goal |
| madmom as lead candidate | Last release 2018; chosen for integration convenience, not capability |

---

## The metric that actually matters here

The product owner's target — roughly 95 %, where correction is rare and
disagreements are preference-level (D9 instead of D7, reharmonization) — cannot
be expressed as a single accuracy figure.

**It is above the human agreement ceiling.** Automatic chord recognition has a
documented plateau in the low-to-mid 80s for major/minor vocabulary, attributed
to annotator subjectivity: expert annotators disagree with each other in the same
range. A 95 % match against one reference annotation is not a hard target, it is
an undefined one. No model reaches it, including dedicated ones.

**Errors are not equivalent.** The product owner's own distinction is the right
basis for measurement:

| Class | Example | Correction cost |
|---|---|---|
| Equivalent | D vs D7, inversions, add9 | None |
| Preference | Am7 vs C6, D# vs Eb | None; may be changed by taste |
| Wrong quality | D vs Dm | One edit |
| Wrong root | D vs D#, D vs G | One edit, but destroys trust in the rest |
| Structural | Right chords, wrong boundaries | Many edits — the 279-vs-95 complaint |

**Given the corrected premise, the primary metric should be correction burden:
how long it takes to bring a three-minute song to a usable chart.** Not WCSR.
`TASKS.md` already lists exactly this under CR6 verification ("Three-minute-song
correction-time review"), so the measurement is already sanctioned — it just is
not currently the gating one.

WCSR remains useful as a diagnostic. The spread between `root`, `majmin`,
`triads`, and `mirex` on one run *is* the error class distribution: high Root
with low MajMin means quality errors; low Root means catastrophic errors; cue
density against the reference rate means structural errors.

**Recommendation:** replace the single-threshold formulation in
`thresholds.rwcPrimaryGate` with correction burden as the gate and the severity
classes as diagnostics. This also resolves the product-owner input currently
deferred in `TASKS.md`.

> Literature figures above are from memory and should be verified against sources
> before any of them are written into the contract.

---

## Cost units used below

- **1 session** ≈ one focused agent implementation iteration with tests and
  documentation, roughly half a day of elapsed product-owner attention.
- **Human gate** = a review the product owner must personally perform. These are
  the genuinely scarce resource in this project, so they are counted separately.

---

# Backend options

## A4. Add a transition model to the built-in engine — *new, and now the leading backend item*

**What it is:** replace per-beat argmax plus heuristic smoothing with a proper
Viterbi decode over a chord transition prior that heavily favours self-transition.

**Why it is the right fix:** the existing analyzer estimates each beat
independently ([server.js:928](server.js#L928)) and then patches up isolated
beats with a heuristic ([server.js:1086](server.js#L1086)). No amount of
evidence-quality tuning fixes that; a chord sequence with stable durations
requires a sequence model. **Over-segmentation is not a symptom of weak evidence,
it is a symptom of a missing decoder.** CR2 and CR3 both operate on the evidence
layer, which is the wrong layer for this complaint.

| | |
|---|---|
| Cost | 1–2 sessions, 1 human gate (listening review) |
| Dependencies added | **None.** Pure JS, fits the current architecture |
| Expected effect | Large reduction in cue density; modest MajMin change |
| Confidence | High — this is textbook, and the failure mode is well understood |

This is almost certainly worth more to the built-in engine than CR2 and CR3
combined, at a fraction of the cost, and it directly serves the "conservative and
always available" role identified above. It also preserves the dependency-light
mock-mode contract.

## A5. Extract the analyzer behind an adapter interface — *new, and the enabler for everything else*

**What it is:** define the boundary that a pluggable analyzer implements —
input (audio, beat grid, timing map), output (chord events plus provenance) — and
extract the existing analyzer from `server.js` to sit behind it.

Under the corrected premise this is **the central engineering artifact of the
whole backend strategy.** Which model is best is the user's decision, made after
release. What the project owes them is a boundary to plug into.

`TASKS.md` WP4 already anticipates this ("when harmonic analysis is next changed,
extract beat and harmony analysis from `server.js` without rewriting
algorithms"). A4 *is* that change, so A4 and A5 should very likely be one
iteration rather than two.

| | |
|---|---|
| Cost | 1–2 sessions if done alongside A4; more as a standalone refactor |
| Benefit | Makes the plug-in story real rather than aspirational |
| Confidence | High |
| Risk | Low if it stays an extraction and does not rewrite algorithms |

**Design note:** the immutable-provenance contract already in place
(`metadata.chords` versus `practiceState.chordChart`) is a genuine asset here. It
already distinguishes "what an analyzer said" from "what the user decided", which
is exactly what a pluggable-analyzer system needs. A third-party engine's output
slots into the existing provenance layer without inventing a new model.

## A0. Continue the committed CR1–CR6 plan

**What it is:** diagnostics (CR1), melody suppression (CR2), bass fallback and
ornament resistance (CR3), repeat pooling (CR4), automatic repeat detection
(CR5), integrated checkpoint (CR6).

**What the existing analyzer actually is:** DFT energy per pitch class
([server.js:796](server.js#L796)), bar-synchronous chroma weighted across Demucs
stems, template matching with heuristic bonuses
([server.js:892](server.js#L892)), argmax per beat, heuristic smoothing. The
method family from roughly 2008–2011: no tuning estimation (fixed A440), no
overtone suppression, no sequence model.

| | |
|---|---|
| Cost | 10–12 sessions, 4–6 human gates |
| Expected outcome | MajMin from ~49 % toward 60–70 % |
| Family ceiling | ~75–80 % even if executed perfectly |
| Confidence | Medium-high that it improves; high that it does not reach the target |

**Under the corrected premise this option loses most of its rationale.** It was
justified by the built-in engine needing to be accurate. It does not — it needs
to be conservative, which A4 achieves in one to two sessions. Users who want
accuracy plug in a model.

CR1 (diagnostics) retains independent value regardless, because it is what makes
any later comparison legible. **CR2–CR5 should be deferred**, not because they
are bad ideas, but because they are now solving a problem the architecture solves
better.

## A1. A trained model as the reference plug-in

Reframed. This is no longer "should we replace our analyzer" — it is **"ship one
working example of the adapter so the plug-in path is proven and documented."**

**Why it is architecturally cheap here:** the Python subprocess boundary already
exists for Demucs, and the evaluation harness is already built
(`scripts/chord-benchmark-lib.js`, `scripts/benchmark-chords.js`, the locked RWC
split, checksum-verified manifests). Measuring an alternative analyzer is cheap
*because CR0 was completed*.

### Candidate list

| Candidate | Year | Why it is on the list | Main unknown |
|---|---|---|---|
| **ACR_seq2seq** ([paper](https://arxiv.org/abs/2604.24386), [code](https://github.com/KimLeekyung/ACR_seq2seq)) | ICASSP 2026 | Reformulates ACR as segment-level seq2seq so chord changes are detected **only at segment boundaries**. Over-segmentation is the headline contribution | Whether pretrained weights are released |
| **ChordFormer** ([arXiv 2502.11840](https://arxiv.org/abs/2502.11840)) | Feb 2025 | Conformer architecture for **large-vocabulary** recognition with class-imbalance reweighting. Targets the seventh/extension long tail | Weight availability |
| **MERT / MusicFM + chord head** ([MERT](https://github.com/yizhilll/MERT), [MARBLE](https://arxiv.org/pdf/2306.10548)) | 2023–24, active | Music foundation models with open weights; MARBLE defines the evaluation protocol | Requires fine-tuning a head |
| **madmom / Chordino** | 2016–18 | **Sanity floor only.** Not a candidate | — |

### What has actually changed since 2018

**Headline MajMin accuracy has moved very little.** ChordFormer reports roughly
+2.3 % frame-wise and +6 % class-wise over prior state of the art — meaningful,
but incremental. The plateau is real and still there: the ground truth itself is
contested, and no amount of model scale fixes a disputed reference annotation.

**But the progress that did happen went almost exactly where this project
hurts.** Both recent papers target, as primary contributions, (1)
over-segmentation and (2) non-triad and infrequent chords. Those are the 279-vs-95
complaint and the D7-vs-D9 layer respectively.

The correct conclusion is not "newer models are more accurate, use one." It is
**"the field spent eight years working on the two things you complained about,
while the headline number stayed flat."**

### The caveat

Research code from 2025–2026 typically has no released weights, no packaging, no
licence clarity, and no maintenance. madmom's one genuine advantage was being a
pip-installable thing that runs. So the spike must not pick a winner on paper:
run two or three candidates plus the Chordino floor through the harness and treat
**practical availability as part of what is measured**.

| | |
|---|---|
| Cost | 1–2 sessions, 0 human gates |
| Priority | Optional. Do it after A4/A5, or let a contributor do it |
| Confidence | High that at least one beats the built-in engine substantially |

## A2. Transcription first, chords derived from notes

**What it is:** audio → note events → chords. Candidates: Basic Pitch (Spotify,
Apache-2.0, lightweight ONNX), or a dedicated piano transcription model.

**Why this project is unusually well placed:** the pipeline already produces a
separated piano stem via `htdemucs_6s`, and piano transcription is by a wide
margin the most mature transcription task there is.

**Why it matters beyond accuracy:** it makes D-vs-D7 a principled question ("is
the C present?") rather than a template-matching accident, and it unlocks several
parked `IDEAS.md` items at once — audible chord preview, reharmonization,
notation, explaining *why* a chord was chosen.

| | |
|---|---|
| Spike cost | 2 sessions |
| Full cost | 4–6 further sessions (note→chord derivation is genuinely hard) |
| Expected outcome | Wide variance. Excellent on clean piano, unknown on separated stems |
| Confidence | Low on outcome, high on strategic value if it works |

Under the corrected premise this is a strong candidate for **a plug-in someone
builds later**, not core work now.

## A3. Structure-aware evidence pooling

**What it is:** songs repeat. If verse 1 and verse 2 are the same eight bars,
pool evidence across both before deciding. Already planned as CR4/CR5.

| | |
|---|---|
| Cost | 2–3 sessions for known groups; 3 more for automatic detection |
| Expected metric gain | Modest |
| Expected user-facing gain | Disproportionately large |
| Confidence | Medium-high |

**Why the user-facing gain exceeds the metric gain:** the same section labelled
differently in verse 1 and verse 2 is the most visible possible failure. Users
notice inconsistency far more than absolute error, because inconsistency is
self-evidently wrong without needing a reference. Raw accuracy is invisible;
contradiction is not.

It also reduces **correction burden** superlinearly: fixing one chord in a
repeated section that the app knows is repeated could fix every instance.

**Sequencing:** after A4. Pooling better-decoded evidence is worth more than
pooling weak evidence.

---

# Interface options

## G1. Phase 3G.2A — timeline input-contract hardening

The only item on this list with a **known, confirmed defect**: trackpad pinch
fails on real Mac hardware. The pointer-based fix passed synthetic automation and
failed human review. `Follow` also repositions the viewport while paused.

The normative contract is already written in
`TIMELINE_INTERACTION_CONTRACT.md`, with a ten-step implementation sequence in
`TASKS.md`. The specification cost is sunk.

| | |
|---|---|
| Cost | 3–4 sessions, 1–2 human gates (real trackpad, required) |
| Benefit | Removes a confirmed user-test blocker |
| Confidence | Highest of any item here |
| Risk | Touches `public/app.js` (4688 lines), the largest integration surface |

## G2. Phase 5D.2 — transport, keyboard, loop, mobile Harmony

Sticky transport while scrolling, Space/Enter shortcuts, touch-friendly targets,
loop handles that stop covering chord names.

| | |
|---|---|
| Cost | 2 sessions, 1 human gate |
| Benefit | Direct friction reduction during practice |
| Confidence | High — concrete, already specified, low ambiguity |

Best cost-to-benefit ratio on the interface side.

## G3. Chord chart presentation and correction experience — *not currently on the roadmap*

**This is the item the product owner named, it does not exist as a task, and the
corrected premise promotes it from important to central.**

If the design premise is that users of the default engine fix errors themselves,
then **the correction experience is the product** for those users, not a fallback
path. Every hour the built-in engine does not spend becoming more accurate is an
hour this has to absorb.

Scope: how the Harmony grid presents harmonic content while playing — bars per
row, chord card density and hierarchy, how sections read, when roman numerals
help versus clutter, legibility at music-stand distance, phone behaviour. Plus
the correction flow itself: how fast is it to fix a wrong chord, fix a whole
repeated section, or accept a suggestion?

| | |
|---|---|
| Design cost | Low for this product owner — Figma proficiency, prior design systems, components already built |
| Implementation cost | 3–5 sessions depending on departure from the current DOM |
| Benefit | Addresses the stated bottleneck and absorbs the deliberate accuracy gap |
| Confidence | High on value, unknown on scope until a design exists |

**This is the only option where the product owner's own capability is the input
rather than the constraint.** It is also the work an agent is least able to
originate and most able to implement quickly from a concrete design.

**Recommended first step:** design it in Figma before scoping implementation.
Costs the agent nothing and turns the vaguest item here into the best-specified
one.

## G4. Design-system pass (currently parked in `IDEAS.md`)

Tokens, buttons, segmented controls, fields, toggles, panels, list rows, mixer
rows. Currently 2058 lines of hand-written CSS with no token layer.

The parking rationale — "a broader abstraction pass has no independent learning
outcome yet" — assumed design work is expensive. For this product owner it is
not. Open source adds a second argument: a coherent token layer is what makes
outside contribution to the UI tractable.

| | |
|---|---|
| Design cost | Near zero |
| Implementation cost | 2–3 sessions for tokens plus primitive extraction |
| Benefit | Every later interface change gets cheaper; enables contributors |
| Confidence | High |

**Do this together with G3.** A chart redesign naturally produces the token and
primitive decisions; two passes over the same CSS is wasted work. Combined,
G3+G4 is realistically 4–6 sessions rather than 5–8 separately.

## G5. Phase 5B.4–5B.6 — section resize, multi-selection, copy/paste

| | |
|---|---|
| Cost | 4–5 sessions |
| Benefit | Was conditional; the corrected premise raises it |
| Confidence | Medium |

`TASKS.md` says these should wait for evidence. That was written when correction
was an edge case. **If users routinely correct charts, multi-selection and
copy/paste stop being power-user conveniences and become core correction
tooling.** Still defer to G3 — the redesign should determine what these look
like — but they are now candidates rather than parked.

---

# Competitive datapoint: how Moises handles the same problem

Confirmed by the product owner as the reference product. Same category, same
pipeline shape (separation, chords, tempo, lyrics).

**Moises does not tier on accuracy. It tiers on chord vocabulary complexity** —
Easy, Medium, and Advanced detection modes, where Advanced exposes extended
chords for jazz and bossa nova. Its free/paid boundary is a usage limit instead:
free users get chord detection for the first minute of a song.

The relevant lesson survives the change of premise. **Vocabulary is the dial, not
accuracy.** A conservative engine offering fewer, simpler, more confident chords
is a legitimate product mode that a well-rated commercial product ships
deliberately. That is precisely the role identified for the built-in engine, and
it means "simple local engine" should not be presented or built as a degraded
version of something better.

It also suggests a cheap feature: a vocabulary setting on the built-in engine
(triads only / sevenths / everything) is likely a small change with visible
benefit, and pairs naturally with A4's confidence output.

---

# Summary comparison

| Option | Cost | Human gates | Benefit | Confidence |
|---|---|---|---|---|
| **A4** transition model in built-in engine | 1–2 | 1 | Fixes over-segmentation at the right layer, no new dependencies | High |
| **A5** analyzer adapter boundary | 1–2 | 0 | Makes the plug-in strategy real | High |
| **G2** transport/loop/mobile | 2 | 1 | Removes daily friction | High |
| **G1** timeline input contract | 3–4 | 1–2 | Fixes known hardware defect | Highest |
| **G3+G4** chart redesign + design system | 4–6 | Figma-led | Absorbs the deliberate accuracy gap | High value, scope TBD |
| **A3** structure pooling | 2–3 | 1 | Removes visible inconsistency; cuts correction burden | Medium-high |
| **A1** reference plug-in model | 1–2 | 0 | Proves and documents the adapter | High, now optional |
| **G5** correction tooling | 4–5 | 1 | Promoted by the correction-first premise | Medium |
| **A2** transcription-first | 6–8 | 2 | Large option value; good contributor project | Low on outcome |
| **A0** CR2–CR5 | 8–10 | 3–5 | Largely superseded by A4 + plug-ins | Poor ratio |

---

# Recommendation

**Make the built-in engine conservative, make it pluggable, then put the main
effort into the interface.**

The corrected premise makes this sharper than the original recommendation, not
just different. The built-in engine no longer needs to win on accuracy, which
removes eight to ten sessions of work from the critical path and replaces them
with one to two.

Suggested order:

1. **A4 + A5 together — 2–3 sessions, 1 human gate.** Add the transition model
   and extract the analyzer behind an adapter in the same iteration, since A4 is
   the change WP4 was waiting for. This is the highest-value backend work
   available and it adds no dependencies.

2. **G1 — 3–4 sessions.** The known trackpad defect blocks user testing.

3. **G3 designed in Figma — product-owner work, agent cost zero.** Include the
   correction flow, not only the chart layout.

4. **G3 + G4 implemented — 4–6 sessions.**

5. **G2 — 2 sessions.**

6. **A3, then optionally A1.** Structure pooling has the best remaining
   correction-burden return. A1 becomes a documentation exercise for the plug-in
   path, and is a natural first contributor task.

**Defer CR2–CR5.** Keep CR1 if the diagnostics are wanted for their own sake.
Record the deferral in `DECISIONS.md` with the reason — the architecture now
solves this better than tuning does — so a later session does not resume the
sequence on the old premise.

**Why the interface wins the main allocation:** the value hypothesis is already
answered, so what remains is delivery risk. The correction-first premise makes
the interface the *primary surface for the default engine*, not a wrapper around
it. And the product owner has an unfair advantage on the interface side and none
on the analyzer side.

**The strongest argument against this recommendation** is that a conservative
engine that under-reports chords could feel empty rather than honest, and that
the correction flow is unproven at volume. Both are real. Both are answered by
building A4 and G3 in that order and reviewing a real song before committing
further — which is why A4 carries a listening gate.

---

# Open questions for the product owner

1. Do you accept **correction burden** as the primary gate, with the severity
   classes as diagnostics? This resolves the deferred `thresholds.rwcPrimaryGate`
   input.
2. Should CR2–CR5 be formally deferred in `TASKS.md` and `DECISIONS.md`, or kept
   active as a fallback if A4 disappoints?
3. Does the plug-in boundary target **a local process** (a command the user
   points at), **an HTTP endpoint**, or **both**? This changes A5's design and is
   the one decision that is hard to reverse later.
4. Should issue #1 be reframed or closed, given the workflow was validated with
   corrected charts?
