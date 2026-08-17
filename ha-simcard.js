(function () {
  "use strict";

const VERSION = "1.6.0";
const LOG_FLAG = `customCards_HaSimCard_Logged_${VERSION}`;

if (!window[LOG_FLAG]) {
  console.info(
    `%c HA-SIMCARD %c ${VERSION} `,
    "color: white; background: #2c3e50; font-weight: 700;",
    "color: white; background: #c0392b; font-weight: 700;"
  );
  window[LOG_FLAG] = true;
}

// =============================================================================
// TRANSLATIONS
// =============================================================================
const TRANSLATIONS = {
  en: {
    name: "Name", icon: "Icon", entity: "Entity", label: "Label (optional)",
    general: "General", collapsible: "Collapsible", default_state: "Default State",
    state_expanded: "Expanded", state_collapsed: "Collapsed",
    windows: "Windows", binary_devices: "Binary Devices", device: "Device", device_add: "Add Device", device_max: "Maximum of 10 devices",
    window_type: "Type", type_window: "Window", type_door: "Door", type_smoke: "Smoke Detector", type_leak: "Leak Sensor",
    battery_entity: "Battery Sensor (optional)", battery_label: "Battery Label (optional)",
    climate: "Temperature / Humidity Sensor", temperature_entity: "Temperature Sensor",
    humidity_entity: "Humidity Sensor",
    switch_battery: "Switch Battery", switch_batteries: "Switch Batteries",
    switch_battery_add: "Add Switch Battery", switch_battery_max: "Maximum of 4 switch batteries",
    controls: "Buttons / Switches", control_add: "Add Button", control_max: "Maximum of 4 buttons",
    appearance: "Appearance", on_color: "On Color",
    battery_warning_threshold: "Battery Warning Threshold (%)", battery_warning_color: "Battery Warning Color",
    tap_action: "Tap Action", hold_action: "Hold Action", double_tap_action: "Double Tap Action",
    act_more: "Details (Default)", act_toggle: "Toggle", act_navigate: "Navigate", act_call_service: "Action (service)", act_none: "None",
    nav_path: "Navigation Path", service: "Service (domain.service)", service_data: "Service Data (JSON)",
    show_icon: "Show Icon", delete: "Delete", empty_hint: "Nothing configured yet — add a device, a sensor or a button below.",
    state_on: "On", state_off: "Off", state_open: "Open", state_closed: "Closed", state_opening: "Opening", state_closing: "Closing",
    state_unavailable: "Unavailable", state_unknown: "Unknown",
    state_smoke: "Smoke", state_ok: "OK", state_wet: "Wet", state_dry: "Dry",
  },
  de: {
    name: "Name", icon: "Icon", entity: "Entität", label: "Bezeichnung (optional)",
    general: "Allgemein", collapsible: "Einklappbar", default_state: "Standardzustand",
    state_expanded: "Ausgeklappt", state_collapsed: "Eingeklappt",
    windows: "Fenster", binary_devices: "Binärgeräte", device: "Gerät", device_add: "Gerät hinzufügen", device_max: "Maximal 10 Geräte",
    window_type: "Typ", type_window: "Fenster", type_door: "Tür", type_smoke: "Rauchmelder", type_leak: "Leck-Sensor",
    battery_entity: "Batteriesensor (optional)", battery_label: "Batterie-Bezeichnung (optional)",
    climate: "Temperatur- / Feuchtigkeitssensor", temperature_entity: "Temperatursensor",
    humidity_entity: "Feuchtigkeitssensor",
    switch_battery: "Schalter-Batterie", switch_batteries: "Schalter-Batterien",
    switch_battery_add: "Schalter-Batterie hinzufügen", switch_battery_max: "Maximal 4 Schalter-Batterien",
    controls: "Schalter / Buttons", control_add: "Button hinzufügen", control_max: "Maximal 4 Buttons",
    appearance: "Darstellung", on_color: "Farbe (an)",
    battery_warning_threshold: "Batteriewarnung Schwelle (%)", battery_warning_color: "Batteriewarnung Farbe",
    tap_action: "Antippen", hold_action: "Gedrückt halten", double_tap_action: "Doppelklick",
    act_more: "Details (Standard)", act_toggle: "Umschalten", act_navigate: "Navigieren", act_call_service: "Aktion (Service)", act_none: "Nichts",
    nav_path: "Navigationspfad", service: "Service (domain.service)", service_data: "Service-Daten (JSON)",
    show_icon: "Icon anzeigen", delete: "Löschen", empty_hint: "Noch nichts konfiguriert — füge unten ein Gerät, einen Sensor oder einen Button hinzu.",
    state_on: "An", state_off: "Aus", state_open: "Offen", state_closed: "Zu", state_opening: "Öffnet", state_closing: "Schließt",
    state_unavailable: "Nicht verfügbar", state_unknown: "Unbekannt",
    state_smoke: "Rauch", state_ok: "OK", state_wet: "Nass", state_dry: "Trocken",
  }
};

function getTranslation(hass, key) {
  const lang = String(hass?.language || "en").toLowerCase();
  const dict = lang.startsWith("de") ? TRANSLATIONS.de : TRANSLATIONS.en;
  return dict[key] ?? TRANSLATIONS.en[key] ?? key;
}

function translateState(hass, state) {
  const key = `state_${String(state).toLowerCase().trim()}`;
  const lang = String(hass?.language || "en").toLowerCase();
  const dict = lang.startsWith("de") ? TRANSLATIONS.de : TRANSLATIONS.en;
  return dict[key] || state;
}

// =============================================================================
// HELPERS
// =============================================================================
const trimStr = (v) => (typeof v === "string" ? v.trim() : v);

const escAttr = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const clampPct = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : null;
};

const domainOf = (entityId) => (typeof entityId === "string" ? entityId.split(".")[0] : "");

const isUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";

const OPEN_STATE_VALUES = new Set(["on", "open", "opening", "offen", "geöffnet", "gekippt"]);
const isWindowOpen = (st) => OPEN_STATE_VALUES.has(String(st?.state || "").toLowerCase().trim());

/**
 * Per-"window" (really: binary_sensor chip) type. Same on/off state underneath for all of
 * them (device_class differs, but binary_sensor is always on/off) - only the icon pair, the
 * two state labels, the fallback name, and the pair of colors (each configurable, these are
 * just the defaults) change. Colors are stored as top-level `${type}_open_color` /
 * `${type}_closed_color` config keys - `window_open_color`/`window_closed_color` keep their
 * original meaning for existing configs, door/smoke/leak are new.
 */
const WINDOW_TYPES = {
  window: { iconOpen: "mdi:window-open-variant", iconClosed: "mdi:window-closed-variant", labelKey: "type_window", openKey: "state_open", closedKey: "state_closed", defaultOpenColor: "#FFA000", defaultClosedColor: "#4CAF50" },
  door: { iconOpen: "mdi:door-open", iconClosed: "mdi:door-closed", labelKey: "type_door", openKey: "state_open", closedKey: "state_closed", defaultOpenColor: "#FFA000", defaultClosedColor: "#4CAF50" },
  smoke: { iconOpen: "mdi:smoke-detector-variant-alert", iconClosed: "mdi:smoke-detector-variant", labelKey: "type_smoke", openKey: "state_smoke", closedKey: "state_ok", defaultOpenColor: "#f44336", defaultClosedColor: "#4CAF50" },
  leak: { iconOpen: "mdi:water-alert", iconClosed: "mdi:water-off", labelKey: "type_leak", openKey: "state_wet", closedKey: "state_dry", defaultOpenColor: "#f44336", defaultClosedColor: "#4CAF50" },
};
const resolvedWindowType = (w) => (WINDOW_TYPES[w?.type] ? w.type : "window");
const MAX_BINARY_DEVICES = 10;
const MAX_SWITCH_BATTERIES = 4;

/**
 * `switch_batteries` (list) replaces the old single `switch_battery` object so a room can
 * have more than one physical switch/remote battery. Existing configs that still only have
 * the singular `switch_battery: {...}` keep working unchanged - read as a one-item list.
 * The editor always writes the plural list form going forward.
 */
const switchBatteriesOf = (c) => {
  if (Array.isArray(c?.switch_batteries)) return c.switch_batteries;
  return c?.switch_battery?.entity ? [c.switch_battery] : [];
};

function parseColorToPickerHex(color) {
  if (!color) return "#ff9800";
  const c = String(color).trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [, r, g, b] = c;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const toHex = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return "#ff9800";
}

function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function defaultIcon(entityId, st) {
  const domain = domainOf(entityId);
  const state = String(st?.state || "").toLowerCase();
  if (domain === "light") return state === "on" ? "mdi:lightbulb" : "mdi:lightbulb-off-outline";
  if (domain === "switch") return state === "on" ? "mdi:toggle-switch" : "mdi:toggle-switch-off-outline";
  if (domain === "fan") return state === "on" ? "mdi:fan" : "mdi:fan-off";
  if (domain === "cover") return state === "open" ? "mdi:garage-open" : "mdi:garage";
  return "mdi:help-circle-outline";
}

const ACTIVE_STATES = new Set(["on", "open", "opening", "home", "playing"]);
const isEntityActive = (st) => st && ACTIVE_STATES.has(String(st.state).toLowerCase());

// =============================================================================
// ACTION EXECUTION (dispatches the native "hass-action" event, same convention
// used by Home Assistant's own Lovelace elements)
// =============================================================================
function fireAction(node, entity, actionCfg, type) {
  if (isUnavailable_entityGuard(node, entity)) return;
  const actionKey = `${type}_action`;
  let cfg = actionCfg && typeof actionCfg === "object" ? { ...actionCfg } : { action: "none" };
  if (!cfg.action) cfg.action = "none";
  if (cfg.action === "none") return;
  const eventDetail = {
    config: { entity: cfg.target?.entity_id || entity, [actionKey]: cfg },
    action: type
  };
  node.dispatchEvent(new CustomEvent("hass-action", { bubbles: true, composed: true, detail: eventDetail }));
}
function isUnavailable_entityGuard(node, entity) {
  const hass = node?._roomCardHass;
  if (!entity || !hass) return false;
  return isUnavailable(hass.states[entity]);
}

/**
 * Attaches tap / hold / double-tap gesture handling to a node.
 * cfg: { entity, tap_action, hold_action, double_tap_action }
 */
function attachGestures(node, hass, cfg) {
  node._roomCardHass = hass;
  const tap = cfg.tap_action || { action: "more-info" };
  const hold = cfg.hold_action || { action: "none" };
  const dbl = cfg.double_tap_action || { action: "none" };
  node.style.touchAction = "manipulation";
  node.style.cursor = "pointer";
  let holdTimer = null, tapTimer = null, held = false;
  const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
  // stopPropagation on pointerdown/up (not just click) so a gesture-enabled element nested
  // inside another one - e.g. a battery gauge inside a window chip - only fires its own
  // action, not the parent's too.
  node.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    held = false;
    if (hold.action !== "none") {
      holdTimer = setTimeout(() => {
        held = true;
        if (node.isConnected) fireAction(node, cfg.entity, hold, "hold");
      }, 500);
    }
  });
  node.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    cancelHold();
    if (held) { held = false; return; }
    if (dbl.action !== "none") {
      if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; fireAction(node, cfg.entity, dbl, "double_tap"); }
      else { tapTimer = setTimeout(() => { tapTimer = null; fireAction(node, cfg.entity, tap, "tap"); }, 250); }
    } else {
      fireAction(node, cfg.entity, tap, "tap");
    }
  });
  node.addEventListener("pointerleave", cancelHold);
  node.addEventListener("pointercancel", cancelHold);
  node.addEventListener("click", (e) => e.stopPropagation());
}

