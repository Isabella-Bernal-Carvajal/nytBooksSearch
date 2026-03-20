
// SECCIÓN 1 — CONSTANTES DE CONFIGURACIÓN
const NYT_BASE = 'https://api.nytimes.com/svc/books/v3';

/**
 * API Key del New York Times Developer Portal.
 *
 * ¿Cómo configurarla?
 * ───────────────────
 * 1. Crea un archivo llamado  config.js  en la raíz del proyecto
 *    (al lado de este app.js) con el siguiente contenido:
 *
 *      const NYT_API_KEY = 'TU_API_KEY_AQUI';
 *
 * 2. Ese archivo está en .gitignore — nunca se subirá a GitHub.
 *
 * 3. Si no existe config.js, la app pedirá la clave por pantalla
 *    y la guardará en localStorage del navegador.
 *
 *  NUNCA escribas tu API Key directamente en este archivo ni
 *    en ningún archivo que se suba a un repositorio público.
 *
 * Más información: https://developer.nytimes.com/my-apps
 */
const DEFAULT_API_KEY = (typeof NYT_API_KEY !== 'undefined')
  ? NYT_API_KEY          // Viene de config.js (variable de entorno local)
  : null;                // Si no existe, la app pedirá la clave por pantalla

/**
 * Categoría por defecto asignada para este ejercicio.
 * Corresponde a la lista "Combined Print & E-Book Fiction" del NYT.
 */
const DEFAULT_CATEGORY = 'combined-print-and-e-book-fiction';

/**
 * URL de imagen de respaldo para libros sin portada disponible.
 * Se muestra automáticamente cuando la API no retorna una imagen
 * o cuando la imagen no carga (manejado con onerror en el HTML).
 */
const IMG_FALLBACK = 'https://placehold.co/200x300/f0e8d0/5a4f3f?text=Sin+Portada&font=playfair-display';

/**
 * Lista completa de categorías activas y verificadas en la NYT Books API (2025).
 *
 * Solo se incluyen categorías que actualmente retornan datos. Se usa para:
 *   1. Poblar los elementos <select> del HTML dinámicamente.
 *   2. Definir qué listas se consultan en la búsqueda por título/autor.
 *
 * Ventaja de manejarlas aquí en vez del HTML: si una categoría deja de
 * funcionar, se elimina de un solo lugar sin tocar el HTML.
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

/**
 * Subconjunto de categorías que se consultan en paralelo al buscar
 * por título o autor. Se eligieron las más amplias para maximizar
 * la cobertura de resultados sin sobrepasar el límite de la API.
 */
const CATEGORIAS_BUSQUEDA = [
  'combined-print-and-e-book-fiction',
  'combined-print-and-e-book-nonfiction',
  'hardcover-fiction',
  'hardcover-nonfiction',
  'trade-fiction-paperback',
  'paperback-nonfiction',
  'young-adult-hardcover',
  'hardcover-business-books',
  'hardcover-graphic-books',
  'manga',
];

/**
 * Objeto de caché en memoria (clave = URL completa, valor = datos JSON).
 * Se limpia automáticamente entrada por entrada cada 5 minutos.
 * Ver función guardarEnCache().
 */
const cache = {};


// ============================================================
// SECCIÓN 2 — INICIALIZACIÓN
// ============================================================

/**
 * Punto de entrada de la aplicación.
 * Se ejecuta cuando el DOM está completamente cargado.
 * Configura la API Key, el tema visual, los selectores y la carga inicial.
 */
window.addEventListener('DOMContentLoaded', () => {

  // Si no hay API Key guardada, se usa la clave por defecto
  if (!localStorage.getItem('nyt_api_key')) {
    localStorage.setItem('nyt_api_key', DEFAULT_API_KEY);
  }

  // La app ya tiene clave configurada, ocultar el modal de ingreso
  document.getElementById('apiModal').classList.add('hidden');

  // Llenar los <select> de categorías con la lista verificada
  poblarSelectores();

  // Restaurar el tema (oscuro/claro) que el usuario eligió la última vez
  aplicarTemaGuardado();

  // Cargar la lista de Best Sellers de la categoría por defecto al abrir
  librosCategoria();

  // Crear el overlay semitransparente que cierra el sidebar en móvil
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebarOverlay';
  overlay.onclick = () => toggleSidebar(false);
  document.body.appendChild(overlay);
});

