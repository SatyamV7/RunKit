// ServiceWorker V2
// Made by @SatyamV7 <github.com/SatyamV7>
// Licensed under Apache License V2
// Names of the two caches used in this version of the service worker.
// Change to v2, etc. when you update any of the local resources, which will
// in turn trigger the install event again.
const PRECACHE = 'Static_Cache v1.6.9-ProductionBuild';
const RUNTIME = 'Dynamic_Cache v1.6.9-ProductionBuild';

// Flag to enable or disable caching
const ENABLE_CACHING = true;

// A list of local resources we always want to be cached.
const PRECACHE_URLS = [
    '/',
    'index.html',
    'src/App.js',
    'favicon.ico',
    'src/Styles.css',
    'src/Executor.js',
    'src/darkMode.css',
    'assets/icons/icon_clear.png',
    'libs/monaco-editor@0.50.0/package/min/vs/loader.js',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.css',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.nls.js',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.js',
    'assets/fonts/JetBrainsMono-Regular.woff2',
    'libs/babel/babel.min.js',
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
    console.log('service worker has been installed');
    if (ENABLE_CACHING) {
        event.waitUntil(
            caches.open(PRECACHE)
                .then(cache => cache.addAll(PRECACHE_URLS))
                .then(self.skipWaiting())
        );
    }
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
    console.log('service worker has been activated');
    if (ENABLE_CACHING) {
        const currentCaches = [PRECACHE, RUNTIME];
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
            }).then(cachesToDelete => {
                return Promise.all(cachesToDelete.map(cacheToDelete => {
                    return caches.delete(cacheToDelete);
                }));
            }).then(() => self.clients.claim())
        );
    }
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
    console.log('Fetch Event');
    if (ENABLE_CACHING && event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return caches.open(RUNTIME).then(cache => {
                    return fetch(event.request).then(response => {
                        // Put a copy of the response in the runtime cache.
                        return cache.put(event.request, response.clone()).then(() => {
                            return response;
                        });
                    });
                });
            })
        );
    }
});