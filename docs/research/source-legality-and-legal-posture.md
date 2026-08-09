# Research: Source Legality and Legal Posture

Date: 2026-08-08
Status: Orientation, not legal advice. Written by an AI agent, not a lawyer.
Several points below should be confirmed with a Norwegian IP lawyer before the
project takes money or hosts anything.

Scope: this note is about where the app's *input* comes from and who carries the
risk. It applies to the stored source media, the derived stems, and any lyrics —
not to lyrics alone. It grew out of the lyrics scope question in
`lyrics-transcription-options.md` but the source question turned out to be the
larger one.

---

## The position

The app is a neutral tool. The user supplies the media, the app processes it, and
the user is responsible for having the right to the material they bring. That is
the product-owner's position as of 2026-08-08, and it is a defensible one — it is
the same posture Moises operates under.

Two conditions keep it defensible. Both are cheap now and expensive later:

1. **The tool must not be presented as being for the infringing use.**
2. **It must stay non-commercial**, or the position must be re-examined with
   counsel before that changes.

Sections below explain why.

## Why the position works: the user's private copying right

Norwegian [åndsverkloven § 26](https://lovdata.no/lov/2018-06-15-40) permits
making individual copies of a published work for private use, subject to four
conditions:

- the work is published;
- the copying is not for commercial purposes;
- the source was not itself made in violation of the law;
- the copies are not used for other purposes.

Private use is not strictly solitary. It extends to the closest family and friend
circle, and to other closed circles with genuine personal connections — a band is
plausibly such a circle, though that is worth confirming rather than assuming.

A musician processing their own lawful copy on their own machine for their own
practice sits inside this. **The exception belongs to the user, not to the tool
author** — which is exactly why the neutral-tool framing matters.

Note also that the method of copying is irrelevant. OCR from video frames, ASR
over a vocal stem, and typing lyrics out by ear are the same reproduction in law.
There is no OCR exception and no transcription exception.

## Where it breaks: the source

The weakest condition is **lawful source**, and it is a screen-recording problem
rather than a lyrics problem.

Streaming platforms are the worst available source, not a safe one:

- **A licence to present is not a licence to copy.** Spotify licenses lyrics
  (via Musixmatch) and audio, so what it displays is a lawfully-made copy. That
  resolves provenance, but confers nothing on the viewer. Moises states the same
  reasoning: a subscription grants personal access to stream *within the
  platform's ecosystem*, not ownership or permission to modify.
- **Contractual exclusion.** EU law expressly recognises that agreed contractual
  terms can exclude private copying. Streaming terms prohibit recording.
- **DRM.** European law prohibits circumventing effective technological measures,
  and rightsholders may maintain them *even where a private copying exception
  exists*. The exception has never authorised defeating protection.
- **Case law direction.** German courts have held stream-ripping services illegal
  on CJEU reasoning, reaching sources including Spotify and YouTube. The CJEU
  narrowed private copying in the streaming context again in
  [C-496/24](https://ipcuria.eu/case?reference=C-496%2F24) (16 April 2026),
  though that case concerns levies on service-provided offline downloads rather
  than user-made recordings, so it is directional rather than decisive here.

Sources where the user plainly holds a lawful copy: a purchased download, a CD
rip, a recording of their own band, or stems they exported themselves.

**This makes the stem-import decision a legal improvement, not only a quality
one.** A user bringing their own Logic or LALAL stems is in a materially cleaner
position than one screen-recording a streaming service. That is a second,
independent reason to prioritise it.

## Limit 1: documented intent

Tool neutrality weakens when the tool is designed, documented, or marketed for
the infringing use. This is the live gap, and it is not technical.

Until the 2026-08-08 reframe pass, `docs/product/DESIGN_BRIEF.md` opened: *"A
pianist uploads a screen recording of a song (from YouTube, TikTok, or
similar),"* and `AGENTS.md` framed the engineering goal as selecting a screen
recording from Photos. Both now describe the input as material the user already
holds, and `AGENTS.md` instructs against building streaming acquisition. Recorded
as Decision 36.

Moises runs the same class of technology and takes the opposite posture: it
**refuses** URLs from Spotify, Apple Music, Tidal, Deezer, SoundCloud, TikTok and
YouTube, stating that extracting and modifying stems would be an unauthorised
derivative work not permitted under standard streaming licences. It accepts only
generic cloud-storage links — files the user already holds.

Same capability, opposite documented intent. Aligning the project's framing with
its actual legal position costs a paragraph of rewriting and should fold into the
band-repositioning reframe pass, which is already touching both files.

## Limit 2: commercialisation

Norwegian law restricts private copying **of musical and film works** carried out
with the assistance of a third party acting for commercial purposes. A screen
recording of a music video is plausibly both kinds of work.

- A free tool running locally: the user does the copying themselves. Not outside
  help at all.
- A commercial service performing the same operation: specifically restricted for
  this content category, regardless of what the user warrants.

So "user issue, not tool issue" is sound for the tool as built, and does not
survive the transition to a paid or hosted product. This is a sharper constraint
than the general observation that a service would need intermediary protections.

## What a commercial or hosted version would need

Moises' architecture is the template for that threshold, not for today:

| Layer | Moises |
| --- | --- |
| Acquisition | Never performs it. Refuses streaming URLs; accepts only user-held files |
| Warranty | User represents and warrants they own or license the content |
| Indemnity | User defends and indemnifies against third-party claims |
| Safe harbour | DMCA 17 U.S.C. § 512, notice-and-takedown, repeat-infringer termination |
| Lyrics | Generated by their own ASR from the user's upload — **not** licensed from a lyrics database |

The lyrics row is worth noting: the best-resourced player in this space chose
transcription-from-user-audio over database licensing. That independently
supports the tiering in `lyrics-transcription-options.md`, and makes LRCLIB the
option a commercial version would most likely have to drop.

## Consequences for the plan

- Keep the app local and single-user. This is already the architecture; it is now
  also a legal position rather than only a convenience.
- Fix the documented premise during the repositioning reframe pass. Do not
  describe the product as a workflow for capturing streaming content.
- Prioritise stem import. It is the cleanest input path on both quality and
  rights grounds.
- Prefer user-supplied or user-transcribed lyrics over a fetched database.
- Lyrics add no new category of exposure. The app already stores full copyrighted
  recordings and machine-derived stems of them; a text file is a smaller artifact
  than what is already on disk. `RISKS.md` already carries copyright as an open
  High-likelihood risk — this belongs under it, not beside it.

## For a lawyer, before money or hosting is involved

1. Does a band count as a closed circle with personal connections for private use?
2. Does screen recording a DRM-protected service constitute circumvention?
3. Does the commercial-assistance restriction reach a paid local application, or
   only a service that performs the copying?
4. Is the neutral-tool position affected by the project's documented intent, and
   is correcting the documentation sufficient?

## Sources

- [Åndsverkloven (2018)](https://lovdata.no/lov/2018-06-15-40)
- [CJEU C-496/24 Stichting de Thuiskopie](https://ipcuria.eu/case?reference=C-496%2F24)
- [Moises Terms of Service](https://help.moises.ai/hc/en-us/articles/7401394754962-Terms-of-Service)
- [Moises: why streaming URLs are not accepted](https://help.moises.ai/hc/en-us/articles/18322457396508-How-do-streaming-services-work-and-why-can-t-we-accept-their-URL-links-on-Moises)
- [Moises lyrics transcription](https://moises.ai/newsroom/product-announcements/lyrics-audio-transcription/)
- [Musixmatch AI licensing deals with publishers](https://www.musicbusinessworldwide.com/major-music-publishers-ink-ai-licensing-deals-with-lyrics-and-music-data-company-musixmatch/)
- [Radio stream ripping and EU copyright](https://www.pinsentmasons.com/out-law/analysis/copyright-rulings-radio-stream-ripping-services)
