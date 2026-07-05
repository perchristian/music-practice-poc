# VISION.md

## Product Question

Can AI transform a simple screen recording of a song into a significantly better piano learning experience?

This prototype exists to help humans evaluate that question. It should not be treated as proof that the product works until piano players have used it.

## Target User

A piano player who already learns songs from recordings, tutorials, or screen captures and wants faster access to the piano part, a way to remove the piano while practising, slower playback, loops, and harmonic cues.

## Prototype Promise

Given a user-selected screen recording, the prototype should produce a practice view where the user can:

- upload the recording
- wait through a realistic processing job
- hear separated stems for drums, bass, guitar, and piano
- mute and unmute stems, especially muting piano to play that part themselves
- change playback speed
- loop a difficult passage
- inspect approximate key, chords, roman numerals, and melody cues

## Validation Criteria

### Objective

Validate whether the app gives piano learners a significantly better way to learn new songs than their current approach.

The real baseline is not only the original recording. It is the user's existing workflow, such as Spotify, YouTube, tutorials, slowdown tools, looping, and learning by ear. The app has to clear a meaningful adoption threshold because stem separation, analysis, hosting, upload time, and learning a new tool all create cost or friction.

The primary validation question is:

> Does this workflow help piano players learn songs significantly faster, with less friction, and with a stronger sense of musical understanding than their existing approach?

### Key Results

The prototype is useful for validation when testers can show or report that:

- **Learning speed:** They can learn a selected piano passage faster with the processed practice view than with their existing workflow.
- **Perceived value:** They describe the app as a significant improvement, not merely a nice-to-have.
- **Practice usefulness:** They naturally use piano mute/unmute, slowed playback, looping, and harmonic cues while practising.
- **Motivation:** The app makes the song feel more approachable and makes them want to keep practising.
- **Empowerment:** The user feels more capable of learning the song themselves, not dependent on a tutorial or note-by-note instruction.
- **Reduced cognitive load:** The app reduces simultaneous guessing about chords, timing, voicings, song form, and tempo.
- **Aha moments:** The user discovers reusable musical patterns such as chord progressions, repeated voicings, section structure, or accompaniment figures.
- **Transferable learning:** The user becomes better able to recognize similar progressions or patterns in future songs, even without the app.
- **Error tolerance:** The experience remains useful even when stem separation, chord labels, or melody cues are imperfect.
- **Return intent:** The user would want to use the workflow on another song they care about.
- **Adoption threshold:** The improvement feels strong enough to justify uploading a recording, waiting for processing, learning a new tool, and potentially paying for analysis.

## Non-Goals

- Perfect stem separation.
- Perfect transcription.
- A production iOS app before the web POC proves value.
- Large-scale storage, authentication, payments, or sharing.
- Copyright automation beyond clear demo guidance and user expectations.

## First Demo Shape

The first demo should use a local web uploader and mock pipeline. Mock mode must still feel like the real flow: file selection, upload, job status, generated stems, stem mute/unmute, playback controls, loops, and harmonic metadata.
