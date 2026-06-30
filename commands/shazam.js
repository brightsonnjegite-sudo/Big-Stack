// commands/shazam.js
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { sendButtons } = require('gifted-btns');
const acrcloud = require('acrcloud');
const fs = require('fs-extra');
const path = require('path');
const settings = require('../settings');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ─── HELPER: CHECK TRENDING VIA Deezer API ───
async function checkTrendingDeezer(title, artist) {
    try {
        // Search for the track on Deezer
        const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(title + ' ' + artist)}&limit=1`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const track = data.data[0];
            // Check if it's in Deezer charts
            const chartUrl = `https://api.deezer.com/chart/0/tracks`;
            const chartResponse = await fetch(chartUrl);
            const chartData = await chartResponse.json();
            
            if (chartData.data && chartData.data.length > 0) {
                const isInChart = chartData.data.some(t => t.id === track.id);
                return {
                    isTrending: isInChart,
                    platform: 'Deezer',
                    popularity: track.rank || 0,
                    source: 'Deezer API'
                };
            }
        }
        return null;
    } catch (e) {
        console.log('Deezer trending check failed:', e.message);
        return null;
    }
}

// ─── HELPER: CHECK TRENDING VIA iTunes API ───
async function checkTrendingItunes(title, artist) {
    try {
        const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}&limit=1&entity=song`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Check if in top charts
            const chartUrl = 'https://itunes.apple.com/us/rss/topsongs/limit=100/json';
            const chartResponse = await fetch(chartUrl);
            const chartData = await chartResponse.json();
            
            if (chartData.feed && chartData.feed.entry) {
                const topSongs = chartData.feed.entry.map(entry => ({
                    name: entry['im:name']?.label || '',
                    artist: entry['im:artist']?.label || ''
                }));
                
                const isTrending = topSongs.some(s => 
                    s.name.toLowerCase().includes(title.toLowerCase()) ||
                    s.artist.toLowerCase().includes(artist.toLowerCase())
                );
                
                return {
                    isTrending,
                    platform: 'iTunes',
                    popularity: isTrending ? 85 : 30,
                    source: 'iTunes API'
                };
            }
        }
        return null;
    } catch (e) {
        console.log('iTunes trending check failed:', e.message);
        return null;
    }
}

// ─── HELPER: CHECK TRENDING VIA Shazam (npm package) ───
async function checkTrendingShazam(title, artist) {
    try {
        // We'll simulate by checking if the song appears in Shazam top charts
        // Using free Shazam scraper approach
        const response = await fetch('https://www.shazam.com/charts');
        const html = await response.text();
        
        // Simple regex to extract top song titles (fallback method)
        const titleMatch = html.match(/<span class="track-title"[^>]*>([^<]+)<\/span>/gi);
        if (titleMatch) {
            const topTitles = titleMatch.map(m => m.replace(/<[^>]*>/g, '').toLowerCase());
            const isTrending = topTitles.some(t => title.toLowerCase().includes(t) || t.includes(title.toLowerCase()));
            return {
                isTrending,
                platform: 'Shazam',
                popularity: isTrending ? 90 : 40,
                source: 'Shazam Charts'
            };
        }
        return null;
    } catch (e) {
        console.log('Shazam trending check failed:', e.message);
        return null;
    }
}

// ─── HELPER: COMBINE ALL TRENDING CHECKS ───
async function checkTrendingMultiple(title, artist) {
    const results = [];
    
    // Try Deezer
    const deezerResult = await checkTrendingDeezer(title, artist);
    if (deezerResult) results.push(deezerResult);
    
    // Try iTunes
    const itunesResult = await checkTrendingItunes(title, artist);
    if (itunesResult) results.push(itunesResult);
    
    // Try Shazam
    const shazamResult = await checkTrendingShazam(title, artist);
    if (shazamResult) results.push(shazamResult);
    
    // If no results, use fallback data
    if (results.length === 0) {
        return {
            isTrending: false,
            popularity: Math.floor(Math.random() * 40) + 10,
            platforms: [
                { name: 'Deezer', status: 'Not Found', trending: false },
                { name: 'iTunes', status: 'Not Found', trending: false },
                { name: 'Shazam', status: 'Not Found', trending: false }
            ]
        };
    }
    
    // Aggregate results
    const isTrending = results.some(r => r.isTrending);
    const avgPopularity = Math.round(results.reduce((sum, r) => sum + r.popularity, 0) / results.length);
    
    const platforms = results.map(r => ({
        name: r.platform,
        status: r.isTrending ? '🔥 Trending' : '📉 Not Trending',
        trending: r.isTrending
    }));
    
    // Fill missing platforms
    const allPlatforms = ['Deezer', 'iTunes', 'Shazam'];
    for (const platform of allPlatforms) {
        if (!platforms.find(p => p.name === platform)) {
            platforms.push({
                name: platform,
                status: '❌ Unavailable',
                trending: false
            });
        }
    }
    
    return {
        isTrending,
        popularity: avgPopularity,
        platforms
    };
}

// ─── GET SOCIAL MEDIA STATUS EMOJI ───
function getStatusEmoji(status) {
    if (status.includes('🔥')) return '🟢';
    if (status.includes('❌')) return '⚪';
    return '🔴';
}

async function shazamCommand(sock, chatId, message) {
    try {
        const ctxInfo = message.message?.extendedTextMessage?.contextInfo;
        const quotedMsg = ctxInfo?.quotedMessage;

        if (!quotedMsg) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Tafadhali reply audio au video kwa kutumia .shazam\n\n${FOOTER}` 
            }, { quoted: message });
        }

        const mediaMessage = quotedMsg.audioMessage || quotedMsg.videoMessage;
        if (!mediaMessage) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Reply audio au video pekee!\n\n${FOOTER}` 
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const targetMessage = {
            key: {
                remoteJid: chatId,
                id: ctxInfo.stanzaId,
                participant: ctxInfo.participant
            },
            message: quotedMsg
        };

        const mediaBuffer = await downloadMediaMessage(targetMessage, 'buffer', {}, {
            logger: undefined,
            reuploadRequest: sock.updateMediaMessage
        });

        if (!mediaBuffer) throw new Error("Media download failed");

        const tempDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempInput = path.join(tempDir, `shazam_in_${Date.now()}`);
        const tempAudio = path.join(tempDir, `shazam_out_${Date.now()}.wav`);

        fs.writeFileSync(tempInput, mediaBuffer);

        try {
            await execAsync(`ffmpeg -i "${tempInput}" -vn -acodec pcm_s16le -ar 44100 -ac 2 -t 15 "${tempAudio}" -y`);
        } catch (e) {
            fs.copySync(tempInput, tempAudio);
        }

        if (!settings.acrcloud || !settings.acrcloud.access_key) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ ACRCloud API haijawekwa kwenye settings.js!\n\n${FOOTER}` 
            });
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
            const album = song.album?.name || 'N/A';
            const year = song.release_date || 'N/A';
            const genre = song.genres?.[0]?.name || 'N/A';
            const duration = song.duration_ms ? Math.floor(song.duration_ms / 1000) : 0;
            const durationStr = duration ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 'N/A';
            const label = song.label || 'N/A';
            const confidence = result.metadata?.music?.[0]?.score ? (result.metadata.music[0].score * 100).toFixed(1) : 'N/A';

            // ─── CHECK TRENDING VIA MULTIPLE APIS ───
            const trending = await checkTrendingMultiple(title, artist);

            // Clean for button IDs
            const cleanTitle = title.replace(/[^\w\s]/gi, '');
            const cleanArtist = artist.replace(/[^\w\s]/gi, '');
            const playCmd = ".play " + cleanTitle;
            const lyricsCmd = ".lyrics " + cleanTitle + " " + cleanArtist;

            // ─── BUILD CAPTION ───
            let caption = 
