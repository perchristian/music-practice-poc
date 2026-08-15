# Sharing transports and third-party music services

Status: Research input for a product-owner decision. Written 2026-08-14, after
the band-sharing format was specified in
`docs/engineering/SONG_BUNDLE_FORMAT.md` (Decision 44).

Two questions from the product owner:

1. The band has a shared folder on Google Drive or Dropbox. Can we use it?
2. Could we make use of an existing service like BandLab?

Short answers: **yes to the shared folder, and it is a significant improvement**;
**no to integrating with BandLab, but there is something better to take from it.**

---

## The principle both answers turn on

> Depend on the filesystem, not on vendors.

A shared folder from Google Drive, Dropbox, OneDrive, or iCloud appears on the
member's machine as an ordinary directory that a background client keeps in sync.
The app can read and write that directory using nothing but file I/O. No API key,
no OAuth flow, no SDK, no vendor account in our code, no network code at all —
and the band gets automatic distribution for free.

The moment we integrate with a service's *API* instead of its *filesystem*, we
acquire an account dependency, an authentication flow, a rate limit, a terms-of-
service relationship, and something that can break without notice. The folder
approach gets the benefit without any of that, and it works identically across
all four providers because none of them is involved.

---

## Question 1: The shared band folder

### Why it is a real improvement, not just a convenience

The format as specified assumes manual exchange: export a bundle, send it,
someone imports it. That works, but it depends on somebody remembering to send
and somebody remembering to import. The most likely reason band sharing fails is
not a technical fault — it is that the loop has two manual steps in it.

A watched shared folder removes both. Export writes into the folder; the sync
client distributes it; every other member's app sees it appear. That is most of
the value of a sync server, at none of the cost, and it stays consistent with
Decision 44 because the project still operates no infrastructure.

### The design problem to solve: conflicted copies

Dropbox and Drive resolve simultaneous edits to the *same file* by creating a
second file — `song (Per's conflicted copy).mpsong`. If the app modified files in
place, a band correcting the same song would litter the folder with these, and
the app would have no principled way to interpret them.

The fix is to make every write a new, uniquely named file, so two members never
write the same path and the conflict machinery never triggers.

### Proposed folder layout