/**
 * Llena los elementos <select> de categorías con las opciones de CATEGORIAS_ACTIVAS.
 * Marca como seleccionada la categoría por defecto (DEFAULT_CATEGORY).
 * Se aplica a todos los selectores que tienen ese rol en el HTML.
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


// ============================================================
// SECCIÓN 3 — GESTIÓN DE API KEY
// ============================================================

/**
 * Lee la API Key del campo del modal y la guarda en localStorage.
 * Si el campo está vacío, muestra un mensaje de error y no continúa.
 * Al guardar exitosamente, cierra el modal y recarga los Best Sellers.
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
  librosCategoria();
}

/**
 * Abre el modal de API Key, pre-llenando el campo con la clave actual
 * para que el usuario pueda editarla o reemplazarla fácilmente.
 */
function cambiarApiKey() {
  document.getElementById('apiModal').classList.remove('hidden');
  document.getElementById('apiKeyInput').value = localStorage.getItem('nyt_api_key') || '';
}

/**
 * Retorna la API Key activa.
 * Prioriza la clave guardada en localStorage; si no existe, usa DEFAULT_API_KEY.
 *
 * @returns {string} API Key a usar en las peticiones
 */
function obtenerApiKey() {
  // Prioridad: 1) localStorage (ingresada por el usuario)
  //            2) config.js   (variable NYT_API_KEY del entorno local)
  //            3) null        (se pedirá por pantalla)
  return localStorage.getItem('nyt_api_key') || DEFAULT_API_KEY || null;
}


// ============================================================
// SECCIÓN 4 — CAPA DE RED (fetchNYT)
// ============================================================

/**
 * Función central de red. Realiza una petición HTTP GET a la NYT Books API.
 *
 * Flujo:
 *   1. Construye la URL completa con el endpoint y los parámetros recibidos.
 *   2. Agrega la API Key como parámetro de query string (requerido por NYT).
 *   3. Verifica el caché: si ya se consultó esta URL recientemente, retorna
 *      el resultado guardado sin hacer una nueva petición de red.
 *   4. Realiza el fetch() y maneja los errores HTTP más comunes.
 *   5. Parsea la respuesta JSON y la guarda en caché antes de retornarla.
 *
 * Manejo de errores HTTP:
 *   401 → API Key inválida o expirada
 *   429 → Límite de peticiones superado (10/min en plan gratuito)
 *   404 → Categoría o recurso no encontrado
 *   Otros → Error genérico del servidor
 *
 * @param {string} endpoint - Ruta relativa, ej: '/lists/current/hardcover-fiction.json'
 * @param {Object} params   - Parámetros adicionales de query string (opcionales)
 * @returns {Promise<Object>} Datos JSON de la respuesta de la API
 * @throws {Error} Si la petición falla o la API retorna un error
 */
