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
