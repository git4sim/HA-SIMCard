# Changelog

This repository hosts three independent cards, each with its own version history below. All
three ship bundled in the single `ha-simcard.js` file (see the note under HA SimCard
[1.6.0]) — HACS's "plugin" category only auto-tracks one file per repository, so this is
what makes HA Infra: Proxmox and HA Infra: NAS actually get installed via HACS.

## HA SimCard

### [1.6.0]

* **Bundled with HA Infra: Proxmox and HA Infra: NAS**: both cards' code now ships inside
  `ha-simcard.js` instead of their own separate files. Installing/updating the one
  `ha-simcard.js` resource is enough to get all three cards; no extra Lovelace resources
  needed. Each card is still wrapped in its own scope (own custom element, own config
  schema, own translations) — bundling them doesn't change how any of the three behave or
  are configured, only how the file is distributed.

### [1.5.0]

* **Binary device battery gauges moved inline**: a window/door/smoke/leak entry's
  `battery_entity` gauge now sits right-aligned inside that device's own chip row instead of
  as a separate stat row up in the header — a room with several battery-equipped devices no
  longer grows a header row per device on top of its chip. `battery_label` still applies, now
  as the gauge's hover tooltip (there's no room for visible text next to it). Tapping/holding
  the gauge still fires `battery_tap_action`/`battery_hold_action` independently of the
  chip's own actions.

### [1.4.0]

* **Multiple switch batteries**: `switch_battery` (single object) is now `switch_batteries`
  (list, up to 4), so a room with more than one physical switch/remote can show a battery
  gauge for each. Existing configs using the old singular `switch_battery: {...}` keep
  working unchanged (read as a one-item list); the editor migrates it to the plural list form
  as soon as you touch that section.

### [1.3.0]

* **Collapsed view**: when `collapsible: true` and the card is collapsed, the binary devices
  (windows/doors/smoke/leak sensors) now show as a compact row of icon-only chips instead of
  disappearing entirely — colored and iconed the same as the full chips, with a hover tooltip
  and the same tap/hold actions. Only shows up when there's actually a device configured.

### [1.2.0]

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

### [1.1.1]

* **Windows**: the Window/Door type toggle now also has Smoke Detector and Leak Sensor
  options. Each type gets its own icon and its own pair of state labels (Open/Closed,
  Smoke/OK, Wet/Dry) instead of always saying Open/Closed.

### [1.1.0]

* **Windows**: each window now has a Window/Door toggle in the editor. Doors get their own
  icon (`mdi:door-open` / `mdi:door-closed`) and fallback label, everything else (battery,
  actions, colors) works the same as before.

### [1.0.3]

* **Windows**: raised the limit from 2 to 3 (editor "Add Window" button and config).

### [1.0.2]

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

### [1.0.1]

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

### [1.0.0]

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

## HA Infra: Proxmox

### [1.2.2]

* **Fix**: a container/VM tile's CPU/RAM/storage stats row (`flex-wrap: wrap`) sat close
  enough to its own width limit that some tiles wrapped onto two lines and others didn't,
  depending on the exact digit widths of that tile's values — inconsistent between tiles
  showing the same three stats. Row no longer wraps at all (`flex-wrap: nowrap`); it reliably
  fits on one line for every tile now.

### [1.2.1]

* **Tiles back to 2 per row** (`flex-basis` 31% → 46%): 3 per row left an odd item count's
  last row half-empty and forced the CPU/RAM/storage stats onto 3 stacked lines per tile
  instead of fitting comfortably; 2 per row divides evenly far more often (most node's
  container/VM counts are even) and reads as a consistent grid instead of a mixed one.

### [1.2.0]

* **Container/VM tiles redesigned**: the "In Betrieb"/"Gestoppt"/"Nicht verfügbar" state text
  is gone, replaced by a small round status badge top-right of the tile, next to the name —
  green check (running), red X (stopped), amber warning (unavailable). Frees up enough space
  that tiles pack three per row again instead of two (`flex-basis` 45% → 31%), matching the
  earlier CPU/RAM/storage layout without the wider tiles it needed before.

### [1.1.3]