async function fetchNYT(endpoint, params = {}) {
  // Verificar que existe una API Key antes de hacer la petición
  const apiKey = obtenerApiKey();
  if (!apiKey) {
    cambiarApiKey(); // Abrir el modal para que el usuario ingrese su clave
    throw new Error('Configura tu API Key para continuar.');
  }

  // Construir la URL completa con el endpoint recibido
  const url = new URL(`${NYT_BASE}${endpoint}`);

  // La API Key se envía como parámetro "api-key" en la URL (requerido por NYT)
  url.searchParams.append('api-key', apiKey);

  // Agregar cualquier parámetro adicional (ej: fecha, categoría)
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  // El documento del ejercicio indica usar language=es-ES cuando sea posible
  // para que la API retorne descripciones en español si están disponibles
  url.searchParams.append('language', 'es-ES');

  const urlStr = url.toString();

  // Si ya tenemos esta respuesta en caché, retornarla directamente
  // para no gastar peticiones del límite de la API
  if (cache[urlStr]) return cache[urlStr];

  // Realizar la petición HTTP GET
  const res = await fetch(urlStr);

  // Interpretar los códigos de error HTTP con mensajes descriptivos
  if (res.status === 401) throw new Error('API Key inválida. Verifica tu clave en developer.nytimes.com');
  if (res.status === 429) throw new Error('Límite de peticiones excedido (10/min). Espera unos segundos.');
  if (res.status === 404) throw new Error('Lista o recurso no encontrado en la API.');
  if (!res.ok) throw new Error(`Error del servidor NYT (código ${res.status}).`);

  // Parsear el JSON de la respuesta
  const data = await res.json();

  // Guardar en caché para evitar repetir esta petición en los próximos 5 min
  guardarEnCache(urlStr, data);

  return data;
}

/**
 * Guarda una respuesta en el caché en memoria con un TTL de 5 minutos.
 * Después del tiempo límite, la entrada se elimina automáticamente
 * y la siguiente petición igual irá a la red.
 *
 * @param {string} key   - URL completa usada como clave del caché
 * @param {Object} data  - Datos JSON a guardar
 */
function guardarEnCache(key, data) {
  cache[key] = data;
  // setTimeout elimina la entrada después de 5 minutos (300.000 ms)
  setTimeout(() => delete cache[key], 5 * 60 * 1000);
}


// ============================================================
// SECCIÓN 5 — ENDPOINT 1: BEST SELLERS POR CATEGORÍA
// NYT Books API: GET /lists/current/{list}.json
// ============================================================

/**
 * Obtiene y muestra los Best Sellers actuales para la categoría seleccionada.
 *
 * Lee el valor del <select> con id="categoriaSelect", construye el endpoint
 * con ese valor como parte de la URL, y renderiza los resultados como tarjetas.
 *
 * Ejemplo de URL generada:
 *   https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json?api-key=...
 *
 * Datos extraídos del JSON:
 *   data.results.books → array de libros con título, autor, portada, descripción, etc.
 */
async function librosCategoria() {
  const categoria = document.getElementById('categoriaSelect').value;
  const contenedor = document.getElementById('resultado-bestsellers');

  // Mostrar spinner mientras se espera la respuesta
  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT(`/lists/current/${categoria}.json`);
    const libros = data.results?.books;

    // Estado vacío: la API respondió pero no hay libros en esa lista
    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, 'No hay libros disponibles para esta categoría.');
      return;
    }

    // Renderizar cada libro como tarjeta, pasando su posición (rank) en la lista
    contenedor.innerHTML = libros.map((l, i) => crearTarjetaNYT(l, i + 1)).join('');

  } catch (err) {
    // Mostrar el mensaje de error descriptivo al usuario
    mostrarError(contenedor, err.message);
  }
}


// ============================================================
// SECCIÓN 6 — ENDPOINT 2: BEST SELLERS POR FECHA
// NYT Books API: GET /lists/{date}/{list}.json
// ============================================================

/**
 * Obtiene los Best Sellers de una categoría en una fecha específica del pasado.
 *
 * Lee la fecha del <input type="date"> y la categoría del segundo <select>,
 * luego construye la URL con ambos valores.
 *
 * Ejemplo de URL generada:
 *   https://api.nytimes.com/svc/books/v3/lists/2023-06-11/hardcover-fiction.json?api-key=...
 *
 * La fecha mínima disponible en la API es 2011-02-13.
 * Si se ingresa una fecha sin datos, la API retorna un array vacío.
 */
