# Member 2: Media Access - Saturday Accessibility Test Plan

**Tester Instructions:** These are your goals. Use the computer normally—no special instructions needed. If something doesn't work, tell the note-taker.

---

## Setup

**URL:** http://localhost:3000/demo (or sandbox URL provided)

**Browser:** Firefox + NVDA screen reader, or Chrome with TalkBack (mobile)

**What you'll test:**

1. Sign language window (moving, resizing, keyboard)
2. Audio description (playing, toggling, keyboard shortcut)
3. Offline save (downloading, progress, offline playback)

---

## Task 1: Find and Position the Sign Language Window

### Goal

"Find the sign language and place it where you like."

### What to try (no instructions given; you figure it out)

- [ ] Look for a sign language video on the lesson page
- [ ] Try moving it with your mouse
- [ ] Try moving it with keyboard (use arrow keys if you can find focus)
- [ ] Try making it bigger or smaller
- [ ] See if you can snap it to a corner or position
- [ ] Leave it in a comfortable spot

### Success Criteria (Member 2 fills this in after test)

- ✓ User found the sign window visually or via screen reader
- ✓ Mouse dragging works (moved window to new location)
- ✓ Keyboard navigation works (arrow keys moved or resized)
- ✓ Resize handles or Alt+arrow keys worked
- ✓ Window stayed within screen bounds (didn't get stuck)
- ✓ Position persisted when reloading page (optional, if time permits)

### Known Issues to Watch For

- Window goes off-screen
- Keyboard focus gets stuck
- Window can't be moved back on-screen
- Screen reader doesn't announce position changes
- Snap-to-corner buttons aren't reachable

---

## Task 2: Enable and Follow Audio Description

### Goal

"Follow the lesson with the audio description."

### What to try

- [ ] Look for audio description controls on the page
- [ ] Try playing the description (click play button or use keyboard shortcut)
- [ ] Listen as the description plays
- [ ] See if there's a text version you can read instead of (or with) audio
- [ ] Try the D key (D is the shortcut for toggling description)
- [ ] See if extended mode exists (pauses main lesson while description plays)
- [ ] Stop the description and resume the main lesson

### Success Criteria

- ✓ User found audio description control (via mouse or screen reader)
- ✓ Play button worked and audio played
- ✓ D key shortcut toggled description on/off
- ✓ Description synced with video (didn't lag or get ahead)
- ✓ Text version readable if audio wasn't clear
- ✓ Extended mode worked (if implemented): main video paused when description played
- ✓ Status messages were clear ("Description playing", "Description stopped")

### Known Issues to Watch For

- Audio doesn't play (check browser console)
- Audio out of sync with video
- Keyboard shortcut (D) doesn't work
- D key triggers global shortcuts (like dev tools)
- Screen reader doesn't announce status updates
- No fallback text description available
- Extended mode doesn't pause the main video

---

## Task 3: Save Lesson for Offline

### Goal

"Save the lesson for offline."

### What to try

- [ ] Look for a "Save for offline" button
- [ ] Click it (or navigate to it with keyboard)
- [ ] Watch the download progress (should show %, MB, or similar)
- [ ] Wait for download to complete
- [ ] Once saved, look for a "Delete offline copy" button (replaces the save button)
- [ ] (Optional) Turn on airplane mode in your browser or close the tab
- [ ] Try to play the lesson again without internet

### Success Criteria

- ✓ User found "Save for offline" button
- ✓ Download started and showed progress
- ✓ Download completed without errors
- ✓ Button changed to "Delete offline copy" after saving
- ✓ Page/status indicated success ("Saved offline", "1.2 MB saved")
- ✓ Offline playback worked (video, audio, captions all played)
- ✓ Lesson played without new network requests
- ✓ All media assets loaded from cache

### Known Issues to Watch For

- Download button disabled or grayed out
- No progress indication during download
- Download fails with network errors
- Unclear if download succeeded ("still loading?")
- "Delete" button doesn't work
- Offline playback fails (video doesn't play from cache)
- Some captions or media missing when offline
- Service worker didn't register (browser console shows errors)
- Download can't resume if interrupted

---

## Accessibility Checklist (Note-taker fills this in)

### Keyboard Navigation

- [ ] All buttons are reachable with Tab key
- [ ] Focus ring is visible (not hidden or invisible)
- [ ] Can navigate sign window with arrow keys
- [ ] Can toggle audio description with D key
- [ ] No keyboard traps (can always move focus away)
- [ ] Tab order is logical (not random)

### Screen Reader (NVDA / TalkBack)

- [ ] All buttons have accessible names (read aloud correctly)
- [ ] Sign window position changes are announced
- [ ] Audio description status is announced ("Playing", "Stopped")
- [ ] Download progress is announced
- [ ] Links and buttons are distinguishable (role announced)
- [ ] No duplicate or confusing announcements

### Visual / Motor

- [ ] Sign window handles are reachable (large enough, at corners)
- [ ] Buttons are at least 44x44 pixels
- [ ] Clickable areas don't overlap or cause accidental activation
- [ ] Resize handle is clearly visible
- [ ] Motion/animations aren't excessive (no flashing)
- [ ] All text has sufficient contrast (dark on light or light on dark)

### Slow Network / Low-End Device

- [ ] Download progresses smoothly even on Slow 3G
- [ ] Sign window still works without lag
- [ ] Audio description starts playback promptly
- [ ] No console errors about missing resources
- [ ] Page doesn't freeze during download

---

## Issues Found

### Critical (App doesn't work)

| Issue              | How to Reproduce | Impact | Fix Priority |
| ------------------ | ---------------- | ------ | ------------ |
| (filled by tester) |                  |        | P0           |
|                    |                  |        |              |

### High (Feature doesn't work as intended)

| Issue              | How to Reproduce | Impact | Fix Priority |
| ------------------ | ---------------- | ------ | ------------ |
| (filled by tester) |                  |        | P1           |
|                    |                  |        |              |

### Medium (Accessibility or usability gap)

| Issue              | How to Reproduce | Impact | Fix Priority |
| ------------------ | ---------------- | ------ | ------------ |
| (filled by tester) |                  |        | P2           |
|                    |                  |        |              |

---

## Notes from Tester

(Space for qualitative feedback)

- What went smoothly?
- What was confusing?
- Any other observations?

---

## Member 2's Response (Same Day)

Top 3 issues fixed:

1. [ ] Issue #___ - Fixed in commit ___
2. [ ] Issue #___ - Fixed in commit ___
3. [ ] Issue #___ - Fixed in commit ___

Remaining issues (explanation):

- Issue #___ - By design / will fix Monday / depends on Member X

---

## Sign-Off

- **Tester Name:** _________________ **Date:** _____
- **Member 2:** _________________ **Fixes Completed:** _____ / 3

---

**Template used:** Member 2 Media Access - Saturday Accessibility Test
**Test Date:** Saturday, [DATE]
**Browser:** [Chrome / Firefox / Safari] on [Desktop / Mobile]
**Assistive Tech:** [NVDA / JAWS / TalkBack / None]
**Network:** [Normal / Slow 3G / Offline]
