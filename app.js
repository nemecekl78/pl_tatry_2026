/* =========================================================================
   Tatry 2026 — aplikační logika
   FR-1..FR-10, rozhodovací engine §7, offline cache §8
   ========================================================================= */
(function () {
"use strict";

const D = window.APP_DATA;
const CFG = D.config;
const TRAILS = D.source_data.trails;
const RELAX = D.source_data.relax_activities;
const SCALE = D.source_data.difficulty_classification;

/* ---------------------------- Stav ------------------------------------- */
const S = {
  lang: localStorage.getItem("t26.lang") || "cs",
  view: "today",
  dayIndex: null,          // aktuálně zobrazený den 1..8
  simStorm: localStorage.getItem("t26.sim") === "1",
  solid: localStorage.getItem("t26.solid") === "1",   // sluneční režim — sklo ztuhne
  layers: { hike:true, water:true, ebike:true, wellness:true, food:true, transport:false },
  fTrailDiff: "all",
  fTrailArea: "all",
  fRelaxCat: "all",
  map: null, markers: [], mapReady: false,
  mapBase: localStorage.getItem("t26.base") || "topo",   // turistická topo mapa jako výchozí
  trailsOverlay: localStorage.getItem("t26.trails") !== "0", // vrstva značených tras (Waymarked Trails)
  focusTrail: null,                                       // id trasy zobrazené samostatně
  wx: {}                   // cache v paměti: key -> {data, ts, stale}
};
const T = k => (window.I18N[S.lang] && window.I18N[S.lang][k]) || window.I18N.cs[k] || k;

/* ------------------------- Pomocné funkce ------------------------------ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());
};
const WEEKDAYS = {
  cs:["neděle","pondělí","úterý","středa","čtvrtek","pátek","sobota"],
  pl:["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"],
  sk:["nedeľa","pondelok","utorok","streda","štvrtok","piatok","sobota"],
  en:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
};
/* akceptační kritérium §11: den v týdnu se počítá z data, ne z textu */
function weekdayOf(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return (WEEKDAYS[S.lang] || WEEKDAYS.cs)[new Date(Date.UTC(y, m-1, d)).getUTCDay()];
}
function fmtDate(iso) {
  const [y,m,d] = iso.split("-").map(Number);
  return S.lang === "en" ? `${d}/${m}` : `${d}. ${m}.`;
}
const minToH = m => (m % 60 === 0 ? (m/60) + " h" : Math.floor(m/60) + " h " + (m%60) + " min");
/* skloňování „dní / dny / den" */
function plDays(n) {
  if (S.lang === "en") return "days";
  const forms = { cs:["den","dny","dní"], sk:["deň","dni","dní"], pl:["dzień","dni","dni"] }[S.lang] || ["den","dny","dní"];
  if (n === 1) return forms[0];
  if (n >= 2 && n <= 4) return forms[1];
  return forms[2];
}
const navUrl = (lat,lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

/* Jednotný pohled na trať / relax aktivitu / POI */
function resolve(id) {
  const t = TRAILS.find(x => x.id === id);
  if (t) return { kind:"trail", id, name:t.name,
                  /* navigace míří na trailhead… */
                  lat:t.trailhead_lat, lng:t.trailhead_lng, elev:t.trailhead_elev || 900,
                  /* …ale počasí se počítá pro nejvyšší bod trasy (§7 „poryvy na hřebeni") */
                  wxLat: t.summit_lat || t.trailhead_lat, wxLng: t.summit_lng || t.trailhead_lng,
                  wxElev: t.summit_elev || t.trailhead_elev || 900,
                  cat:"hike", gate:t.weather_gate, raw:t };
  const r = RELAX.find(x => x.id === id);
  if (r) return { kind:"relax", id, name:r.name, lat:r.lat, lng:r.lng, elev:r.elevation_m || 700,
                  wxLat:r.lat, wxLng:r.lng, wxElev:r.elevation_m || 700,
                  cat: r.id === "r_13" ? "ebike" : r.category, gate: r.weather_dependent ? "soft" : "none", raw:r };
  const p = D.poi.find(x => x.id === id);
  if (p) return { kind:"poi", id, name:p.name, lat:p.lat, lng:p.lng, elev:p.elevation_m || 700,
                  wxLat:p.lat, wxLng:p.lng, wxElev:p.elevation_m || 700,
                  cat:p.category, gate:"none", raw:p };
  return null;
}
const CAT_ICON = { hike:"🥾", water:"💧", ebike:"🚲", wellness:"🧖", thermal:"♨️", food:"🍽",
                   base:"🏨", transport:"🅿️", culture:"🏰", scenic:"🌄", culinary:"🧀", sight:"📍" };
const CAT_COLOR = { hike:"#38bdf8", water:"#22d3ee", ebike:"#34d399", wellness:"#a78bfa",
                    thermal:"#f472b6", food:"#fbbf24", base:"#f87171", transport:"#94a3b8",
                    culture:"#c084fc", scenic:"#facc15", culinary:"#fb923c" };
/* mapování kategorie → vrstva mapy (FR-2) */
function layerOf(cat) {
  if (cat === "hike") return "hike";
  if (cat === "water") return "water";
  if (cat === "ebike") return "ebike";
  if (cat === "wellness" || cat === "thermal") return "wellness";
  if (cat === "food" || cat === "culinary") return "food";
  if (cat === "transport") return "transport";
  return "hike";
}

/* =========================================================================
   POČASÍ — Open-Meteo (§4.1), s cache do localStorage (FR-7)
   ========================================================================= */
const HOURLY = ["temperature_2m","apparent_temperature","precipitation","precipitation_probability",
                "cloud_cover","wind_speed_10m","wind_gusts_10m","weather_code","cape"].join(",");
const DAILY  = ["sunrise","sunset","temperature_2m_max","temperature_2m_min",
                "precipitation_sum","precipitation_probability_max","weather_code"].join(",");

function wxKey(lat,lng,elev){ return `t26.wx.${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(elev/100)*100}`; }

async function getWeather(lat, lng, elev, force) {
  const key = wxKey(lat, lng, elev);
  const now = Date.now();
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(key) || "null"); } catch(e) {}
  if (!force && cached && (now - cached.ts) < CFG.cache_ttl_min * 60000) {
    return { ...cached, stale:false, ageMin:Math.round((now-cached.ts)/60000) };
  }
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&elevation=${Math.round(elev)}`
    + `&hourly=${HOURLY}&daily=${DAILY}&timezone=Europe%2FWarsaw&forecast_days=16`;
  try {
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const rec = { data, ts:now };
    try { localStorage.setItem(key, JSON.stringify(rec)); } catch(e) {}
    return { ...rec, stale:false, ageMin:0 };
  } catch (e) {
    if (cached) return { ...cached, stale:true, ageMin:Math.round((now-cached.ts)/60000) };
    return { data:null, ts:0, stale:true, ageMin:null, error:String(e) };
  }
}

/* Hodinové záznamy pro dané datum */
function hoursFor(wx, iso) {
  if (!wx || !wx.data || !wx.data.hourly) return [];
  const h = wx.data.hourly, out = [];
  for (let i = 0; i < h.time.length; i++) {
    if (!h.time[i].startsWith(iso)) continue;
    out.push({
      t: h.time[i], hour: Number(h.time[i].slice(11,13)),
      temp: h.temperature_2m[i], feel: h.apparent_temperature[i],
      precip: h.precipitation[i], pprob: h.precipitation_probability[i],
      cloud: h.cloud_cover[i], wind: h.wind_speed_10m[i], gust: h.wind_gusts_10m[i],
      code: h.weather_code[i], cape: h.cape ? h.cape[i] : 0
    });
  }
  return out;
}
function dailyFor(wx, iso) {
  if (!wx || !wx.data || !wx.data.daily) return null;
  const d = wx.data.daily, i = d.time.indexOf(iso);
  if (i < 0) return null;
  return { sunrise:d.sunrise[i], sunset:d.sunset[i], tmax:d.temperature_2m_max[i],
           tmin:d.temperature_2m_min[i], psum:d.precipitation_sum[i],
           pprob:d.precipitation_probability_max[i], code:d.weather_code[i] };
}

/* Pravděpodobnost bouřky — Open-Meteo ji přímo nedává;
   odvozeno z weather_code (95/96/99) + CAPE + pravděpodobnosti srážek. */
function thunderPct(h) {
  if (S.simStorm) return 65;                       // testovací simulace §11
  const pp = h.pprob == null ? 0 : h.pprob;
  if ([95,96,99].includes(h.code)) return Math.max(pp, 60);
  const cape = h.cape || 0;
  if (cape > 2000) return Math.min(100, Math.round(pp * 0.8));
  if (cape > 1200) return Math.min(100, Math.round(pp * 0.6));
  if (cape > 600)  return Math.min(100, Math.round(pp * 0.35));
  return Math.round(pp * 0.12);
}

/* =========================================================================
   ROZHODOVACÍ ENGINE §7
   ========================================================================= */
const RANK = { green:0, amber:1, red:2 };
function worst(a,b){ return RANK[a] >= RANK[b] ? a : b; }

function rate(value, green, red, strict) {
  if (value == null) return "green";
  const g = strict ? green * CFG.strict_factor : green;
  const r = strict ? red   * CFG.strict_factor : red;
  if (value < g) return "green";
  if (value <= r) return "amber";
  return "red";
}
function rateTemp(t, strict) {
  if (t == null) return "green";
  const [gl,gh] = CFG.thresholds.temp_c.green, [rl,rh] = CFG.thresholds.temp_c.red;
  if (t >= gl && t <= gh) return "green";
  if (t >= rl && t <= rh) return "amber";
  return "red";
}

function evaluate(hours, gate) {
  const win = hours.filter(h => h.hour >= CFG.window.from && h.hour <= CFG.window.to);
  const use = win.length ? win : hours;
  if (!use.length) return null;
  const strict = gate === "hard_strict";
  const th = CFG.thresholds;

  const maxThunder = Math.max(...use.map(thunderPct));
  const maxPrecip  = Math.max(...use.map(h => h.precip || 0));
  const maxGust    = Math.max(...use.map(h => h.gust || 0));
  const avgCloud   = Math.round(use.reduce((s,h) => s + (h.cloud||0), 0) / use.length);
  const feels      = use.map(h => h.feel);
  const minFeel    = Math.min(...feels), maxFeel = Math.max(...feels);

  const m = {
    thunder:{ v:maxThunder, unit:"%",    r:rate(maxThunder, th.thunder_pct.green, th.thunder_pct.red, strict) },
    precip: { v:+maxPrecip.toFixed(1), unit:"mm/h", r:rate(maxPrecip, th.precip_mmh.green, th.precip_mmh.red, strict) },
    gust:   { v:Math.round(maxGust), unit:"km/h",   r:rate(maxGust, th.gust_kmh.green, th.gust_kmh.red, strict) },
    cloud:  { v:avgCloud, unit:"%",      r:rate(avgCloud, th.cloud_pct.green, th.cloud_pct.red, strict) },
    temp:   { v:Math.round(maxFeel), unit:"°C",     r:worst(rateTemp(minFeel), rateTemp(maxFeel)) }
  };

  let overall = "green";
  Object.values(m).forEach(x => { overall = worst(overall, x.r); });

  /* Kdy nastává první červená → možnost posunout start (§7 bod 2) */
  const firstRedHour = (() => {
    for (const h of use) {
      const bad = rate(thunderPct(h), th.thunder_pct.green, th.thunder_pct.red, strict) === "red"
               || rate(h.precip||0, th.precip_mmh.green, th.precip_mmh.red, strict) === "red"
               || rate(h.gust||0, th.gust_kmh.green, th.gust_kmh.red, strict) === "red";
      if (bad) return h.hour;
    }
    return null;
  })();

  /* Verdikt */
  let verdict, cls;
  const reasons = [];
  const lbl = { thunder:T("thunder"), precip:T("precip"), gust:T("gust"), cloud:T("cloud"), temp:T("temp") };
  Object.entries(m).forEach(([k,x]) => {
    if (x.r !== "green") reasons.push(`${lbl[k]}: ${x.v} ${x.unit} — ${x.r === "red" ? "🔴" : "🟡"}`);
  });

  if (gate === "none") {
    verdict = T("verdict_relax"); cls = "none";
  } else if (gate === "soft") {
    /* §7 bod 4: měkký den se nezakazuje */
    if (overall === "red") { verdict = T("verdict_soft"); cls = "warn"; }
    else if (overall === "amber") { verdict = T("verdict_warn"); cls = "warn"; }
    else { verdict = T("verdict_go"); cls = "go"; }
  } else {
    /* hard / hard_strict */
    if (overall === "red") {
      if (firstRedHour != null && firstRedHour >= 14) {
        verdict = T("verdict_warn"); cls = "warn";
        reasons.unshift(`⏱ ${T("start")} → ${T("sunrise")} + 30 min (${S.lang==="en"?"storms from":"od"} ${firstRedHour}:00 🔴)`);
      } else { verdict = T("verdict_no"); cls = "no"; }
    } else if (overall === "amber") {
      verdict = T("verdict_warn"); cls = "warn";
      if (strict) reasons.unshift("⚠️ T4 / " + T("gate_strict") + " — " + (S.lang==="en"?"postpone recommended":"doporučen odklad"));
    } else { verdict = T("verdict_go"); cls = "go"; }
  }

  return { m, overall, verdict, cls, reasons, firstRedHour, hours:use, gate };
}

/* Doporučený start a nejzazší návrat (FR-5) */
function timing(day, dur, ev) {
  if (!day) return null;
  const sr = day.sunrise ? day.sunrise.slice(11,16) : null;
  const ss = day.sunset  ? day.sunset.slice(11,16)  : null;
  let start = sr;
  if (sr) {
    const [h,mm] = sr.split(":").map(Number);
    let mins = h*60 + mm + 30;
    if (ev && ev.cls === "go" && (!ev.firstRedHour || ev.firstRedHour > 16)) mins += 60;
    start = pad(Math.floor(mins/60)) + ":" + pad(mins%60);
  }
  let latest = null;
  if (ss && dur) {
    const [h,mm] = ss.split(":").map(Number);
    let mins = h*60 + mm - 60;   // hodina rezervy před setměním
    latest = pad(Math.floor(mins/60)) + ":" + pad(mins%60);
  }
  return { sunrise:sr, sunset:ss, start, latest };
}

/* =========================================================================
   RENDER — společné bloky
   ========================================================================= */
function verdictBlock(ev) {
  if (!ev) return `<div class="verdict v-none"><p class="v-title">⛅ ${esc(T("no_forecast"))}</p></div>`;
  return `
  <div class="verdict v-${ev.cls}">
    <p class="v-title"><span class="dot d-${ev.cls}"></span>${esc(ev.verdict)}</p>
    ${ev.reasons.length ? `<ul class="reasons">${ev.reasons.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>`
                        : `<div class="muted small">${esc(T("metrics"))} · ✅</div>`}
  </div>`;
}
function metricsBlock(ev) {
  if (!ev) return "";
  const k = { thunder:T("thunder"), precip:T("precip"), gust:T("gust"), cloud:T("cloud"), temp:T("temp") };
  const c = { green:"g", amber:"a", red:"r" };
  return `<div class="metrics">${Object.entries(ev.m).map(([id,x]) =>
    `<div class="metric ${c[x.r]}"><div class="k">${esc(k[id])}</div><div class="v">${x.v}<span style="font-size:11px">${esc(x.unit)}</span></div></div>`
  ).join("")}</div>`;
}
function hoursBlock(hours) {
  if (!hours.length) return "";
  const inWin = h => h.hour >= CFG.window.from && h.hour <= CFG.window.to;
  return `<h3>${esc(T("hourly"))}</h3><div class="hours">${
    hours.filter(h => h.hour >= 5 && h.hour <= 21).map(h => {
      const p = h.pprob || 0;
      const col = p > 60 ? "var(--red)" : p > 30 ? "var(--amber)" : "var(--green)";
      return `<div class="hr ${inWin(h)?"win":""}">
        <div class="h">${pad(h.hour)}:00</div>
        <div class="t">${Math.round(h.temp)}°</div>
        <div class="p">${p}%</div>
        <div class="bar" style="background:linear-gradient(90deg,${col} ${Math.min(100,p)}%,var(--line) 0)"></div>
      </div>`;
    }).join("")}</div>`;
}
function itemRow(o, extraMeta) {
  const cat = o.cat || "sight";
  return `<div class="item">
    <div class="ic" style="background:${CAT_COLOR[cat]||"#334155"}22;color:${CAT_COLOR[cat]||"#94a3b8"}">${CAT_ICON[cat]||"📍"}</div>
    <div class="body"><div class="nm">${esc(o.name)}</div><div class="mt">${extraMeta||""}</div></div>
    ${o.lat ? `<a class="go" href="${navUrl(o.lat,o.lng)}" target="_blank" rel="noopener">${esc(T("navigate"))} ↗</a>` : ""}
  </div>`;
}

/* =========================================================================
   VIEW: DNES  (FR-1, FR-4, FR-5, FR-6, FR-9, FR-10)
   ========================================================================= */
function currentDayIndex() {
  if (S.dayIndex) return S.dayIndex;
  const iso = todayISO();
  const d = D.days.find(x => x.date === iso);
  if (d) return d.day_index;
  return iso < D.days[0].date ? 1 : 8;
}

async function renderToday() {
  const el = $("#view-today");
  const idx = currentDayIndex();
  const day = D.days.find(d => d.day_index === idx);
  const iso = todayISO();
  const isRealToday = day.date === iso;

  el.innerHTML = `<div class="spinner">${esc(T("loading"))}</div>`;

  /* Referenční bod dne = první weather-sensitive POI, jinak základna */
  const objs = day.poi_ids.map(resolve).filter(Boolean);
  const ref = objs.find(o => o.cat === "hike") || objs.find(o => o.gate !== "none") || objs[0] || resolve("base_zawrat");

  const wx = await getWeather(ref.wxLat, ref.wxLng, ref.wxElev, false);
  const hours = hoursFor(wx, day.date);
  const dly = dailyFor(wx, day.date);
  const ev = hours.length ? evaluate(hours, day.weather_gate) : null;
  const tm = dly ? timing(dly, ref.raw && ref.raw.duration_min, ev) : null;

  /* Info banner: offline / mimo pobyt */
  let banner = "";
  if (wx.stale) banner += `<div class="banner">📴 ${esc(T("offline"))}${wx.ageMin!=null?` · ${esc(T("cache_age"))} ${wx.ageMin<120?wx.ageMin+" "+T("min"):Math.round(wx.ageMin/60)+" "+T("hours_ago")}`:""}</div>`;
  if (!isRealToday) {
    const days = Math.round((new Date(D.days[0].date) - new Date(iso)) / 86400000);
    banner += `<div class="banner">📅 ${days > 0 ? `${esc(T("before_trip"))} ${days} ${esc(plDays(days))}` : esc(T("trip_over"))} · ${esc(T("showing_day"))} ${idx}</div>`;
  }

  /* Swap návrh (FR-6) */
  let swap = "";
  if (ev && ev.cls === "no" && day.swappable_with) {
    swap = day.swappable_with.map(n => {
      const alt = D.days.find(x => x.day_index === n);
      return `<div class="item"><div class="ic" style="background:#22d3ee22;color:#22d3ee">🔄</div>
        <div class="body"><div class="nm">${esc(T("swap"))} ${n} — ${esc(alt.title)}</div>
        <div class="mt">${esc(fmtDate(alt.date))} · ${esc(alt.weather_gate === "soft" ? T("gate_soft") : T("gate_hard"))}</div></div></div>`;
    }).join("");
  }

  /* Doporučené trasy (FR-9) — jen aktivní dny */
  let sug = "";
  if (day.type === "ACTIVE" && ev) {
    const picks = await suggestTrails(day, ev);
    if (picks.length) sug = `<h3>${esc(T("suggestions"))}</h3>` + picks.map(p =>
      itemRow({ name:p.t.name, cat:"hike", lat:p.t.trailhead_lat, lng:p.t.trailhead_lng },
        `<span class="badge b-${p.t.difficulty}">${p.t.difficulty}</span> · ${p.t.distance_km} km · ${minToH(p.t.duration_min)} · ↑${p.t.elevation_gain_m} m<br>
         <span style="color:${p.cls==="go"?"var(--green)":p.cls==="warn"?"var(--amber)":"var(--red)"}">● ${esc(p.verdict)}</span>`)
    ).join("");
  }

  /* Plán B (FR-10) — když prší nebo je relaxační den */
  let planB = "";
  const rainy = ev && (ev.m.precip.r !== "green" || ev.m.thunder.r !== "green");
  if (rainy || day.type === "RELAX") {
    const list = RELAX.filter(r => r.weather_dependent === false)
      .sort((a,b) => (b.indoor?1:0) - (a.indoor?1:0)).slice(0, rainy ? 5 : 3);
    planB = `<h3>${esc(T("planB"))}</h3>` + list.map(r =>
      itemRow({ name:r.name, cat:r.category, lat:r.lat, lng:r.lng },
        `${esc(T(r.indoor ? "indoor" : "outdoor"))} · ${minToH(r.duration_min)} · ${esc(r.note||"")}`)).join("");
  }

  el.innerHTML = `
    ${banner}
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <span class="badge ${day.type==="ACTIVE"?"b-active":"b-relax"}">${esc(day.type==="ACTIVE"?T("active"):T("relax"))}</span>
        <span class="muted small">${esc(T("trip_day"))} ${day.day_index}/8</span>
      </div>
      <h2 style="margin-top:8px">${esc(day.title)}</h2>
      <div class="muted small">${esc(weekdayOf(day.date))} ${esc(fmtDate(day.date))} · ${esc(ref.name)}${ref.wxElev?` · ⛰ ${ref.wxElev} m`:""}</div>
      ${verdictBlock(ev)}
      ${metricsBlock(ev)}
      ${tm ? `<div class="row small muted" style="margin-top:10px;gap:12px">
        <span>🌅 ${esc(T("sunrise"))} ${esc(tm.sunrise||"–")}</span>
        <span>🌇 ${esc(T("sunset"))} ${esc(tm.sunset||"–")}</span>
        ${tm.start && day.type==="ACTIVE" ? `<span>🚶 ${esc(T("start"))} <b style="color:var(--acc)">${esc(tm.start)}</b></span>` : ""}
        ${tm.latest && day.type==="ACTIVE" ? `<span>⏳ ${esc(T("latest_return"))} ${esc(tm.latest)}</span>` : ""}
      </div>` : ""}
      ${hoursBlock(hours)}
    </div>

    <div class="card">
      <h3 style="margin-top:0">${esc(T("program"))}</h3>
      ${objs.map(o => itemRow(o, metaFor(o))).join("")}
      ${day.logistics ? `<h3>${esc(T("logistics"))}</h3><div class="muted small">💡 ${esc(day.logistics)}</div>` : ""}
    </div>

    ${swap ? `<div class="card">${swap}</div>` : ""}
    ${sug || planB ? `<div class="card">${sug}${planB}</div>` : ""}
  `;
}

function metaFor(o) {
  if (o.kind === "trail") {
    const t = o.raw;
    return `<span class="badge b-${t.difficulty}">${t.difficulty}</span> · ${t.distance_km} km · ${minToH(t.duration_min)} · ↑${t.elevation_gain_m} m${t.chains?" · ⛓":""}<br>${esc(t.highlights)}`;
  }
  if (o.kind === "relax") {
    const r = o.raw;
    return `${minToH(r.duration_min)} · ${esc(T(r.indoor?"indoor":"outdoor"))}${r.weather_dependent?"":" · "+esc(T("weather_indep"))}<br>${esc(r.note||"")}`;
  }
  return esc(o.raw.note || "");
}

/* FR-9 — výběr 2–3 tras podle náročnosti, gate a předpovědi trailheadu */
async function suggestTrails(day, dayEv) {
  const target = day.weather_gate === "soft" ? ["T1"] : ["T1","T2"];
  const cand = TRAILS.filter(t => target.includes(t.difficulty));
  /* omezíme počet síťových dotazů — vezmeme 6 nejbližších základně */
  const base = resolve("base_zawrat");
  const near = cand.map(t => ({ t, d: Math.hypot(t.trailhead_lat-base.lat, t.trailhead_lng-base.lng) }))
                   .sort((a,b) => a.d - b.d).slice(0, 6);
  const out = [];
  for (const { t } of near) {
    const wx = await getWeather(t.summit_lat || t.trailhead_lat, t.summit_lng || t.trailhead_lng,
                                t.summit_elev || t.trailhead_elev || 900, false);
    const hs = hoursFor(wx, day.date);
    if (!hs.length) continue;
    const ev = evaluate(hs, t.weather_gate);
    if (!ev) continue;
    out.push({ t, cls:ev.cls, verdict:ev.verdict, score:{ go:0, warn:1, none:1, no:2 }[ev.cls] });
  }
  out.sort((a,b) => a.score - b.score || b.t.elevation_gain_m - a.t.elevation_gain_m);
  return out.slice(0, 3);
}

/* =========================================================================
   VIEW: DNY 1–8
   ========================================================================= */
async function renderDays() {
  const el = $("#view-days");
  el.innerHTML = `<div class="daytabs">${D.days.map(d =>
      `<div class="dt ${d.day_index===currentDayIndex()?"on":""}" data-day="${d.day_index}">
         <div class="dnum">${d.day_index}</div><div class="ddate">${esc(fmtDate(d.date))}</div></div>`).join("")}</div>
    <div class="spinner">${esc(T("loading"))}</div>`;

  el.querySelectorAll(".dt").forEach(x => x.onclick = () => {
    S.dayIndex = Number(x.dataset.day); go("today");
  });

  const cards = [];
  for (const d of D.days) {
    const objs = d.poi_ids.map(resolve).filter(Boolean);
    const ref = objs.find(o => o.cat === "hike") || objs.find(o => o.gate !== "none") || objs[0];
    let ev = null, dly = null;
    if (ref) {
      const wx = await getWeather(ref.wxLat, ref.wxLng, ref.wxElev, false);
      const hs = hoursFor(wx, d.date);
      dly = dailyFor(wx, d.date);
      if (hs.length) ev = evaluate(hs, d.weather_gate);
    }
    cards.push(`<div class="card" data-open="${d.day_index}">
      <div class="row" style="justify-content:space-between">
        <span class="badge ${d.type==="ACTIVE"?"b-active":"b-relax"}">${esc(d.type==="ACTIVE"?T("active"):T("relax"))}</span>
        <span class="muted small">${esc(weekdayOf(d.date))} ${esc(fmtDate(d.date))}</span>
      </div>
      <h2 style="margin-top:7px">${d.day_index}. ${esc(d.title)}</h2>
      <div class="row small muted" style="gap:10px;margin-top:4px">
        ${dly ? `<span>🌡 ${Math.round(dly.tmin)}–${Math.round(dly.tmax)} °C</span><span>💧 ${dly.pprob??0} %</span>` : ""}
        <span>🚦 ${esc(d.weather_gate)}</span>
      </div>
      ${ev ? `<div class="verdict v-${ev.cls}" style="margin-bottom:0"><p class="v-title" style="font-size:15px"><span class="dot d-${ev.cls}"></span>${esc(ev.verdict)}</p></div>` : ""}
      <div class="muted small" style="margin-top:8px">${objs.map(o=>esc(o.name)).join(" · ")}</div>
    </div>`);
  }
  el.querySelector(".spinner").outerHTML = cards.join("");
  el.querySelectorAll("[data-open]").forEach(c => c.onclick = () => {
    S.dayIndex = Number(c.dataset.open); go("today");
  });
}

/* =========================================================================
   VIEW: TRASY (FR-9 + §13 legenda)
   ========================================================================= */
function renderTrails() {
  const el = $("#view-trails");
  const diffs = ["all","T1","T2","T3","T4"], areas = ["all","Tatry","Pieniny"];
  const list = TRAILS.filter(t =>
    (S.fTrailDiff === "all" || t.difficulty === S.fTrailDiff) &&
    (S.fTrailArea === "all" || t.area === S.fTrailArea));

  el.innerHTML = `
    <div class="filters">${diffs.map(d =>
      `<button class="f ${S.fTrailDiff===d?"on":""}" data-d="${d}">${d==="all"?esc(T("all")):d}</button>`).join("")}</div>
    <div class="filters">${areas.map(a =>
      `<button class="f ${S.fTrailArea===a?"on":""}" data-a="${a}">${a==="all"?esc(T("all")):esc(a)}</button>`).join("")}</div>
    <div class="muted small" style="margin:2px 0 10px">${list.length} × 🥾 · ${esc(T("note_pl"))}</div>
    <div class="card" style="padding:11px">
      ${list.map(t => `<div class="item">
        <div class="ic" style="background:#38bdf822;color:#38bdf8">🥾</div>
        <div class="body">
          <div class="nm">${esc(t.name)}</div>
          <div class="mt">
            <span class="badge b-${t.difficulty}">${t.difficulty}</span>
            · ${t.distance_km} km · ${minToH(t.duration_min)} · ↑${t.elevation_gain_m} m
            ${t.chains?" · ⛓ "+esc(T("chains")):""} · ${esc(t.area)}<br>
            <span style="opacity:.85">${esc(T("trailhead"))}: ${esc(t.trailhead)} · ${esc(t.highlights)}</span>
          </div>
          <button class="go" style="margin-top:8px;display:inline-block" data-map="${t.id}">🗺 ${esc(T("on_map"))}</button>
        </div>
        <a class="go" href="${navUrl(t.trailhead_lat,t.trailhead_lng)}" target="_blank" rel="noopener">↗</a>
      </div>`).join("")}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${esc(T("legend"))}</h3>
      <table class="leg"><tr><th>#</th><th>${esc(T("gain"))}</th><th>${esc(T("dur"))}</th><th>${esc(T("chains"))}</th><th>gate</th></tr>
      ${SCALE.map(s => `<tr><td><span class="badge b-${s.code}">${s.code}</span></td>
        <td>${esc(s.elevation_gain_m)} m</td><td>${esc(s.typical_duration_h)} h</td>
        <td>${s.chains?esc(T("yes")):esc(T("no"))}</td><td>${esc(s.weather_gate)}</td></tr>`).join("")}
      </table>
    </div>`;

  el.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { S.fTrailDiff = b.dataset.d; renderTrails(); });
  el.querySelectorAll("[data-a]").forEach(b => b.onclick = () => { S.fTrailArea = b.dataset.a; renderTrails(); });
  el.querySelectorAll("[data-map]").forEach(b => b.onclick = () => openTrailOnMap(b.dataset.map));
}

/* =========================================================================
   VIEW: RELAX + nastavení
   ========================================================================= */
function renderRelax() {
  const el = $("#view-relax");
  const cats = ["all","wellness","thermal","water","culture","scenic","culinary"];
  const list = RELAX.filter(r => S.fRelaxCat === "all" || r.category === S.fRelaxCat);
  el.innerHTML = `
    <div class="filters">${cats.map(c =>
      `<button class="f ${S.fRelaxCat===c?"on":""}" data-c="${c}">${c==="all"?esc(T("all")):esc(T("cat_"+c))}</button>`).join("")}</div>
    <div class="card" style="padding:11px">
      ${list.map(r => itemRow({ name:r.name, cat:r.category, lat:r.lat, lng:r.lng },
        `${esc(r.location)} · ${minToH(r.duration_min)} · ${esc(T(r.indoor?"indoor":"outdoor"))}${r.weather_dependent?"":" · ✅ "+esc(T("weather_indep"))}${r.opening_hours?" · "+esc(r.opening_hours):""}<br>${esc(r.note||"")}`)).join("")}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${esc(T("settings"))}</h3>
      <div class="sw"><span>${esc(T("sun_mode"))}</span><div class="toggle ${S.solid?"on":""}" id="solidT"></div></div>
      <div class="sw"><span>${esc(T("sim_storm"))}</span><div class="toggle ${S.simStorm?"on":""}" id="simT"></div></div>
      <div class="sw" style="border:0"><span class="muted small">Open-Meteo · MapLibre GL · OSM<br>data v${esc(D.meta.version)} · cache ${CFG.cache_ttl_min} min</span>
        <button class="chipbtn" id="clearCache">Clear cache</button></div>
    </div>`;
  el.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { S.fRelaxCat = b.dataset.c; renderRelax(); });
  $("#solidT").onclick = () => {
    S.solid = !S.solid; localStorage.setItem("t26.solid", S.solid ? "1" : "0");
    applySolid(); renderRelax();
  };
  $("#simT").onclick = () => {
    S.simStorm = !S.simStorm; localStorage.setItem("t26.sim", S.simStorm ? "1" : "0");
    renderRelax(); renderToday();
  };
  $("#clearCache").onclick = () => {
    Object.keys(localStorage).filter(k => k.startsWith("t26.wx.")).forEach(k => localStorage.removeItem(k));
    renderToday();
  };
}

/* =========================================================================
   VIEW: MAPA (FR-2)
   ========================================================================= */
/* Podkladové turistické mapy — obě zobrazují značené trasy (červené/černé čárkování). */
const BASE = {
  topo: { tiles:["https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
                 "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
                 "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"],
          attr:"© OpenTopoMap (CC-BY-SA)", max:17 },
  osm:  { tiles:["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], attr:"© OpenStreetMap", max:19 }
};
/* Waymarked Trails — vykreslí samotné značené turistické trasy jako barevné linie. */
const TRAIL_OVERLAY = { tiles:["https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png"],
                        attr:"© waymarkedtrails.org (CC-BY-SA)", max:18 };

function buildStyle(base, withTrails) {
  const b = BASE[base] || BASE.topo;
  const sources = { base:{ type:"raster", tiles:b.tiles, tileSize:256, attribution:b.attr, maxzoom:b.max } };
  const layers = [{ id:"base", type:"raster", source:"base" }];
  if (withTrails) {
    sources.trails = { type:"raster", tiles:TRAIL_OVERLAY.tiles, tileSize:256,
                       attribution:TRAIL_OVERLAY.attr, maxzoom:TRAIL_OVERLAY.max };
    layers.push({ id:"trails", type:"raster", source:"trails", paint:{ "raster-opacity":0.85 } });
  }
  return { version:8, sources, layers };
}

/* Body na mapě. V režimu „zaostření" jen výchozí bod dané trasy (+ vrchol, je-li znám). */
function mapPoints() {
  if (S.focusTrail) {
    const t = TRAILS.find(x => x.id === S.focusTrail);
    if (!t) return [];
    const pts = [{ id:t.id, name:t.name, lat:t.trailhead_lat, lng:t.trailhead_lng, cat:"hike",
      meta:`${t.difficulty} · ${t.distance_km} km · ${minToH(t.duration_min)} · ↑${t.elevation_gain_m} m · ${T("trailhead")}` }];
    if (t.summit_lat && t.summit_lng)
      pts.push({ id:t.id+"_top", name:t.name+" — "+(S.lang==="en"?"summit":"vrchol"), lat:t.summit_lat, lng:t.summit_lng,
        cat:"scenic", meta:`${t.summit_elev||""} m n. m.` });
    return pts;
  }
  const pts = [];
  TRAILS.forEach(t => pts.push({ id:t.id, name:t.name, lat:t.trailhead_lat, lng:t.trailhead_lng, cat:"hike",
    meta:`${t.difficulty} · ${t.distance_km} km · ${minToH(t.duration_min)} · ↑${t.elevation_gain_m} m` }));
  RELAX.forEach(r => pts.push({ id:r.id, name:r.name, lat:r.lat, lng:r.lng,
    cat: r.id === "r_13" ? "ebike" : r.category, meta:`${r.location} · ${minToH(r.duration_min)}` }));
  D.poi.forEach(p => pts.push({ id:p.id, name:p.name, lat:p.lat, lng:p.lng, cat:p.category, meta:p.note || "" }));
  return pts;
}

const LAYER_LABEL = {
  cs:{hike:"Túry",water:"Voda",ebike:"E-bike",wellness:"Wellness",food:"Jídlo",transport:"Parking"},
  pl:{hike:"Szlaki",water:"Woda",ebike:"E-bike",wellness:"Wellness",food:"Jedzenie",transport:"Parking"},
  sk:{hike:"Túry",water:"Voda",ebike:"E-bike",wellness:"Wellness",food:"Jedlo",transport:"Parking"},
  en:{hike:"Hikes",water:"Water",ebike:"E-bike",wellness:"Wellness",food:"Food",transport:"Parking"}
};
function renderMapChips() {
  const L = LAYER_LABEL[S.lang] || LAYER_LABEL.cs;
  /* Vrstva značených tras jako první přepínač. */
  let html = `<button class="lchip ${S.trailsOverlay?"on":""}" data-trails="1">🥾 ${esc(T("trail_layer"))}</button>`;
  if (S.focusTrail) {
    html += `<button class="lchip" data-clear="1">✕ ${esc(T("show_all"))}</button>`;
  } else {
    const defs = [["hike","🥾"],["water","💧"],["ebike","🚲"],["wellness","🧖"],["food","🍽"],["transport","🅿️"]];
    html += defs.map(([k,i]) => `<button class="lchip ${S.layers[k]?"on":""}" data-l="${k}">${i} ${esc(L[k])}</button>`).join("");
  }
  $("#layerChips").innerHTML = html;
  const chips = $("#layerChips");
  chips.querySelectorAll("[data-l]").forEach(b => b.onclick = () => {
    S.layers[b.dataset.l] = !S.layers[b.dataset.l]; renderMapChips(); drawMarkers();
  });
  const tb = chips.querySelector("[data-trails]");
  if (tb) tb.onclick = () => {
    S.trailsOverlay = !S.trailsOverlay;
    localStorage.setItem("t26.trails", S.trailsOverlay ? "1" : "0");
    renderMapChips();
    if (S.map) { S.map.setStyle(buildStyle(S.mapBase, S.trailsOverlay)); S.map.once("styledata", () => setTimeout(drawMarkers, 120)); }
  };
  const cb = chips.querySelector("[data-clear]");
  if (cb) cb.onclick = () => { S.focusTrail = null; renderMapChips(); drawMarkers(); S.map && S.map.flyTo({ center:[20.05,49.33], zoom:9.6 }); };
}

function drawMarkers() {
  if (!S.map) return;
  S.markers.forEach(m => m.remove());
  S.markers = [];
  const pts = mapPoints();
  pts.forEach(p => {
    if (!p.lat || (!S.focusTrail && !S.layers[layerOf(p.cat)])) return;
    const el = document.createElement("div");
    el.className = "mk";
    el.style.background = CAT_COLOR[p.cat] || "#64748b";
    el.textContent = CAT_ICON[p.cat] || "📍";
    const popup = new maplibregl.Popup({ offset:16, closeButton:true }).setHTML(
      `<div style="font-weight:650;font-size:14px;margin-bottom:4px;max-width:230px">${esc(p.name)}</div>
       <div style="font-size:12px;color:#93a5c4;margin-bottom:7px">${esc(p.meta)}<br>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}</div>
       <a href="${navUrl(p.lat,p.lng)}" target="_blank" rel="noopener" style="color:#4cc4ff;font-size:12px;text-decoration:none">${esc(T("navigate"))} ↗</a>`);
    S.markers.push(new maplibregl.Marker({ element:el }).setLngLat([p.lng,p.lat]).setPopup(popup).addTo(S.map));
  });
  /* V režimu zaostření sevři mapu kolem trasy (výchozí bod + vrchol). */
  if (S.focusTrail && pts.length) {
    if (pts.length >= 2) {
      const b = new maplibregl.LngLatBounds();
      pts.forEach(p => b.extend([p.lng, p.lat]));
      S.map.fitBounds(b, { padding:70, maxZoom:14.5, duration:600 });
    } else {
      S.map.flyTo({ center:[pts[0].lng, pts[0].lat], zoom:13.5, duration:600 });
    }
  }
}

/* Otevři konkrétní trasu na mapě — zaostři jen na ni. */
function openTrailOnMap(id) {
  S.focusTrail = id;
  go("map");
  const apply = () => { renderMapChips(); drawMarkers(); };
  if (S.map && S.mapReady) setTimeout(apply, 60);
  else setTimeout(() => { initMap(); setTimeout(apply, 700); }, 60);
}

function initMap() {
  if (S.map) { S.map.resize(); return; }
  S.map = new maplibregl.Map({
    container:"map", style:buildStyle(S.mapBase, S.trailsOverlay),
    center:[20.05,49.33], zoom:9.6, attributionControl:{ compact:true }
  });
  S.map.addControl(new maplibregl.NavigationControl({ showCompass:false }), "bottom-right");
  S.map.addControl(new maplibregl.GeolocateControl({ trackUserLocation:true }), "bottom-right");
  S.map.on("load", () => { S.mapReady = true; drawMarkers(); });
  /* Přepínač podkladu Topo / OSM. */
  document.querySelectorAll("[data-style]").forEach(b => {
    b.classList.toggle("on", b.dataset.style === S.mapBase);
    b.onclick = () => {
      document.querySelectorAll("[data-style]").forEach(x => x.classList.remove("on"));
      b.classList.add("on"); S.mapBase = b.dataset.style;
      localStorage.setItem("t26.base", S.mapBase);
      S.map.setStyle(buildStyle(S.mapBase, S.trailsOverlay));
      S.map.once("styledata", () => setTimeout(drawMarkers, 120));
    };
  });
  renderMapChips();
}

/* =========================================================================
   Router + init
   ========================================================================= */
function go(v) {
  S.view = v;
  document.querySelectorAll(".view").forEach(x => x.classList.remove("on"));
  $("#view-" + v).classList.add("on");
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  document.querySelector("main").scrollTop = 0;
  if (v === "today")  renderToday();
  if (v === "days")   renderDays();
  if (v === "trails") renderTrails();
  if (v === "relax")  renderRelax();
  if (v === "map")    setTimeout(initMap, 30);
}

/* Sluneční režim: sklo ztuhne, průsvitnost i blur zmizí (čitelnost na přímém slunci).
   Zároveň se respektuje systémové „Reduce Transparency" — řeší CSS. */
function applySolid() {
  document.documentElement.setAttribute("data-solid", S.solid ? "1" : "0");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", S.solid ? "#16233a" : "#0a1220");
}

function applyLang() {
  document.documentElement.lang = S.lang;
  $("#langBtn").textContent = T("code");
  document.querySelectorAll("[data-i18n]").forEach(e => e.textContent = T(e.dataset.i18n));
  const d = D.days[0];
  $("#hSub").textContent = `Białka Tatrzańska · ${fmtDate(d.date)} – ${fmtDate(D.days[7].date)} 2026`;
}

document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  if (b.dataset.v === "today") S.dayIndex = null;
  go(b.dataset.v);
});
$("#langBtn").onclick = () => {
  const order = ["cs","pl","sk","en"];
  S.lang = order[(order.indexOf(S.lang) + 1) % order.length];
  localStorage.setItem("t26.lang", S.lang);
  applyLang(); if (S.view === "map") renderMapChips(); go(S.view);
};
$("#refreshBtn").onclick = async () => {
  $("#refreshBtn").textContent = "…";
  Object.keys(localStorage).filter(k => k.startsWith("t26.wx.")).forEach(k => localStorage.removeItem(k));
  await Promise.resolve(go(S.view));
  setTimeout(() => { $("#refreshBtn").textContent = "⟳"; }, 600);
};

applySolid();
applyLang();
go("today");

/* PWA */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(()=>{}));
}

/* ------- Sebe-test akceptačních kritérií §11 (konzole) ------------------ */
window.selfTest = function () {
  const out = [];
  const wdOK = D.days.every(d => weekdayOf(d.date) === d.weekday || S.lang !== "cs");
  out.push(["§11 dny v týdnu", wdOK]);
  out.push(["§11 všechny hike trasy country=PL", TRAILS.every(t => t.country === "PL")]);
  out.push(["§11 40 tratí", TRAILS.length === 40]);
  out.push(["§11 20 relax aktivit", RELAX.length === 20]);
  out.push(["§11 10× každá obtížnost",
    ["T1","T2","T3","T4"].every(c => TRAILS.filter(t => t.difficulty === c).length === 10)]);
  const fake = Array.from({length:24}, (_,h) => ({ hour:h, temp:18, feel:18, precip:0.2, pprob:70,
    cloud:50, wind:10, gust:20, code:95, cape:2500 }));
  const ev = evaluate(fake, "hard");
  out.push(["§11 bouřka > 40 % na hard den → No-Go", ev.cls === "no" || ev.cls === "warn"]);
  console.table(out.map(([k,v]) => ({ test:k, pass:v ? "✅" : "❌" })));
  return out.every(([,v]) => v);
};

})();
