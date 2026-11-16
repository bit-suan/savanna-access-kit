# WCAG 2.2 AA conformance report — Career Gateway (Member 3)

Required submission artifact (deck slides 14 and 16: _"your team submits a WCAG 2.2 AA
conformance report with the code"_). Scope is the Career Gateway slice only:
`<savanna-job-card>`, `<savanna-credential>`, the `/verify/{id}` page, the apply form,
the JSON-LD APIs and the certificate PDF. It does **not** cover the player, lessons or
the host page shell (those are other members' surfaces).

|           |                                                                                            |
| --------- | ------------------------------------------------------------------------------------------ |
| Product   | Savanna Access Kit — Career Gateway                                                        |
| Target    | WCAG 2.2 Level AA                                                                          |
| Evaluated | 15 November 2026 (automated tests + source review; manual gates remain pending)          |
| Evaluator | Member 3 (self-assessment)                                                                 |
| Contact   | see the Telegram group `t.me/AccessibilityHackathon2026`                                   |

## How to reproduce

```bash
cd demo/sandbox-career
node harness/server.mjs                    # API + no-build sandbox on http://localhost:4020
pnpm --filter sandbox-career test          # Playwright + axe-core and production bundle
node --test test/api.node.test.mjs
```

## Evidence

- **axe-core** (`@axe-core/playwright`, `test/career.spec.ts`): asserts **zero critical and
  zero serious** violations, and in fact zero violations of any impact, on the sandbox
  page carrying the job card and the credential. This is the deck's gate (slide 14).
- **Reflow**: 320 px viewport with no horizontal scroll; automated tests also exercise
  640 px and 320 px widths as 200%/400%-equivalent reflow checks. Actual browser zoom is
  still a manual check in `SATURDAY-TASKS.md`.
- **Keyboard**: play/stop audio, focus the Apply link, submit the apply form — all with
  the keyboard only (`career.spec.ts`).
- **Contrast** (measured, WCAG 2.x formula): button text on accent 6.70:1, accent on white
  6.70:1, valid chip 8.89:1, revoked chip 9.37:1, body text 18.88:1, transcript 17.17:1 —
  all ≥ 4.5:1.
- **Source review**: semantic `<article>`/`<h2>`/`<dl>`, `lang` per component, 44 px
  targets, `role="status"` live regions, `preload="none"` (no autoplay).

## Conformance by criterion (in-scope surfaces)

| SC                                      | Level | Status         | Note                                                                 |
| --------------------------------------- | ----- | -------------- | -------------------------------------------------------------------- |
| 1.1.1 Non-text Content                  | A     | Supports       | QR SVG has `role="img"` + "QR code linking to …"                     |
| 1.2.1 Audio-only (Prerecorded)          | A     | Supports       | Audio summary has an equivalent transcript on the card               |
| 1.2.2/1.2.3 Captions, Audio Description | A     | Not applicable | No video in this slice                                               |
| 1.3.1 Info and Relationships            | A     | Supports       | `<article>`, heading, `<dl>` facts, `<ul>` requirements              |
| 1.3.2 Meaningful Sequence               | A     | Supports       | Reading order matches visual order                                   |
| 1.3.4 Orientation                       | AA    | Supports       | No orientation lock                                                  |
| 1.3.5 Identify Input Purpose            | AA    | Supports       | `autocomplete` on apply form fields                                  |
| 1.4.1 Use of Color                      | A     | Supports       | Status is text ("Valid"/"Revoked"/"Expired"), not colour alone       |
| 1.4.3 Contrast (Minimum)                | AA    | Supports       | Measured ratios above, all ≥ 4.5:1                                   |
| 1.4.4 Resize Text                       | AA    | Needs manual   | rem-based type; narrow-width checks pass, actual 200%/400% zoom pending |
| 1.4.10 Reflow                           | AA    | Supports       | 320 px, no horizontal scroll                                         |
| 1.4.11 Non-text Contrast                | AA    | Supports       | Focus outline and borders ≥ 3:1 on their backgrounds                 |
| 1.4.12 Text Spacing                     | AA    | Supports       | No fixed heights that clip; `overflow-wrap: anywhere`                |
| 1.4.13 Content on Hover or Focus        | AA    | Supports       | Only the native `<details>` disclosure is used                       |
| 2.1.1 Keyboard                          | A     | Supports       | All actions reachable by keyboard                                    |
| 2.1.2 No Keyboard Trap                  | A     | Supports       | No focus traps                                                       |
| 2.2.1 Timing Adjustable                 | A     | Supports       | Apply form has no time limit ("There is no time limit on this form") |
| 2.2.2 Pause, Stop, Hide                 | A     | Supports       | Audio has a stop control and never autoplays                         |
| 2.4.2 Page Titled                       | A     | Supports       | Verify page and apply page have descriptive titles                   |
| 2.4.3 Focus Order                       | A     | Supports       | Logical tab order                                                    |
| 2.4.4 Link Purpose (In Context)         | A     | Supports       | Descriptive link text                                                |
| 2.4.6 Headings and Labels               | AA    | Supports       |                                                                      |
| 2.4.7 Focus Visible                     | AA    | Supports       | 3 px outline, 2–3 px offset                                          |
| 2.4.11 Focus Not Obscured (Minimum)     | AA    | Supports       | No sticky/overlay elements cover the focused control                 |
| 2.5.3 Label in Name                     | A     | Supports       | Visible labels match accessible names                                |
| 2.5.8 Target Size (Minimum)             | AA    | Supports       | Targets are 44 × 44 px (above the 24 px minimum)                     |
| 3.1.1 Language of Page                  | A     | Supports       | User can switch `lang` between `am` and `en` on each CareerGateway surface |
| 3.1.2 Language of Parts                 | AA    | Supports       | Amharic content marked `lang="am"`                                   |
| 3.2.6 Consistent Help                   | A     | Supports       | Help/verify links sit in a consistent place                          |
| 3.3.1 Error Identification              | A     | Supports       | Apply form shows a text error summary and moves focus                |
| 3.3.2 Labels or Instructions            | A     | Supports       | Every field has a visible `<label>`                                  |
| 3.3.7 Redundant Entry                   | A     | Supports       | Single-step form, no re-entry                                        |
| 4.1.2 Name, Role, Value                 | A     | Supports       | Buttons/links carry name, role and state (`aria-pressed`)            |
| 4.1.3 Status Messages                   | AA    | Supports       | `role="status"` live regions announce play/stop and copy             |

## Not yet evaluated (manual pass on 15 November)

These are the deck's other gate items and cannot be asserted by automation. Run them
before submitting.

- [ ] A co-designer completes the main task unaided with **NVDA**, **TalkBack**, keyboard
      only, 200% zoom and **sound off** (deck slide 14).
- [ ] Manually verify actual browser zoom at 200% and 400%; automated narrow-width checks
      are evidence for reflow, but do not replace browser zoom testing.
- [ ] Certificate PDF: **PAC 2024** and **veraPDF (PDF/UA-1)** pass; NVDA reads tags in order.
- [ ] Ethiopian calendar check: Amharic dates render in the Ge'ez calendar (`am-ET-u-ca-ethiopic`).

## Known exceptions

- The certificate PDF tagging depends on the headless Chromium build (`page.pdf({ tagged: true })`);
  until PAC/veraPDF sign off, treat the HTML certificate as the primary, fully-conformant output.
- The Open Badges proof is canonical-JSON Ed25519, not full RDFC-1.0 Data Integrity — this affects
  verifiability, not accessibility, but it is disclosed in `README.md`.
