const CACHE='shared-hiking-v6-coverfirst';
const CORE=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './seed.json',
  './manifest.webmanifest',
  './assets/top-banner.webp',
  './assets/bottom-banner.webp',
  './assets/top-banner.jpg',
  './assets/bottom-banner.jpg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', event=>{
  if(event.request.method!=='GET') return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached=>{
      // Cache-first for instant repeat loads.
      // Refresh the cached copy quietly in the background.
      const refresh=fetch(event.request)
        .then(response=>{
          if(response && response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(()=>null);

      if(cached){
        event.waitUntil(refresh);
        return cached;
      }

      return refresh.then(response=>{
        if(response) return response;
        // Navigation fallback if both network and exact cache miss fail.
        if(event.request.mode==='navigate') return caches.match('./index.html');
        return new Response('',{status:504,statusText:'Offline'});
      });
    })
  );
});
