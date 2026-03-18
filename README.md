# NYT Books Explorer 📚

**Ejercicio de Programación: Explorando la API de Libros del New York Times**
Aprendiz: Isabella Bernal Carvajal

---

## Descripción

Aplicación web que consume la **NYT Books API** para explorar los libros más vendidos del New York Times. Permite consultar las listas de Best Sellers actuales e históricas, y buscar títulos o autores dentro de esas listas.

Desarrollada con HTML5, CSS3 y JavaScript vanilla (sin frameworks), e incluye diseño responsivo, modo oscuro y caché local de peticiones.

---

## Instrucciones de ejecución

Esta aplicación no requiere servidor ni instalación de dependencias. Solo necesitas un navegador moderno.

**Pasos:**

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Isabella-Bernal-Carvajal/nytBooksSearch.git
   cd nytBooksSearch
   ```

2. Abre el archivo `index.html` directamente en tu navegador:
   - Doble clic sobre el archivo, o
   - Arrástralo a una ventana del navegador, o
   - En VS Code: clic derecho → *Open with Live Server*

3. La aplicación cargará automáticamente con la API Key configurada.

---

## Configuración de la API Key

> ⚠️ **Importante:** Nunca subas tu API Key a un repositorio público en GitHub.

### Opción 1 — API Key embebida (configuración actual)
La clave está definida como constante en `app.js`:
```js
const DEFAULT_API_KEY = 'TU_API_KEY_AQUI';
```

### Opción 2 — Variable de entorno (recomendado para producción)
Si se despliega con un backend o servidor local, reemplaza la constante por:
```js
const DEFAULT_API_KEY = process.env.NYT_API_KEY;
```
Y crea un archivo `.env` en la raíz del proyecto:
```
NYT_API_KEY=tu_clave_aqui
```
Agrega `.env` a tu `.gitignore` para que nunca se suba al repositorio.

### Opción 3 — Ingreso manual en la app
Haz clic en **🔑 Cambiar API Key** en el pie del sidebar. La clave se guarda en `localStorage` del navegador y persiste entre sesiones.

### Cómo obtener una API Key
1. Regístrate en [developer.nytimes.com](https://developer.nytimes.com)
2. Ve a *My Apps* → *New App*
3. Activa la **Books API**
4. Copia la clave generada

---

## Endpoints utilizados

La aplicación usa exclusivamente los endpoints de la NYT Books API que tienen **CORS habilitado** para peticiones desde el navegador, lo que garantiza que todas las funciones operen sin dependencias externas.

| # | Endpoint | Método | Descripción | Sección en la app |
|---|----------|--------|-------------|-------------------|
| 1 | `/lists/current/{list}.json` | GET | Retorna los Best Sellers actuales de una categoría específica. El parámetro `{list}` se toma del `<select>` de la interfaz. | **Best Sellers** |
| 2 | `/lists/{date}/{list}.json` | GET | Retorna los Best Sellers de una categoría en una fecha histórica. Fecha mínima disponible: 2011-02-13. | **Por Fecha** |
| 3 | `/lists/overview.json` | GET | Retorna el top 5 de todas las listas de Best Sellers de la semana actual en una sola respuesta. | **Resumen General** |
| 4 | `/lists/current/{list}.json` ×10 | GET | Se consultan 10 categorías en paralelo con `Promise.all()` y se filtran los libros cuyo **título** contenga el término buscado. | **Buscar por Título** |
| 5 | `/lists/current/{list}.json` ×10 | GET | Mismo mecanismo que el endpoint 4, pero el filtro se aplica sobre el campo **autor**. | **Buscar por Autor** |

### Nota técnica sobre CORS
Los endpoints `/reviews.json`, `/lists/names.json` y `/lists/best-sellers/history.json` no incluyen el header `Access-Control-Allow-Origin` en sus respuestas, por lo que el navegador bloquea esas peticiones. Los 5 endpoints implementados son los únicos que funcionan directamente desde el browser sin necesidad de un servidor intermediario (proxy).

---

## Estructura del proyecto

```
nytBooksSearch/
├── index.html   → Estructura HTML: secciones, formularios y contenedores de resultados
├── style.css    → Estilos: diseño editorial, modo oscuro, layout responsivo
├── app.js       → Lógica JavaScript: peticiones HTTP, renderizado y navegación
└── README.md    → Este archivo
```

---

## Funcionalidades implementadas

### Requeridas por el taller
- ✅ Menú de navegación lateral con 5 secciones claramente diferenciadas
- ✅ Entrada de datos por parte del usuario (selects, inputs de texto y fecha)
- ✅ Peticiones HTTP a la NYT Books API incluyendo la API Key en cada llamada
- ✅ Procesamiento de la respuesta JSON y extracción de campos relevantes
- ✅ Presentación visual organizada con portadas (imagen genérica si no hay portada)
- ✅ Manejo de errores: API Key inválida (401), límite excedido (429), recurso no encontrado (404), campo vacío y sin resultados
- ✅ Código documentado con comentarios JSDoc y secciones explicativas

### Funcionalidades extra
- ✅ **Modo oscuro / claro** con persistencia en `localStorage`
- ✅ **Caché local** de peticiones con TTL de 5 minutos para respetar el límite de la API
- ✅ **Diseño responsivo** adaptado a escritorio, tablet y móvil con sidebar tipo drawer
- ✅ **Deduplicación** de resultados en búsquedas (un libro en varias listas se muestra una sola vez)
- ✅ **Peticiones paralelas** con `Promise.all()` para las búsquedas por título y autor

---

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura semántica de la interfaz |
| CSS3 | Diseño visual, variables CSS, animaciones, grid y flexbox |
| JavaScript ES6+ | Lógica de la aplicación: fetch, async/await, Promise.all, localStorage |
| NYT Books API | Fuente de datos de Best Sellers |
| Google Fonts | Tipografías Playfair Display y DM Sans |

---

## Capturas de pantalla

*(Agregar capturas de pantalla mostrando al menos 4 consultas diferentes)*

1. `screenshot-bestsellers.png` — Sección Best Sellers con lista Combined Print & E-Book Fiction
2. `screenshot-overview.png` — Resumen General con múltiples listas
3. `screenshot-buscar-titulo.png` — Búsqueda por título con resultados
4. `screenshot-buscar-autor.png` — Búsqueda por autor con resultados
5. `screenshot-fecha.png` — Consulta histórica por fecha

---

## Límites de la API gratuita

| Límite | Valor |
|---|---|
| Peticiones por minuto | 10 |
| Peticiones por día | 500 |
| Fecha histórica mínima | 13 de febrero de 2011 |

La app maneja el error 429 (límite superado) mostrando un mensaje descriptivo al usuario y tiene caché local para minimizar peticiones repetidas.
