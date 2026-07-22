/**
 * Checker - Verifica el estado de múltiples plataformas simultáneamente
 */

const logger = require("../utils/logger");
const { config } = require("../config");
const { getState, getPlatformState, updatePlatformState, resetPlatformState } = require("./stateManager");
const notifier = require("./notifier");

/**
 * Obtiene el módulo de la plataforma indicada
 * @param {string} platform - kick, youtube
 * @returns {Object}
 */
function getPlatformModule(platform) {
    try {
        return require(`../platforms/${platform}`);
    } catch (error) {
        logger.error(`No se pudo cargar plataforma ${platform}: ${error.message}`);
        return null;
    }
}

function isNewLiveSession(platformState, streamData) {
    const previousStartedAt = platformState.streamData?.startedAt || platformState.startedAt || null;
    const currentStartedAt = streamData.startedAt || null;
    const startedAtChanged = Boolean(currentStartedAt && previousStartedAt && currentStartedAt !== previousStartedAt);
    const hadOfflineConfirmation = (platformState.offlineCount || 0) > 0;

    return startedAtChanged || hadOfflineConfirmation;
}

function hasMeaningfulChanges(previousData, nextData) {
    if (!previousData || !nextData) {
        return true;
    }

    const fieldsToCompare = [
        "title",
        "category",
        "thumbnail",
        "url",
        "streamerName",
        "avatar",
    ];

    return fieldsToCompare.some((field) => previousData[field] !== nextData[field]);
}

/**
 * Chequea una plataforma específica
 * @param {string} platform - kick, youtube
 * @param {import('discord.js').Client} client
 * @returns {Promise<void>}
 */
async function checkPlatform(platform, client) {
    try {
        const platformConfig = config.platforms[platform];
        if (!platformConfig.enabled) {
            return;
        }

        const module = getPlatformModule(platform);
        if (!module) {
            return;
        }

        // Obtener credenciales según plataforma
        let credential;
        switch (platform) {
            case "kick":
                credential = platformConfig.username;
                break;
            case "youtube":
                credential = platformConfig.channelId;
                break;
        }

        if (!credential) {
            return;
        }

        // Obtener datos del stream / video
        const streamData = await module.getStreamData(credential);
        const platformState = getPlatformState(platform);

        if (platform === "youtube") {
        if (!streamData.online) {
        logger.debug(`⚫ [${platform.toUpperCase()}] No se encontró video nuevo`);
        return;
    }

        const lastVideoId = platformState.streamData?.videoId;

        if (streamData.videoId === lastVideoId) {
        logger.debug(`🧭 [${platform.toUpperCase()}] El último video ya fue notificado`);
        return;
    }
        logger.info(`🟢 [${platform.toUpperCase()}] Nuevo video: "${streamData.title}"`);
        await notifier.send(client, platform, streamData);

        updatePlatformState(platform, {
        streamData,
        lastUpdate: new Date().toISOString(),
    });

    return;
}

        // Lógica para Kick en vivo
        if (!streamData.online && !platformState.online) {
            logger.debug(`⚫ ${platform} sigue desconectado`);
            return;
        }

        if (streamData.online && !platformState.online) {
            logger.info(`🟢 [${platform.toUpperCase()}] ¡Nuevo directo! "${streamData.title}"`);
            const messageId = await notifier.send(client, platform, streamData);
            updatePlatformState(platform, {
                online: true,
                offlineCount: 0,
                messageId,
                streamData,
                startedAt: new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
            });
            return;
        }

        if (streamData.online && platformState.online) {
            if (isNewLiveSession(platformState, streamData)) {
                logger.info(`🟢 [${platform.toUpperCase()}] Nuevo directo detectado tras una sesión anterior`);
                const messageId = await notifier.send(client, platform, streamData);
                updatePlatformState(platform, {
                    online: true,
                    offlineCount: 0,
                    messageId,
                    streamData,
                    startedAt: streamData.startedAt || new Date().toISOString(),
                    lastUpdate: new Date().toISOString(),
                });
                return;
            }

            if (hasMeaningfulChanges(platformState.streamData, streamData)) {
                logger.info(`🔄 [${platform.toUpperCase()}] Cambios detectados en el directo, actualizando mensaje`);
                if (platformState.messageId) {
                    await notifier.edit(client, platform, platformState.messageId, streamData);
                }
            } else {
                logger.debug(`🧭 [${platform.toUpperCase()}] Sin cambios relevantes en el directo`);
            }
            updatePlatformState(platform, {
                offlineCount: 0,
                streamData,
                lastUpdate: new Date().toISOString(),
            });
            return;
        }

        if (!streamData.online && streamData.error) {
            logger.warn(`⚠️ [${platform.toUpperCase()}] Error al consultar la API de ${platform}, no se marcará como desconectado.`);
            return;
        }

        if (!streamData.online && platformState.online) {
            const offlineCount = (platformState.offlineCount || 0) + 1;
            updatePlatformState(platform, { offlineCount });

            if (offlineCount < 2) {
                logger.warn(`⚠️ [${platform.toUpperCase()}] Posible desconexión temporal (#${offlineCount}) - esperando confirmación.`);
                return;
            }

            logger.success(`🔴 [${platform.toUpperCase()}] Stream finalizado`);

            const offlineData = {
                ...platformState.streamData,
                online: false,
                endedAt: new Date().toISOString(),
                title: platformState.streamData?.title || "Directo finalizado",
                url: platformState.streamData?.url || `https://kick.com/${platformConfig.username}`,
                category: platformState.streamData?.category || "Sin categoría",
            };

            if (platformState.messageId) {
                await notifier.edit(client, platform, platformState.messageId, offlineData);
            }

            resetPlatformState(platform);
            return;
        }
    } catch (error) {
        logger.error(`Error en checker (${platform}): ${error.message}`);
        if (config.debug) {
            console.error(error);
        }
    }
}

/**
 * Chequea TODAS las plataformas configuradas en paralelo
 * @param {import('discord.js').Client} client
 */
async function checkAllPlatforms(client) {
    const enabledPlatforms = Object.keys(config.platforms)
        .filter(p => config.platforms[p].enabled);

    // Ejecutar checks en paralelo
    await Promise.all(
        enabledPlatforms.map(platform => checkPlatform(platform, client))
    );
}

module.exports = checkAllPlatforms;
module.exports.checkAllPlatforms = checkAllPlatforms;
module.exports.checkPlatform = checkPlatform;
module.exports.isNewLiveSession = isNewLiveSession;
