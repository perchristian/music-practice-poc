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

The prototype is useful for validation when a tester can compare:

- learning from the original screen recording alone
- learning from the processed practice view

The primary question is whether the AI-assisted workflow helps them learn faster or with less friction.

## Non-Goals

- Perfect stem separation.
- Perfect transcription.
- A production iOS app before the web POC proves value.
- Large-scale storage, authentication, payments, or sharing.
- Copyright automation beyond clear demo guidance and user expectations.

## First Demo Shape

The first demo should use a local web uploader and mock pipeline. Mock mode must still feel like the real flow: file selection, upload, job status, generated stems, stem mute/unmute, playback controls, loops, and harmonic metadata.
