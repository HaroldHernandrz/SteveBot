/**
 * YouTube Uploads API Integration
 * Obtiene el último video subido de un canal de YouTube
 */

const axios = require("axios");
const logger = require("../utils/logger");
const { config } = require("../config");

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const httpClient = axios.create({
    timeout: 10000,
    headers: {
        Accept: "application/json",
    },
});

/**
 * Resuelve el channelId real de YouTube a partir de un ID o username
 * @param {string} channelId
 * @returns {Promise<string>}
 */
async function resolveChannelId(channelId) {
    const youtubeApiKey = config.platforms.youtube.apiKey;

    if (channelId.startsWith("UC")) {
        return channelId;
    }

    try {
        const { data } = await httpClient.get(
            `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(channelId)}&maxResults=1&key=${youtubeApiKey}`
        );

        if (!data.items || data.items.length === 0) {
            throw new Error(`No se encontró canal de YouTube: ${channelId}`);
        }

        return data.items[0].snippet.channelId;
    } catch (error) {
        logger.error(`Error resolviendo canal de YouTube: ${error.message}`);
        throw error;
    }
}

/**
 * Busca el último video subido en el canal
 * @param {string} channelId
 * @returns {Promise<Object|null>}
 */
async function getLatestUpload(channelId) {
    try {
        const youtubeApiKey = config.platforms.youtube.apiKey;
        const { data } = await httpClient.get(
            `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=1&key=${youtubeApiKey}`
        );

        if (!data.items || data.items.length === 0) {
            return null;
        }

        return data.items[0];
    } catch (error) {
        logger.error(`Error obteniendo último upload de YouTube: ${error.message}`);
        return null;
    }
}

/**
 * Obtiene los datos del último video subido en YouTube
 * @param {string} channelId - Channel ID o username de YouTube
 * @returns {Promise<Object>} Datos normalizados del video
 */
async function getStreamData(channelId) {
    try {
        const resolvedChannelId = await resolveChannelId(channelId);
        const latestVideo = await getLatestUpload(resolvedChannelId);

        if (!latestVideo) {
            return {
                online: false,
                platform: "YouTube",
                streamerName: "YouTube",
                avatar: null,
                title: null,
                url: `https://www.youtube.com/channel/${resolvedChannelId}`,
                category: null,
                viewers: 0,
                thumbnail: null,
                videoId: null,
                publishedAt: null,
                description: null,
            };
        }

        const snippet = latestVideo.snippet || {};
        const videoId = latestVideo.id?.videoId;
        const thumbnail =
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            null;

        const channelResponse = await httpClient.get(
            `${YOUTUBE_API_BASE}/channels?part=snippet&id=${resolvedChannelId}&key=${config.platforms.youtube.apiKey}`
        );
        const channelSnippet = channelResponse.data?.items?.[0]?.snippet || {};
        const channelAvatar = channelSnippet.thumbnails?.default?.url || null;

        return {
            online: true,
            platform: "YouTube",
            streamerName: snippet.channelTitle || channelSnippet.title || "YouTube",
            avatar: channelAvatar,
            title: snippet.title || "Nuevo video",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            category: snippet.categoryId || "YouTube Video",
            viewers: 0,
            thumbnail,
            videoId,
            publishedAt: snippet.publishedAt || new Date().toISOString(),
            description: snippet.description || "",
        };
    } catch (error) {
        logger.debug(`Error en YouTube uploads (${channelId}): ${error.message}`);
        return {
            online: false,
            platform: "YouTube",
            streamerName: "YouTube",
            avatar: null,
            title: null,
            url: `https://www.youtube.com/channel/${channelId}`,
            category: null,
            viewers: 0,
            thumbnail: null,
            videoId: null,
            publishedAt: null,
            description: null,
        };
    }
}

module.exports = { getStreamData };
