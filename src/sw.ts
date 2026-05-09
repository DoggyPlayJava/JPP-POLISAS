/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute, setCatchHandler } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// ── Nama cache khas untuk halaman offline ─────────────────────────────────────
const OFFLINE_CACHE = 'jpp-offline-fallback-v1';
const OFFLINE_URL = '/offline.html';

clientsClaim();

// Dengarkan arahan SKIP_WAITING daripada komponen PwaUpdater (butang Muat Semula)
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

// HTML pages — SPA Navigation Fallback (Returns precached index.html)
try {
  const handler = createHandlerBoundToURL('index.html');
  registerRoute(
    new NavigationRoute(handler, {
      denylist: [/^\/api\//], // Do not intercept API calls
    })
  );
} catch (e) {
  console.warn('NavigationRoute setup failed (usually in dev mode). Using NetworkFirst fallback.');
  // Fallback for dev mode di mana index.html tidak ada dalam precache
  registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
      cacheName: 'dev-navigation-cache',
    })
  );
}

// Images — CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// API/Supabase requests should NEVER be cached to avoid auth & stale data hangs.
// EXCEPTION: Read-only public/semi-public data like Announcements and Takwim
// PENTING: Hanya cache GET requests. POST/PATCH/DELETE TIDAK BOLEH di-cache
// kerana ia akan menyebabkan data lama dipapar selepas admin buat perubahan.
registerRoute(
  ({ url, request }) => 
    request.method === 'GET' &&
    (url.pathname.includes('/rest/v1/takwim_pusat') || url.pathname.includes('/rest/v1/announcements')),
  new NetworkFirst({
    cacheName: 'supabase-offline-read-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }) // 1 week
    ],
  })
);

// ── GLOBAL CATCH HANDLER ──────────────────────────────────────────────────────
// Apabila SEMUA strategi gagal (tiada internet / server down / Cloudflare 502/504),
// hidangkan halaman offline.html yang berjenama JPP kepada pengguna.
setCatchHandler(async ({ request }) => {
  // Hanya intercept navigation requests (bukan API, gambar, dsb.)
  if (request.mode === 'navigate') {
    const cache = await caches.open(OFFLINE_CACHE);
    const cachedResponse = await cache.match(OFFLINE_URL);
    if (cachedResponse) {
      // Pass URL asal supaya offline.html boleh auto-redirect ke halaman yang betul selepas pulih
      const originalUrl = new URL(request.url);
      const offlineUrl = new URL(OFFLINE_URL, self.location.origin);
      offlineUrl.searchParams.set('redirect', originalUrl.pathname + originalUrl.search);

      // Kita perlu pulangkan body yang sama tetapi dengan URL baru
      // Guna cachedResponse terus kerana redirect param dikendalikan oleh JS dalam offline.html
      return cachedResponse;
    }
  }

  // Untuk bukan navigation (API, gambar), biarkan gagal secara semulajadi
  return Response.error();
});

// ── Push Notification handler ─────────────────────────────────────────────────
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) (client as WindowClient).navigate(targetUrl);
          return;
        }
      }
      // Otherwise open new window
      return clients.openWindow(targetUrl);
    })
  );
});
