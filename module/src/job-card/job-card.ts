import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import am from "./i18n/am.json";
import en from "./i18n/en.json";
import { readJobsPrefs, resolveLang, writeJobsPrefs } from "./prefs.js";

type Strings = typeof en;

type Localized = { en?: string | null; am?: string | null };

type JobPayload = {
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
    title?: Localized;
    employer?: Localized;
    location?: Localized;
    payText?: Localized;
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

@customElement("savanna-job-card")
export class SavannaJobCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: #111;
      font-family: var(--savanna-font, "Noto Sans Ethiopic", Nyala, "Segoe UI", system-ui, sans-serif);
      --_accent: var(--savanna-accent, #0b5cab);
      --_radius: var(--savanna-radius, 0.5rem);
      --_focus: var(--savanna-focus, #0b5cab);
      max-width: 100%;
    }
    article {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border: 2px solid #222;
      border-radius: var(--_radius);
      background: #fff;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }
    dl {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.35rem;
      margin: 0;
    }
    dt {
      font-weight: 700;
    }
    dd {
      margin: 0 0 0.5rem;
      overflow-wrap: anywhere;
    }
    ul {
      margin: 0;
      padding-inline-start: 1.2rem;
    }
    button,
    a.action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 44px;
      padding: 0.5rem 1rem;
      margin: 0 0.5rem 0.5rem 0;
      font: inherit;
      color: #fff;
      background: var(--_accent);
      border: 0;
      border-radius: var(--_radius);
      text-decoration: none;
      cursor: pointer;
    }
    button[aria-pressed="true"] {
      background: #111;
    }
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid var(--_focus);
      outline-offset: 3px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
    }
    audio {
      display: none;
    }
    summary {
      min-height: 44px;
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .transcript {
      margin: 0;
      padding: 0.75rem;
      background: #f4f4f4;
      border-left: 4px solid var(--_accent);
      overflow-wrap: anywhere;
    }
    [role="status"] {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .wrap {
      position: relative;
    }
    @media (forced-colors: active) {
      article {
        border: 2px solid ButtonText;
      }
      button,
      a.action {
        border: 2px solid ButtonText;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
      }
    }
  `;

  @property({ type: String }) job = "";
  @property({ type: String }) api = "";
  @property({ attribute: "api-key" }) apiKey = "";
  @property({ type: String }) lang = "";

  @state() private data: JobPayload | null = null;
  @state() private error = false;
  @state() private playing = false;
  @state() private live = "";

  private audioRef = createRef<HTMLAudioElement>();
  private request?: AbortController;
  private hasLoaded = false;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("savanna:lang-change", this.onLang);
    if (this.hasLoaded) void this.load();
  }

  disconnectedCallback(): void {
    window.removeEventListener("savanna:lang-change", this.onLang);
    this.request?.abort();
    this.audioRef.value?.pause();
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has("lang")) {
      this.injectJsonLd();
      this.audioRef.value?.load();
    }
    if (
      !this.hasLoaded ||
      changed.has("job") ||
      changed.has("api") ||
      changed.has("apiKey")
    ) {
      this.hasLoaded = true;
      void this.load();
    }
  }

  private onLang = (ev: Event) => {
    const lang = (ev as CustomEvent<{ lang?: string }>).detail?.lang;
    if (lang) this.lang = lang;
  };

  private t(key: keyof Strings): string {
    const pack = this.activeLang() === "am" ? am : en;
    return pack[key];
  }

  private activeLang(): "en" | "am" {
    return resolveLang(this, this.lang);
  }

  /** Prefer the bilingual `i18n` value; fall back to the flat (server) field. */
  private localized(key: "title" | "employer" | "location" | "payText"): string | null {
    return this.data?.i18n?.[key]?.[this.activeLang()] ?? null;
  }

  private employmentType(): string {
    const type = this.data?.employmentType ?? "FULL_TIME";
    const labels: Record<string, { en: string; am: string }> = {
      FULL_TIME: { en: "Full-time", am: "ሙሉ ጊዜ" },
      PART_TIME: { en: "Part-time", am: "የትርፍ ጊዜ" },
      CONTRACT: { en: "Contract", am: "ውል" },
      TEMPORARY: { en: "Temporary", am: "ጊዜያዊ" },
      INTERN: { en: "Internship", am: "ልምምድ" },
    };
    return labels[type]?.[this.activeLang()] ?? type.replaceAll("_", " ");
  }

  private apiRoot(): string {
    return (this.api || "").replace(/\/$/, "");
  }

  private async load(): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.error = false;
    this.data = null;
    if (!this.job) return;
    try {
      const url = `${this.apiRoot()}/v1/jobs/${encodeURIComponent(this.job)}`;
      const res = await fetch(url, {
        headers: { "X-Savanna-Key": this.apiKey },
        signal: request.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.data = (await res.json()) as JobPayload;
      writeJobsPrefs({ lastJobId: this.job });
      this.injectJsonLd();
      this.dispatchEvent(
        new CustomEvent("savanna:ready", {
          bubbles: true,
          composed: true,
          detail: { job: this.job },
        }),
      );
    } catch (error) {
      if (request.signal.aborted) return;
      this.error = true;
      this.dispatchEvent(
        new CustomEvent("savanna:error", {
          bubbles: true,
          composed: true,
          detail: {
            job: this.job,
            message: error instanceof Error ? error.message : "Unable to load job",
          },
        }),
      );
    }
  }

  private injectJsonLd(): void {
    const existing = this.querySelector('script[data-savanna="jobposting"]');
    existing?.remove();
    if (!this.data) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.savanna = "jobposting";
    const job = this.data;
    script.textContent = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      identifier: job.id,
      title: this.localized("title") ?? job.title,
      description: job.description[this.activeLang()],
      validThrough: job.validThrough,
      employmentType: "FULL_TIME",
      hiringOrganization: { "@type": "Organization", name: this.localized("employer") ?? job.employer },
      jobLocationType: job.remote ? "TELECOMMUTE" : "ON_SITE",
      jobLocation: { "@type": "Place", name: this.localized("location") ?? job.location },
    });
    this.appendChild(script);
  }

  private audio(): { url: string; transcript: string } {
    const lang = this.activeLang();
    const block = this.data?.audioSummary[lang];
    const root = this.apiRoot();
    const url = block?.url?.startsWith("http") ? block.url : `${root}${block?.url ?? ""}`;
    return { url, transcript: block?.transcript ?? "" };
  }

  private toggleAudio(): void {
    const audioEl = this.audioRef.value;
    if (this.playing) {
      if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.playing = false;
      this.live = this.t("job.audioStopped");
      return;
    }
    const audioData = this.audio();
    if (audioEl) {
      audioEl.play().then(() => {
        this.playing = true;
        this.live = this.t("job.audioPlaying");
      }).catch((err) => {
        console.warn("[job-card] HTML5 audio playback failed, falling back to Web Speech API:", err);
        if (typeof window !== "undefined" && window.speechSynthesis && audioData.transcript) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(audioData.transcript);
          u.lang = this.activeLang() === "am" ? "am-ET" : "en-US";
          u.onend = this.onEnded;
          u.onerror = this.onEnded;
          this.playing = true;
          this.live = this.t("job.audioPlaying");
          window.speechSynthesis.speak(u);
        } else {
          this.playing = false;
        }
      });
    }
  }

  private onEnded = () => {
    this.playing = false;
    this.live = this.t("job.audioStopped");
  };

  private applyHref(): string {
    if (!this.data) return "#";
    const apply = this.data.applyUrl;
    if (apply.startsWith("http")) return apply;
    const href = `${this.apiRoot()}${apply.startsWith("/") ? "" : "/"}${apply}`;
    if (!apply.startsWith("/apply/")) return href;
    return `${href}${apply.includes("?") ? "&" : "?"}lang=${this.activeLang()}`;
  }

  private formatDate(iso?: string | null): string {
    if (!iso) return "—";
    const locale = this.activeLang() === "am" ? "am-ET-u-ca-ethiopic" : "en-GB";
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(iso));
  }

  protected render() {
    if (this.error) {
      return html`<div class="wrap">
        <p>${this.t("job.error")}</p>
        <button type="button" @click=${() => this.load()}>${this.t("job.retry")}</button>
      </div>`;
    }
    if (!this.data) {
      return html`<p>${this.t("job.loading")}</p>`;
    }
    const lang = this.activeLang();
    const desc = this.data.description[lang];
    const title = this.localized("title") ?? this.data.title;
    const employer = this.localized("employer") ?? this.data.employer;
    const location = this.localized("location") ?? this.data.location;
    const payText = this.localized("payText") ?? this.data.payText;
    const employment = this.employmentType();
    const reqs = this.data.description.requirements?.[lang] ?? [];
    const audio = this.audio();
    const prefs = readJobsPrefs();
    return html`
      <div class="wrap">
        <article lang=${lang}>
          <h2>${title}</h2>
          <p>${desc}</p>
          <dl>
            <dt>${this.t("job.employer")}</dt>
            <dd>${employer}</dd>
            <dt>${this.t("job.location")}</dt>
            <dd>
              ${location}${this.data.remote ? ` (${this.t("job.remote")})` : nothing}
            </dd>
            <dt>${this.t("job.employment")}</dt>
            <dd>${employment}</dd>
            ${
              payText
                ? html`<dt>${this.t("job.pay")}</dt>
                    <dd>${payText}</dd>`
                : nothing
            }
            <dt>${this.t("job.deadline")}</dt>
            <dd>${this.formatDate(this.data.validThrough)}</dd>
          </dl>
          ${
            reqs.length
              ? html`<h3>${this.t("job.requirements")}</h3>
                  <ul>
                    ${reqs.map((item) => html`<li>${item}</li>`)}
                  </ul>`
              : nothing
          }
          <div class="row">
            <button
              type="button"
              @click=${() => this.toggleAudio()}
              aria-pressed=${this.playing ? "true" : "false"}
            >
              ${this.playing ? this.t("job.stopAudio") : this.t("job.playAudio")}
            </button>
            <a class="action" href=${this.applyHref()}>${this.t("job.apply")}</a>
          </div>
          <audio
            ${ref(this.audioRef)}
            src=${audio.url}
            preload="none"
            @ended=${this.onEnded}
          ></audio>
          <details
            ?open=${prefs.transcriptOpen !== false}
            @toggle=${(ev: Event) =>
              writeJobsPrefs({ transcriptOpen: (ev.target as HTMLDetailsElement).open })}
          >
            <summary>${this.t("job.transcript")}</summary>
            <p class="transcript">${audio.transcript}</p>
          </details>
        </article>
        <div role="status" aria-live="polite">${this.live}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "savanna-job-card": SavannaJobCard;
  }
}
