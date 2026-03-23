/**
 * js/ui.js — Interfaz de usuario
 * ================================
 * Controla todo lo visual que no depende de datos de la API:
 * navegación entre secciones, sidebar, tema oscuro/claro,
 * notificaciones toast y estados de carga/vacío/error.
 *
 * Si necesitas cambiar cómo se ve un error, cómo funciona
 * el sidebar o cómo se muestra un spinner, edita aquí.
 *
 * Depende de: ningún otro módulo js/
 */


// ─────────────────────────────────────────────────────────────
// Estados de la interfaz
// ─────────────────────────────────────────────────────────────

/**
 * Muestra un spinner de carga dentro del contenedor.
 * Se llama al inicio de cada petición para dar retroalimentación visual.
 * @param {HTMLElement} c - Contenedor donde mostrar el spinner
 */
function mostrarCargando(c) {
  c.innerHTML = '<div class="spinner"></div>';
}

/**
 * Muestra un estado vacío cuando la API no retornó resultados.
 * @param {HTMLElement} c   - Contenedor
 * @param {string}      msg - Mensaje para el usuario (acepta HTML básico)
 */
function mostrarVacio(c, msg) {
  c.innerHTML = `
    <div class="state-box">
      <span class="state-icon">📭</span>
      <div class="state-title">Sin resultados</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}

/**
 * Muestra un estado de error con el mensaje capturado en el catch.
 * @param {HTMLElement} c   - Contenedor
 * @param {string}      msg - Mensaje de error descriptivo
 */
function mostrarError(c, msg) {
  c.innerHTML = `
    <div class="state-box error">
      <span class="state-icon">⚠️</span>
      <div class="state-title">Ocurrió un error</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}


// ─────────────────────────────────────────────────────────────
// Navegación entre secciones
// ─────────────────────────────────────────────────────────────

/**
 * Muestra la sección solicitada y oculta las demás.
 * Actualiza el botón activo del sidebar y el título de la topbar.
 * En pantallas pequeñas, cierra el sidebar automáticamente.
 *
 * @param {string}      id  - ID de la sección (sin el prefijo 'sec-')
 * @param {HTMLElement} btn - Botón del sidebar que disparó la navegación
 */
function mostrarSeccion(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${id}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle && btn) {
    topbarTitle.textContent = btn.textContent.trim().replace(/^[^\s]+\s/, '');
  }

  if (window.innerWidth <= 768) toggleSidebar(false);
}


// ─────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────

/**
 * Abre o cierra el sidebar lateral.
 * En móvil también activa/desactiva el overlay oscuro de fondo.
 *
 * @param {boolean|undefined} forzar - true: abrir, false: cerrar, undefined: alternar
 */
function toggleSidebar(forzar) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const abrir   = forzar === undefined ? !sidebar.classList.contains('open') : forzar;
  sidebar.classList.toggle('open', abrir);
  overlay?.classList.toggle('active', abrir);
}


// ─────────────────────────────────────────────────────────────
// Tema oscuro / claro
// ─────────────────────────────────────────────────────────────

/**
 * Alterna entre tema claro y oscuro.
 * Guarda la preferencia en localStorage para recordarla entre sesiones.
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('nyt_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
}

/**
 * Lee el tema guardado y lo aplica al cargar la página.
 * Se llama en main.js antes de renderizar cualquier contenido
 * para evitar el parpadeo de tema (flash of unstyled content).
 */
function aplicarTemaGuardado() {
  if (localStorage.getItem('nyt_theme') === 'dark') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '☀️ Modo Claro';
  }
}


// ─────────────────────────────────────────────────────────────
// Notificaciones toast
// ─────────────────────────────────────────────────────────────

/**
 * Muestra una notificación tipo toast en la esquina inferior derecha.
 * Desaparece automáticamente después de 3.5 segundos.
 *
 * @param {string} msg  - Texto del mensaje
 * @param {string} tipo - 'error' (rojo) | 'success' (verde) | '' (neutro)
 */
function mostrarToast(msg, tipo = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${tipo} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}


// ─────────────────────────────────────────────────────────────
// Selectores de categoría
// ─────────────────────────────────────────────────────────────

/**
 * Llena los <select> de categoría con las opciones de CATEGORIAS_ACTIVAS.
 * Al agregar o quitar una categoría en config.js, los selectores
 * se actualizan solos la próxima vez que cargue la página.
 */
function poblarSelectores() {
    ['categoriaSelect', 'categoriaFechaSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = CATEGORIAS_ACTIVAS.map(cat =>
        `<option value="${cat.value}" ${cat.value === DEFAULT_CATEGORY ? 'selected' : ''}>${cat.label}</option>`
        ).join('');
    });
}