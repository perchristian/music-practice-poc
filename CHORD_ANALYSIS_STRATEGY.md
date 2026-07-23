# Current Chord-Analysis Strategy

Date reviewed: 2026-07-23

## Purpose

This document describes how the prototype currently finds chord names for an
imported song. It is intended for product and technical review, not as a claim
that the generated chart is musically correct.

The central strategy is:

> Generate a beat-aligned first draft from audio, preserve the analysis as
> provenance, and let the musician correct a separate working chord chart.

The application does not currently identify the song and retrieve a published
chord chart. It also does not use an LLM, Basic Pitch, note transcription, or a
third-party automatic chord-recognition engine.

## Real mode and mock mode are different

| Mode | What happens after import | Meaning of the displayed chords |
| --- | --- | --- |
| `PIPELINE_MODE=real` | The uploaded recording is analyzed as described below. | Approximate analyzer suggestions derived from the recording. |
| `PIPELINE_MODE=mock` | The recording itself is not analyzed. The backend returns a fixed C-major demonstration progression: `Cmaj7`, `Am7`, `Fmaj7`, `G7`. | Fixture data used to exercise the complete product flow. It says nothing about the imported song. |

Only real mode attempts to find the song's chords.

## End-to-end real-mode flow

```text
Imported video or audio
        |
        v
FFmpeg extracts PCM16 source-audio.wav
        |
        +------------------------------+
        |                              |
        v                              v
Estimate musical timing          Separate stems with Demucs
(tempo, beat, downbeat,          (bass, guitar, piano, other,
meter, bar positions)             drums, vocals)
        |                              |
        +--------------+---------------+
                       |
                       v
Create one analysis window per beat
                       |
                       v
Measure pitch-class energy from the full mix
and useful harmonic/bass stems
                       |
                       v
Score a small set of chord templates
                       |
                       v
Suppress isolated A-B-A one-beat changes
and merge repeats within each bar
                       |
                       v
Estimate key and derive roman numerals
                       |
                       v
Store immutable analyzer suggestions
                       |
                       v
Seed a separate musician-editable working chart
```

The implementation is primarily in
[`server.js`](./server.js), especially `estimateBeatGrid`,
`chromaEvidenceForBar`, `estimateChord`, `estimateKey`, and
`analyzeHarmonyFromAudio`.

## 1. Prepare a lightweight analysis signal

FFmpeg extracts the first audio stream from the imported media into an
uncompressed PCM16 WAV file named `source-audio.wav`. Source sample rate and
channel count are preserved in that file for separation and playback.

For analysis, the WAV reader:

- averages channels to mono;
- samples the signal at approximately 8 kHz;
- keeps the entire recording available rather than truncating long songs.

The approximately 8 kHz representation is a deliberate POC tradeoff. It keeps
full-song analysis dependency-free and fast, but discards high-frequency detail
and is not equivalent to a purpose-built music-information-retrieval frontend.

## 2. Establish timing before assigning chords

Chord labels are only useful if their changes occur at the right musical
positions. The analyzer therefore estimates timing first:

- an RMS/onset envelope is calculated in 50 ms frames;
- periodic correlations are searched over roughly 60–170 BPM;
- a conservative half-time correction tries to avoid choosing subdivisions as
  beats;
- onset strength is used to estimate beat phase, downbeat phase, and either 4/4
  or a limited 3/4 path;
- persistent tempo or meter observations may produce a threshold-aware timing
  map.

The resulting bar/beat grid creates one chord-analysis window per beat. This
allows more than one chord per bar. Adjacent equal results may later be merged,
but equal labels are not merged across a bar boundary.

Timing is a major dependency: a wrong beat, downbeat, meter, or tempo creates
windows over the wrong audio and can make an otherwise plausible chord scorer
look wrong.

### User-corrected timing

The musician can correct Bar 1, downbeats, tempo changes, and meter changes.
Real-mode chord reanalysis can then use those corrected beat boundaries instead
of the original estimated grid.

Reanalysis is explicit and requires confirmation because it replaces the
current working chart. The previous chart is retained for a scoped one-step
undo. Analyzer timing evidence and user timing remain separate data.

## 3. Combine full-mix and stem evidence

The strategy treats chords as whole-song harmony, not as something that should
be inferred from the piano stem alone. Piano voicings may omit roots, include
passing notes, or play only part of the harmony.

For each beat window, the analyzer creates two 12-value chroma vectors:

- **harmonic chroma**, covering approximately MIDI 36–84;
- **bass chroma**, covering approximately MIDI 28–52.

