/**
 * js/tarjetas.js — Renderizado de tarjetas de libros
 * ====================================================
 * Convierte objetos de libro (JSON de la API) en HTML.
 * Todas las tarjetas incluyen botón "Ver más detalles"
 * que abre el modal con información completa del libro.
 *
 * Depende de: js/config.js (IMG_FALLBACK), js/modal.js (abrirModalLibro)
 */

/**
 * Serializa un objeto libro para pasarlo al modal de forma segura.
 * Usa encodeURIComponent para manejar comillas y caracteres especiales.
 */
function encodarLibro(libro) {
    return encodeURIComponent(JSON.stringify(libro));
}

/**
 * Tarjeta estándar NYT: portada, posición, título, autor, descripción,
 * semanas en lista, enlace de compra y botón "Ver más detalles".
 *
 * @param {Object}  libro    - Objeto libro de data.results.books
 * @param {number}  rank     - Posición en la lista
 * @param {boolean} compacto - Si es true, omite descripción (para overview)
 */
function crearTarjetaNYT(libro, rank = null, compacto = false) {
    const portada  = libro.book_image || IMG_FALLBACK;
    const titulo   = libro.title || 'Sin título';
    const autor    = libro.author || libro.contributor || 'Autor desconocido';
    const desc     = libro.description || '';
    const enlace   = libro.amazon_product_url || libro.buy_links?.[0]?.url || '';
    const semanas  = libro.weeks_on_list;
    const enc      = encodarLibro(libro);

    return `
        <div class="book-card">
        <div class="book-cover-wrap">
            <img class="book-cover" src="${portada}" alt="Portada de ${titulo}"
                loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
            ${rank    ? `<div class="book-rank">${rank}</div>`                : ''}
            ${semanas ? `<div class="book-weeks-badge">${semanas} sem.</div>` : ''}
        </div>
        <div class="book-info">
            <div class="book-title">${titulo}</div>
            <div class="book-author">${autor}</div>
            ${!compacto && desc ? `<div class="book-desc">${desc}</div>` : ''}
            <div class="book-actions">
            <button class="btn-detalle" onclick="abrirModalLibro('${enc}')">Ver más detalles</button>
            ${enlace ? `<a class="book-buy-link" href="${enlace}" target="_blank" rel="noopener">Comprar →</a>` : ''}
            </div>
        </div>
    </div>`;
}

/**
 * Tarjeta horizontal para resultados de búsqueda (por título o por autor).
 * Incluye: portada, nombre de la lista, posición, semanas y botón de detalle.
 *
 * @param {Object} libro - Objeto enriquecido con _listaNombre
 */
function crearTarjetaBestSellerBusqueda(libro) {
    const portada  = libro.book_image || IMG_FALLBACK;
    const titulo   = libro.title || 'Sin título';
    const autor    = libro.author || libro.contributor || 'Autor desconocido';
    const desc     = libro.description || '';
    const enlace   = libro.amazon_product_url || libro.buy_links?.[0]?.url || '';
    const semanas  = libro.weeks_on_list;
    const lista    = libro._listaNombre || '';
    const rank     = libro.rank;
    const enc      = encodarLibro(libro);

    return `
        <div class="resena-card">
        <img class="resena-thumb" src="${portada}" alt="Portada de ${titulo}"
            loading="lazy" onerror="this.src='${IMG_FALLBACK}'"
            style="width:90px;border-radius:6px;cursor:pointer;"
            onclick="abrirModalLibro('${enc}')">
        <div class="resena-info">
            <div class="resena-title">${titulo}</div>
            <div class="resena-author">por ${autor}</div>
            ${desc ? `<div class="resena-summary">${desc}</div>` : ''}
            <div class="resena-meta" style="margin-top:0.5rem;">
            ${lista   ? `<span>📋 ${lista}</span>`             : ''}
            ${rank    ? `<span>🏆 Posición #${rank}</span>`    : ''}
            ${semanas ? `<span>📅 ${semanas} semana(s)</span>` : ''}
            </div>
            <div class="book-actions" style="margin-top:0.6rem;">
            <button class="btn-detalle" onclick="abrirModalLibro('${enc}')">Ver más detalles</button>
            ${enlace ? `<a class="resena-link" href="${enlace}" target="_blank" rel="noopener">Comprar →</a>` : ''}
            </div>
        </div>
    </div>`;
}

/**
 * Ordena un array de libros según el criterio seleccionado.
 * Modifica el array en su lugar y retorna una copia ordenada.
 *
 * Criterios disponibles:
 *   'rank'     → por posición en lista (ascendente, por defecto)
 *   'az'       → orden alfabético A→Z por título
 *   'za'       → orden alfabético Z→A por título
 *   'autor-az' → orden alfabético A→Z por autor
 *   'autor-za' → orden alfabético Z→A por autor
 *   'semanas'  → más semanas en lista primero
 *
 * @param {Object[]} libros   - Array de objetos libro
 * @param {string}   criterio - Criterio de ordenamiento
 * @returns {Object[]} Nuevo array ordenado
 */
function ordenarLibros(libros, criterio) {
    const copia = [...libros];
    switch (criterio) {
        case 'az':
        return copia.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        case 'za':
        return copia.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        case 'autor-az':
        return copia.sort((a, b) =>
            (a.author || a.contributor || '').localeCompare(b.author || b.contributor || ''));
        case 'autor-za':
        return copia.sort((a, b) =>
            (b.author || b.contributor || '').localeCompare(a.author || a.contributor || ''));
        case 'semanas':
        return copia.sort((a, b) => (b.weeks_on_list || 0) - (a.weeks_on_list || 0));
        case 'rank':
        default:
        return copia.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }
}