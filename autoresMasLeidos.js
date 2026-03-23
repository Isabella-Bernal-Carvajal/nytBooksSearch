/**
 * js/autoresMasLeidos.js — Sección "Autores más leídos"
 * =======================================================
 * Calcula qué autores tienen más libros en las listas actuales
 * del NYT y los muestra con su conteo y libros destacados.
 *
 * El "más leído" se determina por presencia en las listas:
 * un autor con 3 libros distintos en Best Sellers esta semana
 * aparece antes que uno con 1 solo libro.
 *
 * Depende de: js/config.js (CATEGORIAS_ACTIVAS, IMG_FALLBACK)
 *             js/api.js    (fetchNYT)
 *             js/ui.js     (mostrarCargando, mostrarError)
 *             js/modal.js  (abrirModalLibro)
 */

/**
 * Carga todas las categorías, agrupa por autor y muestra el ranking.
 * Se llama al hacer clic en la sección "Autores más leídos".
 */
async function cargarAutoresMasLeidos() {
    const contenedor = document.getElementById('resultado-autores');
    mostrarCargando(contenedor);

    try {
        // Descargar todas las categorías en paralelo
        const peticiones = CATEGORIAS_ACTIVAS.map(cat =>
        fetchNYT(`/lists/current/${cat.value}.json`)
            .then(d => d.results?.books || [])
            .catch(() => [])
        );

        const resultados = await Promise.all(peticiones);
        const todosLosLibros = resultados.flat();

        if (todosLosLibros.length === 0) {
        mostrarVacio(contenedor, 'No se pudieron cargar los datos de autores.');
        return;
        }

        // Agrupar libros por autor
        const mapaAutores = {};
        todosLosLibros.forEach(libro => {
        const autor = libro.author || libro.contributor;
        if (!autor) return;
        if (!mapaAutores[autor]) {
            mapaAutores[autor] = { autor, libros: [], totalSemanas: 0 };
        }
        // Evitar el mismo libro duplicado por múltiples listas
        const yaExiste = mapaAutores[autor].libros.some(l => l.primary_isbn13 === libro.primary_isbn13);
        if (!yaExiste) {
            mapaAutores[autor].libros.push(libro);
            mapaAutores[autor].totalSemanas += (libro.weeks_on_list || 0);
        }
    });

    // Ordenar por cantidad de libros en listas (luego por semanas totales como desempate)
    const ranking = Object.values(mapaAutores)
        .sort((a, b) => b.libros.length - a.libros.length || b.totalSemanas - a.totalSemanas)
        .slice(0, 20);

        if (ranking.length === 0) {
        mostrarVacio(contenedor, 'No hay datos suficientes para calcular el ranking de autores.');
        return;
        }

        contenedor.innerHTML = ranking.map((entrada, i) => crearTarjetaAutor(entrada, i + 1)).join('');

    } catch (err) {
        mostrarError(contenedor, err.message);
    }
}

/**
 * Genera la tarjeta HTML para un autor en el ranking.
 * Muestra posición, nombre, cantidad de libros, semanas acumuladas
 * y una fila de portadas de sus libros en las listas actuales.
 *
 * @param {Object} entrada - { autor, libros[], totalSemanas }
 * @param {number} posicion - Posición en el ranking (1, 2, 3...)
 * @returns {string} HTML de la tarjeta
 */
function crearTarjetaAutor(entrada, posicion) {
    const { autor, libros, totalSemanas } = entrada;

    const portadasHTML = libros.slice(0, 4).map(libro => {
        const portada = libro.book_image || IMG_FALLBACK;
        const libroEnc = encodeURIComponent(JSON.stringify(libro));
        return `
        <div class="autor-libro-mini" onclick="abrirModalLibro('${libroEnc}')" title="${libro.title}">
            <img src="${portada}" alt="${libro.title}"
                onerror="this.src='${IMG_FALLBACK}'">
            <span>${libro.title}</span>
        </div>`;
    }).join('');

    const medallaSVG = posicion === 1
        ? '🥇' : posicion === 2 ? '🥈' : posicion === 3 ? '🥉' : `#${posicion}`;

    return `
        <div class="autor-card">
        <div class="autor-card-header">
            <span class="autor-posicion">${medallaSVG}</span>
            <div class="autor-info">
            <div class="autor-nombre">${autor}</div>
            <div class="autor-stats">
                <span>📚 ${libros.length} libro(s) en listas</span>
                ${totalSemanas ? `<span>📅 ${totalSemanas} semanas acumuladas</span>` : ''}
            </div>
            </div>
        </div>
        <div class="autor-libros-row">${portadasHTML}</div>
    </div>`;
}