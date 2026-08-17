# Changelog

All notable changes to HA SimCard are documented here.

## [1.5.0]

* **Binary device battery gauges moved inline**: a window/door/smoke/leak entry's
  `battery_entity` gauge now sits right-aligned inside that device's own chip row instead of
  as a separate stat row up in the header — a room with several battery-equipped devices no
  longer grows a header row per device on top of its chip. `battery_label` still applies, now
  as the gauge's hover tooltip (there's no room for visible text next to it). Tapping/holding
  the gauge still fires `battery_tap_action`/`battery_hold_action` independently of the
  chip's own actions.

## [1.4.0]

* **Multiple switch batteries**: `switch_battery` (single object) is now `switch_batteries`
  (list, up to 4), so a room with more than one physical switch/remote can show a battery
  gauge for each. Existing configs using the old singular `switch_battery: {...}` keep
  working unchanged (read as a one-item list); the editor migrates it to the plural list form
  as soon as you touch that section.

## [1.3.0]

* **Collapsed view**: when `collapsible: true` and the card is collapsed, the binary devices
  (windows/doors/smoke/leak sensors) now show as a compact row of icon-only chips instead of
  disappearing entirely — colored and iconed the same as the full chips, with a hover tooltip
  and the same tap/hold actions. Only shows up when there's actually a device configured.

## [1.2.0]

* **Per-type colors**: window/door/smoke/leak each get their own configurable open/closed
  color pair (`window_open_color`/`window_closed_color`, `door_open_color`/
  `door_closed_color`, `smoke_open_color`/`smoke_closed_color`, `leak_open_color`/
  `leak_closed_color`) instead of one shared pair for all of them. All editable in the
  Appearance section. `window_*` keeps its old meaning, so existing configs are unaffected.
* **Renamed section**: the editor's "Windows" section (and its "Add"/"max" text) is now
  "Binary Devices" ("Binärgeräte"), matching that it now covers windows, doors, smoke
  detectors and leak sensors, not just windows. The `windows:` config key itself is
  unchanged.
* **Raised the limit** from 3 to 10 devices.

## [1.1.1]

* **Windows**: the Window/Door type toggle now also has Smoke Detector and Leak Sensor
  options. Each type gets its own icon and its own pair of state labels (Open/Closed,
  Smoke/OK, Wet/Dry) instead of always saying Open/Closed.

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
