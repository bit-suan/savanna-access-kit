import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("job card and credential render and pass axe", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" }),
  ).toBeVisible();
  await expect(page.getByText("ሙሉ ጊዜ")).toBeVisible();
  await expect(page.getByRole("link", { name: /ለዚህ ስራ ያመልክቱ/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /የድምጽ ማጠቃለያ አጫውት/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "የምስክር ወረቀት", exact: true })).toBeVisible();
  await expect(page.getByText("ማሳያ ተማሪ")).toBeVisible();
  await expect(page.getByText("የሳቫና ተደራሽነት ኪት")).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  // Hackathon gate (deck s14): axe-core clean — zero critical and zero serious.
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("320px viewport has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" }),
  ).toBeVisible();
  const scroll = await page.evaluate(() => ({
    inner: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(scroll.scroll).toBeLessThanOrEqual(scroll.inner + 1);
});

test("200% and 400% zoom-equivalent widths reflow without horizontal scroll", async ({ page }) => {
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    const columns = await page
      .locator("savanna-job-card")
      .first()
      .evaluate((element) => {
        const facts = element.shadowRoot!.querySelector("dl")!;
        return getComputedStyle(facts).gridTemplateColumns.split(" ").length;
      });
    expect(columns).toBe(1);
  }
});

test("job and credential action targets are at least 44px", async ({ page }) => {
  await page.goto("/");
  for (const selector of ["savanna-job-card", "savanna-credential"]) {
    const sizes = await page.locator(selector).evaluate((element) =>
      Array.from(element.shadowRoot!.querySelectorAll("button, a.action")).map((control) => {
        const rect = control.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("keyboard can play audio summary and open apply", async ({ page }) => {
  await page.goto("/");
  const play = page.locator("savanna-job-card").getByRole("button");
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(play).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("link", { name: /ለዚህ ስራ ያመልክቱ/ }).focus();
  await expect(page.getByRole("link", { name: /ለዚህ ስራ ያመልክቱ/ }).first()).toBeFocused();
});

test("Amharic job dates use the Ethiopian calendar", async ({ page }) => {
  await page.goto("/");
  const jobCard = page.locator("savanna-job-card").first();
  await expect(jobCard.locator("article[lang='am']")).toBeVisible();
  const displayedDate = await jobCard.locator("dl dd").nth(4).textContent();
  const calendar = await page.evaluate(() => {
    const formatter = new Intl.DateTimeFormat("am-ET-u-ca-ethiopic", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const parts = (date: string) =>
      Object.fromEntries(
        formatter
          .formatToParts(new Date(date))
          .filter((part) => ["day", "month", "year"].includes(part.type))
          .map(({ type, value }) => [type, value]),
      );
    const monthLengths = new Map<string, number>();
    for (let offset = 0; offset < 365; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 11 + offset));
      const dateParts = formatter.formatToParts(date);
      const month = dateParts.find((part) => part.type === "month")!.value;
      const day = Number(dateParts.find((part) => part.type === "day")!.value);
      monthLengths.set(month, Math.max(monthLengths.get(month) ?? 0, day));
    }
    return {
      expectedDate: formatter.format(new Date("2026-12-31T23:59:59.000Z")),
      deadline: parts("2026-12-31T23:59:59.000Z"),
      tahsasEnd: parts("2027-01-08T12:00:00.000Z"),
      tirStart: parts("2027-01-09T12:00:00.000Z"),
      credentialIssued: formatter.format(new Date("2026-11-12T08:00:00.000Z")),
      monthLengths: Array.from(monthLengths.values()),
    };
  });
  expect(calendar.deadline).toEqual({ day: "22", month: "ታኅሣሥ", year: "2019" });
  expect(calendar.tahsasEnd).toEqual({ day: "30", month: "ታኅሣሥ", year: "2019" });
  expect(calendar.tirStart).toEqual({ day: "1", month: "ጥር", year: "2019" });
  expect(calendar.monthLengths).toHaveLength(13);
  expect(calendar.monthLengths.slice(0, 12)).toEqual(Array(12).fill(30));
  expect(calendar.monthLengths[12]).toBe(5);
  expect(displayedDate?.trim()).toBe(calendar.expectedDate);

  const j9 = await page.request.get("http://localhost:4020/v1/jobs/J-9", {
    headers: { "X-Savanna-Key": "pk_live_demo" },
  });
  const j10 = await page.request.get("http://localhost:4020/v1/jobs/J-10", {
    headers: { "X-Savanna-Key": "pk_live_demo" },
  });
  expect((await j9.json()).audioSummary.am.transcript).toContain("ታኅሣሥ 22 ቀን 2019");
  expect((await j10.json()).audioSummary.am.transcript).toContain("ጥር 7 ቀን 2019");

  const credential = page.locator("savanna-credential");
  await expect(credential.locator("article[lang='am']")).toBeVisible();
  await expect(credential.locator("article p").nth(3)).toContainText(calendar.credentialIssued);
});

test("language switch toggles the whole demo between Amharic and English", async ({ page }) => {
  await page.goto("/");
  const jobCard = page.locator("savanna-job-card").first();
  const credential = page.locator("savanna-credential");
  // Amharic is the default.
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(
    jobCard.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    jobCard.getByRole("heading", { name: "Accessible Learning Support Associate" }),
  ).toBeVisible();
  await expect(jobCard.getByText("Full-time", { exact: true })).toBeVisible();
  await expect(jobCard.getByRole("link", { name: /Apply for this job/ })).toHaveAttribute(
    "href",
    /lang=en$/,
  );
  await expect(credential.locator("article[lang='en']")).toBeVisible();
  await expect(credential.getByText("Digital Bridge — Accessible Media Basics")).toBeVisible();
  await expect(credential.getByText("Demo Learner")).toBeVisible();
  await expect(credential.getByText("Savanna Access Kit")).toBeVisible();
  await expect(
    credential.getByRole("link", { name: "Download PDF certificate" }),
  ).toHaveAttribute("href", /lang=en$/);

  await page.getByRole("button", { name: "አማርኛ" }).click();

  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(
    jobCard.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" }),
  ).toBeVisible();
});

test("no-build harness page also supports both languages", async ({ page }) => {
  await page.goto("http://localhost:4020/");
  await expect(page.locator("html")).toHaveAttribute("lang", "am");
  await expect(page.getByRole("heading", { name: "የሳቫና የሥራ መግቢያ ማሳያ" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Savanna Career Gateway demo" })).toBeVisible();
  await expect(
    page.locator("savanna-job-card").first().getByRole("heading", {
      name: "Accessible Learning Support Associate",
    }),
  ).toBeVisible();
  await expect(page.locator("savanna-credential").getByText("Demo Learner")).toBeVisible();
  await expect(page.locator("savanna-credential").getByText("Savanna Access Kit")).toBeVisible();
});

test("verify page is readable and copy works", async ({ page }) => {
  await page.goto("http://localhost:4020/verify/C-7");
  await expect(page.getByRole("heading", { name: "የምስክር ወረቀት ማረጋገጫ" })).toBeVisible();
  await expect(page.getByText("ዲጂታል ብሪጅ — ለተደራሽ ሚዲያ መሠረታዊ እውቀት")).toBeVisible();
  await expect(page.getByRole("img", { name: /የፈጣን ምላሽ ኮድ/ })).toBeVisible();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: /የማረጋገጫ አገናኝ ቅዳ/ }).click();
  await expect(page.locator("#copied")).toHaveText(/አገናኙ ተቀድቷል|localhost:4020\/verify\/C-7/);
});

test("apply form shows error summary without a timeout", async ({ page }) => {
  await page.goto("http://localhost:4020/apply/J-9");
  await page.getByRole("button", { name: "ማመልከቻውን ላክ" }).click();
  await expect(page.getByRole("alert")).toContainText("እባክዎ ይሙሉ");
});

test("verification and application pages offer English", async ({ page }) => {
  await page.goto("http://localhost:4020/verify/C-7?lang=en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Certificate verification" })).toBeVisible();
  await expect(page.getByText("Digital Bridge — Accessible Media Basics")).toBeVisible();
  await expect(page.getByText("Demo Learner")).toBeVisible();
  const pdfLink = page.getByRole("link", { name: "Download certificate" });
  await expect(pdfLink).toHaveAttribute("href", /lang=en$/);
  const pdfResponse = await page.request.get(
    `http://localhost:4020${await pdfLink.getAttribute("href")}`,
  );
  expect(pdfResponse.status()).toBe(200);
  expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

  await page.goto("http://localhost:4020/apply/J-9?lang=en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Apply for job J-9" })).toBeVisible();
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByRole("alert")).toContainText("Please complete");
});

test("verification and apply pages reflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const url of ["http://localhost:4020/verify/C-7", "http://localhost:4020/apply/J-9"]) {
    await page.goto(url);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  }
});

