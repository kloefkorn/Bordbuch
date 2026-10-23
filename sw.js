// Bordbuch Service Worker – macht die App offline-fähig.
// Die Cache-Version bei jeder neuen App-Version anpassen (wie APP_VERSION in app.js).
const SHELL='bordbuch-shell-v7.2', TILES='bordbuch-tiles-v2';
const TILE_MAX=1500;      // höchstens so viele Kartenkacheln speichern (ca. 20–40 MB)
const TILE_MAX_AGE=90*864e5; // ältere Kacheln werden verworfen und neu geladen
const LOCAL=['./','./index.html','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png',
  './leaflet/leaflet.js','./leaflet/leaflet.css','./leaflet/images/layers.png','./leaflet/images/layers-2x.png',
  './leaflet/images/marker-icon.png','./leaflet/images/marker-icon-2x.png','./leaflet/images/marker-shadow.png'];

self.addEventListener('install',e=>{
  // Alle Dateien müssen vollständig geladen werden – sonst schlägt die Installation fehl und
  // die bisherige, funktionierende Version bleibt aktiv (nächster Versuch beim nächsten Öffnen).
  e.waitUntil(caches.open(SHELL).then(async c=>{
    const res=await Promise.all(LOCAL.map(async u=>{const r=await fetch(new Request(u,{cache:'reload'}));if(!r.ok)throw new Error(u+' '+r.status);return [u,r];}));
    await Promise.all(res.map(([u,r])=>c.put(u,r)));
  }).then(()=>self.skipWaiting(),async err=>{await caches.delete(SHELL);throw err;}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>![SHELL,TILES].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);

// Kartenspeicher klein halten: älteste Einträge zuerst entfernen
let trimming=null;
function trimTiles(){
  if(trimming)return trimming;
  trimming=(async()=>{const c=await caches.open(TILES);const keys=await c.keys();
    for(let i=0;i<keys.length-TILE_MAX;i++)await c.delete(keys[i]);})().finally(()=>{trimming=null;});
  return trimming;
}
let puts=0;
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // Kartenkacheln: aus dem Speicher (bis 90 Tage alt), sonst laden und begrenzt merken
  if(/^(tile\.openstreetmap\.org|tiles\.openseamap\.org)$/.test(url.hostname)){
    e.respondWith(caches.open(TILES).then(async c=>{
      const hit=await c.match(req);
      const age=hit?Date.now()-(+hit.headers.get('x-bb-cached')||0):Infinity;
      if(hit&&age<TILE_MAX_AGE)return hit;
      try{
        const r=await fetch(req);
        if(r.ok){ // nur vollständige (nicht „opaque“) Antworten speichern
          const b=await r.clone().blob();const h=new Headers(r.headers);h.set('x-bb-cached',String(Date.now()));
          await c.put(req,new Response(b,{status:200,headers:h}));
          if(++puts%50===0)e.waitUntil(trimTiles());
        }
        return r;
      }catch(_){return hit||new Response('',{status:504});}
    }));
    return;
  }
  // Eigene App-Dateien: zuerst aus dem Netz (immer die neueste Version), offline aus dem Speicher
  if(url.origin===location.origin){
    e.respondWith(caches.open(SHELL).then(async c=>{
      const key=req.mode==='navigate'?'./index.html':req;
      try{
        const r=await timeout(fetch(req,{cache:'no-cache'}),4000);
        if(r.ok)c.put(key,r.clone());
        return r;
      }catch(_){
        return (await c.match(key,{ignoreSearch:true}))||(req.mode==='navigate'?await c.match('./index.html'):null)||Response.error();
      }
    }));
  }
  // Wetter, Ortssuche, OneDrive: immer direkt ins Netz
});
// Beim Start einmal aufräumen (z. B. nach vielen Kartenansichten)
self.addEventListener('activate',e=>e.waitUntil(trimTiles()));
