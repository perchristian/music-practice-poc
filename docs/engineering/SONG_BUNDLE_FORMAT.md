# Song Bundle Format

Status: Normative specification for band sharing. Adopted 2026-08-14 as
`docs/planning/DECISIONS.md` Decision 44. Not yet implemented.

## What problem this solves

A band learns a song together. One member imports the recording, corrects the
beat grid, fixes the chord chart, marks the sections, and types the lyrics. That
work takes real time. Everyone else in the band should receive the result, not
repeat it.

The mechanism is a file. One song exports as one bundle; a bandmate opens it and
has the same practice view. No accounts, no server, no cloud storage, and no
dependency on the band being online at the same time. The rejected alternatives —
a self-hosted sync server, a hosted service, and local-network peer sync — are
recorded in Decision 44. Each of them can be built later *on top of this format*,
because the format, not the transport, is the hard part.

## The audio travels with the song

**The expected source is the band's own rehearsal recording, and a bundle
encloses it by default.** This is the premise the rest of the format is built on,
and it settles several questions at once.

A recipient who gets only a chart has to find their own copy of the audio, and
then the chart has to be aligned against it — which is the one part of this
format that can silently go wrong. A recipient who gets the audio has a complete,
self-contained song: it opens, it plays, it is already in time, and there is
nothing to reconcile. That is what makes the bundle worth sending.

It also removes the reason the earlier draft of this document had for defaulting
to a chart-only export. That reason was copyright caution, and it does not apply
to a recording the band made of itself. Where the source genuinely is someone
else's recording, chart-only remains available as an explicit choice — see the
tiers below.

## The folder is the model; the file is a projection

A song exists in two shapes, and they are not peers.

**The folder is canonical.** A song is a directory — locally, and in the band
folder — holding media written once and an append-only series of chart
revisions. It is the more expressive of the two: it can carry revision history,
media shared across revisions, and legitimate partial states such as "chart
present, audio still downloading".

**The `.mpsong` file is an export of it.** Zipping the folder produces a single
self-contained document, which is the right unit to hand someone over AirDrop or
a messaging app. Importing unzips it back into the library.

The relationship is deliberately one-way. Every file can be produced from a
folder; not every folder state survives being flattened into a file. Treating the
file as a second source of truth would mean two readers, two writers, and a
divergence to manage — so it is defined as a projection instead (Decision 48).

Neither shape is optional and neither can substitute for the other. Rewriting a
30 MB archive on every corrected chord would force every band member to
re-download it and would trigger the sync conflict machinery the append-only
layout exists to avoid; conversely a folder is a poor thing to send, because it
arrives piecemeal and iOS treats a directory as a directory rather than as a
document.

The local library uses the same layout as the band folder, so export is "zip this
folder" and import is "unzip into the library", with no third representation to
translate through. Local-only state — practice state, playback position, mode
flags, working files — is separated within that layout so it is never published
to the band.

## Container

A `.mpsong` file is a ZIP archive. No encryption, no password. It opens with any
unzip tool, which is a deliberate property: an open local-first format should be
inspectable and recoverable without the app that made it.

Two rules about how it is written:

- **Media entries are stored, not deflated.** The stems and mix are already AAC
  or Opus, so compressing them again gains nothing and costs CPU at both ends.
  Storing them also lets a reader pull one stem out of the archive without
  extracting the whole thing, which matters when an iPhone opens a 40 MB song.
  Deflate applies to the JSON only.
- **Identity lives inside the file, never in the path.** A folder or archive may
  be renamed by a person at any time — someone will rename `Te Amo` in the
  Dropbox web UI — so the app resolves songs by the id in `song.json` and
  tolerates a name that no longer matches.

One rule about how it is read: **the folder must be readable at every
intermediate state of syncing.** Never require a file that may not have arrived
yet. This is the general form of the partial-sync behavior described below, and
it is the constraint most likely to produce a confusing bug if it is not stated.

```text
songname.mpsong
├── bundle.json          manifest: format version, identity, contents, integrity
├── song.json            the musical work — the part that matters
├── analysis.json        immutable analyzer provenance (optional, may hold several)
├── practice.json        the sender's practice state (optional)
├── lyrics.json          lyrics, when large enough to be worth separating
└── media/
    ├── manifest.json    what audio is present and how it maps to stems
    ├── source-audio.wav or .m4a
    ├── stems/*.wav
    └── waveform.json
```

