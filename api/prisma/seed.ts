// Fills PostgreSQL from contracts/fixtures (same data the mock server and the memory store use).
//   pnpm --filter @savanna/api db:generate && pnpm --filter @savanna/api db:push && pnpm --filter @savanna/api db:seed
import { PrismaClient, type Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedData } from "../src/db/seedData";

const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://savanna:savanna@localhost:5432/savanna" });
const { lessons, transcripts } = loadSeedData();
const fixtures = fileURLToPath(new URL("../../contracts/fixtures/v1/", import.meta.url));
const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(fixtures, file), "utf8")) as T;
const jobIndex = readJson<{ jobs: Array<{ id: string }> }>("jobs.json");
const amharic = JSON.parse(
  fs.readFileSync(new URL("../src/routes/member3-amharic.json", import.meta.url), "utf8"),
) as {
  jobs: Record<string, { title: string; employer: string; location: string; payText?: string }>;
  credentials: Record<string, { achievement: string; recipientName?: string }>;
};

for (const l of lessons) {
  await prisma.lesson.upsert({
    where: { id: l.id },
    create: { id: l.id, title: l.title, durationSec: l.durationSec },
    update: { title: l.title, durationSec: l.durationSec },
  });
  await prisma.lessonAsset.deleteMany({ where: { lessonId: l.id } });
  await prisma.lessonAsset.createMany({ data: l.assets.map((a) => ({ ...a, lessonId: l.id, meta: a.meta ?? undefined })) });
}
for (const t of transcripts) {
  await prisma.transcript.upsert({
    where: { lessonId_lang: { lessonId: t.id, lang: t.lang } },
    create: { lessonId: t.id, lang: t.lang, lines: t.lines },
    update: { lines: t.lines },
  });
}
for (const { id } of jobIndex.jobs) {
  const job = readJson<{
    id: string;
    title: string;
    employer: string;
    location: string;
    remote: boolean;
    payText?: string | null;
    validThrough?: string | null;
    employmentType?: string;
    description: object;
    audioSummary: object;
    applyUrl: string;
  }>(path.join("jobs", `${id}.json`));
  const localized = amharic.jobs[id] ?? {};
  const data = {
    title: localized.title ?? job.title,
    employer: localized.employer ?? job.employer,
    location: localized.location ?? job.location,
    remote: job.remote,
    payText: localized.payText ?? job.payText ?? null,
    validThrough: job.validThrough ? new Date(job.validThrough) : null,
    employmentType: job.employmentType ?? "FULL_TIME",
    description: job.description as Prisma.InputJsonValue,
    audioSummary: job.audioSummary as Prisma.InputJsonValue,
    applyUrl: job.applyUrl,
  };
  await prisma.job.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });
}
const credential = readJson<{
  id: string;
  recipientRef: string;
  recipientName?: string | null;
  achievement: string;
  issuedAt: string;
  validFrom: string;
  expiresAt?: string | null;
  status: string;
}>(path.join("credentials", "C-7.json"));
const credentialAm = amharic.credentials[credential.id] ?? {};
const credentialI18n = {
  achievement: {
    en: credential.achievement,
    am: credentialAm.achievement ?? credential.achievement,
  },
  recipientName: {
    en: credential.recipientName ?? "Learner",
    am: credentialAm.recipientName ?? credential.recipientName ?? "Learner",
  },
};
const credentialData = {
  recipientRef: credential.recipientRef,
  recipientName: credentialAm.recipientName ?? credential.recipientName ?? null,
  achievement: credentialAm.achievement ?? credential.achievement,
  issuedAt: new Date(credential.issuedAt),
  validFrom: new Date(credential.validFrom),
  expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
  status: credential.status,
  i18n: credentialI18n as Prisma.InputJsonValue,
};
await prisma.credential.upsert({
  where: { id: credential.id },
  create: { id: credential.id, ...credentialData },
  update: credentialData,
});
console.log(
  `Seeded ${lessons.length} lessons, ${transcripts.length} transcripts, ${jobIndex.jobs.length} jobs and 1 demo credential.`,
);
await prisma.$disconnect();
