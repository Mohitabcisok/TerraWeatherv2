// =====================================================
//  TERRAWEATHER v9.0 — app.js
//  AQI: India CPCB standard (all pollutants, max sub-index)
//  Slider: proper 0-500 scale with AQI number label
//  Icons: emoji-based (blue clouds, no broken images)
// =====================================================

const API_KEY = "ef7c1d3fb06b7663e9e1400164cd4798";
const BASE    = "https://api.openweathermap.org/data/2.5";
const AIR_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const BACKEND = "/api";

const CITIES = [
  {name:"Mumbai",    code:"MUM"},{name:"Delhi",     code:"DEL"},
  {name:"Bangalore", code:"BLR"},{name:"Chennai",   code:"MAA"},
  {name:"Kolkata",   code:"CCU"},{name:"Hyderabad", code:"HYD"},
  {name:"Pune",      code:"PNQ"},{name:"Jaipur",    code:"JAI"},
  {name:"Ahmedabad", code:"AMD"},{name:"Surat",     code:"STV"},
  {name:"Lucknow",   code:"LKO"},{name:"Bhopal",    code:"BHO"},
  {name:"Kochi",     code:"COK"},{name:"Indore",    code:"IDR"},
  {name:"Nagpur",    code:"NAG"},{name:"Patna",     code:"PAT"},
  {name:"Chandigarh",code:"IXC"},{name:"Guwahati",  code:"GAU"},
  {name:"Coimbatore",code:"CJB"},{name:"Vadodara",  code:"BDQ"},
];

const PAGE = document.body?.dataset?.page;

// ══════════════════════════════════════════════════
//  WEATHER EMOJI ICONS — blue clouds, colorful icons
//  No <img> tags that break — pure emoji
// ══════════════════════════════════════════════════
const WEATHER_EMOJI = {
  // Clear
  "01d":"☀️", "01n":"🌙",
  // Few clouds
  "02d":"🌤️", "02n":"🌤️",
  // Scattered clouds — BLUE cloud emoji
  "03d":"🌥️", "03n":"🌥️",
  // Broken clouds — BLUE cloud
  "04d":"☁️", "04n":"☁️",
  // Shower rain
  "09d":"🌦️", "09n":"🌦️",
  // Rain
  "10d":"🌧️", "10n":"🌧️",
  // Thunderstorm
  "11d":"⛈️", "11n":"⛈️",
  // Snow
  "13d":"❄️", "13n":"❄️",
  // Mist/Fog/Haze
  "50d":"🌫️", "50n":"🌫️",
};

function getEmoji(iconCode) {
  return WEATHER_EMOJI[iconCode] || WEATHER_EMOJI[iconCode?.slice(0,-1)+"d"] || "🌤️";
}

// ══════════════════════════════════════════════════
//  INDIA CPCB AQI CALCULATION
//  Uses max sub-index across all pollutants
//  Reference: CPCB India AQI Manual
//  Scale: 0-50 Good | 51-100 Satisfactory | 101-200 Moderate
//         201-300 Poor | 301-400 Very Poor | 401-500 Severe
// ══════════════════════════════════════════════════

// CPCB breakpoints: [concentration breakpoints, AQI breakpoints]
const CPCB_BP = {
  // PM2.5 (μg/m³, 24h avg)
  pm25: [
    [0,30,    0,50],
    [30,60,   51,100],
    [60,90,   101,200],
    [90,120,  201,300],
    [120,250, 301,400],
    [250,500, 401,500],
  ],
  // PM10 (μg/m³, 24h avg)
  pm10: [
    [0,50,    0,50],
    [50,100,  51,100],
    [100,250, 101,200],
    [250,350, 201,300],
    [350,430, 301,400],
    [430,600, 401,500],
  ],
  // NO2 (μg/m³, 24h avg)
  no2: [
    [0,40,    0,50],
    [40,80,   51,100],
    [80,180,  101,200],
    [180,280, 201,300],
    [280,400, 301,400],
    [400,800, 401,500],
  ],
  // O3 (μg/m³, 8h avg)
  o3: [
    [0,50,    0,50],
    [50,100,  51,100],
    [100,168, 101,200],
    [168,208, 201,300],
    [208,748, 301,400],
    [748,1000,401,500],
  ],
  // SO2 (μg/m³, 24h avg)
  so2: [
    [0,40,    0,50],
    [40,80,   51,100],
    [80,380,  101,200],
    [380,800, 201,300],
    [800,1600,301,400],
    [1600,2100,401,500],
  ],
  // CO (mg/m³ = μg/m³ / 1000, 8h avg)
  co: [
    [0,1000,    0,50],
    [1000,2000, 51,100],
    [2000,10000,101,200],
    [10000,17000,201,300],
    [17000,34000,301,400],
    [34000,50000,401,500],
  ],
  // NH3 (μg/m³, 24h avg)
  nh3: [
    [0,200,   0,50],
    [200,400, 51,100],
    [400,800, 101,200],
    [800,1200,201,300],
    [1200,1800,301,400],
    [1800,2400,401,500],
  ],
};

