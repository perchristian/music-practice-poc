# Chord Reliability Research and Validation Plan

Date: 2026-07-23

## Decision summary

Reliable chord analysis is a core capability of the music-learning hypothesis,
alongside useful stem separation. The current analyzer is not yet reliable enough
to treat its charts as a validated input to user testing.

The project will therefore pause unrelated feature development and run a bounded
Chord Reliability Validation Gate. The gate will:

1. establish a target-domain baseline that separates timing errors from harmony
   errors;
2. make per-stem musical evidence inspectable;
3. test accompaniment-first analysis and melody suppression;
4. add reliability-gated bass evidence, including recordings without a dedicated
   bass instrument;
5. reduce the effect of ornaments and short melodic tones on chord labels;
6. test repeated-section evidence pooling with known section groups before
   considering automatic repeat detection;
7. decide whether the lightweight analyzer is good enough, needs an external
   chord engine, or cannot support the product hypothesis at acceptable cost.

This is a validation program, not an open-ended attempt to perfect automatic
chord recognition.

## Why this is now the highest-priority gate

The product asks whether an AI-assisted workflow helps a musician learn a piano
part faster. Isolated stems provide the play-along arrangement, but an unreliable
harmonic chart can slow learning, create doubt, or teach the wrong progression.
The editable working chart limits the damage but transfers analysis work to the
learner.

Current evidence is insufficient:

- the consumed RWC-P holdout reached only 49.0% major/minor weighted chord symbol
  recall with reference timing and 39.9% with analyzer timing;
- human review found inaccurate chord names on `ShapeOfMyHeart manually
  adjusted` even after timing was corrected;
- the RWC-P checkpoint primarily measures full-mix analysis and does not validate
  the exact Demucs-weighted screen-recording path;
- screen-recording compression, stem leakage, missing instruments, melody-heavy
  arrangements, ornaments, and repeated-section inconsistency remain open.

The next useful learning outcome is therefore not another interface feature. It
is evidence that an imported song receives a sufficiently accurate, consistent,
and quickly correctable chord chart.

## Current analyzer behavior relevant to the proposal

The current implementation in `server.js`:

- excludes `vocals` and `drums` from direct stem-specific harmonic evidence;
- still includes vocals and melody through the full-mix contribution;
- gives `other` the largest harmonic stem weight;
- uses a dedicated `bass` stem plus low-frequency full-mix evidence for root
  support;
- peak-normalizes each stem chroma before applying fixed weights;
- scores one chord candidate per beat against a fixed template vocabulary;
- applies only an isolated `A-B-A` one-beat smoothing rule;
- does not detect or pool repeated verses, choruses, or other section instances.

Consequences:

- vocal leakage or a lead instrument in `other` can influence the chord strongly;
- a quiet but non-silent stem can become influential after peak normalization;
- a recording without a dedicated bass instrument loses strong low-register
  context even when a piano or guitar supplies a functional bass line;
- a passing bass note can be mistaken for root evidence;
- ornaments and short melody notes are accumulated with stable comp tones;
- repeated sections are interpreted independently and may receive different
  progressions.

## Research findings

### 1. Melody and vocals should not be primary chord evidence

Rao, Guan, and Teng separated singing voice before calculating pitch-class
profiles and reported better chord-recognition results than without vocal
separation. Their motivation matches the observed failure: melody adds pitched
content that is not necessarily part of the accompaniment chord.

