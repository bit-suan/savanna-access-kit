import type { Router } from "express";

export type Json = Record<string, unknown>;

export type LocalizedText = {
  en: string;
  am: string;
};

export type JobRecord = {
  id: string;
  title: string;
  employer: string;
  location: string;
  remote: boolean;
  payText?: string | null;
  validThrough?: string | null;
  employmentType?: string;
  applyUrl: string;
  i18n?: {
    title?: LocalizedText;
    employer?: LocalizedText;
    location?: LocalizedText;
    payText?: LocalizedText;
  };
  description: {
    en: string;
    am: string;
    requirements?: { en: string[]; am: string[] };
  };
  audioSummary: {
    en: { url: string; durationSec: number; transcript: string };
    am: { url: string; durationSec: number; transcript: string };
  };
};

export type CredentialRecord = {
  id: string;
  recipientRef: string;
  recipientName?: string | null;
  achievement: string;
  issuedAt: string;
  validFrom: string;
  expiresAt?: string | null;
  status: "valid" | "revoked" | "expired";
  proof?: Json | null;
  i18n?: {
    achievement?: LocalizedText;
    recipientName?: LocalizedText;
  };
};

export type CareerStore = {
  listJobs(): Promise<JobRecord[]>;
  getJob(id: string): Promise<JobRecord | null>;
  getCredential(id: string): Promise<CredentialRecord | null>;
  saveCredential(record: CredentialRecord): Promise<CredentialRecord>;
};

export type CareerCtx = {
  store: CareerStore;
  publishableKeys: Set<string>;
  secretKeys: Set<string>;
  publicBaseUrl: string;
  issuerName: string;
  issuerNameEn?: string;
  issuerDid: string;
  signCredential: (payload: Json) => Json | null;
};

export type RouteModule = {
  register: (router: Router, ctx: CareerCtx) => void;
  openapi: Json;
};