function linearInterp(Cp, BPlo, BPhi, Ilo, Ihi) {
  return Math.round(((Ihi - Ilo) / (BPhi - BPlo)) * (Cp - BPlo) + Ilo);
}

function calcSubIndex(value, breakpoints) {
  if (!value || value <= 0) return 0;
  for (const [cLo, cHi, iLo, iHi] of breakpoints) {
    if (value >= cLo && value <= cHi) {
      return Math.min(500, Math.max(0, linearInterp(value, cLo, cHi, iLo, iHi)));
    }
  }
  return 500; // beyond max
}

// Main CPCB AQI function — returns real 0-500 number
function calcIndiaAQI(comp) {
  const pm25 = comp.pm2_5 || 0;
  const pm10 = comp.pm10  || 0;
  const no2  = comp.no2   || 0;
  const o3   = comp.o3    || 0;
  const so2  = comp.so2   || 0;
  const co   = comp.co    || 0;  // OWM gives μg/m³
  const nh3  = comp.nh3   || 0;

  const subIndices = [
    calcSubIndex(pm25, CPCB_BP.pm25),
    calcSubIndex(pm10, CPCB_BP.pm10),
    calcSubIndex(no2,  CPCB_BP.no2),
    calcSubIndex(o3,   CPCB_BP.o3),
    calcSubIndex(so2,  CPCB_BP.so2),
    calcSubIndex(co,   CPCB_BP.co),   // already in μg/m³
    calcSubIndex(nh3,  CPCB_BP.nh3),
  ];

  // India CPCB: final AQI = max of all sub-indices
  return Math.min(500, Math.max(0, Math.max(...subIndices)));
}

// Get color info + label from real AQI 0-500 (India CPCB scale)
function getAQIInfo(aqi) {
  if (aqi <=  50) return { label:"Good",         color:"#10b981", bg:"#d1fae5", tc:"#064e3b", advice:"🌿 Air is excellent! Perfect for all outdoor activities including jogging, cycling, sports. No health risk." };
  if (aqi <= 100) return { label:"Satisfactory",  color:"#84cc16", bg:"#ecfccb", tc:"#365314", advice:"😊 Acceptable air quality. Very sensitive individuals may experience minor discomfort during intense outdoor activity." };
  if (aqi <= 200) return { label:"Moderate",      color:"#f59e0b", bg:"#fef3c7", tc:"#78350f", advice:"😷 Moderate air quality. Sensitive groups — children, elderly, people with asthma or heart disease — should limit prolonged outdoor activity." };
  if (aqi <= 300) return { label:"Poor",          color:"#f97316", bg:"#fff7ed", tc:"#7c2d12", advice:"⚠️ Poor air quality. Everyone may begin to experience effects. Sensitive groups must avoid outdoor activity. Wear N95 mask if going out." };
  if (aqi <= 400) return { label:"Very Poor",     color:"#ef4444", bg:"#fee2e2", tc:"#7f1d1d", advice:"🚨 Very Poor! Serious health effects for everyone. Avoid all outdoor activity. Keep windows closed. Use air purifier if available." };
  return              { label:"Severe",          color:"#7f1d1d", bg:"#fce7f3", tc:"#500724", advice:"🚨 SEVERE HAZARD! Emergency conditions. Stay indoors at all times. Wear N95 mask even indoors. Seek medical help if experiencing symptoms." };
}

// ══ LIVE CLOCK ════════════════════════════════════
function startClock() {
  const tick = () => {
    const el = document.getElementById("navClock");
    if (el) el.textContent = new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  };
  tick(); setInterval(tick, 1000);
}

// ══ LOADER ════════════════════════════════════════
function showLoader() { document.getElementById("loader")?.classList.add("show"); }
function hideLoader() { document.getElementById("loader")?.classList.remove("show"); }

// ══ TOAST ═════════════════════════════════════════
function toast(msg, type="info") {
  document.querySelectorAll(".toast").forEach(t=>t.remove());
  const colors={info:"var(--sky)",ok:"var(--green)",err:"#ef4444",warn:"var(--gold)"};
  const t=document.createElement("div");
  t.className="toast"; t.style.borderLeftColor=colors[type]||colors.info; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),3800);
}