async function librosPorFecha() {
  const fecha = document.getElementById('fechaInput').value;
  const categoria = document.getElementById('categoriaFechaSelect').value;
  const contenedor = document.getElementById('resultado-historial');

  // Validar que el usuario haya seleccionado una fecha antes de consultar
  if (!fecha) {
    mostrarToast('Selecciona una fecha.', 'error');
    return;
  }

  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT(`/lists/${fecha}/${categoria}.json`);
    const libros = data.results?.books;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, 'No hay datos para esa categoría en la fecha seleccionada.');
      return;
    }

    // Encabezado informativo con la fecha y lista consultada
    const header = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                  border-radius:8px;border-left:3px solid var(--accent);font-size:0.88rem;color:var(--text2);">
        📅 Best Sellers del <strong>${formatearFecha(fecha)}</strong>
        — ${data.results?.list_name || categoria}
      </div>`;

    contenedor.innerHTML = header + libros.map((l, i) => crearTarjetaNYT(l, i + 1)).join('');

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}


// ============================================================
// SECCIÓN 7 — ENDPOINT 3: RESUMEN GENERAL SEMANAL
// NYT Books API: GET /lists/overview.json
// ============================================================

/**
 * Obtiene el resumen semanal: los primeros 5 libros de TODAS las listas del NYT.
 *
 * Es el único endpoint que retorna múltiples listas en una sola petición.
 * Cada lista incluye hasta 5 libros con sus datos básicos.
 *
 * Ejemplo de URL generada:
 *   https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=...
 *
 * Datos extraídos:
 *   data.results.bestsellers_date → fecha de publicación de la lista
 *   data.results.lists            → array de listas, cada una con su array de libros
 */
async function overview() {
  const contenedor = document.getElementById('resultado-overview');
  mostrarCargando(contenedor);

  try {
    const data = await fetchNYT('/lists/overview.json');
    const listas = data.results?.lists;

    if (!listas || listas.length === 0) {
      mostrarVacio(contenedor, 'No se encontró el resumen semanal.');
      return;
    }

    // Mostrar la fecha de publicación del resumen
    const fecha = data.results?.bestsellers_date || '';
    let html = `
      <p style="color:var(--text3);font-size:0.85rem;margin-bottom:1.5rem;">
        Semana del <strong>${formatearFecha(fecha)}</strong> — ${listas.length} listas disponibles
      </p>`;

    // Por cada lista, crear una fila horizontal con scroll de hasta 5 libros
    listas.forEach(lista => {
      const libros = lista.books?.slice(0, 5) || [];
      html += `
        <div class="overview-list-section">
          <div class="overview-list-title">${lista.list_name}</div>
          <div class="overview-books-row">
            ${libros.map((l, i) => crearTarjetaNYT(l, i + 1, true)).join('')}
          </div>
        </div>`;
    });

    contenedor.innerHTML = html;

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}


// ============================================================
// SECCIÓN 8 — ENDPOINTS 4 y 5: BUSCAR POR TÍTULO Y POR AUTOR
// NYT Books API: GET /lists/current/{list}.json ×10 en paralelo
// ============================================================

/**
 * Busca un título o un autor dentro de los Best Sellers actuales del NYT.
 *
 * Estrategia técnica:
 *   No existe un endpoint de búsqueda directo con CORS habilitado en NYT.
 *   Se resuelve consultando 10 categorías en paralelo con Promise.all(),
 *   y filtrando los resultados localmente por título o autor.
 *
 * Esto funciona como dos endpoints distintos según el parámetro `tipo`:
 *   - tipo='titulo' → Endpoint 4: filtra por libro.title
 *   - tipo='autor'  → Endpoint 5: filtra por libro.author
 *
 * Deduplicación:
 *   Un mismo libro puede aparecer en varias listas (ej: en hardcover-fiction
 *   y en combined-print-and-e-book-fiction al mismo tiempo). Se usa un Set
 *   con el ISBN como clave para mostrar cada libro una sola vez.
 *
 * @param {string} tipo - 'titulo' para buscar por título, 'autor' para buscar por autor
 */
async function buscarEnBestSellers(tipo) {

  // Determinar qué input leer y en qué contenedor mostrar resultados
  const inputId      = tipo === 'titulo' ? 'resenaTituloInput' : 'autorInput';
  const contenedorId = tipo === 'titulo' ? 'resultado-resenas' : 'resultado-autor';
  const contenedor   = document.getElementById(contenedorId);

  // Leer la búsqueda del usuario (en minúsculas para comparación insensible a mayúsculas)
  const query = document.getElementById(inputId).value.trim().toLowerCase();

  if (!query) {
    mostrarToast('Ingresa un término de búsqueda.', 'error');
    return;
  }

  mostrarCargando(contenedor);

  try {
    /**
     * Lanzar todas las peticiones en paralelo con Promise.all().
     * Cada petición usa .catch() propio para que si una categoría falla
     * (por ejemplo, está temporalmente caída), las demás siguen funcionando
     * y el usuario recibe resultados parciales en lugar de un error total.
     */
    const peticiones = CATEGORIAS_BUSQUEDA.map(cat =>
      fetchNYT(`/lists/current/${cat}.json`)
        .then(data => ({
          libros: data.results?.books || [],
          listaNombre: data.results?.list_name || cat
        }))
        .catch(() => ({ libros: [], listaNombre: cat })) // Fallo silencioso por categoría
    );

    const resultados = await Promise.all(peticiones);

    // Filtrar y deduplicar resultados
    const encontrados = [];
    const vistos = new Set(); // Evitar mostrar el mismo libro dos veces

    resultados.forEach(({ libros, listaNombre }) => {
      libros.forEach(libro => {
        const titulo = (libro.title || '').toLowerCase();
        const autor  = (libro.author || libro.contributor || '').toLowerCase();

        // Usar ISBN como clave única; si no hay, usar el título
        const clave = libro.primary_isbn13 || libro.title;

        // Verificar si el libro coincide con la búsqueda según el tipo
        const coincide = tipo === 'titulo'
          ? titulo.includes(query)
          : autor.includes(query);

        // Agregar solo si coincide y no lo hemos visto antes
        if (coincide && !vistos.has(clave)) {
          vistos.add(clave);
          // Guardar el nombre de la lista para mostrarlo en la tarjeta
          encontrados.push({ ...libro, _listaNombre: listaNombre });
        }
      });
    });

    // Estado vacío: búsqueda válida pero sin coincidencias esta semana
    if (encontrados.length === 0) {
      mostrarVacio(contenedor,
        `No se encontró "<strong>${query}</strong>" en los Best Sellers actuales del NYT.<br>
         <small>Solo aparecen libros que están en las listas esta semana.</small>`
      );
      return;
    }

    // Encabezado con conteo de resultados
    const header = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                  border-radius:8px;border-left:3px solid var(--accent);font-size:0.88rem;color:var(--text2);">
        🔎 <strong>${encontrados.length}</strong> resultado(s) para
        "<strong>${query}</strong>" en las listas NYT actuales
      </div>`;

    contenedor.innerHTML = header + encontrados.map(l => crearTarjetaBestSellerBusqueda(l)).join('');

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}