test("bilingual job audio assets stay within the 20 to 30 second target", async ({ page }) => {
  const outOfRange: string[] = [];
  for (const id of ["J-9", "J-10"]) {
    const response = await page.request.get(`http://localhost:4020/v1/jobs/${id}`, {
      headers: { "X-Savanna-Key": "pk_live_demo" },
    });
    const job = await response.json();
    for (const lang of ["en", "am"]) {
      const url = `http://localhost:4020${job.audioSummary[lang].url}`;
      const duration = await page.evaluate(async (audioUrl) => {
        const response = await fetch(audioUrl, { headers: { "X-Savanna-Key": "pk_live_demo" } });
        const data = await response.arrayBuffer();
        const context = new AudioContext();
        try {
          return (await context.decodeAudioData(data)).duration;
        } finally {
          await context.close();
        }
      }, url);
      console.log(`${id} ${lang} audio: ${duration.toFixed(2)}s`);
      if (duration < 20 || duration > 30) outOfRange.push(`${id} ${lang}: ${duration.toFixed(2)}s`);
    }
  }
  expect(outOfRange).toEqual([]);
});

test("built component bundle works from a partner-host integration page", async ({ page }) => {
  await page.goto("/partner-demo.html");
  await expect(
    page.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /የምስክር ወረቀት፦ ዲጂታል ብሪጅ/ })).toBeVisible();
  const pdfLink = page
    .locator("savanna-credential")
    .getByRole("link", { name: "ምስክር ወረቀቱን አውርድ" });
  const pdfHref = await pdfLink.getAttribute("href");
  expect(pdfHref).toMatch(/\/verify\/[^/]+\/pdf\?lang=am$/);
  expect(pdfHref).not.toContain("api-key");
  const pdf = await page.request.get(new URL(pdfHref!, page.url()).toString());
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});

