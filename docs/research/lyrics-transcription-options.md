# Research: Options for Lyrics From the Vocal Stem

Date: 2026-08-08
Status: Research only. No option selected, nothing implemented.

Context: the vocal role entered scope on 2026-08-08 and needs a vocal stem plus
lyrics, not melody notation
(`docs/research/band-practice-repositioning-review.md`, Finding 5). This note
surveys how the lyrics could be produced.

Source caveat: `arxiv.org`, `huggingface.co`, and `audioshake.ai` are blocked by
this environment's egress proxy. Primary papers could not be read directly.
Numbers below come from search-result summaries and from repository READMEs
fetched via `raw.githubusercontent.com`, and are marked where confidence is
lower. Treat the specific WER figures as indicative, not audited.

---

## Headline

Transcribing lyrics from audio is a *bad* problem. Aligning known lyrics to audio
is a *good* one. The strongest options therefore avoid transcription wherever
possible, and the tiering that follows from that maps precisely onto the chord
architecture this project already has.

Open-source ASR on singing runs around 28-33% word error rate. That is roughly
one word in three or four wrong — unusable as a lyric sheet a singer reads while
performing. Every production karaoke tool surveyed here reaches usable quality
the same way: get the true words from somewhere else, and use audio only to
work out *when* each word happens.

---

## Option 1: Fetch already-synced lyrics (LRCLIB)

