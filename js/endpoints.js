/**
 * js/endpoints.js — Funciones de petición a la NYT Books API
 * ============================================================
 * Cada función corresponde a un endpoint distinto.
 *
 * Depende de: js/config.js, js/api.js, js/ui.js,
 *             js/tarjetas.js, js/utilidades.js
 */

// Estado en memoria para poder re-ordenar sin re-pedir
let _ultimosLibrosBestSellers = [];
let _ultimosLibrosBusquedaTitulo = [];
let _ultimosLibrosBusquedaAutor = [];


// ─────────────────────────────────────────────────────────────
// ENDPOINT 1 — Best Sellers actuales por categoría
// GET /lists/current/{list}.json
// ─────────────────────────────────────────────────────────────

async function librosCategoria() {
  const categoria  = document.getElementById('categoriaSelect').value;
  const contenedor = document.getElementById('resultado-bestsellers');
  mostrarCargando(contenedor);

  try {
    const data   = await fetchNYT(`/lists/current/${categoria}.json`);
    const libros = data.results?.books;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, 'No hay libros disponibles para esta categoría.');
      return;
    }

    _ultimosLibrosBestSellers = libros;
    renderizarBestSellers();

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

/** Re-renderiza best sellers con el orden seleccionado en el <select> */
function aplicarOrdenBestSellers() {
  if (_ultimosLibrosBestSellers.length === 0) return;
  renderizarBestSellers();
}

function renderizarBestSellers() {
  const criterio   = document.getElementById('ordenBestSellers')?.value || 'rank';
  const contenedor = document.getElementById('resultado-bestsellers');
  const ordenados  = ordenarLibros(_ultimosLibrosBestSellers, criterio);
  contenedor.innerHTML = ordenados.map((l, i) => crearTarjetaNYT(l, l.rank || i + 1)).join('');
}


// ─────────────────────────────────────────────────────────────
// ENDPOINT 2 — Best Sellers en una fecha histórica
// GET /lists/{date}/{list}.json
// ─────────────────────────────────────────────────────────────

