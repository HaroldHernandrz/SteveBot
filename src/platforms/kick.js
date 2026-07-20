/**
 * Kick Live Stream API Integration
 * Obtiene información en tiempo real de canales en vivo en Kick
 */

const axios = require("axios");
const logger = require("../utils/logger");

const KICK_API_BASE = "https://kick.com/api/v2/channels";

// Cliente HTTP con configuración para Kick
const httpClient = axios.create({
    timeout: 10000,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
    },
});

/**
 * Obtiene los datos de un stream en Kick
 * @param {string} username - Nombre de usuario en Kick
 * @returns {Promise<Object>} Datos normalizados del stream
 */
async function getStreamData(username) {
    try {
        const { data } = await httpClient.get(`${KICK_API_BASE}/${username}`);

        const livestream = data?.livestream;
        const isLive = livestream && livestream.is_live === true;

        return {
            online: isLive,
            platform: "Kick",
            streamerName: data?.user?.username || username,
            avatar: data?.user?.profile_pic || null,
            title: livestream?.session_title || "Sin título",
            url: `https://kick.com/${username}`,
            category: livestream?.categories?.[0]?.name || "Sin categoría",
            viewers: livestream?.viewer_count ?? 0,
            thumbnail: null,
            startedAt: livestream?.created_at || null,
        };
    } catch (error) {
        logger.error(`Error en Kick API (${username}): ${error.message}`);
        
        // Devolver error para evitar traducciones falsas de live -> offline
        return {
            online: false,
            error: true,
            platform: "Kick",
            streamerName: username,
            avatar: null,
            title: null,
            url: `https://kick.com/${username}`,
            category: null,
            viewers: 0,
            thumbnail: null,
            startedAt: null,
        };
    }
}

module.exports = { getStreamData };