// ============================================================
// SECCIÓN 9 — RENDERIZADO DE TARJETAS
// ============================================================

/**
 * Genera el HTML de una tarjeta de libro estándar para listas NYT.
 *
 * Muestra: portada (con fallback si no existe), posición en la lista,
 * badge de semanas en lista, título, autor, descripción y enlace de compra.
 *
 * @param {Object}  libro    - Objeto de libro retornado por la NYT Books API
 * @param {number}  rank     - Posición del libro en la lista (1, 2, 3...)
 * @param {boolean} compacto - Si es true, omite la descripción (para el overview)
 * @returns {string} HTML de la tarjeta como string
 */
function crearTarjetaNYT(libro, rank = null, compacto = false) {
  const portada  = libro.book_image || IMG_FALLBACK;
  const titulo   = libro.title      || 'Sin título';
  const autor    = libro.author     || libro.contributor || 'Autor desconocido';
  const desc     = libro.description || '';
  const enlace   = libro.amazon_product_url || libro.buy_links?.[0]?.url || '';
  const semanas  = libro.weeks_on_list; // Número de semanas que lleva en la lista

  return `
    <div class="book-card">
      <div class="book-cover-wrap">
        <!-- onerror muestra la imagen de respaldo si la portada falla al cargar -->
        <img class="book-cover" src="${portada}" alt="Portada de ${titulo}"
             loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
        <!-- Badge de posición en la lista, solo si se proporcionó rank -->
        ${rank ? `<div class="book-rank">${rank}</div>` : ''}
        <!-- Badge de semanas, solo si el dato existe -->
        ${semanas ? `<div class="book-weeks-badge">${semanas} sem.</div>` : ''}
      </div>
      <div class="book-info">
        <div class="book-title">${titulo}</div>
        <div class="book-author">${autor}</div>
        <!-- Descripción omitida en modo compacto (usado en el overview) -->
        ${!compacto && desc ? `<div class="book-desc">${desc}</div>` : ''}
        ${enlace ? `<a class="book-buy-link" href="${enlace}" target="_blank" rel="noopener">Comprar →</a>` : ''}
      </div>
    </div>`;
}

