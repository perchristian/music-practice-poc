# Lyrics Model

Status: Normative data model and delivery plan. Adopted 2026-08-14 as
`docs/planning/DECISIONS.md` Decision 45. Not yet implemented.

## The requirement

Lyrics arrive in three tiers of increasing value and cost:

1. **A note.** Lyrics stored with the song, with no relationship to the timeline
   or the chords.
2. **Distributed to bars.** Each line of lyrics belongs to a bar, so lyrics sit
   alongside the chord chart and move with it.
3. **Words on the beat.** Individual words carry musical positions and highlight
   as the song plays.

Tier 3 is the goal. Tiers 1 and 2 are shipped on the way there, and this is the
central design constraint: **all three tiers are the same data structure at
different levels of completeness.** Tier 2 does not throw away tier 1, and tier 3
does not throw away tier 2. A user who typed lyrics in the first release still
has them, and progressively places them, rather than re-entering them.

## The model

```json
"lyrics": {
  "version": 1,
  "divisionsPerQuarter": 4,
  "lines": [
    {
      "id": "ly7",
      "text": "And I would walk five hundred miles",
      "bar": 17,
      "offsetDiv": 0,
      "durationDiv": 32,
      "words": [
        { "text": "And",     "offsetDiv": 0,  "durationDiv": 2 },
        { "text": "I",       "offsetDiv": 2,  "durationDiv": 2 },
        { "text": "would",   "offsetDiv": 4,  "durationDiv": 4 }
      ]
    }
  ]
}
```

Three fields do all the work:

- **`text` alone** → tier 1. The line is real lyric content with no position.
  Rendered in a lyrics panel, in document order.
- **`bar` + `offsetDiv` present** → tier 2. The line is placed on the grid.
  Rendered in the chord chart next to the bars it covers.
- **`words[]` present** → tier 3. Each word is placed relative to the line's own
  start. Rendered with a moving highlight.

`durationDiv` is optional at every tier. When absent, a line or word extends
until the next one begins.

### Why grid positions and not seconds

This is the decision that makes the feature durable, and it mirrors what the
chord chart already does.

Positions are stored as `bar` plus `offsetDiv` — a musical location — not as a
timestamp. Seconds are *derived* at render and playback time from the song's
effective timing map, exactly as chord cues already are
(`docs/engineering/ARCHITECTURE.md`, Pipeline Strategy).

The consequence is the whole point: when the musician later corrects bar 1, fixes
a tempo drift, or changes a time signature, **the lyrics move with the music
automatically.** Under a seconds-based model, every timing correction would
silently desynchronize every lyric the user had already placed, and tier 3 would
be unmaintainable in practice — one grid fix would undo an hour of word
alignment.

`divisionsPerQuarter: 4` matches the chord chart, so a word can land on a
sixteenth note. That is finer than singers actually phrase, which is the right
side to err on.

### Structural fields

Each line may also carry, all optional:

- `sectionId` — associates the line with a Flat Section, so "verse 2" can be
  identified and, later, copied from "verse 1".
- `voice` — for backing vocals or a second singer, so they can be shown or
  hidden.
- `placement` — `"sung"` (default), `"spoken"`, `"instrumental"`, letting a line
  mark a solo or a break without pretending it is sung text.

## Rendering

| Tier | Where lyrics appear |
| --- | --- |
| 1 | A lyrics panel beside or below the practice view. Scrollable, editable, printable. |
| 2 | A lyric lane in the chord grid: each bar row shows the lyric line that starts in it. The panel remains available. |
| 3 | The same lane, with a word-level highlight tracking playback, and an optional large "performance" view for a music stand. |

The performance view is where tier 3 earns its cost: an iPad on a stand showing
chords above the words, with the current word lit, is the thing a band actually
uses at rehearsal.

## Authoring

Getting words onto beats has to be fast, or the tier-3 data will never exist.

**Entry.** Type or paste lyrics as plain text. Blank lines separate stanzas; each
non-blank line becomes a `line`. Pasting is the common case — most musicians
already have the words somewhere.

**Import.** `.lrc` files and plain text files the user already owns.
`.lrc` carries timestamps in seconds; those are converted to grid positions at
import against the song's current effective grid, and from then on they are
musical positions like everything else. Enhanced `.lrc` word-level tags map
directly to `words[]`. See Decision 45 for why online lyric services are out of
scope.

**Placing lines on bars (tier 2).** Two paths:
- *Tap-along*: play the song and press a key or tap as each line starts. The app
  quantizes each tap to the nearest beat and assigns the next line. A three-minute
  song is placed in one pass, in real time.
- *Drag*: move a line to a bar in the chord grid, with beat snapping.

**Placing words on beats (tier 3).** Same tap-along interaction at word
granularity, with a slower playback speed as the natural companion — this is one
of the few places where the existing speed control is a feature of the authoring
flow rather than of practice. Then correction by dragging individual word
boundaries. Words that were never tapped are distributed evenly across the
remaining span of their line, so a partially tapped line is still usable.

**Possible later assist:** speech recognition on the separated vocal stem to
draft lines and word timings that the user then corrects. This is attractive
precisely because correction is cheaper than authoring, and it fits the
project's existing "draft plus correction" pattern. It is not a v1 dependency,
adds a heavy ML dependency, and is parked in `docs/product/IDEAS.md`.

## Ownership and provenance

Lyrics are **entirely user-owned data**. There is no analyzer layer and no
suggestion layer, which makes lyrics simpler than chords: no immutable
provenance, no `Back to analysis`, no suppressed-candidate recovery.

If vocal-stem transcription is added later, it must adopt the chord model's
discipline — a separate immutable draft, a user-owned working copy, and no
silent overwrite — rather than editing user lyrics in place.

## Sharing

Lyrics travel in the song bundle (`docs/engineering/SONG_BUNDLE_FORMAT.md`) as
`song.json → lyrics`, or as a separate `lyrics.json` entry when large. Because
positions are musical rather than temporal, a bandmate importing a chart-only
bundle and binding it to their own copy of the recording gets correctly placed
lyrics as long as the grid binds correctly — the same condition the chords
already depend on.

## Delivery increments

Each increment is independently useful and independently shippable.

**L1 — Lyrics as a note.** Model, storage, panel, typing and pasting, import of
plain text, inclusion in the bundle, printing. Delivers real value on its own:
the words are with the song instead of in another app.

**L2 — Lines on bars.** `bar`/`offsetDiv` placement, the lyric lane in the chord
grid, tap-along line placement, drag placement, `.lrc` import at line level, and
correct behavior under timing corrections. This is the increment where the
grid-first decision pays off and must be verified: place lyrics, then change the
tempo map, and confirm the lyrics still land right.

**L3 — Words on beats.** `words[]`, word-level tap-along at reduced speed, word
boundary dragging, playback highlighting, the performance view, and enhanced
`.lrc` import.

L1 and L2 are ordinary feature work. L3 is where the interaction design matters
most and should not start before the tier-2 authoring flow has been used on a
real song by a real singer.

## Open questions

1. Melisma — one syllable held across several beats — needs either a word
   spanning a long duration or explicit syllable splitting. Duration is the
   cheaper answer and probably sufficient for a chord chart; syllable splitting
   is what notation needs and this is not notation.
2. Should repeated sections share lyrics by reference (verse 2 is verse 1 with
   different words, chorus 2 is identical to chorus 1)? Attractive for the same
   reason as chord section pooling, and it carries the same edit-scope confusion
   risk. Defer until Flat Sections prove insufficient.
3. Two singers with overlapping lines need either the `voice` field with parallel
   lanes, or a lane per voice. Model supports it; the rendering question is open.