// ══ SEARCH SETUP ══════════════════════════════════
function setupSearch(onSearch) {
  const input=document.getElementById("searchInput");
  const btn=document.getElementById("searchBtn");
  const locBtn=document.getElementById("locationBtn");
  const sugs=document.getElementById("suggestions");
  if (!input) return;

  btn?.addEventListener("click",()=>{
    const city=input.value.trim();
    if(!city) return toast("Please enter a city name.","err");
    if(sugs) sugs.innerHTML="";
    onSearch(city);
  });

  input.addEventListener("keydown", e=>{ if(e.key==="Enter") btn?.click(); });

  input.addEventListener("input",()=>{
    if(!sugs) return;
    const q=input.value.toLowerCase();
    sugs.innerHTML="";
    if(!q||q.length<2) return;
    CITIES.filter(c=>c.name.toLowerCase().startsWith(q)).slice(0,5).forEach(c=>{
      const d=document.createElement("div");
      d.className="sug-item";
      d.innerHTML=`<span style="color:var(--sky);font-size:0.7rem;font-family:var(--font-mono)">[${c.code}]</span> ${c.name}, India`;
      d.addEventListener("click",()=>{ input.value=c.name; sugs.innerHTML=""; onSearch(c.name); });
      sugs.appendChild(d);
    });
  });

  document.addEventListener("click", e=>{
    if(!e.target.closest(".search-field")&&!e.target.closest("#suggestions"))
      if(sugs) sugs.innerHTML="";
  });

  locBtn?.addEventListener("click",()=>{
    if(!navigator.geolocation) return toast("Geolocation not supported.","err");
    showLoader();
    navigator.geolocation.getCurrentPosition(
      pos=>fetchByCoords(pos.coords.latitude,pos.coords.longitude,onSearch),
      ()=>{ hideLoader(); toast("Location denied.","err"); }
    );
  });
}

async function fetchByCoords(lat,lon,callback) {
  try {
    const res=await fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    const data=await res.json();
    const inp=document.getElementById("searchInput");
    if(inp) inp.value=data.name;
    callback(data.name,data);
  } catch { hideLoader(); toast("Could not get location weather.","err"); }
}

// ══ FETCH WEATHER ══════════════════════════════════
async function fetchWeather(city) {
  const res=await fetch(`${BASE}/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${API_KEY}`);
  if(!res.ok) throw new Error("City not found. Try another spelling.");
  return res.json();
}

async function fetchForecast(lat,lon) {
  const res=await fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=40&appid=${API_KEY}`);
  return res.json();
}

async function fetchAQI(lat,lon) {
  const res=await fetch(`${AIR_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
  if(!res.ok) throw new Error("AQI unavailable.");
  return res.json();
}

// ══════════════════════════════════════════════════
//  RENDER AQI — India CPCB scale, correct 0-500 slider
//  CPCB zones: Good 0-50 | Sat 51-100 | Mod 101-200
//              Poor 201-300 | VP 301-400 | Severe 401-500
//  As % of 500px bar: 10% | 20% | 40% | 60% | 80% | 100%
// ══════════════════════════════════════════════════
function renderAQI(aqiData, cardId, badgeId, pointerId, compId) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const comp    = aqiData.list[0].components;
  const realAQI = calcIndiaAQI(comp);   // Real India CPCB 0-500
  const info    = getAQIInfo(realAQI);

  card.style.display = "block";

  // ── Badge ──────────────────────────────────────
  const badge = document.getElementById(badgeId);
  if (badge) {
    badge.textContent    = `AQI ${realAQI} — ${info.label}`;
    badge.style.background   = info.bg;
    badge.style.color        = info.tc;
    badge.style.borderColor  = info.color;
  }

  // ── Slider pointer ─────────────────────────────
  // Scale: AQI 0-500 maps to 0-100% of bar
  // Clamp 1.5% – 97% so pointer stays inside bar visually
  const pct = Math.min(97, Math.max(1.5, (realAQI / 500) * 100));

  const pointer = document.getElementById(pointerId);
  if (pointer) {
    // Position: left = pct% minus half pointer width (14px)
    pointer.style.left        = `calc(${pct}% - 14px)`;
    pointer.style.borderColor = info.color;
    pointer.style.boxShadow   = `0 2px 12px rgba(0,0,0,0.35), 0 0 0 3px ${info.bg}`;
  }

  // ── Number bubble (pre-existing sibling in HTML) ──
  const labelEl = document.getElementById(pointerId + "Label");
  if (labelEl) {
    labelEl.textContent        = realAQI;
    labelEl.style.left         = `${pct}%`;
    labelEl.style.color        = info.tc;
    labelEl.style.background   = info.bg;
    labelEl.style.borderColor  = info.color;
  }

  // ── Pollutant components ───────────────────────
  const compEl = document.getElementById(compId);
  if (compEl) {
    const rows = [
      {key:"pm2_5", label:"PM2.5", unit:"μg/m³"},
      {key:"pm10",  label:"PM10",  unit:"μg/m³"},
      {key:"no2",   label:"NO₂",   unit:"μg/m³"},
      {key:"o3",    label:"O₃",    unit:"μg/m³"},
      {key:"co",    label:"CO",    unit:"μg/m³"},
      {key:"so2",   label:"SO₂",   unit:"μg/m³"},
      {key:"no",    label:"NO",    unit:"μg/m³"},
      {key:"nh3",   label:"NH₃",   unit:"μg/m³"},
    ];
    compEl.innerHTML = rows.map(p => `
      <div class="aqi-comp">
        <div class="aqi-comp-name">${p.label}</div>
        <div class="aqi-comp-val">${(comp[p.key] || 0).toFixed(1)}</div>
        <div class="aqi-comp-unit">${p.unit}</div>
      </div>`).join("");
  }

  // ── Health advice (alerts page) ────────────────
  const adviceEl = document.getElementById("aqiAdvice");
  if (adviceEl) {
    adviceEl.innerHTML         = `<strong>💡 Health Advice (AQI ${realAQI} — ${info.label}):</strong> ${info.advice}`;
    adviceEl.style.borderLeftColor = info.color;
    adviceEl.style.background  = info.bg;
    adviceEl.style.color       = info.tc;
  }

  return realAQI;
}

