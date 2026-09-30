const { chromium } = require("playwright");
const logger = require("../utils/logger");

const CHROME_PATH = process.env.TIKTOK_BROWSER_PATH || (
	process.platform === "win32"
		? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
		: "/usr/bin/chromium"
);
let browserPromise = null;

function getBrowser() {
	if (!browserPromise) {
		browserPromise = chromium.launch({
			headless: false,
			executablePath: CHROME_PATH,
			args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--disable-dev-shm-usage"],
		}).catch((error) => {
			browserPromise = null;
			throw error;
		});
	}

	return browserPromise;
}

async function closeBrowser() {
	if (!browserPromise) return;

	const pendingBrowser = browserPromise;
	browserPromise = null;

	try {
		const browser = await pendingBrowser;
		if (browser.isConnected()) await browser.close();
	} catch (error) {
		logger.warn(`No se pudo cerrar Chromium de TikTok: ${error.message}`);
	}
}

function findLatestItem(value, candidates = []) {
	if (!value || typeof value !== "object") return candidates;

	if (value.itemStruct?.id) candidates.push(value.itemStruct);

	for (const child of Object.values(value)) {
		findLatestItem(child, candidates);
	}

	return candidates;
}

function parseProfileData(html) {
	const scripts = html.matchAll(
		/<script[^>]+id=["'](?:SIGI_STATE|__UNIVERSAL_DATA_FOR_REHYDRATION__)["'][^>]*>([\s\S]*?)<\/script>/gi
	);
	const candidates = [];

	for (const match of scripts) {
		try {
			findLatestItem(JSON.parse(match[1]), candidates);
		} catch {
			// TikTok sometimes returns partial state when rate limited.
		}
	}

	return candidates
		.sort((first, second) => Number(second.createTime || 0) - Number(first.createTime || 0))[0] || null;
}

async function getStreamData(username) {
	const cleanUsername = String(username).replace(/^@/, "").trim();
	const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(cleanUsername)}`;
	let page;

	try {
		const browser = await getBrowser();
		page = await browser.newPage({
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
		});

		await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForFunction(
			() => [...document.querySelectorAll("a")].some((link) => link.href.includes("/video/")),
			null,
			{ timeout: 30000 }
		);

		const item = await page.locator('a[href*="/video/"]').evaluateAll((links) => {
			const link = links.find((candidate) => !candidate.innerText.includes("Anclado")) || links[0];
			if (!link) return null;

			const image = link.querySelector("img");
			const title = image?.alt?.split(" creado por ")[0]?.trim() || "Nuevo video";
			const videoId = link.href.match(/\/video\/(\d+)/)?.[1] || null;

			return {
				videoId,
				title,
				url: link.href,
				thumbnail: image?.src || null,
			};
		});

		if (!item?.videoId) {
			throw new Error("TikTok cargó el perfil, pero no se encontró ningún enlace de video");
		}

		return {
			online: true,
			platform: "TikTok",
			streamerName: cleanUsername,
			avatar: null,
			title: item.title,
			url: item.url,
			category: "TikTok",
			viewers: 0,
			thumbnail: item.thumbnail,
			videoId: item.videoId,
			publishedAt: null,
			description: item.title,
		};
	} catch (error) {
		logger.error(`Error consultando TikTok @${cleanUsername}: ${error.message}`);
		return { online: false, error: true, platform: "TikTok", streamerName: cleanUsername, url: profileUrl, videoId: null };
	} finally {
		if (page) {
			await page.close().catch((error) => {
				logger.warn(`No se pudo cerrar la página de TikTok: ${error.message}`);
			});
		}
	}
}

module.exports = { getStreamData, parseProfileData, closeBrowser };
