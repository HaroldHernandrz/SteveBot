/**
 * Scheduler - Ejecuta comprobaciones periódicas por plataforma
 */

const { checkAllPlatforms, checkPlatform } = require("./checker");
const logger = require("../utils/logger");
const { config } = require("../config");

let kickInterval = null;
let youtubeInterval = null;

async function start(client) {
    logger.info("🤖 Iniciando monitor...");

    const enabledPlatforms = Object.keys(config.platforms)
        .filter((p) => config.platforms[p].enabled)
        .map((p) => p.toUpperCase());

    logger.info(`📡 Plataformas habilitadas: ${enabledPlatforms.join(", ")}`);

    // Primera comprobación
    await checkAllPlatforms(client);

    logger.info("ℹ️ Comprobación inicial finalizada");

    // Kick
    if (config.platforms.kick.enabled) {
        kickInterval = setInterval(async () => {
            try {
                await checkPlatform("kick", client);
            } catch (err) {
                logger.error(err.message);
            }
        }, config.updateInterval);

        logger.info(`🟢 Kick cada ${config.updateInterval / 1000}s`);
    }

    // YouTube
    if (config.platforms.youtube.enabled) {
        youtubeInterval = setInterval(async () => {
            try {
                await checkPlatform("youtube", client);
            } catch (err) {
                logger.error(err.message);
            }
        }, 300000); // 5 minutos

        logger.info("🔴 YouTube cada 5 minutos");
    }
}

function stop() {
    if (kickInterval) {
        clearInterval(kickInterval);
        kickInterval = null;
    }

    if (youtubeInterval) {
        clearInterval(youtubeInterval);
        youtubeInterval = null;
    }

    logger.info("📛 Scheduler detenido");
}

module.exports = {
    start,
    stop,
};