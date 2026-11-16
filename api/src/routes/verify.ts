import { Router } from "express";
import QRCode from "qrcode";
import type { CareerCtx, CredentialRecord } from "./career-types.js";
import { effectiveStatus, escapeHtml, problem, wantsJsonLd } from "./career-lib.js";
import { didDocument, toOpenBadge } from "./open-badges.js";

export { toOpenBadge };

type PageLanguage = "am" | "en";

const PAGE_TEXT = {
  am: {
    title: "የምስክር ወረቀት ማረጋገጫ",
    language: "ቋንቋ",
    status: "ሁኔታ",
    achievement: "ስኬት",
    recipient: "ተቀባይ",
    privateRecipient: "ስሙ በግል ተጠብቋል",
    issued: "የተሰጠበት ቀን",
    issuer: "ሰጪ",
    id: "መለያ",
    explanation: "ይህ ማረጋገጫ የምስክር ወረቀቱን ሁኔታ በሰጪው አገልጋይ ላይ ይፈትሻል።",
    proofWarning: "የኤድ25519 ፊርማው የሙከራ ስሪት ነው፤ ሙሉ RDFC-1.0 አይደለም።",
    qr: "የፈጣን ምላሽ ኮድ፤ የማረጋገጫ አገናኝ",
    copy: "የማረጋገጫ አገናኝ ቅዳ",
    copied: "አገናኙ ተቀድቷል።",
    download: "ምስክር ወረቀቱን አውርድ",
    valid: "ትክክለኛ",
    revoked: "ተሰርዟል",
    expired: "ጊዜው አልፏል",
  },
  en: {
    title: "Certificate verification",
    language: "Language",
    status: "Status",
    achievement: "Achievement",
    recipient: "Recipient",
    privateRecipient: "Name withheld for privacy",
    issued: "Issue date",
    issuer: "Issuer",
    id: "Credential ID",
    explanation: "This page checks the credential status with the issuer's server.",
    proofWarning: "The Ed25519 proof is a demo using canonical JSON, not full RDFC-1.0.",
    qr: "QR code linking to the credential verification page",
    copy: "Copy verification link",
    copied: "Link copied.",
    download: "Download certificate",
    valid: "Valid",
    revoked: "Revoked",
    expired: "Expired",
  },
} satisfies Record<PageLanguage, Record<string, string>>;

export function pageLanguage(value: unknown): PageLanguage {
  return value === "en" ? "en" : "am";
}

function statusLabel(status: string, lang: PageLanguage): string {
  const text = PAGE_TEXT[lang];
  if (status === "valid") return text.valid;
  if (status === "revoked") return text.revoked;
  return text.expired;
}