Only `bundle.json` and `song.json` are required.

## Sharing tiers

The sender chooses how much travels with the chart. The default encloses
everything the recipient needs to practise immediately.

| Tier | Contents | Typical size | When to use |
| --- | --- | --- | --- |
| **Complete** (default) | everything: `song.json`, lyrics, provenance, the recording, the waveform, and the separated stems | 25–60 MB encoded | The normal case. The recipient opens it and has the full practice view, mixer included, with nothing to re-run. |
| **Recording only** | as above without stems | 4–10 MB encoded | Constrained transport, or the recipient will separate stems themselves. Only useful to a recipient on a desktop machine — iPad and iPhone cannot separate. |
| **Chart only** | no media at all | tens of KB | The recipient already has the recording, or the source is a third-party recording rather than the band's own. Requires the binding step below. |

Complete is the default because the recipient of a rehearsal recording has no
other copy of it, and because the members most likely to be on the receiving end
are the ones on an iPad or iPhone, which cannot run separation at all. A bundle
that arrives without stems arrives without the mixer, which is most of the
product.

### Media encoding

Enclosed media is encoded, not shipped as WAV. Six lossless stems of a
four-minute rehearsal recording are roughly 250 MB; the same stems as 128 kbps
AAC or Opus are roughly 25 MB. That is the difference between a bundle a band can
actually send and one they work around, and practice playback does not need
lossless material — it is being muted, soloed, slowed, and looped, not mastered.

- Default: AAC or Opus per stem plus the mix, at a practice-appropriate bitrate.
- A lossless option remains for a sender who wants it, clearly labelled with the
  size consequence.
- `media/manifest.json` records the codec, bitrate, sample rate, and channel
  count for every entry, so the recipient's app knows what it received rather
  than inferring it from a file extension.
- The analysis audio hash in the fingerprint below refers to the sender's
  original extraction. It is metadata about provenance and is not expected to be
  reproducible from encoded media — which does not matter, because a bundle with
  media enclosed needs no binding step.

## Binding a chart to the recipient's own audio

**This section applies only to the chart-only tier.** When media is enclosed —
the default — the bundle is self-contained, the chart is already aligned to the
audio it ships with, and none of the machinery below runs.

A chart-only bundle is useless if it cannot line up with the recipient's copy of
the song. The bundle therefore records a media fingerprint:

```json
"media": {
  "durationSeconds": 214.72,
  "sampleRate": 44100,
  "sourceSha256": "…",
  "sourceFilename": "TeAmo.mov",
  "analysisAudioSha256": "…"
}
```

On import, the app tries, in order:

1. **Exact match.** A local song whose `analysisAudioSha256` matches — same
   extraction from the same file. The chart binds with confidence.
2. **Duration match.** A local song within ±0.25 s of the bundle's duration.
   Offered to the user as a probable match, with an explicit confirmation, because
   the same song from a different source will have a different offset.
3. **No match.** The song imports as a chart without audio. It is fully readable
   and editable; playback is disabled until the user attaches their own media.

Case 2 is where charts silently go wrong, so it is a confirmation and never
automatic. When the user attaches media manually, a single global offset
adjustment is offered — one number, applied to the timing map — because different
rips of the same song usually differ by a constant lead-in.

## `song.json` — the musical work

This is the existing internal model, versioned and made portable. It is the
source of truth for what the band plays.

```json
{
  "formatVersion": 1,
  "songId": "…uuid…",
  "title": "Te Amo",
  "artist": "",
  "createdAt": "2026-08-14T09:12:00Z",
  "updatedAt": "2026-08-14T09:40:00Z",
  "revision": 7,
  "author": { "name": "Per", "deviceId": "…" },
  "lineage": [ { "author": "Per", "revision": 7, "at": "…" } ],

  "grid": {
    "initialTimeSignature": "4/4",
    "gridOverrides": { "bpm": 96.5, "barOneStartSeconds": 1.84 },
    "timingMap": { "version": 2, "events": [ … ] }
  },
  "key": { "value": "Bb", "source": "user" },
  "chordChart": { "version": 1, "divisionsPerQuarter": 4, "chords": [ … ] },
  "sections": [ … ],
  "lyrics": { … },
  "media": { … fingerprint … }
}
```

