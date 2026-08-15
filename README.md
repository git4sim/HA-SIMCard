# HA SimCard

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-%2341BDF5.svg?logo=home-assistant&logoColor=white)](https://www.home-assistant.io)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Preview](preview.png)

A compact, fully visually configurable **room overview card** for Home Assistant. Give it a
room name/icon, and only the things you actually have in that room — windows, doors, smoke
detectors, leak sensors, a temperature/humidity sensor, a switch battery, and up to 4 buttons
— show up. Nothing else.

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
  * up to 4 **switch/remote batteries** (e.g. physical wall switches)
  * the **temperature/humidity sensor's battery**
  * each **binary device's battery** (if it has one)
  Each gauge only appears if you've configured that entity — nothing is shown by default.
* **Binary device chips** — one per configured device (1–10). Each is a window, door, smoke
  detector, or leak sensor — own icon, own state wording (Open/Closed, Smoke/OK, Wet/Dry),
  and its own configurable on/off color pair per type.
* **Buttons** — up to 4 freely definable switches (lights, switches, fans, covers like garage
  doors), showing name + state (and light brightness %, if applicable).

Everything above is independently clickable: tap/hold actions are configurable per device,
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
| `collapsible` | `false` | Click the header to collapse/expand devices + buttons. Collapsed, the binary devices still show as a row of small icon-only chips |
| `default_state` | `expanded` | `expanded` · `collapsed` (only relevant when `collapsible: true`) |
| `remember_state` | `true` | Remember collapsed/expanded state across reloads |
| `window_open_color` / `window_closed_color` | `#FFA000` / `#4CAF50` | Chip color for `type: window` entries, open/closed |
| `door_open_color` / `door_closed_color` | `#FFA000` / `#4CAF50` | Chip color for `type: door` entries, open/closed |
| `smoke_open_color` / `smoke_closed_color` | `#f44336` / `#4CAF50` | Chip color for `type: smoke` entries, smoke/OK |
| `leak_open_color` / `leak_closed_color` | `#f44336` / `#4CAF50` | Chip color for `type: leak` entries, wet/dry |
| `battery_warning_threshold` | `10` | Battery gauges turn `battery_warning_color` at/below this % |
| `battery_warning_color` | `#f44336` | Warning color for low battery gauges |

### `windows` (list, 1–10 entries) — "Binary Devices" in the editor

| Option | Default | Description |
|---|---|---|
| `entity` | — | `binary_sensor` (or `sensor`) — window/door contact, smoke detector, or leak sensor |
| `type` | `window` | `window` · `door` · `smoke` · `leak` — switches the chip icon, its two state labels (Open/Closed, Smoke/OK, Wet/Dry), its color pair (see above), and the fallback label if `label` is empty |
| `label` | — | Custom label (falls back to friendly name) |
| `tap_action` / `hold_action` | — | Action on the chip |
| `battery_entity` | — | Optional battery sensor for this device — adds a stat gauge |
| `battery_label` | — | Label for that gauge |
| `battery_tap_action` / `battery_hold_action` | — | Action on that gauge |

### `climate` (single object, all optional)

| Option | Description |
|---|---|
| `temperature_entity` / `temperature_label` / `temperature_tap_action` / `temperature_hold_action` | Temperature sensor shown in the header subline |
| `humidity_entity` / `humidity_label` / `humidity_tap_action` / `humidity_hold_action` | Humidity sensor shown in the header subline |
| `battery_entity` / `battery_label` / `battery_tap_action` / `battery_hold_action` | Battery of the temperature/humidity sensor device — adds a stat gauge |

### `switch_batteries` (list, up to 4 entries)

One stat gauge per entry — for rooms with more than one physical switch/remote.

| Option | Description |
|---|---|
| `entity` | Battery sensor of a physical switch/remote in the room |
| `label` | Label for the gauge (e.g. "Lichtschalter") |
| `tap_action` / `hold_action` | Action on that gauge |

> The old single-object `switch_battery: {entity: ..., ...}` form still works if you have it
> in an existing config — it's read as a one-item list. The editor always writes the new
> `switch_batteries` list form.

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
name: Gästezimmer
icon: mdi:home-outline
collapsible: true

windows:
  - entity: binary_sensor.gaestezimmer_fenster_nord
    label: Fenster Nord
  - entity: binary_sensor.gaestezimmer_fenster_ost
    label: Fenster Ost
    battery_entity: sensor.gaestezimmer_fenster_ost_batterie
    battery_label: Fensterbatterie Ost
  - entity: binary_sensor.gaestezimmer_rauchmelder
    type: smoke
    label: Rauchmelder

climate:
  temperature_entity: sensor.gaestezimmer_temperatur
  humidity_entity: sensor.gaestezimmer_luftfeuchtigkeit
  battery_entity: sensor.gaestezimmer_klimasensor_batterie
  battery_label: Klimasensor

switch_batteries:
  - entity: sensor.gaestezimmer_schalter_batterie
    label: Schalterbatterie
  - entity: sensor.gaestezimmer_nachttisch_schalter_batterie
    label: Schalter Nachttisch

controls:
  - entity: light.gaestezimmer_decke
    name: Decke
    tap_action: { action: toggle }
    hold_action: { action: more-info }
  - entity: light.gaestezimmer_bett
    name: Bett
  - entity: light.gaestezimmer_spiegel
    name: Spiegel
  - entity: light.gaestezimmer_kette
    name: Kette

battery_warning_threshold: 10
battery_warning_color: "#f44336"
smoke_open_color: "#f44336"
smoke_closed_color: "#4CAF50"
```

> The entity IDs above are made up for illustration — swap in your own `binary_sensor` /
> `sensor` / `light` (or `switch` / `fan` / `cover`) entities.

---

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md).
