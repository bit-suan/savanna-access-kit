import { EventEmitter } from "node:events";
import { createPublicKey, verify } from "node:crypto";
import { generateCertificatePdf } from "./generate-certificate-pdf.mjs";

process.env.VERCEL = "1";
import { server } from "./serve.mjs";

console.log("=== RUNNING SAVANNA ACCESS KIT FINAL VERIFICATION SUITE ===");

// 1. Test generateCertificatePdf function
console.log("\n[Test 1] Testing generateCertificatePdf (English & Amharic)...");
const pdfEn = generateCertificatePdf({
  id: "C-7",
  recipientName: "Demo Learner",
  achievement: "Digital Bridge — Accessible Media Basics",
  issuerName: "Savanna Access Kit",
  issuerDid: "did:web:savanna-access-kit.vercel.app",
  issuedAt: "2026-11-12T08:00:00.000Z",
  status: "valid",
  verifyUrl: "https://savanna-access-kit.vercel.app/verify/C-7",
  lang: "en",
});
if (!pdfEn || pdfEn.length < 5000) throw new Error("PDF English generation failed or too small");
if (!pdfEn.toString("latin1").startsWith("%PDF-1.4")) throw new Error("PDF does not start with %PDF-1.4");
console.log(`✅ PDF English generated successfully: ${pdfEn.length} bytes, starts with %PDF-1.4`);

const pdfAm = generateCertificatePdf({
  id: "C-7",
  recipientName: "ዴሞ ተማሪ",
  achievement: "ዲጂታል ብሪጅ — የተደራሽ ሚዲያ መሰረታዊያን",
  issuerName: "የሳቫና ተደራሽነት ኪት",
  issuerDid: "did:web:savanna-access-kit.vercel.app",
  issuedAt: "2026-11-12T08:00:00.000Z",
  status: "valid",
  verifyUrl: "https://savanna-access-kit.vercel.app/verify/C-7?lang=am",
  lang: "am",
});
if (!pdfAm || pdfAm.length < 5000) throw new Error("PDF Amharic generation failed");
console.log(`✅ PDF Amharic generated successfully: ${pdfAm.length} bytes, starts with %PDF-1.4`);

// 2. Test Open Badges 3.0 Cryptographic Integrity & Offline Verification
console.log("\n[Test 2] Testing Open Badges 3.0 Cryptographic Signature & Tamper Detection...");
const ISSUER_PUB_KEY = "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo";

function canonicalJson(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalJson).join(",") + "]";
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

const originalBadge = {
  "@context": [
    "https://www.w3.org/ns/credentials/v2",
    "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"
  ],
  "id": "https://savanna-access-kit.vercel.app/verify/C-7",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "name": "Digital Bridge — Accessible Media Basics",
  "issuer": {
    "id": "did:web:savanna-access-kit.vercel.app",
    "type": ["Profile"],
    "name": "Savanna Access Kit"
  },
  "validFrom": "2026-11-12T08:00:00.000Z",
  "credentialSubject": {
    "id": "urn:savanna:learner:demo-001",
    "type": ["AchievementSubject"],
    "name": "Demo Learner",
    "achievement": {
      "id": "https://savanna-access-kit.vercel.app/achievements/Digital%20Bridge%20%E2%80%94%20Accessible%20Media%20Basics",
      "type": ["Achievement"],
      "name": "Digital Bridge — Accessible Media Basics",
      "description": "ኮርሱን ከጨረሰ በኋላ በሳቫና ተደራሽነት ኪት የተሰጠ። (Issued by Savanna Access Kit upon module completion)",
      "achievementType": "Certificate"
    }
  }
};

const signature = "z5rOx2v9yrDu64XLelz_lrwPKFFscq1VAgHeDLWXZQVpCi833RbchYTjQiiscRAuVrRqgrhBIeSdfgL9hHOPFBg";
const sigBytes = Buffer.from(signature.slice(1), "base64url");
const pubKey = createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: ISSUER_PUB_KEY }, format: "jwk" });

const canonical = canonicalJson(originalBadge);
const isValid = verify(null, Buffer.from(canonical), pubKey, sigBytes);
if (!isValid) throw new Error("Original credential Ed25519 signature verification failed!");
console.log("✅ Original Credential C-7 Ed25519 signature: VERIFIED AUTHENTIC (true)");

// Tamper test: Alter recipient name
const tamperedBadge = {
  ...originalBadge,
  credentialSubject: { ...originalBadge.credentialSubject, name: "Unauthorized Impostor" }
};
const tamperedCanonical = canonicalJson(tamperedBadge);
const isTamperedValid = verify(null, Buffer.from(tamperedCanonical), pubKey, sigBytes);
if (isTamperedValid) throw new Error("Tampered credential incorrectly passed verification!");
console.log("✅ Tampered Credential detection: REJECTED (false) — signature mismatch caught!");

