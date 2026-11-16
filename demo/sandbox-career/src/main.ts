import "../../../module/src/job-card/job-card.ts";
import "../../../module/src/credential/credential.ts";

type Lang = "am" | "en";

const STORAGE_KEY = "savanna.lang";

const PAGE_I18N: Record<Lang, Record<string, string>> = {
  am: {
    title: "የሳቫና የሥራ መግቢያ ማሳያ",
    jobsHeading: "የሥራ ዕድል",
    credentialHeading: "የምስክር ወረቀት",
  },
  en: {
    title: "Savanna Career Gateway demo",
    jobsHeading: "Job opportunity",
    credentialHeading: "Certificate",
  },
};

function currentLang(): Lang {
  return document.documentElement.lang.slice(0, 2) === "en" ? "en" : "am";
}

function applyLang(lang: Lang): void {
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Continue when storage is unavailable.
  }

  const strings = PAGE_I18N[lang];
  document.title = strings.title;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key && strings[key]) el.textContent = strings[key];
  });

  document.querySelectorAll<HTMLElement>("savanna-job-card, savanna-credential").forEach((el) => {
    el.setAttribute("lang", lang);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
  });

  window.dispatchEvent(new CustomEvent("savanna:lang-change", { detail: { lang } }));
}

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang === "en" ? "en" : "am"));
});

applyLang(currentLang());
