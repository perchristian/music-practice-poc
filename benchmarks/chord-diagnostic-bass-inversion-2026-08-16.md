# Diagnostic: Bass-Authoritative Root Selection vs. Chord Inversions

Date: 2026-08-16

Status: **Diagnostic only.** This sample is not part of the locked RWC
development/holdout split (`docs/research/chord-reliability-validation-plan.md`)
and must never be used to tune thresholds, select a CR2F/CR3 candidate, or
authorize product integration by itself. It exists to make a previously
theoretical concern reproducible against real audio.

## Origin

Raised during code review of the local chord analyzer's bass-evidence
handling: the fixed 8-quality chord vocabulary in `server.js` (`chordQualities`)
has no inversion/slash-chord representation, and `scoreChordDetails`'s
`rootBonus` term rewards whichever pitch class dominates the bass without
checking whether that pitch class is actually a chord tone of a
better-fitting triad rooted elsewhere. The user supplied a short recording
built specifically to test this: the same triad shape played over three
different bass notes.

## Input

- Source: user-supplied recording, filename `Min_sang_23.m4a` (title "Min
  sang 23"), not retained in this repository per the corpus/media-outside-Git
  contract.
- Source SHA256 (m4a, as supplied):
  `b1bb51062a2e9ce8880b2c7671d411ff20bc6c140abf5aa778a4a4fdf036fca6`
- Decoded SHA256 (mono PCM16 WAV, 44.1 kHz, via
  `ffmpeg -ac 1 -ar 44100 -sample_fmt s16`):
  `fd719f81f869f017758b2e1cefb618b2c6c49fa162261d14291d946630a70fd9`
- Duration: 8.752 s. Neither file is committed; regenerate the WAV from the
  original recording to reproduce.

## Method

Ran the unmodified local `legacy` evidence policy end to end —
`estimateBeatGrid` for timing, then `analyzeHarmonyFromAudio` with
`includeDiagnostics: true` — using the new reusable tool
`scripts/diagnose-chord-scoring.js`. No application server was started and no
job was created. This is diagnostic tooling, not a benchmark harness change;
it does not touch `scripts/benchmark-chords.js` or any locked manifest.

Reproduce:

```sh
ffmpeg -i Min_sang_23.m4a -ac 1 -ar 44100 -sample_fmt s16 source-audio.wav
node scripts/diagnose-chord-scoring.js source-audio.wav
```

## Beat grid found

109.7 BPM, 4/4, estimated (not corrected). ~2.2 s per bar.

## Result

| Bar | Bass played | Dominant full-mix chroma | Label produced |
| --- | --- | --- | --- |
| 1 | A | A:1.00, E:0.71, C:0.60, **G:0.08** | Am |
| 2 | C | C dominant, confident C-rooted candidates | C |
| 3 | E | E:1.00, C:0.34, A:0.34, **G:0.04** | **Esus4** |
| 4 | A (repeat of bar 1) | — | Am |

## Interpretation

**Bar 1 is not obviously a bug.** The chroma shows a clean A-C-E triad with
no material G energy. Whatever the player intended, what is actually
sounding is indistinguishable from A minor in root position — there is no
audible fifth to support reading it as "C over A." `Am` is a defensible
label for what the signal contains. This has not been confirmed by ear; it
is a reading of the numeric chroma only (see caveat below).

**Bar 3 reproduces the theorized gap, and the numbers show the exact
mechanism.** Candidate scores for bar 3, beat 1:

```
Esus4  score=3.103  templateEnergy=1.415  rootBonus=1.350  bassChordToneBonus=0.241
Emaj7  score=2.801
Em7    score=2.760
```

C major never appears in the top candidates. `rootBonus =
chroma[root]*0.8 + bassChroma[root]*0.55` (`server.js:1085`) gives root=E a
1.350 bonus (chroma[E]=1.00, bassChroma[E]=1.00) versus only 0.305 for
root=C (chroma[C]=0.34, bassChroma[C]=0.06) — a gap of over a full point,
independent of how well either root's quality template actually fits the
sounding notes. The root-selection loop in `estimateChord`
(`server.js:1132-1146`) only tests "quality rooted at X" per candidate root;
it never tests "known triad rooted elsewhere, this pitch class is its
bass/inversion." So C-major-over-E is structurally unreachable as a
candidate, and the scorer instead roots on E and reaches for `sus4` to
explain the leftover A energy, leaving the C energy (0.34, not negligible)
absorbed at only 8% penalty weight as "outside" energy.

**Caveat:** this is chroma-number evidence, not a listening review. G is
faint in both bar 1 and bar 3 (0.08 and 0.04), so it is also possible bar 3
is a genuinely ambiguous moment on the recording rather than a clean C/E
that the analyzer mislabels. Confirming that by ear is the next step before
this counts as a confirmed failure rather than a plausible one.

## Recommended follow-up

Logged as task **CR2G** in `docs/planning/TASKS.md`: run the same sample
through Chordino (Sonic Annotator + the existing pinned
`benchmarks/chordino-transform.n3`) to see whether its HMM-based decoding
handles bar 3 differently, before deciding whether a fix belongs in the
local scoring formula, in Chordino post-processing (CR2F), or in a new
inversion-aware quality vocabulary (currently a CR3 non-goal).