// ══ SAVE SEARCH ════════════════════════════════════
async function saveSearch(city,temp,description){
  try {
    const res = await fetch(`${BACKEND}/searches`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({city,temp:Math.round(temp*10)/10,description})});
    if(!res.ok){ const e=await res.json(); console.warn("saveSearch failed:",e.error); }
  } catch(e){ console.warn("saveSearch error:",e.message); }
}

// ══════════════════════════════════════════════════
//  ALERT ENGINE — 12 personalized alerts
// ══════════════════════════════════════════════════
function generateAlerts(data, aqi){
  const alerts=[];
  const temp=data.main.temp, hum=data.main.humidity;
  const wind=data.wind.speed*3.6, main=data.weather[0].main;
  const desc=data.weather[0].description;

  // AQI-based alert — consistent with health advice label
  if(aqi && aqi >= 301)      alerts.push({level:"critical",icon:"☣️",title:"SEVERE AIR POLLUTION",  msg:`AQI ${aqi} — Severe. Air is hazardous for everyone.`,action:"Stay indoors. Wear N95 mask if going out. Keep all windows shut."});
  else if(aqi && aqi >= 201) alerts.push({level:"critical",icon:"😷",title:"VERY POOR AIR QUALITY", msg:`AQI ${aqi} — Very Poor. Health risk for all.`,action:"Avoid all outdoor activity. Wear N95 mask if going out."});
  else if(aqi && aqi >= 101) alerts.push({level:"warning", icon:"⚠️",title:"MODERATE AIR QUALITY",   msg:`AQI ${aqi} — Moderate. Sensitive groups may be affected.`,action:"Limit prolonged outdoor activity. Children and elderly stay indoors."});

  if(temp>=44)      alerts.push({level:"critical",icon:"🔥",title:"EXTREME HEAT EMERGENCY",msg:`${Math.round(temp)}°C — dangerously high.`,action:"Stay indoors. Do NOT go outside. Drink 3–4 litres of water. Keep AC/fans running."});
  else if(temp>=38) alerts.push({level:"warning", icon:"☀️",title:"HEAT WARNING",           msg:`${Math.round(temp)}°C — very hot in ${data.name}.`,action:"Avoid going out 11 AM–4 PM. Wear light cotton. Stay hydrated."});
  else if(temp>=32) alerts.push({level:"info",    icon:"🌡️",title:"WARM WEATHER",           msg:`${Math.round(temp)}°C — warm day ahead.`,action:"Carry water. Wear sunscreen for prolonged outdoor time."});
  else if(temp<=6)  alerts.push({level:"critical",icon:"🧊",title:"SEVERE COLD WARNING",    msg:`${Math.round(temp)}°C — hypothermia risk.`,action:"Wear multiple warm layers. Avoid exposed skin outdoors."});
  else if(temp<=14) alerts.push({level:"warning", icon:"❄️",title:"COLD WEATHER ALERT",     msg:`${Math.round(temp)}°C — cold conditions.`,action:"Wear warm jacket and woolens before stepping out."});

  if(main==="Thunderstorm") alerts.push({level:"critical",icon:"⛈️",title:"THUNDERSTORM WARNING",msg:`Active thunderstorm over ${data.name}.`,action:"Stay indoors. Unplug electronics. Avoid open areas and trees."});
  if(main==="Rain"||main==="Drizzle"){
    const heavy=desc.includes("heavy")||desc.includes("extreme");
    alerts.push({level:heavy?"warning":"info",icon:"🌧️",title:heavy?"HEAVY RAIN ALERT":"RAIN ADVISORY",msg:`${desc} in ${data.name}.`,action:"Carry umbrella. Expect waterlogging. Allow extra travel time."});
  }
  if(main==="Snow")  alerts.push({level:"warning",icon:"❄️", title:"SNOWFALL ALERT",      msg:`Snowfall in ${data.name}.`,action:"Drive carefully. Carry warm clothing. Avoid isolated roads."});
  if(main==="Fog"||main==="Mist"||main==="Haze") alerts.push({level:"warning",icon:"🌫️",title:"LOW VISIBILITY",msg:`${desc} in ${data.name}.`,action:"Use fog lights. Drive below 40 km/h. Honk at intersections."});
  if(main==="Smoke"||main==="Ash"||main==="Sand"||main==="Dust") alerts.push({level:"critical",icon:"💨",title:"AIR QUALITY HAZARD",msg:`${desc}${aqi?" — AQI "+aqi:""}.`,action:"Wear N95 mask. Keep windows closed. Avoid outdoor exercise."});
  if(hum>=90)      alerts.push({level:"warning",icon:"💧",title:"EXTREME HUMIDITY",  msg:`${hum}% humidity — severe heat-index.`,action:"Stay cool. Drink electrolytes. Risk of heat exhaustion."});
  else if(hum>=80) alerts.push({level:"info",   icon:"💦",title:"HIGH HUMIDITY",     msg:`${hum}% — uncomfortable.`,action:"Stay hydrated. Limit outdoor physical activity."});
  if(wind>=65)     alerts.push({level:"critical",icon:"🌪️",title:"GALE FORCE WINDS",  msg:`${Math.round(wind)} km/h — dangerous.`,action:"Secure outdoor objects. Avoid tall vehicles. Stay away from trees."});
  else if(wind>=45)alerts.push({level:"warning", icon:"💨",title:"STRONG WIND WARNING",msg:`${Math.round(wind)} km/h winds.`,action:"Secure balcony items. Two-wheelers use caution."});

  if(alerts.length===0) alerts.push({level:"safe",icon:"✅",title:"ALL CLEAR — SAFE CONDITIONS",msg:`All conditions normal in ${data.name}.`,action:"Enjoy your day! Conditions are safe for all outdoor activities."});
  return alerts;
}