Each value represents the measured energy of one pitch class, combining
equivalent notes across octaves. The implementation projects the audio against
each equal-tempered MIDI frequency and folds the results into the 12 pitch
classes.

Evidence is weighted as follows:

| Source | Harmonic weight | Bass/root weight |
| --- | ---: | ---: |
| Full mix | 0.45 | 0.70 |
| `other` stem | 1.40 | — |
| `accompaniment` fallback stem | 1.20 | 0.40 |
| `guitar` stem | 0.90 | — |
| `piano` stem | 0.70 | — |
| `bass` stem | — | 1.60 |

Stem evidence is opportunistic. A missing, unreadable, non-WAV, or very quiet
stem is ignored, and the full mix remains the fallback. Drums and vocals are
not directly included in the stem-specific harmonic weighting, although their
content remains present in the full mix.

This weighting reflects the working musical assumption that:

- bass is strong evidence for root motion;
- guitar, piano, accompaniment, and `other` help identify chord quality;
- the full mix protects against separation removing or leaking important notes.

The weights are hand-tuned heuristics, not learned parameters.

## 4. Score a conservative chord vocabulary

Every beat window is compared with all 12 roots for these eight qualities:

- major;
- minor;
- dominant 7;
- minor 7;
- major 7;
- suspended 2;
- suspended 4;
- diminished.

For each root/quality pair, the score:

1. rewards chroma energy on the chord-template notes;
2. lightly penalizes energy outside the template;
3. rewards the proposed root in both harmonic and bass chroma;
4. rewards any bass note that is a chord tone, so an inversion does not
   automatically force the bass note to become the root;
5. rewards evidence for the third or suspension that distinguishes chord
   quality.

The highest-scoring root and quality win. The margin over the second-best
candidate becomes a bounded heuristic confidence value.

Weakly supported sevenths are simplified:

- dominant 7 and major 7 may become major;
- minor 7 may become minor.

The seventh must have at least 55% of the strongest triad-tone energy to survive
this simplification. This intentionally favors a useful triad over a
false-precision seventh.

## 5. Make the default chart less noisy

The raw analyzer initially produces one candidate per beat. The default
`beat-aware-chroma-v3` presentation applies one narrow sequence rule:

```text
A - B - A  ->  A - A - A
```

`B` is suppressed only when it lasts for one analysis beat and its immediate
neighbors have the same root and quality. Other short changes are retained.
Adjacent equal labels are then merged within their bar.

This reduces false extra changes, but it can hide a real passing chord. For that
reason, only candidates changed by this rule are retained separately as
`suppressedChordSuggestions`. The UI lets the musician review and restore an
individual hidden beat into the working chart.

## 6. Estimate key and roman numerals

All beat-level harmonic chroma is accumulated across the song. The result is
compared with fixed major and minor key profiles for all 12 tonics.

There is one additional heuristic: if the estimated key is minor but the first
chord is the corresponding relative-major tonic, the key is changed to that
relative major with capped confidence.

Chord roots are then converted to roman numerals relative to the selected key.
If a root is outside the diatonic scale, its note name is used instead of a
scale-degree numeral.

The musician can override the key. That override is authoritative for roman
numerals and for a later corrected-timing reanalysis. It does not retroactively
change the already persisted automatic chord roots or qualities until
reanalysis is requested.

## 7. Keep analysis and musician decisions separate

The persisted layers have different ownership:

| Layer | Location | Role |
| --- | --- | --- |
| Conservative analyzer result | `job.result.metadata.chords` | Immutable first-draft suggestions and provenance. |
| Hidden raw differences | `job.result.metadata.suppressedChordSuggestions` | Only one-beat candidates removed by conservative smoothing. |
| Corrected-timing analysis | `job.result.metadata.correctedTimingAnalysis` | A newer immutable analysis made from the user's timing map. |
| Working chart | `practiceState.chordChart` | The musician's authoritative editable chart once created. |

The working chart can be edited by changing names, adding, deleting, moving, or
resizing chord events on the musical grid. Analyzer reruns do not silently
learn from or overwrite these edits. `Back to analysis` is explicit, confirmed,
and undoable once while the same analysis remains active.

This is part of the correctness strategy: because automatic chord labels are
not reliable enough to be authoritative, the prototype optimizes for reaching
a useful correctable chart rather than claiming a final answer.

## Evidence supporting the current strategy

### Generated known-answer fixtures

Automated tests cover:

- pre-roll and downbeat placement;
- multiple chord changes within a 4/4 bar;
- a limited 3/4 case;
- inversions where the bass does not play the root;
- corrected variable-tempo analysis windows.