Source:
[Chord Recognition Based on Temporal Correlation Support Vector Machine](https://doi.org/10.3390/app6050157)

A 2026 source-separation/remix study reports that dynamically attenuating
non-chordal sources such as vocals and drums improved a transformer chord
recognizer across its reported metrics. This supports adaptive weighting rather
than assuming every separated source is equally useful.

Source:
[Improvement of Musical Chord Recognition Accuracy Using Source Separation and Remix Models](https://doi.org/10.1007/978-3-032-30573-2_24)

Interpretation for this POC:

- exclude the vocal stem from initial chord scoring;
- reduce or remove full-mix harmonic evidence when reliable accompaniment stems
  exist;
- treat melody-like stems as contextual evidence after the primary candidate is
  chosen;
- never allow melody evidence alone to introduce a chord boundary;
- retain the full mix as a fallback because separation can remove useful harmony.

### 2. Bass is valuable evidence but not identical to the root

Chord-recognition research commonly models bass separately from general
pitch-class content. Segment-level work distinguishes whether the lowest note is
the candidate chord's root, third, fifth, or a dissonance; a non-root bass may
represent an inversion rather than a different chord.

Source:
[Chord Recognition in Symbolic Music: A Segmental CRF Model](https://doi.org/10.5334/tismir.18)

Research on pitch representation also identifies bass as a special harmonic
dimension rather than folding register away entirely.

Source:
[Not All Roads Lead to Rome: Pitch Representation and Model Architecture for Automatic Harmonic Analysis](https://doi.org/10.5334/tismir.45)

Interpretation for this POC:

- first assess whether the dedicated bass stem has reliable pitched low-register
  content;
- when it does not, derive bass candidates from the lowest reliable notes in
  piano, guitar, accompaniment, and `other`;
- exclude vocals, drums, and melody-like stems from the default fallback;
- use low-note persistence, harmonic salience, and pitch confidence rather than
  the lowest instantaneous spectral bin;
- treat the bass candidate as root preference and inversion/chord-tone evidence,
  not as a forced root;
- reduce bass influence when no reliable candidate exists.

This supports piano-and-vocal, guitar-and-vocal, and other mixes without a
dedicated bass instrument.

### 3. Stable segment evidence is more useful than every observed note

Segmental chord-recognition research uses chord coverage, segment purity,
duration-weighted features, metrical position, and context because individual
events may be non-chord tones. A single low or doubled note need not define a
new chord.

Sources:

- [Chord Recognition in Symbolic Music: A Segmental CRF Model](https://doi.org/10.5334/tismir.18)
- [Chord Recognition Using Duration-Explicit Hidden Markov Models](https://archives.ismir.net/ismir2012/paper/000445.pdf)

Interpretation for this POC:

- split each beat window into smaller subframes;
- measure how long each pitch class persists;
- give stable simultaneous comp tones more weight than brief ornaments;
- model chordality or polyphony separately from monophonic melodic motion;
- retain metrical evidence so a real short chord on an accented beat is not
  automatically discarded;
- use robust aggregation such as a median or trimmed mean where practical.

The intent is not to remove every decoration. It is to stop a brief fill, grace
note, passing tone, or melody note from outweighing the stable accompaniment.

### 4. Repeated sections can improve chord consistency and accuracy

Mauch, Noland, and Dixon aligned beat-synchronous chroma across repeated section
instances and inferred one shared chord sequence from the combined evidence.
They specifically observed that melody differences between repeated sections
caused false chord fragments in independent analysis. Automatic segmentation
improved accuracy on 74% of their 125-song corpus, and the segmentation-aware
methods significantly outperformed the no-segmentation baseline.

Source:
[Using Musical Structure to Enhance Automatic Chord Transcription](https://archives.ismir.net/ismir2009/paper/000076.pdf)

Repeated structure can be found through diagonal patterns in a self-similarity
matrix derived from harmonic and timbral features.

Sources:

- [Analyzing Song Structure with Spectral Clustering](https://archives.ismir.net/ismir2014/paper/000319.pdf)
- [Audio-Based Music Structure Analysis: Current Trends, Open Challenges, and Applications](https://doi.org/10.5334/tismir.54)

Interpretation for this POC:

- pool underlying evidence across aligned repeats rather than copying the first
  section's chord labels;
- test manually supplied repeat groups before implementing automatic detection;
- use median or trimmed pooling to reduce the chance that one varied occurrence
  corrupts all repeats;
- preserve strongly supported local variations, extensions, pickups, altered
  endings, and transposed sections;
- make automatic repeat groups suggestions or provenance, not silent user state.

## Proposed evidence model

The analyzer should progress from fixed stem-name weights to a small
role-and-reliability model:

| Evidence | Role | Default treatment |
| --- | --- | --- |
| Stable piano, guitar, accompaniment, or harmonic `other` tones | Chord quality | Highest primary weight |
| Reliable dedicated bass | Bass/root and inversion context | Strong separate evidence |
| Lowest reliable note from a comp stem | Bass fallback | Confidence-weighted separate evidence |
| Lead vocal or melody-like stem | Melodic context | Excluded from primary scoring; optional weak tie-break/context |
| Full mix | Safety fallback | Low weight when stems are reliable; higher only when they are unavailable |
| Drums/percussive energy | Timing | Excluded from chord quality |
| Brief ornaments and passing notes | Local decoration | Down-weighted by persistence and metrical context |
| Aligned repeated-section evidence | Long-range context | Robustly pooled before final scoring |

Stem names remain priors, not truth. A piano may play melody, an `other` stem may
contain stable strings, and a bass stem may be empty or unreliable.

## Hypotheses

### H1: Accompaniment-first evidence

Removing direct vocal evidence and reducing full-mix influence when comp stems
are reliable will reduce false chord changes without materially increasing
missing changes.

### H2: Reliability-gated bass fallback

Using the lowest reliable persistent note from non-melodic comp stems when the
dedicated bass is absent or unreliable will improve root recognition on
no-bass-instrument mixes without forcing inversions into incorrect roots.

### H3: Ornament-resistant comp evidence

Persistence-weighted subframe aggregation will reduce wrong qualities and
one-beat chord fragments caused by fills, passing notes, grace notes, and melodic
movement.

### H4: Repetition-aware evidence pooling

Robustly pooling aligned evidence from known repeated section instances will
improve accuracy and consistency while a local residual rule preserves genuine
variations.

### H5: Automatic repetition is worth building only after H4 passes

Automatic repeat detection will be scheduled only if correct/manual repeat
groups materially improve this analyzer. This avoids implementing a second
uncertain subsystem before proving its downstream value.

## Evaluation contract

### Keep timing and harmony separable

Every evaluation must report:

1. **Reference/corrected timing:** measures chord evidence, root, quality, and
   sequence behavior without timing errors dominating.
2. **End-to-end timing:** measures what a user receives before correction.

The harmony gate is primarily judged with reference or user-corrected timing.
End-to-end timing remains a required product metric, but it must not obscure
whether a harmony experiment worked.

### Locked data

Milestone 0 must lock, checksum, and document:

- a new RWC-P development/holdout split that excludes the consumed Phase 2J
  pilot from tuning;
- a small target-domain set of legally held iOS screen recordings with
  independently reviewed timing, chord, and section references;
- at least one full-band mix with bass;
- at least one piano-and-vocal or guitar-and-vocal mix without dedicated bass;
- at least one melody- or ornament-heavy arrangement;
- at least one song with repeated sections and one legitimate repeated-section
  variation;
- generated diagnostic fixtures for isolated failure mechanisms.

Corpus media and detailed run artifacts remain outside Git. Manifests, fixture
generators, evaluator code, checksums, aggregate results, and conclusions remain
version-controlled.

The first RWC-P holdout is consumed and must never become a tuning set.

### Required metrics

Report at least:

- Root, MajMin, Triads, and MIREX WCSR;
- boundary precision, recall, and F1 at the existing 250 ms tolerance;
- false-extra and missing boundaries;
- chord changes per minute and suppressed-candidate count;
- per-track results and largest regressions;
- results grouped by bass/no-bass, melody prominence, ornament density, and
  repeated-section presence;
- repeated-section disagreement rate after excluding annotated variations;
- false forced-equality count for legitimate repeat variations;
- analyzer runtime and peak-memory estimate;
- musician correction burden on target recordings.

### Provisional “good enough” gate

Milestone 0 must review and lock the final thresholds before analyzer changes.
The starting proposal for the target-domain holdout with reference/corrected
timing is:

- Root WCSR at least 80%;
- MajMin WCSR at least 70%;
- boundary F1 at least 65%;
- no defined scenario group below 55% MajMin WCSR;
- repeated-section disagreement at most 10% after excluding documented
  variations;
- no material increase in missing true chord changes compared with the locked
  baseline;
- a musician can correct a representative three-minute chart in at most five
  minutes and rates it usable as a learning first draft without checking every
  beat;
- every retained experiment improves a majority of development tracks and does
  not regress the untouched holdout by more than the precommitted tolerance.

These are POC usability gates, not claims of production-grade transcription.
They may be changed only before the new baseline is inspected, with the reason
recorded.

## Milestones

### Milestone 0: Lock the validation contract

Outcome:
- fixed data manifest, scenario taxonomy, reference process, metrics, thresholds,
  and artifact locations.

Exit criteria:
- no analyzer behavior has changed;
- the new development/holdout split is immutable;
- target recordings cover the required scenarios;
- references are independently reviewed;
- baseline and gate commands are reproducible;
- no benchmark run creates application library jobs.

### Milestone 1: Inspectable baseline and known-answer fixtures

Outcome:
- per-beat, per-source diagnostic evidence without changing public chord output;
- generated fixtures for vocal melody, missing bass, piano/guitar bass fallback,
  ornaments, repeated accompaniment with different melody, and a legitimate
  repeat variation;
- current production path benchmarked with and without real Demucs stems.

Exit criteria:
- current output is byte-for-byte or semantically unchanged;
- diagnostics identify why a candidate wins;
- every fixture reproduces its intended failure or control;
- baseline results and dominant error classes are reviewed before tuning.

Status: Passed on 2026-08-10. Opt-in diagnostics, six generated scenarios,
semantic output comparison, and full-mix plus Demucs-assisted development
baselines are recorded in
`benchmarks/chord-reliability-cr1-checkpoint.md`. The holdout was not opened.

### Milestone 2: Accompaniment-first analysis

Outcome:
- vocals and melody-like sources cannot independently drive chord labels or
  boundaries;
- full-mix evidence becomes reliability-gated fallback/corroboration;
- stable comp instruments provide primary chord-quality evidence.

Exit criteria:
- H1 passes its precommitted development gate;
- false-extra changes fall on melody-heavy fixtures and recordings;
- missing-change regressions remain within tolerance;
- a retained change passes untouched holdout and screen-recording review.

If two focused variants fail the same error class, stop local weight tuning and
compare an external analyzer through the same evaluator.

Status: Escape rule triggered on 2026-08-10. Both accompaniment-first variants
fixed the generated vocal control but regressed locked RWC-P development.
Chordino materially outperformed the local baseline through the same evaluator
and is the CR2E replacement candidate. The RWC holdout remains unopened; its
guarded run is ready in issue #10 after issue #8 approval. See
`benchmarks/chord-reliability-cr2-checkpoint.md`.

### Milestone 3: Bass fallback and ornament resistance

Outcome:
- dedicated bass is used only when reliable;
- lowest reliable persistent comp notes provide bass context when no bass
  instrument exists;
- inversions remain chord-tone evidence rather than forced roots;
- stable comp tones outweigh brief ornaments.

Exit criteria:
- H2 and H3 each pass independently before combination;
- no-bass fixtures and recordings improve without bass-present regression beyond
  tolerance;
- inversion controls retain the correct root;
- ornament-heavy false changes fall without deleting genuine short chords;
- combined evidence passes holdout and target-domain review.

### Milestone 4: Repetition-aware analysis with known groups

Outcome:
- corresponding beats from manually/reference-grouped repeated sections pool
  their raw evidence robustly;
- a shared baseline progression is produced;
- strongly supported per-instance variations remain distinct.

Exit criteria:
- H4 improves accuracy or correction burden on a majority of repeated-section
  development tracks;
- repeat disagreement meets the locked target;
- legitimate-variation fixtures are not forced equal;
- untouched holdout remains within tolerance.

Failure ends repetition work for this POC. It does not trigger automatic section
detection.

### Milestone 5: Automatic repeat suggestions

Entry condition:
- Milestone 4 passed.

Outcome:
- accompaniment-based self-similarity proposes equal-length repeated groups;
- confidence and provenance are inspectable;
- proposals never mutate user-owned Flat Sections or chord charts silently.

Exit criteria:
- automatic groups preserve most of the known-group benefit;
- false groupings and missed variations stay within precommitted limits;
- user confirmation is practical on representative songs.

### Milestone 6: Integrated chord-reliability checkpoint

Outcome:
- the best independently validated evidence changes run together;
- final target-domain holdout, runtime, correction, and human-review results are
  recorded;
- the project makes a go/adjust/replace/stop decision.

Decisions:

- **GO:** gate passes; declare chords good enough for piano-player testing and
  resume the groomed product backlog.
- **ADJUST ONCE:** one clearly isolated failure remains and a bounded experiment
  is justified by the error analysis.
- **COMPARE/REPLACE:** two local attempts fail the same class; compare Chordino or
  another external engine through the same evaluator rather than continuing
  heuristic tuning.
- **STOP/REFRAME:** no approach reaches a useful correctable chart at acceptable
  cost; revisit whether manual/imported chord charts are required for user
  testing or whether the product hypothesis should narrow.

## Non-goals during the gate

- broad chord vocabulary expansion;
- melody transcription or notation;
- training on user chord edits;
- automatic mutation of user-owned timing, sections, or chord charts;
- a general linked-section editing model;
- indefinite analyzer tuning;
- unrelated transport, timeline, chord-selection, or section-polish work unless
  required to run or review the validation gate;
- claiming that benchmark success validates product value.

## Reproducibility

The research and plan do not depend on a Codex skill or hidden agent state.
Required code, fixtures, manifests, commands, metrics, aggregate results, and
decisions must be committed. Licensed corpora, commercial recordings, and
detailed derived audio remain outside Git with documented paths and checksums.