Structures inside `grid`, `chordChart`, and `sections` are the shapes already
persisted in `practiceState` today, described in
`docs/engineering/ARCHITECTURE.md`. Export is a projection of existing state, not
a new model — which is exactly why `engine-core` must own the model before
sharing is built.

## `analysis.json` — provenance, not truth

The immutable analyzer output travels with the song so the recipient can see what
was suggested, restore a suppressed chord candidate, or run `Back to analysis`.
It never overrides the sender's corrections. It carries the analyzer identity
(name, version, settings) so a recipient using a different engine can tell the
two apart.

Analyzer provenance is dropped from chart-only bundles when the media is absent
and the provenance would be misleading — a suggestion layer with no audio behind
it invites a `Back to analysis` that destroys work and restores nothing playable.

## `practice.json` — the sender's private state

Mute/solo, per-stem volume, playback speed, loop points, last position, learning
status. Included by default because "here is the loop of the bridge I struggled
with" is genuinely useful to a bandmate, and stripped when the sender opts out.

On import it is applied only to a **new** song. It never overwrites the
recipient's own practice state on an update.

## Import semantics

The rule: **an import never silently destroys local work.**

| Situation | Behavior |
| --- | --- |
| No local song with this `songId` | Import as a new song. |
| Local song exists, bundle `revision` is higher, local song unmodified since last import | Update in place. |
| Local song exists and has local edits | Present a choice: keep mine, take theirs, or import as a separate copy. Never merge automatically. |
| Bundle `formatVersion` is older | Migrate forward on import. |
| Bundle `formatVersion` is newer | Refuse with a clear message naming the required app version. Do not partially import. |

There is no automatic merge and no conflict-free replicated data type. A band of
four people exchanging files does not need distributed-systems machinery; it
needs to never lose an evening's work. Last-writer-wins with an explicit human
choice is the correct amount of mechanism here, and Decision 44 records that as a
deliberate limit rather than an oversight.

## Versioning and compatibility

- `formatVersion` is a single integer for the whole bundle. It increments on any
  breaking change.
- Every increment ships with a forward migration in `engine-core`, covered by a
  fixture bundle committed to the repository.
- Unknown fields are preserved on import and re-emitted on export, so a song that
  round-trips through an older app version does not lose newer data it did not
  understand.
- Once this format is released, data created with it is migrated rather than
  discarded. The prototype-era practice of dropping disposable runtime jobs
  applies to pre-format local jobs only; a shared bundle is another band member's
  work and cannot be treated that way.

## Security posture

A bundle is untrusted input from another person's machine.

- Reject archives with absolute paths, `..` traversal, or symlinks.
- Enforce an entry-count limit and an uncompressed-size limit; refuse a bundle
  whose compression ratio indicates a zip bomb.
- Validate `song.json` against a schema before applying any of it; a malformed
  bundle imports nothing rather than half a song.
- Never execute anything from a bundle. There is no scripting, no plug-in code,
  and no analyzer binary inside the format, and there never will be.
- Media files are treated as opaque bytes and are decoded by the platform decoder
  under the same constraints as any user-selected file.

## Transport

Out of scope for the format, deliberately. AirDrop, a shared folder, a messaging
app, and a USB stick all carry a complete bundle without difficulty. Email is the
one common route that does not — most providers cap attachments around 25 MB, so
a complete bundle will often exceed it. The export UI should show the resulting
size before the file is written, so the sender picks a tier knowing what it
costs rather than discovering it when the send fails.

If a sync server is added later it moves these same bundles.

## Band folder mode

A band that keeps a shared folder on Google Drive, Dropbox, OneDrive, or iCloud
already has distribution. That folder appears on each member's machine as an
ordinary directory kept in sync by a background client, so the app can use it
with nothing but file I/O — no API key, no OAuth, no SDK, no vendor account in
the code, and no network code at all.

