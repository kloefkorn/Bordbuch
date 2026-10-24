/* Bordbuch – Programmcode. Wird von index.html geladen. */
'use strict';
/* Versionsnummer: kleine Änderungen +0.1 (1.1 → 1.2), größere/grundlegende Änderungen nächste ganze Zahl (1.2 → 2.0).
   Verlauf: 1.0 Erstversion · 1.1 Texte & metrische Einheiten · 1.2 Start/Stop-Design, Boot, Fahrtenfilter · 2.0 Tanken & Verbrauch
   · 3.0 Besatzung (Skipper, Steuermann, Personen an Bord), Tankknopf neben Start/Stop, Tankvorgang löschen
   · 3.1 Pax standardmäßig 2 · 3.2 Datumsfelder im Filter einheitlich gestaltet · 3.3 zuverlässigere Updates · 3.4 größere Schaltfläche „Personen an Bord“
   · 4.0 Bootsdaten (MMSI, Callsign …) und SOS-Notfallkarte
   · 4.1 Steuermann nur aus Personen an Bord, wenn alle Plätze benannt; Vorbelegung der Besatzung aus der letzten Fahrt (48 h)
   · 4.2 Vor Fahrtbeginn Skipper und Steuermann wieder frei wählbar
   · 4.3 Anzeige „Aufzeichnung läuft“ im Stil der Knöpfe
   · 4.4 OneDrive-Anmeldung wird vor Ablauf still erneuert
   · 4.5 Skipper-, Steuermann- und Kraftstofflisten werden geräteübergreifend abgeglichen
   · 4.6 Verbrauch: Strecke nur zwischen Tankvorgängen · 4.7 Fahrtenfilter „Person an Bord“
   · 5.0 Für alle nutzbar: Ersteinrichtung (Boot, Skipper, Steuermann), OneDrive abschaltbar, Hilfe
   · 5.1 Eingebaute Microsoft-Client-ID; Ersteinrichtung: „Skipper ist auch Steuermann“ vor dem Steuermann-Feld
   · 5.2 Kartenbibliothek im eigenen Repository, Programmcode in app.js, Sicherheitsrichtlinie (CSP)
   · 6.0 Bootsart Motor-/Segelboot, Sicherheitsunterweisung, Logbucheintrag als PDF (mit OneDrive)
   · 7.0 Einheiten km/sm, Datenschutzerklärung, Anmeldedaten nicht mehr im localStorage, Token nur an Microsoft Graph, Kartenspeicher begrenzt
   · 7.1 Fahrten in der Übersicht löschen, Seezeichen standardmäßig an (Einstellung)
   · 7.2 Fehlerkorrektur OneDrive-Download (Statusprüfung), Prüfung aller heruntergeladenen und importierten Datensätze
   · 7.3 Bootsdaten (inkl. Bootsmodell und Bootsart) werden feldweise über OneDrive abgeglichen
   · 7.4 Ersteinrichtung: zuerst OneDrive verbinden und Daten laden, dann Boot/Skipper/Steuermann auswählen
   · 7.5 Hinweis: kein Zugriff des Entwicklers auf OneDrive und Aufzeichnungen
   · 7.6 PDF-Markierung in der Fahrtenübersicht, Unterschriftenzeile „Datum, Ort“ · 7.7 Startseite: nur Link „Datenschutz“
   · 8.0 Segelboot-Modus: Fahrtbeginn/Fahrtende, Knöpfe Motor an/aus und Segel gesetzt/geborgen mit Protokoll
   · 9.0 Leuchtring-Logik, Knöpfe Anker/Ankerlicht/Positionslichter, Größen für Tablets
   · 9.1 Ankerlicht-Symbol mit Anker in der Glühbirne, Beschriftung und Abstände der unteren Knöpfe */
const APP_VERSION='9.1';
/* ================= Helfer ================= */
const $=(s,r=document)=>r.querySelector(s);
const view=$('#view');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let toastT;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3000);}

const DEFAULT_BOAT_TYPE='',DEFAULT_BOAT_NAME='';
const DEF={minDist:25,seamarks:true,boatKind:'motor',units:'metric',maxInterval:30,maxAcc:50,wake:true,odClientId:'',boatType:DEFAULT_BOAT_TYPE,boatName:DEFAULT_BOAT_NAME,fuelTypes:['Diesel','Benzin'],skippers:[],helms:[],odEnabled:undefined,setupDone:false};
let S=Object.assign({},DEF,JSON.parse(localStorage.getItem('bb_settings')||'{}'));
const saveS=()=>localStorage.setItem('bb_settings',JSON.stringify(S));
const BUILTIN_FUELS=['Diesel','Benzin'];
if(!Array.isArray(S.fuelTypes))S.fuelTypes=[...BUILTIN_FUELS];
BUILTIN_FUELS.forEach(f=>{if(!S.fuelTypes.includes(f))S.fuelTypes.unshift(f);});
const BUILTIN_PEOPLE=[];
if(!S.v6){if(S.minDist===10)S.minDist=25;S.v6=true;saveS();}
const defSkipper=()=>S.skippers[0]||'';
const defHelm=()=>S.helms[0]||defSkipper();
if(S.odEnabled===undefined){S.odEnabled=!!localStorage.getItem('bb_od_on');}
['skippers','helms'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[...BUILTIN_PEOPLE];BUILTIN_PEOPLE.slice().reverse().forEach(n=>{if(!S[k].includes(n))S[k].unshift(n);});});
/* Boot einer Fahrt (sehr alte Fahrten ohne Angabe gehören zum aktuell eingestellten Boot) */
const tripBoat=t=>t.boat||{type:S.boatType||'',name:S.boatName||''};
const KINDS={motor:'Motorboot',sail:'Segelboot'};
const kindLabel=k=>KINDS[k]||'';
const kindIcon=k=>k==='sail'?'⛵':'🛥️';
const boatLabel=b=>[b.type,b.name?`„${b.name}“`:''].filter(Boolean).join(' ');
function renderBoatHeader(){
  const b=rec?tripBoat(rec.trip):{type:S.boatType,name:S.boatName};
  $('#boatBtn').innerHTML=`${esc(boatLabel(b)||'Boot festlegen')}<span class="pen">✎</span>`;
}
async function editBoat(){
  const d=$('#boatDlg');$('#bdType').value=S.boatType||'';$('#bdName').value=S.boatName||'';d.returnValue='';
  d.addEventListener('close',async()=>{
    if(d.returnValue!=='ok')return;
    S.boatType=$('#bdType').value.trim();S.boatName=$('#bdName').value.trim();saveS();
    {const ex=await boatInfo(S.boatName);if(S.boatType!==(ex.type||''))await boatPatch(S.boatName,{type:S.boatType});else applyBoatRec(ex);}
    if(rec&&confirm('Soll die laufende Fahrt ebenfalls diesem Boot zugeordnet werden?')){
      rec.trip.boat={type:S.boatType,name:S.boatName};rec.trip.updatedAt=Date.now();persist();
    }
    renderBoatHeader();refreshView();toast('Boot gespeichert');
  },{once:true});
  d.showModal();
}

const fmtDate=t=>new Date(t).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
const fmtDateS=t=>new Date(t).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'});
const fmtTime=(t,sec)=>new Date(t).toLocaleTimeString('de-DE',sec?{hour:'2-digit',minute:'2-digit',second:'2-digit'}:{hour:'2-digit',minute:'2-digit'});
const fmtDur=ms=>{const m=Math.max(0,Math.round(ms/60000));return `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min`;};
const num=(v,d=1)=>v.toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const NAUT=()=>S.units==='nautical';
const distU=()=>NAUT()?'sm':'km', distWord=()=>NAUT()?'Seemeile':'Kilometer';
const perDist=m=>m/(NAUT()?1852:1000);
const fmtKm=m=>num(perDist(m))+' '+distU();
const windTxt=v=>v==null?'–':NAUT()?num(v/1.852,0)+' kn':num(v,0)+' km/h';
const kmh=ms=>ms==null||isNaN(ms)?'–':NAUT()?num(ms*1.943844)+' kn':num(ms*3.6)+' km/h';
function dm(v,pos,neg,w){const h=v>=0?pos:neg;v=Math.abs(v);const d=Math.floor(v);const m=(v-d)*60;return `${String(d).padStart(w,'0')}°${m.toFixed(3).replace('.',',').padStart(6,'0')}′${h}`;}
const fmtCoord=(lat,lon)=>lat==null?'Position unbekannt':dm(lat,'N','S',2)+' '+dm(lon,'E','W',3);

function hav(a,b){const R=6371008.8,r=Math.PI/180;const dLa=(b.lat-a.lat)*r,dLo=(b.lon-a.lon)*r;
  const x=Math.sin(dLa/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
/* Segment zählt zur Strecke, wenn plausibel (<25 m/s) und keine Liegeplatz-Drift */
function segCounts(a,b,d){const dt=(b.t-a.t)/1000;if(dt<=0)return false;const v=d/dt;return v<25&&(v>=0.3||d>=15);}
function trackDist(pts){let s=0;for(let i=1;i<pts.length;i++){const d=hav(pts[i-1],pts[i]);if(segCounts(pts[i-1],pts[i],d))s+=d;}return s;}

/* ================= Datenbank (IndexedDB) ================= */
let dbp;
function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('bordbuch',6);
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('trips'))d.createObjectStore('trips',{keyPath:'id'});
    if(!d.objectStoreNames.contains('fuel'))d.createObjectStore('fuel',{keyPath:'id'});
    if(!d.objectStoreNames.contains('boats'))d.createObjectStore('boats',{keyPath:'id'});
    if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta',{keyPath:'id'});
    if(!d.objectStoreNames.contains('pdfs'))d.createObjectStore('pdfs',{keyPath:'id'});
    if(!d.objectStoreNames.contains('secrets'))d.createObjectStore('secrets',{keyPath:'id'});};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
const rq=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
async function getTrip(id){return rq((await db()).transaction('trips').objectStore('trips').get(id));}
async function allTrips(){return rq((await db()).transaction('trips').objectStore('trips').getAll());}
async function putTrip(t){return rq((await db()).transaction('trips','readwrite').objectStore('trips').put(t));}
async function liveTrips(){return (await allTrips()).filter(t=>!t.deleted).sort((a,b)=>b.start.t-a.start.t);}
async function getFuel(id){return rq((await db()).transaction('fuel').objectStore('fuel').get(id));}
async function allFuel(){return rq((await db()).transaction('fuel').objectStore('fuel').getAll());}
async function putFuel(f){return rq((await db()).transaction('fuel','readwrite').objectStore('fuel').put(f));}
async function liveFuel(){return (await allFuel()).filter(f=>!f.deleted).sort((a,b)=>a.t-b.t);}
async function getBoatRec(id){return rq((await db()).transaction('boats').objectStore('boats').get(id));}
async function allBoats(){return rq((await db()).transaction('boats').objectStore('boats').getAll());}
async function putBoatRec(b){return rq((await db()).transaction('boats','readwrite').objectStore('boats').put(b));}
const boatId=name=>(name||'').trim().toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').replace(/^-|-$/g,'')||'boot';
const BOAT_FIELDS=[['mmsi','MMSI','numeric',''],['callsign','Callsign','text',''],['reg','Bootskennzeichen','text',''],
  ['length','Länge','decimal','m'],['beam','Breite','decimal','m'],['height','Höhe','decimal','m'],['displacement','Verdrängung','decimal','t']];
async function boatInfo(name){return (await getBoatRec(boatId(name)))||{};}
/* Bootsdaten werden Feld für Feld abgeglichen: jedes Feld merkt sich, wann es zuletzt geändert wurde (ft).
   So kann ein neu angelegter, leerer Datensatz auf einem zweiten Gerät keine vorhandenen Angaben überschreiben. */
const BOAT_SYNC_FIELDS=()=>['type','kind',...BOAT_FIELDS.map(f=>f[0])];
const fieldTime=(r,f)=>r?.ft&&isNum(r.ft[f])?r.ft[f]:(r&&r[f]?(r.updatedAt||0):-1);
// Gleichstand oder leerer Gewinner: vorhandener Wert bleibt
function mergeBoat(a,b){
  const base=b||a;const out={id:base.id,name:(b?.name||a?.name||''),deleted:false,ft:{},updatedAt:Math.max(a?.updatedAt||0,b?.updatedAt||0)};
  for(const f of BOAT_SYNC_FIELDS()){
    const ta=fieldTime(a,f),tb=fieldTime(b,f);
    const va=a&&a[f]!=null&&a[f]!==''?a[f]:null,vb=b&&b[f]!=null&&b[f]!==''?b[f]:null;
    let v=tb>ta?vb:ta>tb?va:(vb??va);
    if(v==null&&(tb>ta?ta:tb)<=0)v=vb??va; // ein leerer Wert darf nur eine bewusste (nicht voreingestellte) Angabe löschen
    const t=Math.max(ta,tb);
    if(v!=null)out[f]=v;
    if(t>=0)out.ft[f]=t;
  }
  return out;
}
const boatCore=r=>JSON.stringify(BOAT_SYNC_FIELDS().map(f=>[r?.[f]??'',r?.ft?.[f]??null]));
async function boatPatch(name,changes,weak=false){
  // weak: nur Voreinstellungen (z. B. neues Gerät) – zählen als „uralt“ und überschreiben nie echte Angaben
  if(!name)return;
  const id=boatId(name),cur=(await getBoatRec(id))||{id,deleted:false,ft:{}};const now=Date.now();
  cur.name=name;cur.ft=cur.ft||{};
  for(const [k,v] of Object.entries(changes)){
    if(weak){if(v==null||v==='')continue;if(cur[k]!=null&&cur[k]!=='')continue;cur[k]=v;cur.ft[k]=0;}
    else{cur[k]=v;cur.ft[k]=now;}}
  cur.updatedAt=now;await putBoatRec(cur);syncSoon();
}
/* Nach dem Abgleich: Bootsmodell und Bootsart des aktuell gewählten Boots übernehmen */
function applyBoatRec(r){
  if(!r||r.id!==boatId(S.boatName))return false;let ch=false;
  if(r.type!=null&&r.type!==S.boatType){S.boatType=r.type;ch=true;}
  if(r.kind&&r.kind!==S.boatKind){S.boatKind=r.kind;ch=true;}
  if(ch){saveS();if(!rec)renderBoatHeader();}
  return ch;
}
/* ---- Geräteübergreifende Listen: Skipper, Steuermann, Kraftstoffarten ----
   Jeder Eintrag merkt sich, wann er hinzugefügt (a) und zuletzt geändert (t) wurde; gelöschte bleiben als Vermerk (del),
   damit sie nach dem Abgleich nicht auf einem anderen Gerät wieder auftauchen. */
async function allPdfs(){return rq((await db()).transaction('pdfs').objectStore('pdfs').getAll());}
async function putPdf(x){return rq((await db()).transaction('pdfs','readwrite').objectStore('pdfs').put(x));}
async function getMeta(id){return rq((await db()).transaction('meta').objectStore('meta').get(id));}
async function allMeta(){return rq((await db()).transaction('meta').objectStore('meta').getAll());}
async function putMeta(m){return rq((await db()).transaction('meta','readwrite').objectStore('meta').put(m));}
const LIST_KEYS=['skippers','helms','fuelTypes'];
const listBuiltins=k=>k==='fuelTypes'?['Diesel','Benzin']:[];
function listsToS(m){for(const k of LIST_KEYS){const e=m.entries[k]||{};const b=listBuiltins(k);
  S[k]=[...b,...Object.entries(e).filter(([n,v])=>!v.del&&!b.includes(n)).sort((x,y)=>(x[1].a||0)-(y[1].a||0)).map(([n])=>n)];}saveS();}
function mergeLists(a,b){const out={id:'lists',entries:{},updatedAt:Math.max(a?.updatedAt||0,b?.updatedAt||0)};
  for(const k of LIST_KEYS){const ea=a?.entries?.[k]||{},eb=b?.entries?.[k]||{},o={};
    for(const n of new Set([...Object.keys(ea),...Object.keys(eb)])){const x=ea[n],y=eb[n];
      const w=!x?y:!y?x:((y.t||0)>(x.t||0)?y:x);o[n]={...w,a:Math.min(x?.a??Infinity,y?.a??Infinity)};}
    out.entries[k]=o;}
  return out;}
async function initLists(){
  let m=await getMeta('lists');
  if(!m){const now=Date.now();m={id:'lists',updatedAt:now,entries:{}};
    for(const k of LIST_KEYS){m.entries[k]={};S[k].forEach((n,i)=>{m.entries[k][n]={a:now+i,t:now};});}
    await putMeta(m);}
  listsToS(m);
}
async function listChange(k,name,del){
  const m=(await getMeta('lists'))||{id:'lists',entries:{}};m.entries[k]=m.entries[k]||{};
  const now=Date.now(),old=m.entries[k][name];m.entries[k][name]={a:old?.a??now,t:now,del:!!del};
  m.updatedAt=now;await putMeta(m);listsToS(m);syncSoon();
}
const curTripObj=async id=>(rec&&rec.trip.id===id)?rec.trip:await getTrip(id);

