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
