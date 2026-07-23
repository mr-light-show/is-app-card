import { LitElement, html, css, nothing } from "https://unpkg.com/lit@3.3.3/index.js?module";
import { keyed } from "https://unpkg.com/lit@3.3.3/directives/keyed.js?module";

const CARD_TAG = "is-app-card";
const CARD_TYPE = `custom:${CARD_TAG}`;
const CARD_VERSION = "1.0.4";

const BRANCHES = [
  { key: "app_card", label: "Companion app (isApp = true)" },
  { key: "nonapp_card", label: "Browser (isApp = false)" },
];

function detectIsApp() {
  return (
    /HomeAssistant/.test(navigator.userAgent) ||
    !!(
      window.externalApp?.externalBus ||
      window.webkit?.messageHandlers?.externalBus
    )
  );
}

class IsAppCardEditor extends LitElement {
  static get properties() {
    return {
      lovelace: { attribute: false },
      _config: { state: true },
    };
  }

  constructor() {
    super();
    this._config = {};
    this._hass = undefined;
  }

  createRenderRoot() {
    return this;
  }

  setConfig(config) {
    this._config = config || {};
    this.requestUpdate();
  }

  set hass(hass) {
    const changed = this._hass !== hass;
    this._hass = hass;
    if (changed) {
      this.requestUpdate();
    }
  }

  get hass() {
    return this._hass;
  }

  _normalizeConfig(config) {
    return {
      ...config,
      type: config.type || CARD_TYPE,
    };
  }

  _fireConfigChanged(config) {
    const next = this._normalizeConfig(config);
    this._config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: next },
        bubbles: true,
        composed: true,
      })
    );
  }

  _branchChanged(branch, ev) {
    ev.stopPropagation();
    this._fireConfigChanged({
      ...this._config,
      [branch]: ev.detail.config,
    });
  }

  _cardPicked(branch, ev) {
    ev.stopPropagation();
    this._fireConfigChanged({
      ...this._config,
      [branch]: ev.detail.config,
    });
  }

  _replaceBranch(branch) {
    this._fireConfigChanged({
      ...this._config,
      [branch]: {},
    });
  }

  _hasBranchCard(branch) {
    const branchConfig = this._config[branch];
    return branchConfig?.type !== undefined;
  }

  _renderBranch(branchKey, label) {
    const branchConfig = this._config[branchKey];

    return html`
      <section class="branch">
        <div class="branch-header-row">
          <h3 class="branch-header">${label}</h3>
          ${this._hasBranchCard(branchKey)
            ? html`
                <button
                  type="button"
                  class="link"
                  @click=${() => this._replaceBranch(branchKey)}
                >
                  Change card type
                </button>
              `
            : nothing}
        </div>

        ${this._hasBranchCard(branchKey)
          ? keyed(
              `${branchKey}-${branchConfig.type}`,
              html`
                <hui-card-element-editor
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  .value=${branchConfig}
                  @config-changed=${(ev) => this._branchChanged(branchKey, ev)}
                ></hui-card-element-editor>
              `
            )
          : html`
              <hui-card-picker
                .hass=${this.hass}
                .lovelace=${this.lovelace}
                @config-changed=${(ev) => this._cardPicked(branchKey, ev)}
              ></hui-card-picker>
            `}
      </section>
    `;
  }

  render() {
    return html`
      <div class="editor-root">
        <p class="yaml-hint">
          Choose a card type for each branch below. For the full
          <code>custom:is-app-card</code> YAML, use this dialog's top-level
          <strong>Show code editor</strong>.
        </p>

        ${BRANCHES.map((b) => this._renderBranch(b.key, b.label))}
      </div>
    `;
  }

  static get styles() {
    return css`
      is-app-card-editor {
        display: block;
      }
      .editor-root {
        display: block;
      }
      .yaml-hint {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        margin: 0 0 16px;
        line-height: 1.4;
      }
      .branch {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-sm, 4px);
        padding: 12px;
        margin-bottom: 16px;
      }
      .branch:last-child {
        margin-bottom: 0;
      }
      .branch-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .branch-header {
        font-weight: bold;
        margin: 0;
        color: var(--primary-text-color);
        font-size: 1em;
      }
      .link {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 0;
        font-size: 0.9em;
        white-space: nowrap;
      }
      button.link:hover {
        text-decoration: underline;
      }
      hui-card-picker {
        display: block;
        min-height: 200px;
      }
    `;
  }
}

customElements.define("is-app-card-editor", IsAppCardEditor);

class IsAppCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("is-app-card-editor");
  }

  static getStubConfig() {
    return {
      app_card: {
        type: "markdown",
        content: "**Companion app** — you are in the HA mobile app.",
      },
      nonapp_card: {
        type: "markdown",
        content: "**Browser** — you are in a normal web browser.",
      },
    };
  }

  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._helpers = null;
    this._child = null;
    this._isApp = detectIsApp();
    this._onVisibilityChange = () => {
      const next = detectIsApp();
      if (next !== this._isApp) {
        this._isApp = next;
        this._renderActiveBranch();
      }
    };
  }

  connectedCallback() {
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this._child = null;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }

    const hasAppCard = config.app_card && typeof config.app_card === "object";
    const hasNonappCard =
      config.nonapp_card && typeof config.nonapp_card === "object";

    if (!hasAppCard && !hasNonappCard) {
      throw new Error(
        "is-app-card requires at least one of: app_card, nonapp_card"
      );
    }

    this._config = config;
    this._loadHelpers().then(() => this._renderActiveBranch());
  }

  set hass(hass) {
    this._hass = hass;
    if (this._child) {
      this._child.hass = hass;
    }
  }

  getCardSize() {
    if (!this._child || typeof this._child.getCardSize !== "function") {
      return 1;
    }
    const size = this._child.getCardSize();
    return typeof size?.then === "function" ? size : Promise.resolve(size);
  }

  _pickBranchConfig() {
    return this._isApp ? this._config.app_card : this._config.nonapp_card;
  }

  async _loadHelpers() {
    if (!this._helpers) {
      this._helpers = await window.loadCardHelpers();
    }
  }

  async _renderActiveBranch() {
    if (!this._config || !this._helpers) return;

    const branchConfig = this._pickBranchConfig();
    this.replaceChildren();

    if (!branchConfig) {
      this._child = null;
      return;
    }

    const child = await this._helpers.createCardElement(branchConfig);
    if (this._hass) {
      child.hass = this._hass;
    }

    this._child = child;
    this.appendChild(child);
  }
}

customElements.define(CARD_TAG, IsAppCard);

console.info(
  `%c IS-APP-CARD %c ${CARD_VERSION} `,
  "color: white; background: #03a9f4; font-weight: bold;",
  "color: #03a9f4; background: white; font-weight: bold;"
);

window.customCards = window.customCards || [];
window.customCards.push({
  type: CARD_TAG,
  name: "Is App Card",
  description: "Show different cards in the companion app vs browser",
  preview: true,
  documentationURL: "https://github.com/mr-light-show/is-app-card#readme",
});
