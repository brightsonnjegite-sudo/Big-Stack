// telegram-bot.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');
const settings = require('./settings');
const { pairWhatsappAccount } = require('./index');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const acrcloud = require('acrcloud');

const FOOTER = '© bigmanj tech ™ with ♥︎';
const BOT_NAME = '🤖 *Bigmanj Telegram Bot*';

const TELEGRAM_DATA_DIR = path.join(__dirname, 'data');
const TELEGRAM_DATA_FILE = path.join(TELEGRAM_DATA_DIR, 'telegramPairs.json');
const TELEGRAM_BASE_URL = (token) => `https://api.telegram.org/bot${token}`;

const AXIOS_DEFAULTS = {
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// ─── HELPER: Exponential backoff ──────────────────────────────
async function tryRequest(getter, attempts = 2) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try { return await getter(); } 
        catch (err) { lastErr = err; if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i)); }
    }
    throw lastErr;
}

// ─── GET YOUTUBE MEDIA URLS ────────────────────────────────────
async function getYoutubeMp3(ytUrl) {
    const apis = [
        async () => {
            const res = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            const formats = res.data?.data?.data?.formats || [];
            const found = formats.find(f => f.type === 'audio' || f.mimeType?.includes('audio')) || formats[formats.length - 1];
            if (found?.url) return found.url;
            throw new Error();
        },
        async () => {
            const res = await axios.get(`https://apiskeith.top/download/audio?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.result || res.data?.url || res.data?.download || res.data?.audio;
        },
        async () => {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.url || res.data?.download;
        }
    ];
    for (const api of apis) {
        try {
            const downloadUrl = await tryRequest(api);
            if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl;
        } catch { continue; }
    }
    throw new Error('API zote za MP3 zimefeli.');
}

async function getYoutubeMp4(ytUrl) {
    const apis = [
        async () => {
            const res = await axios.get(`https://nayan-video-downloader.vercel.app/youtube?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            const formats = res.data?.data?.data?.formats || [];
            const found = formats.find(f => f.type === 'video_with_audio' && f.ext === 'mp4') || formats.find(f => f.ext === 'mp4') || formats[0];
            if (found?.url) return found.url;
            throw new Error();
        },
        async () => {
            const res = await axios.get(`https://apiskeith.top/download/mp4?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.result || res.data?.url || res.data?.download || res.data?.video;
        },
        async () => {
            const res = await axios.get(`https://eliteprotech-apis.zone.id/ytmp4?url=${encodeURIComponent(ytUrl)}`, AXIOS_DEFAULTS);
            return res.data?.result?.url || res.data?.result?.download || res.data?.url || res.data?.download;
        }
    ];
    for (const api of apis) {
        try {
            const downloadUrl = await tryRequest(api);
            if (downloadUrl && typeof downloadUrl === 'string') return downloadUrl;
        } catch { continue; }
    }
    throw new Error('API zote za MP4 zimefeli.');
}

// ─── WEBHOOK MANAGEMENT ────────────────────────────────────────
async function removeWebhookIfSet(token) {
    try {
        const resp = await axios.post(`${TELEGRAM_BASE_URL(token)}/deleteWebhook`);
        return resp?.data?.ok || false;
    } catch (err) { return false; }
}

// ─── PAIRING DATA ──────────────────────────────────────────────
function ensureTelegramDataFile() {
    if (!fs.existsSync(TELEGRAM_DATA_DIR)) fs.mkdirSync(TELEGRAM_DATA_DIR, { recursive: true });
    if (!fs.existsSync(TELEGRAM_DATA_FILE)) fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify([]), 'utf8');
}

function loadAllowedChats() {
    ensureTelegramDataFile();
    try {
        const raw = fs.readFileSync(TELEGRAM_DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
    } catch { return []; }
}

function saveAllowedChats(chats) {
    const unique = Array.from(new Set(chats.map(id => String(id))));
    fs.writeFileSync(TELEGRAM_DATA_FILE, JSON.stringify(unique, null, 2), 'utf8');
}

function isChatAllowed(chatId) { return loadAllowedChats().includes(String(chatId)); }
function addAllowedChat(chatId) {
    const allowed = loadAllowedChats();
    if (!allowed.includes(String(chatId))) { allowed.push(String(chatId)); saveAllowedChats(allowed); }
}
function removeAllowedChat(chatId) {
    const allowed = loadAllowedChats().filter(id => id !== String(chatId));
    saveAllowedChats(allowed);
}

function isOwnerChat(chatId) {
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    return ownerId && String(chatId) === ownerId;
}

function isTelegramAuthorized(chatId) {
    if (isChatAllowed(chatId)) return true;
    if (isOwnerChat(chatId)) return true;
    if (String(settings.commandMode || '').toLowerCase() === 'public') return true;
    return false;
}

function canPair(chatId, code) {
    const inputCode = String(code || '').trim();
    const ownerId = String(settings.telegram?.ownerId || '').trim();
    const ownerNumber = String(settings.ownerNumber || '').replace(/\D/g, '').trim();
    const pairCode = String(settings.telegram?.pairCode || '').trim();
    if (ownerId && String(chatId) === ownerId) return true;
    if (!inputCode) return false;
    if (pairCode && inputCode === pairCode) return true;
    if (ownerNumber && inputCode === ownerNumber) return true;
    return false;
}

// ─── TELEGRAM SEND HELPERS ─────────────────────────────────────
async function sendTelegramMessage(chatId, text, extra = {}) {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendMessage`, {
            chat_id: String(chatId),
            text,
            disable_web_page_preview: true,
            parse_mode: 'Markdown',
            ...extra
        });
    } catch (error) {
        console.error('Telegram sendMessage failed:', error?.response?.data || error.message);
    }
}

async function sendTelegramPhoto(chatId, photoUrl, caption = '') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return;
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/sendPhoto`, {
            chat_id: String(chatId),
            photo: photoUrl,
            caption,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Telegram sendPhoto failed:', error?.response?.data || error.message);
    }
}

async function sendTelegramMedia(chatId, type, url, caption = '') {
    const token = settings.telegram?.botToken?.trim();
    if (!token || !chatId) return;
    const endpoint = type === 'audio' ? 'sendAudio' : 'sendVideo';
    try {
        await axios.post(`${TELEGRAM_BASE_URL(token)}/${endpoint}`, {
            chat_id: String(chatId),
            [type]: url,
            caption,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error(`Telegram ${endpoint} failed:`, error?.response?.data || error.message);
        await sendTelegramMessage(chatId, `❌ Kushindwa kutuma ${type}. Faili limezuiwa au ni kubwa mno.`);
    }
}

// ─── MENU ──────────────────────────────────────────────────────
function formatHelpText() {
    return [
        `${BOT_NAME} ${FOOTER}`,
        '',
        '└── ▢ *MAIN MENU*',
        '└── ▢ ────────────────',
        '└── ▢ /menu         – Show this menu',
        '└── ▢ /ping         – Bot latency',
        '└── ▢ /alive        – System status',
        '└── ▢ /owner        – Contact owner',
        '└── ▢ /update       – Update bot (Owner only)',
        '└── ▢ /pair <code>  – Pair chat',
        '└── ▢ /unpair       – Unpair chat',
        '',
        '└── ▢ *MUSIC & VIDEO*',
        '└── ▢ /play <song>  – Download audio',
        '└── ▢ /video <name> – Download video',
        '└── ▢ /lyrics <song> – Get lyrics (Genius)',
        '└── ▢ /shazam       – Identify song (reply to audio)',
        '',
        '└── ▢ *SOCIAL MEDIA*',
        '└── ▢ /instagram <url> – Download IG video/photo',
        '└── ▢ /facebook <url>  – Download FB video',
        '└── ▢ /tiktok <url>    – Download TikTok video',
        '',
        '└── ▢ *UTILITIES*',
        '└── ▢ /weather <city> – Weather forecast',
        '└── ▢ /tourl          – Upload media to Catbox (reply)',
        '└── ▢ /stickertelegram <pack> – Sticker pack info',
        '',
        `└── ▢ ${FOOTER}`
    ].join('\n');
}

// ─── LYRIC FETCH (Genius) ──────────────────────────────────────
async function getLyrics(songTitle, artist = '') {
    const geniusKey = 'EgvcA3lUT6fe3vlicHWpkHZDwcqqSU68ve2z7Ai7AlPrFfIGhWXAYUAIG3pQ0bxU';
    const query = encodeURIComponent(`${songTitle} ${artist}`);
    const searchUrl = `https://api.genius.com/search?q=${query}`;
    const searchRes = await axios.get(searchUrl, {
        headers: { Authorization: `Bearer ${geniusKey}` },
        timeout: 15000
    });
    const hits = searchRes.data?.response?.hits;
    if (!hits || hits.length === 0) throw new Error('No results');
    const song = hits[0].result;
    const songUrl = song.url;
    const title = song.title;
    const artistName = song.primary_artist.name;
    const pageRes = await axios.get(songUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
    const html = pageRes.data;
    let lyrics = null;
    let match = html.match(/<div class="lyrics"[^>]*>([\s\S]*?)<\/div>/);
    if (match) lyrics = match[1];
    else {
        match = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/);
        if (match) lyrics = match[1];
    }
    if (!lyrics) throw new Error('Could not extract lyrics');
    lyrics = lyrics.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
    if (lyrics.length < 20) throw new Error('Lyrics too short');
    return { lyrics, title, artist: artistName };
}

// ─── WEATHER (Open-Meteo) ──────────────────────────────────────
async function getCoordinates(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data?.results?.length > 0) {
        const result = res.data.results[0];
        return { lat: result.latitude, lon: result.longitude, name: result.name, country: result.country || 'Unknown' };
    }
    throw new Error('City not found');
}

async function getWeather(city) {
    const coords = await getCoordinates(city);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=auto`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data?.current_weather) {
        const w = res.data.current_weather;
        return { temp: w.temperature, wind: w.windspeed, weatherCode: w.weathercode, name: coords.name, country: coords.country };
    }
    throw new Error('No weather data');
}

function getWeatherDescription(code) {
    const map = {
        0: 'Clear sky ☀️', 1: 'Mainly clear ☀️', 2: 'Partly cloudy ⛅', 3: 'Overcast ☁️',
        45: 'Fog 🌫️', 48: 'Depositing rime fog 🌫️', 51: 'Light drizzle 🌧️', 53: 'Moderate drizzle 🌧️',
        55: 'Dense drizzle 🌧️', 61: 'Slight rain 🌦️', 63: 'Moderate rain 🌧️', 65: 'Heavy rain 🌧️',
        71: 'Slight snow ❄️', 73: 'Moderate snow ❄️', 75: 'Heavy snow ❄️', 80: 'Rain showers ☔',
        81: 'Moderate rain showers ☔', 82: 'Violent rain showers ☔', 95: 'Thunderstorm ⛈️',
        96: 'Thunderstorm with hail ⛈️', 99: 'Thunderstorm with heavy hail ⛈️'
    };
    return map[code] || 'Unknown 🌤️';
}

// ─── TOURL (Catbox Upload) ─────────────────────────────────────
async function uploadToCatbox(fileBuffer, fileName) {
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', settings.catbox?.userhash || '');
    formData.append('fileToUpload', blob, fileName);
    const res = await axios.post('https://catbox.moe/user/api.php', formData, {
        headers: { ...formData.getHeaders() },
        timeout: 120000
    });
    const url = res.data.trim();
    if (!url.startsWith('https://files.catbox.moe/')) throw new Error('Invalid response');
    return url;
}

// ─── SOCIAL MEDIA DOWNLOADERS ──────────────────────────────────
async function downloadInstagram(url) {
    const apiUrl = `https://api.aswin-sparky.koyeb.app/api/downloader/instagram?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl, AXIOS_DEFAULTS);
    if (res.data?.status && res.data?.data) {
        const data = res.data.data;
        if (data.video) return { type: 'video', url: data.video, caption: data.title || 'Instagram Video' };
        if (data.images && data.images.length) return { type: 'image', urls: data.images, caption: data.title || 'Instagram Image' };
    }
    throw new Error('Instagram download failed');
}

async function downloadFacebook(url) {
    const apiUrl = `https://api.aswin-sparky.koyeb.app/api/downloader/facebook?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl, AXIOS_DEFAULTS);
    if (res.data?.status && res.data?.data) {
        const data = res.data.data;
        if (data.video) return { type: 'video', url: data.video, caption: data.title || 'Facebook Video' };
    }
    throw new Error('Facebook download failed');
}

async function downloadTikTok(url) {
    const apiUrl = `https://api.aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    const res = await axios.get(apiUrl, AXIOS_DEFAULTS);
    if (res.data?.status && res.data?.data) {
        const data = res.data.data;
        if (data.video) return { type: 'video', url: data.video, caption: data.title || 'TikTok Video', author: data.author?.nickname || '' };
    }
    throw new Error('TikTok download failed');
}

// ─── STICKER TELEGRAM ──────────────────────────────────────────
async function handleStickerTelegram(chatId, args) {
    if (!args.length) return sendTelegramMessage(chatId, '⚠️ Tumia: /stickertelegram https://t.me/addstickers/PackName');
    const url = args[0].trim();
    const match = url.match(/(?:https?:\/\/)?t\.me\/addstickers\/(.+)/i);
    if (!match) return sendTelegramMessage(chatId, '❌ URL ya Sticker si sahihi.');
    const packName = match[1];
    try {
        const token = settings.telegram?.botToken?.trim();
        const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getStickerSet`, { params: { name: packName } });
        if (!response.data?.ok || !response.data.result) throw new Error();
        const stickerSet = response.data.result;
        const stickers = stickerSet.stickers || [];
        const sample = stickers.slice(0, 8).map((st, i) => `${i + 1}. ${st.emoji || '☀️'}`);
        const text = [
            '└── ▢ 📦 *STICKER PACK INFO*',
            `└── ▢ Title  : ${stickerSet.title}`,
            `└── ▢ Name   : ${stickerSet.name}`,
            `└── ▢ Count  : ${stickers.length}`,
            '',
            '└── ▢ *Samples:*',
            ...sample.map(s => `└── ▢ ${s}`),
            '',
            `└── ▢ ${FOOTER}`
        ].join('\n');
        await sendTelegramMessage(chatId, text);
    } catch (error) {
        await sendTelegramMessage(chatId, '❌ Ilifeli kupata maelezo ya sticker pack.');
    }
}

// ─── UPDATE COMMAND ────────────────────────────────────────────
async function handleUpdateCommand(chatId, isActiveOwner) {
    if (!isActiveOwner) return sendTelegramMessage(chatId, '🚷 Amri hii ni maalum kwa Owner tu!');
    await sendTelegramMessage(chatId, '⏳ *Inatafuta mabadiliko kutoka GitHub ...*');
    const rawUrl = 'https://raw.githubusercontent.com/Mickeydeveloper/Mickey-Glitch/main/telegram-bot.js';
    try {
        const response = await axios.get(rawUrl, { responseType: 'text' });
        if (response.status === 200 && response.data) {
            fs.writeFileSync(__filename, response.data, 'utf8');
            await sendTelegramMessage(chatId, '✅ *Msimbo umesasishwa!* Inajiwasha upya...');
            setTimeout(() => { process.exit(0); }, 2000);
        } else { throw new Error('Data haikupatikana'); }
    } catch (error) {
        await sendTelegramMessage(chatId, `❌ *Mchakato umefeli:* ${error.message}`);
    }
}

// ─── SHAZAM ────────────────────────────────────────────────────
async function handleShazamCommand(chatId, repliedMessage) {
    const token = settings.telegram?.botToken?.trim();
    const media = repliedMessage.audio || repliedMessage.video || repliedMessage.voice;
    if (!media || !media.file_id) {
        return sendTelegramMessage(chatId, '❌ *Tafadhali reply ujumbe wa audio au video kwa kutumia /shazam*');
    }
    if (!settings.acrcloud || !settings.acrcloud.access_key) {
        return sendTelegramMessage(chatId, '❌ *ACRCloud API haijawekwa kwenye settings.js!*');
    }
    await sendTelegramMessage(chatId, '🔍 *Inatambua wimbo, subiri kidogo...*');
    try {
        const fileRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile?file_id=${media.file_id}`);
        if (!fileRes.data?.ok) throw new Error("Mchakato wa kupata faili umefeli.");
        const filePath = fileRes.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const responseBuffer = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const mediaBuffer = Buffer.from(responseBuffer.data);
        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);
        fs.writeFileSync(tempInput, mediaBuffer);
        try {
            await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`);
        } catch (e) {
            fs.copyFileSync(tempInput, tempAudio);
        }
        const acr = new acrcloud({
            host: settings.acrcloud.host,
            access_key: settings.acrcloud.access_key,
            access_secret: settings.acrcloud.access_secret
        });
        const result = await acr.identify(fs.readFileSync(tempAudio));
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempAudio)) fs.unlinkSync(tempAudio);
        if (result.status?.code === 0 && result.metadata?.music?.length > 0) {
            const song = result.metadata.music[0];
            const title = song.title || 'Unknown';
            const artist = song.artists?.[0]?.name || 'Unknown';
            const caption = [
                '└── ▢ 🎵 *SHAZAM IDENTIFIED!*',
                `└── ▢ Title  : ${title}`,
                `└── ▢ Artist : ${artist}`,
                `└── ▢ Album  : ${song.album?.name || 'N/A'}`,
                `└── ▢ ${FOOTER}`
            ].join('\n');
            await sendTelegramMessage(chatId, caption, {
                reply_markup: {
                    inline_keyboard: [[
                        { text: `📥 Download MP3`, callback_data: `play_${title}` }
                    ]]
                }
            });
        } else {
            await sendTelegramMessage(chatId, '❌ *Wimbo haukutambulika.*');
        }
    } catch (err) {
        console.error("SHAZAM ERROR:", err);
        await sendTelegramMessage(chatId, '❌ Mfumo wa Shazam umepata tatizo.');
    }
}

// ─── MAIN HANDLER ──────────────────────────────────────────────
async function handleUpdate(update) {
    // Inline button callback
    if (update.callback_query) {
        const callback = update.callback_query;
        const chatId = callback.message.chat.id;
        const data = callback.data;
        if (data.startsWith('play_')) {
            const trackTitle = data.replace('play_', '');
            await sendTelegramMessage(chatId, `🎵 *Inasindika amri ya kupakua:* _${trackTitle}_...`);
            const searchResult = await yts(trackTitle);
            const video = searchResult.videos[0];
            if (video) {
                await sendTelegramPhoto(chatId, video.thumbnail, `🎵 *${video.title}*\n📥 *Inapakua Audio...*`);
                const audioUrl = await getYoutubeMp3(video.url);
                await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 *Title:* ${video.title}\n\n${FOOTER}`);
            }
        }
        return;
    }

    const message = update.message || update.edited_message;
    if (!message) return;
    const chatId = message.chat?.id;
    const sender = message.from;
    const rawText = String(message.text || '').trim();

    // ─── SHAZAM (reply) ──────────────────────────────────────────
    if (rawText.toLowerCase() === '/shazam') {
        if (message.reply_to_message) {
            await handleShazamCommand(chatId, message.reply_to_message);
        } else {
            await sendTelegramMessage(chatId, '❌ *Tafadhali reply kwenye audio/video kisha uandike /shazam*');
        }
        return;
    }

    if (!rawText.startsWith('/')) return;

    const cleanText = rawText.substring(1);
    const parts = cleanText.split(/\s+/);
    const commandText = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fullArgs = args.join(' ');

    const allowed = isTelegramAuthorized(chatId);
    const isActiveOwner = isOwnerChat(chatId);

    // ─── MENU ────────────────────────────────────────────────────
    if (commandText === 'start' || commandText === 'menu' || commandText === 'help') {
        await sendTelegramMessage(chatId, formatHelpText());
        return;
    }

    // ─── PAIR / UNPAIR ──────────────────────────────────────────
    if (commandText === 'pair') {
        if (isChatAllowed(chatId) || isActiveOwner) {
            return sendTelegramMessage(chatId, '✅ Chat hii tayari imeshaunganishwa (Paired).');
        }
        const code = args[0] || '';
        if (!canPair(chatId, code)) {
            return sendTelegramMessage(chatId, '❌ Pairing imekataa. Tumia code sahihi.');
        }
        try {
            const result = await pairWhatsappAccount({
                phoneNumber: settings.ownerNumber,
                deviceName: settings.telegram?.pairCode || 'MICKDADY'
            });
            addAllowedChat(chatId);
            const pairingMessage = result?.pairingCode
                ? `✅ WhatsApp pairing imeanzishwa. Tumia code hii kwenye WhatsApp: ${result.pairingCode}`
                : '✅ WhatsApp pairing imeanzishwa. Angalia terminal kwa code.';
            return sendTelegramMessage(chatId, `${pairingMessage}\n\n✅ Chat imepairishwa! Tumia /menu kuanza.`);
        } catch (error) {
            return sendTelegramMessage(chatId, `❌ Pairing imefeli: ${error.message}`);
        }
    }

    if (commandText === 'unpair') {
        if (!isChatAllowed(chatId)) return sendTelegramMessage(chatId, 'ℹ️ Chat hii haijawa paired bado.');
        removeAllowedChat(chatId);
        return sendTelegramMessage(chatId, '✅ Chat imeondolewa kwenye pairing.');
    }

    if (commandText === 'update') {
        await handleUpdateCommand(chatId, isActiveOwner);
        return;
    }

    if (!allowed) {
        return sendTelegramMessage(chatId, '⚠️ Chat hii haijapairishwa. Andika `/pair <code>` ili kuitumia.');
    }

    // ─── BASIC COMMANDS ─────────────────────────────────────────
    switch (commandText) {
        case 'ping':
            return sendTelegramMessage(chatId, `└── ▢ 🏓 *PONG*\n└── ▢ Latency : 📶 Excellent\n└── ▢ User    : ${sender?.username || sender?.first_name || 'Guest'}\n\n${FOOTER}`);

        case 'alive':
            return sendTelegramMessage(chatId, `└── ▢ ✅ *BOT STATUS*\n└── ▢ ${BOT_NAME}\n└── ▢ Status  : 🟢 Online\n└── ▢ Mode    : Telegram\n└── ▢ ${FOOTER}`);

        case 'owner':
            return sendTelegramMessage(chatId, `└── ▢ 👤 *OWNER INFO*\n└── ▢ Name    : bigmanj tech\n└── ▢ WhatsApp: https://wa.me/${settings.ownerNumber}\n└── ▢ ${FOOTER}`);

        case 'stickertelegram':
            return handleStickerTelegram(chatId, args);

        // ─── PLAY ────────────────────────────────────────────────
        case 'play': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka jina la wimbo! Mfano: /play Jux Enjoy');
            await sendTelegramMessage(chatId, `🎵 *Inatafuta:* _${fullArgs}_...`);
            try {
                const searchResult = await yts(fullArgs);
                const video = searchResult.videos[0];
                if (!video) return sendTelegramMessage(chatId, '❌ Wimbo haukupatikana.');
                await sendTelegramPhoto(chatId, video.thumbnail, `🎵 *${video.title}*\n⏱️ ${video.timestamp}\n📥 *Inapakua...*`);
                const audioUrl = await getYoutubeMp3(video.url);
                await sendTelegramMedia(chatId, 'audio', audioUrl, `🎵 *${video.title}*\n\n${FOOTER}`);
            } catch (err) {
                console.error(err);
                await sendTelegramMessage(chatId, '❌ Hitilafu wakati wa kupakua audio.');
            }
            return;
        }

        // ─── VIDEO ──────────────────────────────────────────────
        case 'video': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka jina la video! Mfano: /video Marioo Mi Amor');
            await sendTelegramMessage(chatId, `📹 *Inatafuta:* _${fullArgs}_...`);
            try {
                const searchResult = await yts(fullArgs);
                const video = searchResult.videos[0];
                if (!video) return sendTelegramMessage(chatId, '❌ Video haikupatikana.');
                await sendTelegramPhoto(chatId, video.thumbnail, `🎥 *${video.title}*\n⏱️ ${video.timestamp}\n📥 *Inapakua...*`);
                const videoUrl = await getYoutubeMp4(video.url);
                await sendTelegramMedia(chatId, 'video', videoUrl, `📹 *${video.title}*\n\n${FOOTER}`);
            } catch (err) {
                console.error(err);
                await sendTelegramMessage(chatId, '❌ Hitilafu wakati wa kupakua video.');
            }
            return;
        }

        // ─── LYRICS ──────────────────────────────────────────────
        case 'lyrics': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka jina la wimbo! Mfano: /lyrics Bohemian Rhapsody');
            await sendTelegramMessage(chatId, `📝 *Inatafuta lyrics za:_${fullArgs}_...`);
            try {
                const result = await getLyrics(fullArgs);
                const lyricsText = result.lyrics.slice(0, 3800) + (result.lyrics.length > 3800 ? '\n\n... (imekatwa)' : '');
                const msg = [
                    '└── ▢ 📝 *LYRICS FOUND*',
                    `└── ▢ Title  : ${result.title}`,
                    `└── ▢ Artist : ${result.artist}`,
                    '',
                    `${lyricsText}`,
                    '',
                    `└── ▢ ${FOOTER}`
                ].join('\n');
                await sendTelegramMessage(chatId, msg);
            } catch (err) {
                console.error(err);
                await sendTelegramMessage(chatId, '❌ Lyrics hazikupatikana. Jaribu kutumia: /lyrics song - artist');
            }
            return;
        }

        // ─── WEATHER ─────────────────────────────────────────────
        case 'weather': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka jina la mji! Mfano: /weather Dar es Salaam');
            try {
                const data = await getWeather(fullArgs);
                const desc = getWeatherDescription(data.weatherCode);
                const msg = [
                    '└── ▢ 🌤️ *WEATHER FORECAST*',
                    `└── ▢ Location : ${data.name}${data.country ? `, ${data.country}` : ''}`,
                    `└── ▢ Temp     : ${data.temp}°C`,
                    `└── ▢ Wind     : ${data.wind} km/h`,
                    `└── ▢ Condition: ${desc}`,
                    `└── ▢ ${FOOTER}`
                ].join('\n');
                await sendTelegramMessage(chatId, msg);
            } catch (err) {
                await sendTelegramMessage(chatId, `❌ Mji "${fullArgs}" haukupatikana.`);
            }
            return;
        }

        // ─── TOURL ───────────────────────────────────────────────
        case 'tourl': {
            if (!message.reply_to_message) {
                return sendTelegramMessage(chatId, '⚠️ Reply kwenye media (picha, video, audio, document) ili kuupload.');
            }
            const replied = message.reply_to_message;
            let media = replied.photo || replied.video || replied.audio || replied.document || replied.sticker;
            if (!media) {
                return sendTelegramMessage(chatId, '❌ Hakuna media inayotumika kwenye reply.');
            }
            const fileId = media.file_id || (media[media.length - 1]?.file_id); // photo array
            if (!fileId) return sendTelegramMessage(chatId, '❌ Haikuweza kupata file ID.');
            try {
                const token = settings.telegram?.botToken?.trim();
                const fileRes = await axios.get(`${TELEGRAM_BASE_URL(token)}/getFile?file_id=${fileId}`);
                if (!fileRes.data?.ok) throw new Error('File info failed');
                const filePath = fileRes.data.result.file_path;
                const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
                const fileBuffer = await axios.get(fileUrl, { responseType: 'arraybuffer' }).then(r => Buffer.from(r.data));
                const ext = path.extname(filePath) || '.bin';
                const fileName = `upload_${Date.now()}${ext}`;
                const link = await uploadToCatbox(fileBuffer, fileName);
                const msg = [
                    '└── ▢ 📤 *UPLOAD SUCCESSFUL*',
                    `└── ▢ Link : ${link}`,
                    `└── ▢ Size : ${(fileBuffer.length / 1024).toFixed(1)} KB`,
                    `└── ▢ ${FOOTER}`
                ].join('\n');
                await sendTelegramMessage(chatId, msg);
            } catch (err) {
                console.error(err);
                await sendTelegramMessage(chatId, '❌ Upload imefeli. Jaribu tena.');
            }
            return;
        }

        // ─── INSTAGRAM ───────────────────────────────────────────
        case 'instagram':
        case 'ig': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka link ya Instagram. Mfano: /instagram https://www.instagram.com/p/...');
            try {
                const data = await downloadInstagram(fullArgs);
                if (data.type === 'video') {
                    await sendTelegramMessage(chatId, `📥 *Inapakua IG video...*\n${data.caption}`);
                    await sendTelegramMedia(chatId, 'video', data.url, `📹 *${data.caption}*\n\n${FOOTER}`);
                } else if (data.type === 'image') {
                    for (const imgUrl of data.urls) {
                        await sendTelegramPhoto(chatId, imgUrl, `🖼️ ${data.caption}\n\n${FOOTER}`);
                    }
                }
            } catch (err) {
                await sendTelegramMessage(chatId, `❌ Instagram download imefeli: ${err.message}`);
            }
            return;
        }

        // ─── FACEBOOK ────────────────────────────────────────────
        case 'facebook':
        case 'fb': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka link ya Facebook. Mfano: /facebook https://www.facebook.com/...');
            try {
                const data = await downloadFacebook(fullArgs);
                await sendTelegramMessage(chatId, `📥 *Inapakua FB video...*`);
                await sendTelegramMedia(chatId, 'video', data.url, `📹 *${data.caption}*\n\n${FOOTER}`);
            } catch (err) {
                await sendTelegramMessage(chatId, `❌ Facebook download imefeli: ${err.message}`);
            }
            return;
        }

        // ─── TIKTOK ──────────────────────────────────────────────
        case 'tiktok':
        case 'tt': {
            if (!fullArgs) return sendTelegramMessage(chatId, '⚠️ Weka link ya TikTok. Mfano: /tiktok https://www.tiktok.com/...');
            try {
                const data = await downloadTikTok(fullArgs);
                const caption = `🎵 *${data.caption}*${data.author ? `\n👤 ${data.author}` : ''}`;
                await sendTelegramMessage(chatId, `📥 *Inapakua TikTok video...*`);
                await sendTelegramMedia(chatId, 'video', data.url, `${caption}\n\n${FOOTER}`);
            } catch (err) {
                await sendTelegramMessage(chatId, `❌ TikTok download imefeli: ${err.message}`);
            }
            return;
        }

        default:
            return sendTelegramMessage(chatId, `❌ Amri ya '${commandText}' haipo.\nTumia /menu kuona zilizopo.`);
    }
}

// ─── START BOT ──────────────────────────────────────────────────
async function startTelegramBot() {
    const token = settings.telegram?.botToken?.trim();
    if (!token) {
        console.error('Telegram botToken haipo kwenye settings.js');
        process.exit(1);
    }
    ensureTelegramDataFile();
    try { await removeWebhookIfSet(token); } catch (e) {}
    let offset = 0;
    console.log('✅ Bigmanj Telegram Bot imeanza vizuri.');
    while (true) {
        try {
            const response = await axios.get(`${TELEGRAM_BASE_URL(token)}/getUpdates`, {
                params: { offset: offset + 1, timeout: 30, allowed_updates: ['message', 'edited_message', 'callback_query'] },
                timeout: 60000
            });
            if (!response.data?.ok) throw new Error();
            const updates = response.data.result || [];
            for (const update of updates) {
                offset = update.update_id;
                await handleUpdate(update);
            }
        } catch (error) {
            if (error?.response?.data?.error_code === 409) {
                try { await removeWebhookIfSet(token); } catch (e) {}
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

module.exports = { startTelegramBot, isChatAllowed, addAllowedChat, removeAllowedChat };
