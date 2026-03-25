/**
 * js/apiKey.js — Gestión de la API Key
 * ======================================
 * Centraliza todo lo relacionado con la API Key.
 * Se ha eliminado la UI de cambio, por lo que depende directamente de config.js
 *
 * Depende de: js/config.js  (DEFAULT_API_KEY)
 */

/**
 * Retorna la API Key activa.
 * Solamente devuelve la clave de config.js (DEFAULT_API_KEY).
 *
 * @returns {string|null}
 */
function obtenerApiKey() {
    return DEFAULT_API_KEY || null;
}