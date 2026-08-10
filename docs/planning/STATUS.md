# Status

This file describes the project as it is now. Dated history, the completed-work
list, and the verification log live in `docs/archive/STATUS_ARCHIVE.md`. Curated outcomes live
in `CHANGELOG.md`, the plan in `docs/planning/TASKS.md`, and irreversible choices in
`docs/planning/DECISIONS.md`.

## Current Status

Implemented and verified by automated backend and browser tests:

- **Library and workspace.** One primary song list holds queued, processing,
  failed, and completed songs. Songs reopen without reprocessing; rename, delete,
  search, and thumbnails work. Practice state persists per song with
  `Saving.../Saved/Save failed` feedback and survives an immediate song switch.
- **Playback.** Synchronized stem playback with mute, solo, per-stem volume,
  speed change, one grid-snapped loop, count-in, and a Web Audio metronome
  clicking against the effective grid.
- **Timeline.** Persisted Zoom, Fit, and optional Follow, over a waveform.
  Follow defaults off and yields to manual panning. Mac trackpad pinch is a known
  open defect; the reliable path is the Zoom slider plus `Fit`, and
  `docs/engineering/TIMELINE_INTERACTION_CONTRACT.md` holds the agreed input contract.
- **Timing.** `Edit timing` exposes a separately zoomable waveform where one bar
  line can carry an explicit downbeat time, an effective time signature, or both,
  removable independently. The meter-aware map drives contextual BPM, timeline
  and bar enumeration, click and accent scheduling, chord windows and
  highlighting, loops, Harmony, count-in, and inverse seeking. Bar 1 supports
  negative time; 6/8 and 12/8 use dotted-quarter pulse grouping.
- **Harmony.** Beat-aligned chord grid with user editing, flat section labels,
  key override, corrected-timing reanalysis, `Back to analysis` with
  analysis-scoped one-step undo, and recovery of chord candidates suppressed by
  smoothing.
- **Pipelines.** Mock mode is dependency-light and remains fully demoable. Real
  mode extracts `source-audio.wav` with FFmpeg, separates six stems with Demucs
  `htdemucs_6s`, applies threshold-aware timing, then runs approximate harmony
  analysis.

Persisted state: constant corrections in `practiceState.gridOverrides`; sparse
variable timing and meter changes in version-2 `practiceState.timingMap`; viewing
in `practiceState.timelineView`. Disposable version-1 runtime jobs are no longer
migrated. Key,
chord chart, sections, and Harmony view are separate user-owned state.

### Current checkpoint

The chord-reliability validation gate is the committed line of work. Everything
else is deferred behind it. CR2E reached a terminal `STOP/REFRAME` result on
2026-08-10; its qualitative reframe also failed, and CR2F is the authorized
bounded follow-up. The measured position is:

- On the locked CR0 development split, full-mix MajMin is 53.6% with oracle
  timing and 48.1% end-to-end; real Demucs evidence improves those to 61.0% and
  57.5% without changing analyzer behavior.
- Demucs oracle cue density remains 65.0 changes/minute against 27.4 reference,
  with 1,400 false-extra boundaries. Wrong roots remain the largest error class.
- Opt-in benchmark artifacts now expose per-source chroma, low-note and
  reliability measurements, persistence/chordality, all candidate score
  components, and winner-change evidence. Six generated CR1 scenarios pass.
- Both CR2 local variants remove the synthetic vocal-driven false change but
  regress RWC-P development: oracle MajMin falls to 57.7% and 58.1%, and false
  extras remain flat or worsen. Neither is the application default.
- The Chordino external control reaches 78.1% oracle MajMin, 75.6% boundary F1,
  and 30.9 changes/minute, improving all eight development tracks over the
  61.0%, 53.0%, and 65.0 local baseline. End-to-end Chordino reaches 77.5%
  MajMin and 77.7% boundary F1.
- On the once-opened four-track CR2E holdout, Chordino materially beats the
  local baseline and passes every frozen aggregate check except oracle root:
  73.1% against the 75.0% minimum. Oracle MajMin is 73.9%, boundary F1 is 72.9%,
  and density is 1.01x reference. End-to-end MajMin is 75.2% and boundary F1 is
  76.0%. The local baseline reaches 59.0%, 53.6%, and 2.23x oracle.
