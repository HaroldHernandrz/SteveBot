const { EmbedBuilder } = require("discord.js");
const { PLATFORM_COLORS, PLATFORM_EMOJI } = require("../utils/colors");
const { truncate } = require("../utils/formatter");

function createTikTokVideoEmbed(streamData) {
	const embed = new EmbedBuilder()
		.setColor(PLATFORM_COLORS.tiktok || 0x010101)
		.setAuthor({ name: streamData.streamerName || "TikTok", iconURL: streamData.avatar || undefined })
		.setTitle(truncate(streamData.title || "Nuevo video de TikTok", 256))
		.setURL(streamData.url)
		.setThumbnail(streamData.avatar || null)
		.setTimestamp(streamData.publishedAt ? new Date(streamData.publishedAt) : new Date())
		.setFooter({ text: "TikTok" });

	if (streamData.description) embed.setDescription(truncate(streamData.description, 2048));
	if (streamData.thumbnail) embed.setImage(streamData.thumbnail);

	embed.addFields({
		name: "Cuenta",
		value: streamData.streamerName || "TikTok",
		inline: true,
	});

	return {
		content: `${PLATFORM_EMOJI.tiktok || "🎵"} **Nuevo video en TikTok**\n\n${streamData.url}`,
		embeds: [embed],
	};
}

module.exports = createTikTokVideoEmbed;
