const CACHE_NAME = 'forensics-toolkit-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './js/image-analysis.js',
    './js/histogram.js',
    './js/hash.js',
    './js/exif.js',
    './js/ela.js',
    './js/comparison.js',
    './js/measurement.js',
    './js/video.js',
    './js/ocr.js',
    './js/timeline.js',
    './js/indexeddb.js',
    './js/report.js',
    './workers/image-worker.js',
    './workers/hash-worker.js',
    './workers/ocr-worker.js',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png',
    'https://cdn.jsdelivr.net/npm/exifr/dist/full.umd.js',
    'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.status === 200 && (event.request.url.startsWith('https://cdn.jsdelivr.net') || event.request.url.startsWith(self.location.origin))) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});