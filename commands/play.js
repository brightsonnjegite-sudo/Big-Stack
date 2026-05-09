const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 30000, // Reduced timeout for faster response
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

// Enhanced retry mechanism with exponential backoff
async function tryRequest(getter, attempts = 3) {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await getter();
        } catch (err) {
            lastErr = err;
            if (i < attempts) {
                const delay = Math.min(1000 * Math.pow(2, i - 1), 5000); // Exponential backoff, max 5s
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}

// Get MP3 from YouTube with enhanced error handling
async function getYoutubeMp3(ytUrl) {
    const apis = [
        `https://apiskeith.top/download/audio?url=${encodeURIComponent(ytUrl)}`,
        `https://eliteprotech-apis.zone.id/ytmp3?url=${encodeURIComponent(ytUrl)}`,
        `https://apiskeith.top/download/ytv3?url=${encodeURIComponent(ytUrl)}`
    ];

    for (const api of apis) {
        try {
            const res = await tryRequest(() => axios.get(api, AXIOS_DEFAULTS));

            // Handle different API response structures
            let downloadUrl = null;
            if (res.data?.status && res.data?.result) {
                if (typeof res.data.result === 'string') {
                    downloadUrl = res.data.result;
                } else if (typeof res.data.result === 'object' && res.data.result?.url) {
                    downloadUrl = res.data.result.url;
                } else if (typeof res.data.result === 'object' && res.data.result?.download) {
                    downloadUrl = res.data.result.download;
                }
            } else if (res.data?.url) {
                downloadUrl = res.data.url;
            } else if (res.data?.download) {
                downloadUrl = res.data.download;
            } else if (res.data?.audio) {
                downloadUrl = res.data.audio;
            }

            if (downloadUrl && typeof downloadUrl === 'string') {
                return { download: downloadUrl };
            }
        } catch (err) {
            console.log(`API ${api} failed, trying next...`);
            continue;
        }
    }
    throw new Error('All MP3 APIs failed');
}

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const q = text.split(' ').slice(1).join(' ').trim();

        if (!q) return sock.sendMessage(chatId, { text: '🎵 *Unataka wimbo gani?*\n\n📝 Mfano: `.play Darude Sandstorm`' });

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const s = await yts(q);
        const v = s?.videos?.[0];
        if (!v) return sock.sendMessage(chatId, { text: '❌ Sikuipata wimbo huo! Jaribu kutafuta kwa maneno mengine.' });

        try {
            await sock.sendMessage(chatId, {
                image: { url: v.thumbnail },
                caption: `🎵 *${v.title}*\n⏱️ *Muda:* ${v.timestamp}\n👤 *Msanii:* ${v.author.name}\n👁️ *Views:* ${v.views?.toLocaleString() || 'N/A'}\n\n📥 *Inapakua...*`
            }, { quoted: message });
        } catch (thumbErr) {
            console.log('Thumbnail send failed, continuing...');
        }

        await handleAudioDownload(sock, chatId, v.url, message, v);

    } catch (err) {
        console.error('[PLAY] Error:', err?.message || err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        sock.sendMessage(chatId, { text: '❌ *Hitilafu!* ' + (err.message || 'Jaribu tena baadae') });
    }
}

async function handleAudioDownload(sock, chatId, ytUrl, message, videoInfo = null) {
    try {
        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        const data = await getYoutubeMp3(ytUrl);

        // Audio message bila contextInfo (picha ndogo/ad info)
        const audioMessage = {
            audio: { url: data.download },
            mimetype: 'audio/mp4',
            ptt: false,
            fileName: videoInfo?.title ? `${videoInfo.title}.mp3` : 'audio.mp3'
        };

        await sock.sendMessage(chatId, audioMessage, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('Audio download error:', e);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: "❌ *Download imefeli:* " + (e.message || 'API haipatikani') }, { quoted: message });
    }
}

module.exports = playCommand;
module.exports.handleAudioDownload = handleAudioDownload;
module.exports.getYoutubeMp3 = getYoutubeMp3;
