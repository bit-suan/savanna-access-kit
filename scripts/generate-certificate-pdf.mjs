import QRCodeModule from "./qrcode-standalone.mjs";
const QRCode = QRCodeModule.default || QRCodeModule;

/**
 * Sanitizes strings for standard Type 1 Helvetica fonts.
 * Standard PDF Type 1 fonts only support single-byte WinAnsi/ASCII characters.
 * Replaces unicode dashes, quotes, and strips Ethiopic script to prevent parser corruption.
 */
function sanitizePdfString(text) {
  if (!text) return "";
  return String(text)
    .replace(/[\u2014\u2013]/g, " - ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u00B7/g, "-")
    .replace(/[\u1200-\u137F]/g, "") // remove Ethiopic characters so Type 1 Helvetica does not corrupt
    .trim();
}

/**
 * Escapes characters for PDF literal strings (parentheses and backslashes)
 * Guarantees strictly printable 7-bit ASCII [0x20..0x7E]
 */
function escapePdfText(text) {
  const clean = sanitizePdfString(text).replace(/[^\x20-\x7E]/g, "");
  return clean
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Generates an authentic, accessible A4 Landscape Certificate PDF.
 *
 * @param {Object} options
 * @param {string} options.id - Credential ID (e.g. "C-7")
 * @param {string} options.recipientName - Learner name (e.g. "Demo Learner")
 * @param {string} options.achievement - Title of achievement
 * @param {string} [options.issuerName] - Issuer name
 * @param {string} [options.issuerDid] - Issuer DID identity
 * @param {string} [options.issuedAt] - ISO Date
 * @param {string} [options.status] - Status (e.g. "valid")
 * @param {string} [options.verifyUrl] - Public verification URL
 * @param {string} [options.lang] - "en" or "am"
 * @returns {Buffer} PDF binary buffer
 */
export function generateCertificatePdf(options = {}) {
  const {
    id = "C-7",
    recipientName = "Demo Learner",
    achievement = "Digital Bridge - Accessible Media Basics",
    issuerName = "Savanna Access Kit",
    issuerDid = "did:web:savanna-access-kit.vercel.app",
    issuedAt = "2026-11-12T08:00:00.000Z",
    status = "valid",
    verifyUrl = "https://savanna-access-kit.vercel.app/verify/C-7",
    lang = "en",
  } = options;

  const isAmharic = lang === "am";

  // Sanitize and provide fallbacks so text is never empty or corrupt
  const cleanId = escapePdfText(id) || "C-7";
  const rawRecipient = escapePdfText(recipientName);
  const cleanRecipient = rawRecipient || (isAmharic ? "Demo Learner (Demow Temari)" : "Demo Learner");
  const rawAchievement = escapePdfText(achievement);
  const cleanAchievement = rawAchievement || "Digital Bridge - Accessible Media Basics";
  const cleanIssuer = escapePdfText(issuerName) || "Savanna Access Kit";
  const cleanIssuerDid = escapePdfText(issuerDid) || "did:web:savanna-access-kit.vercel.app";
  const cleanStatus = escapePdfText(status) || "VALID";
  const cleanVerifyUrl = escapePdfText(verifyUrl) || "https://savanna-access-kit.vercel.app/verify/C-7";

  // Generate real QR code matrix
  const qr = QRCode.create(verifyUrl, { errorCorrectionLevel: "M" });
  const modules = qr.modules;
  const qrSize = modules.size;
  const data = modules.data;

  // A4 Landscape dimensions in PDF points (72 pt/inch)
  const W = 841.89;
  const H = 595.28;

  let stream = "";
  const add = (cmd) => {
    stream += cmd + "\n";
  };

  // 1. Background Fill (Subtle off-white/cream paper)
  add("q");
  add("0.99 0.992 0.996 rg");
  add(`0 0 ${W} ${H} re f`);
  add("Q");

  // 2. Outer Border (Savanna Deep Navy #002b56)
  add("q");
  add("0 0.169 0.337 RG");
  add("4.5 w");
  add(`18 18 ${W - 36} ${H - 36} re S`);
  add("Q");

  // 3. Inner Accent Border (Savanna Gold #f5a300)
  add("q");
  add("0.961 0.639 0 RG");
  add("1.5 w");
  add(`25 25 ${W - 50} ${H - 50} re S`);
  add("Q");

  // 4. Corner Ornaments (Gold Triangles)
  add("q");
  add("0.961 0.639 0 rg");
  add("27 27 m 48 27 l 27 48 l f");
  add(`${W - 27} 27 m ${W - 48} 27 l ${W - 27} 48 l f`);
  add(`27 ${H - 27} m 48 ${H - 27} l 27 ${H - 48} l f`);
  add(`${W - 27} ${H - 27} m ${W - 48} ${H - 27} l ${W - 27} ${H - 48} l f`);
  add("Q");

  // 5. Header Banner (Deep Navy #002b56)
  add("q");
  add("0 0.169 0.337 rg");
  add(`27 ${H - 92} ${W - 54} 65 re f`);
  add("Q");

  // 6. Header Typography
  add("BT");
  add("/F1 18 Tf");
  add("1 1 1 rg");
  add(`${W / 2 - 110} ${H - 58} Td`);
  add("(SAVANNA ACCESS KIT) Tj");
  add("ET");

  add("BT");
  add("/F2 9.5 Tf");
  add("0.961 0.639 0 rg");
  add(`${W / 2 - 145} ${H - 76} Td`);
  add("(OPEN BADGES 3.0 - W3C VERIFIABLE CREDENTIAL) Tj");
  add("ET");

  // 7. Certificate Title
  add("BT");
  add("/F1 25 Tf");
  add("0 0.169 0.337 rg");
  const certTitle = "CERTIFICATE OF ACHIEVEMENT";
  add(`${W / 2 - 200} ${H - 134} Td`);
  add(`(${escapePdfText(certTitle)}) Tj`);
  add("ET");

  // Gold separator line
  add("q");
  add("0.961 0.639 0 RG");
  add("2 w");
  add(`${W / 2 - 180} ${H - 146} m ${W / 2 + 180} ${H - 146} l S`);
  add("Q");

  // 8. Presentation Text
  add("BT");
  add("/F2 12 Tf");
  add("0.35 0.4 0.45 rg");
  const presentText = "This credential is proudly awarded in recognition of mastery to:";
  add(`${W / 2 - 175} ${H - 174} Td`);
  add(`(${escapePdfText(presentText)}) Tj`);
  add("ET");

  // 9. Recipient Name
  add("BT");
  add("/F1 26 Tf");
  add("0.05 0.1 0.2 rg");
  const nameWidth = cleanRecipient.length * 15;
  const nameX = Math.max(50, (W - nameWidth) / 2);
  add(`${nameX.toFixed(2)} ${H - 212} Td`);
  add(`(${cleanRecipient}) Tj`);
  add("ET");

  // Underline for name
  add("q");
  add("0.961 0.639 0 RG");
  add("1.5 w");
  add(`${W / 2 - 160} ${H - 222} m ${W / 2 + 160} ${H - 222} l S`);
  add("Q");

  // 10. Achievement Title & Subtitle
  add("BT");
  add("/F2 11.5 Tf");
  add("0.35 0.4 0.45 rg");
  const achSub = "for successfully demonstrating competency in the curriculum of:";
  add(`${W / 2 - 175} ${H - 248} Td`);
  add(`(${escapePdfText(achSub)}) Tj`);
  add("ET");

  add("BT");
  add("/F1 17 Tf");
  add("0 0.169 0.337 rg");
  const achWidth = cleanAchievement.length * 9.5;
  const achX = Math.max(50, (W - achWidth) / 2);
  add(`${achX.toFixed(2)} ${H - 274} Td`);
  add(`(${cleanAchievement}) Tj`);
  add("ET");

  add("BT");
  add("/F2 9.5 Tf");
  add("0.4 0.45 0.5 rg");
  const compText = "Audio Description Authoring - Bilingual Accessibility - 2G Offline Delivery";
  add(`${W / 2 - 200} ${H - 292} Td`);
  add(`(${escapePdfText(compText)}) Tj`);
  add("ET");

  // 11. Metadata Summary Card (Left side)
  add("q");
  add("0.965 0.975 0.99 rg");
  add("0.78 0.83 0.89 RG");
  add("1 w");
  add("45 68 545 154 re B");
  add("Q");

  add("BT");
  add("/F1 11 Tf");
  add("0 0.169 0.337 rg");
  add("65 198 Td");
  add("(Cryptographic Verification & DID Identity:) Tj");
  add("ET");

  const formattedDate = new Date(issuedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const metaLines = [
    `Recipient Identifier: urn:savanna:learner:demo-001`,
    `Issuer Identity: ${cleanIssuer} [${cleanIssuerDid}]`,
    `Issue Date: ${escapePdfText(formattedDate)}  -  Status: ${cleanStatus.toUpperCase()}`,
    `Credential ID: ${cleanId}  -  Standard: Open Badges 3.0 (W3C VC)`,
    `Proof Standard: Ed25519 DataIntegrityProof (eddsa-rdfc-2022)`,
    `Verification: 100% offline verifiable using issuer's public DID key`,
  ];

  for (let i = 0; i < metaLines.length; i++) {
    const y = 178 - i * 17;
    add("BT");
    add("/F2 9.2 Tf");
    add("0.2 0.25 0.3 rg");
    add(`65 ${y} Td`);
    add(`(${metaLines[i]}) Tj`);
    add("ET");
  }

  // 12. Vector QR Code (Right side)
  const qrTargetSize = 100;
  const qrModSize = qrTargetSize / qrSize;
  const qrBoxX = 620;
  const qrBoxY = 68;
  const qrBoxW = 176;
  const qrBoxH = 154;

  // QR container background
  add("q");
  add("1 1 1 rg");
  add(`${qrBoxX} ${qrBoxY} ${qrBoxW} ${qrBoxH} re f`);
  add("0.78 0.83 0.89 RG");
  add("1 w");
  add(`${qrBoxX} ${qrBoxY} ${qrBoxW} ${qrBoxH} re S`);
  add("Q");

  // QR black squares (centered in QR box)
  const qrX = qrBoxX + (qrBoxW - qrTargetSize) / 2;
  const qrY = qrBoxY + 34;

  add("q");
  add("0 0 0 rg");
  for (let r = 0; r < qrSize; r++) {
    for (let c = 0; c < qrSize; c++) {
      if (data[r * qrSize + c]) {
        const x = qrX + c * qrModSize;
        const y = qrY + (qrSize - 1 - r) * qrModSize;
        add(`${x.toFixed(2)} ${y.toFixed(2)} ${qrModSize.toFixed(2)} ${qrModSize.toFixed(2)} re`);
      }
    }
  }
  add("f");
  add("Q");

  // QR Verification Labels
  add("BT");
  add("/F1 9 Tf");
  add("0 0.169 0.337 rg");
  add(`${qrBoxX + 38} ${qrBoxY + qrBoxH - 16} Td`);
  add("(Scan to Verify Online) Tj");
  add("ET");

  add("BT");
  add("/F2 7.5 Tf");
  add("0.35 0.4 0.45 rg");
  add(`${qrBoxX + 28} ${qrBoxY + 18} Td`);
  add("(savanna-access-kit.vercel.app) Tj");
  add("ET");

  // 13. Footer Disclaimer
  add("BT");
  add("/F1 8 Tf");
  add("0 0.169 0.337 rg");
  add("45 44 Td");
  add("(OFFICIALLY ISSUED BY SAVANNA ACCESS KIT  -  OPEN BADGES 3.0 VERIFIABLE CREDENTIAL) Tj");
  add("ET");

  add("BT");
  add("/F2 7.5 Tf");
  add("0.45 0.5 0.55 rg");
  add("45 32 Td");
  add("(This certificate is mathematically verifiable offline with zero server contact using the issuer's public DID key.) Tj");
  add("ET");

  // 14. Compile PDF Document with exact Cross-Reference Table
  const objects = [];
  const addObj = (content) => {
    objects.push(content);
    return objects.length;
  };

  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  addObj(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  addObj(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
  );
  addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  addObj(
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`,
  );

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