/**
 * Genera el HTML de una tarjeta para resultados de búsqueda en Best Sellers.
 *
 * A diferencia de crearTarjetaNYT, esta tarjeta usa layout horizontal
 * (imagen a la izquierda, info a la derecha) y muestra metadatos adicionales:
 * nombre de la lista, posición actual y semanas en lista.
 *
 * @param {Object} libro - Objeto de libro enriquecido con _listaNombre
 * @returns {string} HTML de la tarjeta como string
 */
function crearTarjetaBestSellerBusqueda(libro) {
  const portada  = libro.book_image || IMG_FALLBACK;
  const titulo   = libro.title      || 'Sin título';
  const autor    = libro.author     || libro.contributor || 'Autor desconocido';
  const desc     = libro.description || '';
  const enlace   = libro.amazon_product_url || libro.buy_links?.[0]?.url || '';
  const semanas  = libro.weeks_on_list;
  const lista    = libro._listaNombre || ''; // Nombre de la lista de origin (agregado en buscarEnBestSellers)
  const rank     = libro.rank;               // Posición actual en la lista

  return `
    <div class="resena-card">
      <img class="resena-thumb" src="${portada}" alt="Portada de ${titulo}"
           loading="lazy" onerror="this.src='${IMG_FALLBACK}'"
           style="width:90px;border-radius:6px;">
      <div class="resena-info">
        <div class="resena-title">${titulo}</div>
        <div class="resena-author">por ${autor}</div>
        ${desc ? `<div class="resena-summary">${desc}</div>` : ''}
        <div class="resena-meta" style="margin-top:0.5rem;">
          ${lista   ? `<span>📋 ${lista}</span>`            : ''}
          ${rank    ? `<span>🏆 Posición #${rank}</span>`   : ''}
          ${semanas ? `<span>📅 ${semanas} semana(s)</span>` : ''}
        </div>
        ${enlace ? `<a class="resena-link" href="${enlace}" target="_blank" rel="noopener" style="margin-top:0.5rem;">Comprar →</a>` : ''}
      </div>
    </div>`;
}


// ============================================================
// SECCIÓN 10 — ESTADOS DE LA INTERFAZ
// ============================================================

/**
 * Muestra un spinner de carga animado dentro del contenedor indicado.
 * Se llama al inicio de cada petición para dar retroalimentación visual.
 * @param {HTMLElement} c - Elemento contenedor donde mostrar el spinner
 */
function mostrarCargando(c) {
  c.innerHTML = '<div class="spinner"></div>';
}

/**
 * Muestra un estado vacío (sin resultados) con icono y mensaje personalizado.
 * Se usa cuando la petición fue exitosa pero la API no retornó datos.
 * @param {HTMLElement} c   - Elemento contenedor
 * @param {string}      msg - Mensaje descriptivo para el usuario (acepta HTML)
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
 * Muestra un estado de error con icono y mensaje del error capturado.
 * Se usa dentro de los bloques catch para comunicar el problema al usuario.
 * @param {HTMLElement} c   - Elemento contenedor
 * @param {string}      msg - Mensaje de error (generado en fetchNYT o en la función llamante)
 */
function mostrarError(c, msg) {
  c.innerHTML = `
    <div class="state-box error">
      <span class="state-icon">⚠️</span>
      <div class="state-title">Ocurrió un error</div>
      <div class="state-msg">${msg}</div>
    </div>`;
}


// ============================================================
// SECCIÓN 11 — NAVEGACIÓN Y SIDEBAR
// ============================================================

/**
 * Activa una sección del contenido principal y actualiza el estado visual del sidebar.
 *
 * Oculta todas las secciones (.section) y muestra solo la solicitada.
 * Actualiza el botón activo del sidebar y el título en la barra superior.
 * En pantallas pequeñas, cierra automáticamente el sidebar.
 *
 * @param {string}      id  - ID de la sección a mostrar (sin el prefijo 'sec-')
 * @param {HTMLElement} btn - Botón del sidebar que disparó la navegación
 */
function mostrarSeccion(id, btn) {
  // Desactivar todas las secciones
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Activar la sección solicitada
  document.getElementById(`sec-${id}`).classList.add('active');

  // Actualizar el estado visual del nav del sidebar
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Actualizar el título de la barra superior
  const topbarTitle = document.getElementById('topbarTitle');
  if (topbarTitle && btn) {
    // Eliminar el emoji del inicio para mostrar solo el texto del botón
    topbarTitle.textContent = btn.textContent.trim().replace(/^[^\s]+\s/, '');
  }

  // En móvil, cerrar el sidebar al navegar para liberar espacio
  if (window.innerWidth <= 768) toggleSidebar(false);
}

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


// ============================================================
// SECCIÓN 12 — MODO OSCURO / CLARO
// ============================================================

/**
 * Alterna entre tema claro y oscuro añadiendo/quitando la clase 'dark' en <body>.
 * Guarda la preferencia en localStorage para recordarla entre sesiones.
 * Actualiza el texto del botón de tema en el sidebar.
 */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('nyt_theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
}

/**
 * Aplica el tema guardado en localStorage al cargar la página.
 * Se llama en DOMContentLoaded para evitar el parpadeo (flash) de tema.
 */
function aplicarTemaGuardado() {
  if (localStorage.getItem('nyt_theme') === 'dark') {
    document.body.classList.add('dark');
    const btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = '☀️ Modo Claro';
  }
}


// ============================================================
// SECCIÓN 13 — NOTIFICACIONES TOAST
// ============================================================

/**
 * Muestra una notificación tipo "toast" en la esquina inferior derecha.
 * Desaparece automáticamente después de 3.5 segundos.
 *
 * @param {string} msg  - Texto del mensaje a mostrar
 * @param {string} tipo - 'error' (rojo), 'success' (verde), '' (neutro)
 */
function mostrarToast(msg, tipo = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${tipo} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}


// ============================================================
// SECCIÓN 14 — UTILIDADES
// ============================================================

/**
 * Formatea una fecha en formato ISO (YYYY-MM-DD) a texto legible en español.
 * Usa la configuración regional colombiana (es-CO).
 *
 * Ejemplo: '2024-03-15' → '15 de marzo de 2024'
 *
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada o el string original si falla el parseo
 */
function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    // Se agrega T00:00:00 para evitar problemas de zona horaria
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return fechaStr; // Si falla, retornar el string tal como vino
  }
}