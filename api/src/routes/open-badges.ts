import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import type { CareerCtx, CredentialRecord, Json } from "./career-types.js";
import { effectiveStatus } from "./career-lib.js";

/** Demo issuer key. Replace with a KMS-backed key before any production issue. */
export const DEMO_PRIVATE_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  d: "nWGxne/9WmC6hEr0kuwsxERJxWl7MmkZcDusAxyuf2A",
  x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
} as const;

export function publicJwk() {
  return { kty: "OKP" as const, crv: "Ed25519", x: DEMO_PRIVATE_JWK.x };
}

export function didDocument(ctx: CareerCtx): Json {
  const did = ctx.issuerDid;
  return {
    "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/multikey/v1"],
    id: did,
    controller: did,
    verificationMethod: [
      {
        id: `${did}#key-1`,
        type: "Multikey",
        controller: did,
        publicKeyJwk: publicJwk(),
      },
    ],
    assertionMethod: [`${did}#key-1`],
    authentication: [`${did}#key-1`],
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((key) => obj[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`).join(",")}}`;
}

export function signPayload(payload: Json): Json {
  const key = createPrivateKey({ key: { ...DEMO_PRIVATE_JWK }, format: "jwk" });
  const bytes = Buffer.from(canonicalJson(payload));
  const signature = sign(null, bytes, key);
  return {
    type: "DataIntegrityProof",
    cryptosuite: "eddsa-rdfc-2022",
    created: new Date().toISOString(),
    proofPurpose: "assertionMethod",
    verificationMethod: "did:web:localhost%3A4020#key-1",
    proofValue: `z${signature.toString("base64url")}`,
    warning:
      "የሃካቶን ማረጋገጫ፦ ኤድ25519 በተደራጀ JSON ላይ ተመስርቷል፤ ሙሉ RDFC-1.0 አይደለም። በአገልጋይ ላይ ማረጋገጥ የሚደገፈው መንገድ ነው።",
  };
}

export function verifyDemoProof(payload: Json, proof: Json): boolean {
  try {
    const { proof: _ignored, ...rest } = payload as Json & { proof?: unknown };
    void _ignored;
    const pub = createPublicKey({ key: publicJwk(), format: "jwk" });
    const value = String(proof.proofValue ?? "").replace(/^z/, "");
    const sig = Buffer.from(value, "base64url");
    return verify(null, Buffer.from(canonicalJson(rest)), pub, sig);
  } catch {
    return false;
  }
}

export function toOpenBadge(record: CredentialRecord, ctx: CareerCtx): Json {
  const status = effectiveStatus(record);
  const verifyUrl = `${ctx.publicBaseUrl}/verify/${record.id}`;
  const body: Json = {
    "@context": [
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ],
    id: verifyUrl,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: record.achievement,
    issuer: {
      id: ctx.issuerDid,
      type: ["Profile"],
      name: ctx.issuerName,
    },
    i18n: {
      ...record.i18n,
      issuerName: {
        en: ctx.issuerNameEn ?? "Savanna Access Kit",
        am: ctx.issuerName,
      },
    },
    validFrom: record.validFrom,
    credentialStatus: {
      id: `${ctx.publicBaseUrl}/v1/credentials/${record.id}`,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      status: status,
    },
    credentialSubject: {
      id: record.recipientRef,
      type: ["AchievementSubject"],
      identifier: record.recipientRef,
      name: record.recipientName ?? undefined,
      achievement: {
        id: `${ctx.publicBaseUrl}/achievements/${encodeURIComponent(record.achievement)}`,
        type: ["Achievement"],
        name: record.achievement,
        description: "ኮርሱን ከጨረሰ በኋላ በሳቫና ተደራሽነት ኪት የተሰጠ።",
        achievementType: "Certificate",
      },
    },
  };
  const proof = record.proof ?? ctx.signCredential(body);
  return { ...body, proof };
}

export function digestId(id: string): string {
  return createHash("sha256").update(id).digest("hex").slice(0, 12);
}