```text
<Band shared folder>/music-practice/
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

Four properties do the work:

**Append-only.** Nothing is ever modified or deleted in place. Every chart
correction is a new revision file. Sync conflicts become structurally impossible
rather than handled.

**Media is written once.** It is keyed by song, not by revision. This matters
more than it looks: the audio is tens of megabytes and changes never, while the
chart is tens of kilobytes and changes constantly. Under the single-bundle model,
fixing one wrong chord and re-sharing costs a 30 MB write and a 30 MB sync for
every member. Here it costs 40 KB. Over a year of a band correcting charts, that
is the difference between a folder that works and one everybody turns off.

**Revision files are chart-only bundles.** Same schema as the chart-only tier
already specified, so one format serves both transports and there is no second
serializer to maintain.

**Resolution is explicit.** For each song the app takes the highest revision
number, breaking ties by timestamp then author. If two members genuinely wrote
revision 8, both files exist and the app surfaces the same "keep mine / take
theirs / import as a copy" choice already specified for bundle import. No silent
merge, consistent with Decision 44.

The app never deletes another member's files. Pruning old revisions is a manual,
confirmed action that keeps the newest few.

### Storage growth

Because media is written once and revisions are tiny, folder size is driven by
song count, not by editing activity. Twenty songs with full stems is roughly
600 MB encoded. That is comfortable on Google Drive's free tier (15 GB) and tight
on Dropbox's (2 GB) — worth saying in the setup documentation rather than
discovering later.

### Platform reality, stated honestly

| Platform | What works |
| --- | --- |
| macOS, Windows | Drive/Dropbox/OneDrive desktop clients present a real folder. The app can watch it and notice new revisions automatically. Full capability. |
| iPad, iPhone | The Files app exposes the same providers, and the app can read the folder through a document picker with a retained bookmark. **Background watching is not reliable**, and files may be placeholders that need downloading on demand. |
| iCloud Drive | Best integrated on Apple devices, but a band is rarely all-Apple. Support it as one provider among several, not as the assumed one. |

So iOS gets a manual "check the band folder" action rather than a promise of
automatic appearance. That is a degradation worth being explicit about now,
because it is exactly the kind of thing that gets promised in a roadmap and then
quietly fails on the device.

### Partial sync

A revision file can arrive before its media finishes syncing. The app should
treat that as the chart-only state it already supports: the song appears,
readable and editable, and becomes playable when the media lands. No error, no
blocked import.

### Recommendation

Build it as a second transport over the same format, in the same work package as
export/import. Single-file `.mpsong` bundles remain the unit for one-off
sends over AirDrop or a messaging app; the folder is the standing arrangement for
a band that has one.

---

## Question 2: BandLab and similar services

### What was checked

Searched for a public BandLab developer platform, API documentation, and SDK
(2026-08-14). Reviewed the BandLab GitHub organization, which contains internal
tooling — a Kotlin compiler plugin, an Android IntelliJ plugin, lint configs —
and forks of libraries such as FFmpeg. **No public API client, API
specification, or third-party developer SDK is published there**, and no
developer portal or API documentation surfaced. Their terms of use discuss
third-party external services generally but do not describe an API programme.

This should be treated as strong but not conclusive: the absence of a documented
public API is well evidenced, and confirming it definitively would mean asking
BandLab directly.

### Why integrating is the wrong move regardless

**No supported interface to build on.** Without a documented public API,
integration means calling private endpoints discovered by inspecting their apps.
That breaks without notice, is awkward under their terms, and is not a foundation
for something a band relies on every week.

**It reintroduces exactly what the project has deliberately avoided.** The local-first posture keeps no
accounts, no cloud service in the critical path, and no dependency on
infrastructure the project does not control. A BandLab integration is an account
dependency, an OAuth flow, and a third party who can change or withdraw the
capability.

**It would not carry our data anyway.** BandLab has no concept of a corrected
beat grid, a chord chart, or word-level lyrics. Our model would travel as an
opaque attachment inside their system — which is precisely the job a shared
folder already does, with less coupling and no account.

**Lock-in for a capability we get for free.** A free consumer platform can change
terms, gate features behind a tier, or retire an integration. A folder cannot.

The same reasoning applies to Soundtrap, Splice, and similar platforms.

### What is worth taking from BandLab — and it is genuinely valuable

**If the band records rehearsals in a DAW, they already have perfect stems.**

BandLab, Soundtrap, Logic, GarageBand, and Reaper are multitrack recorders. A
rehearsal captured in any of them has genuinely isolated tracks — a real vocal
track, a real bass track, a real keys track — with no separation artifacts,
because they were never mixed together in the first place.

That is strictly better than anything Demucs can produce from a stereo mix, and
it is available today by exporting the tracks. It reframes the parked "import
already-separated stems" idea from a convenience into a first-class import path,
and it answers two open problems at once:

- **Quality.** Separation leakage is a documented risk in
  `docs/planning/RISKS.md` and a known contributor to chord-analysis error. True
  multitrack removes it entirely for bands that record this way.
- **iPad.** The device cannot run separation. Importing real stems is the path
  that makes iPad a full authoring device rather than a consumer one.

The work is small: accept a set of audio files, let the user map each to a stem
role, and skip the separation stage. No API, no accounts, no coupling — and a
better result than our own pipeline can achieve.

### Recommendation

Do not integrate with BandLab or any similar platform. Instead:

1. Promote multitrack stem import to a scheduled capability.
2. Document the workflow — export tracks from your DAW, import them as stems —
   in the setup documentation, naming BandLab, Logic, GarageBand, and Reaper as
   examples.

---

## Summary

| Option | Verdict | Why |
| --- | --- | --- |
| Shared folder via Drive/Dropbox/OneDrive/iCloud | **Adopt** | Automatic distribution using only file I/O; no accounts, no API, no infrastructure; append-only layout makes sync conflicts structurally impossible |
| Single-file `.mpsong` bundles | **Keep** | Still the right unit for one-off sends and for bands without a shared folder |
| BandLab API integration | **Reject** | No documented public API; reintroduces account and cloud dependency; would not carry the musical model anyway |
| DAW multitrack stem import | **Adopt** | Real isolated tracks beat any separation algorithm, and it is the iPad authoring path |
| Self-hosted sync server | **Still parked** | The shared folder delivers most of its value at a fraction of the cost |

Folder coordination — who may add, remove, and edit — was settled separately
after this note was written: Decision 47, then Decision 47, which replaced the
per-session edit claim with a single durable owner per song.

## Sources

- [BandLab GitHub organization](https://github.com/bandlab)
- [BandLab Help Center](https://help.bandlab.com/hc/en-us)
- [BandLab Terms of Use](https://bandlabtechnologies.com/policies/bandlab-terms-of-use/)
- [BandLab (Wikipedia)](https://en.wikipedia.org/wiki/BandLab)