// =============================================================================
// CARD
// =============================================================================
class HaSimCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._collapsed = false;
    this._rendered = false;
  }

  setConfig(config) {
    this.config = config || {};
    const key = `ha-simcard-collapsed:${this.config.name || "room"}`;
    this._collapseKey = key;
    const stored = this.config.remember_state !== false ? localStorage.getItem(key) : null;
    this._collapsed = stored !== null ? stored === "1" : (this.config.default_state === "collapsed");
    this._lastSig = null;
    if (!this._rendered) this._render();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    if (!this._rendered) this._render();
    this._update();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this.config && !this._rendered) this._render();
  }

  getCardSize() {
    const c = this.config || {};
    let size = 1;
    if ((c.windows || []).length) size += Math.ceil((c.windows || []).length / 2);
    if ((c.controls || []).length) size += Math.ceil((c.controls || []).length / 2);
    return size;
  }

  static getConfigElement() { return document.createElement("ha-simcard-editor"); }
  static getStubConfig() {
    return { type: "custom:ha-simcard", name: "Room", icon: "mdi:home-outline", windows: [], controls: [] };
  }

  _render() {
    this._rendered = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .header { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px 8px; }
        .header.clickable { cursor: pointer; }
        .header ha-icon { --mdc-icon-size: 22px; color: var(--paper-item-icon-color, var(--state-icon-color, var(--primary-text-color))); margin-top: 1px; flex-shrink: 0; }
        .title-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .name { font-size: 15px; font-weight: 700; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subline { font-size: 12px; color: var(--secondary-text-color); display: flex; gap: 6px; flex-wrap: wrap; }
        .subline .clickable { cursor: pointer; }
        .subline .clickable:hover { text-decoration: underline; text-underline-offset: 2px; }
        .stats { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
        .stat-row { display: flex; align-items: center; gap: 4px; font-size: 10px; line-height: 1.2; color: var(--secondary-text-color); cursor: pointer; }
        .stat-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; opacity: 0.85; }
        .stat-gauge { position: relative; width: 16px; height: 8px; border: 1.5px solid currentColor; border-radius: 2px; box-sizing: border-box; color: var(--stat-color, var(--secondary-text-color)); flex-shrink: 0; opacity: 0.9; }
        .stat-gauge::after { content: ""; position: absolute; top: 50%; right: -3px; transform: translateY(-50%); width: 2px; height: 3.5px; background: currentColor; border-radius: 0 1px 1px 0; }
        .stat-fill { position: absolute; top: 1px; bottom: 1px; left: 1px; width: var(--fill, 0%); max-width: calc(100% - 2px); background: currentColor; border-radius: 1px; }
        .stat-value { min-width: 24px; text-align: right; font-weight: 700; color: var(--val-color, var(--primary-text-color)); font-variant-numeric: tabular-nums; }
        .body { overflow: hidden; transition: max-height 0.3s ease, opacity 0.2s ease; max-height: 600px; opacity: 1; }
        .body.collapsed { max-height: 0 !important; opacity: 0; }
        .windows { display: flex; flex-direction: column; gap: 4px; padding: 0 14px 6px; }
        .win-chip { display: flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 7px; font-size: 10px; font-weight: 600; cursor: pointer; background: var(--chip-bg); color: var(--chip-color); }
        .win-chip ha-icon { --mdc-icon-size: 12px; color: var(--chip-color); flex-shrink: 0; }
        .win-chip-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .win-chip-batt { margin-left: auto; padding-left: 6px; display: flex; align-items: center; gap: 4px; flex-shrink: 0; cursor: pointer; }
        .win-chip-batt .stat-value { font-size: 10px; min-width: 0; }
        .mini-windows { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 14px 10px; }
        .mini-windows[hidden] { display: none; }
        .mini-chip { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--chip-bg); color: var(--chip-color); flex-shrink: 0; }
        .mini-chip ha-icon { --mdc-icon-size: 13px; color: var(--chip-color); }
        .controls { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 14px; }
        .ctrl-btn { flex: 1 1 0; min-width: 78px; display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 12px; cursor: pointer; background: rgba(128,128,128,0.08); transition: background 0.15s; box-sizing: border-box; }
        .ctrl-btn:hover { background: rgba(128,128,128,0.14); }
        .ctrl-btn.on { background: var(--ctrl-on-bg, rgba(255,167,38,0.16)); }
        .ctrl-btn.unavailable { opacity: 0.5; cursor: default; }
        .ctrl-btn ha-icon { --mdc-icon-size: 20px; color: var(--secondary-text-color); flex-shrink: 0; }
        .ctrl-btn.on ha-icon { color: var(--ctrl-on-color, #ffa726); }
        .ctrl-txt { display: flex; flex-direction: column; min-width: 0; }
        .ctrl-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ctrl-state { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty-hint { padding: 16px 14px 18px; font-size: 13px; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div id="header" class="header">
          <ha-icon id="icon"></ha-icon>
          <div class="title-col">
            <span id="name" class="name"></span>
            <span id="subline" class="subline"></span>
          </div>
          <div id="stats" class="stats"></div>
        </div>
        <div id="mini-windows" class="mini-windows" hidden></div>
        <div id="body" class="body">
          <div id="windows" class="windows"></div>
          <div id="controls" class="controls"></div>
        </div>
        <div id="empty-hint" class="empty-hint" hidden></div>
      </ha-card>
    `;
  }

  _stateSignature(h) {
    const c = this.config || {};
    const ids = new Set();
    (c.windows || []).forEach((w) => { if (w.entity) ids.add(w.entity); if (w.battery_entity) ids.add(w.battery_entity); });
    const cl = c.climate || {};
    [cl.temperature_entity, cl.humidity_entity, cl.battery_entity].forEach((e) => e && ids.add(e));
    switchBatteriesOf(c).forEach((sb) => { if (sb.entity) ids.add(sb.entity); });
    (c.controls || []).forEach((ctrl) => { if (ctrl.entity) ids.add(ctrl.entity); });
    const parts = [];
    ids.forEach((id) => {
      const st = h.states[id];
      parts.push(`${id}:${st ? st.state + "|" + (st.attributes?.friendly_name || "") + "|" + (st.attributes?.brightness ?? "") : "x"}`);
    });
    return parts.sort().join(",") + `|${h.language || ""}|${h.config?.unit_system?.temperature || ""}`;
  }

  _update() {
    const h = this._hass, c = this.config;
    if (!h || !c) return;
    const sig = this._stateSignature(h);
    if (sig === this._lastSig) return;
    this._lastSig = sig;

    const nameEl = this.shadowRoot.getElementById("name");
    const iconEl = this.shadowRoot.getElementById("icon");
    const sublineEl = this.shadowRoot.getElementById("subline");
    const statsEl = this.shadowRoot.getElementById("stats");
    const windowsEl = this.shadowRoot.getElementById("windows");
    const miniWindowsEl = this.shadowRoot.getElementById("mini-windows");
    const controlsEl = this.shadowRoot.getElementById("controls");
    const headerEl = this.shadowRoot.getElementById("header");
    const emptyHint = this.shadowRoot.getElementById("empty-hint");

    nameEl.textContent = c.name || "Room";
    iconEl.icon = c.icon || "mdi:home-outline";

    // --- Header click-to-collapse --- (listener wired once, reads live config on every click
    // so toggling `collapsible` off at runtime actually disables it, not a stale closure)
    const applyCollapsedState = () => {
      const collapsed = this.config?.collapsible === true && this._collapsed;
      this.shadowRoot.getElementById("body").classList.toggle("collapsed", collapsed);
      // Collapsed view still shows a compact, icon-only row of the binary devices (windows,
      // doors, smoke/leak sensors) so their state stays visible at a glance.
      miniWindowsEl.hidden = !collapsed || (this.config?.windows || []).every((w) => !w.entity);
    };
    if (!headerEl._wired) {
      headerEl._wired = true;
      headerEl.addEventListener("click", () => {
        if (this.config?.collapsible !== true) return;
        this._collapsed = !this._collapsed;
        if (this._collapseKey && this.config?.remember_state !== false) localStorage.setItem(this._collapseKey, this._collapsed ? "1" : "0");
        applyCollapsedState();
      });
    }
    headerEl.classList.toggle("clickable", c.collapsible === true);
    applyCollapsedState();

    // --- Temperature / Humidity subline ---
    sublineEl.replaceChildren();
    const cl = c.climate || {};
    const unit = h.config?.unit_system?.temperature || "°C";
    const tempSt = cl.temperature_entity ? h.states[cl.temperature_entity] : null;
    const humidSt = cl.humidity_entity ? h.states[cl.humidity_entity] : null;
    if (tempSt && !isUnavailable(tempSt) && tempSt.state !== "" && !isNaN(parseFloat(tempSt.state))) {
      const span = document.createElement("span");
      span.className = "clickable";
      span.textContent = `${trimStr(cl.temperature_label) ? trimStr(cl.temperature_label) + ": " : ""}${tempSt.state}${unit}`;
      attachGestures(span, h, { entity: cl.temperature_entity, tap_action: cl.temperature_tap_action, hold_action: cl.temperature_hold_action });
      sublineEl.appendChild(span);
    }
    if (humidSt && !isUnavailable(humidSt) && humidSt.state !== "" && !isNaN(parseFloat(humidSt.state))) {
      if (sublineEl.childElementCount > 0) sublineEl.appendChild(document.createTextNode("|"));
      const span = document.createElement("span");
      span.className = "clickable";
      span.textContent = `${trimStr(cl.humidity_label) ? trimStr(cl.humidity_label) + ": " : ""}${humidSt.state}%`;
      attachGestures(span, h, { entity: cl.humidity_entity, tap_action: cl.humidity_tap_action, hold_action: cl.humidity_hold_action });
      sublineEl.appendChild(span);
    }

    // --- Stat gauges (switch batteries, climate battery) --- per-window/door battery gauges
    // live inline in their own chip instead (see the windows loop below) rather than up here,
    // so a room with several doors doesn't grow a header stat row per door on top of its chip.
    statsEl.replaceChildren();
    const threshold = Number.isFinite(Number(c.battery_warning_threshold)) ? Number(c.battery_warning_threshold) : 10;
    const warnColor = trimStr(c.battery_warning_color) || "#f44336";
    // Builds just the gauge + percentage pair (no label, no attached gestures) - shared by
    // the header stat rows and the inline per-chip battery indicator below.
    const buildBatteryGauge = (entity) => {
      const st = h.states[entity];
      if (!st || isUnavailable(st)) return null;
      const pct = clampPct(st.state);
      if (pct == null) return null;
      const isWarn = pct <= threshold;
      const gauge = document.createElement("span");
      gauge.className = "stat-gauge";
      gauge.style.setProperty("--fill", `${pct}%`);
      if (isWarn) gauge.style.setProperty("--stat-color", warnColor);
      const fill = document.createElement("span");
      fill.className = "stat-fill";
      gauge.appendChild(fill);
      const val = document.createElement("span");
      val.className = "stat-value";
      val.textContent = `${pct}%`;
      if (isWarn) val.style.setProperty("--val-color", warnColor);
      return { gauge, val };
    };
    const addStatRow = (entity, label, tapCfg, holdCfg) => {
      const g = buildBatteryGauge(entity);
      if (!g) return;
      const row = document.createElement("div");
      row.className = "stat-row";
      const lbl = document.createElement("span");
      lbl.className = "stat-label";
      lbl.textContent = label || h.states[entity].attributes?.friendly_name || entity;
      row.appendChild(lbl);
      row.appendChild(g.gauge);
      row.appendChild(g.val);
      attachGestures(row, h, { entity, tap_action: tapCfg, hold_action: holdCfg });
      statsEl.appendChild(row);
    };
    switchBatteriesOf(c).forEach((sb) => {
      if (sb.entity) addStatRow(sb.entity, trimStr(sb.label), sb.tap_action, sb.hold_action);
    });
    if (cl.battery_entity) {
      addStatRow(cl.battery_entity, trimStr(cl.battery_label), cl.battery_tap_action, cl.battery_hold_action);
    }

    // --- Windows --- (and their collapsed-state icon-only mini chips)
    windowsEl.replaceChildren();
    miniWindowsEl.replaceChildren();
    (c.windows || []).forEach((w) => {
      if (!w.entity) return;
      const st = h.states[w.entity];
      if (!st) return;
      const open = isWindowOpen(st);
      const type = resolvedWindowType(w);
      const typeCfg = WINDOW_TYPES[type];
      const openColor = trimStr(c[`${type}_open_color`]) || typeCfg.defaultOpenColor;
      const closedColor = trimStr(c[`${type}_closed_color`]) || typeCfg.defaultClosedColor;
      const color = open ? openColor : closedColor;
      const chipBg = hexToRgba(color.startsWith("#") ? color : "#888888", 0.15) || `${color}22`;
      const iconName = open ? typeCfg.iconOpen : typeCfg.iconClosed;
      const label = trimStr(w.label) || st.attributes?.friendly_name || getTranslation(h, typeCfg.labelKey);
      const stateTxt = isUnavailable(st) ? getTranslation(h, "state_unavailable") : getTranslation(h, open ? typeCfg.openKey : typeCfg.closedKey);
      const gestureCfg = { entity: w.entity, tap_action: w.tap_action, hold_action: w.hold_action };

      const chip = document.createElement("div");
      chip.className = "win-chip";
      chip.style.setProperty("--chip-color", color);
      chip.style.setProperty("--chip-bg", chipBg);
      const icon = document.createElement("ha-icon");
      icon.icon = iconName;
      chip.appendChild(icon);
      const text = document.createElement("span");
      text.className = "win-chip-text";
      text.textContent = `${label} · ${stateTxt}`;
      chip.appendChild(text);
      if (w.battery_entity) {
        const battGauge = buildBatteryGauge(w.battery_entity);
        if (battGauge) {
          const battWrap = document.createElement("span");
          battWrap.className = "win-chip-batt";
          // No room for a visible text label next to the gauge here - keep battery_label
          // useful as a hover tooltip instead of just dropping it.
          battWrap.title = trimStr(w.battery_label) || h.states[w.battery_entity].attributes?.friendly_name || w.battery_entity;
          battWrap.appendChild(battGauge.gauge);
          battWrap.appendChild(battGauge.val);
          attachGestures(battWrap, h, { entity: w.battery_entity, tap_action: w.battery_tap_action, hold_action: w.battery_hold_action });
          chip.appendChild(battWrap);
        }
      }
      attachGestures(chip, h, gestureCfg);
      windowsEl.appendChild(chip);

      const miniChip = document.createElement("div");
      miniChip.className = "mini-chip";
      miniChip.style.setProperty("--chip-color", color);
      miniChip.style.setProperty("--chip-bg", chipBg);
      miniChip.title = `${label} · ${stateTxt}`;
      const miniIcon = document.createElement("ha-icon");
      miniIcon.icon = iconName;
      miniChip.appendChild(miniIcon);
      attachGestures(miniChip, h, gestureCfg);
      miniWindowsEl.appendChild(miniChip);
    });

    // --- Controls ---
    controlsEl.replaceChildren();
    (c.controls || []).slice(0, 4).forEach((ctrl) => {
      if (!ctrl.entity) return;
      const st = h.states[ctrl.entity];
      const unavailable = isUnavailable(st);
      const on = !unavailable && isEntityActive(st);
      const btn = document.createElement("div");
      btn.className = `ctrl-btn${on ? " on" : ""}${unavailable ? " unavailable" : ""}`;
      if (ctrl.on_color) {
        btn.style.setProperty("--ctrl-on-bg", hexToRgba(parseColorToPickerHex(ctrl.on_color), 0.16));
        btn.style.setProperty("--ctrl-on-color", ctrl.on_color);
      }
      if (ctrl.show_icon !== false) {
        const icon = document.createElement("ha-icon");
        icon.icon = trimStr(ctrl.icon) || defaultIcon(ctrl.entity, st);
        btn.appendChild(icon);
      }
      const txt = document.createElement("div");
      txt.className = "ctrl-txt";
      const nameSpan = document.createElement("span");
      nameSpan.className = "ctrl-name";
      nameSpan.textContent = trimStr(ctrl.name) || st?.attributes?.friendly_name || ctrl.entity;
      txt.appendChild(nameSpan);
      const stateSpan = document.createElement("span");
      stateSpan.className = "ctrl-state";
      if (unavailable) {
        stateSpan.textContent = getTranslation(h, "state_unavailable");
      } else if (st) {
        let stateTxt = translateState(h, st.state);
        if (domainOf(ctrl.entity) === "light" && st.state === "on" && st.attributes?.brightness !== undefined) {
          const pct = clampPct((Number(st.attributes.brightness) / 255) * 100);
          if (pct != null) stateTxt += ` · ${pct}%`;
        }
        stateSpan.textContent = stateTxt;
      }
      txt.appendChild(stateSpan);
      btn.appendChild(txt);
      if (!unavailable) {
        attachGestures(btn, h, {
          entity: ctrl.entity,
          tap_action: ctrl.tap_action || { action: "toggle" },
          hold_action: ctrl.hold_action || { action: "more-info" },
          double_tap_action: ctrl.double_tap_action || { action: "none" }
        });
      }
      controlsEl.appendChild(btn);
    });

    const hasAnything = (c.windows || []).length > 0 || (c.controls || []).length > 0;
    emptyHint.hidden = hasAnything;
    if (!hasAnything) emptyHint.textContent = getTranslation(h, "empty_hint");
  }
}

// =============================================================================
// EDITOR
// =============================================================================
const DELETE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm2 6h2v9h-2V9zm-4 0h2v9H7V9zm8 0h2v9h-2V9z"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:6px;vertical-align:-3px"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>';

const ACTION_OPTIONS = [
  { value: "more-info", key: "act_more" },
  { value: "toggle", key: "act_toggle" },
  { value: "navigate", key: "act_navigate" },
  { value: "call-service", key: "act_call_service" },
  { value: "none", key: "act_none" }
];

/**
 * Labeled plain <input>, used for every free-text field in the editor (name, labels,
 * thresholds, ...). Deliberately NOT ha-textfield: that component's internal outline/notch
 * layout can fail to paint when it's created via a raw innerHTML string inside a
 * collapsible/flex section like this editor's - the field silently renders blank while still
 * taking up its layout space. A plain input always renders and needs no such lifecycle.
 */
function textFieldHTML(cls, label, value, opts = {}) {
  const { type = "text", extraStyle = "" } = opts;
  return `
    <div class="tf" style="${extraStyle}">
      <label class="native-label">${escAttr(label)}</label>
      <input type="${escAttr(type)}" class="native-text ${cls}" value="${escAttr(value)}">
    </div>
  `;
}

/**
 * Labeled 2-4 option segmented button group (e.g. window vs. door). Plain buttons rather
 * than a native <select> or ha-switch, so the two choices are always both visible at a
 * glance instead of hidden behind a dropdown or an ambiguous on/off toggle.
 */
function segToggleHTML(cls, label, options, current) {
  const btns = options.map((o) => `<button type="button" class="seg-btn${o.value === current ? " active" : ""}" data-value="${escAttr(o.value)}">${escAttr(o.label)}</button>`).join("");
  return `
    <div class="tf ${cls}-wrap">
      <label class="native-label">${escAttr(label)}</label>
      <div class="seg-toggle ${cls}">${btns}</div>
    </div>
  `;
}

/**
 * Renders an action-type <select> plus its conditional extra fields (navigation path /
 * service+data), all present in the static markup and toggled via CSS display - so nothing
 * needs to be created dynamically while the editor bundle may still be lazy-loading.
 */
function actionFieldHTML(h, cls, labelText, actionCfg) {
  const act = actionCfg?.action || "none";
  const opts = ACTION_OPTIONS.map((o) => `<option value="${o.value}"${act === o.value ? " selected" : ""}>${escAttr(getTranslation(h, o.key))}</option>`).join("");
  return `
    <div class="action-field ${cls}">
      <label class="native-label">${escAttr(labelText)}</label>
      <select class="native-select act-type">${opts}</select>
      <div class="tf act-nav-wrap" style="display:${act === "navigate" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "nav_path"))}</label>
        <input type="text" class="native-text act-nav" value="${escAttr(actionCfg?.navigation_path)}">
      </div>
      <div class="tf act-svc-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service"))}</label>
        <input type="text" class="native-text act-svc" value="${escAttr(actionCfg?.service)}">
      </div>
      <div class="tf act-svcdata-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service_data"))}</label>
        <textarea class="native-text act-svcdata" rows="2">${escAttr(actionCfg?.service_data ? JSON.stringify(actionCfg.service_data) : "")}</textarea>
      </div>
    </div>
  `;
}

class HaSimCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSections = { general: true, windows: false, climate: false, switch_battery: false, controls: false, appearance: false };
  }

  setConfig(config) {
    const incoming = config || {};
    // Skip the destructive full rebuild when this is just the echo of a config we fired
    // ourselves a moment ago - it would otherwise tear down whatever the user is mid-edit
    // on every keystroke's blur. Only rebuild for genuinely external changes (first load,
    // YAML edits elsewhere, etc).
    if (this._rendered && this._lastFiredSig && JSON.stringify(incoming) === this._lastFiredSig) {
      this._config = incoming;
      return;
    }
    this._config = incoming;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._render();
      return;
    }
    // Home Assistant assigns .hass very frequently (on every state change bus-wide).
    // Rebuilding the whole form on each tick would tear down any open ha-entity-picker
    // dropdown mid-interaction. Only refresh the live hass reference on existing
    // pickers/selectors instead of re-rendering the DOM.
    this.shadowRoot?.querySelectorAll("ha-entity-picker, ha-icon-picker").forEach((el) => {
      el.hass = hass;
    });
  }

  get hass() { return this._hass; }

  /**
   * forceRerender: pass true whenever this change can reveal/hide OTHER fields (add/remove
   * a list item, pick an entity that conditionally shows more fields below it, toggle a
   * switch that reveals a dependent field) - those need the round-tripped setConfig() to
   * actually rebuild the DOM. Leave it false (default) for plain text edits, where the
   * field's own live value already reflects the change and rebuilding would only risk
   * disrupting an in-progress edit for no benefit.
   */
  _fire(next, forceRerender = false) {
    this._config = next;
    this._lastFiredSig = forceRerender ? null : JSON.stringify(next);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
  }

  // ---- action field wiring (shared by windows/climate/switch_battery/controls) ----

  _wireActionField(root, cls, actionCfg, onChange) {
    const field = root.querySelector(`.action-field.${cls}`);
    if (!field) return;
    const sel = field.querySelector(".act-type");
    const navWrap = field.querySelector(".act-nav-wrap");
    const svcWrap = field.querySelector(".act-svc-wrap");
    const dataWrap = field.querySelector(".act-svcdata-wrap");
    const navF = field.querySelector(".act-nav");
    const svcF = field.querySelector(".act-svc");
    const dataF = field.querySelector(".act-svcdata");
    sel.addEventListener("change", (e) => {
      e.stopPropagation();
      const act = e.target.value;
      if (navWrap) navWrap.style.display = act === "navigate" ? "block" : "none";
      if (svcWrap) svcWrap.style.display = act === "call-service" ? "block" : "none";
      if (dataWrap) dataWrap.style.display = act === "call-service" ? "block" : "none";
      onChange({ action: act });
    });
    if (navF) navF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "navigate", navigation_path: e.target.value }); });
    if (svcF) svcF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "call-service", service: e.target.value, service_data: actionCfg?.service_data }); });
    if (dataF) dataF.addEventListener("change", (e) => {
      e.stopPropagation();
      let data;
      try { data = e.target.value ? JSON.parse(e.target.value) : undefined; } catch { data = undefined; }
      onChange({ action: "call-service", service: actionCfg?.service || "", service_data: data });
    });
  }

  _wireSegToggle(root, selector, onChange) {
    const wrap = root.querySelector(selector);
    if (!wrap) return;
    wrap.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        wrap.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
        onChange(btn.getAttribute("data-value"));
      });
    });
  }

  _wireEntityPicker(root, selector, value, domains, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.hass = this._hass;
    if (domains) el.includeDomains = domains;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireIconPicker(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireTextField(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value ?? "";
    el.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); });
  }

  _wireColorField(root, selector, value, def, onChange) {
    const wrap = root.querySelector(selector);
    if (!wrap) return;
    const field = wrap.querySelector(".color-text");
    const picker = wrap.querySelector(".color-swatch");
    if (field) {
      field.value = value || "";
      field.addEventListener("change", (e) => {
        e.stopPropagation();
        const v = trimStr(e.target.value || "");
        onChange(v);
        if (picker) picker.value = parseColorToPickerHex(v || def);
      });
    }
    if (picker) {
      picker.value = parseColorToPickerHex(value || def);
      picker.addEventListener("change", (e) => {
        e.stopPropagation();
        const hex = e.target.value;
        onChange(hex);
        if (field) field.value = hex;
      });
    }
  }

  // ---- HTML builders ----

  _colorFieldHTML(cls, label, value, def) {
    return `
      <div class="color-field ${cls}">
        <label class="native-label">${escAttr(label)}</label>
        <div class="color-row">
          <input type="color" class="color-swatch" value="${parseColorToPickerHex(value || def)}">
          <input type="text" class="native-text color-text" placeholder="${escAttr(def)}" value="${escAttr(value)}">
        </div>
      </div>
    `;
  }

  _generalHTML(h, c) {
    const collapsible = c.collapsible === true;
    return `
      ${textFieldHTML("name-f", getTranslation(h, "name"), c.name)}
      <ha-icon-picker class="icon-f" label="${escAttr(getTranslation(h, "icon"))}" value="${escAttr(c.icon)}" style="width:100%;display:block;margin-bottom:8px;"></ha-icon-picker>
      <ha-formfield label="${escAttr(getTranslation(h, "collapsible"))}">
        <ha-switch class="collapsible-f"${collapsible ? " checked" : ""}></ha-switch>
      </ha-formfield>
      <div class="default-state-wrap" style="margin-top:8px;${collapsible ? "" : "display:none;"}">
        <label class="native-label">${escAttr(getTranslation(h, "default_state"))}</label>
        <select class="native-select default-state-f">
          <option value="expanded"${c.default_state !== "collapsed" ? " selected" : ""}>${escAttr(getTranslation(h, "state_expanded"))}</option>
          <option value="collapsed"${c.default_state === "collapsed" ? " selected" : ""}>${escAttr(getTranslation(h, "state_collapsed"))}</option>
        </select>
      </div>
    `;
  }

  _wireGeneral(root, h, c) {
    this._wireTextField(root, ".name-f", c.name, (v) => this._fire({ ...this._config, name: v }));
    this._wireIconPicker(root, ".icon-f", c.icon, (v) => this._fire({ ...this._config, icon: v }));
    const collapsibleSw = root.querySelector(".collapsible-f");
    if (collapsibleSw) {
      collapsibleSw.addEventListener("change", (e) => {
        e.stopPropagation();
        this._fire({ ...this._config, collapsible: e.target.checked }, true);
      });
    }
    const stateSel = root.querySelector(".default-state-f");
    if (stateSel) {
      stateSel.addEventListener("change", (e) => {
        e.stopPropagation();
        this._fire({ ...this._config, default_state: e.target.value });
      });
    }
  }

  _windowItemHTML(h, w, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(w.entity) || `${escAttr(getTranslation(h, "device"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="win-entity" label="${escAttr(getTranslation(h, "entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${segToggleHTML("win-type", getTranslation(h, "window_type"), [
          { value: "window", label: getTranslation(h, "type_window") },
          { value: "door", label: getTranslation(h, "type_door") },
          { value: "smoke", label: getTranslation(h, "type_smoke") },
          { value: "leak", label: getTranslation(h, "type_leak") }
        ], resolvedWindowType(w))}
        ${textFieldHTML("win-label", getTranslation(h, "label"), w.label)}
        ${actionFieldHTML(h, "win-tap", getTranslation(h, "tap_action"), w.tap_action)}
        ${actionFieldHTML(h, "win-hold", getTranslation(h, "hold_action"), w.hold_action)}
        <ha-entity-picker class="win-batt-entity" label="${escAttr(getTranslation(h, "battery_entity"))}" style="width:100%;display:block;margin:8px 0;"></ha-entity-picker>
        ${w.battery_entity ? `
          ${textFieldHTML("win-batt-label", getTranslation(h, "battery_label"), w.battery_label)}
          ${actionFieldHTML(h, "win-batt-tap", getTranslation(h, "tap_action"), w.battery_tap_action)}
          ${actionFieldHTML(h, "win-batt-hold", getTranslation(h, "hold_action"), w.battery_hold_action)}
        ` : ""}
      </div>
    `;
  }

  _windowsHTML(h, c) {
    const windows = Array.isArray(c.windows) ? c.windows : [];
    const items = windows.map((w, i) => this._windowItemHTML(h, w, i)).join("");
    const addDisabled = windows.length >= MAX_BINARY_DEVICES;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-window-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "device_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "device_max"))}</div>` : ""}
    `;
  }

  _wireWindows(root, h, c) {
    const windows = Array.isArray(c.windows) ? c.windows : [];
    // Scoped to this section only - other open sections (e.g. controls) have their own
    // .item-list, and an unscoped lookup here would silently wire into their boxes instead.
    const list = root.querySelector('[data-sec="windows"] .item-list');
    windows.forEach((w, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...(this._config?.windows || [])];
        arr[idx] = { ...arr[idx], ...patch };
        this._fire({ ...this._config, windows: arr }, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...(this._config?.windows || [])];
        arr.splice(idx, 1);
        const next = { ...this._config };
        if (arr.length) next.windows = arr; else delete next.windows;
        this._fire(next, true);
      });
      this._wireEntityPicker(box, ".win-entity", w.entity, ["binary_sensor", "sensor"], (v) => upd({ entity: v }, true));
      this._wireSegToggle(box, ".win-type", (v) => upd({ type: v }));
      this._wireTextField(box, ".win-label", w.label, (v) => upd({ label: v }));
      this._wireActionField(box, "win-tap", w.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "win-hold", w.hold_action, (v) => upd({ hold_action: v }));
      this._wireEntityPicker(box, ".win-batt-entity", w.battery_entity, ["sensor"], (v) => upd({ battery_entity: v }, true));
      if (w.battery_entity) {
        this._wireTextField(box, ".win-batt-label", w.battery_label, (v) => upd({ battery_label: v }));
        this._wireActionField(box, "win-batt-tap", w.battery_tap_action, (v) => upd({ battery_tap_action: v }));
        this._wireActionField(box, "win-batt-hold", w.battery_hold_action, (v) => upd({ battery_hold_action: v }));
      }
    });
    const addBtn = root.querySelector(".add-window-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (windows.length >= MAX_BINARY_DEVICES) return;
        this._openSections.windows = true;
        this._fire({ ...this._config, windows: [...windows, { entity: "" }] }, true);
      });
    }
  }

  _climateHTML(h, c) {
    const cl = c.climate || {};
    return `
      <ha-entity-picker class="cl-temp-entity" label="${escAttr(getTranslation(h, "temperature_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
      ${cl.temperature_entity ? `
        ${textFieldHTML("cl-temp-label", getTranslation(h, "label"), cl.temperature_label)}
        ${actionFieldHTML(h, "cl-temp-tap", getTranslation(h, "tap_action"), cl.temperature_tap_action)}
        ${actionFieldHTML(h, "cl-temp-hold", getTranslation(h, "hold_action"), cl.temperature_hold_action)}
      ` : ""}
      <ha-entity-picker class="cl-humid-entity" label="${escAttr(getTranslation(h, "humidity_entity"))}" style="width:100%;display:block;margin:8px 0;"></ha-entity-picker>
      ${cl.humidity_entity ? `
        ${textFieldHTML("cl-humid-label", getTranslation(h, "label"), cl.humidity_label)}
        ${actionFieldHTML(h, "cl-humid-tap", getTranslation(h, "tap_action"), cl.humidity_tap_action)}
        ${actionFieldHTML(h, "cl-humid-hold", getTranslation(h, "hold_action"), cl.humidity_hold_action)}
      ` : ""}
      <ha-entity-picker class="cl-batt-entity" label="${escAttr(getTranslation(h, "battery_entity"))}" style="width:100%;display:block;margin:8px 0;"></ha-entity-picker>
      ${cl.battery_entity ? `
        ${textFieldHTML("cl-batt-label", getTranslation(h, "battery_label"), cl.battery_label)}
        ${actionFieldHTML(h, "cl-batt-tap", getTranslation(h, "tap_action"), cl.battery_tap_action)}
        ${actionFieldHTML(h, "cl-batt-hold", getTranslation(h, "hold_action"), cl.battery_hold_action)}
      ` : ""}
    `;
  }

  _wireClimate(root, h, c) {
    const cl = c.climate || {};
    const upd = (patch, force = false) => this._fire({ ...this._config, climate: { ...(this._config?.climate || {}), ...patch } }, force);
    this._wireEntityPicker(root, ".cl-temp-entity", cl.temperature_entity, ["sensor"], (v) => upd({ temperature_entity: v }, true));
    if (cl.temperature_entity) {
      this._wireTextField(root, ".cl-temp-label", cl.temperature_label, (v) => upd({ temperature_label: v }));
      this._wireActionField(root, "cl-temp-tap", cl.temperature_tap_action, (v) => upd({ temperature_tap_action: v }));
      this._wireActionField(root, "cl-temp-hold", cl.temperature_hold_action, (v) => upd({ temperature_hold_action: v }));
    }
    this._wireEntityPicker(root, ".cl-humid-entity", cl.humidity_entity, ["sensor"], (v) => upd({ humidity_entity: v }, true));
    if (cl.humidity_entity) {
      this._wireTextField(root, ".cl-humid-label", cl.humidity_label, (v) => upd({ humidity_label: v }));
      this._wireActionField(root, "cl-humid-tap", cl.humidity_tap_action, (v) => upd({ humidity_tap_action: v }));
      this._wireActionField(root, "cl-humid-hold", cl.humidity_hold_action, (v) => upd({ humidity_hold_action: v }));
    }
    this._wireEntityPicker(root, ".cl-batt-entity", cl.battery_entity, ["sensor"], (v) => upd({ battery_entity: v }, true));
    if (cl.battery_entity) {
      this._wireTextField(root, ".cl-batt-label", cl.battery_label, (v) => upd({ battery_label: v }));
      this._wireActionField(root, "cl-batt-tap", cl.battery_tap_action, (v) => upd({ battery_tap_action: v }));
      this._wireActionField(root, "cl-batt-hold", cl.battery_hold_action, (v) => upd({ battery_hold_action: v }));
    }
  }

  _switchBatteryItemHTML(h, sb, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(sb.entity) || `${escAttr(getTranslation(h, "switch_battery"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="sb-entity" label="${escAttr(getTranslation(h, "entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${textFieldHTML("sb-label", getTranslation(h, "label"), sb.label)}
        ${actionFieldHTML(h, "sb-tap", getTranslation(h, "tap_action"), sb.tap_action)}
        ${actionFieldHTML(h, "sb-hold", getTranslation(h, "hold_action"), sb.hold_action)}
      </div>
    `;
  }

  _switchBatteriesHTML(h, c) {
    const switchBatteries = switchBatteriesOf(c);
    const items = switchBatteries.map((sb, i) => this._switchBatteryItemHTML(h, sb, i)).join("");
    const addDisabled = switchBatteries.length >= MAX_SWITCH_BATTERIES;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-switch-battery-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "switch_battery_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "switch_battery_max"))}</div>` : ""}
    `;
  }

  _wireSwitchBatteries(root, h, c) {
    const switchBatteries = switchBatteriesOf(c);
    // Scoped to this section only - see the identical comment in _wireWindows.
    const list = root.querySelector('[data-sec="switch_battery"] .item-list');
    switchBatteries.forEach((sb, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...switchBatteriesOf(this._config)];
        arr[idx] = { ...arr[idx], ...patch };
        // Once edited through this list UI, switch_batteries (plural) becomes the source of
        // truth - drop the legacy singular key so the two can't disagree.
        const next = { ...this._config, switch_batteries: arr };
        delete next.switch_battery;
        this._fire(next, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...switchBatteriesOf(this._config)];
        arr.splice(idx, 1);
        const next = { ...this._config };
        delete next.switch_battery;
        if (arr.length) next.switch_batteries = arr; else delete next.switch_batteries;
        this._fire(next, true);
      });
      this._wireEntityPicker(box, ".sb-entity", sb.entity, ["sensor"], (v) => upd({ entity: v }, true));
      this._wireTextField(box, ".sb-label", sb.label, (v) => upd({ label: v }));
      this._wireActionField(box, "sb-tap", sb.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "sb-hold", sb.hold_action, (v) => upd({ hold_action: v }));
    });
    const addBtn = root.querySelector(".add-switch-battery-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (switchBatteries.length >= MAX_SWITCH_BATTERIES) return;
        this._openSections.switch_battery = true;
        const next = { ...this._config, switch_batteries: [...switchBatteries, { entity: "" }] };
        delete next.switch_battery;
        this._fire(next, true);
      });
    }
  }

  _controlItemHTML(h, ctrl, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(ctrl.name) || escAttr(ctrl.entity) || `${escAttr(getTranslation(h, "controls"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="ctrl-entity" label="${escAttr(getTranslation(h, "entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${textFieldHTML("ctrl-name", getTranslation(h, "name"), ctrl.name)}
        <div class="row2">
          <ha-icon-picker class="ctrl-icon" label="${escAttr(getTranslation(h, "icon"))}" value="${escAttr(ctrl.icon)}"></ha-icon-picker>
          ${this._colorFieldHTML("ctrl-on-color", getTranslation(h, "on_color"), ctrl.on_color, "#ffa726")}
        </div>
        <ha-formfield label="${escAttr(getTranslation(h, "show_icon"))}">
          <ha-switch class="ctrl-show-icon"${ctrl.show_icon !== false ? " checked" : ""}></ha-switch>
        </ha-formfield>
        ${actionFieldHTML(h, "ctrl-tap", getTranslation(h, "tap_action"), ctrl.tap_action)}
        ${actionFieldHTML(h, "ctrl-hold", getTranslation(h, "hold_action"), ctrl.hold_action)}
        ${actionFieldHTML(h, "ctrl-dbl", getTranslation(h, "double_tap_action"), ctrl.double_tap_action)}
      </div>
    `;
  }

  _controlsHTML(h, c) {
    const controls = Array.isArray(c.controls) ? c.controls : [];
    const items = controls.map((ctrl, i) => this._controlItemHTML(h, ctrl, i)).join("");
    const addDisabled = controls.length >= 4;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-control-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "control_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "control_max"))}</div>` : ""}
    `;
  }

  _wireControls(root, h, c) {
    const controls = Array.isArray(c.controls) ? c.controls : [];
    // Scoped to this section only - see comment in _wireWindows. Without this, opening
    // "Windows" and "Buttons" at the same time made this grab the windows' .item-list
    // (first in DOM order), so button edits (name, entity, icon, actions...) silently did
    // nothing, and the delete button ended up wired twice - once correctly on the window
    // entry, once more here against the wrong array.
    const list = root.querySelector('[data-sec="controls"] .item-list');
    controls.forEach((ctrl, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...(this._config?.controls || [])];
        arr[idx] = { ...arr[idx], ...patch };
        this._fire({ ...this._config, controls: arr }, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...(this._config?.controls || [])];
        arr.splice(idx, 1);
        const next = { ...this._config };
        if (arr.length) next.controls = arr; else delete next.controls;
        this._fire(next, true);
      });
      this._wireEntityPicker(box, ".ctrl-entity", ctrl.entity, ["light", "switch", "fan", "cover"], (v) => upd({ entity: v }, true));
      this._wireTextField(box, ".ctrl-name", ctrl.name, (v) => upd({ name: v }));
      this._wireIconPicker(box, ".ctrl-icon", ctrl.icon, (v) => upd({ icon: v }));
      this._wireColorField(box, ".ctrl-on-color", ctrl.on_color, "#ffa726", (v) => upd({ on_color: v }));
      const showIconSw = box.querySelector(".ctrl-show-icon");
      if (showIconSw) showIconSw.addEventListener("change", (e) => { e.stopPropagation(); upd({ show_icon: e.target.checked }); });
      this._wireActionField(box, "ctrl-tap", ctrl.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "ctrl-hold", ctrl.hold_action, (v) => upd({ hold_action: v }));
      this._wireActionField(box, "ctrl-dbl", ctrl.double_tap_action, (v) => upd({ double_tap_action: v }));
    });
    const addBtn = root.querySelector(".add-control-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (controls.length >= 4) return;
        this._openSections.controls = true;
        this._fire({ ...this._config, controls: [...controls, { entity: "", tap_action: { action: "toggle" }, hold_action: { action: "more-info" } }] }, true);
      });
    }
  }

  _appearanceHTML(h, c) {
    const typeColors = Object.entries(WINDOW_TYPES).map(([type, cfg]) => `
      <div class="native-label" style="opacity:0.9;margin-bottom:2px;">${escAttr(getTranslation(h, cfg.labelKey))}</div>
      ${this._colorFieldHTML(`app-${type}-open-color`, getTranslation(h, cfg.openKey), c[`${type}_open_color`], cfg.defaultOpenColor)}
      ${this._colorFieldHTML(`app-${type}-closed-color`, getTranslation(h, cfg.closedKey), c[`${type}_closed_color`], cfg.defaultClosedColor)}
    `).join("");
    return `
      ${typeColors}
      ${textFieldHTML("app-threshold", getTranslation(h, "battery_warning_threshold"), c.battery_warning_threshold ?? "10", { type: "number" })}
      ${this._colorFieldHTML("app-warn-color", getTranslation(h, "battery_warning_color"), c.battery_warning_color, "#f44336")}
    `;
  }

  _wireAppearance(root, h, c) {
    Object.entries(WINDOW_TYPES).forEach(([type, cfg]) => {
      this._wireColorField(root, `.app-${type}-open-color`, c[`${type}_open_color`], cfg.defaultOpenColor, (v) => this._fire({ ...this._config, [`${type}_open_color`]: v }));
      this._wireColorField(root, `.app-${type}-closed-color`, c[`${type}_closed_color`], cfg.defaultClosedColor, (v) => this._fire({ ...this._config, [`${type}_closed_color`]: v }));
    });
    this._wireTextField(root, ".app-threshold", c.battery_warning_threshold ?? "10", (v) => {
      const num = v === "" ? 10 : Number(v);
      this._fire({ ...this._config, battery_warning_threshold: Number.isFinite(num) ? num : 10 });
    });
    this._wireColorField(root, ".app-warn-color", c.battery_warning_color, "#f44336", (v) => this._fire({ ...this._config, battery_warning_color: v }));
  }

  // ---- collapsible section shell ----

  _sectionHTML(id, titleKey, bodyHTML) {
    const h = this._hass;
    const open = !!this._openSections[id];
    return `
      <div class="sec${open ? " open" : ""}" data-sec="${id}">
        <div class="sec-head" data-sec-head="${id}">
          <span class="sec-title">${escAttr(getTranslation(h, titleKey))}</span>
          <ha-icon class="sec-chev" icon="mdi:chevron-right"></ha-icon>
        </div>
        <div class="sec-content"${open ? "" : " hidden"}>${open ? bodyHTML : ""}</div>
      </div>
    `;
  }

  // ---- main render ----

  _render() {
    if (!this._hass) return;
    this._rendered = true;
    const h = this._hass;
    const c = this._config || {};

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
        .sec { border: 1px solid var(--divider-color); border-radius: 8px; background: var(--secondary-background-color); padding: 6px 10px; }
        .sec-head { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; padding: 4px 0; }
        .sec-title { font-size: 13px; font-weight: 600; opacity: 0.85; }
        .sec-chev { --mdc-icon-size: 18px; opacity: 0.7; transition: transform 0.15s ease; }
        .sec.open .sec-chev { transform: rotate(90deg); }
        .sec-content { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
        .sec-content[hidden] { display: none; }
        .item-list { display: flex; flex-direction: column; gap: 8px; }
        .item-box { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; background: var(--card-background-color, var(--primary-background-color)); display: flex; flex-direction: column; gap: 8px; }
        .item-head { display: flex; align-items: center; justify-content: space-between; }
        .item-title { font-size: 12px; font-weight: 600; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .del-btn { background: none; border: 0; cursor: pointer; padding: 2px; display: inline-flex; color: #d32f2f; }
        .del-btn ha-icon, .del-btn svg { --mdc-icon-size: 18px; width: 18px; height: 18px; }
        .row2 { display: flex; gap: 8px; align-items: flex-start; }
        .row2 > ha-icon-picker { flex: 1; min-width: 0; }
        .row2 > .color-field { flex: 1; min-width: 0; margin: 0; }
        .hint { font-size: 11px; opacity: 0.6; }
        .native-label { display: block; font-size: 12px; font-weight: 600; opacity: 0.75; margin-bottom: 4px; }
        .native-select, .native-text { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; font: inherit; font-size: 14px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, var(--primary-background-color)); color: var(--primary-text-color); }
        .native-text:focus { outline: none; border-color: var(--primary-color, #ff9800); }
        textarea.native-text { resize: vertical; font-family: inherit; }
        .tf { margin-bottom: 8px; }
        .seg-toggle { display: flex; flex-wrap: wrap; gap: 6px; }
        .seg-btn { flex: 1 1 calc(50% - 6px); min-width: 80px; padding: 8px 6px; border: 1px solid var(--divider-color); border-radius: 6px; background: var(--card-background-color, var(--primary-background-color)); color: var(--primary-text-color); font: inherit; font-size: 12.5px; cursor: pointer; opacity: 0.65; text-align: center; }
        .seg-btn.active { background: var(--primary-color, #ff9800); border-color: var(--primary-color, #ff9800); color: var(--text-primary-color, #fff); opacity: 1; font-weight: 600; }
        .action-field { border-top: 1px dashed var(--divider-color); padding-top: 8px; margin-top: 2px; }
        .color-field { margin-bottom: 8px; }
        .color-row { display: flex; gap: 8px; align-items: center; }
        .color-swatch { width: 40px; height: 40px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 3px; cursor: pointer; flex-shrink: 0; background: var(--card-background-color, var(--primary-background-color)); box-sizing: border-box; }
        .add-btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 8px; border: none; background: var(--primary-color, #ff9800); color: var(--text-primary-color, #fff); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .add-btn:disabled { opacity: 0.5; cursor: default; }
      </style>
      <div class="wrap">
        ${this._sectionHTML("general", "general", this._generalHTML(h, c))}
        ${this._sectionHTML("windows", "binary_devices", this._windowsHTML(h, c))}
        ${this._sectionHTML("climate", "climate", this._climateHTML(h, c))}
        ${this._sectionHTML("switch_battery", "switch_batteries", this._switchBatteriesHTML(h, c))}
        ${this._sectionHTML("controls", "controls", this._controlsHTML(h, c))}
        ${this._sectionHTML("appearance", "appearance", this._appearanceHTML(h, c))}
      </div>
    `;

    this.shadowRoot.querySelectorAll("[data-sec-head]").forEach((head) => {
      head.addEventListener("click", () => {
        const id = head.getAttribute("data-sec-head");
        this._openSections[id] = !this._openSections[id];
        this._render();
      });
    });

    const wrap = this.shadowRoot.querySelector(".wrap");
    if (this._openSections.general) this._wireGeneral(wrap, h, c);
    if (this._openSections.windows) this._wireWindows(wrap, h, c);
    if (this._openSections.climate) this._wireClimate(wrap, h, c);
    if (this._openSections.switch_battery) this._wireSwitchBatteries(wrap, h, c);
    if (this._openSections.controls) this._wireControls(wrap, h, c);
    if (this._openSections.appearance) this._wireAppearance(wrap, h, c);
  }
}

// =============================================================================
// REGISTRATION
// =============================================================================
if (!customElements.get("ha-simcard")) customElements.define("ha-simcard", HaSimCard);
if (!customElements.get("ha-simcard-editor")) customElements.define("ha-simcard-editor", HaSimCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-simcard")) {
  window.customCards.push({
    type: "ha-simcard",
    name: "HA SimCard",
    description: "A compact, fully GUI-configurable room overview: windows, a temperature/humidity sensor, a switch battery, and up to 4 buttons.",
    preview: true
  });
}

})();

// =============================================================================
// Bundled below: HA Infra: Proxmox (ha-infra-proxmox)
// =============================================================================

(function () {
  "use strict";

const VERSION = "1.0.0";
const LOG_FLAG = `customCards_HaInfraProxmox_Logged_${VERSION}`;

if (!window[LOG_FLAG]) {
  console.info(
    `%c HA-INFRA-PROXMOX %c ${VERSION} `,
    "color: white; background: #2c3e50; font-weight: 700;",
    "color: white; background: #E57000; font-weight: 700;"
  );
  window[LOG_FLAG] = true;
}

// =============================================================================
// TRANSLATIONS
// =============================================================================
const TRANSLATIONS = {
  en: {
    name: "Name", icon: "Icon", entity: "Entity", label: "Label (optional)",
    general: "General",
    nodes: "Nodes", node_add: "Add Node", node_max: "Maximum of 10 nodes",
    status_entity: "Status Sensor", containers_entity: "Containers Running Sensor (optional)",
    vms_entity: "VMs Running Sensor (optional)", memory_entity: "Free Memory Sensor (optional)",
    temperature_entity: "Temperature Sensor (optional)",
    containers: "Containers / VMs", container_add: "Add Container/VM", container_max: "Maximum of 20 containers/VMs",
    appearance: "Appearance", running_color: "Running Color", stopped_color: "Stopped Color",
    tap_action: "Tap Action", hold_action: "Hold Action", double_tap_action: "Double Tap Action",
    act_more: "Details (Default)", act_toggle: "Toggle", act_navigate: "Navigate", act_call_service: "Action (service)", act_none: "None",
    nav_path: "Navigation Path", service: "Service (domain.service)", service_data: "Service Data (JSON)",
    show_icon: "Show Icon", delete: "Delete",
    empty_hint: "Nothing configured yet — add a node or a container/VM below.",
    state_running: "Running", state_stopped: "Stopped", state_unavailable: "Unavailable",
  },
  de: {
    name: "Name", icon: "Icon", entity: "Entität", label: "Bezeichnung (optional)",
    general: "Allgemein",
    nodes: "Nodes", node_add: "Node hinzufügen", node_max: "Maximal 10 Nodes",
    status_entity: "Status-Sensor", containers_entity: "Container-laufen-Sensor (optional)",
    vms_entity: "VMs-laufen-Sensor (optional)", memory_entity: "Freier-Speicher-Sensor (optional)",
    temperature_entity: "Temperatursensor (optional)",
    containers: "Container / VMs", container_add: "Container/VM hinzufügen", container_max: "Maximal 20 Container/VMs",
    appearance: "Darstellung", running_color: "Farbe (läuft)", stopped_color: "Farbe (gestoppt)",
    tap_action: "Antippen", hold_action: "Gedrückt halten", double_tap_action: "Doppelklick",
    act_more: "Details (Standard)", act_toggle: "Umschalten", act_navigate: "Navigieren", act_call_service: "Aktion (Service)", act_none: "Nichts",
    nav_path: "Navigationspfad", service: "Service (domain.service)", service_data: "Service-Daten (JSON)",
    show_icon: "Icon anzeigen", delete: "Löschen",
    empty_hint: "Noch nichts konfiguriert — füge unten einen Node oder ein Container/VM hinzu.",
    state_running: "In Betrieb", state_stopped: "Gestoppt", state_unavailable: "Nicht verfügbar",
  }
};

function getTranslation(hass, key) {
  const lang = String(hass?.language || "en").toLowerCase();
  const dict = lang.startsWith("de") ? TRANSLATIONS.de : TRANSLATIONS.en;
  return dict[key] ?? TRANSLATIONS.en[key] ?? key;
}

// =============================================================================
// HELPERS
// =============================================================================
const trimStr = (v) => (typeof v === "string" ? v.trim() : v);

const escAttr = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const isUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";

const RUNNING_STATES = new Set(["on", "running", "active", "home", "playing"]);
const isRunning = (st) => st && RUNNING_STATES.has(String(st.state).toLowerCase().trim());

function parseColorToPickerHex(color) {
  if (!color) return "#E57000";
  const c = String(color).trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [, r, g, b] = c;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const toHex = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return "#E57000";
}

function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function defaultContainerIcon(st) {
  return isRunning(st) ? "mdi:chip" : "mdi:chip";
}

// =============================================================================
// ACTION EXECUTION (same "hass-action" convention as HA's own Lovelace elements)
// =============================================================================
function fireAction(node, entity, actionCfg, type) {
  if (isUnavailable_entityGuard(node, entity)) return;
  const actionKey = `${type}_action`;
  let cfg = actionCfg && typeof actionCfg === "object" ? { ...actionCfg } : { action: "none" };
  if (!cfg.action) cfg.action = "none";
  if (cfg.action === "none") return;
  const eventDetail = {
    config: { entity: cfg.target?.entity_id || entity, [actionKey]: cfg },
    action: type
  };
  node.dispatchEvent(new CustomEvent("hass-action", { bubbles: true, composed: true, detail: eventDetail }));
}
function isUnavailable_entityGuard(node, entity) {
  const hass = node?._infraHass;
  if (!entity || !hass) return false;
  return isUnavailable(hass.states[entity]);
}

function attachGestures(node, hass, cfg) {
  node._infraHass = hass;
  const tap = cfg.tap_action || { action: "more-info" };
  const hold = cfg.hold_action || { action: "none" };
  const dbl = cfg.double_tap_action || { action: "none" };
  node.style.touchAction = "manipulation";
  node.style.cursor = "pointer";
  let holdTimer = null, tapTimer = null, held = false;
  const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
  node.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    held = false;
    if (hold.action !== "none") {
      holdTimer = setTimeout(() => {
        held = true;
        if (node.isConnected) fireAction(node, cfg.entity, hold, "hold");
      }, 500);
    }
  });
  node.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    cancelHold();
    if (held) { held = false; return; }
    if (dbl.action !== "none") {
      if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; fireAction(node, cfg.entity, dbl, "double_tap"); }
      else { tapTimer = setTimeout(() => { tapTimer = null; fireAction(node, cfg.entity, tap, "tap"); }, 250); }
    } else {
      fireAction(node, cfg.entity, tap, "tap");
    }
  });
  node.addEventListener("pointerleave", cancelHold);
  node.addEventListener("pointercancel", cancelHold);
  node.addEventListener("click", (e) => e.stopPropagation());
}

