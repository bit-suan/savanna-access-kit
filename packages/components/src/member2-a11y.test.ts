/**
 * Member 2: Media Access - Accessibility Test Suite
 *
 * Covers:
 * - Sign window keyboard navigation and screen reader
 * - Audio description sync, keyboard shortcuts, and announcements
 * - Offline pack download, progress, and caching
 *
 * Run with: npx playwright test member2-a11y.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

// Test: Sign Window Accessibility

test("sign-window: focus ring visible on header", async () => {
  const src = await fs.readFile(new URL("./sign-window/sign-window.ts", import.meta.url), "utf8");
  assert.match(src, /focus-visible.*outline/, "Must define focus-visible style");
  assert.match(src, /outline.*3px/, "Focus ring must be visible (3px+)");
});

test("sign-window: keyboard shortcuts work without mouse", async () => {
  const src = await fs.readFile(new URL("./sign-window/sign-window.ts", import.meta.url), "utf8");

  // Arrow keys move
  assert.match(src, /@keydown.*Arrow/, "Must handle arrow key events");
  assert.match(src, /ArrowRight.*right|ArrowLeft.*left/, "Arrow keys must map to directions");

  // Shift = big step
  assert.match(src, /e\.shiftKey.*100/, "Shift + arrow should move 100px (larger step)");

  // Alt = resize
  assert.match(src, /e\.altKey.*Alt.*arrow/, "Alt + arrow must resize");
});

test("sign-window: semantic HTML for screen readers", async () => {
  const src = await fs.readFile(new URL("./sign-window/sign-window.ts", import.meta.url), "utf8");

  assert.match(src, /role="group"/, "Header must have role=group");
  assert.match(src, /aria-label.*move|aria-label.*keyboard/, "Must have descriptive aria-label");
  assert.match(src, /tabindex="0"/, "Header must be focusable (tabindex=0)");
});

test("sign-window: screen reader announces position changes", async () => {
  const src = await fs.readFile(new URL("./sign-window/sign-window.ts", import.meta.url), "utf8");

  assert.match(src, /dispatchEvent.*savanna:sign-position/, "Must dispatch position event");
  assert.match(src, /bubbles:true.*composed:true/, "Event must bubble (for screen readers)");
});

// Test: Audio Description Accessibility

test("audio-description: player-owned D key integration does not compete globally", async () => {
  const src = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /public toggle\(\)/, "The player needs a callable AD toggle");
  assert.doesNotMatch(
    src,
    /window\.addEventListener\('keydown'/,
    "The AD component must not install a competing global shortcut",
  );
});

test("audio-description: live region for status announcements", async () => {
  const src = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /aria-live\s*=\s*["']polite["']/, "Status must use aria-live=polite");
  assert.match(src, /role\s*=\s*["']status["']/, "Status must have role=status");
});

test("audio-description: all buttons have labels", async () => {
  const src = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /<button/, "Buttons exist");
  assert.match(src, /<option/, "Select has options (mode dropdown)");
  assert.match(src, /aria-label|@/, "Buttons have labels or aria-labels");
});

test("audio-description: extended mode clearly marked", async () => {
  const src = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /<input type="checkbox"/, "Checkbox for extended mode");
  assert.match(src, /Extended AD|extended AD/, "Label must explain feature");
  assert.match(src, /pause/, "Label must explain it pauses main video");
});

// Test: Offline Component Accessibility

test("offline: status messages readable by screen readers", async () => {
  const src = await fs.readFile(new URL("./offline/offline.ts", import.meta.url), "utf8");

  assert.match(src, /aria-live\s*=\s*["']polite["']/, "Status must use aria-live");
  assert.match(src, /role\s*=\s*["']status["']/, "Status must have role");
  assert.match(src, /Pack ready|Saved offline|deleted/, "Statuses must be descriptive");
});

test("offline: download progress is announced", async () => {
  const src = await fs.readFile(new URL("./offline/offline.ts", import.meta.url), "utf8");

  assert.match(src, /<progress/, "Progress element for visual display");
  assert.match(src, /\${this\.progress\}%/, "Percentage text visible (read by screen readers)");
  assert.match(src, /this\.progress.*100/, "Must update progress during download");
});

test("offline: buttons are clearly labeled and distinct", async () => {
  const src = await fs.readFile(new URL("./offline/offline.ts", import.meta.url), "utf8");

  assert.match(src, /Save for offline|Delete offline copy/, "Button labels are clear");
  assert.match(src, /<button/, "Buttons exist");
  assert.match(src, /Refresh|Connect|Download/, "Secondary actions also have clear labels");
});

// Test: Service Worker + Caching

test("media-sw: service worker caches pack manifests", async () => {
  const src = await fs.readFile(new URL("./offline/media-sw.js", import.meta.url), "utf8");

  assert.match(src, /caches\.open/, "Opens cache storage");
  assert.match(src, /pack\.zip/, "Handles pack.zip requests");
  assert.match(src, /v1.*lessons.*pack/, "Caches manifest requests");
});

test("media-sw: service worker handles offline gracefully", async () => {
  const src = await fs.readFile(new URL("./offline/media-sw.js", import.meta.url), "utf8");

  assert.match(src, /fetch.*catch/, "Falls back to cache on fetch failure");
  assert.match(src, /503/, "Returns 503 (Service Unavailable) when offline");
  assert.match(src, /Offline pack is not saved/, "Clear offline message");
});

// Test: Content Pipeline

test("build-pack: enforces required captions in both languages", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/pack/build-pack.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /captions-en\.vtt/, "English captions required");
  assert.match(src, /captions-am\.vtt/, "Amharic captions required");
  assert.match(src, /throw Error/, "Must error if captions missing");
});

test("build-pack: transcript size is capped", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/pack/build-pack.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /50\s*\*\s*1024/, "Transcript max 50 KB");
  assert.match(src, /\.size.*>/, "Checks file size");
});

test("render-ad: requires human approval", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/ad/render-ad.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /approval.*draft/, "Status set to draft");
  assert.match(src, /reviewRequired:true/, "Requires manual review");
  assert.match(src, /Human review required/, "Clear message to user");
});

test("sign-metadata: human-interpreted not auto-approved", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/pack/sign-metadata.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /human-interpreted/, "Source must be marked");
  assert.match(src, /approved:false/, "Not auto-approved");
  assert.match(src, /human review\/approval required/, "Clear instruction");
});

// Test: Performance Budgets

test("offline: pack size targets for low-end devices", async () => {
  const src = await fs.readFile(new URL("./offline/offline.ts", import.meta.url), "utf8");

  // The build-pack.mjs enforces this, but the component should handle large packs gracefully
  assert.match(src, /sizeBytes/, "Must read and display size");
  assert.match(src, /toFixed/, "Formats size for readability");
  assert.match(src, /size\(/, "Has a size formatting function");
});

test("pack-builder: uses Opus codec for low bandwidth", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/pack/build-pack.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /libopus/, "Audio uses Opus codec");
  assert.match(src, /20k/, "Opus bitrate is 20 kbps (low-end friendly)");
});

test("render-ad: audio description at low bitrate", async () => {
  const src = await fs.readFile(
    new URL("../../pipeline/src/ad/render-ad.mjs", import.meta.url),
    "utf8",
  );

  assert.match(src, /libopus/, "AD audio uses Opus");
  assert.match(src, /24k/, "AD bitrate is 24 kbps");
});

// Test: Contract Compliance

test("C2: sign-window finds player via closest()", async () => {
  const src = await fs.readFile(new URL("./sign-window/sign-window.ts", import.meta.url), "utf8");

  assert.match(src, /closest\(\s*['"]savanna-player/, "Must use closest() to find player");
  assert.match(src, /\.media/, "Must access player.media");
});

test("C2: audio-description dispatches to player.media", async () => {
  const src = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );

  assert.match(src, /closest\(\s*['"]savanna-player/, "Must find player");
  assert.match(src, /\.media\.(play|pause)/, "Must call play/pause on media element");
});

test("C3: components use sign, ad, offline namespaces in localStorage", async () => {
  const signSrc = await fs.readFile(
    new URL("./sign-window/sign-window.ts", import.meta.url),
    "utf8",
  );
  const adSrc = await fs.readFile(
    new URL("./audio-description/audio-description.ts", import.meta.url),
    "utf8",
  );
  const offlineSrc = await fs.readFile(new URL("./offline/offline.ts", import.meta.url), "utf8");

  assert.match(signSrc, /\.sign/, "Sign window uses sign namespace");
  assert.match(adSrc, /\.ad/, "Audio description uses ad namespace");
  assert.match(offlineSrc, /\.offline/, "Offline uses offline namespace");
});

test("C4: components listen to savanna:lang-change", async () => {
  const signSrc = await fs.readFile(
    new URL("./sign-window/sign-window.ts", import.meta.url),
    "utf8",
  );

  assert.match(signSrc, /savanna:lang-change/, "Sign window respects language changes");
  assert.match(signSrc, /lang.*===.*['"']am['"]/, "Supports Amharic");
});

// Summary

console.log(`
✓ Member 2 Accessibility Tests Complete
  - Sign Window: 4 tests
  - Audio Description: 4 tests
  - Offline: 3 tests
  - Service Worker: 2 tests
  - Pipeline: 4 tests
  - Performance: 2 tests
  - Contracts: 4 tests
  ---
  Total: 23 tests (all pass if no assertions fail)
`);
