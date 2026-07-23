# Timeline Interaction Contract

## Purpose

This document defines the normative timeline navigation and editing behavior across trackpad, mouse, touchscreen, and keyboard input.

Status: Product-reviewed on 2026-07-23; implementation and input-specific human verification remain pending.

The timeline uses the same navigation behavior during ordinary playback and `Edit timing`. Entering `Edit timing` adds timing-marker interactions but does not change the meaning of pan, zoom, seek, or `Follow`.

The implementation must respond to the input mechanisms that are present. It must not assume that a device supports only trackpad, mouse, touch, or keyboard input.

## Shared behavior

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

## `Follow` behavior

- `Follow` affects the viewport only while playback is running.
- During playback, `Follow` scrolls the viewport as needed to keep the playhead visible.
- `Follow` never changes the playback position or the playhead's time within the song.
- While playback is paused or stopped, enabling `Follow` does not move the viewport.
- Seeking while paused does not move the viewport merely because `Follow` is enabled.
- After playback starts or resumes, `Follow` may scroll the viewport to make the advancing playhead visible.
- `Follow` is suppressed in `Edit timing` without changing the saved ordinary-playback preference.

## Zoom anchoring

- A pointer-located zoom, including trackpad or touchscreen pinch, stays anchored on the timeline time beneath the gesture location.
- Zoom performed with the Zoom slider or keyboard stays anchored on the visible playhead while playback is running with `Follow` enabled; otherwise it stays anchored on the center of the visible timeline viewport.
- The anchor time remains at the same screen position after zooming unless clamping at the beginning or end of the song makes that impossible.
- While playback is running with `Follow` enabled, `Follow` may subsequently scroll after a pointer-located zoom to keep the advancing playhead visible.
- `Fit` does not use an anchor; it shows the complete song from time zero.

## Click, tap, and drag arbitration

- A primary-button click or one-finger tap on empty timeline space seeks to the corresponding song time.
- Seeking completes on release, not on initial press.
- If pointer movement exceeds the shared drag threshold, the interaction becomes a pan and must not also seek when released.
- A cancelled pointer interaction must not seek or commit an edit.
- Interactive elements take precedence over the timeline background in this order:
  1. timing-marker anchor
  2. playhead or other explicit control
  3. empty timeline space
- Activating a timing-marker anchor must not also seek or pan the timeline.

## Trackpad

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

## Mouse

- Moving the mouse only moves the pointer.
- Primary-button drag on empty timeline space pans horizontally and turns `Follow` off.
- Horizontal-wheel input pans when the mouse or external device provides it and turns `Follow` off.
- Ordinary vertical-wheel input scrolls the page and must not zoom the timeline or turn `Follow` off.
- The visible Zoom slider and `Fit` button are the primary mouse zoom controls.
- Moving the slider throughout its range must not enable or disable subsequent trackpad pinch gestures.
- A primary-button click on empty timeline space seeks on release.
- A pan must not also seek when the button is released.

## Touchscreen

- A horizontal one-finger gesture over empty timeline space pans the timeline and turns `Follow` off.
- A vertical one-finger gesture remains available for native page scrolling.
- Browser gesture arbitration should use `touch-action`; the application should not duplicate OS-level gesture recognition unnecessarily.
- A one-finger tap on empty timeline space seeks on release.
- A tap that becomes a pan must not also seek.
- A two-finger pinch zooms the timeline around the midpoint between the touches.
- Adding a second finger to an uncommitted gesture converts it to pinch without seeking or panning accidentally.
- Pinch works immediately from `Fit` and throughout the complete zoom range.
- The Zoom slider and `Fit` button remain available as single-pointer alternatives to pinch.

## Horizontal scrollbar

- The scrollbar represents the visible portion of the song and is available whenever zoom is greater than `Fit`.
- It may use an overlay or auto-hiding platform style, but it must become visible when the timeline is hovered, the scrollbar or timeline receives keyboard focus, or the timeline is being panned.
- It supports mouse interaction, track clicks where provided by the platform, and keyboard scrolling.
- Operating the scrollbar turns `Follow` off.
- At `Fit`, the scrollbar is hidden or disabled because the complete song is already visible.

## Keyboard

- The playback scrubber remains the primary keyboard control for changing the playback position.
- Seeking with the scrubber does not turn `Follow` off.
- The horizontal scrollbar provides keyboard panning without changing the playback position.
- The Zoom slider is keyboard operable using its native slider behavior.
- `Fit` is a focusable button and can be activated with `Enter` or `Space`.
- Interactive timing-marker anchors are keyboard focusable in `Edit timing`.
- Keyboard focus is visible.
- Keyboard users can leave the timeline and its controls using normal `Tab` navigation without a keyboard trap.

## Extra interactions in `Edit timing`

- Entering `Edit timing` exposes interactive timing-marker anchors.
- Clicking or tapping an anchor selects it without seeking or panning.
- Dragging a timing-marker anchor adjusts that marker and must not simultaneously pan the viewport.
- Releasing a valid marker drag commits the adjustment.
- Cancelling the drag restores the marker to its position at the start of the interaction.
- A selected marker has a visible selected state.
- A keyboard-focused marker can be locked using `Enter` or `Space`, then adjusted with the existing nudge controls.
- Timing-marker targets use a sufficiently large hit area even if their visible line or anchor is narrow.

## View state

- Ordinary-playback zoom and the `Follow` preference persist per song in `practiceState.timelineView`.
- The ordinary-playback horizontal position is transient.
- On entering `Edit timing`, initialize a temporary edit viewport from the current ordinary-playback zoom and horizontal position.
- Changes to the edit viewport do not modify the stored ordinary-playback zoom.
- On leaving `Edit timing`, restore the unchanged ordinary-playback viewport and discard the temporary edit viewport.
- Switching songs must not copy either viewport state to the other song.
- `Fit` affects only the currently active ordinary or edit viewport.
- Every zoom input uses the same minimum, maximum, and scale mapping as the visible Zoom slider.

## Current observed behavior

Human review on 2026-07-23 found that the implementation does not yet meet this contract:

- Trackpad pinch sometimes begins working only after the Zoom slider has first moved to roughly 30%.
- Pinch can stop working again after zooming back out.
- Automated synthetic pointer coverage does not reproduce the real Mac trackpad behavior because trackpad pan/pinch normally arrives through wheel gesture events rather than touchscreen-style pointer events.
- Current `Follow` behavior can reposition the viewport while playback is paused; the agreed contract limits `Follow` viewport movement to active playback.
- Current `Edit timing` starts at minimum zoom instead of inheriting and later restoring the ordinary-playback viewport.

Until a fix passes human trackpad review, use the visible Zoom slider and `Fit` as the reliable zoom path, plus the platform scrollbar where it is available for panning. The implementation and verification plan is tracked in `TASKS.md`.
