/* Offline cache for the app shell. Bump CACHE on every release. */
'use strict';

const CACHE = 'gym-v1.1.0';

const ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/util.js',
  'js/icons.js',
  'js/exercises.js',
  'js/store.js',
  'js/charts.js',
  'js/marathon.js',
  'js/view-today.js',
  'js/view-lift.js',
  'js/view-plan.js',
  'js/view-run.js',
  'js/view-progress.js',
  'js/app.js',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('index.html');
        throw new Error('offline');
      });
    })
  );
});