function renderAlertStrip(alerts){
  const strip=document.getElementById("alertStrip");
  if(!strip) return;
  strip.innerHTML="";
  const sorted=[...alerts].sort((a,b)=>({critical:0,warning:1,info:2,safe:3}[a.level]||3)-({critical:0,warning:1,info:2,safe:3}[b.level]||3));
  sorted.slice(0,2).forEach(a=>{
    const div=document.createElement("div");
    div.className=`alert-card ${a.level}`;
    div.innerHTML=`<div class="alert-icon-big">${a.icon}</div><div><div class="alert-title-text">${a.title}</div><div class="alert-body-text">${a.msg}</div></div>`;
    strip.appendChild(div);
  });
  const crit=sorted.find(a=>a.level==="critical");
  if(crit&&"Notification" in window){
    Notification.requestPermission().then(p=>{ if(p==="granted") new Notification("TerraWeather Alert",{body:crit.msg}); });
  }
}

function renderAlertsFull(alerts,data){
  const list=document.getElementById("alertsList");
  if(!list) return;
  document.getElementById("ah-temp")&&(document.getElementById("ah-temp").textContent=`${Math.round(data.main.temp)}°C`);
  document.getElementById("ah-city")&&(document.getElementById("ah-city").textContent=data.name.toUpperCase());
  list.innerHTML="";
  alerts.forEach(a=>{
    const div=document.createElement("div");
    div.className=`alert-full-card ${a.level}`;
    div.innerHTML=`
      <div class="afc-icon">${a.icon}</div>
      <div style="flex:1">
        <div class="afc-level">${a.level.toUpperCase()}</div>
        <div class="afc-title">${a.title}</div>
        <div class="afc-msg">${a.msg}</div>
        <div class="afc-what-to-do"><strong>What to do: </strong>${a.action}</div>
      </div>`;
    list.appendChild(div);
  });
}

// ════════════════════════════════════════════════
//  HOME PAGE
// ════════════════════════════════════════════════
function initHome(){
  // Better empty state on load
  const card = document.getElementById("weatherCard");
  if (card) {
    card.className = 'weather-card wc-empty-state';
    card.innerHTML = `
      <div class="wc-empty">
        <div class="wc-empty-icon">🌤️</div>
        <div class="wc-empty-title">India Weather Intelligence</div>
        <div class="wc-empty-sub">LIVE CONDITIONS · 5-DAY FORECAST<br/>AQI MONITORING · SMART ALERTS</div>
        <div class="wc-empty-hint">⌨️ TYPE A CITY NAME ABOVE</div>
      </div>`;
  }

  setupSearch(async (city)=>{
    showWeatherSkeleton();   // show skeleton immediately
    showLoader();
    try {
      const data=await fetchWeather(city);
      renderWeatherCard(data);
      updateStats(data);
      renderAlertStrip(generateAlerts(data, window._lastAQI||null));
      loadMiniforecast(data.coord.lat,data.coord.lon);
      await saveSearch(data.name,data.main.temp,data.weather[0].description);
      await loadHistory();
      // AQI
      try {
        const aqiData=await fetchAQI(data.coord.lat,data.coord.lon);
        window._lastAQI=calcIndiaAQI(aqiData.list[0].components);
        renderAQI(aqiData,"aqiCard","aqiBadge","aqiPointer","aqiComponents");
        renderAlertStrip(generateAlerts(data, window._lastAQI));
      } catch {}
      toast(`${data.name} loaded! ☀️`,"ok");
    } catch(e){ hideLoader(); const c=document.getElementById("weatherCard"); if(c){c.className='weather-card wc-empty-state';c.innerHTML=`<div class="wc-empty"><div class="wc-empty-icon">⚠️</div><div class="wc-empty-title">City Not Found</div><div class="wc-empty-sub">${e.message}</div></div>`;} toast(e.message,"err"); }
  });

  document.getElementById("clearBtn")?.addEventListener("click",async()=>{
    if(!confirm("Clear all search history?")) return;
    try{ await fetch(`${BACKEND}/searches`,{method:"DELETE"}); loadHistory(); toast("History cleared.","warn"); }
    catch{ toast("Backend not running.","err"); }
  });
  loadHistory();
}

