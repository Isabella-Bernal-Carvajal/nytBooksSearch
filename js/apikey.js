/**
 * js/apiKey.js — Gestión de la API Key
 * ======================================
 * Centraliza todo lo relacionado con la API Key.
 * Se ha eliminado la UI de cambio, por lo que depende directamente de config.js
 *
 * Depende de: js/config.js  (DEFAULT_API_KEY)
 */

/**
 * Retorna la API Key activa en este orden de prioridad:
 *   1. Clave guardada en localStorage (por compatibilidad si ya la tenían)
 *   2. Clave de config.js (variable DEFAULT_API_KEY)
 *
 * @returns {string|null}
 */
function obtenerApiKey() {
    return localStorage.getItem('nyt_api_key') || DEFAULT_API_KEY || null;
}