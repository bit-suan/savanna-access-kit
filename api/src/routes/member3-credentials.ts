import { randomBytes } from "node:crypto";
import type { Router } from "express";
import { z } from "zod";
import { requireScope } from "../middleware/auth";
import type { Ctx } from "../lib/context";
import { HttpError } from "../lib/errors";
import type { OperationDoc } from "../lib/openapi";
import { effectiveStatus, pathParam } from "./career-lib.js";
import type { CredentialRecord, Json } from "./career-types.js";
import { toOpenBadge } from "./open-badges.js";
import { createMember3CareerContext } from "./_member3-career-store.js";
import { deliverEvent } from "./_member3-webhooks.js";

const IssueCredentialSchema = z.object({
  recipientRef: z.string().min(1).max(200).describe("Pseudonymous learner reference; do not send an email address."),
  achievement: z.string().min(1).max(200),
  recipientName: z.string().min(1).max(200).optional(),
  expiresAt: z.iso.datetime().optional(),
  i18n: z
    .object({
      achievement: z.object({ en: z.string().min(1).max(200), am: z.string().min(1).max(200) }).optional(),
      recipientName: z
        .object({ en: z.string().min(1).max(200), am: z.string().min(1).max(200) })
        .optional(),
    })
    .optional(),
});

const LocalizedTextSchema = z.object({ en: z.string(), am: z.string() });

const IdParams = z.object({
  id: z.string().min(1).describe("Credential id."),
});

const OpenBadgeSchema = z.looseObject({
  "@context": z.array(z.string()),
  id: z.string().url(),
  type: z.array(z.string()),
  name: z.string(),
  issuer: z.looseObject({ id: z.string(), type: z.array(z.string()), name: z.string() }),
  validFrom: z.string(),
  credentialStatus: z.looseObject({
    id: z.string(),
    type: z.string(),
    statusPurpose: z.string(),
    status: z.enum(["valid", "revoked", "expired"]),
  }),
  credentialSubject: z.looseObject({
    id: z.string(),
    type: z.array(z.string()),
    identifier: z.string(),
    achievement: z.looseObject({ id: z.string(), type: z.array(z.string()), name: z.string() }),
  }),
  i18n: z
    .object({
      achievement: LocalizedTextSchema.optional(),
      recipientName: LocalizedTextSchema.optional(),
      issuerName: LocalizedTextSchema.optional(),
    })
    .optional(),
  proof: z.looseObject({ type: z.string(), verificationMethod: z.string() }).optional(),
});

const RevokeResponseSchema = z.object({
  id: z.string(),
  status: z.enum(["valid", "revoked", "expired"]),
});

export function register(router: Router, ctx: Ctx): void {
  const career = createMember3CareerContext(ctx);

  router.post("/credentials", requireScope("admin"), async (req, res) => {
    const input = IssueCredentialSchema.parse(req.body);
    const now = new Date().toISOString();
    const record: CredentialRecord = {
      id: randomBytes(16).toString("hex"),
      recipientRef: input.recipientRef,
      recipientName: input.recipientName ?? null,
      achievement: input.achievement,
      issuedAt: now,
      validFrom: now,
      expiresAt: input.expiresAt ?? null,
      status: "valid",
      proof: null,
      i18n: input.i18n,
    };
    const badge = toOpenBadge(record, career);
    record.proof = (badge.proof as Json | undefined) ?? null;
    const saved = await career.store.saveCredential(record);
    await deliverEvent("credential.issued", { id: saved.id, status: effectiveStatus(saved) });
    res.status(201).type("application/ld+json").json(toOpenBadge(saved, career));
  });

  router.get("/credentials/:id", async (req, res) => {
    const id = pathParam(req, "id");
    const record = await career.store.getCredential(id);
    if (!record) throw new HttpError(404, "Not Found", `Credential ${id} was not found.`);
    res.type("application/ld+json").json(toOpenBadge(record, career));
  });

  router.get("/credentials/:id/pdf", async (req, res) => {
    const id = pathParam(req, "id");
    const record = await career.store.getCredential(id);
    if (!record) throw new HttpError(404, "Not Found", `Credential ${id} was not found.`);
    const { renderCertificatePdf } = await import("./credential-pdf.js");
    const pdf = await renderCertificatePdf(record, career);
    res
      .type("application/pdf")
      .set("Content-Disposition", `attachment; filename="credential-${record.id}.pdf"`)
      .send(pdf);
  });

  router.post("/credentials/:id/revoke", requireScope("admin"), async (req, res) => {
    const id = pathParam(req, "id");
    const record = await career.store.getCredential(id);
    if (!record) throw new HttpError(404, "Not Found", `Credential ${id} was not found.`);
    const saved = await career.store.saveCredential({ ...record, status: "revoked" });
    res.json({ id: saved.id, status: effectiveStatus(saved) });
  });
}

export const openapi: OperationDoc[] = [
  {
    method: "post",
    path: "/credentials",
    summary: "Issue a verifiable credential",
    description: "Secret-key-only action. Use a pseudonymous recipient reference, not personal contact details.",
    tags: ["CareerGateway"],
    access: "admin",
    body: IssueCredentialSchema,
    responses: {
      201: {
        description: "Issued Open Badges 3.0 credential.",
        schema: OpenBadgeSchema,
        contentType: "application/ld+json",
      },
    },
  },
  {
    method: "get",
    path: "/credentials/{id}",
    summary: "Fetch an Open Badges credential",
    tags: ["CareerGateway"],
    params: IdParams,
    responses: {
      200: {
        description: "Credential JSON-LD and hosted status.",
        schema: OpenBadgeSchema,
        contentType: "application/ld+json",
      },
      404: { description: "No credential exists with this id." },
    },
  },
  {
    method: "get",
    path: "/credentials/{id}/pdf",
    summary: "Download the certificate PDF",
    tags: ["CareerGateway"],
    params: IdParams,
    responses: {
      200: { description: "Tagged PDF certificate.", contentType: "application/pdf" },
      404: { description: "No credential exists with this id." },
    },
  },
  {
    method: "post",
    path: "/credentials/{id}/revoke",
    summary: "Revoke a credential",
    description: "Secret-key-only action. The status changes immediately.",
    tags: ["CareerGateway"],
    access: "admin",
    params: IdParams,
    responses: {
      200: { description: "Current credential status.", schema: RevokeResponseSchema },
      404: { description: "No credential exists with this id." },
    },
  },
];
