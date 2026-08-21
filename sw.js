/* eslint-disable no-restricted-globals */
// PWA Service Worker - runtime caching with Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

const { registerRoute } = workbox.routing;
const { NetworkFirst, StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { ExpirationPlugin } = workbox.expiration;

const isSameOrigin = ({ url }) => url.origin === self.location.origin;

// Drop legacy caches that may have stored empty/third-party script responses
// (e.g. accounts.google.com/gsi/client), which breaks Google Sign-In.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) =>
            ['static-resources', 'app-shell', 'assets'].includes(key)
          )
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Cache the app shell (navigation / document) — same-origin only
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && isSameOrigin({ url }),
  new NetworkFirst({
    cacheName: 'app-shell-v2',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// Cache same-origin JS and CSS only — never third-party (Google GIS, etc.)
registerRoute(
  ({ request, url }) =>
    isSameOrigin({ url }) &&
    (request.destination === 'script' || request.destination === 'style'),
  new StaleWhileRevalidate({
    cacheName: 'static-resources-v2',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Cache same-origin images and fonts
registerRoute(
  ({ request, url }) =>
    isSameOrigin({ url }) &&
    (request.destination === 'image' || request.destination === 'font'),
  new CacheFirst({
    cacheName: 'assets-v2',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);
