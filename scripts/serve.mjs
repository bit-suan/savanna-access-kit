import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const fixturesRoot = path.join(root, "contracts/fixtures");
const port = process.env.PORT || 8080;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".vtt": "text/vtt; charset=utf-8",
  ".opus": "audio/ogg; codecs=opus",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
  ".brf": "text/plain; charset=utf-8",
};

function sendFile(req, res, filePath, customHeaders = {}) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = customHeaders["Content-Type"] || MIME_TYPES[ext] || "application/octet-stream";

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Accept-Ranges": "bytes",
    "Content-Type": contentType,
    ...customHeaders,
  };

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    if (start >= stat.size || end >= stat.size) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      res.end();
      return;
    }
    const chunksize = end - start + 1;
    headers["Content-Range"] = `bytes ${start}-${end}/${stat.size}`;
    headers["Content-Length"] = chunksize;
    res.writeHead(206, headers);
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    headers["Content-Length"] = stat.size;
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  // Global CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost:8080"}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. DID Document
  if (pathname === "/.well-known/did.json") {
    const host = req.headers.host || "localhost:8080";
    const did = `did:web:${encodeURIComponent(host)}`;
    const data = {
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
      id: did,
      controller: did,
      verificationMethod: [{
        id: `${did}#key-1`,
        type: "Multikey",
        controller: did,
        publicKeyJwk: { kty: "OKP", crv: "Ed25519", x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo" }
      }],
      assertionMethod: [`${did}#key-1`],
      authentication: [`${did}#key-1`]
    };
    res.writeHead(200, { "Content-Type": "application/did+json" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  // 2. Open Badges JSON-LD Endpoint
  const verifyJsonMatch = pathname.match(/^\/verify\/([\w-]+)\.json$/);
  if (verifyJsonMatch) {
    const host = req.headers.host || "localhost:8080";
    const id = verifyJsonMatch[1];
    const data = {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
      ],
      id: `http://${host}/verify/${id}`,
      type: ["VerifiableCredential", "OpenBadgeCredential"],
      name: "Digital Bridge — Accessible Media Basics",
      issuer: {
        id: `did:web:${encodeURIComponent(host)}`,
        type: ["Profile"],
        name: "Savanna Access Kit"
      },
      validFrom: "2026-11-12T08:00:00.000Z",
      credentialSubject: {
        id: "urn:savanna:learner:demo-001",
        type: ["AchievementSubject"],
        name: "Demo Learner",
        achievement: {
          id: `http://${host}/achievements/Digital%20Bridge%20%E2%80%94%20Accessible%20Media%20Basics`,
          type: ["Achievement"],
          name: "Digital Bridge — Accessible Media Basics",
          description: "ኮርሱን ከጨረሰ በኋላ በሳቫና ተደራሽነት ኪት የተሰጠ። (Issued by Savanna Access Kit upon module completion)",
          achievementType: "Certificate"
        }
      },
      proof: {
        type: "DataIntegrityProof",
        cryptosuite: "eddsa-rdfc-2022",
        created: "2026-11-12T08:00:00.000Z",
        verificationMethod: `did:web:${encodeURIComponent(host)}#key-1`,
        proofPurpose: "assertionMethod",
        proofValue: "z24W8nkg9kX4n7yvW8mQPJvL319dkmq2vH8aK9nLQp..."
      }
    };
    res.writeHead(200, { "Content-Type": "application/ld+json" });
    res.end(JSON.stringify(data, null, 2));
    return;
  }

  // 3. Human Verify Page
  if (pathname === "/verify" || pathname.startsWith("/verify/")) {
    sendFile(req, res, path.join(root, "verify/index.html"), { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  // 4. Pack ZIP file
  const packMatch = pathname.match(/^\/(?:api\/)?v1\/lessons\/([\w-]+)\/(?:pack\.zip|offline-pack)$/);
  if (packMatch) {
    const id = packMatch[1];
    const zipPath = path.join(fixturesRoot, "v1/lessons", id, "pack.zip");
    if (fs.existsSync(zipPath)) {
      sendFile(req, res, zipPath, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${id}-pack.zip"`
      });
      return;
    }
  }

  // 5. Canonical /v1 and /api/v1 JSON API routes
  if (pathname.startsWith("/v1/") || pathname.startsWith("/api/v1/")) {
    const apiPath = pathname.replace(/^\/api/, "");
    const lang = parsedUrl.searchParams.get("lang");
    let candidate = lang ? path.resolve(fixturesRoot, "." + apiPath + `.${lang}.json`) : "";
    if (!candidate || !fs.existsSync(candidate)) {
      candidate = path.resolve(fixturesRoot, "." + apiPath + ".json");
    }
    if (candidate.startsWith(fixturesRoot + path.sep) && fs.existsSync(candidate)) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(fs.readFileSync(candidate, "utf8"));
      return;
    }
  }

  // 6. Direct /media/ requests
  if (pathname.startsWith("/media/")) {
    const rel = pathname.substring(7);
    const mediaFile = path.resolve(fixturesRoot, "media", rel);
    if (mediaFile.startsWith(path.join(fixturesRoot, "media")) && fs.existsSync(mediaFile)) {
      sendFile(req, res, mediaFile);
      return;
    }
  }

  // 7. General static files
  let localFile = path.resolve(root, "." + pathname);
  if (fs.existsSync(localFile) && fs.statSync(localFile).isDirectory()) {
    localFile = path.join(localFile, "index.html");
  } else if (!fs.existsSync(localFile) && fs.existsSync(localFile + ".html")) {
    localFile = localFile + ".html";
  }

  if (localFile.startsWith(root) && fs.existsSync(localFile) && !fs.statSync(localFile).isDirectory()) {
    sendFile(req, res, localFile);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/problem+json" });
  res.end(JSON.stringify({ title: "Not found", status: 404 }));
});

if (!process.env.VERCEL) {
  server.listen(port, () => {
    console.log(`\n🚀 Savanna Web Server running at http://localhost:${port}/`);
    console.log(`   - Portal: http://localhost:${port}/`);
    console.log(`   - Lesson Demo: http://localhost:${port}/savanna/pages/concept-with-navigation.html`);
    console.log(`   - Career Gateway: http://localhost:${port}/savanna/pages/jobs.html`);
    console.log(`   - Portable Verifier: http://localhost:${port}/verify/C-7`);
    console.log(`   - Audio Description Studio: http://localhost:${port}/demo/audio-description-editor/index.html\n`);
  });
}

export default server;
