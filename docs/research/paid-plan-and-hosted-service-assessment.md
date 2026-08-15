# Assessment: a paid plan with cloud storage, sharing, and better analysis

Status: Research input for a product-owner decision. Written 2026-08-14 in
response to the question "consider the possibility of adding a paid plan to this
app that adds cloud storage and sharing as well as better analysis". Nothing here
is committed, and the recommendation is deliberately arguable.

Cost figures are approximate and from memory. They are good enough to decide
whether the shape works; they are not good enough to commit to, and must be
verified against current provider pricing before any of this is built.

---

## Short version

The proposal contains two products, and they have very different prospects.

**Hosted storage and sync is coherent and cheap.** It sells convenience, not
capability. Self-hosters lose nothing, the architecture already anticipates it,
and the money cost is close to trivial at band scale.

**A paid "better analysis" tier is a bad idea, and not mainly for economic
reasons.** It creates an incentive to keep the free engine worse than it could
be — which is in direct conflict with the plan the project just committed to.

**Neither should be built now**, because the decision cannot be evaluated until
file-based sharing has been built and used by a real band. If that satisfies them,
no product here to sell.

What *is* worth doing now is naming the properties that keep the option open for
almost nothing. Those are listed at the end, and the project already has all of
them.

---

## What would actually be sold

Three separable products get bundled together in the phrase "paid plan":

1. **Hosted storage and sync** — the band's songs live on a server; every
   member's app syncs to it. Replaces the shared-folder arrangement for people
   who do not want to manage a shared folder.
2. **Hosted compute** — the server runs stem separation and analysis, so a device
   that cannot do it locally still gets a full result.
3. **A better analysis engine, available only to paying users.**

These have to be judged separately, because 1 and 2 are convenience and 3 is
capability lock.

---

## The money is not the problem

Storage is close to free at this scale. A complete song with stems is roughly
25–60 MB encoded. A four-piece band with thirty songs is somewhere around
1–2 GB. At commodity object-storage rates that is cents per month.

The variable that usually kills media hosting is **egress**, not storage — every
member downloading every song, repeatedly, across devices. On the major cloud
providers egress is the dominant line item. Providers that do not charge for
egress at all change this picture completely, and that single fact is what makes
hosted sync viable for a hobby-scale project rather than a money pit. It should
be verified carefully before committing, because the whole economic case rests on
it.

Compute is more expensive but still small. Separation on a GPU is seconds per
song, and per-second serverless GPU billing puts a single song in the range of a
few cents. Chord analysis is far lighter than separation.

So a band of four, thirty songs, moderate activity, plausibly costs low single
digits of currency per month to serve. That is not the obstacle.

## The obligation is the problem

A paid plan converts an open-source project the maintainer works on when he wants
to into **a service that people have paid to depend on**. That is a different
relationship, and it does not switch off when work gets busy or the band takes a
summer off.

It brings, at minimum: uptime expectations, support requests, payment handling
and refunds, account recovery when someone forgets a password, and the certainty
that at some point a band will lose access to their charts on the evening of a
gig and will be entitled to be upset about it.

`docs/planning/RISKS.md` already carries "a single maintainer cannot sustain a
production, cross-platform, open-source project" as a structural risk. A paid
tier raises the impact of that risk substantially without changing its
likelihood.

## The legal exposure changes materially, and this is the part usually missed

Today the project never touches anyone's content. The app is local, the user
brings their own media, and nothing is transmitted anywhere. That is not a
technicality — it is the reason the copyright question in
`docs/planning/RISKS.md` stays at "document demo media limitations" rather than
becoming a compliance programme.

Hosting other people's uploads changes the category. The app exists to process
recordings of songs, and a meaningful fraction of what users upload will be
commercial material. Storing that on a server operated by the project means, at
minimum:

- a takedown process, and the posture required to benefit from hosting-provider
  safe harbours in the jurisdictions that matter;
- terms of service and an acceptable use policy;
- a privacy policy and a lawful basis for processing, since the maintainer is in
  the EEA and so is the band — GDPR applies to the users' data regardless of how
  small the service is;
- a plan for what happens when someone asks for their data, or asks for it to be
  deleted;
- security obligations proportionate to holding other people's recordings.

None of this is insurmountable, and small services do it. But it is a real,
recurring, non-technical workload, and it is the item most likely to be
underestimated when someone thinks "add a paid plan". **It should be priced in
before the storage bill is.**

This assessment is not legal advice and the specifics need proper advice before
anything is offered for money.

---

## Why hosted sync is coherent

It is the model Obsidian Sync, Bitwarden, Home Assistant Cloud and Standard Notes
use: the software is free and open, the format is open, self-hosting is fully
supported, and the paid thing is *we run it so you do not have to*. Nobody is
locked out of a capability; they are choosing not to do the work.

That fits this project unusually well:

- **The format already exists and is open.** Someone who stops paying exports
  their songs and goes back to a shared folder. That is a real exit, not a
  nominal one, and it is what makes the offer honest.
