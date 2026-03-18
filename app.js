/**
 * NYT Books Explorer — app.js
 * ============================
 * Aplicación completa que consume la NYT Books API.
 *
 * ENDPOINTS UTILIZADOS:
 * 1. /lists/current/{list}.json          → Best Sellers por categoría (directo, tiene CORS)
 * 2. /lists/overview.json                → Resumen general semanal (directo)
 * 3. /lists/names.json                   → Todas las listas disponibles (vía proxy CORS)
 * 4. /lists/{date}/{list}.json           → Best Sellers por fecha (directo)
 * 5. /lists/best-sellers/history.json    → Búsqueda por título/autor (vía proxy CORS)
 * 6. /reviews.json                       → Reseñas por título/autor/ISBN (vía proxy CORS)
 *
 * NOTA CORS:
 * La NYT API permite peticiones directas del navegador solo para /lists/current y /lists/overview.
 * Para los demás endpoints se usa allorigins.win como proxy CORS intermedio.
 *
 * Configuración: La API Key se guarda en localStorage.
 * ⚠️ Nunca subas tu API Key a GitHub. Usa variables de entorno en producción.
 */

// ─────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────

const NYT_BASE = 'https://api.nytimes.com/svc/books/v3';

/**
 * Proxy CORS para endpoints que la NYT API bloquea desde el navegador.
 * allorigins.win es un proxy público gratuito que reenvía la petición
 * y agrega los headers CORS necesarios en la respuesta.
 */
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

/**
 * API Key del NYT Developer Portal.
 * ⚠️ En producción usar variable de entorno en un backend propio.
 * Revocar si se sube accidentalmente a un repo público.
 */
const DEFAULT_API_KEY = 'QGUSy23kEHYAAuAzT44K2V1J7klf3XAmKnErAezz6JI44Foa';

/** Categoría asignada: Combined Print & E-Book Fiction */
const DEFAULT_CATEGORY = 'combined-print-and-e-book-fiction';

/** Imagen de respaldo para portadas no disponibles */
const IMG_FALLBACK = 'https://placehold.co/200x300/f0e8d0/5a4f3f?text=Sin+Portada&font=playfair-display';

/**
 * Categorías activas y verificadas en la NYT Books API.
 * Se usan para poblar los <select> dinámicamente y evitar
 * mostrar listas que ya no existen o no tienen datos.
 */
const CATEGORIAS_ACTIVAS = [
  { value: 'combined-print-and-e-book-fiction',    label: 'Combined Print & E-Book Fiction' },
  { value: 'combined-print-and-e-book-nonfiction', label: 'Combined Print & E-Book Nonfiction' },
  { value: 'hardcover-fiction',                    label: 'Hardcover Fiction' },
  { value: 'hardcover-nonfiction',                 label: 'Hardcover Nonfiction' },
  { value: 'trade-fiction-paperback',              label: 'Trade Fiction Paperback' },
  { value: 'paperback-nonfiction',                 label: 'Paperback Nonfiction' },
  { value: 'young-adult-hardcover',                label: 'Young Adult Hardcover' },
  { value: 'young-adult-paperback',                label: 'Young Adult Paperback' },
  { value: 'childrens-middle-grade-hardcover',     label: "Children's Middle Grade" },
  { value: 'picture-books',                        label: 'Picture Books' },
  { value: 'series-books',                         label: 'Series Books' },
  { value: 'hardcover-business-books',             label: 'Business Books (Hardcover)' },
  { value: 'paperback-business-books',             label: 'Business Books (Paperback)' },
  { value: 'hardcover-graphic-books',              label: 'Graphic Books (Hardcover)' },
  { value: 'paperback-graphic-books',              label: 'Graphic Books (Paperback)' },
  { value: 'manga',                                label: 'Manga' },
  { value: 'mass-market-paperback',                label: 'Mass Market Paperback' },
  { value: 'e-book-fiction',                       label: 'E-Book Fiction' },
  { value: 'e-book-nonfiction',                    label: 'E-Book Nonfiction' },
];

