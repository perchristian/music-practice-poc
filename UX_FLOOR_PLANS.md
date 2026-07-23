# UX_FLOOR_PLANS.md

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

## Timeline Trackpad, Mouse, Touch, and Keyboard Contract

Status: Product-reviewed on 2026-07-23; implementation and input-specific human verification remain pending.

The timeline uses the same navigation behavior during ordinary playback and `Edit timing`. Entering `Edit timing` adds timing-marker interactions but does not change the meaning of pan, zoom, seek, or `Follow`.

The implementation must respond to the input mechanisms that are present. It must not assume that a device supports only trackpad, mouse, touch, or keyboard input.

### Shared behavior

- `Fit` means that the complete song is visible within the timeline viewport, starting at time zero.
- `Fit` is the minimum zoom level. It disables unnecessary horizontal scrolling without disabling later pinch, slider, or keyboard zoom.
- Zoom cannot go below `Fit` or above the maximum shown by the visible Zoom slider.
- Panning cannot move before the start or beyond the end of the song.
- Any intentional manual pan turns `Follow` off, including a pan made while playback is paused.
- Zooming and `Fit` do not change whether `Follow` is enabled.
- A pointer or touchscreen gesture changes the timeline only when its initial press or touch begins inside the timeline viewport.
- Wheel and trackpad-scroll input changes the timeline only while the pointer is over the timeline viewport.
- A gesture that begins outside the timeline must not start controlling it merely because the gesture later moves across it.
- If pointer capture is used, a gesture that starts inside the timeline may continue after the pointer leaves the viewport until release or cancellation.
- Timeline controls outside the viewport, including the Zoom slider, `Fit`, scrubber, and horizontal scrollbar, remain independently operable.

### `Follow` behavior

- `Follow` affects the viewport only while playback is running.
- During playback, `Follow` scrolls the viewport as needed to keep the playhead visible.
- `Follow` never changes the playback position or the playhead's time within the song.
- While playback is paused or stopped, enabling `Follow` does not move the viewport.
- Seeking while paused does not move the viewport merely because `Follow` is enabled.
- After playback starts or resumes, `Follow` may scroll the viewport to make the advancing playhead visible.
- `Follow` is suppressed in `Edit timing` without changing the saved ordinary-playback preference.

### Zoom anchoring

- A pointer-located zoom, including trackpad or touchscreen pinch, stays anchored on the timeline time beneath the gesture location.
- Zoom performed with the Zoom slider or keyboard stays anchored on the visible playhead while playback is running with `Follow` enabled; otherwise it stays anchored on the center of the visible timeline viewport.
- The anchor time remains at the same screen position after zooming unless clamping at the beginning or end of the song makes that impossible.
- While playback is running with `Follow` enabled, `Follow` may subsequently scroll after a pointer-located zoom to keep the advancing playhead visible.
- `Fit` does not use an anchor; it shows the complete song from time zero.

### Click, tap, and drag arbitration

- A primary-button click or one-finger tap on empty timeline space seeks to the corresponding song time.
- Seeking completes on release, not on initial press.
- If pointer movement exceeds the shared drag threshold, the interaction becomes a pan and must not also seek when released.
- A cancelled pointer interaction must not seek or commit an edit.
- Interactive elements take precedence over the timeline background in this order:
  1. timing-marker anchor
  2. playhead or other explicit control
  3. empty timeline space
- Activating a timing-marker anchor must not also seek or pan the timeline.

### Trackpad

The following behavior applies when the trackpad and browser provide the corresponding gesture. The horizontal scrollbar, Zoom slider, and `Fit` button remain available when a hardware gesture is unavailable.

- Moving one finger moves the pointer only; it does not pan or zoom the timeline.
- Horizontal two-finger scroll input pans the timeline left or right and turns `Follow` off.
- Vertical two-finger scroll input continues to scroll the page.
- Diagonal scroll input may contribute to both operations when the browser supplies both horizontal and vertical axes.
- Trackpad pinch zooms the timeline around the gesture location.
- Pinch works immediately from `Fit`; moving the Zoom slider first must never be required.
- Pinch continues working throughout the complete zoom range and after repeated pinch-in and pinch-out cycles.
- A primary-button click on empty timeline space seeks on release.
- Moving beyond the drag threshold converts a primary-button interaction to panning and suppresses the seek.

### Mouse

