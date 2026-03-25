/**
 * js/api.js
 */

async function fetchNYT(endpoint, params = {}) {

    const apiKey = obtenerApiKey();

    // 🔥 CLAVE
    if (!apiKey) {
        cambiarApiKey();
        return null;
    }

    const url = new URL(`${NYT_BASE}${endpoint}`);

    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('language', 'es-ES');

    Object.entries(params).forEach(([k, v]) => {
        url.searchParams.append(k, v);
    });

    const urlStr = url.toString();

    if (cache[urlStr]) return cache[urlStr];

    try {
        const res = await fetch(urlStr);

        if (res.status === 401) {
            cambiarApiKey();
            return null;
        }

        if (res.status === 429) {
            console.error("Límite excedido");
            return null;
        }

        if (!res.ok) {
            console.error("Error:", res.status);
            return null;
        }

        const data = await res.json();

        guardarEnCache(urlStr, data);

        return data;

    } catch (error) {
        console.error("Error fetch:", error);
        return null;
    }
}

function guardarEnCache(key, data) {
    cache[key] = data;
    setTimeout(() => delete cache[key], 5 * 60 * 1000);
}