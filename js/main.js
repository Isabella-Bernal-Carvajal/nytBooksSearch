/**
 * js/main.js — Punto de entrada de la aplicación
 * ================================================
 * Inicializa la app cuando el DOM está listo.
 * Depende de: todos los demás módulos js/
 */

window.addEventListener('DOMContentLoaded', () => {

  // 1 — API Key
  if (!localStorage.getItem('nyt_api_key') && DEFAULT_API_KEY) {
    localStorage.setItem('nyt_api_key', DEFAULT_API_KEY);
  }
  document.getElementById('apiModal').classList.add('hidden');

  // 2 — Tema visual
  aplicarTemaGuardado();

  // 3 — Selectores de categoría
  poblarSelectores();

  // 4 — Carga inicial: Best Sellers de la categoría por defecto
  librosCategoria();

  // 5 — Construir índice de autocompletado en segundo plano
  //     (no bloquea la carga — usa los datos ya pedidos por librosCategoria)
  construirIndiceAutocomplete();

  // 6 — Overlay del sidebar para móvil
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id        = 'sidebarOverlay';
  overlay.onclick   = () => toggleSidebar(false);
  document.body.appendChild(overlay);

});