/* ================= Wetter & Ort ================= */
const WMO={0:['Klar / sonnig','☀️'],1:['Überwiegend sonnig','🌤️'],2:['Teilweise bewölkt','⛅'],3:['Bedeckt','☁️'],45:['Nebel','🌫️'],48:['Nebel mit Reif','🌫️'],
51:['Leichter Nieselregen','🌦️'],53:['Nieselregen','🌦️'],55:['Starker Nieselregen','🌧️'],56:['Gefrierender Nieselregen','🌧️'],57:['Gefrierender Nieselregen','🌧️'],
61:['Leichter Regen','🌦️'],63:['Regen','🌧️'],65:['Starker Regen','🌧️'],66:['Gefrierender Regen','🌧️'],67:['Gefrierender Regen','🌧️'],
71:['Leichter Schneefall','🌨️'],73:['Schneefall','🌨️'],75:['Starker Schneefall','❄️'],77:['Schneegriesel','🌨️'],
80:['Leichte Regenschauer','🌦️'],81:['Regenschauer','🌧️'],82:['Heftige Regenschauer','⛈️'],85:['Schneeschauer','🌨️'],86:['Starke Schneeschauer','🌨️'],
95:['Gewitter','⛈️'],96:['Gewitter mit Hagel','⛈️'],99:['Schweres Gewitter mit Hagel','⛈️']};
const DIRS=['Nord','Nordnordost','Nordost','Ostnordost','Ost','Ostsüdost','Südost','Südsüdost','Süd','Südsüdwest','Südwest','Westsüdwest','West','Westnordwest','Nordwest','Nordnordwest'];
const dirTxt=d=>d==null?'':DIRS[Math.round(d/22.5)%16];
const bft=k=>{const l=[1,6,12,20,29,39,50,62,75,89,103,118];let b=0;while(b<12&&k>=l[b])b++;return b;};
function wxTxt(w,short){
  if(!w)return '<span class="pending">wird geladen, sobald online</span>';
  if(short)return `${w.icon} ${num(w.temp,0)}°`;
  return `${w.icon} ${esc(w.desc)}<br>🌡 ${num(w.temp)} °C<br>💨 Wind aus ${w.dir}, ${windTxt(w.wind)}${w.gust!=null?`, Böen ${windTxt(w.gust)}`:''}`;
}
async function weatherAt(lat,lon,t){
  const day=new Date(t).toISOString().slice(0,10);
  const old=(Date.now()-t)/864e5>60;
  const base=old?'https://archive-api.open-meteo.com/v1/archive':'https://api.open-meteo.com/v1/forecast';
  const url=`${base}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&start_date=${day}&end_date=${day}&timezone=UTC&timeformat=unixtime&wind_speed_unit=kmh`;
  const r=await fetch(url);const j=await r.json();
  if(!r.ok||j.error)throw new Error(j.reason||'Wetter '+r.status);
  const h=j.hourly;let bi=0,bd=Infinity;
  h.time.forEach((s,i)=>{const d=Math.abs(s*1000-t);if(d<bd){bd=d;bi=i;}});
  if(h.temperature_2m[bi]==null||h.weather_code[bi]==null)throw new Error('Wetter noch nicht verfügbar');
  const c=h.weather_code[bi];const [desc,icon]=WMO[c]||['Unbekannt','🌡'];
  const wind=h.wind_speed_10m[bi];
  return {code:c,desc,icon,temp:h.temperature_2m[bi],wind,gust:h.wind_gusts_10m?.[bi]??null,dir:dirTxt(h.wind_direction_10m[bi]),bft:bft(wind),src:'Open-Meteo'};
}
async function placeName(lat,lon){
  const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1&accept-language=de`);
  if(!r.ok)throw new Error('Ortssuche '+r.status);
  const j=await r.json();
  if(j.error)return `${num(lat,4)}, ${num(lon,4)}`;
  const a=j.address||{};
  const town=a.city||a.town||a.village||a.municipality||a.hamlet||a.suburb||a.county||'';
  const name=(j.name&&j.name!==town)?j.name:'';
  return [name,town].filter(Boolean).join(', ')||(j.display_name||'').split(',').slice(0,2).join(',')||'Unbekannt';
}
let enriching=false;
async function enrichAll(){
  if(enriching||!navigator.onLine)return;enriching=true;let any=false;
  try{
    for(const t0 of await liveTrips()){
      const jobs=[];
      if(t0.start?.lat!=null){if(!t0.placeStart)jobs.push('placeStart');if(!t0.weatherStart)jobs.push('weatherStart');}
      if(t0.status==='done'&&t0.end?.lat!=null){if(!t0.placeEnd)jobs.push('placeEnd');if(!t0.weatherEnd)jobs.push('weatherEnd');}
      for(const job of jobs){
        try{
          const p=job.endsWith('Start')?t0.start:t0.end;
          const val=job.startsWith('place')?await placeName(p.lat,p.lon):await weatherAt(p.lat,p.lon,p.t);
          const t=await curTripObj(t0.id);
          t[job]=val;t.updatedAt=Date.now();await putTrip(t);any=true;
          if(job.startsWith('place'))await sleep(1100); // Nominatim: max. 1 Anfrage/Sekunde
        }catch(e){console.warn(job,e);}
      }
    }
    for(const f of await liveFuel()){
      if(f.lat==null||f.place)continue;
      try{const name=await placeName(f.lat,f.lon);const cur=await getFuel(f.id);cur.place=name;cur.updatedAt=Date.now();await putFuel(cur);any=true;await sleep(1100);}
      catch(e){console.warn('fuel place',e);}
    }
  }finally{enriching=false;}
  if(any){refreshView();syncSoon();}
}

/* ================= Aufzeichnung ================= */
let rec=null; // {trip, watch, wake, lastFix}
const getPos=(timeout=15000)=>new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout,maximumAge:5000}));
function persist(){if(rec)putTrip(rec.trip).catch(e=>console.error(e));}

async function askBriefing(trip){
  const {v}=await modal(`<h3>Sicherheitsunterweisung</h3><p style="font-size:17px">Sicherheitsunterweisung der Crew durchgeführt?</p>
    <p class="hint">Zum Beispiel Rettungswesten, Feuerlöscher, Notruf, Mann über Bord, Verhalten bei Notfällen.</p>
    <div class="row" style="justify-content:flex-end"><button value="no" class="btn ghost" style="min-width:90px">Nein</button><button value="yes" class="btn" style="min-width:90px">Ja</button></div>`,
    d=>d.addEventListener('cancel',e=>e.preventDefault()));
  trip.briefing={done:v==='yes',t:Date.now()};trip.updatedAt=Date.now();await putTrip(trip);
  if(rec&&rec.trip.id===trip.id)renderHome();
  toast(v==='yes'?'Sicherheitsunterweisung: Ja – gespeichert':'Sicherheitsunterweisung: Nein – gespeichert');
}
const briefingText=t=>t.briefing?(t.briefing.done?`Ja (${fmtTime(t.briefing.t)} Uhr)`:'Nein'):((t.crew?.pax||1)>1?'nicht erfasst':'nicht erforderlich (1 Person)');
async function startTrip(){
  if(rec)return;
  if(!S.boatName){alert('Bitte zuerst in den Einstellungen einen Bootsnamen eintragen.');return;}
  if(!P.skipper||!P.helm){alert('Bitte zuerst Skipper und Steuermann auswählen.');return;}
  if(!('geolocation' in navigator)){alert('Dieses Gerät/dieser Browser bietet kein GPS.');return;}
  const now=Date.now();
  const trip={id:uid(),v:1,status:'active',createdAt:now,updatedAt:now,deleted:false,
    start:{t:now,lat:null,lon:null,acc:null},end:null,points:[],distance:0,maxSpd:0,
    placeStart:null,placeEnd:null,weatherStart:null,weatherEnd:null,note:'',notes:{},
    boat:{type:S.boatType,name:S.boatName,kind:S.boatKind||'motor'},
    skipper:P.skipper,helms:[{t:now,name:P.helm}],
    crew:{pax:Math.max(P.pax,autoCrew(P.skipper,[P.helm]).length),guests:P.guests.filter(g=>g&&g!==P.skipper&&g!==P.helm)}};
  {const init=Object.entries(TGL).filter(([k])=>S.toggles[k]).map(([k,v])=>({t:now,type:v[0],lat:null,lon:null}));if(init.length)trip.events=init;}
  rec={trip,watch:null,wake:null,lastFix:null};
  await putTrip(trip);
  navigator.storage?.persist?.();
  renderHome();toast('Fahrtbeginn gespeichert: '+fmtTime(now));
  beginWatch();keepAwake();
  getPos().then(onPos).catch(()=>toast('Warte auf GPS-Signal …'));
  if(trip.crew.pax>1)askBriefing(trip);
}
function beginWatch(){
  rec.watch=navigator.geolocation.watchPosition(onPos,err=>{
    if(err.code===1)alert('Standortzugriff wurde verweigert. Bitte in den Einstellungen des Geräts erlauben.');
    updateLive();
  },{enableHighAccuracy:true,maximumAge:0,timeout:30000});
}
function onPos(p){
  if(!rec)return;const t=rec.trip,c=p.coords;
  rec.lastFix={t:Date.now(),acc:c.accuracy};
  const pt={t:Math.max(p.timestamp||0,t.start.t)||Date.now(),lat:+c.latitude.toFixed(6),lon:+c.longitude.toFixed(6),acc:Math.round(c.accuracy),
    spd:(c.speed!=null&&c.speed>=0)?+c.speed.toFixed(2):null};
  let startSet=false;
  if(t.start.lat==null&&c.accuracy<=Math.max(S.maxAcc,100)){Object.assign(t.start,{lat:pt.lat,lon:pt.lon,acc:pt.acc});startSet=true;}
  if(c.accuracy<=S.maxAcc){
    const last=t.points[t.points.length-1];let ok=true;
    if(last){
      const d=hav(last,pt),dt=(pt.t-last.t)/1000;
      const seg=dt>0?d/dt:0;
      if(dt>=1&&seg<25&&seg>=0.3&&(pt.spd==null||pt.spd<0.3))pt.spd=+seg.toFixed(2);
      if(dt<=0||d/dt>25)ok=false;
      else if(d<S.minDist&&dt<S.maxInterval)ok=false;
      if(ok&&segCounts(last,pt,d))t.distance+=d;
    }
    if(ok){if(pt.spd!=null)t.maxSpd=Math.max(t.maxSpd||0,pt.spd);t.points.push(pt);t.updatedAt=Date.now();persist();}
  }
  if(startSet){t.updatedAt=Date.now();persist();enrichAll();}
  updateLive();
}
let stopping=false;
async function stopTrip(){
  if(!rec||stopping)return;
  if(!confirm((isSailTrip(rec.trip)?'Fahrtende':'Motor ausgeschaltet')+' – Fahrt jetzt beenden?'))return;
  stopping=true;$('#bMG')&&($('#bMG').disabled=true);
  const t=rec.trip,now=Date.now();
  {const lp=t.points[t.points.length-1]; // aktuelle Position nur abwarten, wenn die letzte älter als 30 s ist
   if(!lp||now-lp.t>30000){try{const p=await getPos(5000);onPos(p);}catch(e){}}}
  navigator.geolocation.clearWatch(rec.watch);
  const last=t.points[t.points.length-1];
  t.end={t:now,lat:last?.lat??t.start.lat,lon:last?.lon??t.start.lon,acc:last?.acc??null};
  t.status='done';t.distance=trackDist(t.points);t.updatedAt=Date.now();
  await putTrip(t);releaseWake();rec=null;stopping=false;
  P=preFromTrip(t);saveP();
  if(localStorage.getItem('bb_reload')){localStorage.removeItem('bb_reload');setTimeout(()=>location.reload(),2500);}
  renderHome();toast(`Fahrtende gespeichert: ${fmtTime(now)} · ${fmtKm(t.distance)}`);
  enrichAll().then(()=>syncNow(true));
}
async function keepAwake(){if(!S.wake||!rec||!('wakeLock' in navigator))return;try{rec.wake=await navigator.wakeLock.request('screen');}catch(e){}}
function releaseWake(){try{rec?.wake?.release();}catch(e){}}

function updateLive(){
  if(!rec||!$('#lvDur'))return;const t=rec.trip;
  $('#lvDur').textContent=fmtDur(Date.now()-t.start.t);
  $('#lvDist').textContent=fmtKm(t.distance);
  const last=t.points[t.points.length-1];
  $('#lvSpd').textContent=last&&Date.now()-last.t<90000?kmh(last.spd):'–';
  const f=rec.lastFix;
  $('#lvGps').textContent=!f?'suche …':(Date.now()-f.t>60000?'kein Signal':`±${Math.round(f.acc)} m`);
  $('#lvPtsTxt').textContent=t.points.length+(t.points.length===1?' Wegpunkt':' Wegpunkte');
  $('#lvStart').textContent=`${fmtTime(t.start.t)} · ${t.placeStart||fmtCoord(t.start.lat,t.start.lon)}`;
}
setInterval(updateLive,1000);

/* ================= Kommentare ================= */
async function setNote(trip,key,text){
  trip.notes=trip.notes||{};
  if(text&&text.trim())trip.notes[key]={text:text.trim(),updatedAt:Date.now()};else delete trip.notes[key];
  trip.updatedAt=Date.now();await putTrip(trip);syncSoon();
}
function ask(title,val){return new Promise(res=>{const d=$('#dlg');$('#dlgT').textContent=title;$('#dlgTx').value=val||'';d.returnValue='';
  d.addEventListener('close',()=>res(d.returnValue==='ok'?$('#dlgTx').value:null),{once:true});d.showModal();});}

/* ================= Navigation ================= */
let navDepth=0;
function setTitle(t,back){$('#title').textContent=t;$('#back').style.visibility=back?'visible':'hidden';renderBoatHeader();}
$('#boatBtn').onclick=e=>{e.stopPropagation();editBoat();};
$('#back').onclick=()=>{if(navDepth>0){navDepth-=2;history.back();}else location.hash='#/';};
$('#menuBtn').onclick=e=>{e.stopPropagation();$('#menu').hidden=!$('#menu').hidden;};
document.addEventListener('click',()=>$('#menu').hidden=true);
window.addEventListener('hashchange',()=>{navDepth++;route();});
function route(){
  $('#menu').hidden=true;destroyMap();window.scrollTo(0,0);
  const h=location.hash.slice(1)||'/';const [path,q]=h.split('?');const parts=path.split('/');
  if(parts[1]==='fahrten')return renderList();
  if(parts[1]==='fahrt'&&parts[2])return renderTrip(decodeURIComponent(parts[2]),new URLSearchParams(q||'').get('p'));
  if(parts[1]==='kommentare')return renderComments();
  if(parts[1]==='verbrauch')return renderFuel();
  if(parts[1]==='einstellungen')return renderSettings();
  if(parts[1]==='hilfe')return renderHelp();
  if(parts[1]==='datenschutz')return renderPrivacy();
  renderHome();
}
function refreshView(){
  const h=location.hash||'#/';
  if(h==='#/'||h==='#'||h.startsWith('#/fahrten')||h.startsWith('#/kommentare')||h.startsWith('#/verbrauch'))route();
  else if(h.startsWith('#/fahrt/'))refreshTripMeta();
}


/* ================= Besatzung ================= */
const uniq=a=>[...new Set(a.filter(Boolean))];
const DEFAULT_PAX=2;
const freshPre=()=>({skipper:defSkipper(),helm:defHelm(),pax:DEFAULT_PAX,guests:[],v:2,auto:true,basedOn:null,basedEnd:null});
const PREFILL_MS=48*36e5;
let P=Object.assign(freshPre(),JSON.parse(localStorage.getItem('bb_pre')||'{}'));
if(P.v!==2){P.pax=Math.max(P.pax||0,DEFAULT_PAX);P.v=2;}
if(P.auto===undefined)P.auto=true;
const saveP=()=>localStorage.setItem('bb_pre',JSON.stringify(P));
const tripHelms=t=>Array.isArray(t.helms)?t.helms:[];
const curHelm=t=>{const h=tripHelms(t);return h.length?h[h.length-1].name:'';};
const autoCrew=(skipper,helmNames)=>{const out=[];
  uniq([skipper,...helmNames]).forEach(n=>{const r=[];if(n===skipper)r.push('Skipper');if(helmNames.includes(n))r.push('Steuermann');out.push({name:n,role:r.join(' und ')});});return out;};
const tripAuto=t=>autoCrew(t.skipper||'',tripHelms(t).map(h=>h.name));
const tripPax=t=>t.crew?.pax||tripAuto(t).length||0;
const tripGuests=t=>(t.crew?.guests||[]).filter(Boolean);
/* Verlauf der Steuerleute mit Strecke und Dauer je Abschnitt */
function helmSegments(t){
  const H=tripHelms(t);if(!H.length)return [];
  const endT=t.status==='done'?t.end.t:Date.now();
  const seg=H.map((h,i)=>({name:h.name,from:h.t,to:i+1<H.length?H[i+1].t:endT,km:0}));
  const at=tt=>{let k=0;for(let i=0;i<seg.length;i++)if(tt>=seg[i].from)k=i;return k;};
  const pts=t.points||[];
  for(let i=1;i<pts.length;i++){const d=hav(pts[i-1],pts[i]);if(segCounts(pts[i-1],pts[i],d))seg[at(pts[i-1].t)].km+=d;}
  return seg;
}
/* Allgemeiner Dialog */
function modal(inner,setup){return new Promise(res=>{
  const d=document.createElement('dialog');d.className='gdlg';d.innerHTML=`<form method="dialog">${inner}</form>`;document.body.appendChild(d);
  setup&&setup(d);d.addEventListener('close',()=>{const v=d.returnValue;res({v,d});setTimeout(()=>d.remove(),0);},{once:true});d.showModal();});}
async function askName(title,label){
  const {v,d}=await modal(`<h3>${esc(title)}</h3><label class="hint">${esc(label)}</label><input type="text" id="gName" autocomplete="name" autocapitalize="words">
    <div class="row" style="justify-content:flex-end"><button value="cancel" class="btn ghost">Abbrechen</button><button value="ok" class="btn" id="gOk">Übernehmen</button></div>`,
    d=>{setTimeout(()=>$('#gName',d).focus(),50);$('#gOk',d).onclick=e=>{if(!$('#gName',d).value.trim()){e.preventDefault();toast('Bitte einen Namen eingeben');}};});
  return v==='ok'?$('#gName',d).value.trim().replace(/\s+/g,' '):null;
}
async function askLater(){
  const {v}=await modal(`<h3>Namen der Personen an Bord</h3><p>Möchtest du die Namen jetzt eingeben oder später unter der Fahrt im Reiter „Fahrten“ nachtragen?</p>
    <div class="row" style="justify-content:flex-end"><button value="later" class="btn ghost">Später</button><button value="now" class="btn">Jetzt eingeben</button></div>`);
  return v==='now';
}
function allKnownNames(trips){return uniq([...S.skippers,...S.helms,...(trips||[]).flatMap(t=>[t.skipper,...tripHelms(t).map(h=>h.name),...tripGuests(t)])]).sort((a,b)=>a.localeCompare(b,'de'));}
/* Namen und Anzahl der Personen an Bord bearbeiten; liefert {pax,guests} oder null */
async function editCrew(auto,pax,guests){
  const trips=await liveTrips().catch(()=>[]);const known=allKnownNames(trips).filter(n=>!auto.some(a=>a.name===n));
  const {v,d}=await modal(`<h3>Personen an Bord</h3>
    <label class="hint" for="gPax">Anzahl Personen (1 bis 12)</label>
    <select id="gPax" style="width:100%;font:inherit;padding:10px;border-radius:10px;background:var(--panel);color:var(--text);border:1px solid var(--line);margin-bottom:8px"></select>
    <ul class="crewList">${auto.map(a=>`<li><span>${esc(a.name)}</span><small>${esc(a.role)}</small></li>`).join('')}</ul>
    <div id="gGuests"></div>
    <datalist id="gKnown">${known.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
    <p class="hint">Skipper und Steuerleute werden automatisch als Personen an Bord gezählt. Leere Felder kannst du später nachtragen.</p>
    <div class="row" style="justify-content:flex-end"><button value="cancel" class="btn ghost">Abbrechen</button><button value="ok" class="btn">Speichern</button></div>`,
    d=>{const sel=$('#gPax',d);const min=Math.max(1,auto.length);
      sel.innerHTML=Array.from({length:12},(_,i)=>i+1).filter(n=>n>=min).map(n=>`<option value="${n}">${n} ${n===1?'Person':'Personen'}</option>`).join('');
      sel.value=String(Math.min(12,Math.max(min,pax)));
      const draw=()=>{const vals=[...d.querySelectorAll('.gG')].map(i=>i.value);const n=+sel.value-auto.length;
        $('#gGuests',d).innerHTML=Array.from({length:n},(_,i)=>`<input type="text" class="gG" list="gKnown" placeholder="Person ${auto.length+i+1}" value="${esc(vals[i]??guests[i]??'')}" autocapitalize="words">`).join('');};
      sel.onchange=draw;draw();});
  if(v!=='ok')return null;
  return {pax:+$('#gPax',d).value,guests:[...d.querySelectorAll('.gG')].map(i=>i.value.trim())};
}
/* Auswahlfeld mit „Weiterer …“ */
/* Wer ist an Bord? (Skipper, Steuerleute, namentlich bekannte Gäste) */
const onBoardPre=()=>uniq([P.skipper,P.helm,...P.guests]);
const onBoardTrip=t=>uniq([t.skipper,...tripHelms(t).map(h=>h.name),...tripGuests(t)]);
const paxPre=()=>Math.max(P.pax,autoCrew(P.skipper,[P.helm]).length);
/* Gäste-Slots an die Personenzahl anpassen: benannte zuerst behalten */
function fitGuests(guests,slots){const named=guests.filter(Boolean),out=named.slice(0,Math.max(0,slots));while(out.length<slots)out.push('');return out;}
function addGuest(guests,name){if(!name||guests.includes(name))return guests;const g=[...guests];const i=g.indexOf('');if(i>=0)g[i]=name;else g.push(name);return g;}
/* Vorbelegung aus der letzten Fahrt (beendet innerhalb von 48 Stunden) */
function preFromTrip(t){
  const sk=t.skipper||defSkipper(),hl=tripHelms(t)[0]?.name||sk;
  const all=onBoardTrip(t),guests=all.filter(n=>n!==sk&&n!==hl);
  const pax=Math.max(tripPax(t),uniq([sk,hl]).length+guests.length);
  return {skipper:sk,helm:hl,pax,guests:fitGuests(guests,pax-uniq([sk,hl]).length),v:2,auto:true,basedOn:t.id,basedEnd:t.end.t};
}
async function refreshPre(){
  if(rec||!P.auto)return false;
  const done=(await liveTrips()).filter(t=>t.status==='done'&&t.end);
  const last=done.sort((a,b)=>b.end.t-a.end.t)[0];
  if(last&&Date.now()-last.end.t<PREFILL_MS){if(P.basedOn===last.id&&P.basedEnd===last.end.t)return false;P=preFromTrip(last);saveP();return true;}
  if(P.basedOn){P=freshPre();saveP();return true;}
  return false;
}
function personOptions(list,sel,otherLabel,allowNew=true){
  const names=uniq([...list,sel]);
  return (sel?'':'<option value="" selected disabled>bitte wählen</option>')+names.map(n=>`<option value="${esc(n)}" ${n===sel?'selected':''}>${esc(n)}</option>`).join('')+(allowNew?`<option value="__new">${otherLabel} …</option>`:'');
}
async function pickPerson(selEl,listKey,title,label,prev){
  if(selEl.value!=='__new')return selEl.value;
  const n=await askName(title,label);
  if(!n){selEl.value=prev;return null;}
  if(!S[listKey].includes(n)){S[listKey].push(n);saveS();listChange(listKey,n,false);}
  return n;
}
function crewBarHtml(){
  const r=!!rec,t=rec?.trip;
  if(!r&&P.auto&&P.basedEnd&&Date.now()-P.basedEnd>=PREFILL_MS){P=freshPre();saveP();}
  const sk=r?(t.skipper||'–'):P.skipper,hl=r?(curHelm(t)||defHelm()):P.helm,px=r?tripPax(t):paxPre();
  const board=r?onBoardTrip(t):onBoardPre();
  const full=board.length>=px; // alle Plätze namentlich belegt → nur diese Personen wählbar
  const min=r?Math.max(1,tripAuto(t).length):Math.max(1,autoCrew(P.skipper,[P.helm]).length);
  const paxOpts=Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===px?'selected':''} ${n<min?'disabled':''}>${n}</option>`).join('');
  const named=Math.min(board.length,px);
  // Vor der Fahrt ist alles frei wählbar; während der Fahrt nur Personen an Bord, sobald alle Plätze benannt sind
  const lock=r&&full;
  const helmList=lock?board:uniq([...board,...S.helms]);
  const skList=uniq([...S.skippers,...board]);
  return `<div class="crewbar">
    <label class="msel ${r?'locked':''}"><span class="in"><small>Skipper</small><select id="cSk" ${r?'disabled':''}>${r?`<option>${esc(sk)}</option>`:personOptions(skList,sk,'Weiterer Skipper',true)}</select></span></label>
    <label class="msel"><span class="in"><small>Steuermann</small><select id="cHl">${personOptions(helmList,hl,'Weiterer Steuermann',!lock)}</select></span></label>
    <label class="msel"><span class="in"><small>Pax</small><select id="cPx" aria-label="Personen an Bord">${paxOpts}</select></span></label>
  </div>
  <button class="msel crewBtn" id="cNames"><span class="in">
    <span><small>Personen an Bord</small><b>${px} ${px===1?'Person':'Personen'}</b>${named<px?`<span class="cbMiss">${px-named} ohne Namen</span>`:''}</span>
    <span class="cbR">Namen ${named<px?'eingeben':'bearbeiten'}</span></span></button>`;
}
/* Vor der Fahrt: neue Person übernimmt eine Rolle. Bleibt die bisherige Person an Bord? */
async function askKeep(name){
  const {v}=await modal(`<h3>Alle Plätze sind belegt</h3><p>Bleibt <b>${esc(name)}</b> trotzdem an Bord?</p>
    <div class="row" style="justify-content:flex-end"><button value="no" class="btn ghost">Nein, ersetzen</button><button value="yes" class="btn">Ja, eine Person mehr</button></div>`);
  return v!=='no';
}
async function preSwap(prev,n,prevKeepsRole){
  const wasOnBoard=onBoardPre().includes(n),full=onBoardPre().length>=paxPre();
  let g=P.guests.filter(x=>x!==n);
  if(!prevKeepsRole&&prev!==n){
    const keep=(!wasOnBoard&&full)?await askKeep(prev):true;
    if(keep)g=addGuest(g,prev);
  }
  return g;
}
function bindCrewBar(){
  const sk=$('#cSk'),hl=$('#cHl'),px=$('#cPx');
  if(!rec)sk.onchange=async()=>{const prev=P.skipper;const n=await pickPerson(sk,'skippers','Weiterer Skipper','Name des Skippers',prev);if(!n||n===prev){renderHome();return;}
    const g=await preSwap(prev,n,prev===P.helm);
    P.skipper=n;P.pax=Math.max(P.pax,uniq([P.skipper,P.helm]).length+g.filter(Boolean).length);
    P.guests=fitGuests(g,P.pax-uniq([P.skipper,P.helm]).length);P.auto=false;saveP();renderHome();};
  hl.onchange=async()=>{
    const prev=rec?curHelm(rec.trip):P.helm;
    const n=await pickPerson(hl,'helms','Weiterer Steuermann','Name des Steuermanns',prev);if(!n||n===prev){renderHome();return;}
    if(rec){const t=rec.trip;t.helms=tripHelms(t);t.helms.push({t:Date.now(),name:n});
      t.crew=t.crew||{pax:1,guests:[]};
      const wasGuest=(t.crew.guests||[]).includes(n);
      t.crew.guests=(t.crew.guests||[]).filter(g=>g!==n);
      const autoN=tripAuto(t).length;
      // neuer Name füllt einen freien Platz; Gäste-Slots entsprechend verkleinern
      t.crew.guests=fitGuests(t.crew.guests,Math.max(0,t.crew.pax-autoN));
      if(t.crew.pax<autoN){t.crew.pax=autoN;toast(`Steuermann: ${n} ab ${fmtTime(Date.now())} – Personen an Bord auf ${autoN} erhöht`);}
      else toast(`Steuermann: ${n} ab ${fmtTime(Date.now())} Uhr`);
      t.updatedAt=Date.now();persist();}
    else{const g=await preSwap(prev,n,prev===P.skipper);
      P.helm=n;P.pax=Math.max(P.pax,uniq([P.skipper,P.helm]).length+g.filter(Boolean).length);
      P.guests=fitGuests(g,P.pax-uniq([P.skipper,P.helm]).length);P.auto=false;saveP();}
    renderHome();};
  const names=async()=>{
    const auto=rec?tripAuto(rec.trip):autoCrew(P.skipper,[P.helm]);
    const cur=rec?{pax:tripPax(rec.trip),guests:rec.trip.crew?.guests||[]}:{pax:paxPre(),guests:P.guests};
    const res=await editCrew(auto,+px.value||cur.pax,cur.guests);if(!res){renderHome();return;}
    if(rec){rec.trip.crew=res;rec.trip.updatedAt=Date.now();persist();}else{P.pax=res.pax;P.guests=res.guests;P.auto=false;saveP();}
    renderHome();};
  px.onchange=async()=>{
    const n=+px.value;
    const auto=rec?tripAuto(rec.trip):autoCrew(P.skipper,[P.helm]);
    if(rec){const c=rec.trip.crew||{guests:[]};c.pax=n;c.guests=fitGuests(c.guests||[],n-auto.length);rec.trip.crew=c;rec.trip.updatedAt=Date.now();persist();}
    else{P.pax=n;P.guests=fitGuests(P.guests,n-auto.length);P.auto=false;saveP();}
    const board=rec?onBoardTrip(rec.trip):onBoardPre();
    if(n>board.length&&await askLater())await names();else renderHome();};
  $('#cNames').onclick=e=>{e.preventDefault();names();};
}

/* ================= Notfall (SOS) ================= */
const MRCC_TEL='+49421536870',MRCC_TEL_SHOW='+49 421 53687-0';
function sayCoord(v,pos,neg){const h=v>=0?pos:neg;v=Math.abs(v);const d=Math.floor(v);const m=((v-d)*60).toFixed(3).replace('.',',');
  return {big:`${String(d).padStart(pos==='Nord'?2:3,'0')}° ${m.padStart(6,'0')}′ ${h==='Nord'?'N':h==='Süd'?'S':h==='Ost'?'E':'W'}`,say:`${d} Grad ${m} Minuten ${h}`};}
