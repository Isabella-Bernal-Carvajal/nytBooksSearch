/**
 * js/utilidades.js — Funciones de ayuda genéricas
 * =================================================
 * Funciones pequeñas y reutilizables que no pertenecen
 * a ningún módulo específico.
 *
 * Si necesitas agregar una función de formato, conversión
 * o validación, ponla aquí.
 *
 * Depende de: ningún otro módulo js/
 */

/**
 * Convierte una fecha en formato ISO (YYYY-MM-DD) a texto legible en español.
 * Usa la configuración regional colombiana (es-CO).
 *
 * Ejemplo:
 *   formatearFecha('2024-03-15')  →  '15 de marzo de 2024'
 *   formatearFecha('')            →  ''
 *
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada, o el string original si el parseo falla
 */
function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  try {
    // Se agrega T00:00:00 para evitar desfases de zona horaria
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-CO', {
      year:  'numeric',
      month: 'long',
      day:   'numeric'
    });
  } catch {
    return fechaStr;
  }
}