/** Caché en memoria para evitar peticiones repetidas */
const cache = {};

// ─────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  // Guardar API Key por defecto si no hay ninguna
  if (!localStorage.getItem('nyt_api_key')) {
    localStorage.setItem('nyt_api_key', DEFAULT_API_KEY);
  }

  // Ocultar modal de API Key
  document.getElementById('apiModal').classList.add('hidden');

  // Poblar los selectores con las categorías verificadas
  poblarSelectores();

  // Aplicar tema guardado (oscuro/claro)
  aplicarTemaGuardado();

  // Carga inicial: Best Sellers de la categoría asignada
  librosCategoria();

  // Crear overlay del sidebar para móvil
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  overlay.onclick = () => toggleSidebar(false);
  document.body.appendChild(overlay);
});

/**
 * Rellena los elementos <select> de categoría con la lista verificada.
 * Así evitamos mostrar categorías inexistentes o discontinuadas.
 */
function poblarSelectores() {
  const ids = ['categoriaSelect', 'categoriaFechaSelect'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = CATEGORIAS_ACTIVAS.map(cat =>
      `<option value="${cat.value}" ${cat.value === DEFAULT_CATEGORY ? 'selected' : ''}>${cat.label}</option>`
    ).join('');
  });
}

// ─────────────────────────────────────────────
// GESTIÓN DE API KEY
// ─────────────────────────────────────────────

function guardarApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) { mostrarToast('Ingresa una API Key válida.', 'error'); return; }
  localStorage.setItem('nyt_api_key', key);
  document.getElementById('apiModal').classList.add('hidden');
  mostrarToast('API Key guardada ✓', 'success');
  librosCategoria();
}

function cambiarApiKey() {
  document.getElementById('apiModal').classList.remove('hidden');
  document.getElementById('apiKeyInput').value = localStorage.getItem('nyt_api_key') || '';
}

function obtenerApiKey() {
  return localStorage.getItem('nyt_api_key') || DEFAULT_API_KEY;
}

// ─────────────────────────────────────────────
// CAPA DE RED — fetchNYT y fetchNYTProxy
// ─────────────────────────────────────────────

/**
 * Petición DIRECTA a la NYT API (sin proxy).
 * Funciona para: /lists/current/*, /lists/overview.json, /lists/{date}/*.
 * Estos endpoints responden con CORS habilitado para peticiones de browser.
 *
 * @param {string} endpoint - Ruta relativa ej: '/lists/current/hardcover-fiction.json'
 * @param {Object} params   - Query params adicionales
 */