let sosWatch=null;
async function openSos(){
  let d=$('#sosDlg');
  if(!d){d=document.createElement('dialog');d.id='sosDlg';document.body.appendChild(d);}
  const boat=rec?tripBoat(rec.trip):{type:S.boatType,name:S.boatName};
  const bi=await boatInfo(boat.name);
  const pax=rec?tripPax(rec.trip):Math.max(P.pax,autoCrew(P.skipper,[P.helm]).length);
  const row=(l,v,u)=>`<dt>${l}</dt><dd>${v?esc(v)+(u?' '+u:''):'<span class="hint">nicht hinterlegt</span>'}</dd>`;
  d.innerHTML=`<form method="dialog" style="margin:0">
    <div class="sosHead">
      <h2>Maritime Rescue Co-ordination Centre (MRCC)</h2>
      <p><b>Bremen</b></p>
      <p>UKW-Kanal 16 und 70 (DSC)</p>
      <a class="tel" href="tel:${MRCC_TEL}"><small>Notfall (24 h) – antippen zum Anrufen</small>📞 ${MRCC_TEL_SHOW}</a>
    </div>
    <div class="blk"><h3>Boot</h3><dl>
      ${row('Bootsart',kindLabel(boat.kind||bi.kind||S.boatKind))}${row('Bootsmodell',boat.type)}${row('Bootsname',boat.name)}
      ${BOAT_FIELDS.map(([k,l,,u])=>row(l,bi[k],u)).join('')}
    </dl>${BOAT_FIELDS.some(([k])=>!bi[k])?'<p class="hint">Fehlende Angaben unter Einstellungen → Boot ergänzen.</p>':''}</div>
    <div class="blk"><h3>Position</h3><div id="sosPos"><p class="say">Position wird ermittelt …</p></div></div>
    <div class="blk"><h3>Personen an Bord</h3><div class="paxBig">${pax} ${pax===1?'Person':'Personen'}</div></div>
    <div class="row" style="margin-top:16px"><button class="btn full" value="close" style="font-size:18px;padding:14px">Schließen</button></div>
  </form>`;
  const show=(lat,lon,acc,t)=>{const a=sayCoord(lat,'Nord','Süd'),b=sayCoord(lon,'Ost','West');
    const el=$('#sosPos');if(!el)return;
    el.innerHTML=`<div class="pos">${a.big}<br>${b.big}</div>
      <div class="say">Zum Vorlesen:<br><b>${a.say}</b><br><b>${b.say}</b></div>
      <p class="hint" style="margin:6px 0 0">Stand ${fmtTime(t,true)} Uhr · Genauigkeit ±${Math.round(acc)} m</p>`;};
  const last=rec&&rec.trip.points[rec.trip.points.length-1];
  if(last)show(last.lat,last.lon,last.acc,last.t);
  if('geolocation' in navigator){
    if(sosWatch!=null)navigator.geolocation.clearWatch(sosWatch);
    sosWatch=navigator.geolocation.watchPosition(p=>show(p.coords.latitude,p.coords.longitude,p.coords.accuracy,p.timestamp||Date.now()),
      err=>{if(!last&&$('#sosPos'))$('#sosPos').innerHTML='<p class="say"><b>Keine GPS-Position verfügbar.</b> Standortzugriff erlauben oder Position von Seekarte/Plotter ablesen.</p>';},
      {enableHighAccuracy:true,maximumAge:0,timeout:30000});
  }
  d.addEventListener('close',()=>{if(sosWatch!=null){navigator.geolocation.clearWatch(sosWatch);sosWatch=null;}},{once:true});
  d.showModal();
}

/* ================= Startseite ================= */
let syncMsg='';
function statusLine(){
  const on=navigator.onLine?'🟢 Online':'⚪ Offline';
  const od=(S.odEnabled&&localStorage.getItem('bb_od_on'))?(' · OneDrive: '+(syncMsg||'verbunden')):'';
  return on+od;
}
function updateStatus(){const s=$('#stat');if(s)s.textContent=statusLine();}
/* ================= Motor und Segel (Segelboote) ================= */
const EV={motorOn:'Motor an',motorOff:'Motor aus',sailUp:'Segel gesetzt',sailDown:'Segel geborgen',
  anchorDown:'Anker geworfen',anchorUp:'Anker gelichtet',anchorLightOn:'Ankerlicht an',anchorLightOff:'Ankerlicht aus',navLightOn:'Positionslichter an',navLightOff:'Positionslichter aus'};
const EV_ON=new Set(['motorOn','sailUp','anchorDown','anchorLightOn','navLightOn']);
const tripEvents=t=>(Array.isArray(t.events)?t.events:[]).slice().sort((a,b)=>a.t-b.t);
const isSailTrip=t=>tripBoat(t).kind==='sail'||tripEvents(t).some(e=>/^(motor|sail)/.test(e.type));
function evState(t,on,off){let st=null,since=null;for(const e of tripEvents(t)){if(e.type===on){st='on';since=e.t;}else if(e.type===off){st='off';since=e.t;}}return {st,since};}
function evDurations(t){
  const endT=t.status==='done'&&t.end?t.end.t:Date.now();
  const sum=(on,off)=>{let ms=0,s0=null;for(const e of tripEvents(t)){if(e.type===on&&s0==null)s0=e.t;else if(e.type===off&&s0!=null){ms+=e.t-s0;s0=null;}}if(s0!=null)ms+=endT-s0;return ms;};
  const ev=tripEvents(t);
  return {motorMs:sum('motorOn','motorOff'),sailMs:sum('sailUp','sailDown'),anchorMs:sum('anchorDown','anchorUp'),hasMotor:ev.some(e=>e.type.startsWith('motor')),hasSail:ev.some(e=>e.type.startsWith('sail')),hasAnchor:ev.some(e=>e.type.startsWith('anchorD')||e.type==='anchorUp')};
}
/* Motorlaufzeit: bei erfassten Motor-Ereignissen deren Summe, sonst die ganze Fahrt */
const motorHours=t=>{const d=evDurations(t);return (d.hasMotor?d.motorMs:(t.end?t.end.t:Date.now())-t.start.t)/36e5;};
async function logEvent(type){
  if(!rec){toast('Bitte zuerst „Start“ drücken');return;}
  const t=rec.trip,now=Date.now(),p=t.points[t.points.length-1];
  t.events=tripEvents(t);t.events.push({t:now,type,lat:p&&now-p.t<180000?p.lat:null,lon:p&&now-p.t<180000?p.lon:null});
  t.updatedAt=now;persist();renderHome();toast(`${EV[type]} – ${fmtTime(now)} Uhr`);
}
/* Anker, Ankerlicht, Positionslichter: Ein/Aus-Schalter. Der Zustand gilt auch zwischen den Fahrten;
   während einer Fahrt wird jede Betätigung protokolliert, beim Start werden eingeschaltete Zustände übernommen. */
const TGL={anchor:['anchorDown','anchorUp'],anchorLight:['anchorLightOn','anchorLightOff'],navLight:['navLightOn','navLightOff']};
if(!S.toggles||typeof S.toggles!=='object')S.toggles={anchor:false,anchorLight:false,navLight:false};
async function toggleState(key){
  const on=!S.toggles[key];S.toggles[key]=on;saveS();
  const type=TGL[key][on?0:1],now=Date.now();
  if(rec){const t=rec.trip,p=t.points[t.points.length-1];t.events=tripEvents(t);
    t.events.push({t:now,type,lat:p&&now-p.t<180000?p.lat:null,lon:p&&now-p.t<180000?p.lon:null});t.updatedAt=now;persist();}
  renderHome();toast(`${EV[type]} – ${fmtTime(now)} Uhr`+(rec?'':' (keine Fahrt aktiv, wird beim nächsten Start übernommen)'));
}
const ICON_ANCHOR='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.6" r="2.1" fill="none" stroke="currentColor" stroke-width="1.7"/><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 6.7v14.3M8 10.5h8M4.2 13.2c.4 4.3 3.6 7.4 7.8 7.8 4.2-.4 7.4-3.5 7.8-7.8"/><path fill="currentColor" d="M2.6 14.6l1.6-3.4 2.7 2.6zM21.4 14.6l-1.6-3.4-2.7 2.6z"/></svg>';
const ICON_ANCHOR_LIGHT='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a5.6 5.6 0 0 0-3.4 10c.7.6 1.1 1.3 1.1 2.1v.9h4.6v-.9c0-.8.4-1.5 1.1-2.1A5.6 5.6 0 0 0 12 2.2zM9.7 16.3h4.6v1.4H9.7zM10.4 18.4h3.2l-.5 1.1h-2.2z"/><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M2.5 7.8h1.6M19.9 7.8h1.6M4.4 2.9l1.2 1.1M19.6 2.9l-1.2 1.1"/><g transform="translate(12 8.2) scale(.33) translate(-12 -12)" fill="none" stroke="#5f6670" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.4" r="2.2"/><path d="M12 6.6V21M8 10h8M4.3 13.4c.5 4.1 3.6 7.1 7.7 7.6 4.1-.5 7.2-3.5 7.7-7.6"/></g></svg>';
const ICON_NAV_LIGHT='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e53935" d="M12 2.2a5.6 5.6 0 0 0-3.4 10c.7.6 1.1 1.3 1.1 2.1v.9H12z"/><path fill="#22a35a" d="M12 2.2v13h2.3v-.9c0-.8.4-1.5 1.1-2.1A5.6 5.6 0 0 0 12 2.2z"/><path fill="#f6dc9a" d="M9.7 16.3h4.6v1.4H9.7zM10.4 18.4h3.2l-.5 1.1h-2.2z"/><path fill="none" stroke="#e53935" stroke-width="1.3" stroke-linecap="round" d="M2.5 7.8h1.6M4.4 2.9l1.2 1.1"/><path fill="none" stroke="#22a35a" stroke-width="1.3" stroke-linecap="round" d="M19.9 7.8h1.6M19.6 2.9l-1.2 1.1"/></svg>';
function tglBtn(id,icon,label,on){return `<div class="sideItem"><button class="ssb tgl warm ${on?'lit':''}" id="${id}" aria-pressed="${on}" aria-label="${label}"><span class="face">${icon}</span></button><small>${label}</small></div>`;}
const ICON_ENGINE='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h6v2h-2v1.5h3.2l1.8 2H18V9h2.5v7H18v-1.5h-1.5L14 17.5H8.2L6.5 16H5v-2.5H3.5V16H2V9.5h1.5V12H5V9.6L6.6 8.5H9V7H7z"/></svg>';
const ICON_SAIL_UP='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.2 2.5v12.2H4.6zM12.6 4.6l6.6 10.1h-6.6z"/><path fill="currentColor" d="M11.2 2.2h1.4v13.6h-1.4z"/><path fill="currentColor" d="M2.5 16.4h19l-3 4H5.5z"/></svg>';
const ICON_SAIL_DOWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.2 2.2h1.4v13.6h-1.4z"/><path fill="currentColor" d="M5.5 13.6h6v1.2h-6z"/><path fill="currentColor" d="M2.5 16.4h19l-3 4H5.5z"/></svg>';
function miniBtn(id,icon,label,cls,dis,lit){return `<div class="sideItem"><button class="ssb mini ${cls} ${lit?'lit':''}" id="${id}" ${dis?'disabled':''} aria-label="${label}"><span class="face">${icon}</span></button><small class="${cls}">${label}</small></div>`;}
function renderHome(){
  setTitle('Bordbuch',false);const r=!!rec;
  const sail=r?isSailTrip(rec.trip):S.boatKind==='sail';
  const subS=sail?'Fahrtbeginn':'Motor gestartet',subE=sail?'Fahrtende':'Motor ausgeschaltet';
  const mot=r?evState(rec.trip,'motorOn','motorOff'):{st:null},sl=r?evState(rec.trip,'sailUp','sailDown'):{st:null};
  view.innerHTML=`<div class="home">
  <div class="status" id="stat">${esc(statusLine())}</div>
  <div class="bigbtns ${r?'recording':''} ${sail?'sailmode':''}">
    <button class="ssb start ${r?'lit':''}" id="bMS" ${r?'disabled':''} aria-label="Start – ${subS}"><span class="face"><span class="main">Start</span><span class="sub">${subS}</span></span></button>
    <button class="ssb stop ${r?'':'lit'}" id="bMG" ${r?'':'disabled'} aria-label="Stop – ${subE}"><span class="face"><span class="main">Stop</span><span class="sub">${subE}</span></span></button>
  <div class="side sideL">
  ${sail?miniBtn('bMotOn',ICON_ENGINE,'Motor an','evOn',r&&mot.st==='on',mot.st==='on'):''}
  ${sail?miniBtn('bSailUp',ICON_SAIL_UP,'Segel gesetzt','evOn',r&&sl.st==='on',sl.st==='on'):''}
  <div class="sosWrap"><button class="sos" id="bSos" aria-label="Notfall – S.O.S."><span>S.O.S.</span></button><small>Notfall</small></div>
  </div>
  <div class="side sideR">
  ${sail?miniBtn('bMotOff',ICON_ENGINE,'Motor aus','evOff',mot.st!=='on',mot.st!=='on'):''}
  ${sail?miniBtn('bSailDown',ICON_SAIL_DOWN,'Segel geborgen','evOff',sl.st!=='on',sl.st!=='on'):''}
  <div class="fuelWrap"><button class="ssb fuel" id="bFuel" aria-label="Tanken erfassen"><span class="face"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M5.5 2h7A1.5 1.5 0 0 1 14 3.5V20h1v2H3v-2h1V3.5A1.5 1.5 0 0 1 5.5 2zM6.2 4.3v5.2h5.6V4.3z"/><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M14 11.5h1.3c.8 0 1.4.6 1.4 1.4v4.4a1.6 1.6 0 0 0 3.2 0V8.6L17.6 6.2"/><path fill="currentColor" d="M18.4 4.6l2.6 2.6-1.1 1.1-2.6-2.6z"/></svg></span></button><small>Tanken</small></div>
  </div>
  </div>
  <div class="toggles">
    ${tglBtn('bAnchor',ICON_ANCHOR,'Anker',S.toggles.anchor)}
    ${tglBtn('bAnchorLight',ICON_ANCHOR_LIGHT,'Ankerlicht',S.toggles.anchorLight)}
    ${tglBtn('bNavLight',ICON_NAV_LIGHT,'Positionslichter',S.toggles.navLight)}
  </div>
  ${crewBarHtml()}

  ${r?`<section class="live">
    <div class="head"><span class="rec">Aufzeichnung läuft</span><span id="lvPtsTxt">0 Wegpunkte</span></div>
    <div class="meta">Fahrtbeginn: <span id="lvStart"></span>
${sail&&r?`<br>Motor: ${mot.st==='on'?'an seit '+fmtTime(mot.since)+' Uhr':mot.st==='off'?'aus seit '+fmtTime(mot.since)+' Uhr':'aus'} · Segel: ${sl.st==='on'?'gesetzt seit '+fmtTime(sl.since)+' Uhr':sl.st==='off'?'geborgen seit '+fmtTime(sl.since)+' Uhr':'geborgen'}`:''}
<br>Skipper: ${esc(rec?.trip.skipper||'–')} · Steuermann: ${esc(rec?curHelm(rec.trip):'–')}${rec&&(rec.trip.crew?.pax||1)>1?`<br>Sicherheitsunterweisung: ${esc(briefingText(rec.trip))}`:''}</div>
    <div class="grid">
      <div><small>Dauer</small><b id="lvDur">–</b></div>
      <div><small>Strecke</small><b id="lvDist">–</b></div>
      <div><small>Geschwindigkeit</small><b id="lvSpd">–</b></div>
      <div><small>GPS-Genauigkeit</small><b id="lvGps">–</b></div>
    </div>
    <button class="msel noteBtn" id="bNote"><span class="in">📝 Ereignis an aktueller Position notieren</span></button>
    <p class="hint">Lass die App im Vordergrund geöffnet – das Display bleibt dafür an. Wird sie in den Hintergrund geschickt oder das Gerät gesperrt, pausiert der Browser das GPS; die Lücke wird als gerade Linie verbunden.</p>
  </section>`:''}
  <div class="ver"><span>Version ${APP_VERSION}</span><span class="verNote"><a href="#/datenschutz">Datenschutz</a></span></div></div>`;
  $('#bMS').onclick=startTrip;$('#bMG').onclick=stopTrip;$('#bFuel').onclick=()=>openFuelDlg(null);$('#bSos').onclick=openSos;bindCrewBar();
  [['bMotOn','motorOn'],['bMotOff','motorOff'],['bSailUp','sailUp'],['bSailDown','sailDown']].forEach(([id,ty])=>{const el=$('#'+id);if(el)el.onclick=()=>logEvent(ty);});
  [['bAnchor','anchor'],['bAnchorLight','anchorLight'],['bNavLight','navLight']].forEach(([id,k])=>{const el=$('#'+id);if(el)el.onclick=()=>toggleState(k);});
  if(r){$('#bNote').onclick=async()=>{
    const t=rec.trip;const p=t.points[t.points.length-1];
    if(!p){toast('Noch keine GPS-Position vorhanden');return;}
    const txt=await ask(`Ereignis um ${fmtTime(Date.now())}`,'');
    if(txt!=null&&rec){await setNote(rec.trip,p.t,txt);toast('Notiert');}
  };updateLive();}
}

