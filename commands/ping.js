// commands/play.js
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ========== Helper: Format Duration ==========
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== Helper: Format Numbers with commas ==========
function formatNumber(num) {
    if (!num) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ========== Helper: Extract duration safely ==========
function extractDuration(info) {
    if (!info.duration) return 0;
    if (typeof info.duration === 'number') return info.duration;
    if (typeof info.duration === 'object' && info.duration.seconds) return info.duration.seconds;
    if (typeof info.duration === 'string') {
        const parts = info.duration.split(':');
        if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
}

// ========== Helper: Extract artist name safely ==========
function extractArtist(info) {
    if (!info.author) return 'Unknown';
    if (typeof info.author === 'string') return info.author;
    if (typeof info.author === 'object' && info.author.name) return info.author.name;
    return 'Unknown';
}

// ========== API 1: Hadi API ==========
async function downloadFromHadi(videoId) {
    const url = `https://api.hadi-tech.my.id/api/download/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'Hadi API',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Hadi API failed');
}

// ========== API 2: SaveDo ==========
async function downloadFromSaveDo(videoId) {
    const url = `https://savedo.vercel.app/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.downloadUrl) {
        const fileRes = await axios.get(res.data.downloadUrl, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.title || 'Audio',
            thumbnail: res.data.thumbnail || '',
            source: 'SaveDo',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('SaveDo failed');
}

// ========== API 3: Nayan AllDown ==========
async function downloadFromNayanAllDown(videoId) {
    const url = `https://nayan-video-downloader.vercel.app/alldown?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status === true && res.data?.data) {
        const data = res.data.data;
        const videoUrl = data.high || data.low || data.download;
        if (!videoUrl) throw new Error('No download URL');
        const fileRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: data.title || 'Audio',
            thumbnail: data.thumbnail || '',
            source: 'Nayan AllDown',
            mimeType: 'audio/mp4'
        };
    }
    throw new Error('Nayan AllDown failed');
}

// ========== API 4: Nayan YouTube ==========
async function downloadFromNayanYoutube(videoId) {
    const url = `https://nayan-video-downloader.vercel.app/youtube?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status === true && res.data?.data?.data?.formats) {
        const formats = res.data.data.data.formats;
        const title = res.data.data.data.title;
        const thumbnail = res.data.data.data.thumbnail;
        let bestAudio = null;
        let priority = 0;
        for (const format of formats) {
            if (format.type === 'audio') {
                let p = format.formatId === '251' ? 100 : format.formatId === '250' ? 90 : format.formatId === '249' ? 85 : 0;
                if (p > priority) { priority = p; bestAudio = format; }
            }
        }
        if (!bestAudio) {
            for (const format of formats) {
                if (format.type === 'video_with_audio' && format.mimeType?.includes('mp4')) {
                    bestAudio = format;
                    break;
                }
            }
        }
        if (bestAudio?.url) {
            const fileRes = await axios.get(bestAudio.url, { responseType: 'arraybuffer', timeout: 30000 });
            return {
                buffer: Buffer.from(fileRes.data),
                title: title || 'Audio',
                thumbnail: thumbnail || '',
                source: 'Nayan YouTube',
                mimeType: 'audio/mp4'
            };
        }
    }
    throw new Error('Nayan YouTube failed');
}

// ========== API 5: Siputzx ==========
async function downloadFromSiputzx(videoId) {
    const url = `https://api.siputzx.my.id/api/d/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.data?.url) {
        const fileRes = await axios.get(res.data.data.url, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.data.title || 'Audio',
            thumbnail: res.data.data.thumbnail || '',
            source: 'Siputzx',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Siputzx failed');
}

// ========== API 6: JsKonsol ==========
async function downloadFromJsKonsol(videoId) {
    const url = `https://api.jskonsol.com/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'JsKonsol',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('JsKonsol failed');
}

// ========== API 7: Zeltin ==========
async function downloadFromZeltin(videoId) {
    const url = `https://api.zeltin.cc/yt/audio?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.downloadUrl) {
        const fileRes = await axios.get(res.data.downloadUrl, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.title || 'Audio',
            thumbnail: res.data.thumbnail || '',
            source: 'Zeltin',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Zeltin failed');
}

// ========== API 8: Xeon ==========
async function downloadFromXeon(videoId) {
    const url = `https://api.xeon.app/api/download/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.data?.url) {
        const fileRes = await axios.get(res.data.data.url, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.data.title || 'Audio',
            thumbnail: res.data.data.thumbnail || '',
            source: 'Xeon',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Xeon failed');
}

// ========== API 9: RiZky ==========
async function downloadFromRiZky(videoId) {
    const url = `https://api.rizkytech.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'RiZky',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('RiZky failed');
}

// ========== API 10: AlfathDroid ==========
async function downloadFromAlfathDroid(videoId) {
    const url = `https://api.alfathdroid.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'AlfathDroid',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('AlfathDroid failed');
}

// ========== API 11: Hardianto ==========
async function downloadFromHardianto(videoId) {
    const url = `https://api.hardianto.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'Hardianto',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Hardianto failed');
}

// ========== API 12: Xcoders ==========
async function downloadFromXcoders(videoId) {
    const url = `https://api.xcoders.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'Xcoders',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Xcoders failed');
}

// ========== API 13: NasaAPI ==========
async function downloadFromNasa(videoId) {
    const url = `https://api.nasap.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'NasaAPI',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('NasaAPI failed');
}

// ========== API 14: Eriz ==========
async function downloadFromEriz(videoId) {
    const url = `https://api.eriz.xyz/api/ytmp3?url=https://youtu.be/${videoId}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.result?.download) {
        const fileRes = await axios.get(res.data.result.download, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'Eriz',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('Eriz failed');
}

// ========== API 15: LolHuman ==========
async function downloadFromLolHuman(videoId) {
    const key = 'YOUR_API_KEY'; // Replace if you have one
    const url = `https://api.lolhuman.xyz/api/ytmp3?url=https://youtu.be/${videoId}&apikey=${key}`;
    const res = await axios.get(url, { timeout: 15000 });
    if (res.data?.status && res.data?.result?.link) {
        const fileRes = await axios.get(res.data.result.link, { responseType: 'arraybuffer', timeout: 30000 });
        return {
            buffer: Buffer.from(fileRes.data),
            title: res.data.result.title || 'Audio',
            thumbnail: res.data.result.thumbnail || '',
            source: 'LolHuman',
            mimeType: 'audio/mp3'
        };
    }
    throw new Error('LolHuman failed');
}

// ========== FALLBACK: ytdl-core ==========
async function downloadWithYtdl(videoId) {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;
    const thumbnail = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url || '';
    const stream = ytdl(url, { quality: 'lowestaudio', filter: 'audioonly' });
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return {
        buffer: Buffer.concat(chunks),
        title: title,
        thumbnail: thumbnail,
        source: 'ytdl-core',
        mimeType: 'audio/mp4'
    };
}

// ========== MASTER DOWNLOAD FUNCTION ==========
async function getYoutubeAudio(videoId) {
    const apis = [
        downloadFromHadi,
        downloadFromSaveDo,
        downloadFromNayanAllDown,
        downloadFromNayanYoutube,
        downloadFromSiputzx,
        downloadFromJsKonsol,
        downloadFromZeltin,
        downloadFromXeon,
        downloadFromRiZky,
        downloadFromAlfathDroid,
        downloadFromHardianto,
        downloadFromXcoders,
        downloadFromNasa,
        downloadFromEriz,
        downloadFromLolHuman
    ];

    for (const api of apis) {
        try {
            console.log(`[PLAY] Trying ${api.name}...`);
            return await api(videoId);
        } catch (err) {
            console.log(`[PLAY] ${api.name} failed:`, err.message);
        }
    }

    console.log('[PLAY] All APIs failed, using ytdl-core...');
    return await downloadWithYtdl(videoId);
}

// ========== MAIN PLAY COMMAND ==========
async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            const usageMsg = 
`└── ▢ 🎵 *PLAY MUSIC*

└── ▢ Usage : .play <song name>
└── ▢ Usage : .play <YouTube URL>

└── ▢ Example:
└── ▢ .play Bohemian Rhapsody
└── ▢ .play https://youtu.be/dQw4w9WgXcQ

${FOOTER}`;
            return sock.sendMessage(chatId, { text: usageMsg });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        let videoId = null;
        let videoInfo = null;
        let thumbnailUrl = '';

        if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
            if (query.includes('youtu.be/')) {
                videoId = query.split('youtu.be/')[1].split('?')[0];
            } else {
                const urlParams = new URLSearchParams(query.split('?')[1]);
                videoId = urlParams.get('v');
            }

            if (!videoId) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *INVALID URL*\n\n└── ▢ Could not extract video ID.\n\n${FOOTER}` 
                });
            }

            const searchResults = await yts(`https://youtu.be/${videoId}`);
            if (searchResults?.videos?.length > 0) {
                const info = searchResults.videos[0];
                videoInfo = {
                    title: info.title || 'Unknown Title',
                    artist: extractArtist(info),
                    duration: extractDuration(info),
                    views: info.views || 0,
                    thumbnail: info.thumbnail || ''
                };
                thumbnailUrl = videoInfo.thumbnail;
            }
        } else {
            const searchResults = await yts(query);
            if (!searchResults?.videos?.length) {
                await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *NOT FOUND*\n\n└── ▢ No results found for "${query}".\n\n${FOOTER}` 
                });
            }
            const info = searchResults.videos[0];
            videoInfo = {
                title: info.title || 'Unknown Title',
                artist: extractArtist(info),
                duration: extractDuration(info),
                views: info.views || 0,
                thumbnail: info.thumbnail || ''
            };
            videoId = info.videoId;
            thumbnailUrl = videoInfo.thumbnail;
        }

        if (!videoId) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Could not extract video ID.\n\n${FOOTER}` 
            });
        }

        const title = videoInfo.title;
        const duration = formatDuration(videoInfo.duration);
        const views = formatNumber(videoInfo.views);
        const artist = videoInfo.artist;

        // ----- BUILD THE INITIAL INFO MESSAGE (with Fetching...) -----
        const infoText = 
`└── ▢ 🎵 *AUDIO DOWNLOADER*

└── ▢ ──── *SONG INFO* ────
└── ▢ Title     : ${title}
└── ▢ Duration  : ${duration}
└── ▢ Views     : ${views}
└── ▢ Artist    : ${artist}

└── ▢ ──── *DOWNLOAD* ────
└── ▢ API       : ⏳ Fetching...
└── ▢ Status    : ⏳ Downloading...

📌 Please wait, this may take a moment.

${FOOTER}`;

        let sentMsg;
        try {
            if (thumbnailUrl) {
                sentMsg = await sock.sendMessage(chatId, { image: { url: thumbnailUrl }, caption: infoText });
            } else {
                sentMsg = await sock.sendMessage(chatId, { text: infoText });
            }
        } catch (e) {
            sentMsg = await sock.sendMessage(chatId, { text: infoText });
        }

        // ----- DOWNLOAD THE AUDIO -----
        const result = await getYoutubeAudio(videoId);

        // ----- BUILD THE UPDATED MESSAGE (with real API) -----
        const updatedInfoText = 
`└── ▢ 🎵 *AUDIO DOWNLOADER*

└── ▢ ──── *SONG INFO* ────
└── ▢ Title     : ${title}
└── ▢ Duration  : ${duration}
└── ▢ Views     : ${views}
└── ▢ Artist    : ${artist}

└── ▢ ──── *DOWNLOAD* ────
└── ▢ API       : ${result.source}
└── ▢ Status    : ✅ Complete

📌 Audio file attached below.

${FOOTER}`;

        // ----- EDIT THE ORIGINAL MESSAGE -----
        try {
            await sock.sendMessage(chatId, { text: updatedInfoText, edit: sentMsg.key });
        } catch (editErr) {
            console.log('[PLAY] Edit failed, sending fallback:', editErr.message);
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ✅ *DOWNLOADED*\n\n└── ▢ Using : ${result.source} API\n\n${FOOTER}` 
            });
        }

        // ----- SEND THE AUDIO -----
        await sock.sendMessage(chatId, {
            audio: result.buffer,
            mimetype: result.mimeType || 'audio/mp4',
            ptt: false,
            fileName: `${(result.title || 'audio').substring(0, 40)}.mp3`
        });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[PLAY] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ ${err.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
}

module.exports = playCommand;
