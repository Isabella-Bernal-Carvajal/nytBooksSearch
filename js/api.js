/**
 * js/api.js — Capa de red
 * ========================
 * Contiene la función fetchNYT(), que es el único punto de contacto
 * entre la app y la NYT Books API.
 *
 * Toda petición pasa por aquí. Si la API cambia su URL base o
 * la forma de autenticarse, solo hay que editar este archivo.
 *
 * Depende de: js/config.js  (NYT_BASE, cache)
 *             js/apiKey.js  (obtenerApiKey, cambiarApiKey)
 */

/**
 * Realiza una petición GET a la NYT Books API.
 *
 * Flujo interno:
 *   1. Verifica que exista una API Key; si no, abre el modal.
 *   2. Construye la URL con el endpoint y los parámetros recibidos.
 *   3. Agrega api-key y language=es-ES a la query string.
 *   4. Revisa el caché: si ya se consultó esta URL recientemente,
 *      retorna el resultado guardado sin gastar una petición de red.
 *   5. Ejecuta fetch() y maneja los errores HTTP más comunes.
 *   6. Parsea el JSON y lo guarda en caché por 5 minutos.
 *
 * Errores manejados:
 *   401 → API Key inválida o expirada
 *   429 → Límite de peticiones superado (10/min en plan gratuito)
 *   404 → Categoría o recurso no encontrado
 *   otros → Error genérico del servidor
 *
 * @param {string} endpoint - Ruta relativa, ej: '/lists/current/hardcover-fiction.json'
 * @param {Object} params   - Parámetros adicionales de query string (opcional)
 * @returns {Promise<Object>} Datos JSON de la respuesta
 * @throws {Error} Si la petición falla o la API retorna un error HTTP
 */
async function fetchNYT(endpoint, params = {}) {

  // 1 — Verificar que hay API Key antes de hacer la petición
    const apiKey = obtenerApiKey();
    if (!apiKey) {
        cambiarApiKey(); // Abre el modal para que el usuario ingrese su clave
        throw new Error('Configura tu API Key para continuar.');
    }

  // 2 — Construir la URL completa
    const url = new URL(`${NYT_BASE}${endpoint}`);

    // 3 — Agregar autenticación y preferencia de idioma
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('language', 'es-ES'); // Pedido explícito en el documento del ejercicio
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

    const urlStr = url.toString();

    // 4 — Retornar desde caché si ya tenemos esta respuesta reciente
    if (cache[urlStr]) return cache[urlStr];

    // 5 — Ejecutar la petición
    const res = await fetch(urlStr);

    if (res.status === 401) throw new Error('API Key inválida. Verifica tu clave en developer.nytimes.com');
    if (res.status === 429) throw new Error('Límite de peticiones excedido (10/min). Espera unos segundos.');
    if (res.status === 404) throw new Error('Lista o recurso no encontrado en la API.');
    if (!res.ok)            throw new Error(`Error del servidor NYT (código ${res.status}).`);

    // 6 — Parsear y cachear
    const data = await res.json();
    guardarEnCache(urlStr, data);

    return data;
}

/**
 * Guarda una respuesta en el caché en memoria.
 * La entrada se elimina automáticamente después de 5 minutos
 * para garantizar que los datos no queden desactualizados.
 *
 * @param {string} key  - URL completa usada como identificador
 * @param {Object} data - Datos JSON a cachear
 */
function guardarEnCache(key, data) {
    cache[key] = data;
  setTimeout(() => delete cache[key], 5 * 60 * 1000);
}