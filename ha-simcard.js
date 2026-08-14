const VERSION = "1.0.2";
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
        .win-chip ha-icon { --mdc-icon-size: 12px; color: var(--chip-color); }
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
          <span class="item-title">${escAttr(w.entity) || `${escAttr(getTranslation(h, "windows"))} ${idx + 1}`}</span>
          <button type="button" class="del-btn" data-del>${DELETE_ICON}</button>
        </div>
        <ha-entity-picker class="win-entity" label="${escAttr(getTranslation(h, "window_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
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
    const addDisabled = windows.length >= 2;
    return `
      <div class="item-list">${items}</div>
      <button type="button" class="add-btn add-window-btn"${addDisabled ? " disabled" : ""}>${PLUS_ICON}${escAttr(getTranslation(h, "window_add"))}</button>
      ${addDisabled ? `<div class="hint">${escAttr(getTranslation(h, "window_max"))}</div>` : ""}
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
        if (windows.length >= 2) return;
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

  _switchBatteryHTML(h, c) {
    const sb = c.switch_battery || {};
    return `
      <ha-entity-picker class="sb-entity" label="${escAttr(getTranslation(h, "switch_battery_entity"))}" style="width:100%;display:block;margin-bottom:8px;"></ha-entity-picker>
      ${sb.entity ? `
        ${textFieldHTML("sb-label", getTranslation(h, "label"), sb.label)}
        ${actionFieldHTML(h, "sb-tap", getTranslation(h, "tap_action"), sb.tap_action)}
        ${actionFieldHTML(h, "sb-hold", getTranslation(h, "hold_action"), sb.hold_action)}
      ` : ""}
    `;
  }

  _wireSwitchBattery(root, h, c) {
    const sb = c.switch_battery || {};
    const upd = (patch, force = false) => this._fire({ ...this._config, switch_battery: { ...(this._config?.switch_battery || {}), ...patch } }, force);
    this._wireEntityPicker(root, ".sb-entity", sb.entity, ["sensor"], (v) => upd({ entity: v }, true));
    if (sb.entity) {
      this._wireTextField(root, ".sb-label", sb.label, (v) => upd({ label: v }));
      this._wireActionField(root, "sb-tap", sb.tap_action, (v) => upd({ tap_action: v }));
      this._wireActionField(root, "sb-hold", sb.hold_action, (v) => upd({ hold_action: v }));
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
    return `
      ${this._colorFieldHTML("app-open-color", getTranslation(h, "window_open_color"), c.window_open_color, "#FFA000")}
      ${this._colorFieldHTML("app-closed-color", getTranslation(h, "window_closed_color"), c.window_closed_color, "#4CAF50")}
      ${textFieldHTML("app-threshold", getTranslation(h, "battery_warning_threshold"), c.battery_warning_threshold ?? "10", { type: "number" })}
      ${this._colorFieldHTML("app-warn-color", getTranslation(h, "battery_warning_color"), c.battery_warning_color, "#f44336")}
    `;
  }

  _wireAppearance(root, h, c) {
    this._wireColorField(root, ".app-open-color", c.window_open_color, "#FFA000", (v) => this._fire({ ...this._config, window_open_color: v }));
    this._wireColorField(root, ".app-closed-color", c.window_closed_color, "#4CAF50", (v) => this._fire({ ...this._config, window_closed_color: v }));
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
        .action-field { border-top: 1px dashed var(--divider-color); padding-top: 8px; margin-top: 2px; }
        .color-field { margin-bottom: 8px; }
        .color-row { display: flex; gap: 8px; align-items: center; }
        .color-swatch { width: 40px; height: 40px; border: 1px solid var(--divider-color); border-radius: 8px; padding: 3px; cursor: pointer; flex-shrink: 0; background: var(--card-background-color, var(--primary-background-color)); box-sizing: border-box; }
        .add-btn { display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 8px; border: none; background: var(--primary-color, #ff9800); color: var(--text-primary-color, #fff); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
        .add-btn:disabled { opacity: 0.5; cursor: default; }
      </style>
      <div class="wrap">
        ${this._sectionHTML("general", "general", this._generalHTML(h, c))}
        ${this._sectionHTML("windows", "windows", this._windowsHTML(h, c))}
        ${this._sectionHTML("climate", "climate", this._climateHTML(h, c))}
        ${this._sectionHTML("switch_battery", "switch_battery", this._switchBatteryHTML(h, c))}
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
    if (this._openSections.switch_battery) this._wireSwitchBattery(wrap, h, c);
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
