import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "../lib/context";
import { signPayload } from "./open-badges.js";
import type {
  CareerCtx,
  CareerStore,
  CredentialRecord,
  JobRecord,
  Json,
  LocalizedText,
} from "./career-types.js";

type PrismaDelegate = {
  findMany(args?: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: { where: { id: string } }): Promise<unknown>;
  upsert(args: {
    where: { id: string };
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<unknown>;
};

type CareerPrismaClient = {
  job: PrismaDelegate;
  credential: PrismaDelegate;
};

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../contracts/fixtures/v1",
);
const amharicContent = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "member3-amharic.json"), "utf8"),
) as {
  jobs: Record<string, Pick<JobRecord, "title" | "employer" | "location" | "payText">>;
  credentials: Record<string, Pick<CredentialRecord, "recipientName" | "achievement">>;
  issuerName: string;
  issuerNameEn?: string;
};
const jobIndex = JSON.parse(readFileSync(path.join(fixturesDir, "jobs.json"), "utf8")) as {
  jobs: Array<{ id: string }>;
};

const englishJobs = new Map(
  jobIndex.jobs.map(({ id }) => [
    id,
    JSON.parse(readFileSync(path.join(fixturesDir, "jobs", `${id}.json`), "utf8")) as JobRecord,
  ]),
);
const seedCredentialFixture = JSON.parse(
  readFileSync(path.join(fixturesDir, "credentials", "C-7.json"), "utf8"),
) as CredentialRecord;

function localizedText(en?: string | null, am?: string | null): LocalizedText | undefined {
  if (en == null && am == null) return undefined;
  return { en: en ?? am ?? "", am: am ?? en ?? "" };
}

function localizeJob(job: JobRecord): JobRecord {
  const english = englishJobs.get(job.id) ?? job;
  const amharic: (typeof amharicContent.jobs)[string] =
    amharicContent.jobs[job.id] ?? {
      title: job.title,
      employer: job.employer,
      location: job.location,
      payText: job.payText,
    };
  return {
    ...job,
    ...amharic,
    i18n: {
      title: localizedText(english.title, amharic.title ?? job.title),
      employer: localizedText(english.employer, amharic.employer ?? job.employer),
      location: localizedText(english.location, amharic.location ?? job.location),
      payText: localizedText(english.payText, amharic.payText ?? job.payText),
    },
  };
}

function localizeCredential(record: CredentialRecord): CredentialRecord {
  const english = record.id === seedCredentialFixture.id ? seedCredentialFixture : record;
  const amharic: (typeof amharicContent.credentials)[string] =
    amharicContent.credentials[record.id] ?? {
      achievement: record.achievement,
      recipientName: record.recipientName ?? undefined,
    };
  return {
    ...record,
    ...amharic,
    i18n: {
      achievement:
        record.i18n?.achievement ??
        localizedText(english.achievement, amharic.achievement ?? record.achievement),
      recipientName:
        record.i18n?.recipientName ??
        localizedText(
          english.recipientName,
          amharic.recipientName ?? record.recipientName,
        ),
    },
  };
}

const memoryJobs = new Map(
  jobIndex.jobs.map(({ id }) => [
    id,
    localizeJob(englishJobs.get(id)!),
  ]),
);
const seedCredential = localizeCredential(seedCredentialFixture);
const memoryCredentials = new Map<string, CredentialRecord>([[seedCredential.id, seedCredential]]);

function prismaFor(ctx: Ctx): CareerPrismaClient | undefined {
  if (ctx.config.store !== "prisma") return undefined;
  if (!ctx.prisma) throw new Error("STORE=prisma requires a generated Prisma client.");
  return ctx.prisma as CareerPrismaClient;
}

function jobFromPrisma(value: unknown): JobRecord {
  const row = value as Record<string, unknown>;
  const validThrough = row.validThrough;
  return localizeJob({
    ...(row as unknown as JobRecord),
    validThrough:
      validThrough instanceof Date
        ? validThrough.toISOString()
        : typeof validThrough === "string"
          ? validThrough
          : null,
  });
}

function credentialFromPrisma(value: unknown): CredentialRecord {
  const row = value as Record<string, unknown>;
  const dateString = (value: unknown) =>
    value instanceof Date ? value.toISOString() : String(value ?? "");
  return localizeCredential({
    ...(row as unknown as CredentialRecord),
    issuedAt: dateString(row.issuedAt),
    validFrom: dateString(row.validFrom),
    expiresAt: row.expiresAt ? dateString(row.expiresAt) : null,
    status: row.status as CredentialRecord["status"],
    proof: (row.proof as Json | null | undefined) ?? null,
    i18n: (row.i18n as CredentialRecord["i18n"] | null | undefined) ?? undefined,
  });
}

function credentialData(record: CredentialRecord): Record<string, unknown> {
  return {
    id: record.id,
    recipientRef: record.recipientRef,
    recipientName: record.recipientName ?? null,
    achievement: record.achievement,
    issuedAt: new Date(record.issuedAt),
    validFrom: new Date(record.validFrom),
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
    status: record.status,
    proof: record.proof ?? undefined,
    i18n: record.i18n ?? undefined,
  };
}

export function createMember3CareerContext(ctx: Ctx): CareerCtx {
  const prisma = prismaFor(ctx);
  const store: CareerStore = {
    async listJobs() {
      if (prisma) {
        return (await prisma.job.findMany({ orderBy: { id: "asc" } })).map(jobFromPrisma);
      }
      return [...memoryJobs.values()];
    },
    async getJob(id) {
      if (prisma) {
        const row = await prisma.job.findUnique({ where: { id } });
        return row ? jobFromPrisma(row) : null;
      }
      return memoryJobs.get(id) ?? null;
    },
    async getCredential(id) {
      if (prisma) {
        const row = await prisma.credential.findUnique({ where: { id } });
        return row ? credentialFromPrisma(row) : null;
      }
      return memoryCredentials.get(id) ?? null;
    },
    async saveCredential(record) {
      if (prisma) {
        const data = credentialData(record);
        const row = await prisma.credential.upsert({
          where: { id: record.id },
          create: data,
          update: data,
        });
        return credentialFromPrisma(row);
      }
      memoryCredentials.set(record.id, record);
      return record;
    },
  };

  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${ctx.config.port}`;
  const issuerDid = `did:web:${encodeURIComponent(new URL(publicBaseUrl).host)}`;

  return {
    store,
    publishableKeys: new Set(ctx.config.partners.map((partner) => partner.key)),
    secretKeys: new Set([ctx.config.secretKey]),
    publicBaseUrl,
    issuerName: amharicContent.issuerName,
    issuerNameEn: amharicContent.issuerNameEn ?? "Savanna Access Kit",
    issuerDid,
    signCredential(payload) {
      return {
        ...signPayload(payload),
        verificationMethod: `${issuerDid}#key-1`,
      };
    },
  };
}
