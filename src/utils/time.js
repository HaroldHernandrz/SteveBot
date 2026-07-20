/**
 * Utilidades para cálculos de tiempo
 */

/**
 * Pausa la ejecución durante el tiempo indicado
 * @param {number} ms - Milisegundos
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula el tiempo transcurrido desde un inicio hasta ahora (o un fin específico)
 * @param {Date|string|number} startTime - Inicio (Date, ISO string, o timestamp)
 * @param {Date|string|number} [endTime] - Fin (opcional, default: ahora)
 * @returns {number} Milisegundos transcurridos
 */
function getElapsedTime(startTime, endTime = Date.now()) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.max(0, end - start);
}

/**
 * Obtiene un timestamp en formato Discord (Unix timestamp de 10 dígitos)
 * @param {Date|string|number} [date] - Fecha (default: ahora)
 * @returns {number}
 */
function getDiscordTimestamp(date = Date.now()) {
  return Math.floor(new Date(date).getTime() / 1000);
}

/**
 * Formatea un tiempo relativo para Discord usando timestamps
 * @param {Date|string|number} date
 * @returns {string} Formato Discord: <t:timestamp:R>
 */
function formatDiscordRelativeTime(date) {
  const timestamp = getDiscordTimestamp(date);
  return `<t:${timestamp}:R>`;
}

module.exports = {
  sleep,
  getElapsedTime,
  getDiscordTimestamp,
  formatDiscordRelativeTime,
};
