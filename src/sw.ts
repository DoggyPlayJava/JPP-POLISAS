/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// ── Nama cache khas untuk halaman offline ─────────────────────────────────────
const OFFLINE_CACHE = 'jpp-offline-fallback-v1';
const OFFLINE_URL = '/offline.html';

clientsClaim();

// Dengarkan arahan SKIP_WAITING daripada komponen PwaUpdater (butang Muat Semula)
// Dengan registerType: 'prompt', ini wajib ada — tanpanya SW baru tidak akan activate
// walaupun updateServiceWorker(true) dipanggil dari PwaUpdater.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Precache offline fallback FIRST (install event) ──────────────────────────
// Ini memastikan offline.html sentiasa tersedia walaupun server/tunnel mati sepenuhnya
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
});

// ── Precache all app assets (injected by Vite PWA plugin) ────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Cache strategies ──────────────────────────────────────────────────────────

// HTML pages — Robust SPA Navigation Handler with Offline Fallback
// Strategi: Precache → Network → offline.html
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
  async ({ request }) => {
    // Cuba 1: Hidangkan index.html dari precache (paling cepat)
    try {
      const precachedResponse = await matchPrecache('index.html');
      if (precachedResponse) return precachedResponse;
    } catch (_e) { /* Precache miss — teruskan */ }

    // Cuba 2: Fetch dari network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) return networkResponse;
    } catch (_e) { /* Network gagal — teruskan */ }

    // Cuba 3: Hidangkan halaman offline.html yang berjenama
    try {
      const offlineCache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await offlineCache.match(OFFLINE_URL);
      if (offlineResponse) return offlineResponse;
    } catch (_e) { /* Cache miss — teruskan */ }

    // Pertahanan terakhir: halaman HTML minimum
    return new Response(
      '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui"><h1>Tiada Sambungan</h1></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
);

// Images — CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// API/Supabase — Hanya cache GET requests untuk Takwim & Announcements
// POST/PATCH/DELETE TIDAK BOLEH di-cache
registerRoute(
  ({ url, request }) => 
    request.method === 'GET' &&
    (url.pathname.includes('/rest/v1/takwim_pusat') || url.pathname.includes('/rest/v1/announcements')),
  new NetworkFirst({
    cacheName: 'supabase-offline-read-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 })
    ],
  })
);

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: any = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: event.data.text() };
  }

  const title = payload.title ?? 'Notifikasi Sistem';
  const targetUrl = payload.data?.url ?? '/portal';
  
  const options: NotificationOptions = {
    body: payload.body ?? 'Anda mempunyai satu notifikasi baru.',
    icon: payload.icon ?? '/jpp-app-icon.png',
    // Android memerlukan icon monokrom lutsinar untuk badge, kita guna jpp-logo sementara belum ada khas
    badge: payload.badge ?? '/jpp-app-icon.png',
    // @ts-ignore
    image: payload.image, // Gambar banner besar
    vibrate: [200, 100, 200, 100, 200], // Premium vibration pattern
    data: { url: targetUrl, ...payload.data },
    requireInteraction: true, // Biar user dismiss sendiri
    actions: payload.actions, // Butang aksi di bawah
    tag: payload.tag ?? 'jpp-notification', // Kumpulan notifikasi supaya tak spam
    renotify: payload.renotify ?? true, // Bunyi semula jika tag sama
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  // Jika user tekan butang "Tutup" (contoh id: 'close-action')
  if (event.action === 'close-action') {
    return;
  }

  // Jika ada action khusus URL (contoh id: 'open-action')
  let targetUrl = event.notification?.data?.url ?? '/portal';
  
  // Custom logic jika action perlukan laluan (route) berbeza
  if (event.action && event.notification?.data?.[event.action]) {
    targetUrl = event.notification.data[event.action];
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(targetUrl);
    })
  );
});