- Chordino improves oracle MajMin on three of four holdout tracks and
  end-to-end MajMin on all four; `RWC_P024` regresses 4.7 oracle MajMin points.
- The Phase 2J holdout is consumed and fixed at 49.0% oracle and 39.9%
  end-to-end. It must never be used for tuning.
- The CR2E holdout is also consumed and must never be reused for tuning or a
  later candidate decision. Its manual reframe found `TeAmo` and `Changes part
  1` useful at 4/5, but failed `ShapeOfMyHeart` at 2/5 because of repeated wrong
  roots and arpeggio-driven boundary churn; timing was also sometimes late.
- Decision 41 authorizes at most two development-only CR2F candidates. Product
  integration remains blocked, and a successful candidate would still require
  fresh validation.
- CR2F Candidate A passes its frozen development gate: oracle root 80.9%,
  MajMin 78.1%, boundary F1 75.1%, 306 false extras, 194 missing boundaries,
  and 30.7 changes/minute. All regression limits pass, including the 4.86%
  missing-boundary increase. The comparison assets are ready, but Decision 42
  replaces issue #12's former one-line review with a musical case report;
  Candidate B remains conditional on a supported persistent-root theory.
- Decision 42 reframes that pass as regression evidence only. MR0 must now
  establish the progressive professional musical-review method and a Level-1
  baseline before another analyzer candidate. The pending three-recording
  comparison requires a musical case report before its workflow code.

Chord accuracy is therefore the open core question. Timing, transport,
persistence, and the editable chart are not.

### Known limitations

- Chord names are unreliable on real screen recordings. This is the gate.
- Mac trackpad pinch zoom on the timeline is intermittent.
- Multipart uploads are buffered in memory behind a 650 MB cap; peak memory has
  not been measured near the limit.
- Runtime and memory for full-length real recordings are unmeasured.
- No musician has used the prototype yet, so nothing about product value is
  validated.

## Current Architecture

Local web POC:

- static browser client
- lightweight Node.js backend
- local filesystem storage under `data/`
- server startup uses `PIPELINE_MODE=mock` unless configured otherwise; the browser entry URL applies Real for a first-time root visit and remembers later mode choices
- processed results represented as stems, any of which may be the user's own part; a per-song `practiceTarget` model is planned but not yet built
- completed jobs exposed as a reusable processed-song library
- unified workspace shows active uploads, processing jobs, failed jobs, and completed songs in one primary song list
- per-song practice state stored in local `job.json`, including grid overrides, key override, and the user's grid-first chord chart
- `PIPELINE_MODE=real` behind the same pipeline boundary, currently with real upload storage, FFmpeg source-audio extraction, and Demucs `htdemucs_6s` six-stem separation by default
- stable `?mode=real` and `?mode=mock` links in the app-information popover change the active backend pipeline mode for new jobs in the current server session; `PIPELINE_MODE` remains the server startup default
- desktop/wide tablet uses a split view with song list on the left and selected detail/practice on the right
- mobile uses a list-first stack with a back button from detail/practice to the same song list
- beat/bar markers render from an effective grid derived from job `metadata.beatGrid` plus per-song `practiceState.gridOverrides`; the Web Audio metronome clicks against that same effective grid with downbeat accent always on and mute/solo/volume controls in the mixer
- Harmony renders analyzer chords as draft suggestions until `practiceState.chordChart` exists; once present, the user-edited grid-first chart becomes the displayed working chart while `job.result.metadata.chords` remains unchanged for provenance. The Harmony UI is a beat-aligned chart: bars render as rows, beats as cells, and chord cards show the bar/beat where each chord hits rather than a visible start/end time range

### Module map

- `server.js` — HTTP routing, job lifecycle and storage, mock audio generation,
  real pipeline orchestration, and the beat/harmony analyzer. The two analysis
  subsystems are the next candidates for extraction, per
  `docs/engineering/AI_TOKEN_OPTIMIZATION.md`.
