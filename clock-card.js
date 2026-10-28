/*
 * Clock Card (FR)
 * Carte Home Assistant « horloge » en six styles : digitale en verre, analogique, à volets (flip), journée et soleil,
 * en toutes lettres, minimaliste. Heure du fuseau de Home Assistant, date en français, 12 / 24 h, secondes.
 * Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.0.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) ===
 * Bloc identique dans toutes les cartes. Options : nuance, nuance_perso, intensite.
 * nuance "theme" (par défaut) : suit la variable carte-nuance du thème Home Assistant ;
 * si elle n'existe pas, la carte garde ses couleurs d'origine. Intensité : 0 = neutre, 1 = normal, 2 = très coloré. */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
/* Variables posées sur <ha-card> : --g-bg-x (fond dégradé teinté) et --acc-ui-x (couleur d'accent).
 * Sans nuance (thème sans carte-nuance), elles sont invalides : chaque carte retombe alors sur ses couleurs d'origine. */
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */
const DEFAULTS = { style: "digital", theme: "auto", ...GV_DEFAULTS, hour12: false, show_seconds: true, show_date: true, show_greeting: true, show_info: true, sun_entity: "sun.sun" };
const STYLES = [["digital", "Digitale en verre"], ["analog", "Analogique"], ["flip", "À volets (flip)"], ["day", "Journée et soleil"], ["words", "En toutes lettres"], ["minimal", "Minimaliste"]];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const p2 = (n) => String(n).padStart(2, "0");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const HOURS_FR = ["MINUIT", "UNE", "DEUX", "TROIS", "QUATRE", "CINQ", "SIX", "SEPT", "HUIT", "NEUF", "DIX", "ONZE", "MIDI"];
const MINS_FR = { 0: [], 5: ["ET", "CINQ"], 10: ["ET", "DIX"], 15: ["ET", "QUART"], 20: ["ET", "VINGT"], 25: ["ET", "VINGT-CINQ"], 30: ["ET", "DEMIE"], 35: ["MOINS", "VINGT-CINQ"], 40: ["MOINS", "VINGT"], 45: ["MOINS", "LE", "QUART"], 50: ["MOINS", "DIX"], 55: ["MOINS", "CINQ"] };
const ALLMINS = ["ET", "MOINS", "LE", "CINQ", "DIX", "QUART", "VINGT", "VINGT-CINQ", "DEMIE"];

class ClockCard extends HTMLElement {
  static getConfigElement() { return document.createElement("clock-card-editor"); }
  static getStubConfig() { return { ...DEFAULTS }; }

  constructor() { super(); this.attachShadow({ mode: "open" }); this._sig = ""; this._prev = {}; }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    this._sig = "";
    if (this._hass || this._standalone) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const sun = hass.states[this._config.sun_entity];
    const sig = (this._isDark() ? "d" : "l") + (sun ? sun.state + (sun.attributes.next_rising || "") + (sun.attributes.next_setting || "") : "");
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  connectedCallback() { this._timer = setInterval(() => this._tick(), 250); if (this._config && !this._hass) { this._standalone = true; this._render(); } }
  disconnectedCallback() { clearInterval(this._timer); }
  getCardSize() { return this._config && this._config.style === "analog" ? 5 : 3; }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _lang() { return (this._hass && this._hass.locale && this._hass.locale.language) || "fr"; }
  _tz() { return (this._hass && this._hass.config && this._hass.config.time_zone) || undefined; }

