/**
 * js/autocomplete.js — Autocompletado para búsqueda por título y autor
 * ======================================================================
 * A medida que el usuario escribe en los inputs de búsqueda,
 * muestra sugerencias extraídas de todos los libros cargados
 * en las listas actuales de NYT Best Sellers.
 *
 * Estrategia:
 *   1. Al cargar la app, descarga todas las categorías en segundo plano
 *      y construye un índice de títulos y autores únicos.
 *   2. Cada vez que el usuario escribe ≥2 caracteres, filtra ese índice
 *      y muestra hasta 8 sugerencias debajo del input.
 *   3. No hace peticiones adicionales durante la búsqueda — trabaja
 *      solo con los datos ya cargados en memoria.
 *
 * Depende de: js/config.js (CATEGORIAS_BUSQUEDA), js/api.js (fetchNYT)
 */

/** Índice de sugerencias construido al cargar la app */
const indiceTitulos  = new Set();
const indiceAutores  = new Set();
let indiceListoTitulos = false;
let indiceListoAutores = false;

/**
 * Descarga todas las categorías en paralelo y construye el índice
 * de títulos y autores únicos. Se llama una sola vez desde main.js.
 * Es silenciosa — si falla, simplemente no habrá autocompletado.
 */
async function construirIndiceAutocomplete() {
    try {
        const peticiones = CATEGORIAS_BUSQUEDA.map(cat =>
        fetchNYT(`/lists/current/${cat}.json`)
            .then(d => d.results?.books || [])
            .catch(() => [])
        );
        const resultados = await Promise.all(peticiones);

        resultados.flat().forEach(libro => {
        if (libro.title)                        indiceTitulos.add(libro.title);
        if (libro.author || libro.contributor)  indiceAutores.add(libro.author || libro.contributor);
        });

        indiceListoTitulos = true;
        indiceListoAutores = true;
    } catch {
        // Fallo silencioso — el resto de la app sigue funcionando
    }
}

/**
 * Muestra sugerencias de autocompletado debajo del input indicado.
 * Se llama con oninput desde el HTML.
 *
 * @param {string} inputId    - ID del input que el usuario está escribiendo
 * @param {string} listaId    - ID del <ul> donde mostrar las sugerencias
 * @param {'titulo'|'autor'}  tipo - Qué índice usar
 */
function mostrarSugerencias(inputId, listaId, tipo) {
    const input  = document.getElementById(inputId);
    const lista  = document.getElementById(listaId);
    const query  = input.value.trim().toLowerCase();

    // Ocultar si hay menos de 2 caracteres
    if (query.length < 2) {
        lista.innerHTML = '';
        lista.classList.remove('visible');
        return;
    }

    const indice = tipo === 'titulo' ? indiceTitulos : indiceAutores;
    const sugerencias = [...indice]
        .filter(s => s.toLowerCase().includes(query))
        .sort((a, b) => {
        // Priorizar las que empiezan con el query sobre las que solo lo contienen
        const aEmpieza = a.toLowerCase().startsWith(query);
        const bEmpieza = b.toLowerCase().startsWith(query);
        if (aEmpieza && !bEmpieza) return -1;
        if (!aEmpieza && bEmpieza) return 1;
        return a.localeCompare(b);
        })
        .slice(0, 8);

    if (sugerencias.length === 0) {
        lista.innerHTML = '';
        lista.classList.remove('visible');
        return;
    }

    lista.innerHTML = sugerencias.map(s => {
        // Resaltar la parte que coincide con el query
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const resaltado = s.replace(regex, '<mark>$1</mark>');
        return `<li onclick="seleccionarSugerencia('${inputId}', '${listaId}', \`${s.replace(/`/g, "'")}\`)">${resaltado}</li>`;
    }).join('');

    lista.classList.add('visible');
}

/**
 * Rellena el input con la sugerencia seleccionada y oculta la lista.
 */
function seleccionarSugerencia(inputId, listaId, valor) {
    document.getElementById(inputId).value = valor;
    ocultarSugerencias(listaId);
    }

    /** Oculta la lista de sugerencias */
    function ocultarSugerencias(listaId) {
    const lista = document.getElementById(listaId);
    lista.innerHTML = '';
    lista.classList.remove('visible');
    }

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', e => {
    ['sugerenciasTitulo', 'sugerenciasAutor'].forEach(id => {
        const lista = document.getElementById(id);
        if (lista && !lista.contains(e.target)) ocultarSugerencias(id);
    });
});