# Appendix: Competitive & Pattern Analysis — Moises and Peer Apps

**Companion document to `DESIGN_BRIEF.md`.**
For Claude Design: use this alongside the brief to inform visual direction. It captures how Moises and adjacent apps solve problems we also face, what patterns are worth borrowing, and where our POC should stay distinct.

Screenshots referenced here live in `Moises/Screenshots/` (subfolders `Intro/`, `ipad/`, `iphone/`).

---

## 1. Executive Summary

Our POC (piano-practice-poc) and Moises solve overlapping problems: separate stems from a recording, detect chords and a beat grid, let the musician loop and slow down passages, annotate structural sections (verse / chorus / etc.). Moises has spent years polishing the UI patterns — dark theme with a single accent color, chord-pill cards on a beat grid, section pill navigation, bottom transport bar, per-stem volume rows with instrument icons, and popover controls for tempo/key/metronome.

Moises optimizes for a **mobile-first, tap-driven** practice loop for band musicians and content creators. Our POC has a wider desktop viewport, deeper timing-correction tooling (waveform anchor editing), and richer editorial control over chords + sections. That editorial depth is our differentiator — the design should not flatten it away in pursuit of Moises's cleaner mobile look.

The remaining sections describe: (2) how Moises is structured, (3) how it compares to Chordify, Songsterr, Yousician, Simply Piano, Flowkey, and Ultimate Guitar, (4) patterns worth adopting, (5) patterns to intentionally reject, (6) open design questions.

---

## 2. Moises: Anatomy of the App

### 2.1 Visual system

