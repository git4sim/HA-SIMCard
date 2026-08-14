# HA SimCard

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-%2341BDF5.svg?logo=home-assistant&logoColor=white)](https://www.home-assistant.io)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Preview](preview.png)

A compact, fully visually configurable **room overview card** for Home Assistant. Give it a
room name/icon, and only the things you actually have in that room — windows, a
temperature/humidity sensor, a switch battery, and up to 4 buttons — show up. Nothing else.

> HA SimCard is an independent card, not an update to or dependency of any other room card —
> install it alongside other Lovelace cards without conflicts (own custom element name,
> own file, own config schema). It's built around a single job: a clean, conditional
> per-room status card. Image backgrounds, climate-device integration, and cover/shutter
> position controls have been removed entirely — this card is not a general-purpose
> dashboard tile.

---

## ✨ What it shows

* **Header** — room name + icon, with an optional temperature/humidity line underneath.
* **Stat gauges** (top-right, stacked) — small battery-style gauges for:
  * a **switch/remote battery** (e.g. a physical wall switch)
  * the **temperature/humidity sensor's battery**
  * each **window sensor's battery** (if it has one)
  Each gauge only appears if you've configured that entity — nothing is shown by default.
* **Window chips** — one per configured window (1–2), colored by open/closed state.
* **Buttons** — up to 4 freely definable switches (lights, switches, fans, covers like garage
  doors), showing name + state (and light brightness %, if applicable).

Everything above is independently clickable: tap/hold actions are configurable per window,
per battery gauge, for temperature, for humidity, and for every button.

**Bonus:** any battery gauge turns red (configurable) once it drops to/below a threshold
(default 10%).

---

## 📥 Installation

### Via HACS
Add this repository as a custom repository in HACS (category: *Dashboard*/*Plugin*), then
install **HA SimCard**.

### Manual
1. Download `ha-simcard.js` from the repository.
2. Copy it to `/config/www/`.
3. Add a resource: URL `/local/ha-simcard.js` · Type: JavaScript Module.

---

## ⚙️ Configuration

Add the card via **"Add Card"** → **HA SimCard**. Everything is configurable in the
visual editor — no YAML required. Every section below only needs to be filled in if you
actually have that entity; anything left empty is simply not rendered on the card.

### Card level

| Option | Default | Description |
|---|---|---|
| `name` | — | Room name |
| `icon` | `mdi:home-outline` | Header icon |
| `collapsible` | `false` | Click the header to collapse/expand windows + buttons |
| `default_state` | `expanded` | `expanded` · `collapsed` (only relevant when `collapsible: true`) |
| `remember_state` | `true` | Remember collapsed/expanded state across reloads |
| `window_open_color` | `#FFA000` | Window chip color when open |
| `window_closed_color` | `#4CAF50` | Window chip color when closed |
| `battery_warning_threshold` | `10` | Battery gauges turn `battery_warning_color` at/below this % |
| `battery_warning_color` | `#f44336` | Warning color for low battery gauges |

### `windows` (list, 1–2 entries)

| Option | Description |
|---|---|
| `entity` | Window/door `binary_sensor` (or `sensor`) |
| `label` | Custom label (falls back to friendly name) |
| `tap_action` / `hold_action` | Action on the window chip |
| `battery_entity` | Optional battery sensor for this window — adds a stat gauge |
| `battery_label` | Label for that gauge |
| `battery_tap_action` / `battery_hold_action` | Action on that gauge |

### `climate` (single object, all optional)

| Option | Description |
|---|---|
| `temperature_entity` / `temperature_label` / `temperature_tap_action` / `temperature_hold_action` | Temperature sensor shown in the header subline |
| `humidity_entity` / `humidity_label` / `humidity_tap_action` / `humidity_hold_action` | Humidity sensor shown in the header subline |
| `battery_entity` / `battery_label` / `battery_tap_action` / `battery_hold_action` | Battery of the temperature/humidity sensor device — adds a stat gauge |

### `switch_battery` (single object, optional)

| Option | Description |
|---|---|
| `entity` | Battery sensor of a physical switch/remote in the room |
| `label` | Label for the gauge (e.g. "Lichtschalter") |
| `tap_action` / `hold_action` | Action on that gauge |

### `controls` (list, up to 4 entries)

| Option | Default | Description |
|---|---|---|
| `entity` | — | `light` / `switch` / `fan` / `cover` entity |
| `name` | friendly name | Button label |
| `icon` | auto per domain/state | Icon override |
| `show_icon` | `true` | Show/hide the icon |
| `on_color` | `#ffa726` | Accent color used when the entity is on/active |
| `tap_action` | `toggle` | Tap action |
| `hold_action` | `more-info` | Hold action |
| `double_tap_action` | `none` | Double-tap action |

### Actions

Every `tap_action` / `hold_action` / `double_tap_action` accepts:
`more-info` (default) · `toggle` · `navigate` (+ `navigation_path`) ·
`call-service` (+ `service`, `service_data`) · `none`.

---

## Example YAML

```yaml
type: custom:ha-simcard
name: Schlafzimmer
icon: mdi:bed
collapsible: true

windows:
  - entity: binary_sensor.schlafzimmer_fenster_links
    label: Fenster Links
    battery_entity: sensor.schlafzimmer_fenster_links_battery
  - entity: binary_sensor.schlafzimmer_fenster_rechts
    label: Fenster Rechts
    battery_entity: sensor.schlafzimmer_fenster_rechts_battery

climate:
  temperature_entity: sensor.schlafzimmer_hygrometer_temperatur
  humidity_entity: sensor.schlafzimmer_hygrometer_luftfeuchtigkeit
  battery_entity: sensor.schlafzimmer_hygrometer_battery
  battery_label: Temperatursensor

switch_battery:
  entity: sensor.schlafzimmer_schalter_battery
  label: Lichtschalter

controls:
  - entity: light.schlafzimmer_decke
    name: Decke
    tap_action: { action: toggle }
    hold_action: { action: more-info }
  - entity: light.schlafzimmer_ecke
    name: Ecke
  - entity: light.schlafzimmer_tv
    name: TV

battery_warning_threshold: 10
battery_warning_color: "#f44336"
```

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md).
