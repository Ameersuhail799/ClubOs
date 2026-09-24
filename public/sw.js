// ClubOS Service Worker — PWA Foundation
// Build 01: Lifecycle integration point
// Notice: In adherence to ClubOS Security Rules, this service worker strictly does NOT cache
// authenticated application state, protected workspace routes, or operational API data offline.

const CACHE_NAME = 'clubos-shell-v1';

self.addEventListener('install', (event) => {
  // Activate worker immediately upon installation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim active clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Build 01 passes all network requests through directly.
  // No offline business logic is implemented in this build.
  return;
});
