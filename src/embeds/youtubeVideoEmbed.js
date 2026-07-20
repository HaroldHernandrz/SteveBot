/**
 * YouTube Video Embed - Construye el embed para videos de YouTube
 */

const { EmbedBuilder } = require("discord.js");
const { PLATFORM_COLORS, PLATFORM_EMOJI } = require("../utils/colors");
const { truncate } = require("../utils/formatter");

function createYouTubeVideoEmbed(streamData) {
    const color = PLATFORM_COLORS.youtube || 0xff0000;
    const emoji = PLATFORM_EMOJI.youtube || "❤️";

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
            name: streamData.streamerName,
            iconURL: streamData.avatar || undefined,
        })
        .setTitle(truncate(streamData.title || "Nuevo video de YouTube", 256))
        .setURL(streamData.url)
        .setThumbnail(streamData.avatar || null)
        .setTimestamp(streamData.publishedAt ? new Date(streamData.publishedAt) : new Date())
        .setFooter({ text: "YouTube" });

    if (streamData.description) {
        embed.setDescription(truncate(streamData.description, 2048));
    }

    if (streamData.thumbnail) {
        embed.setImage(streamData.thumbnail);
    }

    const fields = [];
    if (streamData.publishedAt) {
        fields.push({
            name: "Publicado",
            value: new Date(streamData.publishedAt).toLocaleString("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
            }),
            inline: true,
        });
    }

    fields.push({
        name: "Canal",
        value: streamData.streamerName || "YouTube",
        inline: true,
    });

    if (fields.length) {
        embed.addFields(fields);
    }

    return {
        content: `${emoji} **Nuevo video en YouTube**\n\n${streamData.url}`,
        embeds: [embed],
    };
}

module.exports = createYouTubeVideoEmbed;
