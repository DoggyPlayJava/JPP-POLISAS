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

const isMsLang = typeof navigator !== 'undefined' && (navigator.language || '').toLowerCase().startsWith('ms');
const t = (_k: string, fbMs: string, fbEn: string): string => (isMsLang ? fbMs : fbEn);

clientsClaim();

// Dengarkan arahan SKIP_WAITING daripada komponen PwaUpdater (butang Muat Semula)
// Dengan registerType: 'prompt', ini wajib ada — tanpanya SW baru tidak akan activate
// walaupun updateServiceWorker(true) dipanggil dari PwaUpdater.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Install event: precache offline.html + skip waiting ────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting — new SW activates immediately after install
  self.skipWaiting();
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
});

// ── Precache all app assets (injected by Vite PWA plugin) ────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Cache strategies ──────────────────────────────────────────────────────────

// HTML pages — Network First with Offline Fallback
// Strategi: Network → Precache → offline.html
// Network-first ensures fresh JS chunks after deploy (no stale shell problem)
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
  async ({ request }) => {
    // Cuba 1: Fetch dari network (fresh index.html dengan JS hash terkini)
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok && networkResponse.status < 400) {
        return networkResponse;
      }
    } catch (_e) { /* Network gagal — fallback ke cache */ }

    // Cuba 2: Hidangkan index.html dari precache (stale tapi lebih baik dari offline)
    try {
      const precachedResponse = await matchPrecache('index.html');
      if (precachedResponse) return precachedResponse;
    } catch (_e) { /* Precache miss — teruskan */ }

    // Cuba 3: Hidangkan halaman offline.html yang berjenama
    try {
      const offlineCache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await offlineCache.match(OFFLINE_URL);
      if (offlineResponse) return offlineResponse;
    } catch (_e) { /* Cache miss — teruskan */ }

    // Pertahanan terakhir: halaman HTML minimum
    const offlineTitle = t('sw:offline_title', 'Tiada Sambungan', 'Offline / No Connection');
    return new Response(
      '<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui"><h1>' + offlineTitle + '</h1></body></html>',
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

// On-demand runtime caching for lazy JS/CSS chunks
registerRoute(
  ({ request, url }) => (request.destination === 'script' || request.destination === 'style') && url.pathname.includes('/assets/'),
  new StaleWhileRevalidate({
    cacheName: 'lazy-assets-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 14 * 24 * 60 * 60 })],
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

  const title = payload.title ?? t('sw:system_notification', 'Notifikasi Sistem', 'System Notification');
  const targetUrl = payload.data?.url ?? payload.data?.link ?? '/portal';

  const options: NotificationOptions = {
    body: payload.body ?? t('sw:new_notification', 'Anda mempunyai satu notifikasi baru.', 'You have a new notification.'),
    icon: payload.icon ?? '/jpp-app-icon.png',
    // Android memerlukan icon monokrom lutsinar untuk badge, kita guna jpp-logo sementara belum ada khas
    badge: payload.badge ?? '/jpp-app-icon.png',
    // @ts-ignore
    image: payload.image, // Gambar banner besar
    vibrate: [200, 100, 200, 100, 200], // Premium vibration pattern
    data: { ...payload.data, url: targetUrl, link: targetUrl },
    requireInteraction: true, // Biar user dismiss sendiri
    actions: payload.actions, // Butang aksi di bawah
    tag: payload.tag ?? 'jpp-notification', // Kumpulan notifikasi supaya tak spam
    renotify: payload.renotify ?? true, // Bunyi semula jika tag sama
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler (preserves full path + query string e.g. ?post=...&comment=...) ──
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  // Jika user tekan butang "Tutup" (contoh id: 'close-action')
  if (event.action === 'close-action') {
    return;
  }

  // Jika ada action khusus URL (contoh id: 'open-action')
  let rawTarget = event.notification?.data?.url ?? event.notification?.data?.link ?? '/portal';

  // Custom logic jika action perlukan laluan (route) berbeza
  if (event.action && event.notification?.data?.[event.action]) {
    rawTarget = event.notification.data[event.action];
  }

  let resolvedUrl = `${self.location.origin}/portal`;
  try {
    const parsed = new URL(String(rawTarget), self.location.origin);
    // Keep same-origin deep links safe; preserve pathname + search + hash verbatim
    resolvedUrl = parsed.origin === self.location.origin
      ? `${self.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.href;
  } catch {
    resolvedUrl = `${self.location.origin}/portal`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // Prefer an existing app window on the same origin, focus it and navigate with full query params
      for (const client of clientList) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await (client as WindowClient).navigate(resolvedUrl);
              return;
            } catch {
              // Fall through to openWindow if navigate is restricted
            }
          }
          return;
        }
      }
      // Otherwise open new window preserving full deep-link URL
      return self.clients.openWindow(resolvedUrl);
    })
  );
});
