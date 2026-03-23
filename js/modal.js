/**
 * js/modal.js — Modal de detalles de libro
 * ==========================================
 * Muestra toda la información disponible de un libro en un modal
 * emergente al hacer clic en "Ver más detalles".
 * Extrae cada campo del objeto JSON que retorna la NYT Books API.
 *
 * Depende de: js/config.js (IMG_FALLBACK)
 */

/**
 * Abre el modal con la información completa del libro seleccionado.
 * Extrae todos los campos disponibles en el JSON de la NYT Books API.
 *
 * Campos que muestra (si están presentes):
 *   title, author/contributor, description, book_image,
 *   publisher, primary_isbn13, primary_isbn10,
 *   weeks_on_list, rank, rank_last_week, weeks_on_list,
 *   amazon_product_url, buy_links[]
 *
 * @param {string} libroJson - Objeto libro serializado como JSON string
 */
function abrirModalLibro(libroJson) {
  const libro = JSON.parse(decodeURIComponent(libroJson));

  const portada   = libro.book_image || IMG_FALLBACK;
  const titulo    = libro.title       || 'Sin título';
  const autor     = libro.author      || libro.contributor || 'Autor desconocido';
  const desc      = libro.description || 'Sin descripción disponible.';
  const editorial = libro.publisher   || '';
  const isbn13    = libro.primary_isbn13 || '';
  const isbn10    = libro.primary_isbn10 || '';
  const semanas   = libro.weeks_on_list;
  const rank      = libro.rank;
  const rankAnterior = libro.rank_last_week;
  const enlaceAmazon = libro.amazon_product_url || '';
  const buyLinks  = libro.buy_links || [];
  const lista     = libro._listaNombre || '';

  // Construir sección de dónde comprar
  const linksCompra = buyLinks.length
    ? buyLinks.map(l =>
        `<a href="${l.url}" target="_blank" rel="noopener" class="modal-buy-btn">${l.name}</a>`
      ).join('')
    : enlaceAmazon
      ? `<a href="${enlaceAmazon}" target="_blank" rel="noopener" class="modal-buy-btn">Amazon</a>`
      : '';

  // Tendencia: subió, bajó o es nuevo en la lista
  let tendencia = '';
  if (rank && rankAnterior) {
    if (rankAnterior === 0) {
      tendencia = '<span class="modal-badge nuevo">🆕 Nuevo en lista</span>';
    } else if (rank < rankAnterior) {
      tendencia = `<span class="modal-badge subio">▲ Subió ${rankAnterior - rank} puesto(s)</span>`;
    } else if (rank > rankAnterior) {
      tendencia = `<span class="modal-badge bajo">▼ Bajó ${rank - rankAnterior} puesto(s)</span>`;
    } else {
      tendencia = '<span class="modal-badge igual">― Sin cambio</span>';
    }
  }

  document.getElementById('modalContenido').innerHTML = `
    <div class="modal-libro-layout">
      <div class="modal-libro-izq">
        <img src="${portada}" alt="Portada de ${titulo}"
            class="modal-portada" onerror="this.src='${IMG_FALLBACK}'">
        ${rank ? `<div class="modal-rank">#${rank} en lista</div>` : ''}
        ${tendencia}
        ${semanas ? `<div class="modal-meta-item">📅 <strong>${semanas}</strong> sem. en lista</div>` : ''}
      </div>
      <div class="modal-libro-der">
        <h2 class="modal-titulo">${titulo}</h2>
        <p class="modal-autor">por <strong>${autor}</strong></p>
        ${lista ? `<p class="modal-lista">📋 ${lista}</p>` : ''}
        <p class="modal-desc">${desc}</p>
        <div class="modal-datos">
          ${editorial ? `<div class="modal-dato"><span>Editorial</span><span>${editorial}</span></div>` : ''}
          ${isbn13    ? `<div class="modal-dato"><span>ISBN-13</span><span>${isbn13}</span></div>` : ''}
          ${isbn10    ? `<div class="modal-dato"><span>ISBN-10</span><span>${isbn10}</span></div>` : ''}
          ${rankAnterior !== undefined && rankAnterior !== null
              ? `<div class="modal-dato"><span>Posición anterior</span><span>${rankAnterior === 0 ? 'Nueva entrada' : '#' + rankAnterior}</span></div>`
              : ''}
        </div>
        ${linksCompra ? `
          <div class="modal-comprar">
            <p class="modal-comprar-label">Dónde comprar:</p>
            <div class="modal-buy-links">${linksCompra}</div>
          </div>` : ''}
      </div>
    </div>`;

  document.getElementById('modalDetalle').classList.add('activo');
  document.body.style.overflow = 'hidden'; // Bloquear scroll del fondo
}

/** Cierra el modal de detalles y restaura el scroll de la página */
function cerrarModal() {
  document.getElementById('modalDetalle').classList.remove('activo');
  document.body.style.overflow = '';
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarModal();
});