const MAX_NODES = 10;
const MAX_CONTAINERS = 20;

// =============================================================================
// CARD
// =============================================================================
class HaInfraProxmox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }

  setConfig(config) {
    this.config = config || {};
    this._lastSig = null;
    if (!this._rendered) this._render();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    if (!this._rendered) this._render();
    this._update();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this.config && !this._rendered) this._render();
  }

  getCardSize() {
    const c = this.config || {};
    let size = 1;
    if ((c.nodes || []).length) size += Math.ceil((c.nodes || []).length / 1.5);
    if ((c.containers || []).length) size += Math.ceil((c.containers || []).length / 3);
    return size;
  }

  static getConfigElement() { return document.createElement("ha-infra-proxmox-editor"); }
  static getStubConfig() {
    return { type: "custom:ha-infra-proxmox", name: "Proxmox", icon: "mdi:server", nodes: [], containers: [] };
  }

  _render() {
    this._rendered = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .header { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
        .header ha-icon { --mdc-icon-size: 22px; color: var(--paper-item-icon-color, var(--state-icon-color, var(--primary-text-color))); flex-shrink: 0; }
        .name { font-size: 15px; font-weight: 700; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .nodes { display: flex; flex-direction: column; gap: 5px; padding: 4px 14px 10px; }
        .node-row { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; cursor: pointer; background: rgba(128,128,128,0.08); flex-wrap: wrap; row-gap: 4px; }
        .node-row:hover { background: rgba(128,128,128,0.14); }
        .node-status-icon { --mdc-icon-size: 20px; flex-shrink: 0; color: var(--node-color, var(--secondary-text-color)); }
        .node-text { display: flex; flex-direction: column; min-width: 0; }
        .node-name { font-size: 13px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .node-state { font-size: 11px; color: var(--node-color, var(--secondary-text-color)); }
        .node-mini-stats { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0; }
        .node-mini-stat { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
        .node-mini-stat ha-icon { --mdc-icon-size: 14px; color: var(--secondary-text-color); }
        .containers { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 14px 14px; }
        .ctr-tile { flex: 1 1 30%; min-width: 96px; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 12px; cursor: pointer; background: rgba(128,128,128,0.08); transition: background 0.15s; box-sizing: border-box; }
        .ctr-tile:hover { background: rgba(128,128,128,0.14); }
        .ctr-tile ha-icon { --mdc-icon-size: 18px; color: var(--ctr-color, var(--secondary-text-color)); flex-shrink: 0; }
        .ctr-tile.unavailable { opacity: 0.5; cursor: default; }
        .ctr-txt { display: flex; flex-direction: column; min-width: 0; }
        .ctr-name { font-size: 12.5px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ctr-state { font-size: 10.5px; color: var(--ctr-color, var(--secondary-text-color)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .empty-hint { padding: 16px 14px 18px; font-size: 13px; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div id="header" class="header">
          <ha-icon id="icon"></ha-icon>
          <span id="name" class="name"></span>
        </div>
        <div id="nodes" class="nodes"></div>
        <div id="containers" class="containers"></div>
        <div id="empty-hint" class="empty-hint" hidden></div>
      </ha-card>
    `;
  }

  _stateSignature(h) {
    const c = this.config || {};
    const ids = new Set();
    (c.nodes || []).forEach((n) => {
      [n.status_entity, n.containers_entity, n.vms_entity, n.memory_entity, n.temperature_entity].forEach((e) => e && ids.add(e));
    });
    (c.containers || []).forEach((ctr) => { if (ctr.entity) ids.add(ctr.entity); });
    const parts = [];
    ids.forEach((id) => {
      const st = h.states[id];
      parts.push(`${id}:${st ? st.state + "|" + (st.attributes?.friendly_name || "") + "|" + (st.attributes?.unit_of_measurement ?? "") : "x"}`);
    });
    return parts.sort().join(",") + `|${h.language || ""}`;
  }

  _update() {
    const h = this._hass, c = this.config;
    if (!h || !c) return;
    const sig = this._stateSignature(h);
    if (sig === this._lastSig) return;
    this._lastSig = sig;

    const nameEl = this.shadowRoot.getElementById("name");
    const iconEl = this.shadowRoot.getElementById("icon");
    const nodesEl = this.shadowRoot.getElementById("nodes");
    const containersEl = this.shadowRoot.getElementById("containers");
    const emptyHint = this.shadowRoot.getElementById("empty-hint");

    nameEl.textContent = c.name || "Proxmox";
    iconEl.icon = c.icon || "mdi:server";

    const runColor = trimStr(c.running_color) || "#E57000";
    const stopColor = trimStr(c.stopped_color) || "var(--secondary-text-color)";

    // --- Nodes ---
    nodesEl.replaceChildren();
    (c.nodes || []).forEach((n) => {
      if (!n.status_entity) return;
      const st = h.states[n.status_entity];
      if (!st) return;
      const running = isRunning(st);
      const unavailable = isUnavailable(st);
      const color = unavailable ? "var(--secondary-text-color)" : (running ? runColor : stopColor);

      const row = document.createElement("div");
      row.className = "node-row";
      row.style.setProperty("--node-color", color);

      const icon = document.createElement("ha-icon");
      icon.className = "node-status-icon";
      icon.icon = running ? "mdi:play-circle" : "mdi:stop-circle-outline";
      row.appendChild(icon);

      const text = document.createElement("div");
      text.className = "node-text";
      const nameSpan = document.createElement("span");
      nameSpan.className = "node-name";
      nameSpan.textContent = trimStr(n.name) || st.attributes?.friendly_name || n.status_entity;
      text.appendChild(nameSpan);
      const stateSpan = document.createElement("span");
      stateSpan.className = "node-state";
      stateSpan.textContent = unavailable ? getTranslation(h, "state_unavailable") : getTranslation(h, running ? "state_running" : "state_stopped");
      text.appendChild(stateSpan);
      row.appendChild(text);

      const miniStats = document.createElement("div");
      miniStats.className = "node-mini-stats";
      const addMini = (entity, iconName) => {
        if (!entity) return;
        const est = h.states[entity];
        if (!est || isUnavailable(est)) return;
        const mini = document.createElement("span");
        mini.className = "node-mini-stat";
        const mIcon = document.createElement("ha-icon");
        mIcon.icon = iconName;
        mini.appendChild(mIcon);
        const unit = est.attributes?.unit_of_measurement ? ` ${est.attributes.unit_of_measurement}` : "";
        mini.appendChild(document.createTextNode(`${est.state}${unit}`));
        miniStats.appendChild(mini);
      };
      addMini(n.containers_entity, "mdi:package-variant-closed");
      addMini(n.vms_entity, "mdi:monitor");
      addMini(n.memory_entity, "mdi:memory");
      addMini(n.temperature_entity, "mdi:thermometer");
      if (miniStats.children.length) row.appendChild(miniStats);

      attachGestures(row, h, { entity: n.status_entity, tap_action: n.tap_action, hold_action: n.hold_action });
      nodesEl.appendChild(row);
    });

    // --- Containers / VMs ---
    containersEl.replaceChildren();
    (c.containers || []).slice(0, MAX_CONTAINERS).forEach((ctr) => {
      if (!ctr.entity) return;
      const st = h.states[ctr.entity];
      const unavailable = isUnavailable(st);
      const running = !unavailable && isRunning(st);
      const color = running ? runColor : stopColor;
      const tile = document.createElement("div");
      tile.className = `ctr-tile${unavailable ? " unavailable" : ""}`;
      tile.style.setProperty("--ctr-color", unavailable ? "var(--secondary-text-color)" : color);
      if (ctr.show_icon !== false) {
        const icon = document.createElement("ha-icon");
        icon.icon = trimStr(ctr.icon) || defaultContainerIcon(st);
        tile.appendChild(icon);
      }
      const txt = document.createElement("div");
      txt.className = "ctr-txt";
      const nameSpan = document.createElement("span");
      nameSpan.className = "ctr-name";
      nameSpan.textContent = trimStr(ctr.name) || st?.attributes?.friendly_name || ctr.entity;
      txt.appendChild(nameSpan);
      const stateSpan = document.createElement("span");
      stateSpan.className = "ctr-state";
      stateSpan.textContent = unavailable ? getTranslation(h, "state_unavailable") : getTranslation(h, running ? "state_running" : "state_stopped");
      txt.appendChild(stateSpan);
      tile.appendChild(txt);
      if (!unavailable) {
        attachGestures(tile, h, {
          entity: ctr.entity,
          tap_action: ctr.tap_action || { action: "toggle" },
          hold_action: ctr.hold_action || { action: "more-info" },
          double_tap_action: ctr.double_tap_action || { action: "none" }
        });
      }
      containersEl.appendChild(tile);
    });

    const hasAnything = (c.nodes || []).length > 0 || (c.containers || []).length > 0;
    emptyHint.hidden = hasAnything;
    if (!hasAnything) emptyHint.textContent = getTranslation(h, "empty_hint");
  }
}

// =============================================================================
// EDITOR
// =============================================================================
const DELETE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm2 6h2v9h-2V9zm-4 0h2v9H7V9zm8 0h2v9h-2V9z"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:6px;vertical-align:-3px"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>';

const ACTION_OPTIONS = [
  { value: "more-info", key: "act_more" },
  { value: "toggle", key: "act_toggle" },
  { value: "navigate", key: "act_navigate" },
  { value: "call-service", key: "act_call_service" },
  { value: "none", key: "act_none" }
];

function textFieldHTML(cls, label, value, opts = {}) {
  const { type = "text", extraStyle = "" } = opts;
  return `
    <div class="tf" style="${extraStyle}">
      <label class="native-label">${escAttr(label)}</label>
      <input type="${escAttr(type)}" class="native-text ${cls}" value="${escAttr(value)}">
    </div>
  `;
}

function actionFieldHTML(h, cls, labelText, actionCfg) {
  const act = actionCfg?.action || "none";
  const opts = ACTION_OPTIONS.map((o) => `<option value="${o.value}"${act === o.value ? " selected" : ""}>${escAttr(getTranslation(h, o.key))}</option>`).join("");
  return `
    <div class="action-field ${cls}">
      <label class="native-label">${escAttr(labelText)}</label>
      <select class="native-select act-type">${opts}</select>
      <div class="tf act-nav-wrap" style="display:${act === "navigate" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "nav_path"))}</label>
        <input type="text" class="native-text act-nav" value="${escAttr(actionCfg?.navigation_path)}">
      </div>
      <div class="tf act-svc-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service"))}</label>
        <input type="text" class="native-text act-svc" value="${escAttr(actionCfg?.service)}">
      </div>
      <div class="tf act-svcdata-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service_data"))}</label>
        <textarea class="native-text act-svcdata" rows="2">${escAttr(actionCfg?.service_data ? JSON.stringify(actionCfg.service_data) : "")}</textarea>
      </div>
    </div>
  `;
}

class HaInfraProxmoxEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSections = { general: true, nodes: false, containers: false, appearance: false };
  }

  setConfig(config) {
    const incoming = config || {};
    if (this._rendered && this._lastFiredSig && JSON.stringify(incoming) === this._lastFiredSig) {
      this._config = incoming;
      return;
    }
    this._config = incoming;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._render();
      return;
    }
    this.shadowRoot?.querySelectorAll("ha-entity-picker, ha-icon-picker").forEach((el) => {
      el.hass = hass;
    });
  }

  get hass() { return this._hass; }

  _fire(next, forceRerender = false) {
    this._config = next;
    this._lastFiredSig = forceRerender ? null : JSON.stringify(next);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
  }

  _wireActionField(root, cls, actionCfg, onChange) {
    const field = root.querySelector(`.action-field.${cls}`);
    if (!field) return;
    const sel = field.querySelector(".act-type");
    const navWrap = field.querySelector(".act-nav-wrap");
    const svcWrap = field.querySelector(".act-svc-wrap");
    const dataWrap = field.querySelector(".act-svcdata-wrap");
    const navF = field.querySelector(".act-nav");
    const svcF = field.querySelector(".act-svc");
    const dataF = field.querySelector(".act-svcdata");
    sel.addEventListener("change", (e) => {
      e.stopPropagation();
      const act = e.target.value;
      if (navWrap) navWrap.style.display = act === "navigate" ? "block" : "none";
      if (svcWrap) svcWrap.style.display = act === "call-service" ? "block" : "none";
      if (dataWrap) dataWrap.style.display = act === "call-service" ? "block" : "none";
      onChange({ action: act });
    });
    if (navF) navF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "navigate", navigation_path: e.target.value }); });
    if (svcF) svcF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "call-service", service: e.target.value, service_data: actionCfg?.service_data }); });
    if (dataF) dataF.addEventListener("change", (e) => {
      e.stopPropagation();
      let data;
      try { data = e.target.value ? JSON.parse(e.target.value) : undefined; } catch { data = undefined; }
      onChange({ action: "call-service", service: actionCfg?.service || "", service_data: data });
    });
  }

  _wireEntityPicker(root, selector, value, domains, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.hass = this._hass;
    if (domains) el.includeDomains = domains;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireIconPicker(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireTextField(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value ?? "";
    el.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); });
  }

  _wireColorField(root, selector, value, def, onChange) {
    const wrap = root.querySelector(selector);
    if (!wrap) return;
    const field = wrap.querySelector(".color-text");
    const picker = wrap.querySelector(".color-swatch");
    if (field) {
      field.value = value || "";
      field.addEventListener("change", (e) => {
        e.stopPropagation();
        const v = trimStr(e.target.value || "");
        onChange(v);
        if (picker) picker.value = parseColorToPickerHex(v || def);
      });
    }
    if (picker) {
      picker.value = parseColorToPickerHex(value || def);
      picker.addEventListener("change", (e) => {
        e.stopPropagation();
        const hex = e.target.value;
        onChange(hex);
        if (field) field.value = hex;
      });
    }
  }

  _colorFieldHTML(cls, label, value, def) {
    return `
      <div class="color-field ${cls}">
        <label class="native-label">${escAttr(label)}</label>
        <div class="color-row">
          <input type="color" class="color-swatch" value="${parseColorToPickerHex(value || def)}">
          <input type="text" class="native-text color-text" placeholder="${escAttr(def)}" value="${escAttr(value)}">
        </div>
      </div>
    `;
  }

  _generalHTML(h, c) {
    return `
      ${textFieldHTML("name-f", getTranslation(h, "name"), c.name)}
      <ha-icon-picker class="icon-f" label="${escAttr(getTranslation(h, "icon"))}" value="${escAttr(c.icon)}" style="width:100%;display:block;margin-bottom:8px;"></ha-icon-picker>
    `;
  }

  _wireGeneral(root, h, c) {
    this._wireTextField(root, ".name-f", c.name, (v) => this._fire({ ...this._config, name: v }));
    this._wireIconPicker(root, ".icon-f", c.icon, (v) => this._fire({ ...this._config, icon: v }));
  }

  _nodeItemHTML(h, n, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(n.name) || `${escAttr(getTranslation(h, "nodes"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        ${textFieldHTML("node-name", getTranslation(h, "name"), n.name)}
        <ha-entity-picker class="node-status" label="${escAttr(getTranslation(h, "status_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        <ha-entity-picker class="node-containers" label="${escAttr(getTranslation(h, "containers_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        <ha-entity-picker class="node-vms" label="${escAttr(getTranslation(h, "vms_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        <ha-entity-picker class="node-memory" label="${escAttr(getTranslation(h, "memory_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        <ha-entity-picker class="node-temp" label="${escAttr(getTranslation(h, "temperature_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${actionFieldHTML(h, "node-tap", getTranslation(h, "tap_action"), n.tap_action)}
        ${actionFieldHTML(h, "node-hold", getTranslation(h, "hold_action"), n.hold_action)}
      </div>
    `;
  }

  _nodesHTML(h, c) {
    const nodes = Array.isArray(c.nodes) ? c.nodes : [];
    const items = nodes.map((n, i) => this._nodeItemHTML(h, n, i)).join("");
    const addDisabled = nodes.length >= MAX_NODES;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-node-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "node_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "node_max"))}</div>` : ""}
    `;
  }

  _wireNodes(root, h, c) {
    const nodes = Array.isArray(c.nodes) ? c.nodes : [];
    const list = root.querySelector('[data-sec="nodes"] .item-list');
    nodes.forEach((n, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...(this._config?.nodes || [])];
        arr[idx] = { ...arr[idx], ...patch };
        this._fire({ ...this._config, nodes: arr }, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...(this._config?.nodes || [])];
        arr.splice(idx, 1);
        const next = { ...this._config };
        if (arr.length) next.nodes = arr; else delete next.nodes;
        this._fire(next, true);
      });
      this._wireTextField(box, ".node-name", n.name, (v) => upd({ name: v }, true));
      this._wireEntityPicker(box, ".node-status", n.status_entity, ["binary_sensor", "sensor"], (v) => upd({ status_entity: v }, true));
      this._wireEntityPicker(box, ".node-containers", n.containers_entity, ["sensor"], (v) => upd({ containers_entity: v }));
      this._wireEntityPicker(box, ".node-vms", n.vms_entity, ["sensor"], (v) => upd({ vms_entity: v }));
      this._wireEntityPicker(box, ".node-memory", n.memory_entity, ["sensor"], (v) => upd({ memory_entity: v }));
      this._wireEntityPicker(box, ".node-temp", n.temperature_entity, ["sensor"], (v) => upd({ temperature_entity: v }));
      this._wireActionField(box, "node-tap", n.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "node-hold", n.hold_action, (v) => upd({ hold_action: v }));
    });
    const addBtn = root.querySelector(".add-node-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (nodes.length >= MAX_NODES) return;
        this._openSections.nodes = true;
        this._fire({ ...this._config, nodes: [...nodes, { status_entity: "" }] }, true);
      });
    }
  }

  _containerItemHTML(h, ctr, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(ctr.name) || escAttr(ctr.entity) || `${escAttr(getTranslation(h, "containers"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="ctr-entity" label="${escAttr(getTranslation(h, "entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${textFieldHTML("ctr-name", getTranslation(h, "name"), ctr.name)}
        <ha-icon-picker class="ctr-icon" label="${escAttr(getTranslation(h, "icon"))}" value="${escAttr(ctr.icon)}" style="width:100%;display:block;margin-bottom:8px;"></ha-icon-picker>
        <ha-formfield label="${escAttr(getTranslation(h, "show_icon"))}">
          <ha-switch class="ctr-show-icon"${ctr.show_icon !== false ? " checked" : ""}></ha-switch>
        </ha-formfield>
        ${actionFieldHTML(h, "ctr-tap", getTranslation(h, "tap_action"), ctr.tap_action)}
        ${actionFieldHTML(h, "ctr-hold", getTranslation(h, "hold_action"), ctr.hold_action)}
        ${actionFieldHTML(h, "ctr-dbl", getTranslation(h, "double_tap_action"), ctr.double_tap_action)}
      </div>
    `;
  }

  _containersHTML(h, c) {
    const containers = Array.isArray(c.containers) ? c.containers : [];
    const items = containers.map((ctr, i) => this._containerItemHTML(h, ctr, i)).join("");
    const addDisabled = containers.length >= MAX_CONTAINERS;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-container-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "container_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "container_max"))}</div>` : ""}
    `;
  }

  _wireContainers(root, h, c) {
    const containers = Array.isArray(c.containers) ? c.containers : [];
    const list = root.querySelector('[data-sec="containers"] .item-list');
    containers.forEach((ctr, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...(this._config?.containers || [])];
        arr[idx] = { ...arr[idx], ...patch };
        this._fire({ ...this._config, containers: arr }, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...(this._config?.containers || [])];
        arr.splice(idx, 1);
        const next = { ...this._config };
        if (arr.length) next.containers = arr; else delete next.containers;
        this._fire(next, true);
      });
      this._wireEntityPicker(box, ".ctr-entity", ctr.entity, ["switch", "binary_sensor", "sensor"], (v) => upd({ entity: v }, true));
      this._wireTextField(box, ".ctr-name", ctr.name, (v) => upd({ name: v }));
      this._wireIconPicker(box, ".ctr-icon", ctr.icon, (v) => upd({ icon: v }));
      const showIconSw = box.querySelector(".ctr-show-icon");
      if (showIconSw) showIconSw.addEventListener("change", (e) => { e.stopPropagation(); upd({ show_icon: e.target.checked }); });
      this._wireActionField(box, "ctr-tap", ctr.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "ctr-hold", ctr.hold_action, (v) => upd({ hold_action: v }));
      this._wireActionField(box, "ctr-dbl", ctr.double_tap_action, (v) => upd({ double_tap_action: v }));
    });
    const addBtn = root.querySelector(".add-container-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (containers.length >= MAX_CONTAINERS) return;
        this._openSections.containers = true;
        this._fire({ ...this._config, containers: [...containers, { entity: "", tap_action: { action: "toggle" }, hold_action: { action: "more-info" } }] }, true);
      });
    }
  }

  _appearanceHTML(h, c) {
    return `
      ${this._colorFieldHTML("app-run-color", getTranslation(h, "running_color"), c.running_color, "#E57000")}
      ${this._colorFieldHTML("app-stop-color", getTranslation(h, "stopped_color"), c.stopped_color, "#9b9b9b")}
    `;
  }

  _wireAppearance(root, h, c) {
    this._wireColorField(root, ".app-run-color", c.running_color, "#E57000", (v) => this._fire({ ...this._config, running_color: v }));
    this._wireColorField(root, ".app-stop-color", c.stopped_color, "#9b9b9b", (v) => this._fire({ ...this._config, stopped_color: v }));
  }

  _sectionHTML(id, titleKey, bodyHTML) {
    const h = this._hass;
    const open = !!this._openSections[id];
    return `
      <div class="sec${open ? " open" : ""}" data-sec="${id}">
        <div class="sec-head" data-sec-head="${id}">
          <span class="sec-title">${escAttr(getTranslation(h, titleKey))}</span>
          <ha-icon class="sec-chev" icon="mdi:chevron-right"></ha-icon>
        </div>
        <div class="sec-content"${open ? "" : " hidden"}>${open ? bodyHTML : ""}</div>
      </div>
    `;
  }

  _render() {
    if (!this._hass) return;
    this._rendered = true;
    const h = this._hass;
    const c = this._config || {};

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
        .sec { border: 1px solid var(--divider-color); border-radius: 8px; background: var(--secondary-background-color); padding: 6px 10px; }
        .sec-head { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; padding: 4px 0; }
        .sec-title { font-size: 13px; font-weight: 600; opacity: 0.85; }
        .sec-chev { --mdc-icon-size: 18px; opacity: 0.7; transition: transform 0.15s ease; }
        .sec.open .sec-chev { transform: rotate(90deg); }
        .sec-content { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
        .sec-content[hidden] { display: none; }
        .item-list { display: flex; flex-direction: column; gap: 8px; }
        .item-box { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; background: var(--card-background-color, var(--primary-background-color)); display: flex; flex-direction: column; gap: 8px; }
        .item-head { display: flex; align-items: center; justify-content: space-between; }
        .item-title { font-size: 12px; font-weight: 600; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .del-btn { background: none; border: 0; cursor: pointer; padding: 2px; display: inline-flex; color: #d32f2f; }
        .del-btn ha-icon, .del-btn svg { --mdc-icon-size: 18px; width: 18px; height: 18px; }
        .hint { font-size: 11px; opacity: 0.6; }
        .native-label { display: block; font-size: 12px; font-weight: 600; opacity: 0.75; margin-bottom: 4px; }
        .native-select, .native-text { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; font: inherit; font-size: 14px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, var(--primary-background-color)); color: var(--primary-text-color); }
        .native-text:focus { outline: none; border-color: var(--primary-color, #E57000); }
        textarea.native-text { resize: vertical; font-family: inherit; }
        .tf { margin-bottom: 8px; }
        .action-field { border-top: 1px dashed var(--divider-color); padding-top: 8px; margin-top: 2px; }
        .color-field { margin-bottom: 8px; }
        .color-row { display: flex; gap: 8px; align-items: center; }
        .color-swatch { width: 40px; height: 40px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 3px; cursor: pointer; flex-shrink: 0; background: var(--card-background-color, var(--primary-background-color)); box-sizing: border-box; }
        .add-btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 8px; border: none; background: var(--primary-color, #E57000); color: var(--text-primary-color, #fff); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .add-btn:disabled { opacity: 0.5; cursor: default; }
      </style>
      <div class="wrap">
        ${this._sectionHTML("general", "general", this._generalHTML(h, c))}
        ${this._sectionHTML("nodes", "nodes", this._nodesHTML(h, c))}
        ${this._sectionHTML("containers", "containers", this._containersHTML(h, c))}
        ${this._sectionHTML("appearance", "appearance", this._appearanceHTML(h, c))}
      </div>
    `;

    this.shadowRoot.querySelectorAll("[data-sec-head]").forEach((head) => {
      head.addEventListener("click", () => {
        const id = head.getAttribute("data-sec-head");
        this._openSections[id] = !this._openSections[id];
        this._render();
      });
    });

    const wrap = this.shadowRoot.querySelector(".wrap");
    if (this._openSections.general) this._wireGeneral(wrap, h, c);
    if (this._openSections.nodes) this._wireNodes(wrap, h, c);
    if (this._openSections.containers) this._wireContainers(wrap, h, c);
    if (this._openSections.appearance) this._wireAppearance(wrap, h, c);
  }
}

// =============================================================================
// REGISTRATION
// =============================================================================
if (!customElements.get("ha-infra-proxmox")) customElements.define("ha-infra-proxmox", HaInfraProxmox);
if (!customElements.get("ha-infra-proxmox-editor")) customElements.define("ha-infra-proxmox-editor", HaInfraProxmoxEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-infra-proxmox")) {
  window.customCards.push({
    type: "ha-infra-proxmox",
    name: "HA Infra: Proxmox",
    description: "A compact Proxmox overview card: nodes (status/containers/VMs/memory/temperature) and a grid of container/VM toggle tiles.",
    preview: true
  });
}

})();

// =============================================================================
// Bundled below: HA Infra: NAS (ha-infra-nas)
// =============================================================================

(function () {
  "use strict";

const VERSION = "1.0.0";
const LOG_FLAG = `customCards_HaInfraNas_Logged_${VERSION}`;

if (!window[LOG_FLAG]) {
  console.info(
    `%c HA-INFRA-NAS %c ${VERSION} `,
    "color: white; background: #2c3e50; font-weight: 700;",
    "color: white; background: #1976d2; font-weight: 700;"
  );
  window[LOG_FLAG] = true;
}

// =============================================================================
// TRANSLATIONS
// =============================================================================
const TRANSLATIONS = {
  en: {
    name: "Name", icon: "Icon", entity: "Entity", label: "Label (optional)",
    general: "General",
    system_temp: "System Temperature", system_temp_entity: "System Temperature Sensor (optional)",
    drives: "Drives", drive_add: "Add Drive", drive_max: "Maximum of 12 drives",
    appearance: "Appearance",
    temperature_warning_threshold: "Temperature Warning Threshold (°)", temperature_warning_color: "Temperature Warning Color",
    tap_action: "Tap Action", hold_action: "Hold Action",
    act_more: "Details (Default)", act_toggle: "Toggle", act_navigate: "Navigate", act_call_service: "Action (service)", act_none: "None",
    nav_path: "Navigation Path", service: "Service (domain.service)", service_data: "Service Data (JSON)",
    delete: "Delete",
    empty_hint: "Nothing configured yet — add a drive below.",
    state_unavailable: "Unavailable",
  },
  de: {
    name: "Name", icon: "Icon", entity: "Entität", label: "Bezeichnung (optional)",
    general: "Allgemein",
    system_temp: "Systemtemperatur", system_temp_entity: "Systemtemperatur-Sensor (optional)",
    drives: "Laufwerke", drive_add: "Laufwerk hinzufügen", drive_max: "Maximal 12 Laufwerke",
    appearance: "Darstellung",
    temperature_warning_threshold: "Temperaturwarnung Schwelle (°)", temperature_warning_color: "Temperaturwarnung Farbe",
    tap_action: "Antippen", hold_action: "Gedrückt halten",
    act_more: "Details (Standard)", act_toggle: "Umschalten", act_navigate: "Navigieren", act_call_service: "Aktion (Service)", act_none: "Nichts",
    nav_path: "Navigationspfad", service: "Service (domain.service)", service_data: "Service-Daten (JSON)",
    delete: "Löschen",
    empty_hint: "Noch nichts konfiguriert — füge unten ein Laufwerk hinzu.",
    state_unavailable: "Nicht verfügbar",
  }
};

function getTranslation(hass, key) {
  const lang = String(hass?.language || "en").toLowerCase();
  const dict = lang.startsWith("de") ? TRANSLATIONS.de : TRANSLATIONS.en;
  return dict[key] ?? TRANSLATIONS.en[key] ?? key;
}

// =============================================================================
// HELPERS
// =============================================================================
const trimStr = (v) => (typeof v === "string" ? v.trim() : v);

const escAttr = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const isUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";

function parseColorToPickerHex(color) {
  if (!color) return "#f44336";
  const c = String(color).trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    const [, r, g, b] = c;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const toHex = (n) => Number(n).toString(16).padStart(2, "0");
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return "#f44336";
}

// =============================================================================
// ACTION EXECUTION
// =============================================================================
function fireAction(node, entity, actionCfg, type) {
  if (isUnavailable_entityGuard(node, entity)) return;
  const actionKey = `${type}_action`;
  let cfg = actionCfg && typeof actionCfg === "object" ? { ...actionCfg } : { action: "none" };
  if (!cfg.action) cfg.action = "none";
  if (cfg.action === "none") return;
  const eventDetail = {
    config: { entity: cfg.target?.entity_id || entity, [actionKey]: cfg },
    action: type
  };
  node.dispatchEvent(new CustomEvent("hass-action", { bubbles: true, composed: true, detail: eventDetail }));
}
function isUnavailable_entityGuard(node, entity) {
  const hass = node?._infraHass;
  if (!entity || !hass) return false;
  return isUnavailable(hass.states[entity]);
}

function attachGestures(node, hass, cfg) {
  node._infraHass = hass;
  const tap = cfg.tap_action || { action: "more-info" };
  const hold = cfg.hold_action || { action: "none" };
  node.style.touchAction = "manipulation";
  node.style.cursor = "pointer";
  let holdTimer = null, held = false;
  const cancelHold = () => { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } };
  node.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    held = false;
    if (hold.action !== "none") {
      holdTimer = setTimeout(() => {
        held = true;
        if (node.isConnected) fireAction(node, cfg.entity, hold, "hold");
      }, 500);
    }
  });
  node.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    cancelHold();
    if (held) { held = false; return; }
    fireAction(node, cfg.entity, tap, "tap");
  });
  node.addEventListener("pointerleave", cancelHold);
  node.addEventListener("pointercancel", cancelHold);
  node.addEventListener("click", (e) => e.stopPropagation());
}

