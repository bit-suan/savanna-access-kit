# CareerGateway Saturday Verification Runbook

Use this checklist before submission. Automated checks are evidence for the browser and
API behavior; they do not replace testing with disabled people or PDF conformance tools.
Record the tester, device/browser, date, outcome and any issue for every manual check.

## 1. Automated Baseline

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter sandbox-career exec playwright install chromium
pnpm --filter sandbox-career test
node --test demo/sandbox-career/test/api.node.test.mjs
```

Expected: the component build succeeds; all Playwright tests pass; API tests pass; the
axe check reports zero violations; all four shipped audio files decode to 20–30 seconds;
the PDF contains a structure tree.

## 2. Start the Sandbox

In one terminal:

```bash
cd demo/sandbox-career
node harness/server.mjs
```

Open `http://localhost:4020` for the component/API sandbox. Build and open
`http://localhost:5173/partner-demo.html` to check a plain host page loading the
script-tag bundle while the API runs on a different port.

If port 4020 is occupied, stop the stale harness and restart. If using another port, set
the same `PORT` and `PUBLIC_BASE_URL` values for the harness and the element `api`
attributes.

## 3. Job Card and Audio (Tasks 3.1–3.3)

- [ ] At 320 CSS px, check job cards and controls have no horizontal page scroll.
- [ ] At 200% and 400% browser zoom, confirm facts reflow into one column and controls
      remain visible and reachable.
- [ ] Switch the main and no-build demos between English and Amharic. Confirm job facts,
      employment type, audio transcript, credential details and apply link follow the
      chosen language after reload.
- [ ] With keyboard only, reach Play, start audio, stop audio, open/close the transcript,
      then reach Apply. Confirm visible focus throughout.
- [ ] With NVDA and a browser, navigate the card by headings and definition-list facts.
      Confirm Amharic text is announced in Amharic.
- [ ] Listen to both jobs in English and Amharic with sound on. Confirm the speech matches
      the visible transcript and is not a tone/silent fallback.
- [ ] Repeat the main task with sound off and transcript open. Ask a co-designer to do it
      unaided; record their feedback and any blockers.
- [ ] Confirm no audio starts before the user activates Play.
- [ ] Check the Amharic deadline uses the Ethiopian calendar and Ethiopic script.

Audio generation:

```bash
pnpm --filter sandbox-career audio J-9 en
pnpm --filter sandbox-career audio:google J-9
```

The first command uses an installed Windows voice when one is available; its fallback is
a placeholder, not spoken audio. `audio:google` creates Amharic MP3 speech. Azure TTS is
also available through `audio:azure` when its key and region are configured. Re-run the
automated duration test after replacing assets.

## 4. Credential and Verification (Tasks 3.4–3.6)

- [ ] Issue a credential using the secret key; verify its id is 32 hexadecimal
      characters (128 random bits).
- [ ] Open its verify page on a phone-sized viewport. Check the status, achievement,
      recipient, issuer, QR code and copy-link action.
- [ ] Open `/verify/{id}?lang=en` and `/verify/{id}?lang=am`; confirm the selected
      language is retained by the copied URL and the PDF download link.
- [ ] Open `/apply/J-9?lang=en` and `/apply/J-9?lang=am`; confirm labels, errors and
      success feedback follow the selected language.
- [ ] Use TalkBack or NVDA to confirm the QR code has an accessible name and the status
      and copy result are announced.
- [ ] Revoke the credential, refresh the page, and confirm `Revoked` is immediately
      visible in both HTML and JSON-LD.
- [ ] Load `dist/savanna-career.v1.js` from a plain HTML page on a partner origin; verify
      the job card and credential load from the configured API. Repeat on the actual
      target integration platform.
- [ ] Confirm only a publishable key is present in client code. Keep issue/revoke secret
      keys on the server.

## 5. Certificate PDF and Open Badges (Tasks 3.7–3.8)

- [ ] Download the PDF from the credential component and confirm it opens and includes
      the achievement, recipient, status and verification URL.
- [ ] Download both `/verify/{id}/pdf?lang=en` and `?lang=am`; confirm language and
      Ethiopic calendar formatting are correct.
- [ ] Run PAC 2024 and veraPDF in PDF/UA-1 mode. Record tool versions and results; check
      the reading order and tags with NVDA. Do not claim PDF/UA conformance until these
      checks pass.
- [ ] Fetch `/openapi.json` and confirm version 3.1.0. Fetch the credential as
      `application/ld+json`, then inspect the `OpenBadgeCredential` and issuer `did:web`.
- [ ] Verify hosted status lookup for valid, revoked and expired credentials.
- [ ] Disclose that the current Ed25519 proof signs canonical JSON and is not full
      RDFC-1.0 Data Integrity. Hosted verification is the supported path; do not claim
      independent Open Badges verifier acceptance.

## 6. Accessibility Gate and Handoff (Task 3.9)

- [ ] Run the automated baseline again after all manual-test fixes.
- [ ] Confirm the axe result has zero critical/serious issues (the current browser test
      also requires zero issues at all).
- [ ] Record unaided co-designer testing with keyboard, NVDA or TalkBack, 200% zoom and
      sound off. Keep consent and avoid recording personal information.
- [ ] Add the date, tester and results here and update `WCAG-2.2-AA-CONFORMANCE.md`.
- [ ] Submit this runbook, the requirements matrix and the WCAG report with the code.
