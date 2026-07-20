/**
 * Live Embed - Construye el embed de Discord para streams en vivo
 */

const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const { PLATFORM_COLORS, PLATFORM_EMOJI } = require("../utils/colors");
const { truncate } = require("../utils/formatter");

const DEFAULT_BANNER_NAME = "360.jpg";
const DEFAULT_BANNER_PATH = path.join(__dirname, "../assets/images", DEFAULT_BANNER_NAME);

function createLiveEmbed(platform, streamData) {
    const platformLower = platform.toLowerCase();
    const color = PLATFORM_COLORS[platformLower] || 0x2B2D31;
    const emoji = PLATFORM_EMOJI[platformLower] || "📡";
    const platformName =
        platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: streamData.streamerName,
            iconURL: streamData.avatar || undefined,
        })
        .setTitle(truncate(streamData.title || "Sin título", 256))
        .setURL(streamData.url)
        .addFields({
            name: "Categoría",
            value: streamData.category || "Sin categoría",
            inline: false,
        })
        .setThumbnail(streamData.avatar || null);

    const files = [];

    if (streamData.thumbnail) {
        embed.setImage(streamData.thumbnail);
    } else if (fs.existsSync(DEFAULT_BANNER_PATH)) {
        const bannerAttachment = new AttachmentBuilder(DEFAULT_BANNER_PATH).setName(DEFAULT_BANNER_NAME);

        files.push(bannerAttachment);

        embed.setImage(`attachment://${DEFAULT_BANNER_NAME}`);
    }

    embed
        .setFooter({
            text: platformName,
        })
        .setTimestamp();

    return {
        content:
`${emoji} **${streamData.streamerName} está en directo. ¡Anda a verlo!**

${streamData.url}`,
        embeds: [embed],
        files,
    };
}

module.exports = createLiveEmbed;