const MAX_DRIVES = 12;

// =============================================================================
// CARD
// =============================================================================
class HaInfraNas extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }

  setConfig(config) {
    this.config = config || {};
    this._lastSig = null;
    if (!this._rendered) this._render();
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    if (!this._rendered) this._render();
    this._update();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this.config && !this._rendered) this._render();
  }

  getCardSize() {
    const c = this.config || {};
    let size = 1;
    if ((c.drives || []).length) size += Math.ceil((c.drives || []).length / 3);
    return size;
  }

  static getConfigElement() { return document.createElement("ha-infra-nas-editor"); }
  static getStubConfig() {
    return { type: "custom:ha-infra-nas", name: "NAS", icon: "mdi:nas", drives: [] };
  }

  _render() {
    this._rendered = true;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }
        .header { display: flex; align-items: center; gap: 10px; padding: 12px 14px 10px; }
        .header ha-icon { --mdc-icon-size: 22px; color: var(--paper-item-icon-color, var(--state-icon-color, var(--primary-text-color))); flex-shrink: 0; }
        .title-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .name { font-size: 15px; font-weight: 700; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .system-temp { font-size: 12px; color: var(--secondary-text-color); }
        .system-temp .val { font-weight: 700; color: var(--sys-color, var(--primary-text-color)); }
        .drives { display: flex; flex-direction: column; padding: 0 14px 12px; }
        .drive-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--divider-color); cursor: pointer; }
        .drive-row:last-child { border-bottom: none; }
        .drive-row ha-icon { --mdc-icon-size: 16px; color: var(--drive-color, var(--secondary-text-color)); flex-shrink: 0; }
        .drive-label { flex: 1; min-width: 0; font-size: 12.5px; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .drive-value { font-size: 12.5px; font-weight: 700; color: var(--drive-color, var(--primary-text-color)); font-variant-numeric: tabular-nums; }
        .empty-hint { padding: 16px 14px 18px; font-size: 13px; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div id="header" class="header">
          <ha-icon id="icon"></ha-icon>
          <div class="title-col">
            <span id="name" class="name"></span>
            <div id="system-temp" class="system-temp" hidden></div>
          </div>
        </div>
        <div id="drives" class="drives"></div>
        <div id="empty-hint" class="empty-hint" hidden></div>
      </ha-card>
    `;
  }

  _stateSignature(h) {
    const c = this.config || {};
    const ids = new Set();
    if (c.system_temperature_entity) ids.add(c.system_temperature_entity);
    (c.drives || []).forEach((d) => { if (d.entity) ids.add(d.entity); });
    const parts = [];
    ids.forEach((id) => {
      const st = h.states[id];
      parts.push(`${id}:${st ? st.state + "|" + (st.attributes?.friendly_name || "") + "|" + (st.attributes?.unit_of_measurement ?? "") : "x"}`);
    });
    return parts.sort().join(",") + `|${h.language || ""}`;
  }

  _update() {
    const h = this._hass, c = this.config;
    if (!h || !c) return;
    const sig = this._stateSignature(h);
    if (sig === this._lastSig) return;
    this._lastSig = sig;

    const nameEl = this.shadowRoot.getElementById("name");
    const iconEl = this.shadowRoot.getElementById("icon");
    const sysTempEl = this.shadowRoot.getElementById("system-temp");
    const drivesEl = this.shadowRoot.getElementById("drives");
    const emptyHint = this.shadowRoot.getElementById("empty-hint");

    nameEl.textContent = c.name || "NAS";
    iconEl.icon = c.icon || "mdi:nas";

    const threshold = Number.isFinite(Number(c.temperature_warning_threshold)) ? Number(c.temperature_warning_threshold) : 45;
    const warnColor = trimStr(c.temperature_warning_color) || "#f44336";

    // --- System temperature (in the header) ---
    sysTempEl.replaceChildren();
    sysTempEl.onclick = null;
    const sysSt = c.system_temperature_entity ? h.states[c.system_temperature_entity] : null;
    if (sysSt && !isUnavailable(sysSt) && sysSt.state !== "" && !isNaN(parseFloat(sysSt.state))) {
      sysTempEl.hidden = false;
      const num = parseFloat(sysSt.state);
      const unit = sysSt.attributes?.unit_of_measurement || "°C";
      const isWarn = num >= threshold;
      const label = trimStr(c.system_temperature_label) || getTranslation(h, "system_temp");
      const labelSpan = document.createElement("span");
      labelSpan.textContent = `${label}: `;
      sysTempEl.appendChild(labelSpan);
      const valSpan = document.createElement("span");
      valSpan.className = "val";
      valSpan.textContent = `${sysSt.state}${unit}`;
      if (isWarn) valSpan.style.setProperty("--sys-color", warnColor);
      sysTempEl.appendChild(valSpan);
      attachGestures(sysTempEl, h, { entity: c.system_temperature_entity, tap_action: c.system_temperature_tap_action, hold_action: c.system_temperature_hold_action });
    } else {
      sysTempEl.hidden = true;
    }

    // --- Drives ---
    drivesEl.replaceChildren();
    (c.drives || []).slice(0, MAX_DRIVES).forEach((d) => {
      if (!d.entity) return;
      const st = h.states[d.entity];
      if (!st || isUnavailable(st) || st.state === "" || isNaN(parseFloat(st.state))) return;
      const num = parseFloat(st.state);
      const unit = st.attributes?.unit_of_measurement || "°C";
      const isWarn = num >= threshold;
      const color = isWarn ? warnColor : "var(--secondary-text-color)";

      const row = document.createElement("div");
      row.className = "drive-row";
      row.style.setProperty("--drive-color", color);
      const icon = document.createElement("ha-icon");
      icon.icon = "mdi:thermometer";
      row.appendChild(icon);
      const label = document.createElement("span");
      label.className = "drive-label";
      label.textContent = trimStr(d.label) || st.attributes?.friendly_name || d.entity;
      row.appendChild(label);
      const val = document.createElement("span");
      val.className = "drive-value";
      val.textContent = `${st.state}${unit}`;
      row.appendChild(val);
      attachGestures(row, h, { entity: d.entity, tap_action: d.tap_action, hold_action: d.hold_action });
      drivesEl.appendChild(row);
    });

    const hasAnything = !sysTempEl.hidden || (c.drives || []).length > 0;
    emptyHint.hidden = hasAnything;
    if (!hasAnything) emptyHint.textContent = getTranslation(h, "empty_hint");
  }
}

// =============================================================================
// EDITOR
// =============================================================================
const DELETE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm2 6h2v9h-2V9zm-4 0h2v9H7V9zm8 0h2v9h-2V9z"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right:6px;vertical-align:-3px"><path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>';

const ACTION_OPTIONS = [
  { value: "more-info", key: "act_more" },
  { value: "toggle", key: "act_toggle" },
  { value: "navigate", key: "act_navigate" },
  { value: "call-service", key: "act_call_service" },
  { value: "none", key: "act_none" }
];

function textFieldHTML(cls, label, value, opts = {}) {
  const { type = "text", extraStyle = "" } = opts;
  return `
    <div class="tf" style="${extraStyle}">
      <label class="native-label">${escAttr(label)}</label>
      <input type="${escAttr(type)}" class="native-text ${cls}" value="${escAttr(value)}">
    </div>
  `;
}

function actionFieldHTML(h, cls, labelText, actionCfg) {
  const act = actionCfg?.action || "none";
  const opts = ACTION_OPTIONS.map((o) => `<option value="${o.value}"${act === o.value ? " selected" : ""}>${escAttr(getTranslation(h, o.key))}</option>`).join("");
  return `
    <div class="action-field ${cls}">
      <label class="native-label">${escAttr(labelText)}</label>
      <select class="native-select act-type">${opts}</select>
      <div class="tf act-nav-wrap" style="display:${act === "navigate" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "nav_path"))}</label>
        <input type="text" class="native-text act-nav" value="${escAttr(actionCfg?.navigation_path)}">
      </div>
      <div class="tf act-svc-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service"))}</label>
        <input type="text" class="native-text act-svc" value="${escAttr(actionCfg?.service)}">
      </div>
      <div class="tf act-svcdata-wrap" style="display:${act === "call-service" ? "block" : "none"}">
        <label class="native-label">${escAttr(getTranslation(h, "service_data"))}</label>
        <textarea class="native-text act-svcdata" rows="2">${escAttr(actionCfg?.service_data ? JSON.stringify(actionCfg.service_data) : "")}</textarea>
      </div>
    </div>
  `;
}

class HaInfraNasEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSections = { general: true, drives: false, appearance: false };
  }

  setConfig(config) {
    const incoming = config || {};
    if (this._rendered && this._lastFiredSig && JSON.stringify(incoming) === this._lastFiredSig) {
      this._config = incoming;
      return;
    }
    this._config = incoming;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this._render();
      return;
    }
    this.shadowRoot?.querySelectorAll("ha-entity-picker, ha-icon-picker").forEach((el) => {
      el.hass = hass;
    });
  }

  get hass() { return this._hass; }

  _fire(next, forceRerender = false) {
    this._config = next;
    this._lastFiredSig = forceRerender ? null : JSON.stringify(next);
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
  }

  _wireActionField(root, cls, actionCfg, onChange) {
    const field = root.querySelector(`.action-field.${cls}`);
    if (!field) return;
    const sel = field.querySelector(".act-type");
    const navWrap = field.querySelector(".act-nav-wrap");
    const svcWrap = field.querySelector(".act-svc-wrap");
    const dataWrap = field.querySelector(".act-svcdata-wrap");
    const navF = field.querySelector(".act-nav");
    const svcF = field.querySelector(".act-svc");
    const dataF = field.querySelector(".act-svcdata");
    sel.addEventListener("change", (e) => {
      e.stopPropagation();
      const act = e.target.value;
      if (navWrap) navWrap.style.display = act === "navigate" ? "block" : "none";
      if (svcWrap) svcWrap.style.display = act === "call-service" ? "block" : "none";
      if (dataWrap) dataWrap.style.display = act === "call-service" ? "block" : "none";
      onChange({ action: act });
    });
    if (navF) navF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "navigate", navigation_path: e.target.value }); });
    if (svcF) svcF.addEventListener("change", (e) => { e.stopPropagation(); onChange({ action: "call-service", service: e.target.value, service_data: actionCfg?.service_data }); });
    if (dataF) dataF.addEventListener("change", (e) => {
      e.stopPropagation();
      let data;
      try { data = e.target.value ? JSON.parse(e.target.value) : undefined; } catch { data = undefined; }
      onChange({ action: "call-service", service: actionCfg?.service || "", service_data: data });
    });
  }

  _wireEntityPicker(root, selector, value, domains, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.hass = this._hass;
    if (domains) el.includeDomains = domains;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireIconPicker(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value || "";
    el.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
  }

  _wireTextField(root, selector, value, onChange) {
    const el = root.querySelector(selector);
    if (!el) return;
    el.value = value ?? "";
    el.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); });
  }

  _wireColorField(root, selector, value, def, onChange) {
    const wrap = root.querySelector(selector);
    if (!wrap) return;
    const field = wrap.querySelector(".color-text");
    const picker = wrap.querySelector(".color-swatch");
    if (field) {
      field.value = value || "";
      field.addEventListener("change", (e) => {
        e.stopPropagation();
        const v = trimStr(e.target.value || "");
        onChange(v);
        if (picker) picker.value = parseColorToPickerHex(v || def);
      });
    }
    if (picker) {
      picker.value = parseColorToPickerHex(value || def);
      picker.addEventListener("change", (e) => {
        e.stopPropagation();
        const hex = e.target.value;
        onChange(hex);
        if (field) field.value = hex;
      });
    }
  }

  _colorFieldHTML(cls, label, value, def) {
    return `
      <div class="color-field ${cls}">
        <label class="native-label">${escAttr(label)}</label>
        <div class="color-row">
          <input type="color" class="color-swatch" value="${parseColorToPickerHex(value || def)}">
          <input type="text" class="native-text color-text" placeholder="${escAttr(def)}" value="${escAttr(value)}">
        </div>
      </div>
    `;
  }

  _generalHTML(h, c) {
    return `
      ${textFieldHTML("name-f", getTranslation(h, "name"), c.name)}
      <ha-icon-picker class="icon-f" label="${escAttr(getTranslation(h, "icon"))}" value="${escAttr(c.icon)}" style="width:100%;display:block;margin-bottom:8px;"></ha-icon-picker>
      <ha-entity-picker class="sys-temp-entity" label="${escAttr(getTranslation(h, "system_temp_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
      ${c.system_temperature_entity ? `
        ${textFieldHTML("sys-temp-label", getTranslation(h, "label"), c.system_temperature_label)}
        ${actionFieldHTML(h, "sys-temp-tap", getTranslation(h, "tap_action"), c.system_temperature_tap_action)}
        ${actionFieldHTML(h, "sys-temp-hold", getTranslation(h, "hold_action"), c.system_temperature_hold_action)}
      ` : ""}
    `;
  }

  _wireGeneral(root, h, c) {
    this._wireTextField(root, ".name-f", c.name, (v) => this._fire({ ...this._config, name: v }));
    this._wireIconPicker(root, ".icon-f", c.icon, (v) => this._fire({ ...this._config, icon: v }));
    this._wireEntityPicker(root, ".sys-temp-entity", c.system_temperature_entity, ["sensor"], (v) => this._fire({ ...this._config, system_temperature_entity: v }, true));
    if (c.system_temperature_entity) {
      this._wireTextField(root, ".sys-temp-label", c.system_temperature_label, (v) => this._fire({ ...this._config, system_temperature_label: v }));
      this._wireActionField(root, "sys-temp-tap", c.system_temperature_tap_action, (v) => this._fire({ ...this._config, system_temperature_tap_action: v }));
      this._wireActionField(root, "sys-temp-hold", c.system_temperature_hold_action, (v) => this._fire({ ...this._config, system_temperature_hold_action: v }));
    }
  }

  _driveItemHTML(h, d, idx) {
    return `
      <div class="item-box" data-idx="${idx}">
        <div class="item-head">
          <span class="item-title">${escAttr(d.label) || escAttr(d.entity) || `${escAttr(getTranslation(h, "drives"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="drive-entity" label="${escAttr(getTranslation(h, "entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
        ${textFieldHTML("drive-label", getTranslation(h, "label"), d.label)}
        ${actionFieldHTML(h, "drive-tap", getTranslation(h, "tap_action"), d.tap_action)}
        ${actionFieldHTML(h, "drive-hold", getTranslation(h, "hold_action"), d.hold_action)}
      </div>
    `;
  }

  _drivesHTML(h, c) {
    const drives = Array.isArray(c.drives) ? c.drives : [];
    const items = drives.map((d, i) => this._driveItemHTML(h, d, i)).join("");
    const addDisabled = drives.length >= MAX_DRIVES;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-drive-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "drive_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "drive_max"))}</div>` : ""}
    `;
  }

  _wireDrives(root, h, c) {
    const drives = Array.isArray(c.drives) ? c.drives : [];
    const list = root.querySelector('[data-sec="drives"] .item-list');
    drives.forEach((d, idx) => {
      const box = list?.querySelector(`.item-box[data-idx="${idx}"]`);
      if (!box) return;
      const upd = (patch, force = false) => {
        const arr = [...(this._config?.drives || [])];
        arr[idx] = { ...arr[idx], ...patch };
        this._fire({ ...this._config, drives: arr }, force);
      };
      box.querySelector("[data-del]")?.addEventListener("click", () => {
        const arr = [...(this._config?.drives || [])];
        arr.splice(idx, 1);
        const next = { ...this._config };
        if (arr.length) next.drives = arr; else delete next.drives;
        this._fire(next, true);
      });
      this._wireEntityPicker(box, ".drive-entity", d.entity, ["sensor"], (v) => upd({ entity: v }, true));
      this._wireTextField(box, ".drive-label", d.label, (v) => upd({ label: v }, true));
      this._wireActionField(box, "drive-tap", d.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(box, "drive-hold", d.hold_action, (v) => upd({ hold_action: v }));
    });
    const addBtn = root.querySelector(".add-drive-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (drives.length >= MAX_DRIVES) return;
        this._openSections.drives = true;
        this._fire({ ...this._config, drives: [...drives, { entity: "" }] }, true);
      });
    }
  }

  _appearanceHTML(h, c) {
    return `
      ${textFieldHTML("app-threshold", getTranslation(h, "temperature_warning_threshold"), c.temperature_warning_threshold ?? "45", { type: "number" })}
      ${this._colorFieldHTML("app-warn-color", getTranslation(h, "temperature_warning_color"), c.temperature_warning_color, "#f44336")}
    `;
  }

  _wireAppearance(root, h, c) {
    this._wireTextField(root, ".app-threshold", c.temperature_warning_threshold ?? "45", (v) => {
      const num = v === "" ? 45 : Number(v);
      this._fire({ ...this._config, temperature_warning_threshold: Number.isFinite(num) ? num : 45 });
    });
    this._wireColorField(root, ".app-warn-color", c.temperature_warning_color, "#f44336", (v) => this._fire({ ...this._config, temperature_warning_color: v }));
  }

  _sectionHTML(id, titleKey, bodyHTML) {
    const h = this._hass;
    const open = !!this._openSections[id];
    return `
      <div class="sec${open ? " open" : ""}" data-sec="${id}">
        <div class="sec-head" data-sec-head="${id}">
          <span class="sec-title">${escAttr(getTranslation(h, titleKey))}</span>
          <ha-icon class="sec-chev" icon="mdi:chevron-right"></ha-icon>
        </div>
        <div class="sec-content"${open ? "" : " hidden"}>${open ? bodyHTML : ""}</div>
      </div>
    `;
  }

  _render() {
    if (!this._hass) return;
    this._rendered = true;
    const h = this._hass;
    const c = this._config || {};

    this.shadowRoot.innerHTML = `
      <style>
        .wrap { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
        .sec { border: 1px solid var(--divider-color); border-radius: 8px; background: var(--secondary-background-color); padding: 6px 10px; }
        .sec-head { display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; padding: 4px 0; }
        .sec-title { font-size: 13px; font-weight: 600; opacity: 0.85; }
        .sec-chev { --mdc-icon-size: 18px; opacity: 0.7; transition: transform 0.15s ease; }
        .sec.open .sec-chev { transform: rotate(90deg); }
        .sec-content { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
        .sec-content[hidden] { display: none; }
        .item-list { display: flex; flex-direction: column; gap: 8px; }
        .item-box { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; background: var(--card-background-color, var(--primary-background-color)); display: flex; flex-direction: column; gap: 8px; }
        .item-head { display: flex; align-items: center; justify-content: space-between; }
        .item-title { font-size: 12px; font-weight: 600; opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .del-btn { background: none; border: 0; cursor: pointer; padding: 2px; display: inline-flex; color: #d32f2f; }
        .del-btn ha-icon, .del-btn svg { --mdc-icon-size: 18px; width: 18px; height: 18px; }
        .hint { font-size: 11px; opacity: 0.6; }
        .native-label { display: block; font-size: 12px; font-weight: 600; opacity: 0.75; margin-bottom: 4px; }
        .native-select, .native-text { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px; font: inherit; font-size: 14px; border-radius: 4px; border: 1px solid var(--divider-color); background: var(--card-background-color, var(--primary-background-color)); color: var(--primary-text-color); }
        .native-text:focus { outline: none; border-color: var(--primary-color, #1976d2); }
        textarea.native-text { resize: vertical; font-family: inherit; }
        .tf { margin-bottom: 8px; }
        .action-field { border-top: 1px dashed var(--divider-color); padding-top: 8px; margin-top: 2px; }
        .color-field { margin-bottom: 8px; }
        .color-row { display: flex; gap: 8px; align-items: center; }
        .color-swatch { width: 40px; height: 40px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 3px; cursor: pointer; flex-shrink: 0; background: var(--card-background-color, var(--primary-background-color)); box-sizing: border-box; }
        .add-btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 8px; border: none; background: var(--primary-color, #1976d2); color: var(--text-primary-color, #fff); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .add-btn:disabled { opacity: 0.5; cursor: default; }
      </style>
      <div class="wrap">
        ${this._sectionHTML("general", "general", this._generalHTML(h, c))}
        ${this._sectionHTML("drives", "drives", this._drivesHTML(h, c))}
        ${this._sectionHTML("appearance", "appearance", this._appearanceHTML(h, c))}
      </div>
    `;

    this.shadowRoot.querySelectorAll("[data-sec-head]").forEach((head) => {
      head.addEventListener("click", () => {
        const id = head.getAttribute("data-sec-head");
        this._openSections[id] = !this._openSections[id];
        this._render();
      });
    });

    const wrap = this.shadowRoot.querySelector(".wrap");
    if (this._openSections.general) this._wireGeneral(wrap, h, c);
    if (this._openSections.drives) this._wireDrives(wrap, h, c);
    if (this._openSections.appearance) this._wireAppearance(wrap, h, c);
  }
}

// =============================================================================
// REGISTRATION
// =============================================================================
if (!customElements.get("ha-infra-nas")) customElements.define("ha-infra-nas", HaInfraNas);
if (!customElements.get("ha-infra-nas-editor")) customElements.define("ha-infra-nas-editor", HaInfraNasEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-infra-nas")) {
  window.customCards.push({
    type: "ha-infra-nas",
    name: "HA Infra: NAS",
    description: "A compact NAS overview card: system temperature plus a list of per-drive temperatures, one device per card.",
    preview: true
  });
}

})();
