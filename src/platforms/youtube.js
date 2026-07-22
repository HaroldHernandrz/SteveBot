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

// Cache de información del canal
let channelCache = {
    avatar: null,
    name: null,
    uploadsPlaylist: null,
};

/**
 * Obtiene la información del canal (solo una vez)
 */
async function getChannelInfo(channelId) {
    if (
        channelCache.avatar &&
        channelCache.name &&
        channelCache.uploadsPlaylist
    ) {
        return channelCache;
    }

    try {
        const { data } = await httpClient.get(
            `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails&id=${channelId}&key=${config.platforms.youtube.apiKey}`
        );

        const channel = data.items?.[0];

        if (!channel) {
            throw new Error("Canal no encontrado");
        }

        channelCache = {
            avatar: channel.snippet?.thumbnails?.default?.url || null,
            name: channel.snippet?.title || "YouTube",
            uploadsPlaylist:
                channel.contentDetails?.relatedPlaylists?.uploads || null,
        };

        return channelCache;
    } catch (error) {
        logger.error(`Error obteniendo información del canal: ${error.message}`);

        return {
            avatar: null,
            name: "YouTube",
            uploadsPlaylist: null,
        };
    }
}

/**
 * Busca el último video subido utilizando la playlist de uploads
 */
async function getLatestUpload(channelId) {
    try {
        const channelInfo = await getChannelInfo(channelId);

        if (!channelInfo.uploadsPlaylist) {
            return null;
        }

        const { data } = await httpClient.get(
            `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${channelInfo.uploadsPlaylist}&maxResults=1&key=${config.platforms.youtube.apiKey}`
        );

        if (!data.items?.length) {
            return null;
        }

        return data.items[0];
    } catch (error) {
        logger.error(`Error obteniendo último upload de YouTube: ${error.message}`);
        return null;
    }
}

/**
 * Obtiene los datos del último video subido
 */
async function getStreamData(channelId) {
    try {
        const latestVideo = await getLatestUpload(channelId);

        if (!latestVideo) {
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

        const snippet = latestVideo.snippet || {};
        const videoId = snippet.resourceId?.videoId;

        const thumbnail =
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            snippet.thumbnails?.default?.url ||
            null;

        const channelInfo = await getChannelInfo(channelId);

        return {
            online: true,
            platform: "YouTube",
            streamerName: channelInfo.name,
            avatar: channelInfo.avatar,
            title: snippet.title || "Nuevo video",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            category: "YouTube",
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