These fixtures verify intended behavior and prevent regressions, but their
synthesized tones are much easier than commercial screen-recording audio.

### RWC-P real-music benchmark

The current analyzer was evaluated on a locked 12-song RWC Popular Music pilot:
eight development tracks and four holdout tracks. It was run with both
reference timing and analyzer-estimated timing.

For the current isolated-beat smoothing strategy:

| Split and timing | Root WCSR | Major/minor WCSR | Boundary F1 |
| --- | ---: | ---: | ---: |
| Development, reference timing | 72.7% | 60.8% | 57.2% |
| Development, estimated timing | 67.1% | 55.7% | 45.2% |
| Holdout, reference timing | 63.5% | 49.0% | 53.7% |
| Holdout, estimated timing | 54.0% | 39.9% | 42.5% |

The smoothing rule materially reduced false-extra boundaries. On holdout songs
with estimated timing it also slightly reduced major/minor accuracy and
boundary recall, demonstrating the expected precision/recall tradeoff.

Detailed evidence is in
[`benchmarks/rwc-popular-isolated-smoothing-checkpoint.md`](./benchmarks/rwc-popular-isolated-smoothing-checkpoint.md).
The holdout has been consumed and must not be used for further tuning.

### Real screen recordings

Human review has shown that correcting timing and rerunning analysis places
changes on the corrected grid. It has also found a real recording whose chord
names remained inaccurate after corrected-timing reanalysis. Screen-recording
domain accuracy therefore remains unvalidated.

## Known limitations and likely failure modes

1. **There is always a chord.** The vocabulary has no `N`/no-chord result, so
   silence, noise, percussion-only passages, and harmonically ambiguous audio
   still receive a label.
2. **The vocabulary is narrow.** There are no slash chords, augmented chords,
   power chords, sixths, ninths, elevenths, thirteenths, altered dominants, or
   explicit enharmonic spelling strategy beyond the fixed note-name list.
3. **Confidence is not calibrated.** It is derived from the score margin and
   should not be read as a probability of correctness.
4. **Timing errors propagate.** Wrong beat windows are one of the largest
   observed causes of wrong boundaries and labels.
5. **Separation errors propagate.** Leakage or missing harmonic content in
   Demucs stems can distort root or quality evidence.
6. **Pitch evidence is approximate.** The dependency-free sinusoidal projection
   lacks the refinements of a mature chroma or transcription system and can be
   confused by overtones, tuning differences, dense mixes, melody, and
   percussion.
7. **Global key can be ambiguous.** Relative major/minor, modulation, borrowed
   harmony, and chromatic sections are reduced to one song-level key unless the
   user chooses another.
8. **Smoothing can remove a real chord.** Hidden candidates are recoverable, but
   the musician must review them.
9. **User edits do not train the analyzer.** This protects user ownership but
   means corrections do not automatically improve later imports.
10. **The benchmark is not the target capture domain.** RWC-P is mixed popular
    music, not compressed iOS screen recordings with device/app-specific audio
    paths.

## Review questions

The following questions are the most useful ones to resolve before investing in
more analyzer complexity:

1. Is a beat-aligned, editable first draft the right product target, or must
   automatic labels be substantially more accurate before user testing?
2. On representative screen recordings, are errors primarily caused by timing,
   root selection, chord quality, separation, or the limited vocabulary?
3. Are the current full-mix/stem weights directionally correct, especially the
   strong `other` and bass contributions?
4. Does hiding isolated one-beat changes make the chart easier to learn from, or
   does it remove too many musically important passing chords?
5. Should uncertain or silent passages show `N`/unknown instead of a forced
   chord?
6. Is a single global key sufficient for useful roman numerals in the songs
   selected for user tests?
7. Are users willing and able to correct the timing grid and chord chart, or is
   that workflow too much friction for the learning-value hypothesis?
8. After classifying failures on new screen-recording examples, should the next
   experiment improve the current heuristic, compare Chordino, or introduce a
   transcription/MIR model?

## Current assessment

The strategy is suitable for producing reviewable chord suggestions and for
testing the value of an editable harmonic practice view. The available evidence
does not support describing it as a reliable way to find the correct chords
automatically.

Reliable chord analysis is now a committed validation gate before unrelated
feature work resumes. The research, proposed accompaniment/bass/repetition
evidence model, locked evaluation contract, milestones, and terminal decisions
are defined in
[`research/chord-reliability-validation-plan.md`](./research/chord-reliability-validation-plan.md).
