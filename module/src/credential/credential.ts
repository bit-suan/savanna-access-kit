import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import am from "./i18n/am.json";
import en from "./i18n/en.json";
import { resolveLang } from "./prefs.js";

type Strings = typeof en;

type Localized = { en?: string | null; am?: string | null };

type Badge = {
  id: string;
  name?: string;
  validFrom?: string;
  i18n?: {
    achievement?: Localized;
    recipientName?: Localized;
    issuerName?: Localized;
  };
  issuer?: { name?: string };
  credentialStatus?: { status?: string };
  credentialSubject?: {
    name?: string;
    achievement?: { name?: string };
  };
};

@customElement("savanna-credential")
export class SavannaCredential extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--savanna-font, "Noto Sans Ethiopic", Nyala, "Segoe UI", system-ui, sans-serif);
      --_accent: var(--savanna-accent, #0b5cab);
      --_radius: var(--savanna-radius, 0.5rem);
      --_focus: var(--savanna-focus, #0b5cab);
      color: #111;
      max-width: 100%;
    }
    article {
      padding: 1rem;
      border: 2px solid #222;
      border-radius: var(--_radius);
      background: #fff;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    h2 {
      margin: 0;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
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
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid var(--_focus);
      outline-offset: 3px;
    }
    [role="status"] {
      min-height: 1.5rem;
    }
    @media (forced-colors: active) {
      article {
        border: 2px solid ButtonText;
      }
    }
  `;

  @property({ type: String }) api = "";
  @property({ attribute: "api-key" }) apiKey = "";
  @property({ type: String }) lang = "";
  @property({ attribute: "id" }) credentialAttribute = "";
  @property({ attribute: "credential" }) credential = "";

  @state() private data: Badge | null = null;
  @state() private error = false;
  @state() private live = "";
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
    super.disconnectedCallback();
  }

  protected updated(changed: PropertyValues<this>): void {
    if (
      !this.hasLoaded ||
      changed.has("credentialAttribute") ||
      changed.has("credential") ||
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

  /** Prefer the bilingual `i18n` value; fall back to the badge's flat name. */
  private achievementName(): string {
    return (
      this.data?.i18n?.achievement?.[this.activeLang()] ??
      this.data?.credentialSubject?.achievement?.name ??
      this.data?.name ??
      ""
    );
  }

  private recipientName(): string {
    return (
      this.data?.i18n?.recipientName?.[this.activeLang()] ??
      this.data?.credentialSubject?.name ??
      this.t("cred.privateRecipient")
    );
  }

  private issuerName(): string {
    return (
      this.data?.i18n?.issuerName?.[this.activeLang()] ??
      this.data?.issuer?.name ??
      ""
    );
  }

  private apiRoot(): string {
    return (this.api || "").replace(/\/$/, "");
  }

  private credentialId(): string {
    return this.credentialAttribute || this.credential || this.id;
  }

  private verifyUrl(): string {
    return `${this.apiRoot()}/verify/${encodeURIComponent(this.credentialId())}`;
  }

  private async load(): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    this.error = false;
    this.data = null;
    const id = this.credentialId();
    if (!id) return;
    try {
      const res = await fetch(`${this.apiRoot()}/v1/credentials/${encodeURIComponent(id)}`, {
        headers: {
          "X-Savanna-Key": this.apiKey,
          Accept: "application/ld+json",
        },
        signal: request.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.data = (await res.json()) as Badge;
      this.dispatchEvent(
        new CustomEvent("savanna:ready", {
          bubbles: true,
          composed: true,
          detail: { credential: id },
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
            credential: id,
            message: error instanceof Error ? error.message : "Unable to load credential",
          },
        }),
      );
    }
  }

  private statusKey(): keyof Strings {
    const status = this.data?.credentialStatus?.status ?? "valid";
    if (status === "revoked") return "cred.revoked";
    if (status === "expired") return "cred.expired";
    return "cred.valid";
  }

  private async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.verifyUrl());
      this.live = this.t("cred.copied");
    } catch {
      this.live = this.verifyUrl();
    }
  }

  private linkedInHref(): string {
    const name = this.achievementName() || "Savanna credential";
    const year = this.data?.validFrom
      ? new Date(this.data.validFrom).getFullYear()
      : new Date().getFullYear();
    const month = this.data?.validFrom ? new Date(this.data.validFrom).getMonth() + 1 : 1;
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name,
      organizationName:
        this.activeLang() === "am" ? "የሳቫና ተደራሽነት ኪት" : "Savanna Access Kit",
      issueYear: String(year),
      issueMonth: String(month),
      certUrl: this.verifyUrl(),
    });
    return `https://www.linkedin.com/profile/add?${params.toString()}`;
  }

  protected render() {
    if (this.error) {
      return html`<p>${this.t("cred.error")}</p>
        <button type="button" @click=${() => this.load()}>${this.t("cred.retry")}</button>`;
    }
    if (!this.data) return html`<p>${this.t("cred.loading")}</p>`;
    const lang = this.activeLang();
    const achievement = this.achievementName() || "Credential";
    const recipient = this.recipientName();
    const issuer = this.issuerName();
    const issued = this.data.validFrom
      ? new Intl.DateTimeFormat(lang === "am" ? "am-ET-u-ca-ethiopic" : "en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(this.data.validFrom))
      : "";
    return html`
      <article lang=${lang}>
        <h2>${this.t("cred.heading")}${lang === "am" ? "፦" : ":"} ${achievement}</h2>
        <p>${this.t("cred.recipient")}: ${recipient}</p>
        <p>${this.t("cred.issuer")}: ${issuer}</p>
        <p>${this.t("cred.status")}: ${this.t(this.statusKey())}</p>
        <p>${this.t("cred.issued")}: ${issued}</p>
        <div class="row">
          <button type="button" @click=${() => this.copy()}>${this.t("cred.copy")}</button>
          <a class="action" href=${this.linkedInHref()} rel="noopener noreferrer" target="_blank"
            >${this.t("cred.linkedin")}</a
          >
          <a class="action" href=${this.verifyUrl()}>${this.t("cred.verify")}</a>
          <a
            class="action"
            href=${`${this.apiRoot()}/verify/${encodeURIComponent(this.credentialId())}/pdf?lang=${lang}`}
            >${this.t("cred.pdf")}</a
          >
        </div>
        <p role="status" aria-live="polite">${this.live}</p>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "savanna-credential": SavannaCredential;
  }
}