// ── WEATHER REACTIVE CLASS ────────────────────────
function getWeatherClass(data) {
  const main = data.weather[0].main.toLowerCase();
  const temp = data.main.temp;
  if (temp >= 38)                             return 'wc-hot';
  if (temp <= 10)                             return 'wc-cold';
  if (main === 'thunderstorm')                return 'wc-thunder';
  if (main === 'snow')                        return 'wc-snow';
  if (main === 'rain' || main === 'drizzle')  return 'wc-rain';
  if (main === 'mist' || main === 'fog' ||
      main === 'haze' || main === 'smoke')    return 'wc-fog';
  if (main.includes('cloud') || main === 'overcast') return 'wc-clouds';
  return 'wc-clear'; // clear sky / default
}

// ── SKELETON SCREEN ───────────────────────────────
function showWeatherSkeleton() {
  const card = document.getElementById("weatherCard");
  if (!card) return;
  card.className = 'weather-card';
  card.innerHTML = `
    <div class="wc-skeleton">
      <div class="wc-skeleton-top">
        <div>
          <div class="skeleton skeleton-title" style="width:120px"></div>
          <div class="skeleton skeleton-text"  style="width:80px"></div>
        </div>
        <div class="skeleton skeleton-icon"></div>
      </div>
      <div class="skeleton skeleton-temp"></div>
      <div class="skeleton skeleton-text" style="width:100px"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">
        ${[1,2,3,4].map(()=>`<div class="skeleton" style="height:52px;border-radius:12px"></div>`).join('')}
      </div>
    </div>`;
}

function renderWeatherCard(data){
  hideLoader();
  const card=document.getElementById("weatherCard");
  if(!card) return;
  const fmt=ts=>new Date(ts*1000).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  const emoji=getEmoji(data.weather[0].icon);

  // Apply weather-reactive class
  const wxClass = getWeatherClass(data);
  card.className = `weather-card ${wxClass}`;

  card.innerHTML=`
    <div class="wc-top">
      <div>
        <div class="wc-city">${data.name}</div>
        <div class="wc-country">${data.sys.country} · ${new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>
      <div class="wc-icon">${emoji}</div>
    </div>
    <div class="wc-temp-big">${Math.round(data.main.temp)}°</div>
    <div class="wc-desc">${data.weather[0].description}</div>
    <div class="wc-stats">
      <div class="wc-stat"><div class="wc-stat-label">💧 Humid</div><div class="wc-stat-val">${data.main.humidity}%</div></div>
      <div class="wc-stat"><div class="wc-stat-label">💨 Wind</div><div class="wc-stat-val">${(data.wind.speed*3.6).toFixed(0)} km/h</div></div>
      <div class="wc-stat"><div class="wc-stat-label">🌅 Rise</div><div class="wc-stat-val">${fmt(data.sys.sunrise)}</div></div>
      <div class="wc-stat"><div class="wc-stat-label">🌇 Set</div><div class="wc-stat-val">${fmt(data.sys.sunset)}</div></div>
    </div>`;
}

function updateStats(data){
  const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.innerHTML=val; };
  document.getElementById("statsRow")&&(document.getElementById("statsRow").style.display="grid");
  document.getElementById("sunRow")&&(document.getElementById("sunRow").style.display="grid");
  set("s-temp",`${Math.round(data.main.temp)}<span class="stat-unit">°C</span>`);
  set("s-hum", `${data.main.humidity}<span class="stat-unit">%</span>`);
  set("s-wind",`${(data.wind.speed*3.6).toFixed(0)}<span class="stat-unit">km/h</span>`);
  set("s-pres",`${data.main.pressure}<span class="stat-unit">hPa</span>`);
  set("s-vis", `${data.visibility?(data.visibility/1000).toFixed(1):"N/A"}<span class="stat-unit">km</span>`);
  set("s-feel",`${Math.round(data.main.feels_like)}<span class="stat-unit">°C</span>`);
  const fmt=ts=>new Date(ts*1000).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  set("s-rise",fmt(data.sys.sunrise));
  set("s-set", fmt(data.sys.sunset));
}

async function loadMiniforecast(lat,lon){
  try {
    const data=await fetchForecast(lat,lon);
    const el=document.getElementById("miniforecast");
    if(!el) return;
    const days={};
    data.list.forEach(item=>{
      const d=new Date(item.dt*1000).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
      if(!days[d]) days[d]=item;
    });
    el.innerHTML=Object.entries(days).slice(0,5).map(([d,i])=>`
      <div class="mf-item">
        <span class="mf-day">${d}</span>
        <span class="mf-emoji">${getEmoji(i.weather[0].icon)}</span>
        <span class="mf-temp">${Math.round(i.main.temp)}°C</span>
        <span class="mf-desc">${i.weather[0].description}</span>
      </div>`).join("");
  } catch {}
}

