/* ════════════════════════════════════════════════
   VinciDesk — CDV IT Helpdesk Service Worker v1.0
   ════════════════════════════════════════════════ */
const CACHE_NAME = 'vincidesk-cdv-v1.0';
const PRECACHE = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/ui.js', '/manifest.json'];

/* ── Install ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

/* ── Activate ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.hostname)) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

/* ── Push ── */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'VinciDesk', {
      body: data.body || '',
      tag: data.tag || 'vinci-' + Date.now(),
      icon: '/icon.svg',
      badge: '/icon.svg',
      renotify: true,
      requireInteraction: false
    })
  );
});

/* ── Notification click ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      return existing ? existing.focus() : clients.openWindow('/');
    })
  );
});

/* ── Wiadomości z głównego wątku ── */
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  const { title, body, tag } = event.data;
  self.registration.showNotification(title || 'VinciDesk', {
    body: (body || '').substring(0, 200),
    tag: tag || 'vinci-' + Date.now(),
    icon: '/icon.svg',
    renotify: true
  });
});
