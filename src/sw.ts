/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// Dengarkan arahan SKIP_WAITING daripada komponen PwaUpdater (butang Muat Semula)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Precache all app assets (injected by Vite PWA plugin) ────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Cache strategies ──────────────────────────────────────────────────────────

// HTML pages — SPA Navigation Fallback (Returns precached index.html)
try {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL('index.html'), {
      denylist: [/^\/api\//], // Do not intercept API calls
    })
  );
} catch (e) {
  console.warn('NavigationRoute setup failed:', e);
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
