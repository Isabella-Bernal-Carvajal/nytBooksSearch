/**
 * js/config.js
 */

const NYT_BASE = 'https://api.nytimes.com/svc/books/v3';

// Tu API Key por defecto directamente en el código
let DEFAULT_API_KEY = 'QGUSy23kEHYAAuAzT44K2V1J7klf3XAmKnErAezz6JI44Foa';

if (typeof window.NYT_API_KEY !== 'undefined') {
    DEFAULT_API_KEY = window.NYT_API_KEY;
}

const DEFAULT_CATEGORY = 'combined-print-and-e-book-fiction';

const IMG_FALLBACK = 'https://placehold.co/200x300/f0e8d0/5a4f3f?text=Sin+Portada';

const CATEGORIAS_ACTIVAS = [
    { value: 'combined-print-and-e-book-fiction', label: 'Combined Print & E-Book Fiction' },
    { value: 'combined-print-and-e-book-nonfiction', label: 'Combined Print & E-Book Nonfiction' },
    { value: 'hardcover-fiction', label: 'Hardcover Fiction' },
    { value: 'hardcover-nonfiction', label: 'Hardcover Nonfiction' },
    { value: 'trade-fiction-paperback', label: 'Trade Fiction Paperback' },
    { value: 'paperback-nonfiction', label: 'Paperback Nonfiction' },
    { value: 'young-adult-hardcover', label: 'Young Adult Hardcover' },
    { value: 'picture-books', label: 'Picture Books' },
    { value: 'manga', label: 'Manga' }
];

const CATEGORIAS_BUSQUEDA = [
    'combined-print-and-e-book-fiction',
    'combined-print-and-e-book-nonfiction',
    'hardcover-fiction',
    'hardcover-nonfiction'
];

const cache = {};