  /* heure dans le fuseau de Home Assistant */
  _now() {
    const d = new Date(), tz = this._tz();
    let parts;
    try { parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" }).formatToParts(d); }
    catch (e) { parts = new Intl.DateTimeFormat("en-GB", { hour12: false, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", weekday: "short" }).formatToParts(d); }
    const g = (t) => Number((parts.find((p) => p.type === t) || {}).value);
    const h = g("hour") % 24, m = g("minute"), s = g("second"), ms = d.getMilliseconds();
    const y = g("year"), mo = g("month"), da = g("day");
    return { d, h, m, s, ms, y, mo, da, secs: h * 3600 + m * 60 + s + ms / 1000 };
  }
  _dateStr(n, opts) {
    const dt = new Date(Date.UTC(n.y, n.mo - 1, n.da, 12));
    return new Intl.DateTimeFormat(this._lang(), { timeZone: "UTC", ...opts }).format(dt);
  }
  _week(n) {
    const d = new Date(Date.UTC(n.y, n.mo - 1, n.da)); const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    return Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  }
  _hh(n) { const c = this._config; return c.hour12 ? ((n.h % 12) || 12) : n.h; }
  _greet(n) { return n.h >= 5 && n.h < 12 ? "Bonjour" : n.h >= 12 && n.h < 18 ? "Bon après-midi" : n.h >= 18 && n.h < 22 ? "Bonsoir" : "Bonne nuit"; }

  _sun(n) {
    const st = this._hass && this._hass.states[this._config.sun_entity];
    if (!st || !st.attributes.next_rising || !st.attributes.next_setting) return null;
    const nr = Date.parse(st.attributes.next_rising), ns = Date.parse(st.attributes.next_setting);
    const up = st.state === "above_horizon", now = n.d.getTime();
    const rise = up ? nr - 86400000 : nr, set = up ? ns : ns - 86400000 * 0 ;
    // jour : [lever, coucher] ; nuit : [coucher précédent, prochain lever]
    return up ? { up, a: nr - 86400000, b: ns, now, rise: nr - 86400000, set: ns, nextRise: nr } : { up, a: ns - 86400000, b: nr, now, rise: nr, set: ns - 86400000, nextRise: nr, nextSet: ns };
  }
  _hm(ms) { return new Intl.DateTimeFormat(this._lang(), { timeZone: this._tz(), hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ms)); }
  _dur(ms) { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)} h ${p2(m % 60)}`; }

  _words(n) {
    let m5 = Math.floor(n.m / 5) * 5, h = n.h;
    if (m5 >= 35) h = (h + 1) % 24;
    const hw = h === 0 ? 0 : h === 12 ? 12 : h % 12;
    const hourTok = HOURS_FR[hw];
    const active = new Set([hourTok]);
    const plural = hourTok !== "UNE" && hourTok !== "MIDI" && hourTok !== "MINUIT";
    if (hourTok !== "MIDI" && hourTok !== "MINUIT") active.add("HEURE");
    (MINS_FR[m5] || []).forEach((w) => active.add("m:" + w));
    const per = h < 12 ? "DU MATIN" : h < 18 ? "DE L'APRÈS-MIDI" : "DU SOIR";
    const hoursHtml = HOURS_FR.slice(1, 12).concat(["MIDI", "MINUIT"]).map((w) => `<span class="${active.has(w) ? "on" : ""}">${w}</span>`).join(" ");
    const heure = `<span class="${active.has("HEURE") ? "on" : ""}">HEURE${plural || !active.has("HEURE") ? "S" : ""}</span>`;
    const minsHtml = ALLMINS.map((w) => `<span class="${active.has("m:" + w) ? "on" : ""}">${w}</span>`).join(" ");
    const pers = ["DU MATIN", "DE L'APRÈS-MIDI", "DU SOIR"].map((w) => `<span class="${w === per ? "on" : ""}">${w}</span>`).join(" ");
    return `<div class="wd"><span class="on">IL EST</span> ${hoursHtml} ${heure}<br>${minsHtml}<br>${pers}</div>`;
  }

  _flip(v, key) { return `<div class="fl" data-fl="${key}"><span>${v}</span></div>`; }

  _body(n) {
    const c = this._config, st = c.style;
    const hh = this._hh(n), mm = p2(n.m), ss = p2(n.s);
    const ampm = c.hour12 ? (n.h < 12 ? "AM" : "PM") : "";
    const dateLong = cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long" }));
    const sunInfo = () => { const s = this._sun(n); if (!s) return ""; return s.up ? `☀ Coucher ${this._hm(s.b)}` : `🌅 Lever ${this._hm(s.b)}`; };
    if (st === "analog") {
      const ticks = Array.from({ length: 60 }, (_, i) => `<line x1="0" y1="-90" x2="0" y2="${i % 5 === 0 ? -80 : -86}" stroke-width="${i % 5 === 0 ? 3 : 1}" transform="rotate(${i * 6})" opacity="${i % 5 === 0 ? 1 : .45}"/>`).join("");
      return `<div class="ana"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="face" cx=".4" cy=".35"><stop offset="0" stop-color="var(--ck-face1)"/><stop offset="1" stop-color="var(--ck-face2)"/></radialGradient></defs>
        <circle cx="100" cy="100" r="96" fill="url(#face)" stroke="var(--ck-line)" stroke-width="2"/>
        <g transform="translate(100 100)" stroke="var(--ck-tick)" stroke-linecap="round">${ticks}</g>
        ${c.show_date ? `<rect x="122" y="92" width="44" height="16" rx="5" fill="var(--ck-glass)" stroke="var(--ck-line)"/><text x="144" y="104" text-anchor="middle" fill="var(--ck-text)" font-size="9.5" font-weight="700" data-date-short>${esc(this._dateStr(n, { weekday: "short", day: "numeric" }))}</text>` : ""}
        <g transform="translate(100 100)"><line data-hand="h" x1="0" y1="7" x2="0" y2="-46" stroke="var(--ck-text)" stroke-width="5" stroke-linecap="round"/><line data-hand="m" x1="0" y1="9" x2="0" y2="-68" stroke="var(--ck-text)" stroke-width="3.4" stroke-linecap="round"/>
          ${c.show_seconds ? `<line data-hand="s" x1="0" y1="16" x2="0" y2="-76" stroke="var(--ck-accent)" stroke-width="1.6" stroke-linecap="round"/>` : ""}<circle r="5" fill="var(--ck-accent)"/><circle r="2" fill="var(--ck-bg0)"/></g></svg></div>
        ${c.show_date ? `<div class="sd" data-date>${esc(dateLong)}</div>` : ""}`;
    }
    if (st === "flip") {
      const H = p2(hh);
      return `<div class="flipw"><div class="flipr">${this._flip(H[0], "h0")}${this._flip(H[1], "h1")}<div class="colon">:</div>${this._flip(mm[0], "m0")}${this._flip(mm[1], "m1")}${c.show_seconds ? `<div class="colon sm">:</div>${this._flip(ss[0], "s0")}${this._flip(ss[1], "s1")}` : ""}${ampm ? `<div class="ap" data-ap>${ampm}</div>` : ""}</div></div>
        ${c.show_date ? `<div class="sd" data-date>${esc(cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long", year: "numeric" })))}</div>` : ""}
        ${c.show_info ? `<div class="info glass"><span>Semaine ${this._week(n)}</span><span>${sunInfo()}</span></div>` : ""}`;
    }
    if (st === "day") {
      const s = this._sun(n);
      return `<div class="big" data-time>${p2(hh)}:${mm}${c.show_seconds ? `<small data-sec>${ss}</small>` : ""}${ampm ? `<small data-ap>${ampm}</small>` : ""}</div>
        ${c.show_date ? `<div class="sd left" data-date>${esc(dateLong)}${s ? ` · ${s.up ? "il fait jour" : "il fait nuit"}` : ""}</div>` : ""}
        <div class="arcw"><svg viewBox="0 0 300 96" aria-hidden="true"><path class="arc0" d="M12 86 Q150 -52 288 86"/><path class="arc1 ${s && s.up ? "sun" : "moon"}" d="M12 86 Q150 -52 288 86" data-arc style="stroke-dasharray:0 1000"/>
          <g data-body><circle class="bd ${s && s.up ? "sun" : "moon"}" r="8"/>${s && s.up ? "" : `<circle class="cut" cx="4" cy="-3" r="7"/>`}</g></svg></div>
        ${s ? `<div class="sunrow"><span>🌅 ${this._hm(s.up ? s.a : s.nextRise)}</span><span>${s.up ? "Jour : " + this._dur(s.b - s.a) : "Nuit : " + this._dur(s.b - s.a)}</span><span>🌇 ${this._hm(s.up ? s.b : s.nextSet || s.a + 86400000)}</span></div>` : `<div class="sunrow"><span>Entité du soleil introuvable</span></div>`}`;
    }
    if (st === "words") {
      return `<div class="words" data-words>${this._words(n)}</div>${c.show_date ? `<div class="sd left" data-date>${hh}:${mm}${c.show_seconds ? `:${ss}` : ""} · ${esc(dateLong)}</div>` : ""}`;
    }
    if (st === "minimal") {
      const pct = Math.round((n.secs / 86400) * 100);
      return `<div class="min"><div class="bigt" data-time>${p2(hh)}<i data-colon>:</i>${mm}${ampm ? `<small data-ap>${ampm}</small>` : ""}</div>${c.show_seconds ? `<div class="sec" data-sec>${ss}</div>` : ""}
        ${c.show_date ? `<div class="dt" data-date>${esc(dateLong)}</div>` : ""}<div class="pbar"><u data-pct style="width:${pct}%"></u></div><div class="ptx" data-pcttx>${pct} % de la journée écoulée</div></div>`;
    }
    // digital
    return `<div class="dig"><div class="left">${c.show_greeting ? `<div class="hello" data-greet>${this._greet(n)}</div>` : ""}<div class="big" data-time>${p2(hh)}:${mm}${ampm ? `<small data-ap>${ampm}</small>` : ""}</div>
      ${c.show_date ? `<div class="sd left" data-date>${esc(dateLong)}</div>` : ""}</div>
      ${c.show_seconds ? `<svg class="ring" viewBox="0 0 54 54" aria-hidden="true"><circle class="rb" cx="27" cy="27" r="22"/><circle class="rp" data-ring cx="27" cy="27" r="22"/><text x="27" y="32" text-anchor="middle" data-sec>${ss}</text></svg>` : ""}</div>
      ${c.show_info ? `<div class="info glass"><span>${sunInfo()}</span><span>Semaine ${this._week(n)}</span></div>` : ""}`;
  }

  _render() {
    const c = this._config;
    if (!c) return;
    const dark = this._isDark(), n = this._now();
    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --ck-text:#f4f6fb; --ck-muted:#a9afc0; --ck-bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%)); --ck-bg0:#1b1e32; --ck-border:rgba(255,255,255,.14); --ck-shadow:0 .6em 2em rgba(0,0,0,.35);
        --ck-glass:rgba(255,255,255,.07); --ck-glass-b:rgba(255,255,255,.13); --ck-accent:#ff8a9a; --ck-warm:#ffb86b; --ck-line:rgba(255,255,255,.22); --ck-tick:#cfd5ea; --ck-face1:rgba(255,255,255,.14); --ck-face2:rgba(255,255,255,.03); --ck-moon:#aab4e8; --ck-flip:#2c3150; --ck-flip2:#242845; --ck-dim:rgba(255,255,255,.18); --ck-grad:linear-gradient(180deg,#fff,#b9c2ff); }
      ha-card.light { --ck-text:#1c2030; --ck-muted:#5d6477; --ck-bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%)); --ck-bg0:#f8f9fd; --ck-border:rgba(20,24,40,.12); --ck-shadow:0 .4em 1.4em rgba(20,24,40,.12);
        --ck-glass:rgba(255,255,255,.7); --ck-glass-b:rgba(20,24,40,.1); --ck-accent:#d6246e; --ck-warm:#c77a14; --ck-line:rgba(20,24,40,.2); --ck-tick:#3a4156; --ck-face1:rgba(255,255,255,.9); --ck-face2:rgba(20,24,40,.04); --ck-moon:#5a64b8; --ck-flip:#e7eaf6; --ck-flip2:#dde1f0; --ck-dim:rgba(20,24,40,.14); --ck-grad:linear-gradient(180deg,#1c2030,#4a55a8); }
      ha-card { container-type:inline-size; display:flex; flex-direction:column; justify-content:center; gap:12px; padding:18px; min-height:11em; color:var(--ck-text); border-radius:24px; border:1px solid var(--ck-border); background:var(--ck-bg); box-shadow:var(--ck-shadow); overflow:hidden; }
      .glass { background:var(--ck-glass); border:1px solid var(--ck-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
      .info { display:flex; justify-content:space-between; gap:.6em; flex-wrap:wrap; padding:10px 14px; border-radius:16px; font-size:.82em; color:var(--ck-muted); }
      .sd { text-align:center; color:var(--ck-muted); font-size:.95em; } .sd.left { text-align:left; margin-top:.3em; }
      .big { font-size:4.2em; font-weight:800; letter-spacing:-.02em; line-height:1; font-variant-numeric:tabular-nums; background:var(--ck-grad); -webkit-background-clip:text; background-clip:text; color:transparent; }
      .big small { font-size:.3em; letter-spacing:0; margin-left:.3em; -webkit-text-fill-color:var(--ck-accent); font-weight:700; }
      /* digitale */
      .dig { display:flex; align-items:center; justify-content:space-between; gap:14px; } .hello { font-weight:700; color:var(--ck-warm); margin-bottom:.3em; }
      .ring { width:3.6em; height:3.6em; flex:none; } .ring circle { fill:none; stroke-width:5; } .rb { stroke:var(--ck-glass-b); } .rp { stroke:var(--ck-accent); stroke-linecap:round; stroke-dasharray:138.2; transform:rotate(-90deg); transform-origin:center; } .ring text { fill:var(--ck-accent); font-size:14px; font-weight:700; }
      @container (max-width:300px) { .big { font-size:3.2em; } }
      /* analogique */
      .ana { width:100%; max-width:15em; margin:0 auto; } .ana svg { width:100%; height:auto; display:block; }
      /* flip */
      .flipw { display:flex; justify-content:center; } .flipr { display:flex; align-items:center; gap:.3em; }
      .fl { position:relative; width:1.25em; height:1.8em; border-radius:.22em; background:linear-gradient(var(--ck-flip) 50%, var(--ck-flip2) 50%); font-size:2.4em; font-weight:800; display:grid; place-items:center; box-shadow:0 4px 12px rgba(0,0,0,.28); font-variant-numeric:tabular-nums; line-height:1; }
      .fl::after { content:""; position:absolute; left:0; right:0; top:50%; height:2px; background:var(--ck-bg0); opacity:.8; } .fl.go span { animation:ck-flip .45s ease-out; }
      .colon { font-size:1.9em; font-weight:800; color:var(--ck-accent); margin:0 .05em; animation:ck-bl 1s steps(2) infinite; } .colon.sm { font-size:1.4em; } .ap { font-size:.9em; font-weight:700; color:var(--ck-accent); margin-left:.4em; }
      @container (max-width:360px) { .fl { font-size:1.7em; } .colon { font-size:1.4em; } }
      /* journée */
      .arcw { margin-top:.2em; } .arcw svg { width:100%; height:auto; display:block; overflow:visible; } .arc0 { fill:none; stroke:var(--ck-glass-b); stroke-width:3; stroke-dasharray:2 7; stroke-linecap:round; }
      .arc1 { fill:none; stroke-width:3; stroke-linecap:round; } .arc1.sun { stroke:var(--ck-warm); } .arc1.moon { stroke:var(--ck-moon); }
      .bd.sun { fill:var(--ck-warm); filter:drop-shadow(0 0 6px var(--ck-warm)); } .bd.moon { fill:var(--ck-moon); } .cut { fill:var(--ck-bg0); }
      .sunrow { display:flex; justify-content:space-between; font-size:.8em; color:var(--ck-muted); }
      /* lettres */
      .words { font-size:1.35em; line-height:1.5; font-weight:700; letter-spacing:.02em; } .wd span { color:var(--ck-dim); transition:color .4s, text-shadow .4s; } .wd span.on { color:var(--ck-text); text-shadow:0 0 14px color-mix(in srgb, var(--ck-accent) 70%, transparent); }
      @container (max-width:300px) { .words { font-size:1.05em; } }
      /* minimal */
      .min { display:flex; flex-direction:column; align-items:center; text-align:center; gap:.2em; } .bigt { font-size:5.4em; font-weight:200; letter-spacing:-.03em; line-height:1; font-variant-numeric:tabular-nums; } .bigt i { font-style:normal; color:var(--ck-accent); font-weight:300; animation:ck-bl 1s steps(2) infinite; } .bigt small { font-size:.28em; margin-left:.3em; font-weight:600; color:var(--ck-muted); letter-spacing:0; }
      .sec { font-size:1.1em; color:var(--ck-accent); font-weight:700; font-variant-numeric:tabular-nums; } .dt { color:var(--ck-muted); font-weight:600; margin-top:.3em; }
      .pbar { width:70%; height:4px; border-radius:2px; background:var(--ck-glass-b); margin-top:.9em; overflow:hidden; } .pbar u { display:block; height:100%; border-radius:2px; background:linear-gradient(90deg,var(--ck-warm),var(--ck-accent)); text-decoration:none; } .ptx { font-size:.75em; color:var(--ck-muted); }
      @container (max-width:300px) { .bigt { font-size:3.8em; } }
      @keyframes ck-bl { 50% { opacity:.25; } } @keyframes ck-flip { 0% { transform:scaleY(.1); opacity:.3; } 100% { transform:scaleY(1); opacity:1; } }
      @media (prefers-reduced-motion: reduce) { .colon, .bigt i, .fl.go span { animation:none; } }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">${this._body(n)}</ha-card>`;
    this._prev = {};
    this._tick(true);
  }

  _setText(sel, v) { const el = this.shadowRoot.querySelector(sel); if (el && el.textContent !== v) { el.textContent = v; return el; } return null; }

  _tick() {
    const c = this._config, root = this.shadowRoot;
    if (!c || !root.firstElementChild) return;
    const n = this._now(), hh = this._hh(n), mm = p2(n.m), ss = p2(n.s), st = c.style;
    const ampm = c.hour12 ? (n.h < 12 ? "AM" : "PM") : "";
    const key = `${n.d.getMinutes()}|${n.s}`;
    if (st === "analog") {
      const hand = (k, a) => { const el = root.querySelector(`[data-hand="${k}"]`); if (el) el.setAttribute("transform", `rotate(${a.toFixed(2)})`); };
      hand("h", ((n.h % 12) + n.m / 60 + n.s / 3600) * 30); hand("m", (n.m + n.s / 60) * 6); hand("s", (n.s + n.ms / 1000) * 6);
      this._setText("[data-date-short]", this._dateStr(n, { weekday: "short", day: "numeric" }));
      this._setText("[data-date]", cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long" })));
      return;
    }
    if (this._prev.k === key) return;
    this._prev.k = key;
    if (st === "flip") {
      const H = p2(hh), vals = { h0: H[0], h1: H[1], m0: mm[0], m1: mm[1], s0: ss[0], s1: ss[1] };
      Object.entries(vals).forEach(([k, v]) => { const sp = root.querySelector(`[data-fl="${k}"] span`); if (sp && sp.textContent !== v) { sp.textContent = v; const f = sp.parentNode; f.classList.remove("go"); void f.offsetWidth; f.classList.add("go"); } });
      this._setText("[data-ap]", ampm); return;
    }
    if (st === "day") {
      const t = root.querySelector("[data-time]");
      if (t) { t.firstChild.textContent = `${p2(hh)}:${mm}`; const sc = root.querySelector("[data-sec]"); if (sc) sc.textContent = ss; }
      const s = this._sun(n), arc = root.querySelector("[data-arc]"), bd = root.querySelector("[data-body]");
      if (s && arc && bd) {
        const f = Math.max(0, Math.min(1, (n.d.getTime() - s.a) / (s.b - s.a || 1)));
        const len = arc.getTotalLength ? arc.getTotalLength() : 340;
        arc.style.strokeDasharray = `${(len * f).toFixed(1)} ${len.toFixed(1)}`;
        const x = (1 - f) * (1 - f) * 12 + 2 * (1 - f) * f * 150 + f * f * 288, y = (1 - f) * (1 - f) * 86 + 2 * (1 - f) * f * -52 + f * f * 86;
        bd.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      }
      return;
    }
    if (st === "words") {
      const w = root.querySelector("[data-words]"); const html = this._words(n);
      if (w && w.innerHTML !== html) w.innerHTML = html;
      this._setText("[data-date]", `${hh}:${mm}${c.show_seconds ? ":" + ss : ""} · ${cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long" }))}`); return;
    }
    if (st === "minimal") {
      const t = root.querySelector("[data-time]");
      if (t) { t.firstChild.textContent = p2(hh); t.lastChild && t.querySelector("i") && (t.querySelector("i").nextSibling.textContent = mm); }
      this._setText("[data-sec]", ss); this._setText("[data-ap]", ampm);
      const pct = Math.round((n.secs / 86400) * 100), bar = root.querySelector("[data-pct]"); if (bar) bar.style.width = pct + "%";
      this._setText("[data-pcttx]", `${pct} % de la journée écoulée`);
      this._setText("[data-date]", cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long" }))); return;
    }
    // digitale
    const t = root.querySelector("[data-time]");
    if (t) t.firstChild.textContent = `${p2(hh)}:${mm}`;
    this._setText("[data-sec]", ss); this._setText("[data-greet]", this._greet(n)); this._setText("[data-ap]", ampm);
    const ring = root.querySelector("[data-ring]"); if (ring) ring.style.strokeDashoffset = String(138.2 * (1 - n.s / 60));
    this._setText("[data-date]", cap(this._dateStr(n, { weekday: "long", day: "numeric", month: "long" })));
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS, style: "Style de l'horloge", theme: "Thème", hour12: "Format 12 h (AM / PM)", show_seconds: "Afficher les secondes", show_date: "Afficher la date",
  show_greeting: "Afficher « Bonjour / Bonsoir » (style digital)", show_info: "Afficher la ligne d'infos (soleil, semaine)", sun_entity: "Entité du soleil (styles digital, volets, journée)" };
const SCHEMA = [
  { name: "style", selector: { select: { mode: "dropdown", options: STYLES.map(([value, label]) => ({ value, label })) } } },
  { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } },
  { type: "grid", name: "", schema: [{ name: "hour12", selector: { boolean: {} } }, { name: "show_seconds", selector: { boolean: {} } }, { name: "show_date", selector: { boolean: {} } },
    { name: "show_greeting", selector: { boolean: {} } }, { name: "show_info", selector: { boolean: {} } }] },
  { name: "sun_entity", selector: { entity: { domain: "sun" } } },
  { type: "expandable", name: "", title: "Nuance de couleur", schema: GV_FIELDS },
];

class ClockCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...DEFAULTS, ...config }; if (!this._form) this._build(); else this._form.data = this._config; }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._config; el.schema = SCHEMA; el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const cfg = { ...ev.detail.value };
      if (!cfg.sun_entity) delete cfg.sun_entity;
      this._config = cfg;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    });
    this._form = el; this.appendChild(el);
  }
}

customElements.define("clock-card", ClockCard);
customElements.define("clock-card-editor", ClockCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "clock-card", name: "Clock Card (FR)", description: "Horloge en 6 styles : digitale, analogique, à volets, journée et soleil, en lettres, minimaliste.", preview: true });
console.info(`%c CLOCK-CARD %c v${CARD_VERSION} `, "color:#fff;background:#6a5acd;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#6a5acd;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
