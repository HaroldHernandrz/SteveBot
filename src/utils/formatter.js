/**
 * Utilidades de formateo para números, duraciones y texto
 */

/**
 * Formatea un número con separadores de miles según locale es-ES
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
  if (typeof num !== 'number' || Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('es-ES').format(num);
}

/**
 * Convierte milisegundos a formato HH:MM:SS
 * @param {number} ms - Milisegundos
 * @returns {string}
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '00:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Trunca un texto a longitud máxima con puntos suspensivos
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
function truncate(text, max) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Capitaliza la primera letra de una palabra
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = {
  formatNumber,
  formatDuration,
  truncate,
  capitalize,
};
