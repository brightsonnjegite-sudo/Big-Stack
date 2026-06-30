// commands/tiktok.js
const axios = require('axios');
const { getBuffer } = require('../lib/myfunc');

const FOOTER = '© bigmanj tech ™ with ♥︎';

const AXIOS_DEFAULTS = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

// Function ya kupata data kutoka kwenye API mpya
async function getTiktokDownload(url) {
    const apiUrl = `https://api-aswin-sparky.koyeb.app/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
    
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    
    if (!res || !res.data || !res.data.status || !res.data.data) {
        throw new Error('No response from TikTok API');
    }

    const d = res.data.data;
    const videoUrl = d.video;
    if (!videoUrl) throw new Error('Could not find video URL in API response');

    return { 
        url: videoUrl, 
        title: d.title, 
        nickname: d.author?.nickname,
        thumbnail: d.thumbnail 
    };
}

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim();

        if (!url || !url.includes('tiktok.com')) {
            const usageMsg = 
`└── ▢ 🎵 *TIKTOK DOWNLOADER*

└── ▢ ──── *USAGE* ────
└── ▢ .tiktok <url>

└── ▢ ──── *EXAMPLE* ────
└── ▢ .tiktok https://www.tiktok.com/@user/video/123

${FOOTER}`;
            return await sock.sendMessage(chatId, { text: usageMsg }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔎', key: message.key } });

        // ─── SEND PROCESSING MESSAGE ───
        const processingMsg = 
`└── ▢ 🎵 *TIKTOK DOWNLOADER*

└── ▢ Status  : ⏳ Processing...
└── ▢ URL     : ${url.substring(0, 40)}...
└── ▢ Source  : API (Aswin Sparky)

📌 Please wait, downloading video...

${FOOTER}`;
        await sock.sendMessage(chatId, { text: processingMsg }, { quoted: message });

        let tikData;
        try {
            tikData = await getTiktokDownload(url);
        } catch (err) {
            console.error("API Error:", err.message);
            const errorMsg = 
`└── ▢ ❌ *DOWNLOAD FAILED*

└── ▢ Status  : ❌ Error
└── ▢ Details : ${err.message || 'API request failed'}

📌 Please try again later.

${FOOTER}`;
            return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });

        // ─── BUILD SUCCESS CAPTION ───
        const caption = 
`└── ▢ 🎵 *TIKTOK DOWNLOADER*

└── ▢ ──── *VIDEO INFO* ────
└── ▢ 👤 Author  : ${tikData.nickname || 'N/A'}
└── ▢ 📝 Title   : ${tikData.title || 'No Title'}
└── ▢ 📅 Status  : ✅ Downloaded
└── ▢ 🔗 Source  : ${url.substring(0, 30)}...

📌 Video attached below.

${FOOTER}`;

        // ─── SEND VIDEO ───
        try {
            await sock.sendMessage(chatId, {
                video: { url: tikData.url },
                mimetype: 'video/mp4',
                caption: caption
            }, { quoted: message });
        } catch (err) {
            console.error("Send Error:", err.message);
            const errorMsg = 
`└── ▢ ❌ *SEND FAILED*

└── ▢ Video may be too large or the link has expired.

📌 Try using a different link.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: errorMsg });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error("TIKTOK CMD ERROR:", err.message);
        const errorMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ Details : ${err.message || 'Unknown error'}

📌 Please try again later.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg });
    }
}

module.exports = tiktokCommand;