- `public/app.js` — DOM rendering, transport, persistence, and timeline input.
  The largest integration file.
- `public/chord-chart.js`, `public/tempo-map.js`, `public/section-ranges.js` —
  pure, unit-tested model code. Chord-chart, Harmony-view, and section validation
  are shared with `server.js` so frontend and backend persistence cannot diverge.
- `scripts/` — benchmark, fixture, and contract-verification tooling. None of it
  touches the application library. CR1 diagnostics and CR2 local/Chordino
  variants are requested only by the benchmark CLI and remain outside job
  metadata. Sonic Annotator and Chordino are optional benchmark tools.

## Active Work Ownership

- Shared gate:
  [#1 — Validate chord reliability for user testing](https://github.com/perchristian/music-practice-poc/issues/1)
- Completed agent task:
  [#9 — CR2 accompaniment-first melody suppression](https://github.com/perchristian/music-practice-poc/issues/9)
  (`owner:agent`; closed in this CR2 iteration).
- Completed human action:
  [#8 — Approve RWC gate thresholds and final manual domain-check scope](https://github.com/perchristian/music-practice-poc/issues/8)
  (`owner:per`; closed after approving the proposed thresholds and three
  recommended recording scenarios).
- Completed human review:
  [#10 — CR2E Chordino holdout and screen-recording validation](https://github.com/perchristian/music-practice-poc/issues/10)
  (Per returned `FAIL`: `TeAmo` and `Changes part 1` were useful, while
  `ShapeOfMyHeart` had repeated wrong roots and arpeggio-driven boundary churn;
  timing was also sometimes late; the issue is closed.)
- Waiting agent task:
  [#11 — CR2F musical-grid stabilization](https://github.com/perchristian/music-practice-poc/issues/11)
  (`owner:agent`, `state:waiting`). Candidate A passed development; Candidate B
  is conditional on a musically supported root-cause theory.
- Current human action:
  [#12 — Review CR2F musical-window candidate](https://github.com/perchristian/music-practice-poc/issues/12)
  (`owner:per`, `state:ready` on GitHub, but its local review packet was amended
  by Decision 42 and must not use the former one-line response alone).

## In Progress

- CR2F Candidate A implementation and automated development evaluation are
  complete. The raw-versus-candidate review now requires the Decision 42 musical
  case report.
- MR0 is next: freeze Level-1 material, perform the first professional musical
  review, and use the result to decide whether to advance or isolate a simpler
  correction. Candidate B requires evidence for the proposed root mechanism;
  the consumed holdout is unavailable and product integration remains
  unauthorized.
- CR1 is complete. Milestone 1 passed with semantic-output equivalence, six
  generated scenarios, full-mix and Demucs-assisted RWC development baselines,
  and a dominant-error review in
  `benchmarks/chord-reliability-cr1-checkpoint.md`.
- CR0 is complete and amended. The product owner answered `CHANGES` in
  [#3](https://github.com/perchristian/music-practice-poc/issues/3) on
  2026-07-24: RWC-P is the primary benchmark and runs first, Logic fixtures and
  the two untouched target recordings no longer block it, and a manual check of a
  few representative iOS screen recordings becomes the final domain check. This
  is recorded as `docs/planning/DECISIONS.md` Decision 33.
- Phase 3G.3 is complete for automated and human verification. A general undo
  history remains deferred.
- Phase 3G.2A timeline input correctness has a known real-hardware failure and is
  deferred behind the chord gate.
- The prior backlog work packages are deferred until the gate reaches a terminal
  decision.

## Next Recommended Task

Complete MR0 before resuming issue #11: select and freeze the first Level-1
material, then produce the report defined in
`docs/research/musical-chord-review-method.md`. The existing three-recording
comparison remains useful diagnostic evidence, but its workflow code follows
the musical analysis rather than replacing it. No result authorizes product
integration.

## Context Recovery Review Result

Type: Simulated

Files used:
- `docs/planning/STATUS.md`
- `docs/planning/TASKS.md`
- `docs/planning/DECISIONS.md`
- `docs/engineering/ARCHITECTURE.md`

Summary:
- Current architecture: local static-browser/Node.js POC with filesystem job
  storage, mock and Demucs/FFmpeg real pipelines, synchronized multi-stem
  practice controls, persisted timing and chord-chart state, and immutable
  analyzer suggestions.
- Completed work: the end-to-end library, practice workspace, mixer, transport,
  metronome, timing editor/map, editable Harmony chart, mock pipeline, real
  six-stem Demucs pipeline, and CR0–CR2E automated chord-reliability work are
  implemented and verified. CR2E consumed the locked holdout and returned
  `STOP/REFRAME` after Chordino missed oracle root by 1.9 points. The owner then
  selected `REFRAME`; the bounded qualitative review failed on
  `ShapeOfMyHeart`, while `TeAmo` and `Changes part 1` remained useful. CR2F
  Candidate A subsequently passed its development gate and its comparison
  packet is ready.
- Remaining work: issue #12 must assess Candidate A on the three consumed local
  recordings through the Decision 42 case-report method. MR0 must first freeze
  and review Level-1 material; Candidate B is conditional on musical evidence
  for the proposed persistent-root mechanism. Product integration, CR3–CR5,
  practice-target, stem-import, and timeline-hardening remain blocked behind
  that learning sequence.
- Next recommended task: MR0 Level-1 material and first musical report.

Gaps found:
- MR0 has no frozen Level-1 material or executable GitHub issue yet. All
  available RWC holdout and local manual recordings are consumed; a successful
  Candidate A or B still needs fresh validation before any replacement claim.

Result:
PASS

## Skills Used

- Used Codex skill `workspace-agents:workspace-agents-build-agent` on
  2026-08-10 to create the draft `Musical Harmony Reviewer`.
  - Purpose: provide a professional musical reviewer that separates acoustic
    observation, harmonic interpretation, and analyzer behavior; maintains a
    progressive song ladder; and produces causal theories rather than a bare
    pass/fail result.
  - Result: an unpublished draft was created with four starter prompts and
    per-user Memory for a song-complexity ladder and hypothesis ledger.
  - Reproducibility: the agent is optional. Decision 42 and
    `docs/research/musical-chord-review-method.md` contain the complete review
    contract, so a human or any capable agent can reproduce the work without
    the skill or workspace agent.
- Used Codex skill `github:github` on 2026-08-10 to clarify issue #11's problem,
  hypothesis, test strategy, decision scope, and boundary metrics.
  - Purpose: reconcile the GitHub issue contract with its durable local task and
    frozen benchmark contract before changing the planning format.
  - Result: the frozen gate remains unchanged but is now identified as a
    retention gate; local documentation explains its metrics and requires a
    causal, falsifiable task contract for future work.
  - Reproducibility: the task, candidate contract, evaluator, and checkpoint are
    version-controlled; no execution depends on the skill.
- Used Codex skill `github:github` on 2026-08-10 to orient this music-theory
  scope discussion against issues #11 and #12.
  - Purpose: verify CR2F's frozen candidate contract and current human-review
    dependency before recommending where theory knowledge belongs.
  - Result: theory documentation is relevant, but adding new theory-driven
    analyzer rules inside issue #11 would exceed its authorized scope.
  - Reproducibility: the issue contracts and supporting harmonic-analysis
    documents are version-controlled; the recommendation does not depend on the
    skill.
- Used Codex skill `ponytail:ponytail` on 2026-08-10 for CR2F execution.
  - Purpose: reuse raw Chordino intervals, existing beat grids, and isolated-
    change behavior for the smallest bounded Candidate A.
  - Result: Candidate A passed development without product changes; Candidate B
    was not started before its conditional human gate.
  - Reproducibility: the policy, tests, benchmark command, preparation script,
    and review packet are version-controlled; the skill is not required.
- Used Codex skill `github:github` on 2026-08-10 for CR2F execution tracking.
  - Purpose: reconcile completed CR2E state and maintain the agent/human queue.
  - Result: closed issue #10, created waiting execution issue #11, and created
    ready product-owner review issue #12.
  - Reproducibility: issue state is visible on GitHub; local execution does not
    depend on the skill.
- No sub-agent delegation or model switch was used for CR2F execution; the
  session retained high reasoning throughout.

- Used Codex skill `ponytail:ponytail` on 2026-08-10 for CR2F planning.
  - Purpose: keep the authorized follow-up to the smallest ordered candidates
    with explicit regression and stop gates.
  - Result: Candidate A reuses raw Chordino labels and existing conservative
    sequence behavior; Candidate B is conditional and reuses the existing chord
    scorer with NNLS chroma. Parameter sweeps, product work, and broader
    heuristics are excluded.
  - Reproducibility: the task contract, thresholds, and stop conditions are
    version-controlled; the skill is not required.
- Used Codex skill `github:github` on 2026-08-10 for CR2F planning.
  - Purpose: verify issue #10's final product-owner verdict and reconcile the
    next ownership handoff.
  - Result: the `FAIL` was confirmed. A dedicated CR2F issue could not be created
    at that point because local `gh` authentication was invalid; CR2F execution
    later reconciled the issue state.
  - Reproducibility: the issue comment and local task contract preserve the
    evidence; the reconciled state is visible on GitHub.
- No sub-agent delegation or model switch was used for CR2F planning; the
  session retained high reasoning throughout.

- Used Codex skill `ponytail:ponytail` on 2026-08-10 for CR2E.
  - Purpose: reuse the frozen evaluator, then implement the authorized reframe
    through the smallest native local review surface without product changes.
  - Result: the holdout ran once; after Per selected `REFRAME`, one standalone
    page and packet made the three-recording qualitative check ready while
    keeping product integration blocked.
  - Reproducibility: commands, frozen thresholds, and aggregate/per-track
    checkpoint results are version-controlled; the skill is not required.
- Used Codex skill `github:github` on 2026-08-10 for issue #10 orientation and
  attempted ownership reconciliation.
  - Purpose: read issues #8 and #10 and preserve the issue ownership contract.
  - Result: approvals, scope, and Per's `REFRAME` response were verified. Issue
    state changes were unavailable during that step and were reconciled during
    CR2F execution.
  - Reproducibility: local execution does not depend on the skill; the final
    GitHub state is visible in issues #10–#12.
- No sub-agent delegation or model switch was used for CR2E; the session retained
  high reasoning throughout.

- Used Codex skill `ponytail:ponytail` on 2026-08-10 for CR2 implementation.
  - Purpose: test the two smallest isolated evidence policies, preserve the
    existing product default after both failed, and reuse the benchmark/evaluator
    seams for the mandatory external control.
  - Result: both local variants were rejected without product behavior change;
    the optional Chordino adapter established a materially stronger development
    candidate without adding an application dependency.
  - Reproducibility: all policies, tests, transform parameters, commands, and
    aggregate results are version-controlled; the skill is not required.
- Used Codex skill `github:github` on 2026-08-10 for CR2 ownership tracking.
  - Purpose: satisfy the GitHub-Issue execution contract.
  - Result: created and closed owner-agent issue #9, reconciled issue #8's
    approval, and created ready owner-agent issue #10 for CR2E.
  - Reproducibility: issue state is visible on GitHub and local execution does
    not depend on the skill.
- No sub-agent delegation or model switch was used for CR2; the session retained
  high reasoning throughout.

- Used Codex skill `ponytail:ponytail` on 2026-08-10 for CR1 implementation.
  - Purpose: expose the required benchmark diagnostics and fixtures through the
    smallest existing seams without adding dependencies or speculative
    abstractions.
  - Result: diagnostics and fixtures shipped without dependencies or analyzer
    behavior changes; all focused and full tests pass.
  - Reproducibility: the work is ordinary version-controlled
    JavaScript, tests, benchmark artifacts, and documentation; the skill is not
    required to run or verify it.
- Used Codex skill `github:github` on 2026-08-10 to create and orient the CR1
  execution issue.
  - Purpose: satisfy the repository's GitHub-Issue ownership contract before
    implementation.
  - Result: created execution issue #7 and the just-in-time product-owner review
    issue #8 after the development results made its decision packet actionable.
  - Reproducibility: the issue and labels are visible through GitHub; the skill
    is not required to execute CR1 locally.

- Used Codex skill `ponytail:ponytail` on 2026-08-09 to apply the saved
  over-engineering audit with deletion and native/shared platform features first.
  - Purpose: remove retired compatibility and duplicate implementation while
    preserving the current demo and verification contracts.
  - Result: the FFmpeg spectral separator and legacy job adapters were removed;
    multipart parsing and model validation now use native/shared implementations;
    dead UI, tooling, planning, and screenshot artifacts were deleted. All ten
    audit findings were applied and verified.
  - Reproducibility: every change is ordinary version-controlled JavaScript,
    CSS, tests, and documentation; the skill is not required to run or verify it.
- Used Codex skill `ponytail:ponytail-audit` on 2026-08-09 for a read-only,
  repository-wide over-engineering audit.
  - Purpose: rank code, compatibility, tooling, styling, and documentation that
    could be deleted or simplified without performing a correctness review.
  - Result: saved ten findings and an estimated reduction of about 900 lines in
    `docs/research/ponytail-audit-2026-08-09.md`; the follow-up implementation
    applied all ten.
  - Reproducibility: the report names every target and replacement; the audit
    can be repeated with ordinary repository inspection without the skill.
- Used Codex skill `github:github` on 2026-07-24 to inspect CR0 issue #2 and its
  parent gate, verify the human queue, and create approval issue #3.
  - Purpose: execute the issue contract while keeping the product-owner review
    as one explicit, just-in-time handoff.
  - Result: CR0 Codex preparation is complete and #3 is the only
    `owner:per`/`state:ready` issue.
  - Reproducibility: all contract artifacts and commands are version-controlled;
    GitHub is used only for ownership and the approval response.
- Used Codex skill `github:github` on 2026-07-23 to inspect the empty repository
  tracker and establish the approved issue-based ownership workflow.
  - Purpose: separate Codex execution from product-owner actions and keep human
    review requests visible and actionable.
  - Result: created the `Chord Reliability Gate` milestone, ownership/state/review
    labels, shared gate issue #1, and active Codex issue #2.
  - Reproducibility: the labels, milestone, and issue bodies are visible in
    GitHub and the workflow rules are version-controlled in `AGENTS.md`.

Older skill use is recorded in `docs/archive/STATUS_ARCHIVE.md`.

## Agent and Model Use

- Created the unpublished Workspace Agent draft `Musical Harmony Reviewer` with
  its workspace default `gpt-5.3-codex` model. It has not yet judged project
  evidence or changed repository files; its future output is advisory and must
  be committed as an ordinary review report before it affects a decision.
- CR1 used one read-only `gpt-5.6-terra` agent at high reasoning for routine
  generator, benchmark-adapter, and test reconnaissance. It recommended the
  opt-in diagnostic seam and identified the fixture/test risks; it changed no
  files.
- A second fresh `gpt-5.6-terra` high-reasoning reviewer received only the four
  required recovery files and passed the context recovery review with no gaps;
  it changed no files.
- The main high-reasoning Codex session performed implementation, benchmark
  execution, documentation, and final review.

## Known Local State

- Local `data/jobs` contains manual/runtime jobs for `TeAmo.mov`,
  `Stem-generator_1.aif`, and `MakeYouFeelMyLovePart2.mov`, plus one local
  `job.json` that currently fails JSON parsing. This is user data and has not
  been deleted; WP3 must resolve or explicitly preserve it.
- The Playwright suite runs against an isolated temporary `DATA_DIR` since
  2026-07-25, so GUI runs no longer write into the local library.
- `.benchmark-data/` holds the RWC-P archive, annotations, twelve extracted CR0
  audio files, and CR1 Demucs-derived development stems. `benchmark-results/`
  holds detailed CR1 diagnostics. All of it is ignored by Git.

## Verification

Current commands:

```bash
npm test              # Node backend and pure-module tests
npm run test:gui      # Playwright browser tests
npm run verify:chord-contract   # CR0 contract dry run, requires .benchmark-data
npm run benchmark:chords -- --timing both   # CR1+ development artifact run
```

Dated verification evidence for completed work is in `docs/archive/STATUS_ARCHIVE.md`.