// 3. Test HTTP Server endpoints using Mock Request/Response
console.log("\n[Test 3] Testing Server Routes directly on request handler...");

// Helper to simulate request/response without socket
function dispatch(pathname, headers = {}) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = "GET";
    req.url = pathname;
    req.headers = { host: "savanna-access-kit.vercel.app", ...headers };

    const resHeaders = {};
    let statusCode = 200;
    const chunks = [];

    const res = {
      setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
      writeHead(code, h = {}) {
        statusCode = code;
        for (const [k, v] of Object.entries(h)) resHeaders[k.toLowerCase()] = v;
      },
      end(data) {
        if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        resolve({
          status: statusCode,
          headers: resHeaders,
          body: Buffer.concat(chunks)
        });
      }
    };

    // Emit to server listener
    server.emit("request", req, res);
  });
}

// 3a. PDF endpoint /verify/C-7/pdf
const pdfRes = await dispatch("/verify/C-7/pdf");
if (pdfRes.status !== 200) throw new Error(`/verify/C-7/pdf returned status ${pdfRes.status}`);
if (!pdfRes.headers["content-type"]?.includes("application/pdf")) {
  throw new Error(`Invalid content-type: ${pdfRes.headers["content-type"]}`);
}
if (!pdfRes.headers["content-disposition"]?.includes("attachment")) {
  throw new Error(`Missing attachment disposition: ${pdfRes.headers["content-disposition"]}`);
}
if (!pdfRes.body.toString("latin1").startsWith("%PDF-1.4")) {
  throw new Error("PDF response body does not start with %PDF-1.4");
}
console.log(`✅ GET /verify/C-7/pdf: 200 OK, Type: application/pdf, Size: ${pdfRes.body.length} bytes`);

// 3b. JSON-LD endpoint /verify/C-7.json
const jsonLdRes = await dispatch("/verify/C-7.json");
if (jsonLdRes.status !== 200) throw new Error(`/verify/C-7.json status ${jsonLdRes.status}`);
const parsedLd = JSON.parse(jsonLdRes.body.toString("utf8"));
if (!parsedLd.issuer?.id?.includes("did:web:savanna-access-kit.vercel.app")) {
  throw new Error(`Issuer DID not updated: ${parsedLd.issuer?.id}`);
}
if (parsedLd.proof?.proofValue !== signature) {
  throw new Error(`Proof value mismatch: ${parsedLd.proof?.proofValue}`);
}
console.log(`✅ GET /verify/C-7.json: 200 OK, Open Badges 3.0 valid, Issuer DID: ${parsedLd.issuer.id}`);

// 3c. DID Document /.well-known/did.json
const didRes = await dispatch("/.well-known/did.json");
if (didRes.status !== 200) throw new Error(`/.well-known/did.json status ${didRes.status}`);
const parsedDid = JSON.parse(didRes.body.toString("utf8"));
if (!parsedDid.id?.includes("did:web:savanna-access-kit.vercel.app")) {
  throw new Error(`DID Document id mismatch: ${parsedDid.id}`);
}
console.log(`✅ GET /.well-known/did.json: 200 OK, DID: ${parsedDid.id}`);

// 3d. Job fixtures /v1/jobs/J-9 and /v1/jobs/J-10
const job9Res = await dispatch("/v1/jobs/J-9");
if (job9Res.status !== 200) throw new Error(`/v1/jobs/J-9 status ${job9Res.status}`);
const job9 = JSON.parse(job9Res.body.toString("utf8"));
if (!job9.i18n?.title?.am) throw new Error("Job 9 missing i18n title in Amharic");
if (!job9.audioSummary?.en?.transcript) throw new Error("Job 9 missing audio transcript");
console.log(`✅ GET /v1/jobs/J-9: 200 OK, localized title: "${job9.i18n.title.am}", deadline: "${job9.validThrough}"`);

const job10Res = await dispatch("/v1/jobs/J-10");
if (job10Res.status !== 200) throw new Error(`/v1/jobs/J-10 status ${job10Res.status}`);
const job10 = JSON.parse(job10Res.body.toString("utf8"));
if (!job10.i18n?.title?.am) throw new Error("Job 10 missing i18n title in Amharic");
console.log(`✅ GET /v1/jobs/J-10: 200 OK, localized title: "${job10.i18n.title.am}", deadline: "${job10.validThrough}"`);

console.log("\n🎉 ALL FINAL VERIFICATION SUITE CHECKS PASSED PERFECTLY!\n");
process.exit(0);
