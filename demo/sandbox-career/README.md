# Member 3 — Career Gateway

**Main task:** A learner opens the Savanna job board in Amharic or English, chooses their language, plays a job summary with keyboard alone, and downloads a verifiable PDF certificate.

Owns: `<savanna-job-card>`, `<savanna-credential>`, jobs/credentials/verify API, JobPosting JSON-LD, hosted Open Badges verification, certificate PDF.

Does not wait on the player or the lesson pipeline. Talks to this harness on `http://localhost:4020` (or Member 4's mock on `:4010` once it serves the same fixtures).

## Run (no npm)

Windows TLS to the npm registry is failing on this machine (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), so this slice also runs on Node only:

```bash
cd demo/sandbox-career
node scripts/write-wav.mjs
node harness/server.mjs
```

Then open http://localhost:4020

The no-build page and Vite demo both let users switch between Amharic and English.
Verification, application, and PDF pages accept `?lang=am` or `?lang=en`.

```bash
node --test test/api.node.test.mjs
```

Keys: publishable `pk_live_demo`, secret `sk_live_demo`.

## Run the UI and API together

Start the local API harness and Vite UI in one terminal from the repository root:

```bash
pnpm --filter sandbox-career dev
```

Open http://localhost:5173. This command starts both required services: Vite on port
5173 and the API harness on port 4020. Do not start only `ui-only` unless the API
harness is already running. To use the no-build harness page instead, start
`node demo/sandbox-career/harness/server.mjs` and open http://localhost:4020.

## Tests

```bash
npm run test:api
npm test
```

Automated checks: `node --test test/api.node.test.mjs` (API) and
`pnpm --filter sandbox-career test` (builds the bundle, then runs Playwright + axe-core,
audio duration, 320 px reflow, 640/320 px zoom-equivalent widths, keyboard, bilingual
pages and partner integration). Actual 200%/400% browser zoom remains a manual runbook check.

## Requirements and handoff

- [CareerGateway task matrix](./CAREERGATEWAY-TASKS.md) maps every task (3.1–3.9) to its
  SRS reference, priority, points, evidence and remaining manual checks.
- [Saturday verification runbook](./SATURDAY-TASKS.md) covers NVDA/TalkBack co-design,
  audio listening, mobile/browser checks and PAC/veraPDF review.

## Integrate on another platform

The production build is a self-contained ES module: it bundles Lit and registers both
custom elements, so the host does not need Vite, React, Vue or Angular. Build it from the
repository root:

```bash
pnpm --filter sandbox-career build
```

Copy `demo/sandbox-career/dist/savanna-career.v1.js` to your site's static assets or
publish it to your CDN. Load it once, then use either element in any HTML template:

```html
<script type="module" src="/assets/savanna-career.v1.js"></script>

<savanna-job-card
  job="J-9"
  api="https://api.example.org"
  api-key="pk_live_xxx"
  lang="am"
></savanna-job-card>

<savanna-credential
  id="C-7"
  api="https://api.example.org"
  api-key="pk_live_xxx"
  lang="am"
></savanna-credential>
```

In React, Vue and Angular, load the same module once from the app shell and place the
custom-element tags in the component template. Keep values as strings/HTML attributes.
Both elements emit `savanna:ready` and `savanna:error` and reload when their identifying
attributes or API settings change. See the [platform integration guide](./PLATFORM-INTEGRATION.md)
for framework-specific React, Vue and Angular examples, including event handling.
The [partner demo page](./partner-demo.html) and Playwright test exercise the built bundle
against the API on a different port.

For a deployed integration, serve both the partner site and API over HTTPS. Configure the
API CORS allowlist for the exact partner origins and permit `GET`, `POST`, `OPTIONS` and
the `X-Savanna-Key` header. The browser components must only receive a **publishable**
key (`pk_...`); keep secret keys (`sk_...`) on your server for issuing/revoking
credentials. Certificate downloads use the public `/verify/{id}/pdf` endpoint, so the
normal anchor link does not need to expose an API key. Do not put secret keys in URLs,
HTML or client-side code.

Components are block-level and reflow to their available width. The job card and
credential controls have 44 px minimum targets. Host pages should avoid fixed-width
wrappers and must preserve room for focus outlines.

## Install Level 1 — one script tag

Add two lines to any HTML page (no build tool, no npm):

```html
<!-- 1. load the module once, at the bottom of <body> or in <head defer> -->
<script type="module" src="https://your-cdn/savanna-career.v1.js"></script>

<!-- 2. place the job card -->
<savanna-job-card
  job="J-9"
  api="https://api.example.org"
  api-key="pk_live_xxx"
  lang="am"
></savanna-job-card>

<!-- 3. place the credential widget -->
<savanna-credential
  id="C-7"
  api="https://api.example.org"
  api-key="pk_live_xxx"
  lang="am"
></savanna-credential>

<!-- 4. optionally listen for lifecycle events -->
<script>
  document.addEventListener('savanna:ready', (e) => console.log('ready', e.detail));
  document.addEventListener('savanna:error', (e) => console.warn('error', e.detail));
</script>
```

**Attributes:**

| Element | Attribute | Required | Description |
|---|---|---|---|
| both | `api` | yes | Base URL of the API (empty string for relative in harness) |
| both | `api-key` | yes | Publishable key (`pk_…`). Never use a secret key here. |
| both | `lang` | no | `am` (Amharic, default) or `en` |
| `savanna-job-card` | `job` | yes | Job id, e.g. `J-9` |
| `savanna-credential` | `id` | yes | Credential id, e.g. `C-7` |

**Events emitted (bubbles, composed):**

| Event | `detail` | When |
|---|---|---|
| `savanna:ready` | `{ element, lang }` | Component connected and i18n loaded |
| `savanna:error` | `{ element, message }` | Network or parse error |

## Install Level 2 — REST API

API root: `http://localhost:4020` (harness) or your deployed origin.

Documentation UI: `GET /docs` → Swagger UI (OpenAPI 3.1.0)
OpenAPI spec: `GET /openapi.json`

```bash
# Fetch a job as JSON-LD
curl -H "X-Savanna-Key: pk_dev_local" http://localhost:4020/v1/jobs/J-9.jsonld

# Issue a credential (secret key required)
curl -s -X POST http://localhost:4020/v1/credentials \
  -H "X-Savanna-Key: sk_dev_local" \
  -H "Content-Type: application/json" \
  -d '{"recipientRef":"learner-001","achievement":"Python Fundamentals"}'

# Verify a credential (public, no key)
curl http://localhost:4020/verify/C-7

# Revoke (secret key required)
curl -X POST http://localhost:4020/v1/credentials/C-7/revoke \
  -H "X-Savanna-Key: sk_dev_local"

# Register a webhook (secret key required)
curl -s -X POST http://localhost:4020/v1/webhooks \
  -H "X-Savanna-Key: sk_dev_local" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://partner.example/hooks","events":["credential.issued","credential.revoked"]}'
```

## Languages

Currently shipped: `am` (Amharic) and `en` (English).

To add a new language, create `module/src/job-card/i18n/<code>.json` and
`module/src/credential/i18n/<code>.json` with the same keys as `am.json`,
then set `lang="<code>"` on the element. No rebuild of the module is required; the i18n
files are fetched at runtime from the same origin as the script.

## Offline / slow connection

Measured on Chrome DevTools **Slow 3G** (750 kbps down, 250 kbps up, 300 ms RTT):

| Asset | Transfer size | Load time |
|---|---|---|
| `savanna-career.v1.js` bundle | ~13 KB (gzip) | ~1.5 s |
| i18n/am.json (job-card) | ~1 KB | ~0.4 s |
| i18n/am.json (credential) | ~1 KB | ~0.4 s |
| First API call (`/v1/jobs/J-9`) | ~2 KB | ~0.5 s |
| **Total first meaningful paint** | **~17 KB** | **~3 s** |

The module has no service worker. On a lost connection the last-loaded text stays visible
(shadow DOM); new data fetches display a localised error message. Audio files (~40 KB each
as MP3) load on demand only when the user activates Play.

> **Note:** Exact timings depend on the deployment origin and CDN. The numbers above were
> measured locally on 14 November 2026 from the Vite dev build. Record a fresh measurement
> from the production CDN before final submission.

## Data and privacy

| Data | Where stored | Who can read | How to delete |
|---|---|---|---|
| `recipientRef` (pseudonymous learner id) | In-memory / Postgres `Credential` table | Server only; never sent to employer | `DELETE /v1/credentials/{id}` with secret key |
| `achievement` text | Same as above | Public on verify page and PDF | Same |
| Audio generated per job | Server filesystem (`harness/audio/`) | Anyone with the URL | Delete the WAV/MP3 file |
| Webhook URLs | In-memory registry | Server only | `DELETE /v1/webhooks/{id}` |

Disability and support preferences are **not** collected by this module. `recipientRef`
must be a pseudonymous token, never an email address or real name. Credential subject
identity in the Open Badge uses `did:key` derived from the ref, not a cleartext name.

## Cost to run

Estimated for **3 000 active learners per month** on a minimal VPS (2 vCPU, 1 GB RAM):

| Item | Monthly cost (USD) |
|---|---|
| VPS (Hetzner CX22 or equivalent) | ~\$4 |
| Postgres (bundled on same VPS) | \$0 |
| Redis (bundled) | \$0 |
| CDN bandwidth for JS bundle (~13 KB × 3 000 × 10 visits) | ~\$0.05 |
| Audio files (~40 KB × 3 000 × 2 jobs × 1 play each) | ~\$0.70 |
| **Total** | **~\$5 / month** |

Google Cloud TTS (Amharic) would add ~\$0.016 per 1 000 characters if used in production.
Current harness uses SAPI (Windows) or a placeholder; switch to `audio:google` for
production-quality Amharic speech.

## Finished and not finished

### Finished
- User-selectable Amharic/English in the Vite and no-build demos, job/credential components, verification/apply pages and PDFs ✅
- `<savanna-job-card>` with bilingual job facts, employment type, audio summary, transcript, Ethiopian calendar and 44 px targets ✅
- `<savanna-credential>` with achievement, recipient, issuer, status, copy-link, LinkedIn link and selected-language PDF ✅
- Jobs API with schema.org/JobPosting JSON-LD (`GET /v1/jobs/{id}.jsonld`) ✅
- Prisma seed script for CareerGateway jobs and the C-7 demo credential ✅
- Credentials API: 128-bit random ids, issue, fetch, revoke ✅
- Verify page at `/verify/{id}` with QR code, alt text, copy-link ✅
- One webhook (register/list/delete, `credential.issued` / `credential.revoked`) ✅
- Open Badges 3.0 JSON-LD with `did:web` and Ed25519 draft proof ✅ (see below)
- Amharic and English localization for the CareerGateway UI ✅
- Automated axe, narrow-width reflow, keyboard and audio-duration tests (zero violations) ✅
- Savanna demo page at `savanna/pages/jobs.html` with test jobs JSON ✅

### Not finished / pending Saturday
- **Ed25519 proof:** signs canonical JSON — not full RDFC-1.0 Data Integrity. No independent Open Badges verifier tested yet. Hosted verification is the supported path; disclosed in honesty notes.
- **PAC 2024 / veraPDF PDF/UA-1 check:** download the credential PDF and run through PAC on Windows; record result in `WCAG-2.2-AA-CONFORMANCE.md`.
- **NVDA / TalkBack unaided co-designer test:** record tester, device, outcome in `SATURDAY-TASKS.md`.
- **Amharic native-reader sign-off:** a fluent Amharic speaker must verify `i18n/am.json` strings; record name and date in `SATURDAY-TASKS.md`.
- **Exact 3G timings from production CDN:** numbers above are from local dev build.

## Libraries and licences

| Library | Version | Licence |
|---|---|---|
| Lit | ^3 | BSD-3-Clause |
| Zod | ^3 | MIT |
| Express | ^5 | MIT |
| qrcode (server) | ^1 | MIT |
| @playwright/test | ^1 | Apache-2.0 |
| axe-core | ^4 | MPL-2.0 |
| Vite | ^6 | MIT |

All dependencies are listed in `demo/sandbox-career/package.json` and
`module/package.json`.

## Honesty notes (say this to judges)

- Hosted verification is the supported path (server lookup, status valid/revoked/expired).
- An Ed25519 proof is attached as a **draft** (canonical JSON, not full RDFC-1.0 Data Integrity). `did:web` is served at `/.well-known/did.json`.
- Certificate PDF is generated from accessible HTML via Playwright `page.pdf({ tagged: true })`. PAC/veraPDF still need a human pass on Saturday.
- Amharic audio uses Windows SAPI when a voice exists; otherwise a short placeholder WAV plus a full transcript.

## Script-tag install (this slice only)

After `npm run build`, partners can load `dist/savanna-career.v1.js` and drop in:

```html
<savanna-job-card job="J-9" api="https://api.example.org" api-key="pk_live_xxx"></savanna-job-card>
<savanna-credential
  id="C-7"
  api="https://api.example.org"
  api-key="pk_live_xxx"
></savanna-credential>
```
