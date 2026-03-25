const CACHE_NAME = "nyt-books-v2";

const urlsToCache = [
    "./",
    "./index.html",
    "./style.css",
    "./js/main.js",
    "./js/config.js",
    "./js/apikey.js",
    "./js/api.js",
    "./js/ui.js"
];

// Instalar SW
self.addEventListener("install", event => {
    // Forzar activación inmediata saltando la espera
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return Promise.all(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err));
                })
            );
        })
    );
});

// Activar SW y borrar caché vieja
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    // Tomar control de clientes inmediatamente
    self.clients.claim();
});

// Interceptar requests (Network-First)
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
        .then(response => {
            // Clona la respuesta y actualiza la caché
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, resClone);
            });
            return response;
        })
        .catch(() => {
            // Si no hay red, busca en la caché (versión vieja)
            return caches.match(event.request);
        })
    );
});