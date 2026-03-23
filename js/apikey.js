/**
 * js/apiKey.js — Gestión de la API Key
 * ======================================
 * Centraliza todo lo relacionado con la API Key:
 * leer, guardar, cambiar y validar.
 *
 * Si en el futuro cambia la forma de almacenar la clave
 * (ej: sessionStorage, cookie, input diferente),
 * solo hay que modificar este archivo.
 *
 * Depende de: js/config.js  (DEFAULT_API_KEY)
 *             js/ui.js      (mostrarToast)
 */

/**
 * Retorna la API Key activa en este orden de prioridad:
 *   1. Clave guardada por el usuario en localStorage
 *   2. Clave de config.js (variable NYT_API_KEY del entorno local)
 *   3. null → la app abrirá el modal para pedirla
 *
 * @returns {string|null}
 */
function obtenerApiKey() {
    return localStorage.getItem('nyt_api_key') || DEFAULT_API_KEY || null;
}

/**
 * Lee la API Key del input del modal y la guarda en localStorage.
 * Valida que el campo no esté vacío antes de guardar.
 * Si la clave es válida, cierra el modal y recarga los Best Sellers.
 */
function guardarApiKey() {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) {
        mostrarToast('Ingresa una API Key válida.', 'error');
        return;
    }
    localStorage.setItem('nyt_api_key', key);
    document.getElementById('apiModal').classList.add('hidden');
    mostrarToast('API Key guardada ✓', 'success');
  librosCategoria(); // Recargar contenido con la nueva clave
}

/**
 * Abre el modal de API Key para que el usuario la ingrese o cambie.
 * Pre-llena el campo con la clave actual para facilitar la edición.
 */
function cambiarApiKey() {
    document.getElementById('apiModal').classList.remove('hidden');
    document.getElementById('apiKeyInput').value = localStorage.getItem('nyt_api_key') || '';
}