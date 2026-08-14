const VERSION = "1.0.0";
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
    windows: "Windows", window_add: "Add Window", window_entity: "Window Sensor",
    battery_entity: "Battery Sensor (optional)", battery_label: "Battery Label (optional)",
    climate: "Temperature / Humidity Sensor", temperature_entity: "Temperature Sensor",
    humidity_entity: "Humidity Sensor",
    switch_battery: "Switch Battery", switch_battery_entity: "Battery Sensor",
    controls: "Buttons / Switches", control_add: "Add Button", control_max: "Maximum of 4 buttons",
    window_max: "Maximum of 2 windows",
    appearance: "Appearance", on_color: "On Color", window_open_color: "Window Open Color", window_closed_color: "Window Closed Color",
    battery_warning_threshold: "Battery Warning Threshold (%)", battery_warning_color: "Battery Warning Color",
    tap_action: "Tap Action", hold_action: "Hold Action", double_tap_action: "Double Tap Action",
    act_more: "Details (Default)", act_toggle: "Toggle", act_navigate: "Navigate", act_call_service: "Action (service)", act_none: "None",
    nav_path: "Navigation Path", service: "Service (domain.service)", service_data: "Service Data (JSON)",
    show_icon: "Show Icon", delete: "Delete", empty_hint: "Nothing configured yet — add a window, a sensor or a button below.",
    state_on: "On", state_off: "Off", state_open: "Open", state_closed: "Closed", state_opening: "Opening", state_closing: "Closing",
    state_unavailable: "Unavailable", state_unknown: "Unknown",
  },
  de: {
    name: "Name", icon: "Icon", entity: "Entität", label: "Bezeichnung (optional)",
    general: "Allgemein", collapsible: "Einklappbar", default_state: "Standardzustand",
    state_expanded: "Ausgeklappt", state_collapsed: "Eingeklappt",
    windows: "Fenster", window_add: "Fenster hinzufügen", window_entity: "Fenstersensor",
    battery_entity: "Batteriesensor (optional)", battery_label: "Batterie-Bezeichnung (optional)",
    climate: "Temperatur- / Feuchtigkeitssensor", temperature_entity: "Temperatursensor",
    humidity_entity: "Feuchtigkeitssensor",
    switch_battery: "Schalter-Batterie", switch_battery_entity: "Batteriesensor",
    controls: "Schalter / Buttons", control_add: "Button hinzufügen", control_max: "Maximal 4 Buttons",
    window_max: "Maximal 2 Fenster",
    appearance: "Darstellung", on_color: "Farbe (an)", window_open_color: "Farbe offen", window_closed_color: "Farbe geschlossen",
    battery_warning_threshold: "Batteriewarnung Schwelle (%)", battery_warning_color: "Batteriewarnung Farbe",
    tap_action: "Antippen", hold_action: "Gedrückt halten", double_tap_action: "Doppelklick",
    act_more: "Details (Standard)", act_toggle: "Umschalten", act_navigate: "Navigieren", act_call_service: "Aktion (Service)", act_none: "Nichts",
    nav_path: "Navigationspfad", service: "Service (domain.service)", service_data: "Service-Daten (JSON)",
    show_icon: "Icon anzeigen", delete: "Löschen", empty_hint: "Noch nichts konfiguriert — füge unten ein Fenster, einen Sensor oder einen Button hinzu.",
    state_on: "An", state_off: "Aus", state_open: "Offen", state_closed: "Zu", state_opening: "Öffnet", state_closing: "Schließt",
    state_unavailable: "Nicht verfügbar", state_unknown: "Unbekannt",
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

const clampPct = (n) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : null;
};

const domainOf = (entityId) => (typeof entityId === "string" ? entityId.split(".")[0] : "");

const isUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";

