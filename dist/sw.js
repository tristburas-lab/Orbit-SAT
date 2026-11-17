const CACHE='orbit-static-v1-4e49d00a436a';
const ASSETS=['/','/index.html','/styles.css','/enhancements.css','/app.js','/irt.js','/plan.js','/profiles.js','/analytics.js','/features.js','/exam-tools.js','/bank-stats.js','/archived-questions.js','/tutor-bank.js','/qr-code.svg','/plan/index.html','/tutor/index.html','/guide/index.html','/go/index.html','/questions.js','/learning.js','/tutor-engine.js','/tutor-worker.js','/manifest.json','/favicon.svg','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png','/icons/apple-touch-icon.png','/fonts/dm-sans-latin.woff2','/fonts/manrope-latin.woff2','/stats.json','/README_FOR_MIT.md'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('orbit-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Do not cache platform sign-in, sign-out, callback, or other non-app pages.
 const route=['/','/plan','/plan/','/tutor','/tutor/','/guide','/guide/','/go','/go/'].includes(url.pathname);
 if(!ASSETS.includes(url.pathname)&&!route)return;
 if(event.request.mode==='navigate'){
   event.respondWith(fetch(event.request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/index.html',copy)));}return response;}).catch(()=>caches.match('/index.html')));
 }else event.respondWith(caches.match(url.pathname).then(cached=>cached??fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(url.pathname,copy)));}return response;})));
});
