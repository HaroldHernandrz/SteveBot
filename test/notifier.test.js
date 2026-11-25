const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const { afterEach, test } = require("node:test");

const notifierPath = path.resolve(__dirname, "../src/services/notifier.js");
const mockPaths = [
    path.resolve(__dirname, "../src/utils/logger.js"),
    path.resolve(__dirname, "../src/config.js"),
    path.resolve(__dirname, "../src/embeds/liveEmbed.js"),
    path.resolve(__dirname, "../src/embeds/offlineEmbed.js"),
    path.resolve(__dirname, "../src/embeds/youtubeVideoEmbed.js"),
    path.resolve(__dirname, "../src/utils/colors.js"),
];

function installMock(filePath, exports) {
    const mockedModule = new Module(filePath);
    mockedModule.filename = filePath;
    mockedModule.loaded = true;
    mockedModule.exports = exports;
    require.cache[filePath] = mockedModule;
}

afterEach(() => {
    delete require.cache[notifierPath];
    for (const filePath of mockPaths) {
        delete require.cache[filePath];
    }
});

test("recent-message recovery only matches this bot's active stream embed", async () => {
    installMock(mockPaths[0], { error() {}, warn() {}, success() {}, debug() {} });
    installMock(mockPaths[1], {
        config: { discord: { directosChannelId: "channel-id" } },
    });
    installMock(mockPaths[2], () => ({}));
    installMock(mockPaths[3], () => ({}));
    installMock(mockPaths[4], () => ({}));
    installMock(mockPaths[5], { PLATFORM_REACTION: {} });

    const notifier = require(notifierPath);
    const messages = [
        {
            id: "ended-message",
            author: { id: "bot-id" },
            embeds: [{ url: "https://kick.com/elsteve", footer: { text: "Kick - Desconectado" } }],
        },
        {
            id: "other-bot-message",
            author: { id: "another-bot" },
            embeds: [{ url: "https://kick.com/elsteve", footer: { text: "Kick" } }],
        },
        {
            id: "active-message",
            author: { id: "bot-id" },
            embeds: [{ url: "https://kick.com/elsteve", footer: { text: "Kick" } }],
        },
    ];
    let fetchOptions;
    const client = {
        user: { id: "bot-id" },
        channels: {
            fetch: async () => ({
                messages: {
                    fetch: async (options) => {
                        fetchOptions = options;
                        return messages;
                    },
                },
            }),
        },
    };

    const messageId = await notifier.findRecentLiveMessage(client, "kick", {
        url: "https://kick.com/elsteve",
    });

    assert.equal(messageId, "active-message");
    assert.deepEqual(fetchOptions, { limit: 100 });
});
