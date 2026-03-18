const API_KEY = "QGUSy23kEHYAAuAzT44K2V1J7klf3XAmKnErAezz6JI44Foa"
let categoria = "combined-print-and-e-book-fiction"
const resultado = document.getElementById("resultado")
const mensaje = document.getElementById("mensaje")

function mostrarError(texto){
    mensaje.innerHTML=`<div class="error">${texto}</div>`
}

function limpiar(){
    mensaje.innerHTML=""
    resultado.innerHTML=""
}


function crearCardLibro(libro,fecha){
    return `
    <div class="card">

    <img src="${libro.book_image}" />
    <h3>${libro.title}</h3>

    <div class="meta">
    Autor: ${libro.author}<br>
    Rank: ${libro.rank}<br>
    Semanas en lista: ${libro.weeks_on_list}<br>
    Actualizado: ${fecha || "Actual"}
    </div>

    <div class="descripcion">
    ${libro.description || "Sin descripción"}
    </div>

    </div>
    `
}

let librosCache = []
librosCache = data.results.books


// endpoint 1 - Listas Disponibles
async function listasDisponibles(){
    limpiar()
    const url=`https://api.nytimes.com/svc/books/v3/lists/names.json?api-key=${API_KEY}`

    try{
        const res=await fetch(url)
        const data=await res.json()

        if(!data.results){
        mostrarError("No se pudieron cargar las listas")
        return
        }

        resultado.innerHTML=data.results.map(l=>
        `<div class="card"><h3>${l.display_name}</h3></div>`
        ).join("")
    }catch{
        mostrarError("Error conectando con la API")
    }
}

function cambiarCategoria(){
    categoria =
    document.getElementById("categoriaSelect").value

    librosCategoria()
}

// endpoint 2 - Libros por categoría(Combined Print & E-book fiction)
async function librosCategoria(){
    limpiar()

    const url=`https://api.nytimes.com/svc/books/v3/lists/current/${categoria}.json?api-key=${API_KEY}`

    const res = await fetch(url)
    const data = await res.json()
    librosCache = data.results.books

    resultado.innerHTML = librosCache
    .map(b=>crearCardLibro(b,data.results.updated))
    .join("")
}

function buscarLibro(){
    const texto = document
    .getElementById("buscarLibroInput")
    .value
    .toLowerCase()

    if(!texto){
    mostrarError("Escribe algo para buscar")
    return
    }

    const filtrados = librosCache.filter(libro =>
    libro.title.toLowerCase().includes(texto)
    )

    if(filtrados.length===0){
    mostrarError("No se encontraron libros")
    return
    }

    resultado.innerHTML = filtrados
    .map(b=>crearCardLibro(b))
    .join("")
}

// endpoint 3 - libros por fecha
async function librosPorFecha(){
    limpiar()
    const fecha=document.getElementById("fechaInput").value

    if(!fecha){
        mostrarError("Selecciona una fecha")
        return
    }

    const url=`https://api.nytimes.com/svc/books/v3/lists/${fecha}/${categoria}.json?api-key=${API_KEY}`

    try{
        const res=await fetch(url)
        const data=await res.json()

        resultado.innerHTML=data.results.books
        .map(b=>crearCardLibro(b,fecha))
        .join("")

    }catch{
        mostrarError("No hay datos para esa fecha")
    }
}

// endpoint 4 - buscar reseña por título
async function buscarResenaTitulo(){
    limpiar()
    const titulo=document.getElementById("tituloInput").value

    if(!titulo){
        mostrarError("Escribe un título")
        return
    }

    const url=`https://api.nytimes.com/svc/books/v3/reviews.json?title=${encodeURIComponent(titulo)}&api-key=${API_KEY}`

    try{
        const res=await fetch(url)
        const data=await res.json()

        if(data.results.length===0){
            mostrarError("No se encontraron reseñas")
            return
        }

        resultado.innerHTML=data.results.map(r=>`
        <div class="card">
        <h3>${r.book_title}</h3>
        <p>${r.book_author}</p>
        <a href="${r.url}" target="_blank">Leer reseña</a>
        </div>
        `).join("")

    }catch{
        mostrarError("Error al buscar reseñas")
    }
}

// endpoint 5 - buscar reseña por autor
async function buscarResenaAutor(){
    limpiar()
    const autor=document.getElementById("autorInput").value

    if(!autor){
        mostrarError("Escribe un autor")
        return
    }

    const url=`https://api.nytimes.com/svc/books/v3/reviews.json?author=${encodeURIComponent(autor)}&api-key=${API_KEY}`

    try{

        const res=await fetch(url)
        const data=await res.json()

        if(data.results.length===0){
        mostrarError("No hay reseñas para ese autor")
        return
        }

        resultado.innerHTML=data.results.map(r=>`
        <div class="card">
        <h3>${r.book_title}</h3>
        <p>${r.book_author}</p>
        <a href="${r.url}" target="_blank">Leer reseña</a>
        </div>
        `).join("")

    }catch{
        mostrarError("Error en la búsqueda")
    }
}

function buscarAutor(){
    const texto = document
    .getElementById("buscarAutorInput")
    .value
    .toLowerCase()

    const filtrados = librosCache.filter(libro =>
    libro.author.toLowerCase().includes(texto)
    )

    if(filtrados.length===0){
    mostrarError("No se encontraron autores")
    return
    }

    resultado.innerHTML = filtrados
    .map(b=>crearCardLibro(b))
    .join("")
}

// endpoint 6 - overview de listas
async function overview(){
    limpiar()

    const url=`https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=${API_KEY}`

    try{
        const res=await fetch(url)
        const data=await res.json()

        let html=""
        data.results.lists.forEach(lista=>{
            html+=`<h2 style="grid-column:1/-1">${lista.list_name}</h2>`

            lista.books.forEach(b=>{
                html+=crearCardLibro(b,lista.updated)
            })
        })

        resultado.innerHTML=html

    }catch{
        mostrarError("No se pudo cargar el resumen")
    }
}