[LRCLIB](https://www.lrclib.net/) is a free, open, MIT-licensed lyrics service
with roughly 3 million records, no API key and no registration. It returns both
plain and synced (LRC) lyrics, and matches on track duration within about ±2
seconds.

Why it fits this project unusually well: the product is now explicitly about
**covers**. Covers are popular songs, and popular songs are exactly where a
crowd-sourced lyrics database has coverage. When LRCLIB has a synced entry, the
result needs no ML at all — no ASR, no alignment, no Torch, no added processing
time.

Blockers:

- **Song identity does not exist in the app.** Jobs are named from
  screen-recording filenames (`MakeYouFeelMyLovePart2.mov`). LRCLIB needs
  artist and title. Either the user types them, or the app adds acoustic
  fingerprinting (AcoustID/Chromaprint) to derive them. User-entered metadata is
  the cheap answer and is probably worth having regardless.
- **Coverage is not guaranteed**, and synced coverage is thinner than plain-text
  coverage. This has to degrade to another option, not fail.
- **MIT-licensed service is not licensed lyrics.** The software and API are
  MIT; the lyrics themselves are user-contributed reproductions of copyrighted
  works. "It's free and open" resolves the cost question, not the rights
  question.

Effort: low. A fetch, a duration match, and a parser for the LRC format.

## Option 2: User supplies the lyrics, app aligns them

The user pastes or uploads the lyrics text; the app force-aligns that text
against the isolated vocal stem to produce timings.

This is the option that best fits the project's established philosophy. It is the
same contract as the chord chart — the user owns the content, the analysis
supplies only the mechanical part — and it is the same contract as the stem
import decision made on 2026-08-08, where the user supplies better material than
the pipeline can generate. It sidesteps both the ASR accuracy problem and the
lyrics sourcing problem in one move.

Forced alignment is a genuinely easier task than transcription, because the
answer to "what words" is already fixed and only "when" is unknown. Available
approaches:

- **WhisperX** — runs a wav2vec2 phoneme model over the audio to refine Whisper's
  timings. The de-facto default; used by the Nightingale karaoke app. Note an
  open issue reporting its word timestamps as less accurate than the Montreal
  Forced Aligner.
- **torchaudio `forced_align`** — GPU/Apple Silicon capable, offered by
  Nightingale as a faster alternative backend.
- **whisper-timestamped** — DTW over Whisper's decoder cross-attention.
- **CrisperWhisper** — tokenizer changes that reportedly improve DTW-derived word
  timestamps.

Effort: medium. A text input surface, an alignment step, and a timing model.

## Option 3: ASR over the separated vocal stem

The fallback when neither the database nor the user provides text.

Accuracy, on the Jam-ALT benchmark (indicative figures):

| System | WER | Notes |
| --- | --- | --- |
| Whisper large-v2 | ~27.9% | |
| Whisper large-v3 | ~32.6% | **Worse than v2.** Whisper behaves erratically on music; neither version consistently wins |
| LyricWhiz | better than plain Whisper | Whisper as the "ear", GPT-4 as the "brain" for selection/correction |
| AudioShake (commercial) | ~57% lower than Whisper v2 → ~12% | Best on all Jam-ALT metrics by a large margin |

The v3-is-worse-than-v2 result is worth internalizing: newer is not better here,
and this is not a domain where the default choice is obvious.

**Source separation helps, and this project already has it.** The ICME 2025
AI4Music paper *Exploiting Music Source Separation for Automatic Lyrics
Transcription with Whisper* ([code](https://github.com/jaza-syed/mss-alt))
reports state-of-the-art open-source results on Jam-ALT with **no training or
fine-tuning**, using two ideas: concatenating separated segments for short-form
audio, and using source separation as a vocal activity detector to derive segment
boundaries for long-form audio. Its pipeline is Demucs → vocals → Whisper, which
is this project's existing pipeline plus one step. The repo's module layout
(`separate` using Demucs models, `infer` containing the RMS-VAD) confirms the
shape; the paper itself could not be read here.

The practical consequence: the marginal cost of adding ALT to this app is the
ASR step alone. Separation is already paid for.

## Option 4: OCR from the screen recording

Screen recordings are the product's defining input, and many sources display
synchronized lyrics on screen. `IDEAS.md` already notes this. It would give words
*and* timings with no audio ML at all.

No research was done on this path for this note, and it should not be compared
against the others until some is. Flagging it only so it is not lost.

---

## Precedents worth studying

- **[nomadkaraoke/python-lyrics-transcriber](https://github.com/nomadkaraoke/python-lyrics-transcriber)**
  — the most directly relevant prior art. Combines transcription (AudioShake
  preferred, Whisper fallback) with reference lyrics from Genius, Spotify,
  Musixmatch, or LRCLIB, then reconciles the two using *anchor sequences* plus
  optional LLM correction of the gaps, emitting word-level LRC and ASS. This is
  the hybrid architecture in production form. Standalone releases stopped at
  0.81.0 (December 2025); it now lives inside `karaoke-gen`.
- **[Nightingale](https://github.com/rzru/nightingale)** — karaoke app that uses
  LRCLIB when available and falls back to ASR, with a pluggable forced aligner
  and an in-app lyric editor. The in-app editor is the notable part: even the
  tools that do this well assume the user will correct the result.

Both confirm the tiering: database first, alignment second, transcription last,
and a human editor over the top.

---

## Local runtime, if ASR is implemented

Target machine is a MacBook M3, and mock mode must stay dependency-light
(`AGENTS.md`).

- **whisper.cpp is the right runtime on Apple Silicon.** It runs the encoder on
  the Neural Engine via Core ML and uses Metal, reportedly >3x faster than
  CPU-only. faster-whisper is CPU-only on Mac. Indicative throughput: large-v3 at
  roughly 2-3x realtime on M3/M4 with Metal, with one source claiming ~7x on an
  M3 Air; large-v3-turbo roughly 5x faster than v3.
- **It is a binary, not a Python package.** whisper.cpp can be invoked as a child
  process exactly like FFmpeg and Demucs already are, so it adds no weight to
  `.venv-real`. That said, Demucs already brings Torch, so a Python ASR would not
  introduce a *new class* of dependency either — this is a preference, not a
  constraint.
- **Model weights are a real download** (roughly 800 MB for turbo, ~1.5 GB for
  large-v3) and must sit behind the explicit real-mode setup path, never mock.
- **Added processing time** for a four-minute song at 2-3x realtime is roughly
  1.5-2 minutes on top of Demucs.

## Word-level or line-level?

Whisper's native timestamps are approximately 1-second accurate at segment level
and unreliable per word — the model was not trained to emit them. Getting
word-level timings requires a dedicated alignment step (Option 2's tooling).

For this product, **line-level is probably sufficient**. The stated purpose is
orientation — knowing where you are in the song — which `IDEAS.md` already frames
as helping users locate themselves in the chart. Line-level timings are far more
robust and avoid the entire word-timestamp accuracy debate. Word-level is a
karaoke-highlighting requirement, and karaoke highlighting is not a stated goal.

This should be decided before any implementation, because it determines whether
Option 2 needs a phoneme aligner at all.

---

## Assessment

A tiered design falls out of the research, and it mirrors the chord
architecture already in the codebase — immutable suggestion underneath, user
authority on top:

1. **LRCLIB synced lyrics** when available. No ML, best quality, near-zero cost.
   Requires song identity, which the app lacks today.
2. **User-supplied lyrics, force-aligned.** Same contract as user-supplied stems
   and the user-owned chord chart. No sourcing or rights problem.
3. **Whisper over the vocals stem**, in the mss-alt shape, as the draft of last
   resort — explicitly labelled approximate, in the way analyzer chords already
   are.
4. **A lyric editor**, because every surveyed precedent assumes correction.

Tier 1 alone would serve a large share of covers for a fraction of the effort of
tier 3, and tier 2 is philosophically the closest fit to how this project already
treats user-owned content. Tier 3 is the only tier that adds a heavy dependency,
and it is also the weakest performer.

That ordering suggests lyrics need not be an ML project at all — which makes it a
materially smaller commitment than the chord gate, contrary to the earlier
assumption in the repositioning review.

The unresolved question is legal rather than technical, and it turned out to be
larger than lyrics: it is a question about where the app's *source media* comes
from, which applies equally to the stored recordings and the derived stems.
`source-legality-and-legal-posture.md` covers it, and concludes that lyrics add
no new category of exposure beyond what the app already stores.

## Sources

- [LRCLIB](https://www.lrclib.net/) and [API docs](https://lrclib.net/docs)
- [Jam-ALT benchmark](https://audioshake.github.io/jam-alt/) and
  [alt-eval toolkit](https://github.com/audioshake/alt-eval)
- [Exploiting Music Source Separation for ALT with Whisper](https://arxiv.org/abs/2506.15514),
  [code](https://github.com/jaza-syed/mss-alt)
- [LyricWhiz](https://arxiv.org/html/2306.17103v4)
- [nomadkaraoke/python-lyrics-transcriber](https://github.com/nomadkaraoke/python-lyrics-transcriber)
- [Nightingale](https://github.com/rzru/nightingale)
- [WhisperX](https://github.com/m-bain/whisperx) and
  [word-timestamp accuracy issue](https://github.com/m-bain/whisperX/issues/1247)
- [whisper-timestamped](https://github.com/linto-ai/whisper-timestamped)
- [CrisperWhisper](https://arxiv.org/pdf/2408.16589)
- [Whisper benchmarks on Apple Silicon](https://justvoice.ai/blog/whisper-benchmark-apple-silicon-m3-m4),
  [faster-whisper vs whisper.cpp](https://codersera.com/blog/faster-whisper-vs-whisper-cpp-speech-to-text-2026/)