- **The architecture already anticipates it.** Decision 44 records that a sync
  server can be built on top of the same bundles; Decision 46 says the same. The
  append-only revision layout from Decision 48 maps almost directly onto object
  storage — immutable objects, keyed by song and revision, with no in-place
  mutation to reconcile.
- **It solves a real limitation.** The band folder is weakest on iPad and iPhone,
  where background folder watching is unreliable. A hosted sync service is the
  clean answer to exactly that gap, and it is the only part of the sharing design
  that is currently a known compromise rather than a choice.

If anything is ever sold, this is the thing to sell.

## Why hosted compute is also coherent

Selling *compute the user's device cannot perform* is the same kind of offer:
convenience, not withheld capability.

It also lands on a genuinely open problem. Whether on-device separation is viable
on iPad is unknown, and `docs/engineering/PORTABILITY.md` marks it as the one
capability the matrix cannot yet promise. "We will separate it for
you" is a legitimate paid answer to that question, and it does not degrade
anything for a desktop user who runs Demucs locally.

The distinction that matters: **paying for compute you cannot run is convenience;
paying for a model deliberately withheld from the free tier is a lock.**

## Why a paid analysis tier is the weak part

Four problems, in increasing order of seriousness.

**It is not clearly differentiated enough to sell.**
Headline chord accuracy has moved very little in eight years, and the ceiling
sits near the level at which expert annotators disagree with each other. The
project's own CR2E result is consistent with this: Chordino materially beat the
local analyzer and still missed the frozen root gate. "Meaningfully better
chords" may simply not be a purchasable difference.

**An open analyzer adapter would undercut it.** If the project ever documents a
plug-in boundary — which `docs/engineering/PORTABILITY.md` assumes for
portability reasons — anyone can connect a better engine themselves. A paid tier
then charges for the convenience of not installing something: thinner value than
hosting, and trivially circumvented in an open-source app.

**The competitor does not do this.** Moises, the reference product, tiers on
*vocabulary complexity* and *usage limits* — free users get chord detection for
the first minute of a song — not on accuracy. Even a well-resourced commercial
product does not sell "better chords" as the upgrade.

**And the serious one: it creates a reason not to fix the free engine.** The
entire chord-reliability gate exists to make the built-in engine good enough that
a musician can correct a song quickly. A paid accuracy tier makes that work commercially
self-defeating, because every improvement to the free engine erodes the reason to
pay. The project would acquire a standing incentive to leave the default worse
than it could be.

That conflict is not manageable with good intentions. It is structural, and it is
the strongest argument in this document.

---

## The asymmetry that decides the timing

Adding a paid tier later is easy. Removing one is not.

Once a band pays to store their charts, withdrawing the service harms people who
relied on it, and doing so gracefully takes more work than launching it did. The
reversible direction is "not yet"; the irreversible direction is "yes".

Combined with the fact that **the decision cannot be evaluated before file-based
sharing ships** — if it satisfies the band, there is no unmet need to sell
against — the sequencing is clear.

It is also worth naming what the repository says this project is for: *"an
experimental music practice app built as a concrete case study for learning how
to use AI throughout the software development process."* A paid service adds
obligations that serve none of that. That is not an argument against ever doing
it, but it is an argument for not doing it by accident.

---

## Recommendation

**Do not build it now. Keep the option open deliberately, and cheaply.**

If it is ever built:

1. **Sell hosting and compute, never capability.** Hosted sync first, hosted
   separation second. The analysis engine stays the same for everyone.
2. **Keep self-hosting a real exit**, with export that produces the same open
   format. An offer people can leave is the only honest version of this.
3. **Price the obligation before the infrastructure.** The recurring cost is
   support, takedowns, and data-protection duties, not storage.
4. **Precondition:** file-based sharing has shipped and the band has used it long
   enough to say whether it is insufficient — and specifically whether the iOS
   folder limitation is what is failing them.

## What keeps the option open, at no cost

The project already has all four of these. They are worth stating so a later
session does not trade them away without noticing what it is trading.

| Property | Status | Why it matters here |
| --- | --- | --- |
| The format is the contract, transports are interchangeable | Held (Decisions 36, 39, 42) | A sync service moves the same bundles; it is a third transport, not a new model |
| Append-only, immutable revisions | Held (Decision 46) | Maps directly onto object storage with no in-place mutation to reconcile |
| The analyzer can be an adapter | Assumed by `docs/engineering/PORTABILITY.md`, not yet adopted | A hosted analyzer would be just another provider — and so is a local one, which is what would keep a free tier honest |
| Identity is optional and additive | Held (Decisions 40, 41) | Ownership is a name and a generated id today; accounts could strengthen it later without redesigning it |

The one thing to avoid is building any capability that exists *only* on a server.
The moment a feature cannot work locally, the local-first promise in
`docs/product/VISION.md` becomes conditional, and the free app becomes a demo of
the paid one.
