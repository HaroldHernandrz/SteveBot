/**
 * Checker - Verifica el estado de múltiples plataformas simultáneamente
 */

const logger = require("../utils/logger");
const { config } = require("../config");
const { getPlatformState, updatePlatformState, resetPlatformState } = require("./stateManager");
const notifier = require("./notifier");

const OFFLINE_CONFIRMATION_MS = 5 * 60 * 1000;
const OFFLINE_CONFIRMATION_COUNT = Math.max(
    3,
    Math.ceil(OFFLINE_CONFIRMATION_MS / config.updateInterval)
);
const checksInProgress = new Set();

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

function hasConfirmedOffline(platformState, now = Date.now()) {
    if ((platformState.offlineCount || 0) < OFFLINE_CONFIRMATION_COUNT) {
        return false;
    }

    const offlineSince = Date.parse(platformState.offlineSinceAt || "");
    return Number.isFinite(offlineSince) && now - offlineSince >= OFFLINE_CONFIRMATION_MS;
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
async function checkPlatform(platform, client, isInitialCheck = false) {
    if (checksInProgress.has(platform)) {
        logger.debug(`Se omite comprobación concurrente de ${platform}`);
        return;
    }

    checksInProgress.add(platform);
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

        if (!lastVideoId) {
            logger.info(`🧭 [${platform.toUpperCase()}] Último video guardado como referencia; no se enviará aviso al iniciar`);
            updatePlatformState(platform, {
                streamData,
                lastUpdate: new Date().toISOString(),
            });
            return;
        }

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

        // Kick timestamps can change during an ongoing live, so only a confirmed offline period ends a session.
        if (streamData.online) {
            let messageId = platformState.messageId || null;

            if (!platformState.online || (isInitialCheck && !messageId)) {
                messageId = await notifier.findRecentLiveMessage(client, platform, streamData);

                if (messageId) {
                    logger.info(`🧭 [${platform.toUpperCase()}] Aviso activo recuperado: ${messageId}`);
                } else if (!platformState.online && isInitialCheck) {
                    logger.info(`🧭 [${platform.toUpperCase()}] Directo actual guardado como referencia; no se enviará un aviso duplicado al iniciar`);
                } else if (!platformState.online) {
                    logger.info(`🟢 [${platform.toUpperCase()}] ¡Nuevo directo! "${streamData.title}"`);
                    messageId = await notifier.send(client, platform, streamData);
                }
            }

            if (hasMeaningfulChanges(platformState.streamData, streamData)) {
                logger.info(`🔄 [${platform.toUpperCase()}] Cambios detectados en el directo, actualizando mensaje`);
                if (messageId) {
                    await notifier.edit(client, platform, messageId, streamData);
                }
            } else {
                logger.debug(`🧭 [${platform.toUpperCase()}] Sin cambios relevantes en el directo`);
            }
            updatePlatformState(platform, {
                online: true,
                offlineCount: 0,
                offlineSinceAt: null,
                messageId,
                streamData,
                startedAt: streamData.startedAt || platformState.startedAt || new Date().toISOString(),
                lastUpdate: new Date().toISOString(),
            });
            return;
        }

        if (!streamData.online && streamData.error) {
            if (platformState.online && platformState.offlineCount) {
                updatePlatformState(platform, {
                    offlineCount: 0,
                    offlineSinceAt: null,
                });
            }
            logger.warn(`⚠️ [${platform.toUpperCase()}] Error al consultar la API de ${platform}, no se marcará como desconectado.`);
            return;
        }

        if (!streamData.online && platformState.online) {
            const offlineCount = (platformState.offlineCount || 0) + 1;
            const previousOfflineSince = Date.parse(platformState.offlineSinceAt || "");
            const offlineSinceAt = Number.isFinite(previousOfflineSince)
                ? platformState.offlineSinceAt
                : new Date().toISOString();
            updatePlatformState(platform, { offlineCount, offlineSinceAt });

            if (!hasConfirmedOffline({ ...platformState, offlineCount, offlineSinceAt })) {
                if (offlineCount === 1) {
                    logger.warn(`⚠️ [${platform.toUpperCase()}] Kick no detecta el directo; esperando hasta 5 minutos de confirmación antes de cerrarlo.`);
                } else {
                    logger.debug(`⚠️ [${platform.toUpperCase()}] Confirmación de desconexión ${offlineCount}/${OFFLINE_CONFIRMATION_COUNT}`);
                }
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
    } finally {
        checksInProgress.delete(platform);
    }
}

/**
 * Chequea TODAS las plataformas configuradas en paralelo
 * @param {import('discord.js').Client} client
 */
async function checkAllPlatforms(client, isInitialCheck = false) {
    const enabledPlatforms = Object.keys(config.platforms)
        .filter(p => config.platforms[p].enabled);

    // Ejecutar checks en paralelo
    await Promise.all(
        enabledPlatforms.map(platform => checkPlatform(platform, client, isInitialCheck))
    );
}

module.exports = checkAllPlatforms;
module.exports.checkAllPlatforms = checkAllPlatforms;
module.exports.checkPlatform = checkPlatform;
module.exports.hasConfirmedOffline = hasConfirmedOffline;
