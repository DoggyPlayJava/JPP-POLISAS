/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();

// ── Precache all app assets (injected by Vite PWA plugin) ────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// ── Cache strategies ──────────────────────────────────────────────────────────

// HTML pages — NetworkFirst so updates come through
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({ cacheName: 'pages-cache', networkTimeoutSeconds: 3 })
);

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

  let data: { title?: string; body?: string; url?: string; icon?: string } = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: event.data.text() };
  }

  const title = data.title ?? 'Notifikasi JPP';
  const options: NotificationOptions = {
    body: data.body ?? 'Anda mempunyai satu notifikasi baru.',
    icon: data.icon ?? '/jpp-logo.png',
    badge: '/jpp-logo.png',
    vibrate: [200, 100, 200],
    data: { url: data.url ?? '/portal' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url ?? '/portal';

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