- **Palette:** near-black background (~#0B0D10), elevated surfaces around #1A1D22, cards around #2A2E34. A single cyan/teal-green accent (~#00E5C2 to #4CE0C0) carries selection, focus, active state, and the brand.
- **Typography:** a single sans (SF-like on iOS). Body ~15pt, chord labels tabular, section pills all-caps small.
- **Iconography:** consistent line-icons for stems — mic (vocals), drums, guitar (headstock silhouette), piano (three keys), bass, keys, other. Icons carry identity so a color-blind or tired user still reads them.
- **Density:** generous vertical rhythm. Everything is a pill, a card, or a slider. No tables in the practice view — even the mixer is icon + label + horizontal fader row, not a channel strip.

### 2.2 Screen hierarchy

- **Global chrome:** bottom tab bar with three items — Sanger / Setlists / Profil (Songs / Setlists / Profile). Compact pill; disappears in-song.
- **Library (Sanger):** dark table on desktop/iPad, condensed card list on iPhone. Columns for Title, Artist, BPM, Key. Recent uploads and demo content at top.
- **In-song view:** three horizontal bands stacked top-to-bottom:
  1. **Chord bar** (horizontally scrollable strip of the current + upcoming chord pills, subdivided by beat).
  2. **Stem rows** (icon + horizontal volume slider + overflow menu). One row per detected stem.
  3. **Bottom transport** (metronome / time-sig / scissors-trim / BPM / prev / play-pause / next / key / section-marker / grid-view / loop).
- **Chord grid view** (accessed from bottom transport's grid icon): full-screen chord chart with numbered bars, chord pills subdivided into beat cells, lyrics overlaid under each bar, and section pill buttons across the bottom.
- **Popovers / sheets:** every setting opens as a bottom sheet with a title, a control (dial / slider / toggle), and a "Tilbakestill til original" (Reset to original) affordance. This "modal knob" pattern keeps the underlying context visible.

### 2.3 Feature primitives observed

| Primitive | Where seen | Notes |
|---|---|---|
| Chord pill | Chord bar + chord grid | Rounded rect, chord name in tabular figures, superscript quality (`Dm⁷`), beat-subdivision cells inside |
| Section pill row | Chord grid bottom | Horizontally scrollable; each pill = section label (Intro, Vers, Kor, Instrumental solo) |
| Stem row | Under chord bar | Icon + slider + overflow, no channel-strip complexity |
| Bottom transport | Practice screen | Dense icon row — see §2.4 for full breakdown |
| Bottom sheet modal | Metronome, key, tempo, trim | Consistent frame; big dial or slider; "reset" affordance |
| Countdown overlay | Before play | Big number in a ring with an accent-colored progress arc |
| File-info sheet | Song settings → Info | Two-tab pill (Generelt / Detaljer). Filename, size, upload date, duration, samplerate, bitrate |
| Trim ("Klipp") sheet | Song settings → Trim | Timeline with two draggable handles + waveform-less midline + preview play |
| Setlist | Bottom tab #2 | Named collections with cover art and creator credit |
| Onboarding goals | First-run | Multi-select cards: Play for fun / Practice / Teach / Social content / Learn songs / Songwriting |

### 2.4 Bottom transport, decoded

From left to right, on the song practice screen:

1. Metronome toggle
2. Time signature indicator
3. Scissors / trim (jumps to Klipp sheet)
4. BPM display (opens tempo sheet with big dial + tempo-name label like "Allegro 120")
5. Skip back / Play-pause (large) / Skip forward
6. Key indicator (opens transpose sheet — horizontal semitone wheel with C in a white pill)
7. Section-marker icon (adds/edits sections)
8. Grid-view icon (switch to full-screen chord chart)
9. Loop icon

That is 9–10 controls in one row — Moises leans on iconography and long-press affordances heavily. Not something to copy 1:1 for our POC because our desktop viewport lets us breathe more.

### 2.5 Interaction patterns worth noting

- **Reset to original** appears on every editable value (tempo, key, metronome mix, trim). This is a strong trust signal for a user who is afraid to "break" the AI detection.
- **Popover instead of inline edit**: touch triggers a modal, the modal contains one specialized control (dial, wheel, slider), the modal dismisses on save. This works because mobile screens are small; on desktop it would feel over-clicked.
- **Section pill row doubles as jump navigation**: tapping a pill scrubs playback to that section's start. That's more than a label — it's the primary intra-song navigation.
- **Onboarding goals shape recommendations**: rather than "what's your instrument" first, they ask "why are you here" (Practice / Teach / Content / Learn / Songwriting). Then instrument. Behavioral segmentation over demographic.

---

## 3. Comparison Matrix

Six comparable apps, mapped against the features that matter for our POC.

| Feature | Moises | **piano-practice-poc** | Chordify | Songsterr | Yousician | Simply Piano | Flowkey | Ultimate Guitar |
|---|---|---|---|---|---|---|---|---|
| **Stem separation (Demucs-class)** | ✔ Guitar / drums / bass / vocals / piano / keys / other | ✔ Configurable | ✕ | ✕ (uses pre-authored tabs) | ✕ | ✕ | ✕ | ✕ |
| **Chord auto-detect from audio** | ✔ | ✔ | ✔ (core feature) | ✕ (chords come from tab source) | ✕ | ✕ | ✕ | ✕ (crowd-sourced tabs) |
| **Section detection (intro/verse/chorus)** | ✔ | ✔ (manual creation, AI-assisted) | Partial | ✕ | ✕ | ✕ | ✕ | ✕ |
| **User-editable chord chart** | Limited (edit label only) | ✔ (chord + bar + beat) | Limited | ✕ | ✕ | ✕ | ✕ | Community edits |
| **User-editable beat/timing grid** | Limited (BPM slider) | ✔ (per-anchor waveform editor) | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Section color / label / symbol** | Label only | ✔ (label + symbol + colorKey) | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Waveform view with beat grid overlay** | ✕ (has plain waveform in trim only) | ✔ | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Loop region** | ✔ | ✔ | ✔ (Premium) | ✔ (Premium) | ✔ | ✔ | ✔ (as "Slow Mode") | ✔ |
| **Speed / slow-down** | ✔ | ✔ | ✔ (Premium) | ✔ (Premium) | ✔ | ✔ | ✔ (Slow / Wait / Fast) | ✔ |
| **Transpose / key change** | ✔ | ✔ | ✔ (Premium) | ✔ (Premium) | ✔ | ✔ | ✔ | ✔ |
| **Metronome with subdivision** | ✔ | ✔ | ✕ | ✔ | ✔ | ✕ | ✕ | ✔ |
| **Countdown before play** | ✔ | ✕ (candidate to add) | ✕ | ✔ | ✔ | ✔ | ✔ | ✔ |
| **Setlists / gigging mode** | ✔ | ✕ | ✔ | ✕ | ✕ | ✕ | ✕ | Playlists |
| **Notation display** | Chords only | Chords only | Chords only | Tab + notation | Notation + tab | Notation | Notation | Tab / chord-over-lyric |
| **Gamification** | ✕ | ✕ | ✕ | ✕ | ✔ (heavy) | ✔ (moderate) | ✕ | ✕ |
| **Primary form factor** | Mobile-first | Desktop-first (POC) | Mobile + web | Mobile + web | Mobile-first | Mobile-first | Mobile + web | Mobile + web |

### 3.1 Where our POC is already ahead

- **Editable beat grid** with waveform anchoring — nobody in this list does per-anchor timing correction. Moises exposes tempo and trim, not a beat grid.
- **Section symbol + label + color** — Moises only lets you name a section. We already treat sections as a first-class object with three orthogonal fields (`symbol`, `label`, `colorKey`). That's a genuine differentiator worth playing up visually.
- **Explicit immutable "AI baseline"** — `job.result.metadata` never changes; user edits live in `practiceState`. Moises's "Reset to original" hints at the same idea but doesn't visualize the divergence.

### 3.2 Where Moises and peers are ahead

- **Countdown before play** (Moises, Yousician, Songsterr, Flowkey). Cheap to add, feels professional.
- **Bottom transport as unified control surface**. Ours is spread across the practice view.
- **Stem row with instrument icon** rather than text label. Faster to parse.
- **Chord pill with beat-subdivision cells inside** (Moises). Ours shows chords but doesn't visualize the beat structure within a bar as elegantly.
- **Section pill row as jump navigation**. We have sections; we don't yet use them as scrub targets.
- **Setlist / playlist container** for gigging or ordered practice. Moises, Ultimate Guitar and Chordify all have this.
- **Onboarding goal picker** to segment users behaviorally rather than by instrument.
- **File-info sheet** with basic media metadata — small polish, feels solid.

---

## 4. Design Patterns Worth Adopting

These are candidates to fold into whatever visual direction Claude Design proposes. Each has a rationale specific to our POC.

### 4.1 Dark theme with a single accent

Moises, Songsterr, Chordify (dark mode), Ultimate Guitar all live in dark. Musicians practice in low-light rooms, next to speakers, in front of laptops on stage. **Direction:** default to dark, offer light as an alternate.

Accent-color candidates that avoid the Moises cyan:
- Warm amber (**#F5A623-ish**) — reads acoustic, wood, jazz.
- Deep coral (**#F26A6A**) — reads warm, human, choir.
- Electric magenta (**#E040FB**) — reads DAW, modern.

### 4.2 Chord pill card with beat-subdivision cells

Moises's chord bar is essentially: one bar = one card = one chord label + N beat cells. Currently our chord grid shows chords per bar but the beat cells are less visually prominent. Making beats a first-class row of subcells inside each bar card would:
- Let users edit "which beat does the chord change on" by clicking a cell.
- Give the eye a stronger rhythmic grid to follow while playing.

### 4.3 Section pill row as jump navigation

We already have section labels — currently used as decoration. **Direction:** add a scrollable pill row (like the one seen at the bottom of IMG_5553) that both labels *and* navigates. Tap = seek to section start. Long-press = edit.

### 4.4 Stem row with instrument icon

Replace text-labeled stem rows in the mixer with `icon + name + slider + overflow`. Reuses recognition patterns from Moises, GarageBand, Logic. Icons: mic, drums, bass, guitar, piano, other.

### 4.5 Countdown before play

A 2-beat or 4-beat countdown overlay (see IMG_5581 — big number in a ring with accent-color progress arc) is universal across practice apps. Trivial to implement; large UX win when practicing along.

### 4.6 "Reset to original" as consistent affordance

Wherever the user has edited an AI-detected value (chord, tempo, section, key, beat position), show a subtle "Reset to original" link. Reinforces the mental model that AI output is baseline, user edits are overlays.

### 4.7 Bottom sheet for popover controls (mobile) / inline panel (desktop)

The Moises pattern of "tap a value → sheet with one big control" translates well to mobile. On desktop we should keep controls inline but visually related — a docked right-hand inspector or floating panel over the timeline.

### 4.8 Setlist container (mid-term)

Setlists / practice queues (Moises: Setlists, Ultimate Guitar: Songbooks, Chordify: Playlists) let a user string songs together for a rehearsal or gig. Not urgent but strategically important if the POC targets working musicians.

### 4.9 Behavioral onboarding

Ask "why are you here" before "what instrument." Practice, gig, teach, learn, write — these shape which affordances to surface first (loop for practice, setlist for gig, section export for teaching, transpose for learning, chord edit for writing).

---

## 5. Patterns to Intentionally Reject

Not everything Moises does fits our POC. Explicit "don't":

- **Overloaded bottom transport (9+ icons in one row).** Fine for iPhone. On desktop, we have space to group by function.
- **Sections as label-only.** Our three-field model (symbol / label / color) is richer — do not flatten.
- **Full-screen popover for every edit.** On desktop, popovers should be inline / docked. Modal-per-edit becomes fatiguing at keyboard/mouse speeds.
- **Gamification (Yousician).** Our user is a working / practicing musician, not a beginner being taught scales. Points and streaks would feel infantilizing.
- **Sheet music front-and-center (Flowkey / Simply Piano).** We are chord-and-section-oriented, not note-reading. Don't drift into notation.
- **Hiding the AI baseline behind a "reset" button.** The baseline should be visible as a soft ghost / annotation *while* the user is editing, not something you can only recover by tapping reset.

---

## 6. Open Design Questions for Claude Design

Framing questions to be answered by whichever direction is proposed:

1. **How do we visually distinguish AI-detected content from user-edited content?** A dot? A subtle underline? A ghost-layer? This is our POC's unique problem — Moises and peers don't have to solve it because their edits are limited.
2. **Where does the beat-grid editing UI live?** Modal, inline, dedicated screen? Moises punts on this entirely.
3. **What's the density profile?** Mobile-mobile-cramped (Moises) vs. DAW-dense (Reaper / Logic) vs. Notion-airy? Our POC is desktop-first — we can be denser than Moises.
4. **How does the section color system read visually?** Highlighted bar backgrounds? Section-bar-strip above the chord row? Section pills only? Both?
5. **What's the accent color's job?** Selection only? Active playback only? Or does it also carry brand identity throughout?
6. **Should the practice view ever be full-screen?** Mobile Moises hides its bottom tab bar in-song. Do we hide app chrome when playing? "Rehearsal mode"?
7. **What's the shortest path from library → playing along?** Moises: tap song → auto-plays. Ours: multi-step. Where can we cut?

---

## 7. Screenshot References

Callouts to specific Moises screenshots that illustrate the patterns above:

| Pattern | File |
|---|---|
| Library (mobile) | `iphone/IMG_5527.PNG` – `IMG_5531.PNG` |
| In-song stem rows + chord strip | `iphone/IMG_5535.PNG`, `IMG_5540.PNG` |
| Chord grid full-screen | `iphone/IMG_5550.PNG` |
| Chord grid + lyrics + section pills | `iphone/IMG_5553.PNG` |
| Trim (Klipp) sheet | `iphone/IMG_5541.PNG` |
| File info sheet | `iphone/IMG_5545.PNG` |
| Metronome popover | `iphone/IMG_5548.PNG` |
| Add song sheet | `iphone/IMG_5556.PNG` |
| Recording mode | `iphone/IMG_5559.PNG` |
| Setlists tab | `iphone/IMG_5562.PNG` |
| Empty setlist state | `iphone/IMG_5565.PNG` |
| Edit setlist | `iphone/IMG_5568.PNG` |
| Onboarding goals | `iphone/IMG_5571.PNG` |
| Settings | `iphone/IMG_5574.PNG` |
| Key transpose (wheel) | `iphone/IMG_5576.PNG` |
| Countdown before play | `iphone/IMG_5581.PNG` |
| iPad layout (broader viewport) | `ipad/IMG_0043.PNG` – `IMG_0050.PNG` |
| Marketing / intro | `Intro/IMG_0040.PNG` – `IMG_0042.PNG` |

---

## Sources

- [Moises: The Musician's AI App](https://moises.ai/)
- [Moises features overview](https://moises.ai/features/)
- [Moises AI Review 2026 — StemSplit](https://stemsplit.io/blog/moises-ai-review)
- [Chordify — App Store listing](https://apps.apple.com/us/app/chordify-songs-chords-tuner/id1073624757)
- [10 Best Chordify Alternatives for Musicians in 2026 — SaaSSwitcher](https://www.saasswitcher.com/blog/chordify-alternatives)
- [Songsterr Plus](https://www.songsterr.com/plus)
- [Songsterr — Redefining Music Practice (St. Augustine's University)](https://explore.st-aug.edu/exp/songsterr-the-interactive-tab-player-redefining-music-practice)
- [Simply Piano vs. Yousician vs. Flowkey (Omari MC)](https://www.omarimc.com/simply-piano-vs-yousician-vs-flowkey-review/)
- [Best piano learning apps 2026 (Preply)](https://preply.com/en/blog/best-piano-learning-apps/)
- [Ultimate Guitar: Chords & Tabs — App Store](https://apps.apple.com/us/app/ultimate-guitar-chords-tabs/id357828853)
- [How to Use the Ultimate Guitar App (Riffhard)](https://www.riffhard.com/how-to-use-the-ultimate-guitar-app/)