* **Node stat layout**: general stats (containers/VMs/CPU/RAM/storage) and per-disk
  temperatures now render as two separate right-aligned lines — general stats next to the
  node name, disk temperatures next to the status text below it — instead of all of them
  wrapping together into one crowded line. Uses the vertical space next to the name/status
  that was previously empty, and gives disk labels (which tend to be longer, e.g. actual
  disk model names) their own row instead of competing with the shorter stats for space.

### [1.1.2]

* **Fix**: a node's disk-temperature pills (from `drives`) could overflow past the edge of
  the card when the drive's `label` was long (e.g. a full disk model name like
  "SanDisk SD6SB1M 32G") — the label was concatenated straight into the pill's text with no
  width limit. The label now truncates with an ellipsis at a fixed width (full text still
  available as a hover tooltip); the temperature value itself is never truncated.
* **Fix**: container/VM tiles defaulted every tap to `toggle`, which fails silently for
  `binary_sensor`-backed containers (`binary_sensor` has no toggle service — only
  `switch`/`light`/`fan`/`cover`/`input_boolean` do). The default tap action is now chosen
  per entity domain: `toggle` for the domains that support it, `more-info` for everything
  else (including `binary_sensor` and plain `sensor`). The editor's action dropdown reflects
  this resolved default instead of always showing "None" for an unset tap/hold action.

### [1.1.1]

* **Fix**: numeric sensor values (CPU %, RAM, storage, temperatures, ...) shown in node and
  container/VM stat pills are now rounded to one decimal place instead of showing the raw
  sensor value verbatim (e.g. `8.51937846043936 %` → `8.5 %`). Non-numeric states are
  untouched.

### [1.1.0]

* **Containers/VMs can be assigned to a node**: each container/VM entry gets an optional
  `node_id` (editor: a "Node" dropdown listing your configured nodes). Assigned ones render
  grouped directly under their node instead of in the flat grid; anything left unassigned
  still renders in that flat grid exactly as before — existing configs are unaffected.
  Deleting a node un-assigns (never deletes) any containers pointing at it.
* **Per-container/VM CPU, RAM, storage**: three new optional sensors (`cpu_entity`,
  `ram_entity`, `storage_entity`) shown as small stat pills inside each tile.
* **Per-node CPU and storage**: two new optional sensors (`cpu_entity`, `storage_entity`)
  alongside the existing `memory_entity`, shown in the node's stat row.
* **Per-node disk temperatures**: a new `drives` list (up to 4 per node, each an `entity` +
  `label`) for setups where Home Assistant has no node-level temperature sensor at all but
  does have SMART/disk-temperature sensors — the common case for Proxmox. Same
  at/above-threshold red-warning behavior as HA Infra: NAS's drives, via two new card-level
  options: `temperature_warning_threshold` (default 45°) and `temperature_warning_color`.
  The existing single `temperature_entity` per node still works for setups that do have one.
* Tiles widened (2 per row instead of 3) to fit the new per-container stats.

### [1.0.0]

Initial release: a compact Proxmox overview card (own custom element `ha-infra-proxmox`, own
config schema; ships bundled inside `ha-simcard.js` — see [1.6.0] above).

* **Nodes** (list, up to 10) — one row each: status icon/text, running container count,
  running VM count, free memory, optional temperature, all inline instead of a separate row
  per stat.
* **Containers/VMs** (list, up to 20) — a grid of toggle tiles below the nodes, same
  name/icon/state/action shape as HA SimCard's `controls`.
* Fully GUI-configurable, same visual-editor conventions as HA SimCard (collapsible sections,
  native always-rendering text fields, scoped per-section list wiring).

## HA Infra: NAS

### [1.0.0]

Initial release: a compact NAS overview card (own custom element `ha-infra-nas`, own config
schema; ships bundled inside `ha-simcard.js` — see [1.6.0] above under HA SimCard). One
device per card instance, matching HA SimCard's one-room-per-card approach.

* **System temperature** (optional) shown in the header.
* **Drives** (list, up to 12) — one row each, temperature only; turns
  `temperature_warning_color` (default red) at/above `temperature_warning_threshold`
  (default 45°) — the inverse of a battery gauge's low-value warning, since heat rising is
  the problem here.
* Fully GUI-configurable, same visual-editor conventions as HA SimCard.