async function loadHistory(){
  const list=document.getElementById("historyList");
  if(!list) return;
  try {
    const res=await fetch(`${BACKEND}/searches`);
    const data=await res.json();
    if(!data.length){ list.innerHTML=`<div class="no-history">No searches yet</div>`; return; }
    list.innerHTML=data.map(item=>`
      <div class="history-item" onclick="document.getElementById('searchInput').value='${item.city}';document.getElementById('searchBtn').click()">
        <span class="hi-icon">▶</span>
        <span class="hi-city">${item.city}</span>
        <span class="hi-temp">${Math.round(item.temp)}°</span>
        <span class="hi-desc">${(item.description||"").substring(0,15)}</span>
      </div>`).join("");
  } catch { document.getElementById("historyList").innerHTML=`<div class="no-history">Start server to enable history</div>`; }
}

// ════════════════════════════════════════════════
//  FORECAST PAGE
// ════════════════════════════════════════════════
function initForecast(){
  setupSearch(async (city)=>{
    showLoader();
    try {
      const curr=await fetchWeather(city);
      const fore=await fetchForecast(curr.coord.lat,curr.coord.lon);
      renderFiveDay(fore.list);
      renderHourly(fore.list);
      hideLoader();
      toast(`Forecast loaded for ${curr.name} 📅`,"ok");
    } catch(e){ hideLoader(); toast(e.message,"err"); }
  });
}

function renderFiveDay(list){
  const grid=document.getElementById("fiveDayGrid");
  if(!grid) return;
  const days={};
  list.forEach(item=>{
    const d=new Date(item.dt*1000).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});
    const h=new Date(item.dt*1000).getHours();
    if(!days[d]||Math.abs(h-12)<Math.abs(new Date(days[d].dt*1000).getHours()-12)) days[d]=item;
  });
  grid.innerHTML=Object.entries(days).slice(0,5).map(([d,i],idx)=>`
    <div class="day-card ${idx===0?"selected":""}">
      <div class="day-name">${d}</div>
      <div class="day-icon">${getEmoji(i.weather[0].icon)}</div>
      <div class="day-temp">${Math.round(i.main.temp)}°</div>
      <div class="day-hi-lo"><span class="hi">▲${Math.round(i.main.temp_max)}°</span> <span class="lo">▼${Math.round(i.main.temp_min)}°</span></div>
      <div class="day-desc">${i.weather[0].description}</div>
    </div>`).join("");
}

function renderHourly(list){
  const scroll=document.getElementById("hourlyScroll");
  if(!scroll) return;
  scroll.innerHTML=list.slice(0,24).map(item=>{
    const time=new Date(item.dt*1000).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
    const pop=Math.round((item.pop||0)*100);
    return `
      <div class="hour-item">
        <div class="hour-time">${time}</div>
        <div class="hour-icon">${getEmoji(item.weather[0].icon)}</div>
        <div class="hour-temp">${Math.round(item.main.temp)}°</div>
        ${pop>0?`<div class="hour-pop">💧${pop}%</div>`:""}
      </div>`;
  }).join("");
}

// ════════════════════════════════════════════════
//  CITIES PAGE — with AQI chip + emoji icons
// ════════════════════════════════════════════════
function initCities(){
  const grid=document.getElementById("citiesGrid");
  if(!grid) return;

  // Show skeleton cards immediately — layout before data
  grid.innerHTML = CITIES.map(c=>`
    <div class="city-card-skeleton" id="cc-${c.name}">
      <div style="padding-left:12px">
        <div class="skeleton skeleton-title" style="width:90px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text"  style="width:50px;margin-bottom:16px"></div>
        <div class="skeleton skeleton-temp"  style="width:100px;height:52px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text"  style="width:80px;margin-bottom:14px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div class="skeleton" style="height:44px;border-radius:8px"></div>
          <div class="skeleton" style="height:44px;border-radius:8px"></div>
          <div class="skeleton" style="height:44px;border-radius:8px"></div>
          <div class="skeleton" style="height:44px;border-radius:8px"></div>
        </div>
      </div>
    </div>`).join('');

  CITIES.forEach((c,i)=>{ setTimeout(()=>fetchCityCard(c.name), i*260); });
}

