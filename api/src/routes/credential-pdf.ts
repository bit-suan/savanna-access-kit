import { chromium } from "playwright";
import type { CareerCtx, CredentialRecord } from "./career-types.js";
import { effectiveStatus, escapeHtml } from "./career-lib.js";
import { verifyPageHtml } from "./verify.js";

/**
 * Tagged PDF from accessible HTML (FR-D3 / FR-C5).
 * Playwright tagged:true support varies by version — we set PDF/UA-oriented
 * metadata either way and keep the HTML as the source of truth.
 */
export async function renderCertificatePdf(
  record: CredentialRecord,
  ctx: CareerCtx,
  lang: "am" | "en" = "am",
): Promise<Buffer> {
  const html = await certificateHtml(record, ctx, lang);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      tagged: true,
      outline: true,
    } as Parameters<typeof page.pdf>[0]);
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function certificateHtml(
  record: CredentialRecord,
  ctx: CareerCtx,
  lang: "am" | "en",
): Promise<string> {
  const verify = await verifyPageHtml(record, ctx, lang);
  const status = effectiveStatus(record);
  const achievement = escapeHtml(record.i18n?.achievement?.[lang] ?? record.achievement);
  const recipient = escapeHtml(
    record.i18n?.recipientName?.[lang] ?? record.recipientName ?? (lang === "am" ? "ተማሪ" : "Learner"),
  );
  const verifyUrl = escapeHtml(`${ctx.publicBaseUrl}/verify/${record.id}?lang=${lang}`);
  const statusLabel = {
    valid: lang === "am" ? "ትክክለኛ" : "Valid",
    revoked: lang === "am" ? "ተሰርዟል" : "Revoked",
    expired: lang === "am" ? "ጊዜው አልፏል" : "Expired",
  }[status];
  const extra =
    lang === "en"
      ? `<article lang="en"><h1>${achievement}</h1>
        <p>This certificate confirms that ${recipient} earned this achievement.</p>
        <p>Status at download: ${statusLabel}. Verify it at ${verifyUrl}.</p></article>`
      : `<article lang="am"><h1>${achievement}</h1>
        <p>${recipient} ከላይ የተጠቀሰውን ስኬት እንዳጠናቀቀ ይህ ሰነድ ያረጋግጣል።</p>
        <p>በማውረድ ጊዜ ያለው ሁኔታ፦ ${statusLabel}። በቀጥታ ለማረጋገጥ፦ ${verifyUrl}።</p></article>`;
  return verify.replace("<main>", `<main>${extra}`);
}