- Moving the mouse only moves the pointer.
- Primary-button drag on empty timeline space pans horizontally and turns `Follow` off.
- Horizontal-wheel input pans when the mouse or external device provides it and turns `Follow` off.
- Ordinary vertical-wheel input scrolls the page and must not zoom the timeline or turn `Follow` off.
- The visible Zoom slider and `Fit` button are the primary mouse zoom controls.
- Moving the slider throughout its range must not enable or disable subsequent trackpad pinch gestures.
- A primary-button click on empty timeline space seeks on release.
- A pan must not also seek when the button is released.

### Touchscreen

- A horizontal one-finger gesture over empty timeline space pans the timeline and turns `Follow` off.
- A vertical one-finger gesture remains available for native page scrolling.
- Browser gesture arbitration should use `touch-action`; the application should not duplicate OS-level gesture recognition unnecessarily.
- A one-finger tap on empty timeline space seeks on release.
- A tap that becomes a pan must not also seek.
- A two-finger pinch zooms the timeline around the midpoint between the touches.
- Adding a second finger to an uncommitted gesture converts it to pinch without seeking or panning accidentally.
- Pinch works immediately from `Fit` and throughout the complete zoom range.
- The Zoom slider and `Fit` button remain available as single-pointer alternatives to pinch.

### Horizontal scrollbar

- The scrollbar represents the visible portion of the song and is available whenever zoom is greater than `Fit`.
- It may use an overlay or auto-hiding platform style, but it must become visible when the timeline is hovered, the scrollbar or timeline receives keyboard focus, or the timeline is being panned.
- It supports mouse interaction, track clicks where provided by the platform, and keyboard scrolling.
- Operating the scrollbar turns `Follow` off.
- At `Fit`, the scrollbar is hidden or disabled because the complete song is already visible.

### Keyboard

- The playback scrubber remains the primary keyboard control for changing the playback position.
- Seeking with the scrubber does not turn `Follow` off.
- The horizontal scrollbar provides keyboard panning without changing the playback position.
- The Zoom slider is keyboard operable using its native slider behavior.
- `Fit` is a focusable button and can be activated with `Enter` or `Space`.
- Interactive timing-marker anchors are keyboard focusable in `Edit timing`.
- Keyboard focus is visible.
- Keyboard users can leave the timeline and its controls using normal `Tab` navigation without a keyboard trap.

### Extra interactions in `Edit timing`

- Entering `Edit timing` exposes interactive timing-marker anchors.
- Clicking or tapping an anchor selects it without seeking or panning.
- Dragging a timing-marker anchor adjusts that marker and must not simultaneously pan the viewport.
- Releasing a valid marker drag commits the adjustment.
- Cancelling the drag restores the marker to its position at the start of the interaction.
- A selected marker has a visible selected state.
- A keyboard-focused marker can be locked using `Enter` or `Space`, then adjusted with the existing nudge controls.
- Timing-marker targets use a sufficiently large hit area even if their visible line or anchor is narrow.

### View state

- Ordinary-playback zoom and the `Follow` preference persist per song in `practiceState.timelineView`.
- The ordinary-playback horizontal position is transient.
- On entering `Edit timing`, initialize a temporary edit viewport from the current ordinary-playback zoom and horizontal position.
- Changes to the edit viewport do not modify the stored ordinary-playback zoom.
- On leaving `Edit timing`, restore the unchanged ordinary-playback viewport and discard the temporary edit viewport.
- Switching songs must not copy either viewport state to the other song.
- `Fit` affects only the currently active ordinary or edit viewport.
- Every zoom input uses the same minimum, maximum, and scale mapping as the visible Zoom slider.

### Current observed behavior

Human review on 2026-07-23 found that the implementation does not yet meet this contract:

- Trackpad pinch sometimes begins working only after the Zoom slider has first moved to roughly 30%.
- Pinch can stop working again after zooming back out.
- Automated synthetic pointer coverage does not reproduce the real Mac trackpad behavior because trackpad pan/pinch normally arrives through wheel gesture events rather than touchscreen-style pointer events.
- Current `Follow` behavior can reposition the viewport while playback is paused; the agreed contract limits `Follow` viewport movement to active playback.
- Current `Edit timing` starts at minimum zoom instead of inheriting and later restoring the ordinary-playback viewport.

Until a fix passes human trackpad review, use the visible Zoom slider and `Fit` as the reliable zoom path, plus the platform scrollbar where it is available for panning. The implementation and verification plan is tracked in `TASKS.md`.