/* ================= Fahrtenliste ================= */
const F={boat:null,from:'',to:'',skipper:'*',helm:'*',person:'*'}; // Filter; beim App-Start immer das eingestellte Boot
const dayKey=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
async function renderList(){
  setTitle('Fahrten',true);
  if(F.boat==null)F.boat=S.boatName||'*';
  const trips=await liveTrips();
  const withPdf=new Set((await allPdfs()).map(x=>x.tripId));
  if(!trips.length){view.innerHTML='<p class="empty">Noch keine Fahrten aufgezeichnet.<br>Starte mit „Start“ auf der Startseite.</p>';return;}
  const boats=[...new Set([S.boatName,...trips.map(t=>tripBoat(t).name)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
  if(F.boat!=='*'&&!boats.includes(F.boat))boats.push(F.boat);
  view.innerHTML=`<section class="filters">
    <label for="fBoat">Boot</label>
    <select id="fBoat"><option value="*">Alle Boote</option>${boats.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select>
    <div class="fr">
      <div><label for="fSk">Skipper</label><select id="fSk"><option value="*">Alle</option>${uniq([...S.skippers,...trips.map(t=>t.skipper)]).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div>
      <div><label for="fHl">Steuermann</label><select id="fHl"><option value="*">Alle</option>${uniq([...S.helms,...trips.flatMap(t=>tripHelms(t).map(h=>h.name))]).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div>
      <div style="grid-column:1/-1"><label for="fPe">Person an Bord</label><select id="fPe"><option value="*">Alle</option>${uniq(trips.flatMap(t=>onBoardTrip(t))).sort((a,b)=>a.localeCompare(b,'de')).map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select></div>
      <div><label for="fFrom">Von</label><input type="date" id="fFrom"></div>
      <div><label for="fTo">Bis</label><input type="date" id="fTo"></div>
    </div>
    <button class="reset" id="fReset">Filter zurücksetzen</button>
  </section>
  <div class="summary" id="sum"></div>
  <div id="res"></div>`;
  $('#fBoat').value=F.boat;$('#fFrom').value=F.from;$('#fTo').value=F.to;$('#fSk').value=F.skipper;$('#fHl').value=F.helm;if($('#fSk').value!==F.skipper){F.skipper='*';$('#fSk').value='*';}if($('#fHl').value!==F.helm){F.helm='*';$('#fHl').value='*';}$('#fPe').value=F.person;if($('#fPe').value!==F.person){F.person='*';$('#fPe').value='*';}
  const draw=()=>{
    const sel=trips.filter(t=>(F.boat==='*'||tripBoat(t).name===F.boat)&&(F.skipper==='*'||t.skipper===F.skipper)&&(F.helm==='*'||tripHelms(t).some(h=>h.name===F.helm))&&(F.person==='*'||onBoardTrip(t).includes(F.person))&&(!F.from||dayKey(t.start.t)>=F.from)&&(!F.to||dayKey(t.start.t)<=F.to));
    let km=0,ms=0;
    sel.forEach(t=>{const active=t.status!=='done';km+=active?trackDist(t.points):(t.distance||0);ms+=(active?Date.now():t.end.t)-t.start.t;});
    $('#sum').innerHTML=`<div><b>${sel.length}</b><small>${sel.length===1?'Fahrt':'Fahrten'}</small></div>
      <div><b>${fmtKm(km)}</b><small>Gesamtstrecke</small></div>
      <div><b>${fmtDur(ms)}</b><small>Gesamtdauer</small></div>`+(F.helm!=='*'?(()=>{let hk=0,hm=0;sel.forEach(t=>helmSegments(t).filter(g=>g.name===F.helm).forEach(g=>{hk+=g.km;hm+=g.to-g.from;}));
        return `<div style="grid-column:1/-1"><small>Davon selbst gesteuert von ${esc(F.helm)}</small><b>${fmtKm(hk)} · ${fmtDur(hm)}</b></div>`;})():'');
    $('#res').innerHTML=sel.length?sel.map(t=>{
      const n=Object.keys(t.notes||{}).length+(t.note?1:0);
      const active=t.status!=='done';
      const dur=(active?Date.now():t.end.t)-t.start.t;
      const dist=active?trackDist(t.points):t.distance;
      const pend=(!t.placeStart||(!active&&!t.placeEnd)||!t.weatherStart||(!active&&!t.weatherEnd));
      return `<a class="card" href="#/fahrt/${encodeURIComponent(t.id)}">${active?'':`<button class="cardDel" data-del="${esc(t.id)}" aria-label="Fahrt löschen" title="Fahrt löschen">🗑</button>`}
        <div class="c1"><span>${fmtDate(t.start.t)}${F.boat==='*'?`<span class="boatTag">${esc(tripBoat(t).name)}</span>`:''}</span><span>${fmtTime(t.start.t)} – ${active?'<span class="rec">läuft</span>':fmtTime(t.end.t)}</span></div>
        <div class="c2">${esc(t.placeStart||'…')} → ${esc(active?'unterwegs':(t.placeEnd||'…'))}</div>
        <div class="c3">${fmtKm(dist)} · ${fmtDur(dur)}${t.weatherStart?' · '+wxTxt(t.weatherStart,true):''}${n?` · 📝 ${n}`:''}${withPdf.has(t.id)?' · <span class="pdfMark" title="PDF-Logbucheintrag erstellt">📄 PDF</span>':''}</div>
        ${t.skipper?`<div class="c3">Skipper ${esc(t.skipper)} · ${tripPax(t)} ${tripPax(t)===1?'Person':'Personen'} an Bord${tripAuto(t).length+tripGuests(t).length<tripPax(t)?' <span class="pending">· Namen fehlen</span>':''}</div>`:''}
        ${pend&&!active?'<div class="pending">Ort und Wetter werden nachgeladen, sobald online</div>':''}
      </a>`;}).join(''):'<p class="empty">Keine Fahrten für diese Auswahl.</p>';
    $('#res').querySelectorAll('button[data-del]').forEach(bt=>bt.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      const t=await getTrip(bt.dataset.del);if(!t||t.status!=='done')return;
      const what=`Fahrt vom ${fmtDate(t.start.t)}, ${fmtTime(t.start.t)} Uhr\n${t.placeStart||'…'} → ${t.placeEnd||'…'} (${fmtKm(t.distance||0)})`;
      if(!confirm(`Diese Fahrt endgültig löschen (auch in OneDrive)?\n\n${what}`))return;
      Object.assign(t,{deleted:true,points:[],notes:{},note:'',updatedAt:Date.now()});await putTrip(t);syncSoon();
      toast('Fahrt gelöscht');renderList();});
  };
  $('#fBoat').onchange=e=>{F.boat=e.target.value;draw();};
  $('#fSk').onchange=e=>{F.skipper=e.target.value;draw();};$('#fHl').onchange=e=>{F.helm=e.target.value;draw();};$('#fPe').onchange=e=>{F.person=e.target.value;draw();};
  $('#fFrom').onchange=e=>{F.from=e.target.value;if(F.to&&F.from>F.to){F.to=F.from;$('#fTo').value=F.to;}draw();};
  $('#fTo').onchange=e=>{F.to=e.target.value;if(F.from&&F.to<F.from){F.from=F.to;$('#fFrom').value=F.from;}draw();};
  $('#fReset').onclick=()=>{F.boat=S.boatName||'*';F.from='';F.to='';F.skipper='*';F.helm='*';F.person='*';$('#fSk').value='*';$('#fHl').value='*';$('#fPe').value='*';$('#fBoat').value=F.boat;$('#fFrom').value='';$('#fTo').value='';draw();};
  draw();
}

/* ================= Fahrt-Detail mit Karte ================= */
let map=null,cur=null,drawPdfList=null;
function destroyMap(){if(map){map.remove();map=null;}cur=null;}
async function renderTrip(id,focusKey){
  const t=await curTripObj(id);
  if(!t||t.deleted){view.innerHTML='<p class="empty">Fahrt nicht gefunden.</p>';setTitle('Fahrt',true);return;}
  setTitle(fmtDate(t.start.t),true);
  const active=t.status!=='done';
  const endT=active?Date.now():t.end.t;
  const dist=active?trackDist(t.points):t.distance;
  const secs=(endT-t.start.t)/1000;
  view.innerHTML=`
  <p class="hint" style="margin:0 0 8px;text-align:center">${kindIcon(tripBoat(t).kind)} ${esc(boatLabel(tripBoat(t)))}</p>
  <div class="route" id="routeBox"></div>
  <div id="map"></div>
  <div class="grid">
    <div><small>Dauer</small><b>${fmtDur(endT-t.start.t)}</b></div>
    <div><small>Strecke</small><b>${fmtKm(dist)}</b></div>
    <div><small>Durchschnittsgeschwindigkeit</small><b>${secs>0?kmh(dist/secs):'–'}</b></div>
    <div><small>Höchstgeschwindigkeit</small><b>${kmh(t.maxSpd)}</b></div>
    ${(()=>{const d=evDurations(t);return (d.hasMotor||d.hasSail?`<div><small>Unter Motor</small><b>${d.hasMotor?fmtDur(d.motorMs):'–'}</b></div><div><small>Unter Segel</small><b>${d.hasSail?fmtDur(d.sailMs):'–'}</b></div>`:'')+(d.hasAnchor?`<div><small>Vor Anker</small><b>${fmtDur(d.anchorMs)}</b></div>`:'');})()}
  </div>
  ${tripEvents(t).length?`<h3>Manöver und Lichter</h3><ul class="crewList">${tripEvents(t).map(e=>`<li><span><span class="${EV_ON.has(e.type)?'evOn':'evOff'}">${EV[e.type]}</span></span><small>${fmtTime(e.t)} Uhr${e.lat!=null?' · '+fmtCoord(e.lat,e.lon):''}</small></li>`).join('')}</ul>`:''}
  <div class="wx"><div><small>Wetter bei Fahrtbeginn</small><span id="wxS"></span></div><div><small>Wetter bei Fahrtende</small><span id="wxE"></span></div></div>
  <h3>Besatzung</h3><div id="crewBox"></div>
  <h3>Kommentar zur ganzen Fahrt</h3>
  <textarea id="tripNote" rows="3" placeholder="zum Beispiel Crew, Treibstoff, Besonderheiten">${esc(t.note)}</textarea>
  <div class="row"><button class="btn" id="saveNote">Kommentar speichern</button></div>
  <h3>Wegpunkt-Kommentare</h3>
  <div id="wpList"></div>
  <p class="hint">Tipp: In die Karte hineinzoomen – ab Zoomstufe 15 erscheinen die einzelnen Wegpunkte. Tippe auf einen Punkt oder die Linie, um Uhrzeit und Fahrt zu sehen und einen Kommentar zu setzen.</p>
  ${active?'':'<h3>Logbucheintrag</h3><button class="msel noteBtn" id="pdfBtn"><span class="in">📄 Logbucheintrag als PDF exportieren</span></button><div id="pdfList"></div>'}
  <div class="row"><button class="btn ghost" id="gpx">GPX exportieren</button>${active?'':'<button class="btn danger" id="del">Fahrt löschen</button>'}</div>`;
  cur={t};
  const drawCrew=()=>{
    const segs=helmSegments(t),auto=tripAuto(t),gs=t.crew?.guests||[],pax=tripPax(t);
    const missing=Math.max(0,pax-auto.length-gs.filter(Boolean).length);
    $('#crewBox').innerHTML=`<div class="panel" style="padding:10px 14px">
      <p style="margin:4px 0"><b>Skipper:</b> ${esc(t.skipper||'nicht erfasst')}</p>
      ${segs.length?`<div class="tblwrap"><table class="tbl helmTbl"><thead><tr><th>Steuermann</th><th>Zeit</th><th>Strecke</th></tr></thead><tbody>${segs.map(g=>`<tr><td>${esc(g.name)}</td><td>${fmtTime(g.from)} – ${fmtTime(g.to)} Uhr</td><td>${fmtKm(g.km)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="hint">Kein Steuermann erfasst.</p>'}
      <p style="margin:8px 0 2px"><b>Personen an Bord: ${pax||'–'}</b></p>
      <p class="hint" style="margin:0 0 4px">Sicherheitsunterweisung: ${esc(briefingText(t))}</p>
      <ul class="crewList">${auto.map(a=>`<li><span>${esc(a.name)}</span><small>${esc(a.role)}</small></li>`).join('')}${gs.filter(Boolean).map(g=>`<li><span>${esc(g)}</span><small>Gast</small></li>`).join('')}
      ${missing?`<li><span class="pending">${missing} ${missing===1?'Person':'Personen'} ohne Namen</span></li>`:''}</ul>
      <button class="btn ghost" id="crewEdit">${missing?'Namen nachtragen':'Personen bearbeiten'}</button></div>`;
    $('#crewEdit').onclick=async()=>{const res=await editCrew(auto,pax||auto.length||1,gs);if(!res)return;
      t.crew=res;t.updatedAt=Date.now();await putTrip(t);syncSoon();drawCrew();toast('Personen an Bord gespeichert');};
  };
  drawCrew();
  fillMeta(t);
  $('#saveNote').onclick=async()=>{t.note=$('#tripNote').value.trim();t.updatedAt=Date.now();await putTrip(t);syncSoon();toast('Gespeichert');};
  if($('#pdfBtn')){
    drawPdfList=async()=>{const el=$('#pdfList');if(!el)return;const list=(await allPdfs()).filter(x=>x.tripId===t.id).sort((a,b)=>b.created-a.created);
      el.innerHTML=list.length?`<ul class="crewList">${list.map(x=>`<li><a href="#" data-pdf="${x.id}">${esc(x.name)}</a><small>${x.uploaded?'in OneDrive ✓':(S.odEnabled&&localStorage.getItem('bb_od_on')?'wartet auf OneDrive':'nur auf dem Gerät')}</small></li>`).join('')}</ul>`:'';
      el.querySelectorAll('a[data-pdf]').forEach(a=>a.onclick=async e=>{e.preventDefault();const x=list.find(y=>y.id===a.dataset.pdf);if(x)saveFile(x.name,new Uint8Array(x.bytes),'application/pdf');});};
    drawPdfList();
    $('#pdfBtn').onclick=async()=>{try{await exportLogPdf(t);drawPdfList();}catch(e){console.error(e);alert('PDF konnte nicht erstellt werden: '+e.message);}};
  }
  $('#gpx').onclick=()=>saveFile(`bordbuch_${new Date(t.start.t).toISOString().slice(0,10)}.gpx`,toGpx(t),'application/gpx+xml');
  if($('#del'))$('#del').onclick=async()=>{
    if(!confirm('Diese Fahrt endgültig löschen (auch in der Cloud)?'))return;
    Object.assign(t,{deleted:true,points:[],notes:{},note:'',updatedAt:Date.now()});await putTrip(t);syncSoon();location.hash='#/fahrten';
  };
  buildMap(t,focusKey);
}
function fillMeta(t){
  const pend='<span class="pending">Ortsname folgt, sobald online</span>';
  $('#routeBox').innerHTML=`
    <div><span class="dot g"></span><b>${t.placeStart?esc(t.placeStart):pend}</b><small>Fahrtbeginn ${fmtTime(t.start.t)} Uhr · ${fmtCoord(t.start.lat,t.start.lon)}</small></div>
    <div><span class="dot r"></span><b>${t.status!=='done'?'Fahrt läuft':(t.placeEnd?esc(t.placeEnd):pend)}</b>${t.end?`<small>Fahrtende ${fmtTime(t.end.t)} Uhr · ${fmtCoord(t.end.lat,t.end.lon)}</small>`:''}</div>`;
  $('#wxS').innerHTML=wxTxt(t.weatherStart);
  $('#wxE').innerHTML=t.status!=='done'?'–':wxTxt(t.weatherEnd);
}
async function refreshTripMeta(){
  if(!cur||!$('#routeBox'))return;const fresh=await curTripObj(cur.t.id);if(!fresh)return;
  ['placeStart','placeEnd','weatherStart','weatherEnd'].forEach(k=>cur.t[k]=fresh[k]);fillMeta(cur.t);
}
function nearestIdx(pts,ll){let bi=0,bd=Infinity;const c=Math.cos(ll.lat*Math.PI/180);
  pts.forEach((p,i)=>{const d=(p.lat-ll.lat)**2+((p.lon-ll.lng)*c)**2;if(d<bd){bd=d;bi=i;}});return bi;}
function buildMap(t,focusKey){
  if(!window.L){$('#map').innerHTML='<p class="empty">Karte nicht verfügbar (offline und noch nicht zwischengespeichert). Die Daten sind trotzdem gesichert.</p>';renderWp();return;}
  map=L.map('map',{preferCanvas:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap',crossOrigin:true}).addTo(map);
  const sea=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenSeaMap'});
  L.control.layers(null,{'Seezeichen (OpenSeaMap)':sea}).addTo(map);
  if(S.seamarks!==false)sea.addTo(map);
  map.on('overlayadd overlayremove',e=>{if(e.layer===sea){S.seamarks=e.type==='overlayadd';saveS();}});
  map.createPane('hl').style.zIndex=650;
  const ll=t.points.map(p=>[p.lat,p.lon]);
  if(ll.length>1){
    const line=L.polyline(ll,{color:'#1e88e5',weight:4}).addTo(map);
    L.polyline(ll,{weight:24,opacity:0.001}).addTo(map).on('click',e=>openPoint(nearestIdx(t.points,e.latlng)));
    map.fitBounds(line.getBounds(),{padding:[28,28]});
  }else if(t.start.lat!=null)map.setView([t.start.lat,t.start.lon],15);
  else map.setView([51.2,10.4],5);
  if(t.start.lat!=null)L.circleMarker([t.start.lat,t.start.lon],{radius:8,color:'#fff',weight:2,fillColor:'#1f9d55',fillOpacity:1}).bindTooltip('Fahrtbeginn '+fmtTime(t.start.t)+' Uhr').addTo(map);
  if(t.end&&t.end.lat!=null)L.circleMarker([t.end.lat,t.end.lon],{radius:8,color:'#fff',weight:2,fillColor:'#d64545',fillOpacity:1}).bindTooltip('Fahrtende '+fmtTime(t.end.t)+' Uhr').addTo(map);
  const ptLayer=L.layerGroup().addTo(map),hlLayer=L.layerGroup().addTo(map);
  const drawPts=()=>{ptLayer.clearLayers();if(map.getZoom()<15)return;
    const b=map.getBounds().pad(0.2);const idx=[];t.points.forEach((p,i)=>{if(b.contains([p.lat,p.lon]))idx.push(i);});
    const step=Math.max(1,Math.ceil(idx.length/400));
    for(let k=0;k<idx.length;k+=step){const i=idx[k],p=t.points[i];
      L.circleMarker([p.lat,p.lon],{radius:6,color:'#fff',weight:1.5,fillColor:'#1e88e5',fillOpacity:1}).on('click',()=>openPoint(i)).addTo(ptLayer);}};
  map.on('zoomend moveend',drawPts);
  cur.drawHL=()=>{hlLayer.clearLayers();Object.entries(t.notes||{}).forEach(([k,n])=>{
    const i=t.points.findIndex(p=>p.t==k);if(i<0)return;const p=t.points[i];
    L.circleMarker([p.lat,p.lon],{pane:'hl',radius:10,color:'#fff',weight:3,fillColor:'#ff8c1a',fillOpacity:1})
      .bindTooltip(`${fmtTime(p.t)} – ${esc(n.text.slice(0,40))}`).on('click',()=>openPoint(i)).addTo(hlLayer);});};
  const openPoint=i=>{
    const p=t.points[i];const note=t.notes?.[p.t]?.text||'';
    const el=document.createElement('div');el.className='pp';
    el.innerHTML=`<b>${fmtTime(p.t,true)} Uhr</b> · ${fmtDateS(p.t)}<br>Geschwindigkeit: ${kmh(p.spd)} · Genauigkeit ±${p.acc} m<br><small>${fmtCoord(p.lat,p.lon)}</small>
      <textarea rows="3" placeholder="Kommentar (Schleuse, Manöver, Technik …)"></textarea>
      <div class="row"><button class="btn sv">Speichern</button>${note?'<button class="btn ghost dl">Löschen</button>':''}</div>`;
    $('textarea',el).value=note;
    const done=async txt=>{await setNote(t,p.t,txt);cur.drawHL();renderWp();map.closePopup();toast(txt?'Kommentar gespeichert':'Kommentar gelöscht');};
    $('.sv',el).onclick=()=>done($('textarea',el).value);
    if($('.dl',el))$('.dl',el).onclick=()=>done('');
    L.popup({maxWidth:280}).setLatLng([p.lat,p.lon]).setContent(el).openOn(map);
  };
  cur.openPoint=i=>{const p=t.points[i];map.setView([p.lat,p.lon],Math.max(map.getZoom(),16));setTimeout(()=>openPoint(i),250);window.scrollTo({top:$('#map').offsetTop-70,behavior:'smooth'});};
  cur.drawHL();renderWp();
  setTimeout(()=>{map&&map.invalidateSize();drawPts();
    if(focusKey){const i=t.points.findIndex(p=>p.t==focusKey);if(i>=0)cur.openPoint(i);}},120);
}
function renderWp(){
  const t=cur.t;const el=$('#wpList');if(!el)return;
  const items=Object.entries(t.notes||{}).sort((a,b)=>a[0]-b[0]);
  el.innerHTML=items.length?items.map(([k,n])=>`<div class="wp" data-k="${k}"><time>${fmtTime(+k)}</time><span>${esc(n.text)}</span></div>`).join('')
    :'<p class="hint">Noch keine Wegpunkt-Kommentare.</p>';
  el.querySelectorAll('.wp').forEach(d=>d.onclick=()=>{const i=t.points.findIndex(p=>p.t==d.dataset.k);if(i>=0&&cur.openPoint)cur.openPoint(i);});
}
function toGpx(t){
  const x=s=>esc(s);
  const wpts=Object.entries(t.notes||{}).map(([k,n])=>{const p=t.points.find(p=>p.t==k);if(!p)return'';
    return `<wpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.t).toISOString()}</time><name>${x(fmtTime(p.t))}</name><desc>${x(n.text)}</desc></wpt>`;}).join('\n');
  const seg=t.points.map(p=>`<trkpt lat="${p.lat}" lon="${p.lon}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Bordbuch" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${x(boatLabel(tripBoat(t))+': '+(t.placeStart||'')+' → '+(t.placeEnd||''))}</name><desc>${x(t.note)}</desc><time>${new Date(t.start.t).toISOString()}</time></metadata>
${wpts}
<trk><name>${x(fmtDate(t.start.t))}</name><trkseg>
${seg}
</trkseg></trk></gpx>`;
}

/* ================= Kommentar-Tabelle ================= */
async function renderComments(){
  setTitle('Kommentare',true);
  const rows=[];
  for(const t of await liveTrips()){
    const label=`${t.placeStart||'?'} → ${t.status==='done'?(t.placeEnd||'?'):'läuft'}`;const boat=tripBoat(t).name;
    if(t.note)rows.push({when:t.start.t,t,label,boat,kind:'Fahrt',text:t.note,key:null});
    for(const [k,n] of Object.entries(t.notes||{}))rows.push({when:+k,t,label,boat,kind:'Wegpunkt',text:n.text,key:k});
  }
  rows.sort((a,b)=>b.when-a.when);
  if(!rows.length){view.innerHTML='<p class="empty">Noch keine Kommentare erfasst.</p>';return;}
  view.innerHTML=`<input type="search" id="q" placeholder="Kommentare durchsuchen …">
  <div class="tblwrap"><table class="tbl"><thead><tr><th>Datum / Zeit</th><th>Fahrt</th><th>Kommentar</th></tr></thead><tbody id="tb"></tbody></table></div>
  <button class="btn ghost" id="csv">Als CSV exportieren (Excel)</button>`;
  const draw=()=>{const q=$('#q').value.toLowerCase();
    $('#tb').innerHTML=rows.filter(r=>!q||(r.text+r.label).toLowerCase().includes(q)).map((r,i)=>
      `<tr data-i="${rows.indexOf(r)}"><td>${fmtDateS(r.when)}<br><b>${r.kind==='Fahrt'?'–':fmtTime(r.when)}</b></td><td>${esc(r.label)}<br><small class="hint">${esc(r.boat)}</small></td><td><span class="badge ${r.kind==='Wegpunkt'?'wp':''}">${r.kind}</span>${esc(r.text)}</td></tr>`).join('');
    $('#tb').querySelectorAll('tr').forEach(tr=>tr.onclick=()=>{const r=rows[tr.dataset.i];
      location.hash=`#/fahrt/${encodeURIComponent(r.t.id)}${r.key?'?p='+r.key:''}`;});};
  $('#q').oninput=draw;draw();
  $('#csv').onclick=()=>{
    const c=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
    const lines=[['Datum','Uhrzeit','Boot','Art','Fahrt','Breite','Länge','Kommentar'].map(c).join(';')];
    rows.forEach(r=>{const p=r.key?r.t.points.find(p=>p.t==r.key):null;
      lines.push([fmtDateS(r.when),r.key?fmtTime(r.when,true):'',r.boat,r.kind,r.label,p?p.lat:'',p?p.lon:'',r.text].map(c).join(';'));});
    saveFile('bordbuch_kommentare.csv','\ufeff'+lines.join('\r\n'),'text/csv');
  };
}


/* ================= Tanken & Verbrauch ================= */
const pnum=v=>{const n=parseFloat(String(v||'').trim().replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:NaN;};
const eur=v=>v.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const lit=v=>num(v,1)+' l';
const toLocalInput=t=>{const d=new Date(t);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);};
function fuelTypeOptions(sel){const list=[...S.fuelTypes];if(sel&&!list.includes(sel))list.push(sel);
  return list.map(f=>`<option value="${esc(f)}" ${f===sel?'selected':''}>${esc(f)}</option>`).join('');}
async function openFuelDlg(id){
  const d=$('#fuelDlg');const old=id?await getFuel(id):null;
  const boat=old?old.boat:(rec?tripBoat(rec.trip):{type:S.boatType,name:S.boatName});
  $('#fdTitle').textContent=old?'Tankvorgang bearbeiten':'Tankvorgang erfassen';
  $('#fdBoat').textContent='⛵ '+boatLabel(boat);
  $('#fdL').value=old?String(old.liters).replace('.',','):'';
  $('#fdP').value=old?String(old.price).replace('.',','):'';
  $('#fdT').innerHTML=fuelTypeOptions(old?old.fuelType:(S.fuelTypes.includes('Diesel')?'Diesel':S.fuelTypes[0]));
  $('#fdFull').checked=old?old.full!==false:true;
  $('#fdW').value=toLocalInput(old?old.t:Date.now());
  $('#fdDel').style.display=old?'':'none';
  const upd=()=>{const l=pnum($('#fdL').value),pr=pnum($('#fdP').value);$('#fdSum').textContent=(l>0&&pr>0)?eur(l*pr):'–';};
  $('#fdL').oninput=upd;$('#fdP').oninput=upd;upd();
  let pos=old&&old.lat!=null?{lat:old.lat,lon:old.lon,acc:old.acc}:null;
  if(old)$('#fdPos').textContent=old.lat!=null?`📍 ${old.place||fmtCoord(old.lat,old.lon)}`:'📍 ohne Position gespeichert';
  else{
    const last=rec&&rec.trip.points[rec.trip.points.length-1];
    if(last&&Date.now()-last.t<120000){pos={lat:last.lat,lon:last.lon,acc:last.acc};$('#fdPos').textContent='📍 '+fmtCoord(pos.lat,pos.lon);}
    else{$('#fdPos').textContent='📍 Position wird ermittelt …';
      getPos(20000).then(p=>{pos={lat:+p.coords.latitude.toFixed(6),lon:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy)};
        $('#fdPos').textContent='📍 '+fmtCoord(pos.lat,pos.lon);}).catch(()=>{$('#fdPos').textContent='📍 Keine Position verfügbar – wird ohne Ort gespeichert';});}
  }
  d.returnValue='';
  $('#fdOk').onclick=e=>{const l=pnum($('#fdL').value),pr=pnum($('#fdP').value);
    if(!(l>0)){e.preventDefault();toast('Bitte die getankte Menge in Litern eingeben');$('#fdL').focus();return;}
    if(!(pr>=0)||isNaN(pr)){e.preventDefault();toast('Bitte den Preis je Liter eingeben');$('#fdP').focus();return;}};
  d.addEventListener('close',async()=>{
    const v=d.returnValue;
    if(v==='del'&&old){if(!confirm('Diesen Tankvorgang löschen?'))return;
      Object.assign(old,{deleted:true,updatedAt:Date.now()});await putFuel(old);syncSoon();refreshView();toast('Tankvorgang gelöscht');return;}
    if(v!=='ok')return;
    const now=Date.now();const w=new Date($('#fdW').value).getTime();
    const f=old||{id:uid(),createdAt:now,deleted:false,boat,place:null,lat:null,lon:null,acc:null};
    Object.assign(f,{t:isFinite(w)?w:now,liters:pnum($('#fdL').value),price:pnum($('#fdP').value),fuelType:$('#fdT').value,full:$('#fdFull').checked,updatedAt:now});
    if(pos&&f.lat==null){f.lat=pos.lat;f.lon=pos.lon;f.acc=pos.acc;}
    await putFuel(f);syncSoon();enrichAll();refreshView();
    toast(`Tankvorgang gespeichert: ${lit(f.liters)} ${f.fuelType}`);
  },{once:true});
  d.showModal();
}
/* Verbrauch: je Boot und Kraftstoffart von Volltanken zu Volltanken */
function analyzeFuel(fuels,trips){
  const done=trips.filter(t=>t.status==='done');
  const span=(boat,a,b)=>{let km=0,ms=0;for(const t of done){if(tripBoat(t).name!==boat)continue;if(t.start.t>a&&t.start.t<=b){km+=t.distance||0;ms+=motorHours(t)*36e5;}}return {km,h:ms/36e5};};
  const groups={};
  fuels.forEach(f=>{(groups[f.boat.name+'\u0000'+f.fuelType]=groups[f.boat.name+'\u0000'+f.fuelType]||[]).push(f);});
  const rows=[];
  for(const list of Object.values(groups)){
    list.sort((a,b)=>a.t-b.t);let haveFull=false,accL=0,accKm=0,accH=0,prevT=null;
    for(const f of list){
      const sp=prevT==null?null:span(f.boat.name,prevT,f.t);
      let cons=null;
      if(haveFull){accL+=f.liters;accKm+=sp.km;accH+=sp.h;}
      if(f.full!==false){
        if(haveFull&&accKm>0)cons={l:accL,km:accKm,h:accH};
        haveFull=true;accL=0;accKm=0;accH=0;
      }
      rows.push({f,sp,cons});prevT=f.t;
    }
  }
  return rows.sort((a,b)=>b.f.t-a.f.t);
}
const FU={boat:null,type:'*',from:'',to:''}; // beim App-Start immer das eingestellte Boot
async function renderFuel(){
  setTitle('Verbrauch',true);
  if(FU.boat==null)FU.boat=S.boatName||'*';
  const [fuels,trips]=await Promise.all([liveFuel(),liveTrips()]);
  const boats=[...new Set([S.boatName,...trips.map(t=>tripBoat(t).name),...fuels.map(f=>f.boat.name)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
  const types=[...new Set([...S.fuelTypes,...fuels.map(f=>f.fuelType)])];
  view.innerHTML=`<section class="filters">
    <div class="fr">
      <div><label for="uBoat">Boot</label><select id="uBoat"><option value="*">Alle Boote</option>${boats.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div>
      <div><label for="uType">Kraftstoffart</label><select id="uType"><option value="*">Alle</option>${types.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('')}</select></div>
      <div><label for="uFrom">Von</label><input type="date" id="uFrom"></div>
      <div><label for="uTo">Bis</label><input type="date" id="uTo"></div>
    </div>
    <button class="reset" id="uReset">Filter zurücksetzen</button>
  </section>
  <div id="uSince"></div><div id="uKpi"></div>
  <h3>Tankvorgänge</h3><div id="uList"></div>
  <div class="row"><button class="btn" id="uAdd">⛽ Tankvorgang erfassen</button><button class="btn ghost" id="uCsv">Als CSV exportieren (Excel)</button></div>
  <p class="hint">So wird gerechnet: Verbrauch = getankte Liter ÷ gefahrene ${NAUT()?'Seemeilen':'Kilometer'} zwischen zwei Tankvorgängen mit „Vollgetankt“. Teilbetankungen dazwischen werden mitgezählt. Der erste Tankvorgang dient als Ausgangswert.</p>`;
  $('#uBoat').value=FU.boat;$('#uType').value=FU.type;$('#uFrom').value=FU.from;$('#uTo').value=FU.to;
  const all=analyzeFuel(fuels,trips);let shown=[];
  const draw=()=>{
    const okBoat=n=>FU.boat==='*'||n===FU.boat;
    const inRange=t=>(!FU.from||dayKey(t)>=FU.from)&&(!FU.to||dayKey(t)<=FU.to);
    // Seit dem letzten Tanken (unabhängig vom Zeitraum)
    const sinceBoats=FU.boat==='*'?boats:[FU.boat];
    $('#uSince').innerHTML=sinceBoats.map(b=>{
      const last=fuels.filter(f=>f.boat.name===b&&(FU.type==='*'||f.fuelType===FU.type)).sort((x,y)=>y.t-x.t)[0];
      if(!last)return FU.boat==='*'?'':`<div class="since"><small class="hint">Seit dem letzten Tanken${FU.boat==='*'?' · '+esc(b):''}</small><br>Noch kein Tankvorgang erfasst.</div>`;
      let km=0,ms=0;trips.filter(t=>tripBoat(t).name===b&&t.start.t>last.t).forEach(t=>{const a=t.status!=='done';km+=a?trackDist(t.points):(t.distance||0);ms+=(a?Date.now():t.end.t)-t.start.t;});
      return `<div class="since"><small class="hint">Seit dem letzten Tanken${FU.boat==='*'?' · '+esc(b):''} (${fmtDateS(last.t)}, ${lit(last.liters)} ${esc(last.fuelType)})</small><br><b>${fmtKm(km)}</b> · ${fmtDur(ms)} Fahrzeit</div>`;
    }).join('');
    shown=all.filter(r=>okBoat(r.f.boat.name)&&(FU.type==='*'||r.f.fuelType===FU.type)&&inRange(r.f.t));
    const L=shown.reduce((s,r)=>s+r.f.liters,0),C=shown.reduce((s,r)=>s+r.f.liters*r.f.price,0);
    const cons=shown.filter(r=>r.cons);const cL=cons.reduce((s,r)=>s+r.cons.l,0),cKm=cons.reduce((s,r)=>s+r.cons.km,0),cH=cons.reduce((s,r)=>s+r.cons.h,0);
    const cC=cons.reduce((s,r)=>s+r.cons.l*r.f.price,0);
    // Strecke und Fahrzeit nur zwischen den erfassten Tankvorgängen (vor dem ersten Tanken zählt nichts)
    const tKm=shown.reduce((a,r)=>a+(r.sp?r.sp.km:0),0),tMs=shown.reduce((a,r)=>a+(r.sp?r.sp.h*36e5:0),0);
    $('#uKpi').innerHTML=`<div class="kpis">
      <div><b>${lit(L)}</b><small>Getankt (${shown.length} ${shown.length===1?'Tankvorgang':'Tankvorgänge'})</small></div>
      <div><b>${eur(C)}</b><small>Kosten gesamt</small></div>
      <div><b>${L>0?num(C/L,3)+' €/l':'–'}</b><small>Durchschnittspreis je Liter</small></div>
      <div><b>${fmtKm(tKm)}</b><small>Gefahren zwischen den Tankvorgängen (${fmtDur(tMs)})</small></div>
      <div><b>${cKm>0?num(cL/perDist(cKm),2)+' l/'+distU():'–'}</b><small>Durchschnittsverbrauch je ${distWord()}</small></div>
      <div><b>${cH>0?num(cL/cH,1)+' l/h':'–'}</b><small>Durchschnittsverbrauch je Stunde</small></div>
      <div class="wide"><b>${cKm>0?eur(cC/perDist(cKm))+' je '+distU():'–'}</b><small>Kraftstoffkosten je ${distWord()}</small></div>
    </div>`;
    $('#uList').innerHTML=shown.length?`<div class="tblwrap"><table class="tbl fuelTbl"><thead><tr><th>Datum / Ort</th><th class="num">Menge / Preis</th><th class="num">Strecke / Verbrauch</th><th></th></tr></thead><tbody>${
      shown.map((r,i)=>`<tr data-id="${r.f.id}"><td>${fmtDateS(r.f.t)} ${fmtTime(r.f.t)}<br><small class="hint">${esc(r.f.place||(r.f.lat!=null?fmtCoord(r.f.lat,r.f.lon):'ohne Ort'))}${FU.boat==='*'?' · '+esc(r.f.boat.name):''}</small></td>
        <td class="num"><b>${lit(r.f.liters)}</b> ${esc(r.f.fuelType)}${r.f.full===false?'<br><span class="badge">Teilbetankung</span>':''}<br><small class="hint">${num(r.f.price,3)} €/l · ${eur(r.f.liters*r.f.price)}</small></td>
        <td class="num">${r.sp?fmtKm(r.sp.km):'<small class="hint">Ausgangswert</small>'}<br><small class="hint">${r.cons?num(r.cons.l/perDist(r.cons.km),2)+' l/'+distU():'–'}</small></td><td><button class="delBtn" data-del="${r.f.id}" aria-label="Tankvorgang löschen">🗑</button></td></tr>`).join('')
    }</tbody></table></div>`:'<p class="empty">Keine Tankvorgänge für diese Auswahl.</p>';
    $('#uList').querySelectorAll('tr[data-id]').forEach(tr=>tr.onclick=()=>openFuelDlg(tr.dataset.id));
    $('#uList').querySelectorAll('button[data-del]').forEach(b=>b.onclick=async e=>{e.stopPropagation();
      const f=await getFuel(b.dataset.del);if(!f)return;
      if(!confirm(`Tankvorgang vom ${fmtDateS(f.t)} (${lit(f.liters)} ${f.fuelType}) löschen?`))return;
      Object.assign(f,{deleted:true,updatedAt:Date.now()});await putFuel(f);syncSoon();toast('Tankvorgang gelöscht');renderFuel();});
  };
  $('#uBoat').onchange=e=>{FU.boat=e.target.value;draw();};
  $('#uType').onchange=e=>{FU.type=e.target.value;draw();};
  $('#uFrom').onchange=e=>{FU.from=e.target.value;if(FU.to&&FU.from>FU.to){FU.to=FU.from;$('#uTo').value=FU.to;}draw();};
  $('#uTo').onchange=e=>{FU.to=e.target.value;if(FU.from&&FU.to<FU.from){FU.from=FU.to;$('#uFrom').value=FU.from;}draw();};
  $('#uReset').onclick=()=>{Object.assign(FU,{boat:S.boatName||'*',type:'*',from:'',to:''});$('#uBoat').value=FU.boat;$('#uType').value='*';$('#uFrom').value='';$('#uTo').value='';draw();};
  $('#uAdd').onclick=()=>openFuelDlg(null);
  $('#uCsv').onclick=()=>{
    const c=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const n=(v,d)=>v==null||!isFinite(v)?'':v.toFixed(d).replace('.',',');
    const lines=[['Datum','Uhrzeit','Boot','Ort','Breite','Länge','Kraftstoffart','Liter','Preis je Liter (€)','Betrag (€)','Vollgetankt',`${NAUT()?'Seemeilen':'Kilometer'} seit letztem Tanken`,`Verbrauch (l/${distU()})`].map(c).join(';')];
    shown.slice().reverse().forEach(r=>lines.push([fmtDateS(r.f.t),fmtTime(r.f.t),boatLabel(r.f.boat),r.f.place||'',r.f.lat??'',r.f.lon??'',r.f.fuelType,n(r.f.liters,2),n(r.f.price,3),n(r.f.liters*r.f.price,2),r.f.full===false?'nein':'ja',r.sp?n(perDist(r.sp.km),1):'',r.cons?n(r.cons.l/perDist(r.cons.km),3):''].map(c).join(';')));
    saveFile('bordbuch_tankvorgaenge.csv','﻿'+lines.join('\r\n'),'text/csv');
  };
  draw();
}


/* ================= Logbucheintrag als PDF (ohne fremde Bibliothek) ================= */
const HELV={"Helvetica":[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"Helvetica-Bold":[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]}; // Zeichenbreiten Helvetica/Helvetica-Bold (WinAnsi 32–255, je 1000 Einheiten)
const WINMAP={0x20AC:0x80,0x201A:0x82,0x201E:0x84,0x2026:0x85,0x2030:0x89,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2032:0x27,0x2033:0x22};
function winStr(s){
  s=String(s??'').replace(/→/g,'->').replace(/✓/g,'').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu,'');
  let o='';for(const ch of s){const c=ch.codePointAt(0);
    if(c===10||(c>=32&&c<0x7F)||(c>=0xA0&&c<=0xFF))o+=String.fromCharCode(c);else if(WINMAP[c])o+=String.fromCharCode(WINMAP[c]);else if(c===9)o+=' ';else o+='?';}
  return o;}
const tw=(w,bold,size)=>{const m=HELV[bold?'Helvetica-Bold':'Helvetica'];let x=0;for(let i=0;i<w.length;i++){const c=w.charCodeAt(i);x+=(c>=32&&c<=255?m[c-32]:556)||556;}return x*size/1000;};
const pEsc=w=>w.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const f2=n=>(+n).toFixed(2);
class Pdf{
  constructor(){this.W=595.28;this.H=841.89;this.M=48;this.pages=[];this.add();}
  add(){this.c=[];this.pages.push(this.c);this.y=this.H-this.M;}
  need(h){if(this.y-h<this.M+24)this.add();}
  txt(x,y,s,size=10,bold=false,rgb){this.c.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb?rgb+' rg':'0 g'} ${f2(x)} ${f2(y)} Td (${pEsc(winStr(s))}) Tj ET`);}
  line(x1,y1,x2,y2,w=.6,gray=0){this.c.push(`${gray} G ${w} w ${f2(x1)} ${f2(y1)} m ${f2(x2)} ${f2(y2)} l S`);}
  rect(x,y,w,h,{fill,stroke}={}){this.c.push(`${fill?fill+' rg ':''}${stroke!=null?stroke+' G .6 w ':''}${f2(x)} ${f2(y)} ${f2(w)} ${f2(h)} re ${fill&&stroke!=null?'B':fill?'f':'S'}`);}
  circle(x,y,r,rgb){const k=.5523*r;this.c.push(`${rgb} rg 1 1 1 RG 1 w ${f2(x+r)} ${f2(y)} m ${f2(x+r)} ${f2(y+k)} ${f2(x+k)} ${f2(y+r)} ${f2(x)} ${f2(y+r)} c ${f2(x-k)} ${f2(y+r)} ${f2(x-r)} ${f2(y+k)} ${f2(x-r)} ${f2(y)} c ${f2(x-r)} ${f2(y-k)} ${f2(x-k)} ${f2(y-r)} ${f2(x)} ${f2(y-r)} c ${f2(x+k)} ${f2(y-r)} ${f2(x+r)} ${f2(y-k)} ${f2(x+r)} ${f2(y)} c B`);}
  path(pts,rgb,w=1.6){if(pts.length<2)return;this.c.push(`${rgb} RG ${w} w 1 J 1 j ${f2(pts[0][0])} ${f2(pts[0][1])} m ${pts.slice(1).map(p=>`${f2(p[0])} ${f2(p[1])} l`).join(' ')} S`);}
  wrap(s,maxW,size,bold){const out=[];for(const para of winStr(s).split('\n')){let line='';
    for(const word of para.split(' ')){const t=line?line+' '+word:word;
      if(tw(t,bold,size)<=maxW||!line){if(tw(word,bold,size)>maxW&&!line){let cut='';for(const ch of word){if(tw(cut+ch,bold,size)>maxW){out.push(cut);cut='';}cut+=ch;}line=cut;}else line=t;}
      else{out.push(line);line=word;}}
    out.push(line);}return out;}
  para(s,{x=this.M,w=this.W-2*this.M,size=10,bold=false,rgb,lead=1.38}={}){for(const l of this.wrap(s,w,size,bold)){this.need(size*lead);this.y-=size*lead;this.c.push(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb?rgb+' rg':'0 g'} ${f2(x)} ${f2(this.y)} Td (${pEsc(l)}) Tj ET`);}}
  h(s){this.need(34);this.y-=16;this.txt(this.M,this.y-12,s,12.5,true,'0.06 0.22 0.4');this.y-=17;this.line(this.M,this.y,this.W-this.M,this.y,.5,.75);this.y-=2;}
  kv(k,v,lw=150){const x2=this.M+lw,w=this.W-this.M-x2;const ls=this.wrap(v||'–',w,10,false);this.need(14*Math.min(ls.length,3));
    this.y-=14;this.txt(this.M,this.y,k,10,false,'0.38 0.42 0.47');
    ls.forEach((l,i)=>{if(i){this.need(14);this.y-=14;}this.c.push(`BT /F1 10 Tf 0 g ${f2(x2)} ${f2(this.y)} Td (${pEsc(l)}) Tj ET`);});}
  build(info){
    const n=this.pages.length;this.pages.forEach((c,i)=>{c.push(`BT /F1 8 Tf 0.45 g ${f2(this.M)} 26 Td (${pEsc(winStr(info.footer))}) Tj ET`);
      const pg=`Seite ${i+1} von ${n}`;c.push(`BT /F1 8 Tf 0.45 g ${f2(this.W-this.M-tw(winStr(pg),false,8))} 26 Td (${pg}) Tj ET`);});
    const objs=[];const add=s=>{objs.push(s);return objs.length;};
    const cat=add(null),pages=add(null);
    const fo=`/Type /Font /Subtype /Type1 /Encoding /WinAnsiEncoding`;
    const f1=add(`<< ${fo} /BaseFont /Helvetica >>`),fb=add(`<< ${fo} /BaseFont /Helvetica-Bold >>`);
    const kids=[];
    for(const c of this.pages){const body=c.join('\n');const cs=add(`<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${f2(this.W)} ${f2(this.H)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${fb} 0 R >> >> /Contents ${cs} 0 R >>`));}
    objs[cat-1]=`<< /Type /Catalog /Pages ${pages} 0 R >>`;
    objs[pages-1]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
    const d=new Date(),pad=x=>String(x).padStart(2,'0'),off=-d.getTimezoneOffset();
    const cd=`D:${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${off>=0?'+':'-'}${pad(Math.floor(Math.abs(off)/60))}'${pad(Math.abs(off)%60)}'`;
    const infoN=add(`<< /Title (${pEsc(winStr(info.title))}) /Author (${pEsc(winStr(info.author||''))}) /Creator (Bordbuch ${APP_VERSION}) /Producer (Bordbuch ${APP_VERSION}) /CreationDate (${cd}) >>`);
    let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const xref=[];
    objs.forEach((o,i)=>{xref.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
    const xs=out.length;
    out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+xref.map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('');
    out+=`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R /Info ${infoN} 0 R >>\nstartxref\n${xs}\n%%EOF\n`;
    const bytes=new Uint8Array(out.length);for(let i=0;i<out.length;i++)bytes[i]=out.charCodeAt(i)&255;return bytes;
  }
}
const coordTxt=(lat,lon)=>lat==null?'Position unbekannt':fmtCoord(lat,lon).replace(/′/g,"'");
const wxPdf=w=>w?`${w.desc}, ${num(w.temp)} °C, Wind aus ${w.dir} ${windTxt(w.wind)}${w.gust!=null?`, Böen ${windTxt(w.gust)}`:''}`:'nicht verfügbar';
/* Ort für die Unterschrift: Stadt/Gemeinde am aktuellen Standort, sonst am Fahrtende (nur grob, ohne Straße) */
async function signTown(t){
  const town=async(lat,lon)=>{
    // auf ca. 1 km gerundet – für die Gemeinde genügt das, genauer wird nichts übertragen
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${(+lat).toFixed(2)}&lon=${(+lon).toFixed(2)}&zoom=10&addressdetails=1&accept-language=de`,{credentials:'omit'});
    if(!r.ok)throw new Error('Ort '+r.status);const j=await r.json();const a=j.address||{};
    return str(a.city||a.town||a.village||a.municipality||a.county||'',80);};
  if(navigator.onLine){
    try{const p=await getPos(6000);const x=await town(p.coords.latitude,p.coords.longitude);if(x)return x;}catch(e){}
    try{if(t.end?.lat!=null){const x=await town(t.end.lat,t.end.lon);if(x)return x;}}catch(e){}
  }
  const pe=t.placeEnd||'';return pe.includes(',')?pe.split(',').pop().trim():pe; // ohne Internet: gespeicherter Ortsname
}
async function exportLogPdf(t){
  if(t.status!=='done'){toast('Die Fahrt läuft noch');return;}
  const signTownTxt=await busyVal('PDF wird erstellt …',()=>signTown(t));
  const now=Date.now(),boat=tripBoat(t),bi=await boatInfo(boat.name);
  const kind=kindLabel(boat.kind||bi.kind);
  const doc=new Pdf(),M=doc.M,W=doc.W;
  // Kopf
  doc.rect(0,doc.H-92,W,92,{fill:'0.04 0.13 0.22'});
  doc.txt(M,doc.H-46,'Logbucheintrag',22,true,'1 1 1');
  doc.txt(M,doc.H-68,[kind,boat.type,boat.name?`„${boat.name}“`:''].filter(Boolean).join(' · '),11,false,'0.85 0.9 0.95');
  const dtxt=fmtDate(t.start.t);doc.txt(W-M-tw(winStr(dtxt),true,12),doc.H-46,dtxt,12,true,'1 1 1');
  doc.y=doc.H-100;
  const secs=(t.end.t-t.start.t)/1000;
  doc.h('Fahrt');
  doc.kv('Fahrtbeginn',`${fmtTime(t.start.t)} Uhr · ${t.placeStart||'Ort unbekannt'} · ${coordTxt(t.start.lat,t.start.lon)}`);
  doc.kv('Fahrtende',`${fmtTime(t.end.t)} Uhr · ${t.placeEnd||'Ort unbekannt'} · ${coordTxt(t.end.lat,t.end.lon)}`);
  doc.kv('Dauer',fmtDur(t.end.t-t.start.t));
  doc.kv('Strecke',fmtKm(t.distance||0));
  doc.kv('Geschwindigkeit',`Durchschnitt ${secs>0?kmh((t.distance||0)/secs):'–'} · Höchstwert ${kmh(t.maxSpd)}`);
  {const ev=tripEvents(t);if(ev.length){const d=evDurations(t);doc.h('Manöver und Lichter');
    if(d.hasMotor||d.hasSail){doc.kv('Unter Motor',d.hasMotor?fmtDur(d.motorMs):'nicht erfasst');doc.kv('Unter Segel',d.hasSail?fmtDur(d.sailMs):'nicht erfasst');}
    if(d.hasAnchor)doc.kv('Vor Anker',fmtDur(d.anchorMs));
    ev.forEach(e=>doc.kv(`${fmtTime(e.t)} Uhr`,`${EV[e.type]}${e.lat!=null?' · '+coordTxt(e.lat,e.lon):''}`));}}
  doc.h('Wetter');
  doc.kv('Bei Fahrtbeginn',wxPdf(t.weatherStart));
  doc.kv('Bei Fahrtende',wxPdf(t.weatherEnd));
  doc.h('Besatzung');
  doc.kv('Skipper',t.skipper||'nicht erfasst');
  const segs=helmSegments(t);
  doc.kv('Steuermann',segs.length?segs.map(g=>`${g.name} (${fmtTime(g.from)}–${fmtTime(g.to)} Uhr, ${fmtKm(g.km)})`).join('\n'):'nicht erfasst');
  const auto=tripAuto(t),gs=tripGuests(t),pax=tripPax(t);
  const names=[...auto.map(a=>`${a.name} (${a.role})`),...gs.map(g=>`${g} (Gast)`)];
  const miss=Math.max(0,pax-auto.length-gs.length);
  doc.kv('Personen an Bord',`${pax||'–'}${names.length?'\n'+names.join('\n'):''}${miss?`\n${miss} ohne Namen`:''}`);
  doc.kv('Sicherheitsunterweisung',briefingText(t));
  const fuels=(await liveFuel()).filter(f=>f.boat?.name===boat.name&&f.t>=t.start.t-36e5&&f.t<=t.end.t+36e5);
  if(fuels.length){doc.h('Tankvorgänge');fuels.forEach(f=>doc.kv(`${fmtTime(f.t)} Uhr`,`${lit(f.liters)} ${f.fuelType} · ${num(f.price,3)} €/l · ${eur(f.liters*f.price)}${f.place?' · '+f.place:''}`));}
  const ev=Object.entries(t.notes||{}).sort((a,b)=>a[0]-b[0]);
  if(t.note||ev.length){doc.h('Kommentare und Ereignisse');
    if(t.note)doc.kv('Zur Fahrt',t.note);
    ev.forEach(([k,n])=>{const p=t.points.find(p=>p.t==k);doc.kv(`${fmtTime(+k)} Uhr`,`${n.text}${p?`\n${coordTxt(p.lat,p.lon)}`:''}`);});}
  // Streckenskizze
  const pts=t.points||[];
  if(pts.length>1){
    const bh=230;doc.need(bh+40);doc.h('Streckenskizze');doc.y-=8;
    const bx=M,by=doc.y-bh,bw=W-2*M;doc.rect(bx,by,bw,bh,{fill:'0.96 0.97 0.98',stroke:.8});
    let la0=Infinity,la1=-Infinity,lo0=Infinity,lo1=-Infinity;pts.forEach(p=>{la0=Math.min(la0,p.lat);la1=Math.max(la1,p.lat);lo0=Math.min(lo0,p.lon);lo1=Math.max(lo1,p.lon);});
    const kx=Math.cos((la0+la1)/2*Math.PI/180),sx=(lo1-lo0)*kx||1e-6,sy=(la1-la0)||1e-6,pad=16;
    const sc=Math.min((bw-2*pad)/sx,(bh-2*pad)/sy),ox=bx+(bw-sx*sc)/2,oy=by+(bh-sy*sc)/2;
    const P=p=>[ox+(p.lon-lo0)*kx*sc,oy+(p.lat-la0)*sc];
    doc.path(pts.map(P),'0.12 0.53 0.9',1.8);
    ev.forEach(([k])=>{const p=pts.find(p=>p.t==k);if(p){const q=P(p);doc.circle(q[0],q[1],3.2,'1 0.55 0.1');}});
    const a=P(pts[0]),z=P(pts[pts.length-1]);doc.circle(a[0],a[1],4.5,'0.12 0.62 0.33');doc.circle(z[0],z[1],4.5,'0.84 0.27 0.27');
    const ext=Math.max(hav({lat:la0,lon:lo0},{lat:la0,lon:lo1}),hav({lat:la0,lon:lo0},{lat:la1,lon:lo0}));
    doc.txt(bx+6,by+6,`Grün: Fahrtbeginn · Rot: Fahrtende · Orange: Ereignis · Ausdehnung ca. ${fmtKm(ext)} · Norden oben`,8,false,'0.4 0.4 0.4');
    doc.y=by-4;
  }
  // Unterschrift
  doc.need(110);doc.y-=34;
  const stamp=`${fmtDateS(now).replace(/\.(\d\d)$/,'.20$1')}, ${fmtTime(now)} Uhr`;
  doc.txt(M,doc.y,`Logbucheintrag erstellt am ${fmtDate(now)} um ${fmtTime(now)} Uhr.`,9,false,'0.35 0.35 0.35');
  doc.y-=44;
  const half=(W-2*M-30)/2;
  const dateOnly=fmtDateS(now).replace(/\.(\d\d)$/,'.20$1');
  doc.txt(M,doc.y+5,signTownTxt?`${dateOnly}, ${signTownTxt}`:`${dateOnly},`,11);
  doc.line(M,doc.y,M+half,doc.y,.8);doc.line(M+half+30,doc.y,W-M,doc.y,.8);
  doc.txt(M,doc.y-12,'Datum, Ort',8.5,false,'0.4 0.4 0.4');
  doc.txt(M+half+30,doc.y-12,`Unterschrift Skipper${t.skipper?` (${t.skipper})`:''}`,8.5,false,'0.4 0.4 0.4');
  const bytes=doc.build({title:`Logbucheintrag ${boat.name||''} ${fmtDateS(t.start.t)}`,author:t.skipper||'',footer:`Bordbuch ${APP_VERSION} · ${boat.name||''} · Fahrt vom ${fmtDateS(t.start.t)} · erstellt ${stamp}`});
  const d=new Date(t.start.t),pd=x=>String(x).padStart(2,'0');
  const nm=`Logbuch_${(boat.name||'Boot').replace(/[^\wäöüÄÖÜß-]+/g,'_')}_${d.getFullYear()}-${pd(d.getMonth()+1)}-${pd(d.getDate())}_${pd(d.getHours())}${pd(d.getMinutes())}_erstellt_${new Date(now).getFullYear()}${pd(new Date(now).getMonth()+1)}${pd(new Date(now).getDate())}-${pd(new Date(now).getHours())}${pd(new Date(now).getMinutes())}.pdf`;
  await putPdf({id:uid(),tripId:t.id,name:nm,created:now,bytes:bytes.buffer,uploaded:null});
  await saveFile(nm,bytes,'application/pdf');
  toast(S.odEnabled&&localStorage.getItem('bb_od_on')?'PDF gespeichert – wird mit OneDrive abgeglichen':'PDF gespeichert');
  syncSoon();
}

/* ================= Dateien / Sicherung ================= */
async function saveFile(name,text,type){
  const file=new File([text],name,{type});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],title:name});return;}catch(e){if(e.name==='AbortError')return;}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);
}
async function exportAll(){
  const trips=(await allTrips()).filter(t=>t.status==='done');const fuel=await allFuel();const boats=await allBoats();const meta=await allMeta();
  saveFile(`bordbuch_sicherung_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({app:'bordbuch',version:2,appVersion:APP_VERSION,exportedAt:Date.now(),trips,fuel,boats,meta}),'application/json');
}
async function importFile(file){
  try{
    const j=JSON.parse(await file.text());const list=Array.isArray(j)?j:j.trips;
    if(!Array.isArray(list))throw new Error('Keine Bordbuch-Sicherung');
    let n=0,m=0;
    let bad=0;
    for(const t0 of list){const t=validateTrip(t0,t0?.id);if(!t){bad++;continue;}const l=await getTrip(t.id);
      if(!l||(t.updatedAt||0)>(l.updatedAt||0)){if(rec&&rec.trip.id===t.id)continue;await putTrip(t);n++;}}
    for(const f0 of (Array.isArray(j.fuel)?j.fuel:[])){const f=validateFuel(f0,f0?.id);if(!f){bad++;continue;}const l=await getFuel(f.id);
      if(!l||(f.updatedAt||0)>(l.updatedAt||0)){await putFuel(f);m++;}}
    for(const m0 of (Array.isArray(j.meta)?j.meta:[])){const mm=validateMeta(m0,m0?.id);if(!mm){if(m0?.id==='lists')bad++;continue;}{const mg=mergeLists(await getMeta('lists'),mm);mg.updatedAt=Date.now();await putMeta(mg);listsToS(mg);}}
    for(const b0 of (Array.isArray(j.boats)?j.boats:[])){const b=validateBoatRec(b0,b0?.id);if(!b){bad++;continue;}const l=await getBoatRec(b.id);const mg=mergeBoat(l,b);mg.updatedAt=Date.now();await putBoatRec(mg);applyBoatRec(mg);}
    toast(`${n} Fahrt(en) und ${m} Tankvorgang/-vorgänge übernommen`+(bad?` · ${bad} ungültige Einträge übersprungen`:''));enrichAll();
  }catch(e){alert('Import fehlgeschlagen: '+e.message);}
}

/* ================= OneDrive-Synchronisation ================= */
/* Eingebaute Microsoft-Client-ID. Sie ist kein Geheimnis (steht in jeder Anmelde-Adresse);
   Anmeldungen funktionieren damit nur unter der in Azure registrierten Web-Adresse dieser App. */
const BUILTIN_CLIENT_ID='faa92145-a1d5-4ac5-8e41-66c5d2019548';
const clientId=()=>(S.odClientId||'').trim()||BUILTIN_CLIENT_ID;
const OD_AUTH='https://login.microsoftonline.com/common/oauth2/v2.0';
const GRAPH='https://graph.microsoft.com/v1.0';
const OD_SCOPE='Files.ReadWrite.AppFolder offline_access openid profile';
const RT_LIFE=24*36e5,RT_RENEW=18*36e5; // Microsoft: Browser-Apps erhalten max. 24 h gültige Anmeldungen
const redirectUri=()=>location.origin+location.pathname;
/* Anmeldedaten:
   - Zugangstoken (1 h gültig) nur im Arbeitsspeicher, nie gespeichert.
   - Refresh-Token (max. 24 h gültig) AES-verschlüsselt in IndexedDB („secrets“, wird nie synchronisiert).
     Der Schlüssel ist nicht exportierbar (WebCrypto), kann also nicht ausgelesen oder kopiert werden.
   Hinweis: Gegen Schadcode, der direkt in dieser App läuft, schützt keine Speicherart vollständig –
   dafür sorgt die Sicherheitsrichtlinie (CSP), die fremden Code gar nicht erst ausführt. */
let odTok=null;
async function secStore(mode){return (await db()).transaction('secrets',mode).objectStore('secrets');}
async function secKey(){
  let k=await rq((await secStore()).get('key'));
  if(!k){const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    await rq((await secStore('readwrite')).put({id:'key',key}));k={key};}
  return k.key;}
async function saveTok(){
  try{
    if(!odTok||!odTok.refresh){await rq((await secStore('readwrite')).delete('od'));return;}
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await secKey(),new TextEncoder().encode(odTok.refresh));
    await rq((await secStore('readwrite')).put({id:'od',iv,data,rtIssued:odTok.rtIssued||Date.now()}));
  }catch(e){console.warn('Token speichern',e);}
}
async function loadTok(){
  try{
    const old=localStorage.getItem('bb_od'); // Übernahme aus Version 6 und älter
    if(old){localStorage.removeItem('bb_od');const o=JSON.parse(old);if(o?.refresh){odTok={refresh:o.refresh,rtIssued:o.rtIssued||Date.now(),exp:0};await saveTok();}}
    const r=await rq((await secStore()).get('od'));
    if(r){const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv},await secKey(),r.data);
      odTok={refresh:new TextDecoder().decode(pt),rtIssued:r.rtIssued,exp:0};}
  }catch(e){console.warn('Token laden',e);odTok=null;}
}
const b64u=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function setSync(m){syncMsg=m;updateStatus();const e=$('#odState');if(e)e.textContent=m;}

async function odLogin(silent){
  if(!crypto.subtle){alert('Die Anmeldung funktioniert nur über HTTPS.');return;}
  const ver=b64u(crypto.getRandomValues(new Uint8Array(32)));
  const ch=b64u(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ver)));
  const state=b64u(crypto.getRandomValues(new Uint8Array(16)));
  localStorage.setItem('bb_od_pkce',JSON.stringify({ver,state,silent:!!silent,hash:location.hash}));
  const q=new URLSearchParams({client_id:clientId(),response_type:'code',redirect_uri:redirectUri(),response_mode:'query',
    scope:OD_SCOPE,state,code_challenge:ch,code_challenge_method:'S256',prompt:silent?'none':'select_account'});
  const hint=localStorage.getItem('bb_od_user');if(hint)q.set('login_hint',hint);
  location.href=`${OD_AUTH}/authorize?${q}`;
}
async function odHandleRedirect(){
  const p=new URLSearchParams(location.search);const code=p.get('code'),err=p.get('error');
  if(!code&&!err)return;
  const pk=JSON.parse(localStorage.getItem('bb_od_pkce')||'null');localStorage.removeItem('bb_od_pkce');
  history.replaceState(null,'',redirectUri()+(pk?.hash||''));
  if(err){if(pk?.silent){setSync('bitte neu verbinden');return;}if(S.setupPhase==='od')return;alert('OneDrive-Anmeldung fehlgeschlagen: '+(p.get('error_description')||err));return;}
  if(!pk||pk.state!==p.get('state')){alert('Anmeldung ungültig – bitte erneut versuchen.');return;}
  try{await odTokenReq({grant_type:'authorization_code',code,redirect_uri:redirectUri(),code_verifier:pk.ver});
    odTok.rtIssued=Date.now();await saveTok();
    localStorage.setItem('bb_od_on','1');if(!pk.silent)toast('Mit OneDrive verbunden');}
  catch(e){if(S.setupPhase!=='od')alert('Token-Abruf fehlgeschlagen: '+e.message);}
}
async function odTokenReq(params){
  const r=await fetch(`${OD_AUTH}/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:clientId(),scope:OD_SCOPE,...params})});
  const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.error||r.status);
  odTok={access:j.access_token,refresh:j.refresh_token||odTok?.refresh,exp:Date.now()+(j.expires_in-120)*1000,rtIssued:odTok?.rtIssued||Date.now()};
  if(j.id_token){try{const c=JSON.parse(decodeURIComponent(escape(atob(j.id_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))));
    const u=c.preferred_username||c.email||c.login_hint;if(u)localStorage.setItem('bb_od_user',u);}catch(e){}}
  await saveTok();
}
async function odAccess(){
  if(odTok&&Date.now()<odTok.exp)return odTok.access;
  if(odTok?.refresh){try{await odTokenReq({grant_type:'refresh_token',refresh_token:odTok.refresh});return odTok.access;}catch(e){}}
  odTok=null;await saveTok();const e=new Error('Anmeldung abgelaufen');e.relogin=true;throw e;
}
async function g(path,opts={}){
  // Zugangstoken ausschließlich an Microsoft Graph senden – nie an andere Server
  const url=new URL(path.startsWith('http')?path:GRAPH+path);
  if(url.protocol!=='https:'||url.hostname!=='graph.microsoft.com')throw new Error('Unzulässiges Ziel für Microsoft-Token: '+url.hostname);
  const tok=await odAccess();
  return fetch(url.href,{...opts,credentials:'omit',headers:{...(opts.headers||{}),Authorization:'Bearer '+tok}});}

/* Stille Erneuerung der Microsoft-Anmeldung, bevor sie nach 24 h abläuft (nur ohne laufende Fahrt) */
function maybeRenew(){
  if(!S.odEnabled||!localStorage.getItem('bb_od_on')||rec||!navigator.onLine||document.visibilityState!=='visible')return false;
  const age=odTok?.rtIssued?Date.now()-odTok.rtIssued:Infinity;
  if(odTok&&age<RT_RENEW)return false;
  const last=+localStorage.getItem('bb_silent')||0;if(Date.now()-last<2*36e5)return false;
  localStorage.setItem('bb_silent',Date.now());odLogin(true);return true;
}
let syncing=false,syncTimer;
function syncSoon(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(true),4000);}
/* ---- Prüfung von Datensätzen aus OneDrive und Sicherungsdateien ----
   Nur vollständige, plausible Datensätze werden übernommen. Texte werden in der Länge begrenzt
   (angezeigt werden sie ohnehin immer maskiert, nie als HTML). */
const MAX_REC_BYTES=20*1024*1024;
const isNum=v=>typeof v==='number'&&isFinite(v);
const isLat=v=>isNum(v)&&v>=-90&&v<=90, isLon=v=>isNum(v)&&v>=-180&&v<=180;
const str=(v,max=500)=>typeof v==='string'?v.slice(0,max):'';
const optStr=(v,max=500)=>v==null?null:typeof v==='string'?v.slice(0,max):undefined;
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const ID_RE=/^[\p{L}\p{N}_.-]{1,100}$/u;
function vPos(p,needT=true){if(!isObj(p))return null;if(needT&&!isNum(p.t))return null;
  if(p.lat!=null&&!isLat(p.lat))return null;if(p.lon!=null&&!isLon(p.lon))return null;
  return {t:p.t,lat:p.lat??null,lon:p.lon??null,acc:isNum(p.acc)?p.acc:null};}
function vWx(w){if(w==null)return null;if(!isObj(w)||!isNum(w.temp)||!isNum(w.wind))return undefined;
  return {code:isNum(w.code)?w.code:null,desc:str(w.desc,80),icon:str(w.icon,8),temp:w.temp,wind:w.wind,gust:isNum(w.gust)?w.gust:null,dir:str(w.dir,30),bft:isNum(w.bft)?w.bft:null,src:str(w.src,40)};}
function vBoat(b){if(b==null)return undefined;if(!isObj(b))return null;return {type:str(b.type,120),name:str(b.name,120),...(b.kind?{kind:b.kind==='sail'?'sail':'motor'}:{})};}
function validateTrip(t,id){
  if(!isObj(t)||t.id!==id||!ID_RE.test(id))return null;
  if(!['done','active'].includes(t.status)||!isNum(t.updatedAt))return null;
  const start=vPos(t.start);if(!start)return null;
  const end=t.end==null?null:vPos(t.end);if(t.end!=null&&!end)return null;
  if(t.status==='done'&&!end&&!t.deleted)return null;
  if(!Array.isArray(t.points||[])||(t.points||[]).length>500000)return null;
  const points=[];for(const p of t.points||[]){if(!isObj(p)||!isNum(p.t)||!isLat(p.lat)||!isLon(p.lon))return null;
    points.push({t:p.t,lat:p.lat,lon:p.lon,acc:isNum(p.acc)?p.acc:null,spd:isNum(p.spd)?p.spd:null});}
  const notes={};if(t.notes!=null){if(!isObj(t.notes))return null;
    for(const [k,n] of Object.entries(t.notes)){if(!/^\d{1,15}$/.test(k)||!isObj(n)||typeof n.text!=='string')return null;notes[k]={text:n.text.slice(0,4000),updatedAt:isNum(n.updatedAt)?n.updatedAt:0};}}
  const helms=[];if(t.helms!=null){if(!Array.isArray(t.helms)||t.helms.length>500)return null;
    for(const h of t.helms){if(!isObj(h)||!isNum(h.t)||typeof h.name!=='string')return null;helms.push({t:h.t,name:h.name.slice(0,120)});}}
  let crew;if(t.crew!=null){if(!isObj(t.crew)||!isNum(t.crew.pax)||t.crew.pax<0||t.crew.pax>12||!Array.isArray(t.crew.guests||[]))return null;
    crew={pax:Math.round(t.crew.pax),guests:(t.crew.guests||[]).slice(0,12).map(g=>str(g,120))};}
  const wS=vWx(t.weatherStart),wE=vWx(t.weatherEnd);if(wS===undefined||wE===undefined)return null;
  const boat=vBoat(t.boat);if(boat===null)return null;
  const ps=optStr(t.placeStart,200),pe=optStr(t.placeEnd,200);if(ps===undefined||pe===undefined)return null;
  const out={id,v:isNum(t.v)?t.v:1,status:t.status,createdAt:isNum(t.createdAt)?t.createdAt:start.t,updatedAt:t.updatedAt,deleted:t.deleted===true,
    start,end,points,distance:isNum(t.distance)&&t.distance>=0?t.distance:0,maxSpd:isNum(t.maxSpd)&&t.maxSpd>=0?t.maxSpd:0,
    placeStart:ps,placeEnd:pe,weatherStart:wS,weatherEnd:wE,note:str(t.note,8000),notes};
  if(boat)out.boat=boat;
  if(t.skipper!=null)out.skipper=str(t.skipper,120);
  if(t.helms!=null)out.helms=helms;
  if(crew)out.crew=crew;
  if(isObj(t.briefing)&&isNum(t.briefing.t))out.briefing={done:t.briefing.done===true,t:t.briefing.t};
  if(t.events!=null){if(!Array.isArray(t.events)||t.events.length>2000)return null;out.events=[];
    for(const e of t.events){if(!isObj(e)||!isNum(e.t)||!(e.type in EV))return null;if(e.lat!=null&&!isLat(e.lat))return null;if(e.lon!=null&&!isLon(e.lon))return null;
      out.events.push({t:e.t,type:e.type,lat:e.lat??null,lon:e.lon??null});}}
  return out;
}
function validateFuel(f,id){
  if(!isObj(f)||f.id!==id||!ID_RE.test(id)||!isNum(f.t)||!isNum(f.updatedAt))return null;
  if(!f.deleted&&(!isNum(f.liters)||f.liters<=0||f.liters>100000||!isNum(f.price)||f.price<0||f.price>1000))return null;
  if(f.lat!=null&&!isLat(f.lat))return null;if(f.lon!=null&&!isLon(f.lon))return null;
  const boat=vBoat(f.boat);if(!boat)return null;
  return {id,t:f.t,createdAt:isNum(f.createdAt)?f.createdAt:f.t,updatedAt:f.updatedAt,deleted:f.deleted===true,boat,
    liters:isNum(f.liters)?f.liters:0,price:isNum(f.price)?f.price:0,fuelType:str(f.fuelType,60)||'Diesel',full:f.full!==false,
    lat:f.lat??null,lon:f.lon??null,acc:isNum(f.acc)?f.acc:null,place:optStr(f.place,200)??null};
}
function validateBoatRec(b,id){
  if(!isObj(b)||b.id!==id||!ID_RE.test(id)||!isNum(b.updatedAt))return null;
  const out={id,name:str(b.name,120),type:str(b.type,120),updatedAt:b.updatedAt,deleted:b.deleted===true};
  if(b.kind)out.kind=b.kind==='sail'?'sail':'motor';
  for(const [k] of BOAT_FIELDS){if(b[k]!=null){if(typeof b[k]!=='string')return null;out[k]=b[k].slice(0,60);}}
  if(b.ft!=null){if(!isObj(b.ft))return null;out.ft={};for(const f of BOAT_SYNC_FIELDS())if(isNum(b.ft[f]))out.ft[f]=b.ft[f];}
  return out;
}
function validateMeta(m,id){
  if(id!=='lists'||!isObj(m)||m.id!=='lists'||!isObj(m.entries))return null;
  const out={id:'lists',updatedAt:isNum(m.updatedAt)?m.updatedAt:0,entries:{}};
  for(const k of LIST_KEYS){const e=m.entries[k];if(e==null){out.entries[k]={};continue;}if(!isObj(e))return null;
    const o={};let n=0;for(const [name,v] of Object.entries(e)){if(++n>500)break;if(!isObj(v)||typeof name!=='string'||!name.trim()||name.length>120)return null;
      o[name]={a:isNum(v.a)?v.a:0,t:isNum(v.t)?v.t:0,del:v.del===true};}
    out.entries[k]=o;}
  return out;
}
const SYNC_SETS=[
  {folder:'trips',validate:validateTrip,key:id=>id,get:getTrip,put:putTrip,all:allTrips,skipUp:t=>t.status!=='done',skipDown:id=>rec&&rec.trip.id===id},
  {folder:'fuel',validate:validateFuel,key:id=>'fuel:'+id,get:getFuel,put:putFuel,all:allFuel,skipUp:()=>false,skipDown:()=>false},
  {folder:'boats',validate:validateBoatRec,key:id=>'boat:'+id,get:getBoatRec,put:putBoatRec,all:allBoats,skipUp:()=>false,skipDown:()=>false,
    merge:mergeBoat,same:(m,r)=>boatCore(m)===boatCore(mergeBoat(r,r)),after:m=>{applyBoatRec(m);return true;}},
  {folder:'meta',validate:validateMeta,key:id=>'meta:'+id,get:getMeta,put:putMeta,all:allMeta,skipUp:()=>false,skipDown:()=>false,merge:mergeLists,
    same:(m,r)=>JSON.stringify(m.entries)===JSON.stringify(mergeLists(r,r).entries),after:m=>{if(m.id==='lists'){listsToS(m);return true;}return false;}}];
async function syncNow(quiet,allowSilentLogin){
  if(!S.odEnabled)return;
  if(!localStorage.getItem('bb_od_on')){if(!quiet)toast('OneDrive ist nicht verbunden');return;}
  if(syncing||!navigator.onLine)return;syncing=true;setSync('synchronisiere …');
  const map=JSON.parse(localStorage.getItem('bb_odmap')||'{}');let down=0,up=0,invalid=0,metaChanged=false;
  try{
    for(const set of SYNC_SETS){
      const remote=[];let url=`/me/drive/special/approot:/${set.folder}:/children?$top=200`;
      while(url){const r=await g(url);if(r.status===404)break;if(!r.ok)throw new Error('Liste '+r.status);
        const j=await r.json();if(!Array.isArray(j?.value))throw new Error('Unerwartete Antwort von OneDrive');
        remote.push(...j.value.filter(f=>typeof f?.name==='string'&&f.name.endsWith('.json')));
        url=typeof j['@odata.nextLink']==='string'&&j['@odata.nextLink'].startsWith(GRAPH+'/')?j['@odata.nextLink']:null;}
      for(const f of remote){
        const id=f.name.slice(0,-5),k=set.key(id),m=map[k];
        if(m&&m.remoteMod===f.lastModifiedDateTime)continue;
        if(set.skipDown(id))continue;
        const dl=f['@microsoft.graph.downloadUrl'];
        // downloadUrl ist vorab signiert und wird ohne Token und ohne Cookies abgerufen
        const r=dl?await fetch(dl,{credentials:'omit'}):await g(`/me/drive/items/${f.id}/content`);
        if(!r.ok)throw new Error('Download '+r.status);
        const raw=await r.text();
        let rt=null;
        try{rt=raw.length<=MAX_REC_BYTES?set.validate(JSON.parse(raw),id):null;}catch(e){rt=null;}
        if(!rt){ // ungültige Datei: nicht speichern; ist lokal eine gültige Fassung vorhanden, wird sie wieder hochgeladen
          console.warn('Ungültiger Datensatz übersprungen:',set.folder,f.name);invalid++;
          const lo=await set.get(id);map[k]={remoteMod:f.lastModifiedDateTime,localUpd:lo&&!set.skipUp(lo)?0:(m?.localUpd||0)};continue;}
        const local=await set.get(id);
        if(set.merge){
          const mg=set.merge(local,rt);const sameAsRemote=set.same(mg,rt);
          if(!sameAsRemote)mg.updatedAt=Date.now(); // lokal gab es Neueres → zusammengeführte Fassung wieder hochladen
          await set.put(mg);if(set.after(mg))metaChanged=true;down++;
          map[k]={remoteMod:f.lastModifiedDateTime,localUpd:sameAsRemote?mg.updatedAt:0};continue;
        }
        if(!local||(rt.updatedAt||0)>(local.updatedAt||0)){await set.put(rt);down++;map[k]={remoteMod:f.lastModifiedDateTime,localUpd:rt.updatedAt};}
        else map[k]={remoteMod:f.lastModifiedDateTime,localUpd:rt.updatedAt===local.updatedAt?local.updatedAt:(m?.localUpd||0)};
      }
      for(const t of await set.all()){
        if(set.skipUp(t))continue;const k=set.key(t.id),m=map[k];if(m&&m.localUpd>=t.updatedAt)continue;
        const r=await g(`/me/drive/special/approot:/${set.folder}/${t.id}.json:/content`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
        if(!r.ok)throw new Error('Upload '+r.status);const j=await r.json();
        map[k]={remoteMod:j.lastModifiedDateTime,localUpd:t.updatedAt};up++;
      }
    }
    for(const x of await allPdfs()){
      if(x.uploaded)continue;
      const r=await g(`/me/drive/special/approot:/pdf/${encodeURIComponent(x.name)}:/content`,{method:'PUT',headers:{'Content-Type':'application/pdf'},body:x.bytes});
      if(!r.ok)throw new Error('PDF-Upload '+r.status);
      x.uploaded=Date.now();await putPdf(x);up++;
      if((location.hash||'').startsWith('#/fahrt/'))drawPdfList&&drawPdfList();
    }
    localStorage.setItem('bb_lastsync',Date.now());
    setSync(`synchronisiert ${fmtTime(Date.now())}`+(up||down?` (↑${up} ↓${down})`:'')+(invalid?` · ${invalid} ungültige Datei(en) übersprungen`:''));
    if(metaChanged&&(location.hash||'').startsWith('#/einstellungen')&&!(document.activeElement&&/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)))renderSettings();
    if(down){if(await refreshPre().catch(()=>false)&&!rec&&(location.hash||'#/').match(/^#\/?$/))renderHome();refreshView();enrichAll();}
    if(!quiet)toast('Synchronisation abgeschlossen');
  }catch(e){
    if(e.relogin){
      const last=+localStorage.getItem('bb_silent')||0;
      if(allowSilentLogin&&!rec&&Date.now()-last>2*36e5){localStorage.setItem('bb_silent',Date.now());syncing=false;odLogin(true);return;}
      setSync('bitte neu verbinden');
    }else setSync('Fehler: '+e.message);
    if(!quiet)toast('Sync: '+e.message);
  }finally{localStorage.setItem('bb_odmap',JSON.stringify(map));syncing=false;}
}

/* ================= Einstellungen ================= */
async function renderSettings(){
  setTitle('Einstellungen',true);
  const n=(await liveTrips()).length,nf=(await liveFuel()).length,binfo=await boatInfo(S.boatName);const on=!!localStorage.getItem('bb_od_on');
  view.innerHTML=`
  <a class="msel crewBtn helpBtn" href="#/hilfe" style="margin:0 auto 14px;text-decoration:none"><span class="in"><span><small>Neu hier?</small><b>Hilfe und Anleitung</b></span><span class="cbR">öffnen</span></span></a>
  <section class="panel"><h3>Boot</h3>
    <label for="sKind">Bootsart</label><select id="sKind" class="fsel"><option value="motor" ${(binfo.kind||S.boatKind)!=='sail'?'selected':''}>Motorboot</option><option value="sail" ${(binfo.kind||S.boatKind)==='sail'?'selected':''}>Segelboot</option></select>
    <label>Bootsmodell</label><input type="text" id="sBType" value="${esc(binfo.type??S.boatType)}">
    <label>Bootsname</label><input type="text" id="sBName" value="${esc(S.boatName)}">
    ${BOAT_FIELDS.map(([k,l,m,u])=>`<label for="sB_${k}">${l}${u?` (${u})`:''}</label><input type="text" id="sB_${k}" data-bf="${k}" inputmode="${m}" value="${esc(binfo[k]||'')}" autocomplete="off" autocapitalize="characters">`).join('')}
    <p class="hint">Bootsart, Bootsmodell und Bootsname werden bei jeder neuen Fahrt mitgespeichert. Die weiteren Angaben gehören fest zum Bootsnamen „${esc(S.boatName)}“ und erscheinen im Notfallfenster (SOS).</p>
  </section>
  <section class="panel"><h3>Skipper</h3>
    <div class="chips">${S.skippers.map(f=>`<span class="chip">${esc(f)}${BUILTIN_PEOPLE.includes(f)?'':`<button data-pk="skippers" data-p="${esc(f)}" aria-label="${esc(f)} entfernen">×</button>`}</span>`).join('')}</div>
    <p class="hint">Weitere Skipper kommen über „Weiterer Skipper …“ auf der Startseite hinzu. Entfernen wirkt nur auf künftige Fahrten. Die Liste wird über OneDrive mit deinen anderen Geräten abgeglichen.</p>
  </section>
  <section class="panel"><h3>Steuermann</h3>
    <div class="chips">${S.helms.map(f=>`<span class="chip">${esc(f)}${BUILTIN_PEOPLE.includes(f)?'':`<button data-pk="helms" data-p="${esc(f)}" aria-label="${esc(f)} entfernen">×</button>`}</span>`).join('')}</div>
    <p class="hint">Weitere Steuerleute kommen über „Weiterer Steuermann …“ auf der Startseite hinzu. Entfernen wirkt nur auf künftige Fahrten. Die Liste wird über OneDrive mit deinen anderen Geräten abgeglichen.</p>
  </section>
  <section class="panel"><h3>Kraftstoffarten</h3>
    <div class="chips">${S.fuelTypes.map(f=>`<span class="chip">${esc(f)}${BUILTIN_FUELS.includes(f)?'':`<button data-f="${esc(f)}" aria-label="${esc(f)} entfernen">×</button>`}</span>`).join('')}</div>
    <div class="row" style="flex-wrap:nowrap"><input type="text" id="sFuelNew" placeholder="Weitere Kraftstoffart, zum Beispiel Super E10"><button class="btn" id="sFuelAdd">Hinzufügen</button></div>
    <p class="hint">Voreingestellt beim Tanken ist „Diesel“. Die Liste wird über OneDrive mit deinen anderen Geräten abgeglichen.</p>
  </section>
  <section class="panel"><h3>Einheiten</h3>
    <label for="sUnits">Strecke und Geschwindigkeit</label>
    <select id="sUnits" class="fsel"><option value="metric" ${S.units!=='nautical'?'selected':''}>Kilometer und km/h</option><option value="nautical" ${S.units==='nautical'?'selected':''}>Seemeilen (sm) und Knoten (kn)</option></select>
    <p class="hint">Gilt für alle Anzeigen, Auswertungen, Wind und das PDF. Gespeichert wird intern immer in Metern, ein Wechsel ist jederzeit möglich.</p>
  </section>
  <section class="panel"><h3>Aufzeichnung</h3>
    <label>Mindestabstand zwischen Wegpunkten (m)</label><input type="number" id="sMin" min="1" value="${S.minDist}">
    <label>Spätestens alle … Sekunden ein Wegpunkt</label><input type="number" id="sInt" min="5" value="${S.maxInterval}">
    <label>GPS-Positionen ungenauer als … m verwerfen</label><input type="number" id="sAcc" min="5" value="${S.maxAcc}">
    <div class="check"><input type="checkbox" id="sWake" ${S.wake?'checked':''}><span>Display während der Fahrt anlassen (empfohlen)</span></div>
  </section>
  <section class="panel"><h3>Karte</h3>
    <div class="check"><input type="checkbox" id="sSea" ${S.seamarks!==false?'checked':''}><span>Seezeichen (OpenSeaMap) in der Karte anzeigen</span></div>
    <p class="hint">Betonnung, Leuchtfeuer, Häfen und weitere Seezeichen über der Karte. Lässt sich auch direkt in der Karte über das Ebenen-Symbol ein- und ausschalten.</p>
  </section>
  <section class="panel"><h3>OneDrive – automatische Synchronisation</h3>
    <div class="check"><input type="checkbox" id="sOdEn" ${S.odEnabled?'checked':''}><span>OneDrive-Synchronisation verwenden</span></div>
    ${S.odEnabled?`
    <p class="hint">Status: <b id="odState">${on?esc(syncMsg||'verbunden'):'nicht verbunden'}</b>${on&&localStorage.getItem('bb_od_user')?` · angemeldet als ${esc(localStorage.getItem('bb_od_user'))}`:''}</p>
    <p class="hint">Einfach auf „Mit OneDrive verbinden“ tippen und mit deinem Microsoft-Konto anmelden – eine weitere Einrichtung ist nicht nötig.</p>
    <div class="row">
      <button class="btn" id="odCon">${on?'Neu anmelden':'Mit OneDrive verbinden'}</button>
      ${on?'<button class="btn ghost" id="odSync">Jetzt synchronisieren</button><button class="btn danger" id="odOff">Trennen</button>':''}
    </div>
    <details class="help" style="margin:10px 0"><summary>Erweitert: eigene Client-ID</summary><div>
      <p class="hint">Nur nötig, wenn du die App unter einer eigenen Web-Adresse betreibst. Leer lassen, um die eingebaute ID zu verwenden.</p>
      <input type="text" id="sCid" value="${esc(S.odClientId&&S.odClientId!==BUILTIN_CLIENT_ID?S.odClientId:'')}" placeholder="leer = eingebaute ID" autocapitalize="off" autocomplete="off">
      <p class="hint">Umleitungs-URI für eine eigene Registrierung (Plattform „Single-Page-Anwendung“):<br><code>${esc(redirectUri())}</code></p>
    </div></details>
    <p class="hint">Microsoft lässt Web-Apps nur 24 Stunden ohne neue Anmeldung zu. Die App erneuert die Anmeldung deshalb beim Öffnen automatisch im Hintergrund (kurzer Seitenwechsel). Damit das ohne Eingabe klappt, bei der Microsoft-Anmeldung „Angemeldet bleiben?“ mit „Ja“ beantworten.</p>
    <p class="hint" style="font-size:11.5px">🔒 Der Entwickler dieser App hat keinen Zugriff auf dein OneDrive und deine Aufzeichnungen. Die App sendet keine Daten an ihn. Microsoft gibt den Zugang ausschließlich an diese App auf deinem Gerät heraus; es gibt keinen Server, über den der Entwickler mitlesen könnte.</p>
    <p class="hint">Die Fahrten liegen in deinem OneDrive unter <i>Apps › Bordbuch › trips</i>. Jedes Gerät mit derselben Client-ID und demselben Microsoft-Konto sieht dieselben Fahrten.</p>
  `:`<p class="hint">Ausgeschaltet: Alle Daten bleiben nur auf diesem Gerät. Sichern kannst du sie unten mit „Sicherung exportieren“. Einschalten lohnt sich, wenn du die App auf mehreren Geräten nutzen möchtest – die Einrichtung ist in der Hilfe beschrieben.</p>`}
  </section>
  <section class="panel"><h3>iCloud &amp; Datensicherung</h3>
    <p class="hint">Eine Web-App darf nicht selbstständig in iCloud schreiben. Mit „Sicherung exportieren“ öffnet sich das Teilen-Menü – dort „In Dateien sichern“ → iCloud Drive wählen. Auf einem anderen Gerät importierst du die Datei hier wieder; vorhandene Fahrten werden zusammengeführt, nicht doppelt angelegt.</p>
    <div class="row"><button class="btn" id="exp">Sicherung exportieren</button><label class="btn ghost" style="margin:0">Sicherung importieren<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
  </section>
  <section class="panel"><h3>Daten</h3>
    <p class="hint">${n} Fahrt(en) und ${nf} Tankvorgang/-vorgänge auf diesem Gerät gespeichert.</p>
    <div class="row"><button class="btn ghost" id="enr">Orte &amp; Wetter jetzt nachladen</button></div>
    <p class="hint">Version ${APP_VERSION}</p>
    <p class="hint" style="font-size:11.5px">🔒 Der Entwickler dieser App hat keinen Zugriff auf dein OneDrive und deine Aufzeichnungen. Die App sendet keine Daten an ihn. Die Anmeldung bei Microsoft gilt nur für dich und nur für den Ordner „Apps › Bordbuch“ in deinem eigenen OneDrive.</p>
    <div class="row"><button class="btn ghost" id="updNow">Nach neuer Version suchen</button></div>
    <p class="hint">Lädt die App neu aus dem Internet. Deine Fahrten und Tankvorgänge bleiben dabei erhalten.</p>
    <p class="hint">Ortsnamen: © OpenStreetMap/Nominatim · Wetter: Open-Meteo · Karte: OpenStreetMap, OpenSeaMap · Synchronisation: Microsoft Graph</p>
    <div class="row"><a class="btn ghost" href="#/datenschutz" style="text-decoration:none">Datenschutzerklärung</a></div>
  </section>`;
  $('#sUnits').onchange=e=>{S.units=e.target.value;saveS();toast(S.units==='nautical'?'Einheiten: Seemeilen und Knoten':'Einheiten: Kilometer und km/h');};
  const setNum=(id,k,min)=>$(id).onchange=e=>{const v=Math.max(min,+e.target.value||DEF[k]);S[k]=v;saveS();};
  setNum('#sMin','minDist',1);setNum('#sInt','maxInterval',5);setNum('#sAcc','maxAcc',5);
  $('#sBType').onchange=e=>{S.boatType=e.target.value.trim();saveS();renderBoatHeader();boatPatch(S.boatName,{type:S.boatType}).then(()=>toast('Bootsmodell gespeichert'));};
  $('#sBName').onchange=async e=>{S.boatName=e.target.value.trim();saveS();const ex=await boatInfo(S.boatName);if(ex.id)applyBoatRec(ex);else if(S.boatName)await boatPatch(S.boatName,{type:S.boatType,kind:S.boatKind},true);renderBoatHeader();renderSettings();};
  if(binfo.kind&&binfo.kind!==S.boatKind){S.boatKind=binfo.kind;saveS();}
  $('#sKind').onchange=async e=>{S.boatKind=e.target.value;saveS();await boatPatch(S.boatName,{kind:S.boatKind});toast(kindLabel(S.boatKind)+' gespeichert');};
  view.querySelectorAll('input[data-bf]').forEach(inp=>inp.onchange=async()=>{await boatPatch(S.boatName,{[inp.dataset.bf]:inp.value.trim()});toast('Bootsdaten gespeichert');});
  view.querySelectorAll('button[data-pk]').forEach(b=>b.onclick=()=>{const k=b.dataset.pk,n=b.dataset.p;
    S[k]=S[k].filter(x=>x!==n);saveS();listChange(k,n,true);
    if(k==='skippers'&&P.skipper===n)P.skipper=defSkipper();if(k==='helms'&&P.helm===n)P.helm=defHelm();saveP();
    toast(`„${n}“ entfernt`);renderSettings();});
  $('#sFuelAdd').onclick=()=>{const v=$('#sFuelNew').value.trim();if(!v)return;
    if(S.fuelTypes.some(f=>f.toLowerCase()===v.toLowerCase())){toast('Diese Kraftstoffart gibt es schon');return;}
    S.fuelTypes.push(v);saveS();listChange('fuelTypes',v,false).then(renderSettings);toast(`„${v}“ hinzugefügt`);};
  view.querySelectorAll('.chip button[data-f]').forEach(b=>b.onclick=()=>{S.fuelTypes=S.fuelTypes.filter(f=>f!==b.dataset.f);saveS();listChange('fuelTypes',b.dataset.f,true).then(renderSettings);});
  $('#sWake').onchange=e=>{S.wake=e.target.checked;saveS();};
  $('#sSea').onchange=e=>{S.seamarks=e.target.checked;saveS();toast(S.seamarks?'Seezeichen werden angezeigt':'Seezeichen ausgeblendet');};
  if($('#sCid'))$('#sCid').onchange=e=>{S.odClientId=e.target.value.trim();saveS();};
  $('#sOdEn').onchange=e=>{S.odEnabled=e.target.checked;saveS();updateStatus();renderSettings();if(S.odEnabled)syncNow(true);};
  if($('#odCon'))$('#odCon').onclick=()=>{S.odClientId=($('#sCid')?.value||'').trim();saveS();if(rec&&!confirm('Während der Aufzeichnung kurz zur Microsoft-Anmeldung wechseln? Die Fahrt läuft danach weiter.'))return;odLogin(false);};
  if($('#odSync'))$('#odSync').onclick=()=>syncNow(false);
  if($('#odOff'))$('#odOff').onclick=()=>{['bb_od','bb_od_on','bb_odmap','bb_od_user'].forEach(k=>localStorage.removeItem(k));odTok=null;saveTok();syncMsg='';renderSettings();};
  $('#exp').onclick=exportAll;
  $('#updNow').onclick=forceUpdate;
  $('#imp').onchange=e=>{const f=e.target.files[0];if(f)importFile(f).then(renderSettings);};
  $('#enr').onclick=()=>{if(!navigator.onLine){toast('Keine Internetverbindung');return;}toast('Lade nach …');enrichAll();};
}

/* ================= App-Updates ================= */
let swReg=null;
function setupUpdates(){
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{swReg=r;r.update().catch(()=>{});}).catch(e=>console.warn(e));
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloading)return;
    if(rec){toast('Neue Version geladen – sie wird nach dem Ende der Fahrt aktiv');localStorage.setItem('bb_reload','1');return;}
    reloading=true;location.reload();
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&swReg)swReg.update().catch(()=>{});});
}
async function forceUpdate(){
  if(rec){alert('Bitte erst die laufende Fahrt beenden.');return;}
  if(!navigator.onLine){toast('Keine Internetverbindung');return;}
  toast('Lade neueste Version …');
  try{if(swReg)await swReg.update();}catch(e){}
  try{for(const k of await caches.keys())if(k.startsWith('bordbuch-shell'))await caches.delete(k);}catch(e){}
  location.reload();
}


/* ================= Hilfe ================= */
function renderHelp(){
  setTitle('Hilfe',true);
  const sec=(t,b,open)=>`<details class="help" ${open?'open':''}><summary>${t}</summary><div>${b}</div></details>`;
  view.innerHTML=`<p class="hint" style="margin-top:0">Das Bordbuch ersetzt das Logbuch auf Papier: Es zeichnet jede Fahrt mit GPS auf, merkt sich Besatzung, Wetter und Tankvorgänge und hat im Notfall alle wichtigen Angaben bereit. Es funktioniert auch ohne Internet.</p>
  ${sec('1. App auf dem Handy installieren',`<ul>
    <li><b>iPhone/iPad:</b> Adresse in <b>Safari</b> öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Danach immer über das Symbol starten.</li>
    <li><b>Android:</b> In Chrome öffnen → Menü ⋮ → „App installieren“.</li>
    <li>Beim allerersten Start fragt die App, ob OneDrive genutzt werden soll. Mit OneDrive meldest du dich zuerst an; Boot, Skipper, Steuerleute und Fahrten von deinen anderen Geräten werden dann übernommen und sind zur Auswahl vorbelegt. Ohne OneDrive trägst du Boot, Skipper und Steuermann direkt ein.</li>
    <li>Beim ersten Start den <b>Standortzugriff erlauben</b> (iPhone: Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites → „Beim Verwenden“ und „Genauer Standort“).</li>
    <li>Einmal mit Internet öffnen, damit die App für die Nutzung ohne Netz gespeichert wird.</li></ul>`,true)}
  ${sec('2. Eine Fahrt aufzeichnen',`<ul>
    <li>Vor dem Ablegen <b>Skipper</b>, <b>Steuermann</b> und <b>Pax</b> (Personen an Bord) wählen. Sind mehr als eine Person an Bord, fragt die App nach dem Start, ob die Sicherheitsunterweisung der Crew durchgeführt wurde; die Antwort wird mit der Fahrt gespeichert.</li>
    <li><b>Start</b> drücken, wenn der Motor läuft: Datum, Uhrzeit und Position werden gespeichert, die Strecke wird aufgezeichnet.</li>
    <li><b>Stop</b> drücken, wenn der Motor aus ist: Die Fahrt wird beendet.</li>
    <li><b>Wichtig:</b> App während der Fahrt im Vordergrund lassen (am besten mit Ladekabel). Im Hintergrund oder bei gesperrtem Display pausiert das GPS.</li>
    <li><b>Segelboot:</b> Start und Stop heißen „Fahrtbeginn“ und „Fahrtende“. Links und rechts gibt es zusätzlich „Motor an“/„Motor aus“ und „Segel gesetzt“/„Segel geborgen“ – jede Betätigung wird mit Uhrzeit und Position gespeichert. Die Fahrt zeigt danach die Zeit unter Motor und unter Segel; der Verbrauch je Stunde bezieht sich dann auf die Motorlaufzeit.</li>
    <li><b>Anker, Ankerlicht, Positionslichter</b> (kleine Knöpfe unter Start/Stop): ein- und ausschalten per Antippen; ein eingeschalteter Knopf hat einen leuchtenden Ring. Während einer Fahrt wird jede Betätigung mit Uhrzeit protokolliert; was beim Start eingeschaltet ist, wird übernommen.</li>
    <li>Leuchtende Ringe zeigen den aktuellen Zustand: Vor der Fahrt leuchtet Stop rot, während der Fahrt Start grün. Beim Segelboot ebenso Motor an/aus und Segel gesetzt/geborgen.</li>
    <li>Den Steuermann kannst du während der Fahrt jederzeit wechseln. Mit „Ereignis notieren“ hältst du Schleusen, Manöver oder Technisches fest.</li>
    <li>Ortsnamen und Wetter für Beginn und Ende lädt die App automatisch, sobald Internet da ist.</li></ul>`)}
  ${sec('3. Personen an Bord',`<ul>
    <li>Skipper und Steuerleute zählen automatisch als Personen an Bord. Die übrigen Namen trägst du über „Personen an Bord“ ein – sofort oder später unter der jeweiligen Fahrt.</li>
    <li>Neue Namen fügst du über „Weiterer Skipper …“ bzw. „Weiterer Steuermann …“ hinzu; in den Einstellungen kannst du sie wieder entfernen.</li>
    <li>Endete die letzte Fahrt vor weniger als 48 Stunden, wird ihre Besatzung vorgeschlagen.</li></ul>`)}
  ${sec('4. Tanken und Verbrauch',`<ul>
    <li>Zapfsäulen-Knopf: Liter, Preis je Liter und Kraftstoffart eingeben. Ort, Datum und Uhrzeit speichert die App selbst.</li>
    <li>„Vollgetankt“ angehakt lassen, wenn der Tank voll ist – nur dann lässt sich der Verbrauch genau berechnen.</li>
    <li>Menü → <b>Verbrauch</b>: Strecke seit dem letzten Tanken, Kosten, Liter je Kilometer und je Stunde.</li></ul>`)}
  ${sec('5. Fahrten, Karte und Kommentare',`<ul>
    <li>Menü → <b>Fahrten</b>: alle Fahrten mit Filtern (Boot, Skipper, Steuermann, Person an Bord, Zeitraum) und Summen.</li>
    <li>In der Übersicht löschst du eine Fahrt über den Papierkorb rechts oben auf der Karte (mit Sicherheitsabfrage).</li>
    <li>In einer Fahrt: Karte mit Strecke und Seezeichen (abschaltbar unter Einstellungen → Karte). Hineinzoomen und auf einen Punkt tippen zeigt Uhrzeit und Geschwindigkeit und erlaubt einen Kommentar.</li>
    <li>Menü → <b>Kommentare</b>: alle Kommentare als Tabelle, auch als Excel-Datei (CSV).</li>
    <li>In einer beendeten Fahrt: <b>„Logbucheintrag als PDF exportieren“</b> erstellt ein PDF mit allen Angaben, Streckenskizze und Unterschriftenzeile für den Skipper. Es wird auf dem Gerät gespeichert (Teilen-Menü → „In Dateien sichern“) und – wenn eingeschaltet – in OneDrive unter <i>Apps › Bordbuch › pdf</i> abgelegt.</li></ul>`)}
  ${sec('6. Notfall (S.O.S.)',`<ul>
    <li>Der rote Knopf zeigt sofort die Seenotleitung MRCC Bremen mit Telefonnummer (antippen zum Anrufen) und UKW-Kanal, dazu alle Bootsdaten, die aktuelle Position zum Vorlesen und die Personen an Bord.</li>
    <li>Damit das vollständig ist: in den Einstellungen unter <b>Boot</b> MMSI, Callsign, Kennzeichen und Maße eintragen.</li></ul>`)}
  ${sec('7. Daten, Sicherung und mehrere Geräte',`<ul>
    <li>Alle Daten liegen zunächst <b>nur auf diesem Gerät</b>. Es gibt keinen Server, der deine Daten speichert.</li>
    <li>Die App lädt keinen fremden Programmcode: Kartenbibliothek und App liegen vollständig auf derselben Web-Adresse. Eine eingebaute Sicherheitsrichtlinie erlaubt Verbindungen nur zu den unten genannten Diensten sowie zu Microsoft (Anmeldung und OneDrive).</li>
    <li>Einstellungen → <b>Sicherung exportieren</b> speichert alles als Datei (zum Beispiel in iCloud Drive). Mit „Sicherung importieren“ holst du sie auf ein anderes Gerät.</li>
    <li><b>Achtung iPhone/iPad:</b> Wird das App-Symbol vom Home-Bildschirm gelöscht, sind auch die Daten weg. Vorher eine Sicherung exportieren.</li>
    <li><b>OneDrive (freiwillig):</b> gleicht Fahrten, Tankvorgänge, Bootsdaten und Namenslisten automatisch zwischen deinen Geräten ab. Dafür in den Einstellungen „OneDrive-Synchronisation verwenden“ einschalten, „Mit OneDrive verbinden“ tippen und mit deinem Microsoft-Konto anmelden. Bei der Frage „Angemeldet bleiben?“ „Ja“ wählen.</li>
    <li>Eine eigene Microsoft-Registrierung ist nicht nötig: Die App bringt alles mit. Deine Daten landen nur in deinem eigenen OneDrive (Ordner <i>Apps › Bordbuch</i>); die App hat auch nur auf diesen Ordner Zugriff.</li></ul>`)}
  ${sec('8. Updates',`<ul><li>Neue Versionen lädt die App mit Internet automatisch. Die Versionsnummer steht unten links auf der Startseite. Einstellungen → „Nach neuer Version suchen“ erzwingt ein Update; deine Daten bleiben erhalten.</li></ul>`)}
  ${sec('Datenquellen und Datenschutz',`<p>Karten © OpenStreetMap-Mitwirkende, Seezeichen © OpenSeaMap, Ortsnamen über Nominatim (OpenStreetMap), Wetter von Open-Meteo.com, Synchronisation über Microsoft Graph (nur bei eingeschaltetem OneDrive).</p><p><a href="#/datenschutz"><b>Datenschutzerklärung lesen</b></a> – welche Dienste wann kontaktiert werden und welche Daten dabei übertragen werden.</p>`)}
  <div class="row"><button class="btn ghost" id="hSetup">Ersteinrichtung erneut öffnen</button></div>`;
  $('#hSetup').onclick=()=>openSetup(true);
}

/* ================= Datenschutz ================= */
function renderPrivacy(){
  setTitle('Datenschutz',true);
  const L=(u,t)=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`;
  const rows=[
    ['GitHub Pages (GitHub Inc., USA)','Beim Öffnen der App mit Internet und bei der Suche nach Updates.','IP-Adresse, Browserkennung, Uhrzeit, abgerufene Datei. Keine Inhalte aus deinem Bordbuch.',L('https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement','Datenschutz GitHub')],
    ['OpenStreetMap – Kartenkacheln (OpenStreetMap Foundation, Großbritannien)','Wenn eine Fahrt mit Karte angezeigt wird. Einmal geladene Ausschnitte bleiben begrenzt auf dem Gerät gespeichert.','IP-Adresse, Browserkennung, welcher Kartenausschnitt geladen wird (damit grob, welches Gebiet du ansiehst).',L('https://osmfoundation.org/wiki/Privacy_Policy','Datenschutz OSMF')],
    ['OpenSeaMap – Seezeichen','Wenn eine Fahrt mit Karte angezeigt wird und die Seezeichen eingeschaltet sind (Standard; abschaltbar unter Einstellungen → Karte). Seezeichen werden nicht dauerhaft auf dem Gerät gespeichert.','IP-Adresse, Browserkennung, geladener Kartenausschnitt.',L('https://www.openseamap.org','openseamap.org')],
    ['Nominatim – Ortsnamen (OpenStreetMap Foundation)','Sobald Internet besteht: einmal für Fahrtbeginn, einmal für Fahrtende und je Tankvorgang. Beim PDF-Export einmal für die Gemeinde in der Unterschriftenzeile (Koordinaten auf etwa 1 km gerundet).','Die Koordinaten dieser Orte, IP-Adresse, Browserkennung. Keine Namen, keine Strecke.',L('https://osmfoundation.org/wiki/Privacy_Policy','Datenschutz OSMF')+' · '+L('https://operations.osmfoundation.org/policies/nominatim/','Nutzungsregeln')],
    ['Open-Meteo – Wetter (Open-Meteo.com)','Sobald Internet besteht: je einmal für Fahrtbeginn und Fahrtende.','Koordinaten und Datum von Fahrtbeginn bzw. -ende, IP-Adresse.',L('https://open-meteo.com/en/terms','Nutzungs- und Datenschutzbedingungen')],
    ['Microsoft – Anmeldung und Microsoft Graph/OneDrive (Microsoft Corp., USA)','Nur wenn OneDrive eingeschaltet und verbunden ist: bei der Anmeldung (etwa einmal täglich), beim Öffnen, nach Änderungen und alle 5 Minuten bei geöffneter App.','Dein Microsoft-Konto für die Anmeldung; Fahrten (mit Strecke), Tankvorgänge, Bootsdaten, Namenslisten und PDF-Logbucheinträge werden in deinem eigenen OneDrive im Ordner „Apps › Bordbuch“ gespeichert.',L('https://privacy.microsoft.com/de-de/privacystatement','Datenschutz Microsoft')]
  ];
  view.innerHTML=`<div class="priv">
  <h2>Datenschutzerklärung</h2>
  <p>Stand: Version ${APP_VERSION}. Das Bordbuch ist eine Web-App ohne eigenen Server. Es gibt kein Benutzerkonto beim Anbieter, keine Werbung, keine Analyse- oder Tracking-Dienste und keine Cookies der App. <b>Wer dir die App bereitstellt, erhält keine deiner Daten.</b></p>
  <h3>Kein Zugriff für den Entwickler</h3>
  <p>Der Entwickler der App hat keinen Zugriff auf dein OneDrive und deine Aufzeichnungen. Die Microsoft-Anmeldung erfolgt direkt zwischen deinem Gerät und Microsoft; die Zugangsdaten bleiben verschlüsselt auf deinem Gerät und werden ausschließlich an Microsoft gesendet. Die bei Microsoft hinterlegte App-Registrierung hat nur Rechte, die du bei der Anmeldung selbst erteilst („Delegierte Berechtigung“, nur der Ordner „Apps › Bordbuch“), aber keine eigenen Zugriffsrechte und kein Passwort, mit dem der Entwickler selbst auf Konten zugreifen könnte. Die App enthält keine Funktion, die Daten an den Entwickler schickt; der Programmcode ist öffentlich einsehbar.</p>
  <h3>1. Was auf deinem Gerät gespeichert wird</h3>
  <p>Fahrten mit GPS-Strecke, Zeiten, Kommentaren und Besatzung (Namen), Tankvorgänge, Bootsdaten, Einstellungen, Namenslisten und erstellte PDF-Logbucheinträge. Die Daten liegen im Speicher dieser App im Browser (IndexedDB bzw. Local Storage) und verlassen das Gerät nur in den unten beschriebenen Fällen. Bei aktivem OneDrive wird zusätzlich ein verschlüsselter Anmeldeschlüssel gespeichert.</p>
  <h3>2. Standort</h3>
  <p>Den Standort fragt die App nur ab, während eine Fahrt aufgezeichnet wird, beim Erfassen eines Tankvorgangs und solange das Notfallfenster (S.O.S.) geöffnet ist. Die Strecke wird nur auf dem Gerät gespeichert (und bei aktivem OneDrive in deinem OneDrive).</p>
  <h3>3. Welche Dienste wann kontaktiert werden</h3>
  ${rows.map(r=>`<div class="panel privCard"><b>${r[0]}</b><p><span class="hint">Wann:</span> ${r[1]}</p><p><span class="hint">Welche Daten:</span> ${r[2]}</p><p>${r[3]}</p></div>`).join('')}
  <p class="hint">Bei jedem Abruf erfährt der jeweilige Dienst technisch bedingt deine IP-Adresse. Andere Verbindungen lässt die eingebaute Sicherheitsrichtlinie (Content-Security-Policy) gar nicht zu.</p>
  <h3>4. Telefon und Teilen</h3>
  <p>Der Anruf aus dem Notfallfenster wird von deinem Telefon ausgeführt. Exportierte Dateien (PDF, GPX, CSV, Sicherung) gibst du selbst über das Teilen-Menü weiter; die App sendet sie nicht von sich aus – außer PDF-Logbucheinträge in dein eigenes OneDrive, wenn es eingeschaltet ist.</p>
  <h3>5. Personen an Bord</h3>
  <p>Wenn du Namen anderer Personen einträgst, informiere sie bitte darüber. Die Namen bleiben auf deinem Gerät bzw. in deinem OneDrive.</p>
  <h3>6. Löschen und Kontrolle</h3>
  <p>Einzelne Fahrten und Tankvorgänge löschst du in der App. Alle Daten entfernst du, indem du die App vom Home-Bildschirm löschst bzw. die Website-Daten im Browser löschst. OneDrive-Daten liegen in deinem OneDrive unter „Apps › Bordbuch“ und lassen sich dort löschen; den Zugriff der App entziehst du unter account.live.com/consent/Manage. OneDrive kannst du in den Einstellungen jederzeit ausschalten.</p>
  <h3>7. Rechtsgrundlage</h3>
  <p>Die Verarbeitung erfolgt auf deinem eigenen Gerät zu deinen eigenen Zwecken. Die genannten Dienste werden nur kontaktiert, um die jeweilige Funktion (Karte, Ortsname, Wetter, Synchronisation) bereitzustellen.</p>
  </div>`;
}

/* ================= Ersteinrichtung ================= */
function needsSetup(){return !S.boatName||!S.skippers.length||!S.helms.length;}
/* Ablauf beim allerersten Start:
   1. Frage: mit OneDrive verbinden oder ohne starten?
   2a. Mit OneDrive: zuerst anmelden, dann vorhandene Daten laden; Boot, Skipper und Steuermann sind danach auswählbar.
   2b. Ohne OneDrive: direkt die Eingabemaske. */
async function openSetup(again){
  if(again)return setupForm(true);
  if(S.setupPhase==='od'){
    S.setupPhase=null;saveS();
    if(localStorage.getItem('bb_od_on')&&odTok){
      await busy('Mit OneDrive verbunden. Deine vorhandenen Daten werden geladen …',()=>syncNow(true));
      if(/^Fehler|neu verbinden/.test(syncMsg))toast('Laden aus OneDrive unvollständig – es wird später erneut versucht');
      return setupForm(false);
    }
    return setupStart('Die Verbindung mit OneDrive wurde nicht hergestellt. Du kannst es erneut versuchen oder ohne OneDrive starten.');
  }
  return setupStart();
}
async function busyVal(text,fn){let v;await busy(text,async()=>{v=await fn();});return v;}
function busy(text,fn){
  const d=document.createElement('dialog');d.className='gdlg';
  d.innerHTML=`<div style="display:flex;gap:14px;align-items:center;padding:6px 2px"><div class="spin"></div><p style="margin:0">${esc(text)}</p></div>`;
  d.addEventListener('cancel',e=>e.preventDefault());document.body.appendChild(d);d.showModal();
  return Promise.resolve().then(fn).catch(e=>console.warn(e)).finally(()=>{d.close();d.remove();});
}
async function setupStart(msg){
  const {v}=await modal(`<h2 style="margin:4px 0 6px">⚓ Willkommen beim Bordbuch</h2>
    ${msg?`<p class="pending" style="font-size:14px">${esc(msg)}</p>`:''}
    <p>Möchtest du deine Daten mit <b>OneDrive</b> synchronisieren?</p>
    <p class="hint">Empfohlen, wenn du das Bordbuch auch auf einem anderen Gerät nutzt oder nutzen möchtest: Boot, Skipper, Steuerleute und Fahrten werden dann von dort übernommen. Du meldest dich mit deinem eigenen Microsoft-Konto an; die Daten liegen nur in deinem OneDrive.</p>
    <p class="hint">Ohne OneDrive bleiben alle Daten nur auf diesem Gerät. Einschalten lässt es sich später jederzeit in den Einstellungen.</p>
    <p class="hint" style="font-size:11.5px">🔒 Der Entwickler dieser App hat keinen Zugriff auf dein OneDrive und deine Aufzeichnungen. Die App sendet keine Daten an ihn.</p>
    <div class="row" style="flex-direction:column;align-items:stretch">
      <button value="od" class="btn">Mit OneDrive verbinden</button>
      <button value="local" class="btn ghost">Ohne OneDrive starten</button></div>`,
    d=>d.addEventListener('cancel',e=>e.preventDefault()));
  if(v==='od'){
    if(!navigator.onLine){toast('Keine Internetverbindung – bitte später verbinden oder ohne OneDrive starten');return setupStart(msg);}
    S.odEnabled=true;S.setupPhase='od';saveS();
    await odLogin(false); // Weiterleitung zu Microsoft; danach geht es beim nächsten Laden der App weiter
    return new Promise(()=>{});
  }
  S.odEnabled=false;saveS();
  return setupForm(false);
}
async function setupForm(again){
  const boats=uniq([S.boatName,...(await allBoats()).filter(b=>!b.deleted&&b.name).map(b=>b.name),...(await liveTrips()).map(t=>tripBoat(t).name)]).filter(Boolean);
  const sks=S.skippers.slice(),hls=S.helms.slice();
  const opt=(list,sel,other)=>list.map(n=>`<option value="${esc(n)}" ${n===sel?'selected':''}>${esc(n)}</option>`).join('')+`<option value="__new">${other} …</option>`;
  const req='<b style="color:var(--stop)">*</b>';
  return new Promise(res=>{
    const d=document.createElement('dialog');d.id='setupDlg';
    d.innerHTML=`<form method="dialog" style="margin:0">
      <h2 style="margin:4px 0 6px">⚓ ${again?'Einrichtung':'Fast geschafft'}</h2>
      <p class="hint" style="margin-top:0">${boats.length||sks.length?'Wähle aus den vorhandenen Angaben oder lege neue an.':'Bitte einmal kurz einrichten.'} Alles lässt sich später in den Einstellungen ändern.</p>
      ${boats.length?`<label for="suBoatSel">Boot ${req}</label><select id="suBoatSel" class="fsel">${opt(boats,S.boatName||boats[0],'Weiteres Boot')}</select><p class="hint" id="suBoatInfo" style="margin:4px 0 0"></p>`:''}
      <div id="suNewBoat">
        <label for="suName">Bootsname ${req}</label><input type="text" id="suName" value="${boats.length?'':esc(S.boatName||'')}" placeholder="zum Beispiel Seestern" autocapitalize="words">
        <label for="suKind">Bootsart</label><select id="suKind" class="fsel"><option value="motor" ${S.boatKind!=='sail'?'selected':''}>Motorboot</option><option value="sail" ${S.boatKind==='sail'?'selected':''}>Segelboot</option></select>
        <label for="suType">Bootsmodell</label><input type="text" id="suType" value="${boats.length?'':esc(S.boatType||'')}" placeholder="zum Beispiel Bavaria S29">
      </div>
      <label for="${sks.length?'suSkSel':'suSk'}">Skipper ${req}</label>
      ${sks.length?`<select id="suSkSel" class="fsel">${opt(sks,sks[0],'Weiterer Skipper')}</select>`:''}
      <input type="text" id="suSk" placeholder="Vor- und Nachname" autocapitalize="words" autocomplete="name" ${sks.length?'style="display:none;margin-top:8px"':''}>
      <div class="check" style="margin:10px 0 4px"><input type="checkbox" id="suSame"><span>Der Skipper ist auch Steuermann</span></div>
      <div id="suHlBox"><label for="${hls.length?'suHlSel':'suHl'}">Steuermann ${req}</label>
        ${hls.length?`<select id="suHlSel" class="fsel">${opt(hls,hls[0],'Weiterer Steuermann')}</select>`:''}
        <input type="text" id="suHl" placeholder="Vor- und Nachname" autocapitalize="words" ${hls.length?'style="display:none;margin-top:8px"':''}></div>
      <p class="hint">${req} Pflichtangabe${S.odEnabled&&localStorage.getItem('bb_od_on')?' · OneDrive ist verbunden':''}</p>
      <div class="row" style="justify-content:flex-end">${again?'<button value="cancel" class="btn ghost">Abbrechen</button>':''}<button value="ok" class="btn" id="suOk">Los geht’s</button></div>
    </form>`;
    document.body.appendChild(d);
    if(!again)d.addEventListener('cancel',e=>e.preventDefault()); // Pflicht: nicht wegwischbar
    const bSel=$('#suBoatSel',d),skSel=$('#suSkSel',d),hlSel=$('#suHlSel',d);
    const isNewBoat=()=>!bSel||bSel.value==='__new';
    const showBoat=async()=>{
      $('#suNewBoat',d).style.display=isNewBoat()?'':'none';
      if(!isNewBoat()){const r=await boatInfo(bSel.value);
        $('#suBoatInfo',d).textContent=[kindLabel(r.kind),r.type,r.length?`Länge ${r.length} m`:'',r.mmsi?`MMSI ${r.mmsi}`:''].filter(Boolean).join(' · ')||'Noch keine weiteren Bootsdaten hinterlegt';}
      else if(bSel){$('#suBoatInfo',d).textContent='';$('#suName',d).focus();}
    };
    if(bSel)bSel.onchange=showBoat;showBoat();
    if(skSel)skSel.onchange=()=>{$('#suSk',d).style.display=skSel.value==='__new'?'':'none';if(skSel.value==='__new')$('#suSk',d).focus();};
    if(hlSel)hlSel.onchange=()=>{$('#suHl',d).style.display=hlSel.value==='__new'?'':'none';if(hlSel.value==='__new')$('#suHl',d).focus();};
    $('#suSame',d).onchange=e=>{$('#suHlBox',d).style.display=e.target.checked?'none':'';};
    const clean=v=>(v||'').trim().replace(/\s+/g,' ');
    const vals=()=>{
      const nm=isNewBoat()?clean($('#suName',d).value):bSel.value;
      const sk=skSel&&skSel.value!=='__new'?skSel.value:clean($('#suSk',d).value);
      const hl=$('#suSame',d).checked?sk:(hlSel&&hlSel.value!=='__new'?hlSel.value:clean($('#suHl',d).value));
      return {nm,sk,hl};};
    $('#suOk',d).onclick=e=>{const {nm,sk,hl}=vals();
      if(!nm||!sk||!hl){e.preventDefault();toast(!nm?'Bitte einen Bootsnamen eingeben':!sk?'Bitte den Skipper eingeben':'Bitte den Steuermann eingeben');}};
    d.addEventListener('close',async()=>{
      if(d.returnValue==='ok'){
        const {nm,sk,hl}=vals();
        if(isNewBoat()){
          const ty=clean($('#suType',d).value);
          S.boatName=nm;S.boatType=ty;S.boatKind=$('#suKind',d).value||'motor';
          const ex=await boatInfo(nm);
          if(ex.id&&!ty)applyBoatRec(ex);
          const ch={};if(ty)ch.type=ty;if(S.boatKind!=='motor')ch.kind=S.boatKind;
          if(Object.keys(ch).length)await boatPatch(nm,ch);await boatPatch(nm,{kind:S.boatKind},true);
        }else{
          S.boatName=nm;const r=await boatInfo(nm);
          if(r.id)applyBoatRec(r);else{S.boatType='';await boatPatch(nm,{kind:S.boatKind},true);}
        }
        S.setupDone=true;
        if(!S.skippers.includes(sk)){S.skippers.unshift(sk);await listChange('skippers',sk,false);}
        if(!S.helms.includes(hl)){S.helms.unshift(hl);await listChange('helms',hl,false);}
        S.skippers=uniq([sk,...S.skippers]);S.helms=uniq([hl,...S.helms]);saveS();
        if(!rec){P=freshPre();P.skipper=sk;P.helm=hl;P.auto=false;saveP();}
        F.boat=null;FU.boat=null;renderBoatHeader();
        toast('Eingerichtet – gute Fahrt!');
      }
      d.remove();res();route();
    },{once:true});
    d.showModal();
  });
}

/* ================= Start ================= */
window.addEventListener('online',()=>{updateStatus();enrichAll();syncSoon();});
window.addEventListener('offline',updateStatus);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(rec)keepAwake();updateStatus();enrichAll();if(!maybeRenew())syncNow(true,true);}});
setInterval(()=>{if(document.visibilityState==='visible')syncNow(true);},5*60*1000);

document.addEventListener('DOMContentLoaded',async()=>{
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))
    setupUpdates();
  await loadTok();
  await odHandleRedirect();
  const act=(await allTrips()).filter(t=>t.status==='active'&&!t.deleted).sort((a,b)=>b.start.t-a.start.t)[0];
  if(act){rec={trip:act,watch:null,wake:null,lastFix:null};beginWatch();keepAwake();toast('Laufende Fahrt wird fortgesetzt');}
  await initLists().catch(e=>console.warn(e));
  try{const bi=await boatInfo(S.boatName);if(bi.id)applyBoatRec(bi);else if(S.boatName)await boatPatch(S.boatName,{type:S.boatType,kind:S.boatKind},true);}catch(e){}
  if(!S.setupDone&&!needsSetup()){S.setupDone=true;saveS();}
  if(!S.setupDone||needsSetup()){route();await openSetup(false);}
  await refreshPre().catch(()=>{});
  route();
  enrichAll();
  if(!maybeRenew())syncNow(true,true);
});