async function fetchNYT(endpoint, params = {}) {
  const apiKey = obtenerApiKey();
  const url = new URL(`${NYT_BASE}${endpoint}`);
  url.searchParams.append('api-key', apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const urlStr = url.toString();

  if (cache[urlStr]) return cache[urlStr];

  const res = await fetch(urlStr);
  manejarErrorHTTP(res);
  const data = await res.json();
  guardarEnCache(urlStr, data);
  return data;
}

/**
 * Petición VÍA PROXY CORS a la NYT API.
 * Necesario para endpoints que el navegador bloquea por política CORS:
 *   - /lists/names.json
 *   - /lists/best-sellers/history.json
 *   - /reviews.json
 *
 * allorigins.win recibe la URL destino, hace la petición desde su servidor
 * (que no tiene restricciones de browser) y devuelve el contenido
 * envuelto en { contents: "..." } como string JSON.
 *
 * @param {string} endpoint - Ruta relativa
 * @param {Object} params   - Query params adicionales
 */
async function fetchNYTProxy(endpoint, params = {}) {
  const apiKey = obtenerApiKey();
  const url = new URL(`${NYT_BASE}${endpoint}`);
  url.searchParams.append('api-key', apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  const urlStr = url.toString();

  if (cache[urlStr]) return cache[urlStr];

  // Envolver la URL destino en el proxy
  const proxyUrl = CORS_PROXY + encodeURIComponent(urlStr);
  const res = await fetch(proxyUrl);

  if (!res.ok) throw new Error(`Error de red (${res.status}). Intenta de nuevo.`);

  const wrapper = await res.json();

  // allorigins devuelve { contents: "<json como string>" }
  if (!wrapper.contents) {
    throw new Error('El proxy no devolvió contenido. Verifica tu conexión.');
  }

  let data;
  try {
    data = JSON.parse(wrapper.contents);
  } catch {
    throw new Error('La respuesta de la API no tiene el formato esperado.');
  }

  // Revisar si la API devolvió un error dentro del JSON
  if (data.fault || data.message) {
    const msg = data.fault?.faultstring || data.message || 'Error de la API';
    if (msg.includes('Invalid API Key') || msg.includes('401')) {
      throw new Error('API Key inválida. Verifica tu clave en developer.nytimes.com');
    }
    throw new Error(msg);
  }

  guardarEnCache(urlStr, data);
  return data;
}

/** Lanza un error descriptivo según el código HTTP de la respuesta */
function manejarErrorHTTP(res) {
  if (res.status === 401) throw new Error('API Key inválida. Verifica tu clave en developer.nytimes.com');
  if (res.status === 429) throw new Error('Límite de peticiones excedido (máx. 10/min). Espera unos segundos.');
  if (res.status === 404) throw new Error('Lista o recurso no encontrado.');
  if (!res.ok) throw new Error(`Error del servidor (${res.status}).`);
}

/** Guarda datos en caché durante 5 minutos */
function guardarEnCache(key, data) {
  cache[key] = data;
  setTimeout(() => delete cache[key], 5 * 60 * 1000);
}

// ─────────────────────────────────────────────
// ENDPOINT 1 — Best Sellers por categoría
// GET /lists/current/{list}.json
// ─────────────────────────────────────────────

async function librosCategoria() {
  const categoria = document.getElementById('categoriaSelect').value;
  const contenedor = document.getElementById('resultado-bestsellers');
  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT(`/lists/current/${categoria}.json`);
    const libros = data.results?.books;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, 'No hay libros disponibles para esta categoría.');
      return;
    }

    contenedor.innerHTML = libros.map((l, i) => crearTarjetaLibro(l, i + 1)).join('');
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// ENDPOINT 2 — Resumen general semanal
// GET /lists/overview.json
// ─────────────────────────────────────────────

async function overview() {
  const contenedor = document.getElementById('resultado-overview');
  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT('/lists/overview.json');
    const listas = data.results?.lists;

    if (!listas || listas.length === 0) {
      mostrarVacio(contenedor, 'No se encontró información del resumen semanal.');
      return;
    }

    const fecha = data.results?.bestsellers_date || '';
    let html = `<p style="color:var(--text3);font-size:0.85rem;margin-bottom:1.5rem;">
      Semana del <strong>${formatearFecha(fecha)}</strong> — ${listas.length} listas
    </p>`;

    listas.forEach(lista => {
      const libros = lista.books?.slice(0, 5) || [];
      html += `
        <div class="overview-list-section">
          <div class="overview-list-title">${lista.list_name}</div>
          <div class="overview-books-row">
            ${libros.map((l, i) => crearTarjetaLibro(l, i + 1, true)).join('')}
          </div>
        </div>`;
    });

    contenedor.innerHTML = html;
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// ENDPOINT 3 — Todas las listas disponibles
// GET /lists/names.json  (vía proxy CORS)
// ─────────────────────────────────────────────

async function cargarListas() {
  const contenedor = document.getElementById('resultado-listas');
  mostrarCargando(contenedor);

  try {
    // Este endpoint requiere proxy porque la NYT no envía headers CORS para él
    const data = await fetchNYTProxy('/lists/names.json');
    const listas = data.results;

    if (!listas || listas.length === 0) {
      mostrarVacio(contenedor, 'No se encontraron listas disponibles.');
      return;
    }

    contenedor.innerHTML = listas.map(lista => `
      <div class="lista-card"
           onclick="irALista('${lista.list_name_encoded}')"
           title="Ver best sellers de '${lista.display_name}'">
        <div class="lista-name">${lista.display_name}</div>
        <div class="lista-freq">Publicación: ${lista.updated === 'WEEKLY' ? 'Semanal' : 'Mensual'}</div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem;">
          <span class="lista-tag ${lista.updated === 'WEEKLY' ? 'weekly' : ''}">
            ${lista.updated === 'WEEKLY' ? '📅 Semanal' : '🗓 Mensual'}
          </span>
          ${lista.oldest_published_date ? `<span class="lista-tag">Desde ${lista.oldest_published_date.substring(0,4)}</span>` : ''}
        </div>
      </div>`).join('');

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

/**
 * Navega a Best Sellers y carga la lista seleccionada desde "Todas las Listas".
 * Si el slug no está en el select, lo agrega temporalmente.
 */
function irALista(listSlug) {
  const select = document.getElementById('categoriaSelect');
  const existe = [...select.options].find(o => o.value === listSlug);
  if (existe) {
    select.value = listSlug;
  } else {
    const label = listSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    select.add(new Option(label, listSlug, true, true));
  }
  mostrarSeccion('bestsellers', document.querySelector('[data-section="bestsellers"]'));
  librosCategoria();
}

// ─────────────────────────────────────────────
// ENDPOINT 4 — Best Sellers por fecha
// GET /lists/{date}/{list}.json
// ─────────────────────────────────────────────

async function librosPorFecha() {
  const fecha = document.getElementById('fechaInput').value;
  const categoria = document.getElementById('categoriaFechaSelect').value;
  const contenedor = document.getElementById('resultado-historial');

  if (!fecha) { mostrarToast('Selecciona una fecha.', 'error'); return; }

  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT(`/lists/${fecha}/${categoria}.json`);
    const libros = data.results?.books;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, `No hay datos para "${categoria}" en esa fecha.`);
      return;
    }

    const header = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                  border-radius:8px;border-left:3px solid var(--accent);font-size:0.88rem;color:var(--text2);">
        📅 Best Sellers del <strong>${formatearFecha(fecha)}</strong>
        — ${data.results?.list_name || categoria}
      </div>`;

    contenedor.innerHTML = header + libros.map((l, i) => crearTarjetaLibro(l, i + 1)).join('');
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// ENDPOINT 5 — Búsqueda por título en historial
// GET /lists/best-sellers/history.json?title=  (vía proxy CORS)
// ─────────────────────────────────────────────

async function buscarLibro() {
  const query = document.getElementById('buscarLibroInput').value.trim();
  const contenedor = document.getElementById('resultado-buscar');

  if (!query) { mostrarToast('Escribe un título para buscar.', 'error'); return; }
  mostrarCargando(contenedor);

  try {
    // Requiere proxy: este endpoint tiene restricción CORS en browser
    const data = await fetchNYTProxy('/lists/best-sellers/history.json', { title: query });
    const libros = data.results;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, `No se encontraron resultados para "${query}".`);
      return;
    }

    contenedor.innerHTML = libros.map(l => crearTarjetaHistorial(l)).join('');
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// ENDPOINT 6 — Búsqueda por autor en historial
// GET /lists/best-sellers/history.json?author=  (vía proxy CORS)
// ─────────────────────────────────────────────

async function buscarAutor() {
  const query = document.getElementById('buscarAutorInput').value.trim();
  const contenedor = document.getElementById('resultado-buscar');

  if (!query) { mostrarToast('Escribe un autor para buscar.', 'error'); return; }
  mostrarCargando(contenedor);

  try {
    const data = await fetchNYTProxy('/lists/best-sellers/history.json', { author: query });
    const libros = data.results;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, `No se encontraron libros de "${query}".`);
      return;
    }

    const header = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                  border-radius:8px;border-left:3px solid var(--gold);font-size:0.88rem;color:var(--text2);">
        ✍️ <strong>${libros.length}</strong> libro(s) encontrados de <strong>${query}</strong>
      </div>`;

    contenedor.innerHTML = header + libros.map(l => crearTarjetaHistorial(l)).join('');
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// ENDPOINT 7 — Reseñas por título, autor o ISBN
// GET /reviews.json  (vía proxy CORS)
// ─────────────────────────────────────────────

async function buscarResena(tipo) {
  const contenedor = document.getElementById('resultado-resenas');
  let params = {}, query = '';

  if (tipo === 'titulo') {
    query = document.getElementById('resenaTituloInput').value.trim();
    params = { title: query };
  } else if (tipo === 'autor') {
    query = document.getElementById('resenaAutorInput').value.trim();
    params = { author: query };
  } else if (tipo === 'isbn') {
    query = document.getElementById('resenaIsbnInput').value.trim().replace(/-/g, '');
    params = { isbn: query };
  }

  if (!query) { mostrarToast('Ingresa un término de búsqueda.', 'error'); return; }
  mostrarCargando(contenedor);

  try {
    // Requiere proxy: /reviews.json bloquea peticiones desde el browser
    const data = await fetchNYTProxy('/reviews.json', params);
    const resenas = data.results;

    if (!resenas || resenas.length === 0) {
      mostrarVacio(contenedor, `No se encontraron reseñas para "${query}".`);
      return;
    }

    contenedor.innerHTML = resenas.map(r => crearTarjetaResena(r)).join('');
  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

// ─────────────────────────────────────────────
// COMPARAR LIBROS (función extra)
// Usa historial (proxy) para buscar 2 libros en paralelo
// ─────────────────────────────────────────────

async function compararLibros() {
  const tituloA = document.getElementById('compararLibroA').value.trim();
  const tituloB = document.getElementById('compararLibroB').value.trim();
  const contenedor = document.getElementById('resultado-comparar');

  if (!tituloA || !tituloB) {
    mostrarToast('Ingresa los títulos de ambos libros.', 'error');
    return;
  }

  contenedor.innerHTML = '<div class="spinner"></div>';

  try {
    // Peticiones en paralelo para mayor velocidad
    const [dataA, dataB] = await Promise.all([
      fetchNYTProxy('/lists/best-sellers/history.json', { title: tituloA }),
      fetchNYTProxy('/lists/best-sellers/history.json', { title: tituloB }),
    ]);

    const libroA = dataA.results?.[0] || null;
    const libroB = dataB.results?.[0] || null;

    contenedor.innerHTML =
      renderizarComparacion(libroA, 'Libro A', tituloA) +
      renderizarComparacion(libroB, 'Libro B', tituloB);

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

function renderizarComparacion(libro, label, busqueda) {
  if (!libro) {
    return `
      <div class="comparar-book">
        <div class="comparar-book-header">${label}</div>
        <div style="padding:2rem;text-align:center;color:var(--text3);">
          <span style="font-size:2rem;">🔍</span>
          <p style="margin-top:0.5rem;">No se encontró "<strong>${busqueda}</strong>"</p>
          <p style="font-size:0.8rem;margin-top:0.3rem;">Solo aparecen libros que alguna vez estuvieron en el NYT Best Sellers.</p>
        </div>
      </div>`;
  }

  const portada = libro.book_image || IMG_FALLBACK;
  const ranksHistory = libro.ranks_history || [];
  const mejorPos = ranksHistory.length ? Math.min(...ranksHistory.map(r => r.rank)) : 'N/A';
  const totalSemanas = ranksHistory.reduce((acc, r) => acc + (r.weeks_on_list || 0), 0);
  const primeraLista = ranksHistory[0]?.list_name || ranksHistory[0]?.list || 'N/A';

  return `
    <div class="comparar-book">
      <div class="comparar-book-header">${label}</div>
      <div class="comparar-book-body">
        <img src="${portada}" alt="Portada" class="comparar-book-cover"
             onerror="this.src='${IMG_FALLBACK}'">
        <div class="comparar-book-details">
          <div class="comparar-book-title">${libro.title || 'Sin título'}</div>
          <div class="comparar-book-author">por ${libro.author || 'Desconocido'}</div>
          <div class="comparar-stat"><span>Mejor posición</span><span>#${mejorPos}</span></div>
          <div class="comparar-stat"><span>Semanas en lista</span><span>${totalSemanas || 'N/A'}</span></div>
          <div class="comparar-stat"><span>Apariciones</span><span>${ranksHistory.length}</span></div>
          <div class="comparar-stat"><span>Primera lista</span><span style="font-size:0.75rem">${primeraLista}</span></div>
          ${libro.publisher ? `<div class="comparar-stat"><span>Editorial</span><span>${libro.publisher}</span></div>` : ''}
          ${libro.description ? `<p style="font-size:0.78rem;color:var(--text3);margin-top:0.6rem;line-height:1.4;">${libro.description.substring(0,120)}…</p>` : ''}
        </div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// RENDERIZADO DE TARJETAS
// ─────────────────────────────────────────────

/** Tarjeta de libro estándar para listas de best sellers */
function crearTarjetaLibro(libro, rank = null, compacto = false) {
  const portada = libro.book_image || IMG_FALLBACK;
  const titulo = libro.title || 'Sin título';
  const autor = libro.author || libro.contributor || 'Autor desconocido';
  const desc = libro.description || '';
  const enlace = libro.amazon_product_url || libro.buy_links?.[0]?.url || '';
  const semanas = libro.weeks_on_list;

  return `
    <div class="book-card">
      <div class="book-cover-wrap">
        <img class="book-cover" src="${portada}" alt="${titulo}"
             loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
        ${rank ? `<div class="book-rank">${rank}</div>` : ''}
        ${semanas ? `<div class="book-weeks-badge">${semanas} sem.</div>` : ''}
      </div>
      <div class="book-info">
        <div class="book-title">${titulo}</div>
        <div class="book-author">${autor}</div>
        ${!compacto && desc ? `<div class="book-desc">${desc}</div>` : ''}
        ${enlace ? `<a class="book-buy-link" href="${enlace}" target="_blank" rel="noopener">Comprar →</a>` : ''}
      </div>
    </div>`;
}

/** Tarjeta para resultados del historial de best sellers (layout horizontal) */
function crearTarjetaHistorial(libro) {
  const portada = libro.book_image || IMG_FALLBACK;
  const titulo = libro.title || 'Sin título';
  const autor = libro.author || 'Autor desconocido';
  const desc = libro.description || '';
  const ranksHistory = libro.ranks_history || [];
  const listas = [...new Set(ranksHistory.map(r => r.list_name || r.list || ''))].filter(Boolean);
  const mejorPos = ranksHistory.length ? Math.min(...ranksHistory.map(r => r.rank)) : null;

  return `
    <div class="book-card" style="flex-direction:row;max-width:100%;min-width:0;">
      <div class="book-cover-wrap" style="width:90px;min-width:90px;aspect-ratio:2/3;border-radius:8px 0 0 8px;">
        <img class="book-cover" src="${portada}" alt="${titulo}"
             loading="lazy" onerror="this.src='${IMG_FALLBACK}'" style="border-radius:0;">
        ${mejorPos ? `<div class="book-rank">#${mejorPos}</div>` : ''}
      </div>
      <div class="book-info" style="padding:1rem;">
        <div class="book-title" style="-webkit-line-clamp:1;">${titulo}</div>
        <div class="book-author">${autor}</div>
        ${desc ? `<div class="book-desc" style="-webkit-line-clamp:2;">${desc}</div>` : ''}
        ${libro.publisher ? `<div style="font-size:0.74rem;color:var(--text3);margin-top:0.25rem;">📖 ${libro.publisher}</div>` : ''}
        ${listas.length > 0 ? `
          <div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.25rem;">
            ${listas.slice(0, 3).map(l => `<span style="font-size:0.68rem;background:var(--bg2);color:var(--text2);padding:0.15em 0.5em;border-radius:4px;">${l}</span>`).join('')}
            ${listas.length > 3 ? `<span style="font-size:0.68rem;color:var(--text3);">+${listas.length - 3} más</span>` : ''}
          </div>` : ''}
      </div>
    </div>`;
}

/** Tarjeta para reseñas literarias del NYT */
function crearTarjetaResena(resena) {
  const portada = resena.book_image || resena.multimedia?.[0]?.url || IMG_FALLBACK;
  const titulo = resena.book_title || 'Sin título';
  const autor = resena.book_author || 'Autor desconocido';
  const summary = resena.summary || 'Reseña del New York Times.';
  const byline = resena.byline || '';
  const fecha = resena.publication_dt ? formatearFecha(resena.publication_dt) : '';
  const url = resena.url || '';

  return `
    <div class="resena-card">
      <img class="resena-thumb" src="${portada}" alt="${titulo}"
           loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
      <div class="resena-info">
        <div class="resena-title">${titulo}</div>
        <div class="resena-author">por ${autor}</div>
        <div class="resena-summary">${summary}</div>
        <div class="resena-meta">
          ${byline ? `<span>✍️ ${byline}</span>` : ''}
          ${fecha ? `<span>📅 ${fecha}</span>` : ''}
        </div>
        ${url ? `<a class="resena-link" href="${url}" target="_blank" rel="noopener">Leer reseña completa →</a>` : ''}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
// ESTADOS DE UI
// ─────────────────────────────────────────────

function mostrarCargando(c) {
  c.innerHTML = '<div class="spinner"></div>';
}

function mostrarVacio(c, msg) {
  c.innerHTML = `
    <div class="state-box">
      <span class="state-icon">📭</span>
      <div class="state-title">Sin resultados</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}

function mostrarError(c, msg) {
  c.innerHTML = `
    <div class="state-box error">
      <span class="state-icon">⚠️</span>
      <div class="state-title">Ocurrió un error</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}

// ─────────────────────────────────────────────
// NAVEGACIÓN
// ─────────────────────────────────────────────

function mostrarSeccion(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`sec-${id}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle && btn) topbarTitle.textContent = btn.textContent.trim().replace(/^[^\s]+\s/, '');
  if (window.innerWidth <= 768) toggleSidebar(false);
}

function activarTab(tabId, btn) {
  document.querySelectorAll('#sec-buscar .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#sec-buscar .tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.classList.add('active');
}

function activarTabResena(tabId, btn) {
  document.querySelectorAll('#sec-resenas .tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#sec-resenas .tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.classList.add('active');
}

function toggleSidebar(forzar) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const abrir = forzar === undefined ? !sidebar.classList.contains('open') : forzar;
  sidebar.classList.toggle('open', abrir);
  overlay?.classList.toggle('active', abrir);
}

// ─────────────────────────────────────────────
// TEMA OSCURO / CLARO
// ─────────────────────────────────────────────

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('nyt_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
}

function aplicarTemaGuardado() {
  if (localStorage.getItem('nyt_theme') === 'dark') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '☀️ Modo Claro';
  }
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────

function mostrarToast(msg, tipo = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${tipo} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch { return fechaStr; }
}