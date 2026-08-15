# Vision

## Product Question

Can AI transform a recording of a song into a significantly better way for a band
member to learn their part in a cover?

This prototype exists to help humans evaluate that question. It should not be
treated as proof that the product works until musicians have used it.

## Target User

A member of a band that plays covers — keys, guitar, bass, drums, or vocals — who
already learns songs from recordings and wants faster access to their own part, a
way to remove that part while practising, slower playback, loops, and harmonic
cues.

The user brings a recording they hold, or stems they have already separated
elsewhere. See `docs/research/source-legality-and-legal-posture.md` for why the
source matters.

## Prototype Promise

Given a user-supplied recording, the prototype should produce a practice view
where the user can:

- upload the recording, or import stems they already have
- wait through a realistic processing job
- hear separated stems for drums, bass, guitar, piano, vocals, and other
- choose which part is theirs
- mute and unmute stems, especially muting their own part to play or sing it
  themselves against the rest of the arrangement
- solo any stem to hear a part they are learning
- change playback speed
- loop a difficult passage
- inspect approximate key, chords, and roman numerals

## Validation Criteria

### Objective

Validate whether the app gives band members a significantly better way to learn
their part of a cover than their current approach.

The real baseline is not only the original recording. It is the user's existing
workflow, such as Spotify, YouTube, tutorials, slowdown tools, looping, and
learning by ear. The app has to clear a meaningful adoption threshold because
stem separation, analysis, hosting, upload time, and learning a new tool all
create cost or friction.

The primary validation question is:

> Does this workflow help band members learn their parts significantly faster,
> with less friction, and with a stronger sense of musical understanding than
> their existing approach?

### Key Results

The prototype is useful for validation when testers can show or report that:

- **Learning speed:** They can learn a selected passage of their own part faster
  with the processed practice view than with their existing workflow.
- **Perceived value:** They describe the app as a significant improvement, not
  merely a nice-to-have.
- **Practice usefulness:** They naturally use mute/unmute of their own part,
  soloing to study a part, slowed playback, looping, and harmonic cues while
  practising.
- **Motivation:** The app makes the song feel more approachable and makes them
  want to keep practising.
- **Empowerment:** The user feels more capable of learning the song themselves,
  not dependent on a tutorial or note-by-note instruction.
- **Reduced cognitive load:** The app reduces simultaneous guessing about chords,
  timing, song form, and tempo.
- **Aha moments:** The user discovers reusable musical patterns such as chord
  progressions, section structure, or accompaniment figures.
- **Transferable learning:** The user becomes better able to recognize similar
  progressions or patterns in future songs, even without the app.
- **Error tolerance:** The experience remains useful even when stem separation or
  chord labels are imperfect.
- **Return intent:** The user would want to use the workflow on another song they
  care about.
- **Adoption threshold:** The improvement feels strong enough to justify supplying
  a recording, waiting for processing, learning a new tool, and potentially paying
  for analysis.

### Role coverage

Different band roles need different things from the same processed song. Current
coverage, and what each role depends on:

| Role | Depends on | Status |
| --- | --- | --- |
| Keys, guitar, bass | Chord chart, sections, own stem | Blocked by the chord-reliability gate |
| Drums | Tempo, meter, bar grid, count-in, click, sections | Served |
| Vocals | Own stem; lyrics for orientation | Practice mechanic served; lyrics now specified in `docs/engineering/LYRICS_MODEL.md`, not yet built |

## Non-Goals

- Perfect stem separation.
- Note-level transcription or notation. No role needs it: a part is learned by
  soloing its stem, and chord labels carry the harmony.
- Melody extraction. A sung or played melody is learnable by ear from the soloed
  stem; the chord chart exists because harmony is *not*.
- Note-level transcription or notation beyond the chord chart.
- A hosted service: accounts, servers operated by the project, payments, or
  storage of anyone's recordings. Assessed and declined in
  `docs/research/paid-plan-and-hosted-service-assessment.md` (Decision 49).
- Integrating with music platforms such as BandLab through their APIs. Where a
  band uses one, the app meets it at the filesystem (Decision 46).

Three capabilities left this list on 2026-08-14 at the product owner's request.
They are specified and decided, but **not scheduled** — the chord-reliability
gate still owns the execution order, and they queue behind it as BR3-BR5:

- **Band sharing** as portable song bundles plus an optional shared-folder
  transport. `docs/engineering/SONG_BUNDLE_FORMAT.md`, Decisions 44, 46, 47, 48.
- **Lyrics** in three tiers on one grid-first model.
  `docs/engineering/LYRICS_MODEL.md`, Decision 45.
- **Portability to iPad and iPhone** through shared platform-free packages rather
  than a second implementation. `docs/engineering/PORTABILITY.md`, Decision 43.
- Acting as a capture tool for streaming services. The user supplies material
  they already hold.

## First Demo Shape

The first demo should use a local web uploader and mock pipeline. Mock mode must
still feel like the real flow: file selection, upload, job status, generated
stems, stem mute/unmute and solo, playback controls, loops, and harmonic
metadata.
