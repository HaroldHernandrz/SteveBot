/**
 * Notifier - Maneja el envío y edición de mensajes de Discord para múltiples plataformas
 */

const logger = require("../utils/logger");
const { config } = require("../config");
const createKickLiveEmbed = require("../embeds/liveEmbed");
const createKickOfflineEmbed = require("../embeds/offlineEmbed");
const createYouTubeVideoEmbed = require("../embeds/youtubeVideoEmbed");

/**
 * Obtiene el canal de Discord configurado
 */
async function getChannel(client, platform) {
    try {
        let channelId;

        switch (platform) {
            case "kick":
                channelId = config.discord.directosChannelId;
                break;

            case "youtube":
                channelId = config.discord.videosChannelId;
                break;

            default:
                throw new Error(`Plataforma no soportada: ${platform}`);
        }

        const channel = await client.channels.fetch(channelId);

        if (!channel) {
            throw new Error(`Canal no encontrado: ${channelId}`);
        }

        return channel;
    } catch (error) {
        logger.error(`Error al obtener canal: ${error.message}`);
        throw error;
    }
}

/**
 * Envía un nuevo mensaje
 */
async function send(client, platform, streamData) {
    try {
        const channel = await getChannel(client, platform);

        const embed = platform === "youtube"
            ? createYouTubeVideoEmbed(streamData)
            : createKickLiveEmbed(platform, streamData);

        let roleId = null;

        if (platform === "kick") {
            roleId = config.discord.directosRoleId;
        } else if (platform === "youtube") {
            roleId = config.discord.videosRoleId;
        }

        const messageData = {
            ...embed,
        };

        if (roleId) {
            messageData.content = `<@&${roleId}>\n\n${embed.content}`;
            messageData.allowedMentions = {
                roles: [roleId],
            };
        }

        const message = await channel.send(messageData);

        logger.success(`📨 [${platform.toUpperCase()}] Mensaje enviado: ${message.id}`);

        return message.id;
    } catch (error) {
        logger.error(`Error al enviar mensaje (${platform}): ${error.message}`);
        throw error;
    }
}

/**
 * Edita un mensaje existente
 */
async function edit(client, platform, messageId, streamData) {
    try {
        const channel = await getChannel(client, platform);
        const message = await channel.messages.fetch(messageId);

        const embed = platform === "youtube"
            ? createYouTubeVideoEmbed(streamData)
            : streamData.online
                ? createKickLiveEmbed(platform, streamData)
                : createKickOfflineEmbed(platform, streamData);

        let roleId = null;

        if (platform === "kick") {
            roleId = config.discord.directosRoleId;
        } else if (platform === "youtube") {
            roleId = config.discord.videosRoleId;
        }

        let content = embed.content;

        if (roleId) {
            content = `<@&${roleId}>\n\n${embed.content}`;
        }

        await message.edit({
            content,
            embeds: embed.embeds,
            files: embed.files ?? [],
            allowedMentions: {
                parse: [], // No vuelve a hacer ping al editar
            },
        });

        logger.debug(`✏️ [${platform.toUpperCase()}] Mensaje ${messageId} actualizado`);
    } catch (error) {
        logger.warn(`No se pudo editar mensaje (${platform}) ${messageId}: ${error.message}`);

        if (error.code === 10008) {
            logger.info(`[${platform.toUpperCase()}] Mensaje borrado, será creado uno nuevo`);
        }
    }
}

module.exports = {
    send,
    edit,
};