This is a second transport over the same format, not a second format. The
reasoning and the rejected alternatives are in
`docs/research/sharing-transports-and-third-party-services.md` and Decision 46.

### Layout

```text
<band shared folder>/music-practice/
  songs/
    <songId>/
      media/
        manifest.json
        source.m4a
        stems/vocals.m4a, bass.m4a, drums.m4a, ...
        waveform.json
      revisions/
        0007--per--2026-08-14T09-40-12Z.mpchart
        0008--kari--2026-08-15T18-02-55Z.mpchart
  index.json          regenerated cache, never authoritative
```

### Rules

**Append-only.** Nothing is ever modified or deleted in place. Every chart
correction writes a new revision file with a unique name. This is not tidiness —
it is what prevents the conflicted-copy files that Dropbox and Drive create when
two people modify the same path. Two members never write the same file, so the
conflict machinery never runs.

**Media is written once**, keyed by song rather than by revision. The audio is
tens of megabytes and never changes; the chart is tens of kilobytes and changes
constantly. Re-sharing a corrected chart therefore costs a 40 KB write rather
than a 30 MB one, for every member, every time.

**A revision file is a chart-only bundle** (`.mpchart`), byte-identical in schema
to the chart-only tier above. One serializer serves both transports.

**Resolution is explicit.** The app takes the highest revision number per song,
breaking ties by timestamp and then by author. If two members genuinely produced
the same revision number, both files exist and the user gets the same
keep-mine / take-theirs / import-a-copy choice as a bundle import. Nothing merges
silently.

**The app never deletes another member's files.** Pruning old revisions is a
manual, confirmed action that retains the newest few.

**Partial sync is a normal state.** A revision can arrive before its media
finishes downloading. That is the chart-without-media state the format already
supports: the song appears, readable and editable, and becomes playable when the
media lands. It is not an error and does not block the import.

### Platform reality

| Platform | Behavior |
| --- | --- |
| macOS, Windows | The sync client presents a real directory. The app watches it and notices new revisions automatically. |
| iPad, iPhone | Readable through the Files app with a retained security-scoped bookmark, but **background watching is not reliable** and files may be placeholders needing on-demand download. iOS gets a manual "check the band folder" action instead of automatic appearance. |

Do not promise automatic folder sync on iOS. The capability declaration
(`docs/engineering/PORTABILITY.md` R5) is the mechanism for expressing this
difference.

### Storage growth

Because media is written once and revisions are tiny, folder size follows song
count rather than editing activity. Twenty songs with full stems is roughly
600 MB encoded — comfortable on Drive's free tier, tight on Dropbox's. Say so in
the setup documentation rather than letting a band discover it.

### Who can do what

There are no roles, no admin, and no permissions. A band is a group of peers, and
there is no authentication to build permissions on top of — the author name in a
revision is a label the member typed, not a verified identity. Everything below
is **coordination, not access control**. It exists to stop people colliding by
accident, which is the actual problem, and it makes no attempt to stop anyone
determined.

| Action | Who | Mechanism |
| --- | --- | --- |
| Add a song | Anyone, always | A new song id cannot collide with anything. The member who adds it becomes its owner. |
| Practise, play, follow the chart | Anyone, always | Reading is never blocked. |
| Edit the band's copy of a song | The owner | Ownership, described below. |
| Edit my own copy | Anyone, always | Local. Can be sent to the owner as a suggestion. |
| Transfer ownership | The owner | One recorded action. |
| Take ownership | Anyone | Deliberate, attributed, and visible to the band. |
| Remove from my library | Anyone, always | Local only. Nobody else is affected. |
| Remove from the band folder | The owner | A tombstone revision, attributed and reversible. |

### Ownership

**Every song has one owner, and only the owner's edits are published to the band
folder.** The owner is the member who added the song, recorded in the song record
and shown wherever the song appears. Ownership is durable: it does not expire, it
does not need renewing, and it does not have to be acquired before each editing
session.

```json
"owner": { "name": "Kari", "memberId": "…", "since": "2026-08-14T09:12:00Z" }
```

Two properties make this better than a per-session lock, and both are worth
stating because they are the reason for the choice:

**It races almost never.** A lock is acquired and released every editing session,
so it meets the sync propagation window constantly. Ownership changes perhaps
once in a song's life. The same unavoidable weakness — a synced folder has no
atomic compare-and-swap — is met a handful of times instead of hundreds.

**It is evaluable offline.** Ownership is already in the song record on the
member's device, so the app knows who owns a song in a rehearsal room with no
network. A lock has to be reached for, which is exactly where it fails.

#### Transfer and takeover

The owner can **transfer** ownership to another member: one action, recorded as a
revision event.

Any member can also **take** ownership. This is deliberate, attributed, and
visible to the band — not silent, and not a background side effect of editing. It
exists because the alternative is a band held hostage by one member's holiday, a
dead laptop, or a departure. Without a takeover path, "only the owner may modify"
eventually means "nobody may modify".

#### What a non-owner can do

The rule governs **what gets published to the band, not what a musician may do to
their own chart.**

A non-owner who spots a wrong chord during rehearsal can fix it immediately. The
edit is local and stays local — it is never written into the band folder behind
the owner's back. From there they can:

- keep it as their own copy, diverging from the band's version deliberately;
- **send it to the owner as a suggestion** — the same small chart-only revision
  file, marked as a suggestion, which the owner reviews and accepts or discards;
- take ownership, if they are the one who is going to maintain the song.

The suggestion path matters. Without it, "I found a mistake in the chart" has
nowhere to go except a message to another human, and the fix gets lost. With it,
the correction travels in the format the app already speaks.

#### Enforcement, honestly

Ownership is a **convention the app honors, not a permission it enforces.** There
is no authentication here; `memberId` is generated on first run and the name is
whatever the member typed. Anyone editing the files directly, or running a
modified build, can write whatever they like.

That is acceptable because this is a band, not a security boundary. What the
model provides is clarity — everyone knows who is maintaining a song — and
attribution, so that anything unexpected is traceable rather than anonymous.

#### The safety net stays

The append-only revision log and the explicit keep-mine / take-theirs / keep-both
choice remain, unchanged. Ownership makes collisions rare; it does not make them
impossible. Two members can still take ownership within the same sync window, and
one owner can still edit on two devices while offline. When that happens, both
revisions exist and the member chooses.

**Never build an ownership rule that loses data when it is circumvented.**

Ownership exists only in band folder mode. A member working locally, or a band
exchanging single bundles, never sees any of it — a bundle records who last owned
the song, and importing it does not transfer ownership of anything.

### Removal

Two different actions that are easy to confuse, and expensive to confuse.

**Remove from my library** is local. It affects one member's own copy, is always
allowed, needs no coordination, and is what a member usually means. It does not
touch the band folder.

**Remove from the band folder** affects everyone, so it follows the same rule as
any other modification: **the owner does it.** A non-owner who believes a song
should go either asks the owner or takes ownership first, which leaves a record
of who removed it and why they were able to.

It is a **tombstone**, not a deletion: a revision event recording that the song
was removed, by whom, and when. Members' apps hide the song; the bytes remain for
a grace period and the removal can be undone.

Two reasons this is not merely politeness. First, a plain delete destroys work
that somebody else may have spent an evening on, with no undo inside the app and
inconsistent trash behavior across sync providers. Second, and more practically,
**deletion does not propagate reliably in a synced folder** — a member who was
offline when the delete happened can resurrect the files by syncing back. A
tombstone is a fact that travels like any other revision, so it survives.

Media for a tombstoned song is pruned only by the same manual, confirmed action
that prunes old revisions.

## Open questions

1. Should a chart-only bundle include a low-resolution waveform so the timeline
   renders before media is attached? Cheap, and probably yes.
2. Does the band want a "song pack" — several songs in one file for a setlist?
   Likely, and it is a wrapper around this format rather than a change to it.
   Size makes it more pressing than it first appears: five complete songs is a
   quarter of a gigabyte, which may argue for a pack that references bundles
   rather than containing them.
3. Should a recipient be able to re-run separation locally to replace encoded
   stems with lossless ones, if they have the desktop app and care? Cheap to
   allow, and it keeps the encoding decision from being permanent.
