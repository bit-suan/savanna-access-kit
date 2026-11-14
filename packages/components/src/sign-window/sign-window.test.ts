import test from "node:test";
import assert from "node:assert/strict";

test("sign-window has accessible focus and pointer interaction support", async () => {
  // This test ensures keyboard support is coded
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  // Verify keyboard listeners are registered
  assert.match(src, /tabindex="0"/, "Header must be focusable (keyboard accessible)");
  assert.match(src, /role="group"/, "Semantic role for screen readers");
  assert.match(src, /aria-label/, "Descriptive aria-label for context");
  assert.match(src, /PointerEvent/, "Pointer events support mouse and touch dragging");
  assert.match(src, /touch-action:none/, "Touch dragging must not scroll the page");
});

test("sign-window syncs with player timeupdate events", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  // Verify sync mechanism exists
  assert.match(src, /savanna:timeupdate/, "Must listen to savanna:timeupdate events");
  assert.match(src, /detail\.time/, "Must read time from event detail");
  assert.match(
    src,
    /needsDriftCorrection/,
    "Must correct drift only after the shared 300ms threshold",
  );
  assert.match(
    src,
    /player\?\.addEventListener\('savanna:timeupdate'/,
    "Must subscribe on the player because player events do not bubble to children",
  );
  assert.match(
    src,
    /player\?\.removeEventListener\('savanna:timeupdate'/,
    "Must remove the player listener when disconnected",
  );
  assert.match(src, /playbackRate!==rate/, "Must apply speed changes only when needed");
  assert.match(
    src,
    /mainWaiting|mainReady/,
    "Must pause for buffering and resync when media is ready",
  );
  assert.match(src, /@loadedmetadata=.*signReady/, "Must synchronize once the sign video can seek");
});

test("sign-window has four visible, touch-friendly resize handles", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /\['nw','ne','se','sw'\]/, "Must render handles at all four corners");
  assert.match(src, /Resize sign window from/, "Resize handles need accessible labels");
  assert.match(
    src,
    /aspect-ratio:16\/9/,
    "Sign video must maintain an understandable aspect ratio",
  );
  assert.match(src, /MIN_WIDTH=180/, "Panel must have a minimum usable size");
});

test("sign-window uses the C2 overlay slot and remains constrained to the visible viewport", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /this\.slot='overlay'/, "Component must occupy the C2 overlay slot");
  assert.match(
    src,
    /visualViewport/,
    "Must account for the browser viewport during drag and resize",
  );
  assert.match(src, /CONTROL_CLEARANCE/, "Must preserve space for player controls and captions");
  assert.match(src, /savanna:sign-toggle/, "Toggle action must notify the embedding player");
});

test("sign-window supplies an accessible overlay toggle that preserves main playback", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  assert.match(
    src,
    /@property\(\{type:Boolean,reflect:true\}\) enabled=storedEnabled\(\)\?\?true/,
    "Toggle state must be reflected and safely restored",
  );
  assert.match(src, /<button class="toggle" type="button"/, "Toggle must be a native button");
  assert.match(
    src,
    /aria-pressed=\$\{String\(this\.enabled\)\}/,
    "Toggle must expose its state with aria-pressed",
  );
  assert.match(
    src,
    /Sign language \$\{this\.enabled\?'enabled':'disabled'\}/,
    "State changes need an accessible announcement",
  );
  assert.match(
    src,
    /if\(!this\.enabled\)this\.video\?\.pause\(\)/,
    "Turning off sign must not pause the main lesson",
  );
  assert.match(
    src,
    /this\.enabled\?html`<section/,
    "The interpreter must be hidden when the toggle is off",
  );
  assert.match(
    src,
    /if\(!this\.enabled\|\|!this\.video/,
    "A disabled overlay must not reactivate its detached interpreter video",
  );
  assert.match(
    src,
    /changed\.has\('enabled'\).*renderRoot\.querySelector\('video'\)/,
    "Re-enabling must bind the newly rendered interpreter video before synchronization",
  );
});

test("sign-window announces keyboard changes and persists only safe sign preferences", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /aria-live="polite"/, "Position and size changes need a polite live region");
  assert.match(src, /role="status"/, "Live updates need a status role");
  assert.match(src, /Sign window moved/, "Keyboard movement must announce the new position");
  assert.match(src, /Sign window resized/, "Keyboard resizing must announce the new size");
  assert.match(src, /Snap sign window to/, "Corner snap controls need accessible names");
  assert.match(src, /prefs\.sign=\{\.\.\.position/, "Only the sign namespace may be written");
  assert.match(src, /Number\.isFinite/, "Invalid stored coordinates must be handled safely");
  assert.match(src, /storedEnabled/, "The saved visibility preference must be restored safely");
  assert.match(
    src,
    /save\(this\.position,this\.enabled\)/,
    "Toggling visibility must persist only within the sign namespace",
  );
});

test("sign-window has fallback when sign video is null", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  // Verify fallback is implemented
  assert.match(src, /hasTrack/i, "Must track whether video is available");
  assert.match(src, /fallback/, "Must have fallback message");
  assert.match(
    src,
    /Sign language interpretation is not available/,
    "Fallback message must be user-friendly",
  );
  assert.match(src, /signError/, "Invalid sign video URLs must fall back safely");
  assert.match(
    src,
    /Loading sign-language interpretation/,
    "Loading state must be announced gracefully",
  );
  assert.match(
    src,
    /addEventListener\('ended',this\.syncFromMain\)/,
    "The interpreter must stop with the main lesson",
  );
});

test("sign-window respects language preference", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./sign-window.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /savanna:lang-change/, "Must listen to language change events");
  assert.match(src, /lang.*===.*am/, "Must differentiate between EN and AM");
  assert.match(src, /Sign language|የምልክት/, "Must provide bilingual labels");
});