export async function verifyPageHtml(
  record: CredentialRecord,
  ctx: CareerCtx,
  lang: PageLanguage = "am",
): Promise<string> {
  const text = PAGE_TEXT[lang];
  const status = effectiveStatus(record);
  const url = `${ctx.publicBaseUrl}/verify/${record.id}?lang=${lang}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, width: 160 });
  const issued = new Date(record.issuedAt).toLocaleDateString(
    lang === "am" ? "am-ET-u-ca-ethiopic" : "en-GB",
    {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    },
  );
  const recipient = escapeHtml(
    record.i18n?.recipientName?.[lang] ?? record.recipientName ?? text.privateRecipient,
  );
  const achievement = escapeHtml(record.i18n?.achievement?.[lang] ?? record.achievement);
  const issuer = escapeHtml(
    lang === "am" ? ctx.issuerName : (ctx.issuerNameEn ?? "Savanna Access Kit"),
  );
  const pdfUrl = `/verify/${encodeURIComponent(record.id)}/pdf?lang=${lang}`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${text.title} — ${achievement}</title>
  <style>
    :root {
      --savanna-accent: #0b5cab;
      --savanna-font: "Noto Sans Ethiopic", Nyala, "Segoe UI", system-ui, sans-serif;
      --savanna-focus: #0b5cab;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 1.125rem/1.5 var(--savanna-font);
      color: #111;
      background: #fff;
      padding: 1.25rem;
      max-width: 40rem;
    }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    .status {
      display: inline-block;
      padding: 0.35rem 0.7rem;
      border-radius: 0.35rem;
      font-weight: 700;
      min-height: 44px;
      line-height: 1.8;
    }
    .valid { background: #d7f5d7; color: #064b06; }
    .revoked, .expired { background: #fde8e8; color: #7a1010; }
    nav { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    nav a { display: inline-flex; align-items: center; min-width: 44px; min-height: 44px; padding: 0.35rem 0.6rem; }
    dl { display: grid; grid-template-columns: 1fr; gap: 0.35rem 1rem; }
    dt { font-weight: 700; margin-top: 0.75rem; }
    dd { margin: 0; overflow-wrap: anywhere; }
    button, a.button {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 44px; min-width: 44px; padding: 0.5rem 1rem;
      margin: 0.5rem 0.5rem 0 0; font: inherit; color: #fff;
      background: var(--savanna-accent); border: 0; border-radius: 0.4rem;
      text-decoration: none; cursor: pointer;
    }
    button:focus, a:focus { outline: 3px solid var(--savanna-focus); outline-offset: 2px; }
    .qr svg { width: 160px; height: 160px; }
    @media (min-width: 40rem) {
      dl { grid-template-columns: 8rem 1fr; }
      dt { margin-top: 0; }
    }
  </style>
</head>
<body>
  <main>
    <nav aria-label="${text.language}">
      <a href="/verify/${encodeURIComponent(record.id)}?lang=am" lang="am"${lang === "am" ? ' aria-current="page"' : ""}>አማርኛ</a>
      <a href="/verify/${encodeURIComponent(record.id)}?lang=en" lang="en"${lang === "en" ? ' aria-current="page"' : ""}>English</a>
    </nav>
    <h1>${text.title}</h1>
    <p>
      <span class="status ${escapeHtml(status)}">${statusLabel(status, lang)}</span>
    </p>
    <dl>
      <dt>${text.achievement}</dt><dd>${achievement}</dd>
      <dt>${text.recipient}</dt><dd>${recipient}</dd>
      <dt>${text.issued}</dt><dd>${escapeHtml(issued)}</dd>
      <dt>${text.issuer}</dt><dd>${issuer}</dd>
      <dt>${text.status}</dt><dd>${statusLabel(status, lang)}</dd>
      <dt>${text.id}</dt><dd><code>${escapeHtml(record.id)}</code></dd>
    </dl>
    <p>${text.explanation} ${text.proofWarning}</p>
    <div class="qr">
      ${qr.replace("<svg", `<svg role="img" aria-label="${text.qr}: ${escapeHtml(url)}"`)}
    </div>
    <p>
      <button type="button" id="copy">${text.copy}</button>
      <a class="button" href="${pdfUrl}">${text.download}</a>
    </p>
    <p id="copied" role="status" aria-live="polite"></p>
  </main>
  <script>
    const url = ${JSON.stringify(url)};
    document.getElementById("copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(url);
        document.getElementById("copied").textContent = ${JSON.stringify(text.copied)};
      } catch {
        document.getElementById("copied").textContent = url;
      }
    });
  </script>
</body>
</html>`;
}

export function register(router: Router, ctx: CareerCtx): void {
  router.get("/.well-known/did.json", (_req, res) => {
    res.type("application/did+json").json(didDocument(ctx));
  });

  router.get("/verify/:id", async (req, res, next) => {
    try {
      const record = await ctx.store.getCredential(req.params.id);
      if (!record) {
        if (wantsJsonLd(req) && (req.header("accept") ?? "").includes("json")) {
          problem(res, 404, "Not Found", `Credential ${req.params.id} was not found.`);
          return;
        }
        const lang = pageLanguage(req.query.lang);
        const missing =
          lang === "en"
            ? `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Credential not found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>Credential not found</h1><p>Check the link and try again.</p><a href="?lang=am" lang="am">አማርኛ</a></main></body></html>`
            : `<!DOCTYPE html><html lang="am"><head><meta charset="utf-8"><title>አልተገኘም</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main><h1>የምስክር ወረቀቱ አልተገኘም</h1><p>አገናኙን ያረጋግጡና እንደገና ይሞክሩ።</p><a href="?lang=en" lang="en">English</a></main></body></html>`;
        res.status(404).type("html").send(missing);
        return;
      }
      if (wantsJsonLd(req) && (req.header("accept") ?? "").includes("ld+json")) {
        res.type("application/ld+json").json(toOpenBadge(record, ctx));
        return;
      }
      res.type("html").send(await verifyPageHtml(record, ctx, pageLanguage(req.query.lang)));
    } catch (err) {
      next(err);
    }
  });
}

export const openapi = {
  paths: {
    "/verify/{id}": {
      get: {
        summary: "Human verify page or OpenBadgeCredential JSON-LD",
        tags: ["Credentials"],
        responses: { "200": { description: "HTML or JSON-LD" } },
      },
    },
  },
};
