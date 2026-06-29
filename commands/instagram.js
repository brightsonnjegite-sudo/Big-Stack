const { igdl } = require("ruhend-scraper");
const { getBuffer } = require('../lib/myfunc');
const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

// Helper: transcode arbitrary video buffer/file to mp4 (H.264 + AAC) using ffmpeg
async function transcodeToMp4(inputBuffer, srcExt = '.mp4') {
    const tmpDir = os.tmpdir();
    const inPath = path.join(tmpDir, `insta_in_${Date.now()}_${Math.random().toString(36).slice(2)}${srcExt}`);
    const outPath = path.join(tmpDir, `insta_out_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
    try {
        fs.writeFileSync(inPath, inputBuffer);
        const cmd = `ffmpeg -y -i "${inPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outPath}"`;
        await execPromise(cmd, { windowsHide: true });
        const outBuffer = fs.readFileSync(outPath);
        return outBuffer;
    } catch (err) {
        console.error('transcodeToMp4 error:', err?.message || err);
        return null;
    } finally {
        try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (e) {}
        try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (e) {}
    }
}

const processedMessages = new Set();

function extractUniqueMedia(mediaData) {
    const uniqueMedia = [];
    const seenUrls = new Set();
    for (const media of mediaData) {
        if (!media.url) continue;
        if (!seenUrls.has(media.url)) {
            seenUrls.add(media.url);
            uniqueMedia.push(media);
        }
    }
    return uniqueMedia;
}

function isValidMediaUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.includes('cdninstagram.com') || 
           url.includes('instagram') || 
           url.includes('http');
}

async function instagramCommand(sock, chatId, message) {
    try {
        // Check if message has already been processed
        if (processedMessages.has(message.key.id)) {
            return;
        }
        processedMessages.add(message.key.id);
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            const usageMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ No Link Provided
└── ▢ Usage   : Send an Instagram link

📌 Example: https://www.instagram.com/p/xxxxx

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: usageMsg }, { quoted: message });
        }

        // Check for Instagram URL
        const instagramPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//,
            /https?:\/\/(?:www\.)?instagr\.am\//,
            /https?:\/\/(?:www\.)?instagram\.com\/p\//,
            /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
            /https?:\/\/(?:www\.)?instagram\.com\/tv\//
        ];

        const isValidUrl = instagramPatterns.some(pattern => pattern.test(text));
        
        if (!isValidUrl) {
            const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ Invalid Link
└── ▢ Error   : Not a valid Instagram URL

📌 Please provide a valid Instagram post, reel, or video link.

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }

        // Processing message
        const processingMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ⏳ Processing...
└── ▢ Link    : ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}

📌 Fetching media, please wait...

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: processingMsg }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        const downloadData = await igdl(text);
        
        if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
            const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ No Media Found
└── ▢ Error   : Private post or invalid link

📌 The post might be private or the link is invalid.

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }

        const mediaData = downloadData.data;
        const uniqueMedia = extractUniqueMedia(mediaData);
        const mediaToDownload = uniqueMedia.slice(0, 20);
        
        if (mediaToDownload.length === 0) {
            const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ No Valid Media
└── ▢ Error   : No media available to download

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }

        // Send only one item: Prefer video first
        try {
            const firstVideo = mediaToDownload.find(m => {
                const url = (m.url || '').toString();
                return /\.(mp4|mov|avi|mkv|webm)$/i.test(url) || m.type === 'video';
            });

            const selected = firstVideo || mediaToDownload[0];
            if (!selected) {
                const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ No Media
└── ▢ Error   : No media available to send

© bigmanj tech ™ with ♥︎`;
                return await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            }

            const mediaUrl = selected.url;
            const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || selected.type === 'video' || text.includes('/reel/') || text.includes('/tv/');

            // Success message before sending media
            const successMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ✅ Success
└── ▢ Type    : ${isVideo ? 'Video' : 'Image'}
└── ▢ Quality : HD

📌 Downloading your media...

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: successMsg }, { quoted: message });

            if (isVideo) {
                try {
                    const buffer = await getBuffer(mediaUrl);
                    const ext = (path.extname(mediaUrl) || '.mp4').split('?')[0].toLowerCase();

                    let finalBuffer = buffer;
                    if (buffer && Buffer.isBuffer(buffer) && ext !== '.mp4') {
                        const transcoded = await transcodeToMp4(buffer, ext);
                        if (transcoded && Buffer.isBuffer(transcoded)) {
                            finalBuffer = transcoded;
                        } else {
                            finalBuffer = buffer;
                        }
                    }

                    if (finalBuffer && Buffer.isBuffer(finalBuffer)) {
                        await sock.sendMessage(chatId, {
                            video: finalBuffer,
                            mimetype: 'video/mp4',
                            fileName: `instagram.mp4`,
                            caption: `└── ▢ 📸 *Instagram Video*\n└── ▢ Status : ✅ Downloaded\n└── ▢ Source : Instagram\n\n© bigmanj tech ™ with ♥︎`
                        }, { quoted: message });
                    } else {
                        await sock.sendMessage(chatId, {
                            video: { url: mediaUrl },
                            mimetype: "video/mp4",
                            caption: `└── ▢ 📸 *Instagram Video*\n└── ▢ Status : ✅ Downloaded\n└── ▢ Source : Instagram\n\n© bigmanj tech ™ with ♥︎`
                        }, { quoted: message });
                    }
                } catch (sendErr) {
                    console.error('Error sending video buffer, fallback to URL:', sendErr);
                    await sock.sendMessage(chatId, {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption: `└── ▢ 📸 *Instagram Video*\n└── ▢ Status : ✅ Downloaded (Fallback)\n└── ▢ Source : Instagram\n\n© bigmanj tech ™ with ♥︎`
                    }, { quoted: message });
                }
            } else {
                await sock.sendMessage(chatId, {
                    image: { url: mediaUrl },
                    caption: `└── ▢ 📸 *Instagram Image*\n└── ▢ Status : ✅ Downloaded\n└── ▢ Source : Instagram\n\n© bigmanj tech ™ with ♥︎`
                }, { quoted: message });
            }

        } catch (singleErr) {
            console.error('Error sending selected media:', singleErr);
            const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ Error
└── ▢ Error   : Failed to send media

📌 Please try again later.

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        }

    } catch (error) {
        console.error('Error in Instagram command:', error);
        const errorMsg = 
`└── ▢ 📸 *INSTAGRAM DOWNLOADER*

└── ▢ Status  : ❌ Error
└── ▢ Error   : ${error.message || 'Please try again later.'}

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = instagramCommand;
