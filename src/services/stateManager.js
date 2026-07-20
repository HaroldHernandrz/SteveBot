/**
 * State Manager - Gestiona la persistencia del estado del bot
 * Maneja múltiples plataformas simultáneamente
 */

const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

/**
 * Estructura inicial del estado con todas las plataformas
 */
const DEFAULT_STATE = {
    platforms: {
        kick: {
            online: false,
            messageId: null,
            streamData: null,
            startedAt: null,
            lastUpdate: null,
            offlineCount: 0,
        },
        youtube: {
            online: false,
            messageId: null,
            streamData: null,
            startedAt: null,
            lastUpdate: null,
            offlineCount: 0,
        },
    },
};

/**
 * Asegura que existe el directorio y archivo de estado
 */
function ensureStateFile() {
    try {
        // Crear directorio si no existe
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            logger.info(`Directorio de datos creado: ${DATA_DIR}`);
        }

        // Crear archivo si no existe
        if (!fs.existsSync(STATE_FILE)) {
            fs.writeFileSync(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 4));
            logger.info(`Archivo de estado creado: ${STATE_FILE}`);
        }
    } catch (error) {
        logger.error(`Error al preparar archivo de estado: ${error.message}`);
        throw error;
    }
}

/**
 * Obtiene el estado actual del bot desde disco
 * @returns {Object}
 */
function getState() {
    try {
        ensureStateFile();
        const data = fs.readFileSync(STATE_FILE, "utf-8");
        if (!data || data.trim() === "") {
            logger.warn("Archivo de estado vacío, usando estado por defecto");
            return JSON.parse(JSON.stringify(DEFAULT_STATE));
        }
        const parsed = JSON.parse(data);
        return parsed || JSON.parse(JSON.stringify(DEFAULT_STATE));
    } catch (error) {
        logger.error(`Error al leer estado: ${error.message}`);
        try {
            const fallback = JSON.parse(JSON.stringify(DEFAULT_STATE));
            return fallback;
        } catch (fallbackError) {
            logger.error(`Error al crear estado de fallback: ${fallbackError.message}`);
            return {
                platforms: {
                    kick: {
                        online: false,
                        messageId: null,
                        streamData: null,
                        startedAt: null,
                        lastUpdate: null,
                    },
                    youtube: {
                        online: false,
                        messageId: null,
                        streamData: null,
                        startedAt: null,
                        lastUpdate: null,
                    },
                },
            };
        }
    }
}

/**
 * Obtiene el estado de una plataforma específica
 * @param {string} platform - kick, youtube
 * @returns {Object}
 */
function getPlatformState(platform) {
    const state = getState();
    if (!state || !state.platforms) {
        logger.warn(`Estado incompleto, retornando default para ${platform}`);
        return DEFAULT_STATE.platforms[platform] || DEFAULT_STATE.platforms.kick;
    }
    return state.platforms[platform] || DEFAULT_STATE.platforms[platform];
}

/**
 * Guarda el estado completo del bot a disco
 * @param {Object} newState - Estado completo
 * @returns {Object}
 */
function saveState(newState) {
    try {
        ensureStateFile();
        fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 4));
        logger.debug("Estado guardado correctamente");
        return newState;
    } catch (error) {
        logger.error(`Error al guardar estado: ${error.message}`);
        return getState();
    }
}

/**
 * Actualiza el estado de una plataforma específica
 * @param {string} platform - kick, youtube
 * @param {Object} updates - Actualizaciones parciales
 * @returns {Object} Estado completo actualizado
 */
function updatePlatformState(platform, updates) {
    const state = getState();
    state.platforms[platform] = {
        ...state.platforms[platform],
        ...updates,
    };
    return saveState(state);
}

/**
 * Reinicia el estado de una plataforma
 * @param {string} platform
 */
function resetPlatformState(platform) {
    return updatePlatformState(platform, DEFAULT_STATE.platforms[platform]);
}

module.exports = {
    getState,
    getPlatformState,
    saveState,
    updatePlatformState,
    resetPlatformState,
};
