// Life RPG Service Worker – Production v3.0
const CACHE_NAME = 'life-rpg-v3';
const RUNTIME_CACHE = 'life-rpg-runtime-v3';
const PRECACHE_ASSETS = [
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => {
            if (![CACHE_NAME, RUNTIME_CACHE].includes(k)) return caches.delete(k);
        }))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    if (request.destination === 'document') {
        event.respondWith(networkFirstStrategy(request));
    } else if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2|json)$/.test(url.pathname)) {
        event.respondWith(cacheFirstStrategy(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

async function networkFirstStrategy(req) {
    try {
        const response = await fetch(req);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, response.clone());
        }
        return response;
    } catch (err) {
        return caches.match(req);
    }
}

async function cacheFirstStrategy(req) {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
        const response = await fetch(req);
        if (response && response.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, response.clone());
        }
        return response;
    } catch (err) {
        return new Response('Offline asset', { status: 503 });
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
    }).catch(() => null);
    return cached || fetchPromise;
}

self.addEventListener('message', (event) => {
    if (event.data?.type === 'CLEAR_CACHES') {
        event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
    }
});