import type { Router } from "express";
import { z } from "zod";
import type { Ctx } from "../lib/context";
import type { OperationDoc } from "../lib/openapi";
import { jobToJsonLd, pathParam } from "./career-lib.js";
import { createMember3CareerContext } from "./_member3-career-store.js";

const AudioSummarySchema = z.object({
  url: z.string(),
  durationSec: z.number().nonnegative(),
  transcript: z.string(),
});

const LocalizedTextSchema = z.object({ en: z.string(), am: z.string() });

const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  employer: z.string(),
  location: z.string(),
  remote: z.boolean(),
  payText: z.string().nullable().optional(),
  validThrough: z.string().nullable().optional(),
  employmentType: z.string().optional(),
  applyUrl: z.string(),
  i18n: z
    .object({
      title: LocalizedTextSchema.optional(),
      employer: LocalizedTextSchema.optional(),
      location: LocalizedTextSchema.optional(),
      payText: LocalizedTextSchema.optional(),
    })
    .optional(),
  description: z.object({
    en: z.string(),
    am: z.string(),
    requirements: z
      .object({ en: z.array(z.string()), am: z.array(z.string()) })
      .optional(),
  }),
  audioSummary: z.object({ en: AudioSummarySchema, am: AudioSummarySchema }),
});

const JobListSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      employer: z.string(),
      location: z.string(),
      remote: z.boolean(),
    }),
  ),
});

const JobPostingSchema = z.looseObject({
  "@context": z.string().url(),
  "@type": z.literal("JobPosting"),
  identifier: z.string(),
  title: z.string(),
  description: z.string(),
  datePosted: z.string(),
  validThrough: z.string().optional(),
  employmentType: z.string(),
  hiringOrganization: z.looseObject({ "@type": z.string(), name: z.string() }),
  jobLocation: z.looseObject({
    "@type": z.string(),
    address: z.looseObject({
      "@type": z.string(),
      addressLocality: z.string(),
      addressCountry: z.string(),
    }),
  }),
  jobLocationType: z.string(),
  url: z.string().url(),
  directApply: z.boolean(),
});

const JobIdParams = z.object({
  id: z.string().min(1).describe("Career job id, for example J-9."),
});

export function register(router: Router, ctx: Ctx): void {
  const career = createMember3CareerContext(ctx);

  router.get("/jobs", async (_req, res) => {
    const jobs = await career.store.listJobs();
    res.json({
      jobs: jobs.map(({ id, title, employer, location, remote }) => ({
        id,
        title,
        employer,
        location,
        remote,
      })),
    });
  });

  router.get("/jobs/:id.jsonld", async (req, res) => {
    const id = pathParam(req, "id");
    const job = await career.store.getJob(id);
    if (!job) {
      res.status(404).json({ type: "about:blank", title: "Not Found", status: 404, detail: `Job ${id} was not found.` });
      return;
    }
    res.type("application/ld+json").json(jobToJsonLd(job, career.publicBaseUrl));
  });

  router.get("/jobs/:id", async (req, res) => {
    const id = pathParam(req, "id");
    const job = await career.store.getJob(id);
    if (!job) {
      res.status(404).json({ type: "about:blank", title: "Not Found", status: 404, detail: `Job ${id} was not found.` });
      return;
    }
    res.json(job);
  });
}

export const openapi: OperationDoc[] = [
  {
    method: "get",
    path: "/jobs",
    summary: "List CareerGateway jobs",
    tags: ["CareerGateway"],
    responses: {
      200: { description: "Published job summaries.", schema: JobListSchema },
    },
  },
  {
    method: "get",
    path: "/jobs/{id}",
    summary: "Get a CareerGateway job",
    tags: ["CareerGateway"],
    params: JobIdParams,
    responses: {
      200: { description: "The bilingual job card data.", schema: JobSchema },
      404: { description: "No job exists with this id." },
    },
  },
  {
    method: "get",
    path: "/jobs/{id}.jsonld",
    summary: "Get a job as schema.org JobPosting JSON-LD",
    tags: ["CareerGateway"],
    params: JobIdParams,
    responses: {
      200: {
        description: "A schema.org JobPosting.",
        schema: JobPostingSchema,
        contentType: "application/ld+json",
      },
      404: { description: "No job exists with this id." },
    },
  },
];
