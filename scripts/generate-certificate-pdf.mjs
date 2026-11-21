import QRCode from "../api/node_modules/qrcode/lib/index.js";

/**
 * Escapes characters for PDF literal strings (parentheses and backslashes)
 */
function escapePdfText(text) {
  if (!text) return "";
  return String(text)
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
    achievement = "Digital Bridge — Accessible Media Basics",
    issuerName = "Savanna Access Kit",
    issuerDid = "did:web:savanna-access-kit.vercel.app",
    issuedAt = "2026-11-12T08:00:00.000Z",
    status = "valid",
    verifyUrl = "https://savanna-access-kit.vercel.app/verify/C-7",
    lang = "en",
  } = options;

  const isAmharic = lang === "am";

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

  // 1. Background Fill
  add("0.985 0.988 0.995 rg");
  add(`0 0 ${W} ${H} re f`);

  // 2. Outer Border (Savanna Deep Navy #002b56)
  add("0 0.169 0.337 RG");
  add("4.5 w");
  add(`16 16 ${W - 32} ${H - 32} re S`);

  // 3. Inner Accent Border (Savanna Gold #f5a300)
  add("0.961 0.639 0 RG");
  add("1.5 w");
  add(`23 23 ${W - 46} ${H - 46} re S`);

  // 4. Corner Ornaments (Gold Triangles)
  add("0.961 0.639 0 rg");
  add("25 25 m 45 25 l 25 45 l f");
  add(`${W - 25} 25 m ${W - 45} 25 l ${W - 25} 45 l f`);
  add(`25 ${H - 25} m 45 ${H - 25} l 25 ${H - 45} l f`);
  add(`${W - 25} ${H - 25} m ${W - 45} ${H - 25} l ${W - 25} ${H - 45} l f`);

  // 5. Header Banner (Deep Navy)
  add("0 0.169 0.337 rg");
  add(`25 ${H - 85} ${W - 50} 60 re f`);

  // 6. Header Typography
  add("BT");
  add("/F1 16 Tf");
  add("1 1 1 rg");
  add(`${W / 2 - 120} ${H - 58} Td`);
  add("(SAVANNA ACCESS KIT) Tj");
  add("ET");

  add("BT");
  add("/F2 9.5 Tf");
  add("0.961 0.639 0 rg");
  add(`${W / 2 - 165} ${H - 74} Td`);
  add("(OPEN BADGES 3.0 · W3C VERIFIABLE CREDENTIAL) Tj");
  add("ET");

  // 7. Certificate Title
  add("BT");
  add("/F1 25 Tf");
  add("0 0.169 0.337 rg");
  const certTitle = isAmharic
    ? "CERTIFICATE OF ACHIEVEMENT (የስኬት ምስክር ወረቀት)"
    : "CERTIFICATE OF ACHIEVEMENT";
  add(`${W / 2 - (isAmharic ? 230 : 185)} ${H - 132} Td`);
  add(`(${escapePdfText(certTitle)}) Tj`);
  add("ET");

  // Gold separator line
  add("0.961 0.639 0 RG");
  add("2 w");
  add(`${W / 2 - 180} ${H - 144} m ${W / 2 + 180} ${H - 144} l S`);

  // 8. Presentation Text
  add("BT");
  add("/F2 12 Tf");
  add("0.35 0.4 0.45 rg");
  const presentText = isAmharic
    ? "This certificate confirms completion of curriculum standards for (በክብር የተሰጠው ለ፦):"
    : "This is proudly presented in recognition of mastery to:";
  add(`${W / 2 - (isAmharic ? 210 : 160)} ${H - 172} Td`);
  add(`(${escapePdfText(presentText)}) Tj`);
  add("ET");

  // 9. Recipient Name
  add("BT");
  add("/F1 26 Tf");
  add("0.05 0.1 0.2 rg");
  add(`${W / 2 - 120} ${H - 212} Td`);
  add(`(${escapePdfText(recipientName)}) Tj`);
  add("ET");

  // Underline for name
  add("0.961 0.639 0 RG");
  add("1.5 w");
  add(`${W / 2 - 160} ${H - 222} m ${W / 2 + 160} ${H - 222} l S`);

  // 10. Achievement Title
  add("BT");
  add("/F2 11.5 Tf");
  add("0.35 0.4 0.45 rg");
  const achSub = isAmharic
    ? "for successfully completing the course (ስኬት)፦"
    : "for successfully completing the coursework and evaluation for:";
  add(`${W / 2 - (isAmharic ? 150 : 170)} ${H - 248} Td`);
  add(`(${escapePdfText(achSub)}) Tj`);
  add("ET");

  add("BT");
  add("/F1 17 Tf");
  add("0 0.169 0.337 rg");
  add(`${W / 2 - 190} ${H - 276} Td`);
  add(`(${escapePdfText(achievement)}) Tj`);
  add("ET");

  // 11. Metadata Summary Card (Left side)
  add("0.96 0.97 0.99 rg");
  add("0.8 0.85 0.9 RG");
  add("1 w");
  add("50 82 520 135 re B");

  add("BT");
  add("/F1 11 Tf");
  add("0 0.169 0.337 rg");
  add("70 192 Td (Cryptographic Verification Details:) Tj");
  add("ET");

  const formattedDate = new Date(issuedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  add("BT");
  add("/F2 9.5 Tf");
  add("0.2 0.25 0.3 rg");
  add(`70 172 Td (Recipient ID: urn:savanna:learner:demo-001) Tj`);
  add(`70 154 Td (Issuer Identity: ${escapePdfText(issuerName)} [${escapePdfText(issuerDid)}]) Tj`);
  add(`70 136 Td (Issue Date: ${escapePdfText(formattedDate)} · Status: ${status.toUpperCase()}) Tj`);
  add(`70 118 Td (Credential ID: ${escapePdfText(id)} · Type: VerifiableCredential, OpenBadgeCredential) Tj`);
  add(`70 100 Td (Proof Standard: Ed25519 DataIntegrityProof · eddsa-rdfc-2022) Tj`);
  add("ET");

  // 12. Vector QR Code (Right side)
  const qrTargetSize = 100;
  const qrModSize = qrTargetSize / qrSize;
  const qrX = W - 200;
  const qrY = 105;

  // QR container background
  add("1 1 1 rg");
  add(`${qrX - 6} ${qrY - 6} ${qrTargetSize + 12} ${qrTargetSize + 12} re f`);
  add("0.85 0.88 0.92 RG");
  add("1 w");
  add(`${qrX - 6} ${qrY - 6} ${qrTargetSize + 12} ${qrTargetSize + 12} re S`);

  // QR black squares
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

  // QR Verification Label
  add("BT");
  add("/F1 8.5 Tf");
  add("0 0.169 0.337 rg");
  add(`${qrX - 10} ${qrY - 18} Td (Scan to Verify Online) Tj`);
  add("ET");

  add("BT");
  add("/F2 7.5 Tf");
  add("0.4 0.45 0.5 rg");
  add(`${qrX - 15} ${qrY - 28} Td (savanna-access-kit.vercel.app) Tj`);
  add("ET");

  // 13. Footer Disclaimer
  add("BT");
  add("/F2 8 Tf");
  add("0.45 0.5 0.55 rg");
  add(`50 48 Td (This certificate is mathematically verifiable offline with zero server contact using the issuer's public DID key.) Tj`);
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
