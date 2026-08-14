# Changelog

All notable changes to HA SimCard are documented here.

## [1.1.0]

* **Windows**: each window now has a Window/Door toggle in the editor. Doors get their own
  icon (`mdi:door-open` / `mdi:door-closed`) and fallback label, everything else (battery,
  actions, colors) works the same as before.

## [1.0.3]

* **Windows**: raised the limit from 2 to 3 (editor "Add Window" button and config).

## [1.0.2]

* **Fix**: every free-text field in the editor (room name, window/battery labels, button
  name, color hex value, battery threshold, navigation path / service fields) used
  `ha-textfield`, whose internal outline/notch layout can fail to paint when the element is
  created via a raw innerHTML string inside a collapsible/flex section — the field silently
  stayed blank while still taking up its layout space, even though the value underneath was
  set correctly. All of these are now plain, always-rendering `<input>`/`<textarea>` elements
  with an explicit label above them.
* **Card**: windows are now stacked one per row (full width) instead of wrapping side by
  side, matching the compact-list look; each row stays small so 2 windows plus several
  battery gauges don't add much height.

## [1.0.1]

* **Fix**: editing a button/switch (`controls`) entry — name, entity, icon, color, actions —
  silently did nothing whenever the "Windows" section was also expanded in the editor. Both
  sections shared an unscoped element lookup, so the second one accidentally wired itself
  into the first section's DOM. Deleting a window entry while both were open could also
  incorrectly delete a control at the same time. Both are fixed by scoping each section's
  editor logic to its own section.
* **Card**: smaller window chips and tighter battery-gauge rows, so a room with 2 windows and
  several battery gauges configured stays noticeably more compact.
* **Editor**: color pickers (window/warning colors) now show a clear label above the swatch
  instead of relying only on the text field's floating label.
* **Docs**: README example config now uses made-up entity IDs/room instead of a real setup;
  `preview.png` regenerated with fictional data to match.

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
