# Project Review: Repositioning From Piano Practice to Band Cover Practice

Date: 2026-08-08
Status: Review for product-owner decision. Nothing in this note has been implemented.

Trigger: the product owner stated that the purpose is no longer only piano
practice, but practice for any band member playing covers.

---

## Verdict

The repositioning is cheap in code and expensive in documentation, and it
invalidates exactly one substantive engineering decision.

The audio and analysis layers are already band-shaped. `htdemucs_6s` emits
`Drums`, `Bass`, `Guitar`, `Piano`, `Vocals`, and `Other` — close to one stem per
band role — and the mixer treats all six identically. Chord charts, the beat/bar
grid, sections, loops, speed, and the metronome are instrument-neutral
capabilities that happened to be built for a pianist.

What is piano-shaped is the *framing*: `AGENTS.md`, `VISION.md`, the design
brief, the risk register, and the naming. Those steer every future agent session,
so they are the part that actually blocks the pivot.

The one real casualty is Decision 19 (accept Demucs), whose stated rationale does
not survive the new purpose. See Finding 4.

The chord-reliability gate should not be reopened or paused. It survives the
repositioning intact and is, if anything, better justified now.

---

## Finding 1: The separation backend already matches a band

`server.js:2230` requests exactly:

```js
const stemIds = ["drums", "bass", "guitar", "piano", "vocals", "other"];
```

That is a drummer, a bassist, a guitarist, a keys player, and a singer, plus a
residual. No pipeline change is required to serve a band. The six-stem model was
chosen for piano removal and incidentally delivered the band product.

This is the strongest argument that the repositioning is low-risk: the expensive,
irreversible layer — separation engine, job model, stem storage, API shape — needs
no change at all.

## Finding 2: Runtime piano coupling is shallow and enumerable

There are 46 `piano` matches in `server.js` and 7 in `public/app.js`, but almost
all are mock fixtures, log strings, or the retired FFmpeg separator. The coupling
that affects behavior is only this:

| Site | What it does | Assessment |
| --- | --- | --- |
| `public/app.js:3506` | `if (stem.id === "piano") primaryPlayer = player` | `primaryPlayer` is only a duration/clock reference (`transportDuration`, `public/app.js:3062`) and a null guard. Line 3512 already falls back to `stemPlayers[0]`. Preferring piano here has no musical justification; prefer the longest loaded stem instead. |
| `server.js:2933` | `stems.find((stem) => stem.id === "piano") \|\| stems[0]` | Backs the legacy `GET /api/jobs/:id/piano.wav` compatibility endpoint (`server.js:3095`). Harmless but now misnamed. |
| `public/app.js:1397` | Single-stem fallback labeled `Piano` | Only reached for legacy jobs with no stem list. |
| `server.js:65-70` | `HARMONIC_STEM_WEIGHTS` with `piano: 0.7` | Legitimately instrument-specific analyzer evidence weighting, not a product assumption. Leave alone; CR2/CR3 own it. |
| `server.js:157` | `defaultMuted: false` for every stem | The real gap. See Finding 3. |
| `server.js:29`, `2076-2164`, `2274` | `ffmpeg-spectral-piano-v1` fallback separator | Genuinely piano-only: it splits into `piano.wav` + `accompaniment.wav`. Under the band framing this fallback no longer produces a usable practice result for four of five roles. |

Estimated effort to make the runtime instrument-neutral, excluding the new model
in Finding 3: a few hours.

## Finding 3: The missing model is `practiceTarget`

There is no representation anywhere of *which part the user is practising*. The
mixer is symmetric and every stem is unmuted on open (`server.js:157`).

Under the piano framing this was fine — the user always muted the same row.
Under the band framing, "which stem is mine" is the single most important piece
of per-song, per-user state, and it is absent.

`docs/product/IDEAS.md` already contains this exactly, parked:

> **Additional Practice Targets** — Candidate scope: A `practiceTarget` model for
> piano, synth, guitar, lead vocal, bass, drums, or rest. Dynamic stem sets
> without breaking the player.
> Why parked: Piano remains the hypothesis-validation target; broadening now would
> dilute learning.

