/**
 * Scheduler - Ejecuta una comprobación puntual de plataformas sin un intervalo activo
 */

const checkAllPlatforms = require('./checker');
const logger = require('../utils/logger');
const { config } = require('../config');

/**
 * Ejecuta una comprobación inmediata al iniciar
 * @param {import('discord.js').Client} client
 */
async function start(client) {
  logger.info('🤖 Iniciando comprobación puntual de plataformas...');

  const enabledPlatforms = Object.keys(config.platforms)
    .filter(p => config.platforms[p].enabled)
    .map(p => p.toUpperCase());

  logger.info(`📡 Plataformas habilitadas: ${enabledPlatforms.join(', ')}`);

  await checkAllPlatforms(client);
  logger.info('ℹ️ Comprobación inicial finalizada');
}

/**
 * Detiene el scheduler
 */
function stop() {
  logger.info('📛 Comprobación puntual detenida');
}

module.exports = {
  start,
  stop,
};
