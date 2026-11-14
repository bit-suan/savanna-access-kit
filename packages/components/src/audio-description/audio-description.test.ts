import test from "node:test";
import assert from "node:assert/strict";

test("audio-description exposes a player-owned D-key integration point", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /public toggle\(\)/, "The owning player must be able to invoke the AD toggle");
  assert.doesNotMatch(
    src,
    /window\.addEventListener\('keydown'/,
    "The component must not compete with Member 1's global D shortcut",
  );
});

test("audio-description supports text and audio modes", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  // Verify both modes
  assert.match(src, /'audio'/i, "Recorded audio mode must be supported");
  assert.match(src, /'text'/i, "Text description mode must be supported");
  assert.match(src, /select.*option/, "User must be able to switch modes");
});

test("audio-description extended mode pauses video", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /extended/, "Extended mode property must exist");
  assert.match(src, /this\.media\?.pause\(\)/, "Must pause main video in extended mode");
  assert.match(src, /checkbox/, "Checkbox to toggle extended mode");
});

test("audio-description syncs with player timeupdate", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /savanna:timeupdate/, "Must listen to timeupdate events");
  assert.match(src, /Math.abs.*\.45/, "Must sync within 450ms threshold");
  assert.match(src, /currentTime/, "Must adjust audio currentTime");
  assert.match(
    src,
    /player\?\.addEventListener\('savanna:timeupdate'/,
    "Must subscribe on the C2 player; player events do not bubble to children",
  );
  assert.match(
    src,
    /player\?\.removeEventListener\('savanna:timeupdate'/,
    "Must clean up the C2 listener",
  );
});

test("audio-description exposes and persists an on/off state", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  assert.match(
    src,
    /aria-pressed=\$\{String\(this\.p\.enabled\)\}/,
    "The main control must expose whether descriptions are on",
  );
  assert.match(
    src,
    /this\.p=\{\.\.\.this\.p,enabled:false\};this\.save\(\)/,
    "Stopping must persist the disabled state",
  );
  assert.match(
    src,
    /private descriptionEnded=.*enabled:false/,
    "Ending an AD track must disable it so player events cannot restart it",
  );
});

test("audio-description has live region status announcements", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./audio-description.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /aria-live\s*=\s*["']polite["']/, "Status region must have aria-live polite");
  assert.match(src, /role\s*=\s*["']status["']/, "Status region must have role=status");
  assert.match(src, /this\.status\s*=/, "Must update status text for screen readers");
});
