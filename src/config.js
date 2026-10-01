require("dotenv").config();
const logger = require("./utils/logger");

/**
 * Configuración centralizada del bot
 * Monitorea múltiples plataformas simultáneamente
 */
const config = {
    discord: {
        token: process.env.TOKEN,
        clientId: process.env.CLIENT_ID,

        directosChannelId: process.env.DIRECTOS_CHANNEL_ID,
        videosChannelId: process.env.VIDEOS_CHANNEL_ID,

        directosRoleId: process.env.DIRECTOS_ROLE_ID,
        videosRoleId: process.env.VIDEOS_ROLE_ID,
},

    streamer: {
        name: process.env.STREAMER_NAME || "ElSteve",
    },

    // Plataformas a monitorear (todas simultáneamente)
    platforms: {
        kick: {
            enabled: process.env.KICK_USERNAME ? true : false,
            username: process.env.KICK_USERNAME || null,
        },
        youtube: {
            enabled: (process.env.YOUTUBE_CHANNEL_ID && process.env.YOUTUBE_API_KEY) ? true : false,
            channelId: process.env.YOUTUBE_CHANNEL_ID || null,
            apiKey: process.env.YOUTUBE_API_KEY || null,
        },
    },

    // Intervalo de monitoreo en milisegundos
    updateInterval: Number(process.env.UPDATE_INTERVAL_MS) || 30000,

    // Debug mode
    debug: process.env.DEBUG === "true",
};

/**
 * Valida que exista al menos una plataforma configurada
 */
function validateConfig() {
    const errors = [];

    if (!config.discord.token) {
        errors.push("TOKEN (Discord Bot Token)");
    }

    if (!config.discord.directosChannelId) {
        errors.push("DIRECTOS_CHANNEL_ID (ID del canal de directos)");
    }

    if (!config.discord.videosChannelId) {
        errors.push("VIDEOS_CHANNEL_ID (ID del canal de videos)");
    }

    // Verificar que al menos una plataforma está configurada
    const enabledPlatforms = Object.entries(config.platforms)
        .filter(([, p]) => p.enabled)
        .map(([name]) => name);

    if (enabledPlatforms.length === 0) {
        errors.push("Debe configurar al menos una plataforma: KICK_USERNAME o YOUTUBE_CHANNEL_ID+YOUTUBE_API_KEY");
    }

    if (errors.length > 0) {
        logger.error(`Faltan variables de entorno: ${errors.join(", ")}`);
        process.exit(1);
    }
}

module.exports = { config, validateConfig };