const OPEN_STATE_VALUES = new Set(["on", "open", "opening", "offen", "geöffnet", "gekippt"]);
const isWindowOpen = (st) => OPEN_STATE_VALUES.has(String(st?.state || "").toLowerCase().trim());

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
  node.addEventListener("pointerdown", () => {
    held = false;
    if (hold.action !== "none") {
      holdTimer = setTimeout(() => {
        held = true;
        if (node.isConnected) fireAction(node, cfg.entity, hold, "hold");
      }, 500);
    }
  });
  node.addEventListener("pointerup", () => {
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
    if ((c.windows || []).length) size += 1;
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
        .header { display: flex; align-items: flex-start; gap: 10px; padding: 14px 14px 10px; }
        .header.clickable { cursor: pointer; }
        .header ha-icon { --mdc-icon-size: 22px; color: var(--paper-item-icon-color, var(--state-icon-color, var(--primary-text-color))); margin-top: 1px; flex-shrink: 0; }
        .title-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .name { font-size: 15px; font-weight: 700; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .subline { font-size: 12px; color: var(--secondary-text-color); display: flex; gap: 6px; flex-wrap: wrap; }
        .subline .clickable { cursor: pointer; }
        .subline .clickable:hover { text-decoration: underline; text-underline-offset: 2px; }
        .stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .stat-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary-text-color); cursor: pointer; }
        .stat-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; opacity: 0.85; }
        .stat-gauge { position: relative; width: 20px; height: 10px; border: 1.5px solid currentColor; border-radius: 2px; box-sizing: border-box; color: var(--stat-color, var(--secondary-text-color)); flex-shrink: 0; opacity: 0.9; }
        .stat-gauge::after { content: ""; position: absolute; top: 50%; right: -3px; transform: translateY(-50%); width: 2px; height: 4px; background: currentColor; border-radius: 0 1px 1px 0; }
        .stat-fill { position: absolute; top: 1px; bottom: 1px; left: 1px; width: var(--fill, 0%); max-width: calc(100% - 2px); background: currentColor; border-radius: 1px; }
        .stat-value { min-width: 28px; text-align: right; font-weight: 700; color: var(--val-color, var(--primary-text-color)); font-variant-numeric: tabular-nums; }
        .body { overflow: hidden; transition: max-height 0.3s ease, opacity 0.2s ease; max-height: 600px; opacity: 1; }
        .body.collapsed { max-height: 0 !important; opacity: 0; }
        .windows { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 10px; }
        .win-chip { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; background: var(--chip-bg); color: var(--chip-color); }
        .win-chip ha-icon { --mdc-icon-size: 15px; color: var(--chip-color); }
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
    if (c.switch_battery?.entity) ids.add(c.switch_battery.entity);
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
    const controlsEl = this.shadowRoot.getElementById("controls");
    const headerEl = this.shadowRoot.getElementById("header");
    const emptyHint = this.shadowRoot.getElementById("empty-hint");

    nameEl.textContent = c.name || "Room";
    iconEl.icon = c.icon || "mdi:home-outline";

    // --- Header click-to-collapse --- (listener wired once, reads live config on every click
    // so toggling `collapsible` off at runtime actually disables it, not a stale closure)
    if (!headerEl._wired) {
      headerEl._wired = true;
      headerEl.addEventListener("click", () => {
        if (this.config?.collapsible !== true) return;
        this._collapsed = !this._collapsed;
        if (this._collapseKey && this.config?.remember_state !== false) localStorage.setItem(this._collapseKey, this._collapsed ? "1" : "0");
        this.shadowRoot.getElementById("body").classList.toggle("collapsed", this._collapsed);
      });
    }
    headerEl.classList.toggle("clickable", c.collapsible === true);
    this.shadowRoot.getElementById("body").classList.toggle("collapsed", c.collapsible === true && this._collapsed);

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

    // --- Stat gauges (switch battery, climate battery, per-window battery) ---
    statsEl.replaceChildren();
    const threshold = Number.isFinite(Number(c.battery_warning_threshold)) ? Number(c.battery_warning_threshold) : 10;
    const warnColor = trimStr(c.battery_warning_color) || "#f44336";
    const addStatRow = (entity, label, tapCfg, holdCfg) => {
      const st = h.states[entity];
      if (!st || isUnavailable(st)) return;
      const pct = clampPct(st.state);
      if (pct == null) return;
      const isWarn = pct <= threshold;
      const row = document.createElement("div");
      row.className = "stat-row";
      const lbl = document.createElement("span");
      lbl.className = "stat-label";
      lbl.textContent = label || st.attributes?.friendly_name || entity;
      row.appendChild(lbl);
      const gauge = document.createElement("span");
      gauge.className = "stat-gauge";
      gauge.style.setProperty("--fill", `${pct}%`);
      if (isWarn) gauge.style.setProperty("--stat-color", warnColor);
      const fill = document.createElement("span");
      fill.className = "stat-fill";
      gauge.appendChild(fill);
      row.appendChild(gauge);
      const val = document.createElement("span");
      val.className = "stat-value";
      val.textContent = `${pct}%`;
      if (isWarn) val.style.setProperty("--val-color", warnColor);
      row.appendChild(val);
      attachGestures(row, h, { entity, tap_action: tapCfg, hold_action: holdCfg });
      statsEl.appendChild(row);
    };
    if (c.switch_battery?.entity) {
      addStatRow(c.switch_battery.entity, trimStr(c.switch_battery.label), c.switch_battery.tap_action, c.switch_battery.hold_action);
    }
    if (cl.battery_entity) {
      addStatRow(cl.battery_entity, trimStr(cl.battery_label), cl.battery_tap_action, cl.battery_hold_action);
    }
    (c.windows || []).forEach((w) => {
      if (w.battery_entity) addStatRow(w.battery_entity, trimStr(w.battery_label) || trimStr(w.label), w.battery_tap_action, w.battery_hold_action);
    });

    // --- Windows ---
    windowsEl.replaceChildren();
    const openColor = trimStr(c.window_open_color) || "#FFA000";
    const closedColor = trimStr(c.window_closed_color) || "#4CAF50";
    (c.windows || []).forEach((w) => {
      if (!w.entity) return;
      const st = h.states[w.entity];
      if (!st) return;
      const open = isWindowOpen(st);
      const color = open ? openColor : closedColor;
      const chip = document.createElement("div");
      chip.className = "win-chip";
      chip.style.setProperty("--chip-color", color);
      chip.style.setProperty("--chip-bg", hexToRgba(color.startsWith("#") ? color : "#888888", 0.15) || `${color}22`);
      const icon = document.createElement("ha-icon");
      icon.icon = open ? "mdi:window-open-variant" : "mdi:window-closed-variant";
      chip.appendChild(icon);
      const label = trimStr(w.label) || st.attributes?.friendly_name || getTranslation(h, "windows");
      const stateTxt = isUnavailable(st) ? getTranslation(h, "state_unavailable") : (open ? getTranslation(h, "state_open") : getTranslation(h, "state_closed"));
      chip.appendChild(document.createTextNode(`${label} · ${stateTxt}`));
      attachGestures(chip, h, { entity: w.entity, tap_action: w.tap_action, hold_action: w.hold_action });
      windowsEl.appendChild(chip);
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
const ACTION_TYPES = (h) => ([
  { value: "more-info", label: getTranslation(h, "act_more") },
  { value: "toggle", label: getTranslation(h, "act_toggle") },
  { value: "navigate", label: getTranslation(h, "act_navigate") },
  { value: "call-service", label: getTranslation(h, "act_call_service") },
  { value: "none", label: getTranslation(h, "act_none") }
]);

class HaSimCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSections = { general: true, windows: false, climate: false, switch_battery: false, controls: false, appearance: false };
  }

  setConfig(config) {
    this._config = config || {};
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
    // dropdown mid-interaction (it closes the instant it opens). Only refresh the live
    // hass reference on existing pickers/selectors instead of re-rendering the DOM.
    this.shadowRoot?.querySelectorAll("ha-entity-picker, ha-selector, ha-icon-picker").forEach((el) => {
      el.hass = hass;
    });
  }

  get hass() { return this._hass; }

  _fire(next) {
    this._config = next;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: next }, bubbles: true, composed: true }));
  }

  // ---- small reusable UI builders ----

  _textField(label, value, onChange, opts = {}) {
    const f = document.createElement("ha-textfield");
    f.label = label;
    if (opts.placeholder) f.placeholder = opts.placeholder;
    if (opts.type) f.type = opts.type;
    f.value = value ?? "";
    f.style.width = "100%";
    f.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); });
    return f;
  }

  _entityPicker(label, value, onChange, domainFilter) {
    const p = document.createElement("ha-entity-picker");
    p.label = label;
    p.value = value || "";
    p.hass = this._hass;
    if (domainFilter) p.includeDomains = domainFilter;
    p.style.cssText = "width:100%;display:block;";
    p.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
    return p;
  }

  _iconPicker(value, onChange) {
    const p = document.createElement("ha-icon-picker");
    p.label = getTranslation(this._hass, "icon");
    p.value = value || "";
    p.style.cssText = "width:100%;display:block;";
    p.addEventListener("value-changed", (e) => { e.stopPropagation(); onChange(e.detail?.value ?? ""); });
    return p;
  }

  _colorField(label, value, def, onChange) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex; gap:8px; align-items:flex-end; margin-bottom:8px;";
    const f = document.createElement("ha-textfield");
    f.label = label;
    f.placeholder = def;
    f.value = value || "";
    f.style.flex = "1";
    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = parseColorToPickerHex(value || def);
    picker.style.cssText = "width:36px;height:36px;border:none;padding:0;cursor:pointer;flex-shrink:0;";
    f.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); picker.value = parseColorToPickerHex(e.target.value || def); });
    picker.addEventListener("change", (e) => { e.stopPropagation(); onChange(e.target.value); f.value = e.target.value; });
    wrap.appendChild(f);
    wrap.appendChild(picker);
    return wrap;
  }

  _actionPair(container, actionCfg, onChange, includeDouble) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; gap:8px; margin-bottom:8px;";
    row.appendChild(this._actionSelector(getTranslation(this._hass, "tap_action"), actionCfg.tap_action, "more-info", (v) => onChange({ ...actionCfg, tap_action: v })));
    row.appendChild(this._actionSelector(getTranslation(this._hass, "hold_action"), actionCfg.hold_action, "none", (v) => onChange({ ...actionCfg, hold_action: v })));
    container.appendChild(row);
    if (includeDouble) {
      const row2 = document.createElement("div");
      row2.style.cssText = "display:flex; gap:8px; margin-bottom:8px;";
      row2.appendChild(this._actionSelector(getTranslation(this._hass, "double_tap_action"), actionCfg.double_tap_action, "none", (v) => onChange({ ...actionCfg, double_tap_action: v })));
      container.appendChild(row2);
    }
  }

  _actionSelector(label, value, defaultAction, onChange) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "flex:1; min-width:0;";
    const sel = document.createElement("ha-selector");
    sel.hass = this._hass;
    sel.label = label;
    sel.selector = { select: { mode: "dropdown", options: ACTION_TYPES(this._hass) } };
    sel.value = value?.action || defaultAction;
    wrap.appendChild(sel);

    const extra = document.createElement("div");
    extra.style.marginTop = "4px";
    wrap.appendChild(extra);

    const renderExtra = (act, current) => {
      extra.replaceChildren();
      if (act === "navigate") {
        const f = this._textField(getTranslation(this._hass, "nav_path"), current?.navigation_path, (v) => onChange({ action: "navigate", navigation_path: v }));
        extra.appendChild(f);
      } else if (act === "call-service") {
        const sf = this._textField(getTranslation(this._hass, "service"), current?.service, (v) => onChange({ ...current, action: "call-service", service: v }));
        extra.appendChild(sf);
        const df = document.createElement("ha-textfield");
        df.label = getTranslation(this._hass, "service_data");
        df.placeholder = '{"key":"value"}';
        df.multiline = true;
        df.rows = 3;
        df.value = current?.service_data ? JSON.stringify(current.service_data) : "";
        df.style.cssText = "width:100%;margin-top:4px;";
        df.addEventListener("change", (e) => {
          e.stopPropagation();
          let data;
          try { data = e.target.value ? JSON.parse(e.target.value) : undefined; } catch { data = undefined; }
          onChange({ ...current, action: "call-service", service: current?.service || "", service_data: data });
        });
        extra.appendChild(df);
      }
    };
    renderExtra(sel.value, value);

    sel.addEventListener("value-changed", (e) => {
      e.stopPropagation();
      const act = e.detail.value;
      const next = { action: act };
      onChange(next);
      renderExtra(act, next);
    });
    return wrap;
  }

  _section(id, titleKey, bodyBuilder) {
    const h = this._hass;
    const sec = document.createElement("div");
    sec.className = "sec";
    const head = document.createElement("div");
    head.className = "sec-head";
    const title = document.createElement("span");
    title.className = "sec-title";
    title.textContent = getTranslation(h, titleKey);
    const chev = document.createElement("ha-icon");
    chev.icon = "mdi:chevron-right";
    chev.className = "sec-chev";
    head.appendChild(title);
    head.appendChild(chev);
    sec.appendChild(head);
    const content = document.createElement("div");
    content.className = "sec-content";
    const open = !!this._openSections[id];
    sec.classList.toggle("open", open);
    content.hidden = !open;
    head.addEventListener("click", () => {
      this._openSections[id] = !this._openSections[id];
      this._render();
    });
    if (open) bodyBuilder(content);
    sec.appendChild(content);
    return sec;
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
        .item-box { border: 1px solid var(--divider-color); border-radius: 8px; padding: 10px; background: var(--card-background-color, var(--primary-background-color)); display: flex; flex-direction: column; gap: 8px; }
        .item-head { display: flex; align-items: center; justify-content: space-between; }
        .item-title { font-size: 12px; font-weight: 600; opacity: 0.7; }
        .del-btn { background: none; border: 0; cursor: pointer; padding: 2px; display: inline-flex; color: #d32f2f; --mdc-icon-size: 18px; }
        .row2 { display: flex; gap: 8px; }
        .row2 > * { flex: 1; min-width: 0; }
        .hint { font-size: 11px; opacity: 0.6; margin-top: -2px; }
      </style>
      <div class="wrap" id="wrap"></div>
    `;
    const wrap = this.shadowRoot.getElementById("wrap");

    // --- General ---
    wrap.appendChild(this._section("general", "general", (content) => {
      content.appendChild(this._textField(getTranslation(h, "name"), c.name, (v) => this._fire({ ...c, name: v })));
      content.appendChild(this._iconPicker(c.icon, (v) => this._fire({ ...c, icon: v })));
      const collapseRow = document.createElement("ha-formfield");
      collapseRow.label = getTranslation(h, "collapsible");
      const sw = document.createElement("ha-switch");
      sw.checked = c.collapsible === true;
      sw.addEventListener("change", (e) => { e.stopPropagation(); this._fire({ ...c, collapsible: e.target.checked }); });
      collapseRow.appendChild(sw);
      content.appendChild(collapseRow);
      if (c.collapsible === true) {
        const sel = document.createElement("ha-selector");
        sel.hass = h;
        sel.label = getTranslation(h, "default_state");
        sel.selector = { select: { mode: "dropdown", options: [
          { value: "expanded", label: getTranslation(h, "state_expanded") },
          { value: "collapsed", label: getTranslation(h, "state_collapsed") }
        ] } };
        sel.value = c.default_state || "expanded";
        sel.addEventListener("value-changed", (e) => { e.stopPropagation(); this._fire({ ...c, default_state: e.detail.value }); });
        content.appendChild(sel);
      }
    }));

    // --- Windows ---
    wrap.appendChild(this._section("windows", "windows", (content) => {
      const windows = Array.isArray(c.windows) ? c.windows : [];
      windows.forEach((w, idx) => {
        const box = document.createElement("div");
        box.className = "item-box";
        const head = document.createElement("div");
        head.className = "item-head";
        const t = document.createElement("span");
        t.className = "item-title";
        t.textContent = w.entity || `${getTranslation(h, "windows")} ${idx + 1}`;
        const del = document.createElement("button");
        del.className = "del-btn";
        del.innerHTML = `<ha-icon icon="mdi:delete-outline"></ha-icon>`;
        del.addEventListener("click", () => {
          const arr = [...windows]; arr.splice(idx, 1);
          const next = { ...c }; if (arr.length) next.windows = arr; else delete next.windows;
          this._fire(next);
        });
        head.appendChild(t); head.appendChild(del);
        box.appendChild(head);

        const upd = (patch) => {
          const arr = [...windows]; arr[idx] = { ...arr[idx], ...patch };
          this._fire({ ...c, windows: arr });
        };

        box.appendChild(this._entityPicker(getTranslation(h, "window_entity"), w.entity, (v) => upd({ entity: v }), ["binary_sensor", "sensor"]));
        box.appendChild(this._textField(getTranslation(h, "label"), w.label, (v) => upd({ label: v })));
        this._actionPair(box, w, (v) => upd(v), false);

        box.appendChild(this._entityPicker(getTranslation(h, "battery_entity"), w.battery_entity, (v) => upd({ battery_entity: v }), ["sensor"]));
        if (w.battery_entity) {
          box.appendChild(this._textField(getTranslation(h, "battery_label"), w.battery_label, (v) => upd({ battery_label: v })));
          const battActions = { tap_action: w.battery_tap_action, hold_action: w.battery_hold_action };
          this._actionPair(box, battActions, (v) => upd({ battery_tap_action: v.tap_action, battery_hold_action: v.hold_action }), false);
        }
        content.appendChild(box);
      });
      const addBtn = document.createElement("mwc-button");
      addBtn.raised = true;
      addBtn.innerHTML = `<ha-icon icon="mdi:plus" slot="icon"></ha-icon>${getTranslation(h, "window_add")}`;
      if (windows.length >= 2) {
        addBtn.disabled = true;
        const hint = document.createElement("div");
        hint.className = "hint";
        hint.textContent = getTranslation(h, "window_max");
        content.appendChild(hint);
      }
      addBtn.addEventListener("click", () => {
        if (windows.length >= 2) return;
        this._openSections.windows = true;
        this._fire({ ...c, windows: [...windows, { entity: "" }] });
      });
      content.appendChild(addBtn);
    }));

    // --- Climate sensor ---
    wrap.appendChild(this._section("climate", "climate", (content) => {
      const cl = c.climate || {};
      const upd = (patch) => this._fire({ ...c, climate: { ...cl, ...patch } });

      content.appendChild(this._entityPicker(getTranslation(h, "temperature_entity"), cl.temperature_entity, (v) => upd({ temperature_entity: v }), ["sensor"]));
      if (cl.temperature_entity) {
        content.appendChild(this._textField(getTranslation(h, "label"), cl.temperature_label, (v) => upd({ temperature_label: v })));
        const tempActions = { tap_action: cl.temperature_tap_action, hold_action: cl.temperature_hold_action };
        this._actionPair(content, tempActions, (v) => upd({ temperature_tap_action: v.tap_action, temperature_hold_action: v.hold_action }), false);
      }

      content.appendChild(this._entityPicker(getTranslation(h, "humidity_entity"), cl.humidity_entity, (v) => upd({ humidity_entity: v }), ["sensor"]));
      if (cl.humidity_entity) {
        content.appendChild(this._textField(getTranslation(h, "label"), cl.humidity_label, (v) => upd({ humidity_label: v })));
        const humidActions = { tap_action: cl.humidity_tap_action, hold_action: cl.humidity_hold_action };
        this._actionPair(content, humidActions, (v) => upd({ humidity_tap_action: v.tap_action, humidity_hold_action: v.hold_action }), false);
      }

      content.appendChild(this._entityPicker(getTranslation(h, "battery_entity"), cl.battery_entity, (v) => upd({ battery_entity: v }), ["sensor"]));
      if (cl.battery_entity) {
        content.appendChild(this._textField(getTranslation(h, "battery_label"), cl.battery_label, (v) => upd({ battery_label: v })));
        const battActions = { tap_action: cl.battery_tap_action, hold_action: cl.battery_hold_action };
        this._actionPair(content, battActions, (v) => upd({ battery_tap_action: v.tap_action, battery_hold_action: v.hold_action }), false);
      }
    }));

    // --- Switch battery ---
    wrap.appendChild(this._section("switch_battery", "switch_battery", (content) => {
      const sb = c.switch_battery || {};
      const upd = (patch) => this._fire({ ...c, switch_battery: { ...sb, ...patch } });
      content.appendChild(this._entityPicker(getTranslation(h, "switch_battery_entity"), sb.entity, (v) => upd({ entity: v }), ["sensor"]));
      if (sb.entity) {
        content.appendChild(this._textField(getTranslation(h, "label"), sb.label, (v) => upd({ label: v })));
        const actions = { tap_action: sb.tap_action, hold_action: sb.hold_action };
        this._actionPair(content, actions, (v) => upd({ tap_action: v.tap_action, hold_action: v.hold_action }), false);
      }
    }));

    // --- Controls ---
    wrap.appendChild(this._section("controls", "controls", (content) => {
      const controls = Array.isArray(c.controls) ? c.controls : [];
      controls.forEach((ctrl, idx) => {
        const box = document.createElement("div");
        box.className = "item-box";
        const head = document.createElement("div");
        head.className = "item-head";
        const t = document.createElement("span");
        t.className = "item-title";
        t.textContent = ctrl.name || ctrl.entity || `${getTranslation(h, "controls")} ${idx + 1}`;
        const del = document.createElement("button");
        del.className = "del-btn";
        del.innerHTML = `<ha-icon icon="mdi:delete-outline"></ha-icon>`;
        del.addEventListener("click", () => {
          const arr = [...controls]; arr.splice(idx, 1);
          const next = { ...c }; if (arr.length) next.controls = arr; else delete next.controls;
          this._fire(next);
        });
        head.appendChild(t); head.appendChild(del);
        box.appendChild(head);

        const upd = (patch) => {
          const arr = [...controls]; arr[idx] = { ...arr[idx], ...patch };
          this._fire({ ...c, controls: arr });
        };

        box.appendChild(this._entityPicker(getTranslation(h, "entity"), ctrl.entity, (v) => upd({ entity: v }), ["light", "switch", "fan", "cover"]));
        box.appendChild(this._textField(getTranslation(h, "name"), ctrl.name, (v) => upd({ name: v })));

        const row2 = document.createElement("div");
        row2.className = "row2";
        row2.appendChild(this._iconPicker(ctrl.icon, (v) => upd({ icon: v })));
        row2.appendChild(this._colorField(getTranslation(h, "on_color"), ctrl.on_color, "#ffa726", (v) => upd({ on_color: v })));
        box.appendChild(row2);

        const showIconField = document.createElement("ha-formfield");
        showIconField.label = getTranslation(h, "show_icon");
        const showIconSw = document.createElement("ha-switch");
        showIconSw.checked = ctrl.show_icon !== false;
        showIconSw.addEventListener("change", (e) => { e.stopPropagation(); upd({ show_icon: e.target.checked }); });
        showIconField.appendChild(showIconSw);
        box.appendChild(showIconField);

        this._actionPair(box, ctrl, (v) => upd(v), true);
        content.appendChild(box);
      });
      const addBtn = document.createElement("mwc-button");
      addBtn.raised = true;
      addBtn.innerHTML = `<ha-icon icon="mdi:plus" slot="icon"></ha-icon>${getTranslation(h, "control_add")}`;
      if (controls.length >= 4) {
        addBtn.disabled = true;
        const hint = document.createElement("div");
        hint.className = "hint";
        hint.textContent = getTranslation(h, "control_max");
        content.appendChild(hint);
      }
      addBtn.addEventListener("click", () => {
        if (controls.length >= 4) return;
        this._openSections.controls = true;
        this._fire({ ...c, controls: [...controls, { entity: "", tap_action: { action: "toggle" }, hold_action: { action: "more-info" } }] });
      });
      content.appendChild(addBtn);
    }));

    // --- Appearance ---
    wrap.appendChild(this._section("appearance", "appearance", (content) => {
      content.appendChild(this._colorField(getTranslation(h, "window_open_color"), c.window_open_color, "#FFA000", (v) => this._fire({ ...c, window_open_color: v })));
      content.appendChild(this._colorField(getTranslation(h, "window_closed_color"), c.window_closed_color, "#4CAF50", (v) => this._fire({ ...c, window_closed_color: v })));
      content.appendChild(this._textField(getTranslation(h, "battery_warning_threshold"), c.battery_warning_threshold ?? "10", (v) => {
        const num = v === "" ? 10 : Number(v);
        this._fire({ ...c, battery_warning_threshold: Number.isFinite(num) ? num : 10 });
      }, { type: "number" }));
      content.appendChild(this._colorField(getTranslation(h, "battery_warning_color"), c.battery_warning_color, "#f44336", (v) => this._fire({ ...c, battery_warning_color: v })));
    }));
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
