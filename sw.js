/* PV-CRM Service Worker – cached nur die App-Hülle (keine Kundendaten; die liegen in IndexedDB). */
const CACHE = 'pv-crm-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Netzwerk zuerst (aktuelle Version), bei Offline aus dem Cache. */
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
/* Tipp auf eine Benachrichtigung: App fokussieren und zur Kundenakte/Aufgabe springen. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '#/followups';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ url }); return c.focus(); } }
    return self.clients.openWindow('./index.html' + url);
  }));
});
/* Web Push: nur nutzbar, wenn ein Server Push-Nachrichten sendet (in dieser Version nicht eingerichtet). */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'PV-CRM', { body: d.body || '', tag: d.tag, data: { url: d.url || '#/followups' }, icon: 'icon-192.png' }));
});
