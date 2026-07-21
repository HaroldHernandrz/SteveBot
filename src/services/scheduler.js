/**
 * Scheduler - Ejecuta comprobaciones periódicas
 */

const checkAllPlatforms = require("./checker");
const logger = require("../utils/logger");
const { config } = require("../config");

let interval = null;

async function start(client) {
    logger.info("🤖 Iniciando monitor...");

    const enabledPlatforms = Object.keys(config.platforms)
        .filter((p) => config.platforms[p].enabled)
        .map((p) => p.toUpperCase());

    logger.info(`📡 Plataformas habilitadas: ${enabledPlatforms.join(", ")}`);

    // Primera comprobación
    await checkAllPlatforms(client);

    logger.info("ℹ️ Comprobación inicial finalizada");

    // Comprobaciones periódicas
    interval = setInterval(async () => {
        try {
            await checkAllPlatforms(client);
        } catch (err) {
            logger.error(err.message);
        }
    }, config.updateInterval);
}

function stop() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }

    logger.info("📛 Scheduler detenido");
}

module.exports = {
    start,
    stop,
};