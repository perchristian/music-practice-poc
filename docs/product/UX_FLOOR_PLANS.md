# UX Floor Plans

## Purpose

This document explores the next library and navigation shape for the prototype.

The immediate problem is that newly uploaded songs can disappear from the first screen, while reopening another song requires too many steps. The goal is not visual polish. The goal is a layout and navigation model that keeps uploads, processing state, and reusable songs close to the practice experience.

## Recommended Direction

Use a Voice Memos-inspired song library and practice shell.

Replace the current split between home, Recent, All songs, and practice as separate destinations with one primary song workspace:

- A song list is always the primary library surface.
- New uploads appear immediately at the top of the list with status.
- Completed songs remain in the same list and can be reopened by tapping the row.
- Desktop and tablet use a persistent left song list with the selected song on the right.
- Mobile uses a list-first stack: song list to song detail/practice.
- Upload/add is the primary creation action.
- Rename, delete, and similar secondary actions live in the selected song header or row swipe/actions.

This keeps the POC focused on the user journey: upload a song, wait for processing, reopen it, and practise.

## Floor Plan A: Desktop Split View

Recommended default for desktop and wide tablet.

```text
+------------------------------+-----------------------------------------------+
| Songs                 [+ Add]| [Rename] [Delete] [More]                      |
| Search                       |                                               |
|                              | Song title                                    |
| Uploading Song       72%     | Ready - 03:42 - Key: F minor                  |
| Processing Song      01:12   |                                               |
| Selected Song        Ready   | Waveform / transport / loop                   |
| Older Song           Ready   |                                               |
| Failed Song          Retry   | Stems                                         |
|                              | Drums  Bass  Guitar  Piano                    |
|                              |                                               |
|                              | Harmony                                       |
|                              | Chords, roman numerals, current cue           |
+------------------------------+-----------------------------------------------+
```

Navigation:

- Clicking any song row selects it.
- Selecting a completed song opens the practice detail in the right pane.
- Selecting an uploading or processing song opens a processing detail in the right pane.
- Selecting a failed song opens an error/retry detail in the right pane.
- The left list remains visible while practising.
- Search filters the same list, not a separate page.

Primary actions:

- `+ Add` opens file selection.
- Row click opens/selects the song.
- Header actions apply to the selected song.

Why this is the recommended direction:

- New uploads cannot disappear into another page.
- Switching songs becomes one click.
- Processing state, library, and practice all share one mental model.
- The pattern is familiar from Voice Memos, Mail, Notes, and many music tools.

## Floor Plan B: Mobile List-First Stack

Recommended default for mobile.

```text
Songs                                      [+]
Search
---------------------------------------------
Uploading Song                         72%
Processing Song                 Processing
Ready Song                       Today 14:20
Older Song                         Yesterday
Failed Song                            Retry
```

Song detail:

```text
< Songs                         [Rename] [...]

Song title
Ready - 03:42 - Key: F minor

Waveform / playback
Speed - Loop

Stems
Drums  Bass  Guitar  Piano

Harmony
Chords, roman numerals, current cue
```

Navigation:

- The list is the first screen on mobile.
- Tapping any row opens that song.
- Back returns to the same list and scroll position.
- Processing songs can be opened, but show status/progress instead of the full player.
- Completed uploads do not auto-navigate unless a later user test shows this is expected.

Mobile row actions:

- Tap row: open song.
- Short swipe left: reveal secondary actions such as Rename and Delete.
- Delete should require confirmation or undo because processed songs represent user time and processing cost.
- Avoid an explicit `Open` button when opening is the only primary action.

## Floor Plan C: Compact Desktop / Narrow Tablet

Useful for intermediate widths where a full split view is crowded.

```text
+--------------------------------------------+
| Songs                              [+ Add] |
| Search                                     |
| Selected Song                  Ready 03:42 |
| Processing Song              Processing   |
| Older Song                       Yesterday |
+--------------------------------------------+
| Song title                         [...]   |
| Waveform / playback                        |
| Stems                                      |
| Harmony                                    |
+--------------------------------------------+
```

Navigation:

- The list stays above the detail at medium widths.
- Row click changes the detail below without leaving the page.
- At very small widths, this collapses into the mobile list-first stack.

This variant is not the primary target, but it gives the responsive transition a clean intermediate state.

## Song List Rules

The list should be status-first, not Recent-first.

Recommended ordering:

1. Active uploads and processing jobs, newest first.
2. Recently opened completed songs, newest first.
3. Other completed songs, newest first by created or processed time.
4. Failed jobs, newest first, unless failure needs immediate attention.

The list can later add filters, but the default first screen should already answer:

- What did I just upload?
- Is it done yet?
- What was I practising recently?
- How do I open another song quickly?

## Row Content

Each row should show:

- Album cover Square, left full heigt of row.
- Song title.
- Created human-readable time, not seconds precision.
- Processing or learning status.
- Duration when known.

Examples:

```text
Song Title
Uploading... 72%                         --

Song Title
Processing stems...                      --

Song Title
Today 14:20 - Ready                     03:42

Song Title
Yesterday - Practicing                  03:42

Song Title
Failed - Retry                           --
```

Time display guidance:

- Use `Now` for very recent activity.
- Use `Today HH:MM` for same-day activity.
- Use `Yesterday` for yesterday.
- Use `25 Jun` for current-year older dates.
- Use `25 Jun 2026` when the year matters.
- Do not show seconds in list timestamps.

## Detail Header Actions

For a completed selected song:

- Rename.
- Delete.
- Optional more menu for future actions.
- Learning status can remain in the detail body for now unless it becomes a frequent list-level operation.

For an uploading or processing song:

- Cancel can be considered later, but is not required for the current POC.
- Rename can wait until completion unless implementation is cheap.

For a failed song:

- Retry.
- Delete.

## Rejected Direction: Separate Recent and All Songs Pages

The current Recent plus All songs structure adds avoidable navigation cost:

- New uploads can feel hidden if they are not also recently opened.
- Opening a different song requires moving through multiple screens.
- Recent becomes a second concept the user has to understand instead of a simple song library.

Recentness is still useful as a sorting signal, but it should not be the main information architecture.

## Implementation Notes

The smallest useful implementation should:

- Replace home/recent/all-songs navigation with a unified song workspace.
- Keep existing mock upload, processing, library, and practice APIs.
- Preserve the existing practice controls and saved practice state.
- Add responsive behavior:
  - split view on wide screens
  - list-first stack on mobile
- Make the entire song row clickable.
- Move rename/delete into selected-song header and mobile row actions where practical.
- Show active upload and processing jobs in the same list as completed songs.

Do not redesign the audio engine, backend storage, or harmonic cue model as part of this UX change.

Timeline navigation across trackpad, mouse, touchscreen, and keyboard is specified separately in `docs/engineering/TIMELINE_INTERACTION_CONTRACT.md`.
