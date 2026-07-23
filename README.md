# Is App Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/mr-light-show/is-app-card.svg)](https://github.com/mr-light-show/is-app-card/releases)
[![Validate](https://github.com/mr-light-show/is-app-card/actions/workflows/validate.yml/badge.svg)](https://github.com/mr-light-show/is-app-card/actions/workflows/validate.yml)

A Home Assistant Lovelace card that shows **different nested cards** depending on whether the dashboard is running in the **official Companion app** (WebView) or in a **normal browser**. One YAML config, two branches (`app_card` / `nonapp_card`), visual editor, no backend integration.

Keywords: companion app, mobile app, browser, conditional, nested card, WebView.

## Why not just use conditional + screen?

Home Assistant’s built-in [conditional card](https://www.home-assistant.io/dashboards/conditional/) can show different cards by **viewport width** (`condition: screen`). That is **not** the same as detecting the **official Companion app**.

| Situation | Conditional + screen | Is App Card |
| --------- | -------------------- | ----------- |
| HA Companion app on a phone | Often matches “mobile” | **App branch** |
| Mobile Safari / Chrome (not the app) | Also matches “mobile” | **Browser branch** |
| Desktop browser | Matches “desktop” | **Browser branch** |
| Same dashboard, many clients at once | Each client picks by its own width | Each client picks by **app vs browser** |
| Backend / per-device setup | None (screen only) | None (frontend-only) |

Use **conditional + screen** when you care about layout size (phone vs tablet vs desktop).

Use **Is App Card** when you care whether the user is in the **HA mobile app WebView** vs any browser—including mobile browsers that look “mobile” to CSS but are not the app.

### Other alternatives (and why this card exists)

| Approach | Limitation |
| -------- | ---------- |
| [App Importance sensor](https://companion.home-assistant.io/docs/core/sensors/) + conditional | Per **device entity**, not per dashboard session; sensor must be enabled; iOS availability varies |
| [browser-mod](https://github.com/thomasloven/hass-browser_mod) + [state-switch](https://github.com/thomasloven/lovelace-state-switch) | Requires integration; map **device IDs** manually; IDs can change |
| [button-card](https://github.com/custom-cards/button-card) JS templates | `/HomeAssistant/` user-agent check works for **actions**, not arbitrary nested cards |
| Separate mobile/desktop dashboards | Duplicated YAML; default dashboard per device is manual |

Is App Card: **one card config**, two nested branches, **visual editor**, **no backend**, detects app client-side (`userAgent` + native bridge).

Related community discussions:

- [Companion app vs web browser differentiation](https://community.home-assistant.io/t/companion-app-vs-web-browser-differentiation/492886)
- [How to detect if HA runs in browser or companion app](https://community.home-assistant.io/t/how-to-detect-if-home-assistant-run-in-browser-or-companion-app/713588)

## Installation

### HACS (recommended)

1. Open HACS → **Frontend**
2. Click ⋮ → **Custom repositories**
3. Add `https://github.com/mr-light-show/is-app-card`, category **Lovelace**
4. Install **Is App Card**
5. Reload your browser (resource is auto-registered at `/hacsfiles/is-app-card/is-app-card.js`)

### Manual installation

1. Download `is-app-card.js` from the [releases page](https://github.com/mr-light-show/is-app-card/releases)
2. Copy to `config/www/community/is-app-card/is-app-card.js`
3. Add the Lovelace resource:

```yaml
resources:
  - url: /local/community/is-app-card/is-app-card.js
    type: module
```

## Dashboard UI usage

1. Edit dashboard → **Add card** → search **Is App Card**
2. New cards start with **no branches configured** — pick a card type on each tab as needed.
3. Use the visual editor tabs:
   - **Companion app** — card shown when `isApp` is true (`app_card`)
   - **Browser** — card shown when `isApp` is false (`nonapp_card`)
4. Each tab shows the HA **card picker** until a type is chosen, then the standard card editor for that nested card.

### Visual editor notes

- The editor uses HA **tab group** tabs to switch between companion app and browser branches.
- **Change card type** clears the active branch and reopens the card picker for that tab.
- **Remove card** drops the branch from saved YAML (hidden when it is the only configured branch).
- The nested editor's YAML toggle shows only the **active branch** — that is expected.
- For the full wrapper config (`type: custom:is-app-card` with both `app_card` and `nonapp_card`), use this dialog's top-level **Show code editor**.
- If a card was added while an older broken version was installed, delete it and re-add from the card picker.

## Configuration

### YAML example

```yaml
type: custom:is-app-card
app_card:
  type: markdown
  content: "### Companion app\nYou are viewing this in the HA mobile app."
nonapp_card:
  type: markdown
  content: "### Browser\nYou are viewing this in a normal browser."
```

More examples are in [`examples/dashboard.yaml`](examples/dashboard.yaml).

### Options

| Key | Required | Description |
| --- | --- | --- |
| `app_card` | No* | Nested card config shown in the Companion app |
| `nonapp_card` | No* | Nested card config shown in browsers |

\* At least one of `app_card` or `nonapp_card` is required.

## Detection

The card detects the Companion app client-side:

- `HomeAssistant` in `navigator.userAgent`
- Native app bridge (`window.externalApp.externalBus` or `window.webkit.messageHandlers.externalBus`)

**Companion app** → `app_card` branch. **Everything else** (desktop browser, mobile Safari/Chrome, etc.) → `nonapp_card` branch.

If the active branch is not configured, the card renders empty (no error).

## Limitations

- Frontend-only — not usable in automations or as an entity
- Brief empty flash while `loadCardHelpers()` initializes (v1)
- Detection is based on client signals, not a backend “is app” sensor

## Development

Source: `is-app-card.js`. HACS serves `dist/is-app-card.js`.

```bash
./scripts/sync-dist.sh   # copy source → dist/
```

## License

MIT — see [LICENSE](LICENSE).
