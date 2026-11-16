import type { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/errors";
import type { Ctx } from "../lib/context";
import type { OperationDoc } from "../lib/openapi";
import { pathParam, wantsJsonLd } from "./career-lib.js";
import { didDocument, toOpenBadge } from "./open-badges.js";
import { pageLanguage, verifyPageHtml } from "./verify.js";
import { createMember3CareerContext } from "./_member3-career-store.js";

export const access = "public" as const;

const IdParams = z.object({
  id: z.string().min(1).describe("Credential id."),
});

const DidDocumentSchema = z.looseObject({
  "@context": z.array(z.string()),
  id: z.string(),
  controller: z.string(),
  verificationMethod: z.array(z.looseObject({ id: z.string(), type: z.string(), controller: z.string() })),
  assertionMethod: z.array(z.string()),
});

export function register(router: Router, ctx: Ctx): void {
  const career = createMember3CareerContext(ctx);

  router.get("/.well-known/did.json", (_req, res) => {
    res.type("application/did+json").json(didDocument(career));
  });

  router.get("/verify/:id/pdf", async (req, res) => {
    const id = pathParam(req, "id");
    const record = await career.store.getCredential(id);
    if (!record) throw new HttpError(404, "Not Found", `Credential ${id} was not found.`);
    const { renderCertificatePdf } = await import("./credential-pdf.js");
    const pdf = await renderCertificatePdf(record, career, pageLanguage(req.query.lang));
    res
      .type("application/pdf")
      .set("Content-Disposition", `attachment; filename="credential-${record.id}.pdf"`)
      .send(pdf);
  });

  router.get("/verify/:id", async (req, res) => {
    const id = pathParam(req, "id");
    const record = await career.store.getCredential(id);
    if (!record) {
      if (wantsJsonLd(req) && (req.header("accept") ?? "").includes("ld+json")) {
        res.status(404).type("application/problem+json").json({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: `Credential ${id} was not found.`,
        });
        return;
      }
      const lang = pageLanguage(req.query.lang);
      if (lang === "en") {
        res.status(404).type("html").send(`<!doctype html>
          <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Credential not found</title></head><body><main><h1>Credential not found</h1>
          <p>Check the link and try again.</p><a href="?lang=am" lang="am">አማርኛ</a></main></body></html>`);
        return;
      }
      res.status(404).type("html").send(`<!doctype html>
        <html lang="am"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
        <title>አልተገኘም</title></head><body><main><h1>የምስክር ወረቀቱ አልተገኘም</h1>
        <p>አገናኙን ያረጋግጡና እንደገና ይሞክሩ።</p><a href="?lang=en" lang="en">English</a></main></body></html>`);
      return;
    }
    if (wantsJsonLd(req) && (req.header("accept") ?? "").includes("ld+json")) {
      res.type("application/ld+json").json(toOpenBadge(record, career));
      return;
    }
    res.type("html").send(await verifyPageHtml(record, career, pageLanguage(req.query.lang)));
  });
}

export const openapi: OperationDoc[] = [
  {
    method: "get",
    path: "/verify/{id}",
    summary: "Verify a credential",
    description: "Public status page; send Accept: application/ld+json for the Open Badges credential.",
    tags: ["CareerGateway"],
    params: IdParams,
    responses: {
      200: { description: "Accessible verification page.", schema: z.string(), contentType: "text/html" },
      404: { description: "No credential exists with this id." },
    },
  },
  {
    method: "get",
    path: "/verify/{id}/pdf",
    summary: "Download a public certificate PDF",
    description: "The verification page is public, so its linked certificate PDF is also available without an API key.",
    tags: ["CareerGateway"],
    params: IdParams,
    responses: {
      200: { description: "Tagged PDF certificate.", contentType: "application/pdf" },
      404: { description: "No credential exists with this id." },
    },
  },
  {
    method: "get",
    path: "/.well-known/did.json",
    summary: "Get the credential issuer DID document",
    tags: ["CareerGateway"],
    responses: {
      200: {
        description: "Issuer public verification key.",
        schema: DidDocumentSchema,
        contentType: "application/did+json",
      },
    },
  },
];