test("host frameworks can update attributes and observe component events", async ({ page }) => {
  await page.goto("/partner-demo.html");
  const jobCard = page.locator("savanna-job-card");
  const credential = page.locator("savanna-credential");
  await expect(jobCard.getByRole("heading", { name: "የተደራሽ ትምህርት ድጋፍ ባለሙያ" })).toBeVisible();
  await expect(credential.getByRole("heading", { name: /የምስክር ወረቀት፦ ዲጂታል ብሪጅ/ })).toBeVisible();

  const jobReady = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const element = document.querySelector("savanna-job-card")!;
        element.addEventListener(
          "savanna:ready",
          (event) => resolve((event as CustomEvent).detail),
          { once: true },
        );
        element.setAttribute("job", "J-10");
      }),
  );
  expect(jobReady).toEqual({ job: "J-10" });
  await expect(jobCard.getByRole("heading", { name: "ጀማሪ የውሂብ መዝገብ ባለሙያ" })).toBeVisible();

  const credentialEvents = await page.evaluate(async () => {
    const element = document.querySelector("savanna-credential")!;
    const error = new Promise((resolve) => {
      element.addEventListener(
        "savanna:error",
        (event) => resolve((event as CustomEvent).detail),
        { once: true },
      );
    });
    element.setAttribute("id", "missing-credential");
    const errorDetail = await error;
    const ready = new Promise((resolve) => {
      element.addEventListener(
        "savanna:ready",
        (event) => resolve((event as CustomEvent).detail),
        { once: true },
      );
    });
    element.setAttribute("id", "C-7");
    return { error: errorDetail, ready: await ready };
  });
  expect(credentialEvents).toEqual({
    error: { credential: "missing-credential", message: "HTTP 404" },
    ready: { credential: "C-7" },
  });
});
