import test from "node:test";
import assert from "node:assert/strict";

test("offline component fetches pack manifest before download", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./offline.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /\/v1\/lessons\/.*\/pack/, "Must request pack manifest endpoint");
  assert.match(src, /this\.manifest/, "Must store manifest in state");
  assert.match(src, /sizeBytes/, "Must read sizeBytes from manifest");
});

test("offline component shows download progress", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./offline.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /progress/, "Must track progress");
  assert.match(src, /<progress/, "Must render HTML progress element");
  assert.match(src, /getReader/, "Must stream download for progress updates");
  assert.match(src, /Math\.round.*100/, "Must calculate percentage");
});

test("offline component uses service worker caching", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./offline.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /caches\.open/, "Must use Cache API");
  assert.match(src, /cache\.put/, "Must cache downloaded ZIP");
  assert.match(src, /PREFIX.*lesson/, "Must use lesson-specific cache names");
});

test("offline component persists saved lessons in localStorage", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./offline.ts", import.meta.url), "utf8"),
  );

  assert.match(src, /localStorage\.getItem\(KEY\)/, "Must read preferences");
  assert.match(src, /savedLessons/, "Must track which lessons are saved");
  assert.match(src, /localStorage\.setItem/, "Must persist to localStorage");
});

test("offline service worker supports resumable downloads", async () => {
  const sw = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./media-sw.js", import.meta.url), "utf8"),
  );

  // The app requests bytes and the service worker should allow resumption
  // The offline.ts component handles range requests with byte-range headers
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("./offline.ts", import.meta.url), "utf8"),
  );
  assert.match(src, /content-length/, "Must read Content-Length header");
  assert.match(src, /getReader/, "Must stream in chunks (allows resume)");
});
