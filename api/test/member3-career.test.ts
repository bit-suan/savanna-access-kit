import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { verifyDemoProof } from "../src/routes/open-badges";

const PUBLISHABLE = { "X-Savanna-Key": "pk_dev_local" };
const SECRET = { "X-Savanna-Key": "sk_dev_local_change_me_please" };
const app = () => createApp({ config: loadConfig({ STORE: "memory" }) });

describe("Member 3 CareerGateway routes", () => {
  it("serves fixture-backed jobs under the shared /v1 mount", async () => {
    const server = await app();
    const response = await request(server).get("/v1/jobs/J-9").set(PUBLISHABLE);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe("J-9");
    expect(response.body.title).toBe("የተደራሽ ትምህርት ድጋፍ ባለሙያ");
    expect(response.body.i18n.title).toEqual({
      en: "Accessible Learning Support Associate",
      am: "የተደራሽ ትምህርት ድጋፍ ባለሙያ",
    });
    expect(response.body.i18n.employer.en).toBe("Digital Bridge Ethiopia");
    expect(response.body.audioSummary.am.transcript).toContain("ታኅሣሥ 22 ቀን 2019");
    expect((await request(server).get("/v1/v1/jobs/J-9").set(PUBLISHABLE)).status).toBe(404);
    expect((await request(server).get("/v1/jobs/J-9")).status).toBe(401);
  });

  it("returns schema.org JobPosting JSON-LD", async () => {
    const response = await request(await app()).get("/v1/jobs/J-9.jsonld").set(PUBLISHABLE);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/ld+json");
    expect(response.body).toMatchObject({
      "@type": "JobPosting",
      title: "የተደራሽ ትምህርት ድጋፍ ባለሙያ",
      hiringOrganization: { name: "ዲጂታል ብሪጅ ኢትዮጵያ" },
    });
  });

  it("requires the secret scope for issue and revoke, then reflects revocation immediately", async () => {
    const server = await app();
    const body = {
      recipientRef: "urn:savanna:learner:test-01",
      achievement: "ተደራሽ ንድፍ",
      i18n: {
        achievement: { en: "Accessible Design", am: "ተደራሽ ንድፍ" },
        recipientName: { en: "Demo Learner", am: "ማሳያ ተማሪ" },
      },
    };
    expect((await request(server).post("/v1/credentials").set(PUBLISHABLE).send(body)).status).toBe(403);

    const issued = await request(server).post("/v1/credentials").set(SECRET).send(body);
    expect(issued.status).toBe(201);
    const credentialId = String(issued.body.credentialStatus.id).split("/").at(-1);
    expect(credentialId).toMatch(/^[a-f0-9]{32}$/);
    expect(issued.body.type).toContain("OpenBadgeCredential");
    expect(issued.body.i18n.achievement).toEqual(body.i18n.achievement);
    expect(issued.body.i18n.recipientName).toEqual(body.i18n.recipientName);
    expect(verifyDemoProof(issued.body, issued.body.proof)).toBe(true);

    const revoked = await request(server)
      .post(`/v1/credentials/${credentialId}/revoke`)
      .set(SECRET);
    expect(revoked.status).toBe(200);
    expect(revoked.body.status).toBe("revoked");

    const fetched = await request(server)
      .get(`/v1/credentials/${credentialId}`)
      .set(PUBLISHABLE);
    expect(fetched.status).toBe(200);
    expect(fetched.body.credentialStatus.status).toBe("revoked");
  });

  it("serves public verification HTML, JSON-LD and issuer DID without a key", async () => {
    const server = await app();
    const html = await request(server).get("/verify/C-7");
    expect(html.status).toBe(200);
    expect(html.text).toContain('aria-label="የፈጣን ምላሽ ኮድ፤ የማረጋገጫ አገናኝ');
    expect(html.text).toContain('<html lang="am">');
    expect(html.text).toContain("ማሳያ ተማሪ");
    expect(html.text).toContain("/verify/C-7/pdf");

    const englishHtml = await request(server).get("/verify/C-7?lang=en");
    expect(englishHtml.status).toBe(200);
    expect(englishHtml.text).toContain('<html lang="en">');
    expect(englishHtml.text).toContain("Certificate verification");
    expect(englishHtml.text).toContain("Digital Bridge — Accessible Media Basics");
    expect(englishHtml.text).toContain("Demo Learner");
    expect(englishHtml.text).toContain("/verify/C-7/pdf?lang=en");

    const badge = await request(server)
      .get("/verify/C-7")
      .set("Accept", "application/ld+json");
    expect(badge.status).toBe(200);
    expect(badge.body.type).toContain("OpenBadgeCredential");
    expect(badge.body.i18n.achievement.am).toContain("ዲጂታል");
    expect(badge.body.i18n.achievement.en).toContain("Digital Bridge");
    expect(badge.body.i18n.issuerName.en).toBe("Savanna Access Kit");

    const did = await request(server).get("/.well-known/did.json");
    expect(did.status).toBe(200);
    expect(did.body.assertionMethod).toContain("did:web:localhost%3A4000#key-1");
  });

  it("includes the Member 3 operations in the generated OpenAPI document", async () => {
    const { body } = await request(await app()).get("/v1/openapi.json");

    expect(body.paths["/v1/jobs/{id}"].get).toBeTruthy();
    expect(body.paths["/v1/jobs/{id}.jsonld"].get).toBeTruthy();
    expect(body.paths["/v1/credentials"].post.security).toEqual([{ ApiKey: [] }]);
    expect(body.paths["/verify/{id}"].get.security).toEqual([]);
    expect(body.paths["/verify/{id}/pdf"].get.security).toEqual([]);
    expect(body.paths["/.well-known/did.json"].get.security).toEqual([]);
    expect(body.paths["/v1/v1/jobs/{id}"]).toBeUndefined();
  });
});
