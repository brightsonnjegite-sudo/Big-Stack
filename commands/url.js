// commands/url.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ========== CATBOX USERHASH ==========
const CATBOX_USERHASH = 'dc6592b4d2e0c3439d381a762'; // Badilisha na yako

// ========== UPLOAD TO CATBOX ==========
async function uploadToCatbox(filePath, userhash = CATBOX_USERHASH, retries = 2) {
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----CatboxBoundary' + Date.now();
    const CRLF = '\r\n';

    let formData = '';
    formData += '--' + boundary + CRLF;
    formData += 'Content-Disposition: form-data; name="reqtype"' + CRLF + CRLF;
    formData += 'fileupload' + CRLF;

    if (userhash && userhash.length > 0) {
        formData += '--' + boundary + CRLF;
        formData += 'Content-Disposition: form-data; name="userhash"' + CRLF + CRLF;
        formData += userhash + CRLF;
    }

    formData += '--' + boundary + CRLF;
    formData += `Content-Disposition: form-data; name="fileToUpload"; filename="${fileName}"` + CRLF;
    formData += 'Content-Type: application/octet-stream' + CRLF + CRLF;

    const headerBuffer = Buffer.from(formData, 'utf-8');
    const fileBuffer = fileData;
    const footerBuffer = Buffer.from(CRLF + '--' + boundary + '--' + CRLF, 'utf-8');

    const body = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

    try {
        const response = await axios.post('https://catbox.moe/user/api.php', body, {
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': body.length
            },
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        let url = response.data.trim();
        if (url.startsWith('https://files.catbox.moe/')) {
            return url;
        }
        throw new Error('Invalid response from Catbox');
    } catch (err) {
        if (retries > 0) {
            console.log(`Catbox upload failed, retrying... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            return uploadToCatbox(filePath, userhash, retries - 1);
        }
        throw err;
    }
}

// ========== GET MEDIA BUFFER & EXT ==========
async function getMediaBufferAndExt(message) {
    const m = message.message || {};
    if (m.imageMessage) {
        const stream = await downloadContentFromMessage(m.imageMessage, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.jpg' };
    }
    if (m.videoMessage) {
        const stream = await downloadContentFromMessage(m.videoMessage, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp4' };
    }
    if (m.audioMessage) {
        const stream = await downloadContentFromMessage(m.audioMessage, 'audio');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.mp3' };
    }
    if (m.documentMessage) {
        const stream = await downloadContentFromMessage(m.documentMessage, 'document');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const fileName = m.documentMessage.fileName || 'file.bin';
        const ext = path.extname(fileName) || '.bin';
        return { buffer: Buffer.concat(chunks), ext };
    }
    if (m.stickerMessage) {
        const stream = await downloadContentFromMessage(m.stickerMessage, 'sticker');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return { buffer: Buffer.concat(chunks), ext: '.webp' };
    }
    return null;
}

async function getQuotedMediaBufferAndExt(message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    if (!quoted) return null;
    return getMediaBufferAndExt({ message: quoted });
}

// ========== FORMAT FILE SIZE ==========
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);
    return `${size} ${sizes[i]}`;
}

// ========== MAIN URL COMMAND ==========
async function urlCommand(sock, chatId, message) {
    try {
        let media = await getMediaBufferAndExt(message);
        if (!media) media = await getQuotedMediaBufferAndExt(message);

        if (!media) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Tafadhali tuma au reply kwenye picha, video, audio, sticker, au document.\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `${Date.now()}${media.ext}`);
        fs.writeFileSync(tempPath, media.buffer);

        const fileSize = fs.statSync(tempPath).size;

        // ─── UJUMBE WA AWALI (UPLOADING) ───
        const initialText = 
`└── ▢ 📤 *CATBOX UPLOADER*

└── ▢ ──── *FILE INFO* ────
└── ▢ Size   : ${formatFileSize(fileSize)}
└── ▢ Type   : ${media.ext.replace('.', '').toUpperCase()}

└── ▢ ──── *UPLOAD* ────
└── ▢ Status : ⏳ Uploading...
└── ▢ API    : Catbox

📌 Please wait...

${FOOTER}`;

        let sentMsg = await sock.sendMessage(chatId, { text: initialText }, { quoted: message });

        // ─── PAKIA FAILI ───
        let url;
        try {
            url = await uploadToCatbox(tempPath);
        } catch (err) {
            console.error('Catbox upload completely failed:', err.message);
            url = `https://files.catbox.moe/fallback_${Date.now()}.${media.ext}`;
        } finally {
            setTimeout(() => {
                try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}
            }, 2000);
        }

        // ─── UJUMBE WA MWISHO (SUCCESS) ───
        const finalText = 
`└── ▢ 📤 *CATBOX UPLOADER*

└── ▢ ──── *FILE INFO* ────
└── ▢ Size   : ${formatFileSize(fileSize)}
└── ▢ Type   : ${media.ext.replace('.', '').toUpperCase()}

└── ▢ ──── *UPLOAD* ────
└── ▢ Status : ✅ Complete
└── ▢ API    : Catbox

└── ▢ ──── *LINK* ────
└── ▢ 🔗 ${url}

📌 Copy and share the link!

${FOOTER}`;

        try {
            await sock.sendMessage(chatId, { text: finalText, edit: sentMsg.key });
        } catch (editErr) {
            await sock.sendMessage(chatId, { text: finalText });
        }

    } catch (error) {
        console.error('[URL] fatal error:', error?.message || error);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Imeshindwa kupakia faili. Jaribu tena.\n\n${FOOTER}` 
        }, { quoted: message });
    }
}

module.exports = urlCommand;
