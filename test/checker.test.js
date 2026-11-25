const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");
const { afterEach, test } = require("node:test");

const checkerPath = path.resolve(__dirname, "../src/services/checker.js");
const mockPaths = [
    path.resolve(__dirname, "../src/config.js"),
    path.resolve(__dirname, "../src/services/stateManager.js"),
    path.resolve(__dirname, "../src/services/notifier.js"),
    path.resolve(__dirname, "../src/utils/logger.js"),
    path.resolve(__dirname, "../src/platforms/kick.js"),
];

function installMock(filePath, exports) {
    const mockedModule = new Module(filePath);
    mockedModule.filename = filePath;
    mockedModule.loaded = true;
    mockedModule.exports = exports;
    require.cache[filePath] = mockedModule;
}

function createHarness(initialState, recoveredMessageId = null, recoveryError = null) {
    let state = { ...initialState };
    let streamData = {
        online: true,
        platform: "Kick",
        streamerName: "ElSteve",
        title: "Directo",
        url: "https://kick.com/elsteve",
        category: "Just Chatting",
        startedAt: "2026-11-24T00:00:00Z",
    };
    let sendCount = 0;
    const edits = [];

    installMock(mockPaths[0], {
        config: {
            platforms: { kick: { enabled: true, username: "elsteve" } },
            updateInterval: 30000,
            debug: false,
        },
    });
    installMock(mockPaths[1], {
        getPlatformState: () => ({ ...state }),
        updatePlatformState: (_platform, updates) => {
            state = { ...state, ...updates };
            return state;
        },
        resetPlatformState: () => {
            state = {
                online: false,
                messageId: null,
                streamData: null,
                startedAt: null,
                lastUpdate: null,
                offlineCount: 0,
                offlineSinceAt: null,
            };
        },
    });
    installMock(mockPaths[2], {
        findRecentLiveMessage: async () => {
            if (recoveryError) {
                throw recoveryError;
            }
            return recoveredMessageId;
        },
        send: async () => {
            sendCount += 1;
            return `message-${sendCount}`;
        },
        edit: async (_client, _platform, messageId, data) => {
            edits.push({ messageId, data });
        },
    });
    installMock(mockPaths[3], {
        info() {},
        success() {},
        warn() {},
        error() {},
        debug() {},
    });
    installMock(mockPaths[4], {
        getStreamData: async () => streamData,
    });
    delete require.cache[checkerPath];

    return {
        checker: require(checkerPath),
        get state() {
            return state;
        },
        set state(nextState) {
            state = nextState;
        },
        set streamData(nextData) {
            streamData = nextData;
        },
        get sendCount() {
            return sendCount;
        },
        edits,
    };
}

afterEach(() => {
    delete require.cache[checkerPath];
    for (const filePath of mockPaths) {
        delete require.cache[filePath];
    }
});

test("Kick ignores transient offline results and start-time changes, but closes a confirmed stream", async () => {
    const harness = createHarness({
        online: true,
        messageId: "existing-message",
        streamData: {
            title: "Directo",
            streamerName: "ElSteve",
            category: "Just Chatting",
            url: "https://kick.com/elsteve",
            avatar: null,
            thumbnail: null,
            startedAt: "2026-11-24T00:00:00Z",
        },
        startedAt: "2026-11-24T00:00:00Z",
        offlineCount: 0,
        offlineSinceAt: null,
    });
    const client = {};

    harness.streamData = { online: false };
    await harness.checker.checkPlatform("kick", client);
    assert.equal(harness.state.online, true);
    assert.equal(harness.state.offlineCount, 1);
    assert.equal(harness.edits.length, 0);

    harness.state.offlineSinceAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    harness.streamData = {
        online: true,
        platform: "Kick",
        streamerName: "ElSteve",
        title: "Directo",
        url: "https://kick.com/elsteve",
        category: "Just Chatting",
        avatar: null,
        thumbnail: null,
        startedAt: "2026-11-24T00:05:00Z",
    };
    await harness.checker.checkPlatform("kick", client);
    assert.equal(harness.state.online, true);
    assert.equal(harness.state.offlineCount, 0);
    assert.equal(harness.sendCount, 0, "a changed startedAt must not trigger a duplicate alert");

    harness.streamData = { online: false };
    await harness.checker.checkPlatform("kick", client);
    harness.state.offlineSinceAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    for (let i = 1; i < 10; i += 1) {
        await harness.checker.checkPlatform("kick", client);
    }
    assert.equal(harness.state.online, false);
    assert.equal(harness.edits.length, 1, "confirmed offline should mark the existing Discord post finished");

    harness.streamData = {
        online: true,
        platform: "Kick",
        streamerName: "ElSteve",
        title: "Nuevo directo",
        url: "https://kick.com/elsteve",
        category: "Just Chatting",
        startedAt: "2026-11-24T01:00:00Z",
    };
    await harness.checker.checkPlatform("kick", client);
    assert.equal(harness.sendCount, 1, "a new stream after confirmed offline should still be announced");
});

test("startup adopts a recent live message without publishing another", async () => {
    const harness = createHarness({
        online: false,
        messageId: null,
        streamData: null,
        startedAt: null,
        offlineCount: 0,
        offlineSinceAt: null,
    }, "recovered-message");

    await harness.checker.checkPlatform("kick", {}, true);

    assert.equal(harness.sendCount, 0);
    assert.equal(harness.state.online, true);
    assert.equal(harness.state.messageId, "recovered-message");
});

test("a failed Discord history lookup does not trigger a replacement alert", async () => {
    const harness = createHarness({
        online: false,
        messageId: null,
        streamData: null,
        startedAt: null,
        offlineCount: 0,
        offlineSinceAt: null,
    }, null, new Error("Discord unavailable"));

    await harness.checker.checkPlatform("kick", {}, false);

    assert.equal(harness.sendCount, 0);
    assert.equal(harness.state.online, false);
});

test("Kick API errors reset pending offline confirmation", async () => {
    const harness = createHarness({
        online: true,
        messageId: "existing-message",
        streamData: { title: "Directo" },
        offlineCount: 3,
        offlineSinceAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    });
    harness.streamData = { online: false, error: true };

    await harness.checker.checkPlatform("kick", {});

    assert.equal(harness.state.online, true);
    assert.equal(harness.state.offlineCount, 0);
    assert.equal(harness.state.offlineSinceAt, null);
    assert.equal(harness.edits.length, 0);
});

test("offline closure requires both enough samples and elapsed time", () => {
    const { hasConfirmedOffline } = createHarness({
        online: false,
        offlineCount: 0,
    }).checker;
    const offlineSinceAt = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    assert.equal(hasConfirmedOffline({ offlineCount: 9, offlineSinceAt }), false);
    assert.equal(hasConfirmedOffline({
        offlineCount: 10,
        offlineSinceAt: new Date(Date.now() - (5 * 60 - 1) * 1000).toISOString(),
    }), false);
    assert.equal(hasConfirmedOffline({ offlineCount: 10, offlineSinceAt }), true);
});
