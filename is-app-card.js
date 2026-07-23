import { LitElement, html, css, nothing } from "https://unpkg.com/lit@3.3.3/index.js?module";
import { keyed } from "https://unpkg.com/lit@3.3.3/directives/keyed.js?module";

const CARD_TAG = "is-app-card";
const CARD_TYPE = `custom:${CARD_TAG}`;
const CARD_VERSION = "1.0.6";

const BRANCHES = [
  { key: "app_card", label: "Companion app", panel: "app_card" },
  { key: "nonapp_card", label: "Browser", panel: "nonapp_card" },
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

function hasBranchConfig(config, branch) {
  const b = config?.[branch];
  return b && typeof b === "object" && b.type !== undefined;
}

function countConfiguredBranches(config) {
  return BRANCHES.filter((b) => hasBranchConfig(config, b.key)).length;
}

class IsAppCardEditor extends LitElement {
  static get properties() {
    return {
      lovelace: { attribute: false },
      _config: { state: true },
      _selectedTab: { state: true },
    };
  }

  constructor() {
    super();
    this._config = {};
    this._selectedTab = "app_card";
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
    const next = { ...config, type: config.type || CARD_TYPE };
    for (const { key } of BRANCHES) {
      if (!hasBranchConfig(next, key)) {
        delete next[key];
      }
    }
    return next;
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

  _clearBranch(branch) {
    const next = { ...this._config };
    delete next[branch];
    this._fireConfigChanged(next);
  }

  _canRemoveBranch(branch) {
    if (!hasBranchConfig(this._config, branch)) {
      return false;
    }
    return countConfiguredBranches(this._config) > 1;
  }

  _selectTab(ev) {
    this._selectedTab = ev.detail.name;
  }

  _renderBranchPanel(branchKey) {
    const branchConfig = this._config[branchKey];
    const hasCard = hasBranchConfig(this._config, branchKey);
    const canRemove = this._canRemoveBranch(branchKey);

    return html`
      <section class="branch-panel">
        ${hasCard
          ? html`
              <div class="branch-actions">
                <button
                  type="button"
                  class="link"
                  @click=${() => this._clearBranch(branchKey)}
                >
                  Change card type
                </button>
                ${canRemove
                  ? html`
                      <button
                        type="button"
                        class="link danger"
                        @click=${() => this._clearBranch(branchKey)}
                      >
                        Remove card
                      </button>
                    `
                  : nothing}
              </div>
              ${keyed(
                `${branchKey}-${branchConfig.type}`,
                html`
                  <hui-card-element-editor
                    .hass=${this.hass}
                    .lovelace=${this.lovelace}
                    .value=${branchConfig}
                    @config-changed=${(ev) => this._branchChanged(branchKey, ev)}
                  ></hui-card-element-editor>
                `
              )}
            `
          : html`
              <p class="hint">Pick a card for this branch.</p>
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
    const activeBranch = BRANCHES.find((b) => b.key === this._selectedTab);

    return html`
      <div class="editor-root">
        <ha-tab-group @wa-tab-show=${this._selectTab}>
          ${BRANCHES.map(
            (b) => html`
              <ha-tab-group-tab
                slot="nav"
                panel=${b.panel}
                .active=${this._selectedTab === b.key}
              >
                ${b.label}
              </ha-tab-group-tab>
            `
          )}
        </ha-tab-group>

        <p class="yaml-hint">
          Configure each branch with the tabs above. For the full
          <code>custom:is-app-card</code> YAML, use this dialog's top-level
          <strong>Show code editor</strong>.
        </p>

        ${activeBranch ? this._renderBranchPanel(activeBranch.key) : nothing}
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
      ha-tab-group {
        display: block;
        margin-bottom: 12px;
      }
      ha-tab-group-tab {
        flex: 1;
      }
      ha-tab-group-tab::part(base) {
        width: 100%;
        justify-content: center;
      }
      .yaml-hint {
        color: var(--secondary-text-color);
        font-size: 0.9em;
        margin: 0 0 12px;
        line-height: 1.4;
      }
      .branch-panel {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-border-radius-sm, 4px);
        padding: 12px;
      }
      .branch-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 12px;
        margin-bottom: 12px;
      }
      .hint {
        color: var(--secondary-text-color);
        margin: 0 0 12px;
      }
      .link {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 0;
        font-size: 0.9em;
      }
      .link.danger {
        color: var(--error-color, #db4437);
      }
      button.link:hover {
        text-decoration: underline;
      }
      button.link:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        text-decoration: none;
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
    return {};
  }

  constructor() {
    super();
    this._config = null;
    this._hass = null;
    this._helpers = null;
    this._child = null;
    this._layout = undefined;
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
    this.style.display = "block";
    this.style.height = "100%";
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this._child = null;
  }

  set layout(layout) {
    this._layout = layout;
    if (this._child) {
      this._child.layout = layout;
    }
  }

  get layout() {
    return this._layout;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
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
    if (!this._child) {
      return 1;
    }
    if (typeof this._child.getCardSize !== "function") {
      return 1;
    }
    try {
      const size = this._child.getCardSize();
      if (size && typeof size.then === "function") {
        return size;
      }
      return size;
    } catch (_err) {
      return 1;
    }
  }

  getGridOptions() {
    if (this._child?.getGridOptions) {
      return this._child.getGridOptions() || {};
    }
    if (this._config?.grid_options) {
      return this._config.grid_options;
    }
    return {};
  }

  _pickBranchConfig() {
    const branch = this._isApp ? "app_card" : "nonapp_card";
    if (!hasBranchConfig(this._config, branch)) {
      return undefined;
    }
    return this._config[branch];
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
    if (this._layout !== undefined) {
      child.layout = this._layout;
    }

    this._child = child;
    child.style.height = "100%";
    this.appendChild(child);
    this.dispatchEvent(
      new CustomEvent("ll-rebuild", { bubbles: true, composed: true })
    );
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
