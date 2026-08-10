# Specialist Harmony Agent Capability Test

Date: 2026-08-10

## Known capability boundary

The draft `Musical Harmony Reviewer` currently uses `gpt-5.3-codex`. OpenAI's
model documentation lists text input/output and image input, but states that
audio input is not supported:

- https://developers.openai.com/api/docs/models/gpt-5.3-codex

The draft must therefore not claim to have heard a raw recording. Its current
value proposition is musical reasoning over supplied evidence, not replacement
of the signal-analysis pipeline.

OpenAI separately documents `gpt-audio` as accepting audio input and output:

- https://developers.openai.com/api/docs/models/gpt-audio

That establishes modality support, not competence at chord recognition. Direct
musical understanding must be measured before an audio-input model is trusted.

## Question

Where, if anywhere, does a general-purpose model improve this project's harmony
workflow?

1. Direct perception from audio?
2. Musical interpretation of neutral signal evidence?
3. Diagnosis after seeing analyzer output?
4. Explanation after seeing ground truth?

These are different capabilities and must not be tested in one prompted step.

## Frozen staged-disclosure experiment

Run the following arms on the same frozen excerpts from Level 1 upward.

### Arm A — blind audio perception

Use a separately configured audio-input model. Provide only the audio, excerpt
identity, and review question. Ask for:

- key or tonal centers;
- meter and pulse;
- bass motion;
- chord labels at bar/beat/subdivision positions;
- confidence and credible alternatives.

Do not provide analyzer labels or ground truth. This is the only arm that tests
whether the model understands harmony directly from audio. The current Workspace
Agent cannot perform it.

### Arm B — neutral musical evidence

Give the current reviewer:

- the authoritative beat/bar grid;
- beat-aligned note or pitch-class salience;
- bass-note candidates and persistence;
- source roles and reliability;
- optionally chromagram, piano-roll, or notation-like images.

Do not provide analyzer chord labels or ground truth. This tests whether
theory-led reasoning adds value after signal extraction.

### Arm C — candidate diagnosis

Reveal the raw and candidate interpretations. Ask the reviewer to locate
agreements and disagreements, judge learner severity, propose alternative
musical readings, and develop competing causal theories. Keep ground truth
hidden.

### Arm D — reference audit

Reveal the independently prepared reference last. Ask what the reviewer missed,
whether the reference permits alternatives, what was merely label matching, and
which causal theory survives.

## Evidence packet

Freeze for every excerpt:

- audio checksum and exact time range;
- complexity level and isolated musical feature;
- beat/meter reference and confidence;
- independently prepared chord interpretation with allowed alternatives;
- signal representation version;
- model and prompt identity;
- analyzer/policy identities;
- run order and disclosure state.

Repeat model runs to expose instability. Never let an earlier arm see material
reserved for a later arm.

## Evaluation

Record:

- root and chord-quality accuracy over musical time;
- bar/beat/subdivision placement, with milliseconds only as a companion metric;
- key, meter, bass, inversion, pedal, and non-chord-tone interpretation;
- handling of defensible ambiguity;
- run-to-run stability;
- learner correction burden;
- quality and falsifiability of causal theories.

The result is not one overall pass/fail. Report which arms add value and which do
not. A model may fail at blind audio perception while remaining valuable at
neutral-evidence interpretation or failure diagnosis.

## Input recommendation

Do not initially provide “audio + analyzer interpretation + ground truth.” That
tests mainly post-hoc explanation and strongly anchors the reviewer.

Use this order instead:

1. audio alone for the audio-capable arm;
2. neutral extracted evidence for the current reviewer;
3. analyzer interpretation;
4. ground truth and accepted alternatives.
