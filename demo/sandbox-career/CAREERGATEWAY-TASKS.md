# CareerGateway Task Matrix

Mission: deliver the job card and verifiable certificate front to back.

Scope: `demo/sandbox-career/index.html`, the local API harness, and the CareerGateway
components/API. This work does not depend on the player or lesson content.

The repository was reorganized on `main`; the brief's former `apps/sandbox-career/`
path is now `demo/sandbox-career/`. The current UI and run commands use the new path.
The brief's `apps/api/` examples map to `api/` here: Prisma models are in
`api/prisma/schema/career.prisma`, route modules are in `api/src/routes/`, and the
CareerGateway Web Components are in `module/src/job-card/` and `module/src/credential/`.
Amharic and English are both available, with a user-operated language choice throughout
the demo, job/credential components, verification/apply pages and selected-language PDFs.

## Requirements

| ID  | Task                                                                                | SRS          | Priority | Points | Status and evidence                                                                                                                                                                                       |
| --- | ----------------------------------------------------------------------------------- | ------------ | -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | `<savanna-job-card>` semantic facts, employment type, reflow and 44 px targets       | FR-J1, FR-J3 | M        | 3      | Implemented. Uses an article, heading and `<dl>`; tests cover bilingual facts, 320 px and 640/320 px zoom-equivalent widths. Manual 200%/400% browser zoom remains in the runbook.                      |
| 3.2 | Play/stop audio, transcript, no autoplay; generate 20–30 second EN/AM audio per job | FR-J2        | M        | 2      | Implemented for checked-in J-9/J-10 audio. Browser tests decode all four files and assert 20–30 seconds. Screen-reader and human listening checks remain in the runbook.                                |
| 3.3 | Prisma job model, jobs routes, schema.org `JobPosting` JSON-LD and seed data        | FR-J4        | M        | 2      | Implemented. `api/prisma/seed.ts` seeds jobs and C-7 from fixtures; tests check `/v1/jobs/J-9.jsonld` and preserve additive EN/AM fields.                                                            |
| 3.4 | Random 128-bit credential IDs; secret-key issue, fetch, sign and revoke              | FR-C1, FR-C4 | M        | 2      | Implemented. Issue/revoke require the secret key; IDs use 16 random bytes and issued credentials receive an Ed25519 demo proof. Tests confirm fetch reflects revocation. Proof limitations are recorded under 3.8. |
| 3.5 | Accessible bilingual `/verify/{id}` page with status, QR alt text and copy link      | FR-C3        | M        | 2      | Implemented. `?lang=am|en` controls page, copy URL and PDF language; tests cover status, QR name, copy action and 320 px reflow. Manual phone/screen-reader check remains.                             |
| 3.6 | `<savanna-credential>` summary, recipient, issuer, copy and LinkedIn actions        | FR-C5        | M        | 2      | Implemented. Built script-tag bundle and no-build elements register both widgets; partner page exercises bilingual output against the API.                                                           |
| 3.7 | Tagged certificate PDF from accessible HTML via headless Chromium                   | FR-D3, FR-C5 | S        | 2      | Implemented in Amharic or English via the selected page language. Automated test checks PDF response and structure tree; PAC 2024 and veraPDF/PDF-UA-1 remain required.                              |
| 3.8 | Open Badges 3.0 JSON-LD, `did:web` and Ed25519 proof                                | FR-C2        | S        | 3      | Hosted verification fallback is implemented and documented. The proof is Ed25519 over canonical JSON, not full RDFC-1.0 Data Integrity; acceptance by an independent Open Badges verifier is not claimed. |
| 3.9 | axe, zoom, keyboard and NVDA tests; Saturday task script                            | NFR-A        | M        | 1      | Automated axe, keyboard, narrow-width reflow, mobile, API, audio-duration and script-tag tests are in place. Actual 200%/400% zoom and human NVDA/TalkBack/co-designer checks are listed in `SATURDAY-TASKS.md` and remain to be recorded. |

## Verification Commands

From the repository root:

```bash
pnpm --filter sandbox-career test
node --test demo/sandbox-career/test/api.node.test.mjs
pnpm --filter sandbox-career build
```

`pnpm --filter sandbox-career test` builds the partner bundle and runs Playwright. PDF
generation additionally requires the Playwright Chromium browser installed.

## Integration Contract

- Host the built `dist/savanna-career.v1.js` as a static ES module.
- Set each element's `api`, `api-key` (publishable only), and `lang` attributes.
- Configure production API CORS for the partner's HTTPS origin, `OPTIONS`, and
  `X-Savanna-Key`.
- Keep secret keys server-side. Never ship them in browser code or query strings.
- Use HTTPS for the host, component asset and API.
