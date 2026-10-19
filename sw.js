// Bordbuch Service Worker – macht die App offline-fähig.
// Die Cache-Version bei jeder neuen App-Version anpassen (wie APP_VERSION in index.html).
const SHELL='bordbuch-shell-v4.1', TILES='bordbuch-tiles-v1';
const LOCAL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const CDN=['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];

self.addEventListener('install',e=>{
  // cache:'reload' umgeht den Browser-Zwischenspeicher, damit garantiert die neue Version gespeichert wird
  e.waitUntil(caches.open(SHELL).then(c=>Promise.allSettled([
    ...LOCAL.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>{if(r.ok)return c.put(u,r);})),
    ...CDN.map(u=>c.add(u))
  ])).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>![SHELL,TILES].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);

self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // Kartenkacheln: aus dem Cache, sonst laden und merken (zuletzt angesehene Karten offline verfügbar)
  if(/tile\.openstreetmap\.org|tiles\.openseamap\.org/.test(url.hostname)){
    e.respondWith(caches.open(TILES).then(async c=>{const hit=await c.match(req); if(hit) return hit;
      try{const r=await fetch(req); if(r.ok||r.type==='opaque') c.put(req,r.clone()); return r;}catch(_){return new Response('',{status:504});}}));
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
        return (await c.match(key,{ignoreSearch:true}))||(await c.match('./index.html'))||Response.error();
      }
    }));
    return;
  }
  // Kartenbibliothek (ändert sich nie): Speicher zuerst
  if(url.hostname==='unpkg.com'){
    e.respondWith(caches.open(SHELL).then(async c=>(await c.match(req))||fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r;})));
  }
  // Wetter, Ortssuche, OneDrive: immer direkt ins Netz
});
