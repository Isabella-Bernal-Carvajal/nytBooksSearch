const CACHE_NAME = "nyt-books-v1";

const urlsToCache = [
    "./",
    "./index.html",
    "./styles.css",
    "./script.js"
];

// Instalar SW
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => cache.addAll(urlsToCache))
    );
});

// Interceptar requests
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
});