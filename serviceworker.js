// ServiceWorker V2
// Made by @SatyamV7 <github.com/SatyamV7>
// Licensed under Apache License V2

// ServiceWorker configuration
const VERSION = 'v1.8.7-ProductionBuild';
const CACHING = true; // Enable/Disable caching

// Cache names
const PRECACHE = `Static_Cache ${VERSION}`;
const RUNTIME = `Dynamic_Cache ${VERSION}`;

// URLs to cache
const PRECACHE_URLS = [
    '/',
    'index.html',
    'favicon.ico',
    'src/Styles.css',
    'src/App.min.js',
    'src/darkMode.css',
    'src/Executor.min.js',
    'assets/icons/icon_clear.png',
    'libs/monaco-editor@0.50.0/package/min/vs/loader.js',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.css',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.nls.js',
    'libs/monaco-editor@0.50.0/package/min/vs/editor/editor.main.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'assets/fonts/JetBrainsMono-Regular.woff2',
];

// Install handler
self.addEventListener('install', event => {
    if (CACHING) {
        event.waitUntil(
            caches.open(PRECACHE).then(async cache => {
                try {
                    return await cache.addAll(PRECACHE_URLS);
                } catch (error) {
                    console.error('Failed to pre-cache resources:', error);
                }
            }).then(() => self.skipWaiting())
        );
    }
});

// Activate handler
self.addEventListener('activate', event => {
    if (CACHING) {
        const currentCaches = [PRECACHE, RUNTIME];
        event.waitUntil(
            (async () => {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.filter(cacheName => !currentCaches.includes(cacheName))
                        .map(cacheToDelete => caches.delete(cacheToDelete))
                );
                self.clients.claim();
            })()
        );
    }
});

// Task queue to store URLs that need to be fetched and updated
const fetchQueue = new Set();

// Fetch handler
self.addEventListener('fetch', event => {
    // Background task queue processor
    async function processFetchQueue() {
        // Process URLs in the task queue sequentially
        while (fetchQueue.size > 0) {
            const iterator = fetchQueue.values();
            const url = iterator.next().value; // Get the first URL in the queue
            fetchQueue.delete(url); // Remove the URL from the queue

            try {
                const response = await fetch(url);
                if (url.startsWith(self.location.origin) || url.startsWith('https')) {
                    const cache = await caches.open(RUNTIME);
                    await cache.put(url, response.clone());
                }
            } catch (error) {
                console.error(`Failed to fetch and update cache for ${url}:`, error);
            }
        }
    }

    if (CACHING) {
        event.respondWith(
            (async () => {
                // Attempt to fetch the cached response first
                const cachedResponse = await caches.match(event.request);

                if (cachedResponse) {
                    // Add the URL to the fetch task queue for background updates
                    fetchQueue.add(event.request.url);

                    // Trigger background processing of the fetch queue
                    processFetchQueue();

                    // Return the cached response immediately
                    return cachedResponse;
                }

                try {
                    // If no cached response, fetch from the network and cache it
                    const response = await fetch(event.request);
                    if (event.request.url.startsWith(self.location.origin)) {
                        const cache = await caches.open(RUNTIME);
                        await cache.put(event.request, response.clone());
                    }
                    return response;
                } catch (error) {
                    console.error(`Failed to fetch ${event.request.url}:`, error);
                    return caches.match(event.request) || new Response('Network error occurred', { status: 408 });
                }
            })()
        );
    }
});