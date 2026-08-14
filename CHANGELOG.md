# Changelog

All notable changes to HA SimCard are documented here.

## [1.0.0]

Initial release of HA SimCard: a compact, conditional room-overview status card (own custom
element `ha-simcard`, own file `ha-simcard.js`, own config schema) — installable side by
side with any other card, no conflicts.

* **New card**: `custom:ha-simcard`. Room name/icon, 1–2 `windows` (each with an optional
  per-window `battery_entity`), a single `climate` sensor block (temperature/humidity/
  battery, all optional), a `switch_battery` gauge (e.g. a physical wall switch's battery),
  and up to 4 `controls` (lights/switches/fans/covers).
* **Conditional rendering** — every section (windows row, each stat gauge, controls grid,
  temperature/humidity line) only renders when its entity is actually configured and
  available. Nothing is shown by default.
* **Every displayed entity is independently actionable** — windows, each battery gauge,
  temperature, humidity, and every button each have their own configurable
  `tap_action` / `hold_action` (buttons also get `double_tap_action`).
* **Low-battery warning** — any battery gauge (switch, climate sensor, or window) turns
  `battery_warning_color` (default red, `#f44336`) at/below `battery_warning_threshold`
  (default `10`%).
* No header background image, no climate-device (HVAC) integration, no cover/shutter
  position-slider logic — this card isn't a general-purpose dashboard tile.
* Fully GUI-configurable — visual editor with collapsible sections for General, Windows,
  Climate Sensor, Switch Battery, Buttons, and Appearance, each entity's action pair
  editable inline.