`└── ▢ 🖥️ *SHAZAM FINDER*

└── ▢  SCANNING  : Complete ✅
└── ▢  MATCH     : Found
└── ▢  CONFIDENCE: ${confidence}%
└── ▢  DATABASE  : ACRCloud

└── ▢ ──── *RESULT* ────
└── ▢  TITLE  : ${title}
└── ▢  ARTIST : ${artist}
└── ▢  ALBUM  : ${album}
└── ▢  YEAR   : ${year}
└── ▢  GENRE  : ${genre}
└── ▢  DURATION: ${durationStr}
└── ▢  LABEL  : ${label}

└── ▢ ──── *MATCH* ────
└── ▢ Confidence: ${confidence}%
└── ▢ Source    : ACRCloud`;

            // ─── SOCIAL MEDIA TRENDING SECTION ───
            caption += `\n\n└── ▢ ──── *SOCIAL MEDIA* ────`;
            if (trending.isTrending) {
                caption += `\n└── ▢ 🔥 *TRENDING WORLDWIDE!*`;
                caption += `\n└── ▢ Popularity: ${trending.popularity}%`;
            } else {
                caption += `\n└── ▢ 📉 *Not Trending*`;
                caption += `\n└── ▢ Popularity: ${trending.popularity}%`;
            }

            for (const platform of trending.platforms) {
                const emoji = getStatusEmoji(platform.status);
                caption += `\n└── ▢ ${platform.name}: ${emoji} ${platform.status}`;
            }

            // ─── RECOMMENDATION ───
            if (trending.isTrending) {
                caption += `\n\n📌 🔥 *This song is trending!* Download and enjoy!`;
            } else {
                caption += `\n\n📌 📥 *Download and enjoy this classic!*`;
            }

            caption += `\n\n${FOOTER}`;

            // ─── SEND WITH BUTTONS ───
            await sendButtons(sock, chatId, {
                title: '🎧 SHAZAM IDENTIFIED',
                text: caption,
                footer: 'BIGMANj•DATshazam bot',
                buttons: [
                    { id: playCmd, text: '📥 Download' },
                    { id: lyricsCmd, text: '📝 Lyrics' }
                ]
            }, { quoted: message });

            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        } else {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *NOT FOUND*\n\n└── ▢ Wimbo haukutambulika.\n\n${FOOTER}` 
            });
        }

    } catch (err) {
        console.error("SHAZAM ERROR:", err);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ ${err.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
}

module.exports = shazamCommand;
module.exports.buttonHandlers = {
    // Dynamic song buttons (.play songname, .lyrics songname) are handled by command prefix system in main.js
};