The stated promotion trigger ("Piano user testing succeeds or clearly shows
another target is required") has **not** been met by evidence — no user has used
the prototype at all. The promotion is a directional product-owner decision, not
an evidence-driven one. That is legitimate, but it should be logged as such in
`docs/planning/DECISIONS.md` rather than presented as the parked trigger firing.

Minimum useful shape: `practiceState.practiceTarget` holding a stem id or null;
default-mute that stem when the song opens; show the target row distinctly in the
mixer. That is a small change that converts a symmetric mixer into a practice
tool, and it does not require dynamic stem sets.

## Finding 4: Decision 19's rationale no longer holds

This is the substantive casualty. `docs/planning/DECISIONS.md` Decision 19 accepts
Demucs on this reasoning:

> The solo piano stem can crackle and is not presentation-quality, but **solo
> piano quality is less important than creating a useful non-piano backing
> track**.

`docs/planning/RISKS.md:9` encodes the same trade, mitigating by "prioritize a
useful accompaniment over perfect isolation", and rates the risk *Low*.

That trade was correct when exactly one stem was ever removed and no stem was
ever studied. It is wrong now. A guitarist learning a part will **solo the guitar
stem** to hear what to play. A drummer will solo the drums. Per-stem isolation
quality moves from "less important" to a primary quality bar, for all six stems,
and the evidence base for it is one listening pass on one clip
(`MakeYouFeelMyLovePart2.mov`), judged on the removal case only.

The conclusion (keep Demucs) is very likely still right — there is no better
reproducible option in scope. The *rationale* and the *risk rating* are stale, and
the evidence needed to confirm the decision has not been gathered.

Recommended: a bounded listening check — solo each of the six stems on two or
three real recordings and rate per-role usability — logged as a superseding
decision. This is hours of work, not a new gate, and it is the highest-value
verification the repositioning creates.

## Finding 5: Role coverage is uneven, and the gate no longer blocks everyone

Mapping current capability onto band roles:

| Role | Needs | Status |
| --- | --- | --- |
| Keys / piano | Chords, roman numerals, key, sections, mute own stem | Served. Blocked by the chord gate. |
| Guitar | Same as keys; voicings/tab later | Served. Blocked by the chord gate. |
| Bass | Root motion, inversions, slash chords | Mostly served. Slash chords are parked in `IDEAS.md` under Advanced Chord Vocabulary. Blocked by the chord gate. |
| Drums | Tempo, meter, bar grid, count-in, click, section map, loops | **Served now.** Chord accuracy is irrelevant to this role, and timing already passed its human gate. |
| Vocals | Melody line, lyrics, key/transposition | **Not served.** Melody transcription is unimplemented (`README.md:41`); melody, lyrics, and transposition are all parked in `IDEAS.md`. |

Two consequences follow, and they are the most actionable findings in this review:

1. **The chord gate blocks three of five roles, not the whole product.** A
   drummer could use the prototype today. `docs/planning/STATUS.md` records that
   no user has ever used it, while the gate has been running since 2026-07-23.
   The repositioning creates a legitimate path to first user contact that does
   not require waiting for CR6.
2. **The singer is blocked by a second, untouched gate.** Melody and lyrics are
   not a polish item for that role; they are the role's core content. Deciding
   whether vocals is in scope for the POC is a genuine new product decision, and
   it is the only part of the repositioning that adds real scope rather than
   removing framing.

## Finding 6: Mock mode cannot demonstrate the new premise

`server.js:88-94` generates `drums`, `bass`, `guitar`, `piano` — no vocals. The
external mock stems (`server.js:96-112`) are a piano/accompaniment pair sourced
from `Bare piano.m4a` and `Uten piano.m4a` ("without piano").

Mock mode is the dependency-light path that `AGENTS.md` requires to stay fully
demoable, and it is the only path that runs without Torch. As it stands it can
demonstrate a pianist's workflow and nothing else. Adding a generated `vocals`
stem and dropping the piano/accompaniment pairing as the preferred mock shape is
small work with high demo value.

## Finding 7: The documentation is the actual blocker

Code is a few hours. Steering documents are the problem, because `AGENTS.md` is
loaded by every agent session and currently states:

> Your mission is to answer one product question:
> *Can AI transform a simple screen recording of a song into a significantly
> better piano learning experience?*

Until that changes, every fresh session will re-derive piano-only priorities and
push the codebase back toward the old framing. The same applies to `VISION.md`
(product question, target user, all eleven key results), `DESIGN_BRIEF.md`
("Design Brief: Piano Practice App", "Who uses it", "the piano stem is the most
important row"), `DEMO.md` (steps 11-14 and 15-16 verify piano mute/solo
specifically), and `RISKS.md:8-9`.

This is mechanical rewriting, but it should be done deliberately and in one pass,
because a half-reframed `AGENTS.md` is worse than either consistent state.

## Finding 8: Naming drift has already started

The working directory and GitHub repository are `music-practice-poc`, but:

- `package.json:2` — `"name": "piano-practice-poc"`
- `package.json:5` — `"description": "Mock-first piano practice POC..."`
- `public/index.html:6` — `<title>Piano Practice POC</title>`
- `public/index.html:13` — `<h1>Piano Practice</h1>`
- `README.md:1` — `# piano-practice-poc`
- `CHANGELOG.md:3` — "the piano-practice POC"
- `server.js:3148` — logs `Piano Practice POC running at ...`
- `public/app.js:168`, `:584` — localStorage key `piano-practice-pipeline-mode`
- `docs/planning/STATUS.md:104`, `TASKS.md:92-96` — issue links to
  `github.com/perchristian/piano-practice-poc/...`

The issue links still resolve through GitHub's rename redirect, so nothing is
broken. Renaming the localStorage key resets one saved mode preference on one
local machine — immaterial for a single-user POC.

---

## What does not change

- **The chord-reliability gate.** Chord accuracy matters *more* under the band
  framing, since it is the shared artifact three roles read from. RWC-P, the
  MajMin metric, the locked development/holdout split, and CR1-CR6 are all
  instrument-neutral and need no revision.
- **CR2's premise.** "Accompaniment-first melody suppression" treats vocals as
  noise *for chord detection*. That remains correct even when a singer is a
  target user; the singer needs a melody line, which is a separate output, not a
  reason to let vocals drive chord labels.
- **Timing, transport, persistence, sections, and the editable chart.** All
  instrument-neutral, all already built.
- **The architecture, storage model, and API surface.** No change required.

## Risk register deltas

| Risk | Current | Should become |
| --- | --- | --- |
| `RISKS.md:9` "Non-piano stems are too poor..." | Likelihood Low; mitigation prioritizes accompaniment over isolation | Reframe as "any stem is too poor to study in isolation"; raise likelihood; mitigation must require per-stem solo review |
| `RISKS.md:8` "Piano leaks into other/guitar/vocals" | Piano-specific | Generalize to cross-stem leakage; a guitarist hearing piano bleed is the same defect |
| `RISKS.md:10` Basic Pitch / dense polyphonic piano | Piano transcription | Retarget to melody extraction for the vocal role, or close it if vocals is declared out of scope |
| `RISKS.md:38` "Users need notation or keyboard visualization" | Keyboard-specific | Generalize; a guitarist wants tab/voicings, a drummer wants a groove map |

---

## Recommended sequence

1. **Log the repositioning as a decision** in `docs/planning/DECISIONS.md`, stating
   plainly that it is directional rather than evidence-driven, and that it
   promotes "Additional Practice Targets" from `IDEAS.md` ahead of its recorded
   trigger.
2. **Reframe the steering documents in one pass** — `AGENTS.md` mission,
   `VISION.md`, `DESIGN_BRIEF.md`, `DEMO.md`, `RISKS.md` — plus the naming in
   Finding 8. Highest leverage per hour of anything in this review.
3. **Add `practiceState.practiceTarget`** with default-mute on open and a
   distinct mixer row. Small, and it is what makes the app a band tool rather
   than a symmetric mixer.
4. **Add a generated `vocals` stem to mock mode** so the dependency-light demo
   can show a non-pianist journey.
5. **Run the per-stem solo listening check** on two or three real recordings and
   supersede Decision 19 with what it finds.
6. **Decide the vocals scope question** (below) before committing to any melody
   or lyrics work.
7. **Continue CR1 unchanged.** The gate is unaffected.

Steps 1-4 are roughly a day and are all reversible. Step 5 is the only new
verification the repositioning demands. Nothing here needs to interrupt CR1.

## Open product-owner decisions

1. **Is the vocal role in scope for the POC?** It is the only role requiring
   genuinely new capability (melody, lyrics, transposition — all currently
   parked). Declaring it out of scope for now is defensible and keeps the pivot
   nearly free; declaring it in scope adds a second validation gate comparable in
   size to the chord gate.
2. **Should first user testing start with a drummer, before the chord gate
   closes?** The timing subsystem has passed its human gate and does not depend
   on chord accuracy. This would produce the project's first real user evidence
   without weakening the gate. The counter-argument is that it validates the
   least differentiated part of the product.
3. **Does "any band member" include roles with no dedicated stem** — a
   saxophonist, a second guitarist, a backing vocalist? `htdemucs_6s` cannot
   isolate them, and they would fall into `other`. Worth bounding explicitly so
   the promise does not exceed the pipeline.
4. **Keep or retire `ffmpeg-spectral-piano-v1`?** It only produces a
   piano/accompaniment split and is now useless for four of five roles. Retiring
   it removes a fallback but also removes a misleading path.
