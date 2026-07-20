const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { PLATFORM_COLORS, PLATFORM_EMOJI } = require("../utils/colors");
const { truncate } = require("../utils/formatter");

const DEFAULT_BANNER_NAME = "360.jpg";
const DEFAULT_BANNER_PATH = path.join(__dirname, "../assets/images", DEFAULT_BANNER_NAME);

/**
 * Crea un embed de Discord para cuando un stream se ha desconectado
 * @param {string} platform - kick
 * @param {Object} streamData - Datos normalizados del stream
 * @returns {Object}
 */
function createKickOfflineEmbed(platform, streamData) {
    const platformLower = platform.toLowerCase();
    const color = PLATFORM_COLORS[platformLower] || 0xed4245;
    const emoji = PLATFORM_EMOJI[platformLower] || "🔴";
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: streamData.streamerName,
            iconURL: streamData.avatar || undefined,
        })
        .setTitle(truncate(streamData.title || "Directo finalizado", 256))
        .setURL(streamData.url)
        .addFields({
            name: "Categoría",
            value: streamData.category || "Sin categoría",
            inline: false,
        })
        .setThumbnail(streamData.avatar || null)
        .setDescription("El directo ha finalizado. Mantén el ojo en el canal para el próximo stream.")
        .setFooter({ text: `${platformName} - Desconectado` })
        .setTimestamp(new Date(streamData.endedAt || streamData.startedAt || Date.now()));

    const files = [];
    if (streamData.thumbnail) {
        embed.setImage(streamData.thumbnail);
    } else if (fs.existsSync(DEFAULT_BANNER_PATH)) {
        const bannerAttachment = new AttachmentBuilder(DEFAULT_BANNER_PATH).setName(DEFAULT_BANNER_NAME);
        files.push(bannerAttachment);
        embed.setImage(`attachment://${DEFAULT_BANNER_NAME}`);
    }

    return {
        content:
`${emoji} **${streamData.streamerName} ya no está en vivo.**

${streamData.url}`,
        embeds: [embed],
        files: files,
    };
}

module.exports = createKickOfflineEmbed;
