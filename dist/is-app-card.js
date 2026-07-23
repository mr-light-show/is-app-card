import { LitElement, html, css } from "https://unpkg.com/lit@3.3.3/index.js?module";
import { keyed } from "https://unpkg.com/lit@3.3.3/directives/keyed.js?module";

const CARD_TAG = "is-app-card";
const CARD_TYPE = `custom:${CARD_TAG}`;
const CARD_VERSION = "1.0.3";

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
      _selectedBranch: { state: true },
    };
  }

  constructor() {
    super();
    this._config = {};
    this._selectedBranch = "app_card";
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

  _branchChanged(ev) {
    // Prevent nested hui-card-element-editor config from replacing the wrapper
    // config on the dialog-level editor (same pattern as hui-stack-card-editor).
    ev.stopPropagation();
    const branch = this._selectedBranch;
    this._fireConfigChanged({
      ...this._config,
      [branch]: ev.detail.config,
    });
  }

  _addBranch() {
    const branch = this._selectedBranch;
    if (this._config[branch]) return;
    this._fireConfigChanged({
      ...this._config,
      [branch]: { type: "markdown", content: "" },
    });
  }

  _removeBranch() {
    const branch = this._selectedBranch;
    const hasOther = BRANCHES.some(
      (b) => b.key !== branch && this._config[b.key]
    );
    if (!hasOther) return;
    const next = { ...this._config };
    delete next[branch];
    this._fireConfigChanged(next);
  }

  _selectBranch(key) {
    this._selectedBranch = key;
  }

  _branchHeader(branch) {
    const meta = BRANCHES.find((b) => b.key === branch);
    return meta ? `Editing: ${meta.label} (\`${branch}\`)` : branch;
  }

  render() {
    const branch = this._selectedBranch;
    const branchConfig = this._config[branch];
    const canRemove =
      branchConfig &&
      BRANCHES.some((b) => b.key !== branch && this._config[b.key]);

    return html`
      <div class="editor-root">
        <div class="tabs">
          ${BRANCHES.map(
            (b) => html`
              <button
                type="button"
                class="tab ${b.key === branch ? "active" : ""}"
                @click=${() => this._selectBranch(b.key)}
              >
                ${b.label}
              </button>
            `
          )}
        </div>

        <p class="yaml-hint">
          Configure one branch at a time below. For the full
          <code>custom:is-app-card</code> YAML (both branches), use this
          dialog's top-level <strong>Show code editor</strong>.
        </p>

        ${branchConfig
          ? keyed(
              branch,
              html`
                <p class="branch-header">${this._branchHeader(branch)}</p>
                <hui-card-element-editor
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  .value=${branchConfig}
                  @config-changed=${this._branchChanged}
                ></hui-card-element-editor>
                ${canRemove
                  ? html`
                      <button
                        type="button"
                        class="link"
                        @click=${this._removeBranch}
                      >
                        Remove this branch
                      </button>
                    `
                  : ""}
              `
            )
          : html`
              <p class="branch-header">${this._branchHeader(branch)}</p>
              <p class="hint">No card configured for this branch.</p>
              <button type="button" @click=${this._addBranch}>Add card</button>
            `}
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
      .tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
      }
      .tab {
        flex: 1;
        padding: 8px;
        cursor: pointer;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        border-radius: 4px;
      }
      .tab.active {
        border-color: var(--primary-color);
        font-weight: bold;
      }
      .yaml-hint {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        margin: 0 0 12px;
        line-height: 1.4;
      }
      .branch-header {
        font-weight: bold;
        margin: 0 0 12px;
        color: var(--primary-text-color);
      }
      .hint {
        color: var(--secondary-text-color);
      }
      .link {
        margin-top: 8px;
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 0;
      }
      button.link:hover {
        text-decoration: underline;
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