async function fetchCityCard(city){
  try {
    const r=await fetch(`${BASE}/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${API_KEY}`);
    if(!r.ok) return;
    const d=await r.json();
    const el=document.getElementById(`cc-${city}`);
    if(!el) return;

    const emoji    = getEmoji(d.weather[0].icon);
    const wind     = (d.wind.speed*3.6).toFixed(0);
    const pressure = d.main.pressure;
    const feels    = Math.round(d.main.feels_like);
    const vis      = d.visibility ? (d.visibility/1000).toFixed(1) : 'N/A';
    const idx      = CITIES.findIndex(c=>c.name===city);
    const colors   = ['5n+1','5n+2','5n+3','5n+4','5n+0'];
    // nth-child won't work dynamically, so we add a data attr and use inline style
    const accentColors = [
      ['#3b82f6','#14b8a6'],
      ['#f59e0b','#fb923c'],
      ['#14b8a6','#10b981'],
      ['#8b5cf6','#f43f5e'],
      ['#f43f5e','#f59e0b'],
    ];
    const ci = idx % 5;
    const [c1, c2] = accentColors[ci];

    // Replace skeleton with real card
    el.className = 'city-card';
    el.style.cssText = '';
    el.onclick = ()=>goToCity(city);
    el.innerHTML = `
      <div class="city-top">
        <div>
          <div class="city-name">${city}</div>
          <div class="city-code">[${CITIES[idx].code}]</div>
        </div>
        <div class="city-icon">${emoji}</div>
      </div>
      <div class="city-temp-big">${Math.round(d.main.temp)}°</div>
      <div class="city-desc-small">${d.weather[0].description}</div>
      <div class="city-data-row">
        <div class="city-data-item">
          <div class="city-data-label">💧 HUMID</div>
          <div class="city-data-val">${d.main.humidity}%</div>
        </div>
        <div class="city-data-item">
          <div class="city-data-label">💨 WIND</div>
          <div class="city-data-val">${wind} km/h</div>
        </div>
        <div class="city-data-item">
          <div class="city-data-label">🌡️ FEELS</div>
          <div class="city-data-val">${feels}°C</div>
        </div>
        <div class="city-data-item">
          <div class="city-data-label">👁️ VIS</div>
          <div class="city-data-val">${vis} km</div>
        </div>
      </div>
      <div id="ca-${city}"></div>`;

    // Apply accent colors via inline style (replaces nth-child CSS)
    el.style.borderLeft = `6px solid ${c1}`;
    el.style.borderTop  = `4px solid transparent`;
    el.style.background = `linear-gradient(to bottom right, white 70%, ${c1}18)`;
    const topBar = document.createElement('div');
    topBar.style.cssText = `position:absolute;top:0;left:6px;right:0;height:4px;background:linear-gradient(90deg,${c1},${c2});border-radius:0 20px 0 0`;
    el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(topBar);

    // AQI chip
    try {
      const aqiData=await fetchAQI(d.coord.lat,d.coord.lon);
      const comp=aqiData.list[0].components;
      const realAQI=calcIndiaAQI(comp);
      const info=getAQIInfo(realAQI);
      const chipEl=document.getElementById(`ca-${city}`);
      if(chipEl) chipEl.innerHTML=`<span class="city-aqi-chip" style="background:${info.bg};color:${info.tc};border-color:${info.color}">🌬️ AQI ${realAQI} — ${info.label}</span>`;
    } catch {}
  } catch {}
}

function goToCity(city){
  localStorage.setItem("nexus_city",city);
  window.location.href="forecast.html";
}
function checkCityPreload(){
  const city=localStorage.getItem("nexus_city");
  if(city){
    localStorage.removeItem("nexus_city");
    const input=document.getElementById("searchInput");
    if(input) input.value=city;
    setTimeout(()=>document.getElementById("searchBtn")?.click(),500);
  }
}

// ════════════════════════════════════════════════
//  ALERTS PAGE — full AQI breakdown
// ════════════════════════════════════════════════
function initAlerts(){
  setupSearch(async (city)=>{
    showLoader();
    try {
      const data=await fetchWeather(city);
      renderAlertsFull(generateAlerts(data, window._lastAQI||null),data);
      hideLoader();
      // Full AQI breakdown
      try {
        const aqiData=await fetchAQI(data.coord.lat,data.coord.lon);
        const comp=aqiData.list[0].components;
        const realAQI=calcIndiaAQI(comp);
        window._lastAQI=realAQI;
        const info=getAQIInfo(realAQI);

        // Hero AQI stat box
        const aqiBox=document.getElementById("ah-aqi-box");
        const aqiVal=document.getElementById("ah-aqi");
        if(aqiBox) aqiBox.style.display="flex";
        if(aqiVal){ aqiVal.textContent=`${realAQI} — ${info.label}`; aqiVal.style.color=info.color; }

        // Full AQI card
        renderAQI(aqiData,"aqiCardAlerts","aqiBadgeAlerts","aqiPointerAlerts","aqiComponentsAlerts");

        // Re-render alerts now that AQI is known — ensures consistency
        renderAlertsFull(generateAlerts(data, realAQI), data);
      } catch {}
      toast(`Analysis complete for ${data.name} ✅`,"ok");
    } catch(e){ hideLoader(); toast(e.message,"err"); }
  });
}

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded",()=>{
  startClock();
  if(PAGE==="home")     initHome();
  if(PAGE==="forecast") { initForecast(); checkCityPreload(); }
  if(PAGE==="cities")   initCities();
  if(PAGE==="alerts")   initAlerts();
});