async function librosPorFecha() {
  const fecha      = document.getElementById('fechaInput').value;
  const categoria  = document.getElementById('categoriaFechaSelect').value;
  const contenedor = document.getElementById('resultado-historial');

  if (!fecha) { mostrarToast('Selecciona una fecha.', 'error'); return; }
  mostrarCargando(contenedor);

  try {
    const data   = await fetchNYT(`/lists/${fecha}/${categoria}.json`);
    const libros = data.results?.books;

    if (!libros || libros.length === 0) {
      mostrarVacio(contenedor, 'No hay datos para esa categoría en la fecha seleccionada.');
      return;
    }

    const criterio = document.getElementById('ordenFecha')?.value || 'rank';
    const ordenados = ordenarLibros(libros, criterio);

    const header = `
      <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                  border-radius:8px;border-left:3px solid var(--accent);font-size:0.88rem;color:var(--text2);">
        📅 Best Sellers del <strong>${formatearFecha(fecha)}</strong>
        — ${data.results?.list_name || categoria}
        — <strong>${libros.length}</strong> libros
      </div>`;

    contenedor.innerHTML = header + ordenados.map((l, i) => crearTarjetaNYT(l, l.rank || i + 1)).join('');

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

/**
 * Carga las fechas disponibles para la categoría seleccionada
 * usando múltiples llamadas hacia atrás para construir el selector.
 * Muestra las fechas ordenadas de más reciente a más antigua (más libros arriba).
 */
async function cargarFechasDisponibles() {
  const selectFechas = document.getElementById('fechasDisponiblesSelect');
  const categoria    = document.getElementById('categoriaFechaSelect').value;
  if (!selectFechas) return;

  selectFechas.innerHTML = '<option disabled selected>Cargando fechas…</option>';
  selectFechas.disabled = true;

  // Generar fechas hacia atrás desde hoy en intervalos de 7 días (listas semanales)
  // La API retorna datos desde 2011-02-13
  const fechas = [];
  const hoy = new Date();
  for (let i = 0; i < 52; i++) { // Últimas 52 semanas (~1 año)
    const d = new Date(hoy);
    d.setDate(d.getDate() - i * 7);
    fechas.push(d.toISOString().split('T')[0]);
  }

  try {
    // Verificar cuáles fechas tienen datos (muestreando algunas en paralelo)
    const muestreo = fechas.slice(0, 12);
    const checks = await Promise.all(
      muestreo.map(f =>
        fetchNYT(`/lists/${f}/${categoria}.json`)
          .then(d => ({ fecha: f, count: d.results?.books?.length || 0 }))
          .catch(() => ({ fecha: f, count: 0 }))
      )
    );

    // Ordenar de mayor a menor cantidad de libros
    const conDatos = checks
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);

    if (conDatos.length === 0) {
      selectFechas.innerHTML = '<option disabled>Sin datos disponibles</option>';
      return;
    }

    selectFechas.innerHTML =
      '<option value="" disabled selected>Selecciona una semana</option>' +
      conDatos.map(c =>
        `<option value="${c.fecha}">${formatearFecha(c.fecha)} — ${c.count} libro(s)</option>`
      ).join('');

    selectFechas.disabled = false;

    // Al seleccionar una fecha del selector, actualizar el input de fecha
    selectFechas.onchange = () => {
      const val = selectFechas.value;
      if (val) {
        document.getElementById('fechaInput').value = val;
        librosPorFecha();
      }
    };

  } catch (err) {
    selectFechas.innerHTML = '<option disabled>Error al cargar fechas</option>';
  }
}


// ─────────────────────────────────────────────────────────────
// ENDPOINT 3 — Resumen general semanal
// GET /lists/overview.json
// ─────────────────────────────────────────────────────────────

async function overview() {
  const contenedor = document.getElementById('resultado-overview');
  mostrarCargando(contenedor);

  try {
    const data   = await fetchNYT('/lists/overview.json');
    const listas = data.results?.lists;

    if (!listas || listas.length === 0) {
      mostrarVacio(contenedor, 'No se encontró el resumen semanal.');
      return;
    }

    const fecha = data.results?.bestsellers_date || '';
    let html = `
      <p style="color:var(--text3);font-size:0.85rem;margin-bottom:1.5rem;">
        Semana del <strong>${formatearFecha(fecha)}</strong> — ${listas.length} listas disponibles
      </p>`;

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


// ─────────────────────────────────────────────────────────────
// ENDPOINTS 4 y 5 — Buscar por título / Buscar por autor
// GET /lists/current/{list}.json ×N en paralelo + filtro local
// ─────────────────────────────────────────────────────────────

async function buscarEnBestSellers(tipo) {
  const inputId      = tipo === 'titulo' ? 'resenaTituloInput' : 'autorInput';
  const contenedorId = tipo === 'titulo' ? 'resultado-resenas' : 'resultado-autor';
  const contenedor   = document.getElementById(contenedorId);
  const query        = document.getElementById(inputId).value.trim().toLowerCase();

  // Ocultar autocompletado al lanzar búsqueda
  ocultarSugerencias(tipo === 'titulo' ? 'sugerenciasTitulo' : 'sugerenciasAutor');

  if (!query) { mostrarToast('Ingresa un término de búsqueda.', 'error'); return; }
  mostrarCargando(contenedor);

  try {
    const peticiones = CATEGORIAS_BUSQUEDA.map(cat =>
      fetchNYT(`/lists/current/${cat}.json`)
        .then(data => ({
          libros:      data.results?.books || [],
          listaNombre: data.results?.list_name || cat
        }))
        .catch(() => ({ libros: [], listaNombre: cat }))
    );

    const resultados = await Promise.all(peticiones);

    const encontrados = [];
    const vistos      = new Set();

    resultados.forEach(({ libros, listaNombre }) => {
      libros.forEach(libro => {
        const campo = tipo === 'titulo'
          ? (libro.title || '').toLowerCase()
          : (libro.author || libro.contributor || '').toLowerCase();
        const clave = libro.primary_isbn13 || libro.title;

        if (campo.includes(query) && !vistos.has(clave)) {
          vistos.add(clave);
          encontrados.push({ ...libro, _listaNombre: listaNombre });
        }
      });
    });

    // Guardar para re-ordenar sin re-pedir
    if (tipo === 'titulo') _ultimosLibrosBusquedaTitulo = encontrados;
    else                   _ultimosLibrosBusquedaAutor  = encontrados;

    if (encontrados.length === 0) {
      mostrarVacio(contenedor,
        `No se encontró "<strong>${query}</strong>" en los Best Sellers actuales.<br>
         <small>Solo aparecen libros que están en las listas esta semana.</small>`);
      return;
    }

    renderizarResultadosBusqueda(tipo, encontrados, query);

  } catch (err) {
    mostrarError(contenedor, err.message);
  }
}

/** Re-renderiza los resultados de búsqueda con el nuevo orden */
function aplicarOrdenBusqueda(tipo) {
  const libros = tipo === 'titulo'
    ? _ultimosLibrosBusquedaTitulo
    : _ultimosLibrosBusquedaAutor;

  if (libros.length === 0) return;

  const inputId = tipo === 'titulo' ? 'resenaTituloInput' : 'autorInput';
  const query   = document.getElementById(inputId)?.value?.trim() || '';
  renderizarResultadosBusqueda(tipo, libros, query);
}

function renderizarResultadosBusqueda(tipo, librosOriginal, query) {
  const contenedorId = tipo === 'titulo' ? 'resultado-resenas' : 'resultado-autor';
  const contenedor   = document.getElementById(contenedorId);
  const ordenId      = tipo === 'titulo' ? 'ordenBusquedaTitulo' : 'ordenBusquedaAutor';
  const criterio     = document.getElementById(ordenId)?.value || 'rank';
  const ordenados    = ordenarLibros(librosOriginal, criterio);

  const header = `
    <div style="margin-bottom:1rem;padding:0.75rem 1rem;background:var(--surface);
                border-radius:8px;border-left:3px solid var(--accent);font-size:0.88rem;color:var(--text2);">
      🔎 <strong>${librosOriginal.length}</strong> resultado(s) para
      "<strong>${query}</strong>" en las listas NYT actuales
    </div>`;

  contenedor.innerHTML = header + ordenados.map(l => crearTarjetaBestSellerBusqueda(l)).join('');
}