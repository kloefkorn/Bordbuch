// Bordbuch Service Worker – macht die App offline-fähig
const SHELL='bordbuch-shell-v1', TILES='bordbuch-tiles-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.allSettled(ASSETS.map(a=>c.add(a)))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>![SHELL,TILES].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  // Kartenkacheln: aus dem Cache, sonst laden und merken (zuletzt angesehene Karten offline verfügbar)
  if(/tile\.openstreetmap\.org|tiles\.openseamap\.org/.test(url.hostname)){
    e.respondWith(caches.open(TILES).then(async c=>{const hit=await c.match(req); if(hit) return hit;
      try{const r=await fetch(req); if(r.ok||r.type==='opaque') c.put(req,r.clone()); return r;}catch(_){return new Response('',{status:504});}}));
    return;
  }
  // App-Dateien & Leaflet: Cache zuerst, im Hintergrund aktualisieren
  if(url.origin===location.origin||url.hostname==='unpkg.com'){
    e.respondWith(caches.open(SHELL).then(async c=>{
      const key=req.mode==='navigate'?'./index.html':req;
      const hit=await c.match(key,{ignoreSearch:req.mode==='navigate'});
      const net=fetch(req).then(r=>{if(r.ok)c.put(key,r.clone());return r;}).catch(()=>hit);
      return hit||net;
    }));
  }
  // Wetter, Ortssuche, OneDrive: immer direkt ins Netz
});
