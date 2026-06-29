// commands/lyrics.js
const axios = require('axios');
const yts = require('yt-search');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ========== Helpers ==========
function extractArtist(info) {
    if (!info.author) return 'Unknown';
    if (typeof info.author === 'string') return info.author;
    if (typeof info.author === 'object' && info.author.name) return info.author.name;
    return 'Unknown';
}

function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------- API 1: Genius (with your key) ----------
async function getLyricsFromGenius(songTitle, artist) {
    try {
        const geniusKey = 'EgvcA3lUT6fe3vlicHWpkHZDwcqqSU68ve2z7Ai7AlPrFfIGhWXAYUAIG3pQ0bxU';
        const searchQuery = encodeURIComponent(`${songTitle} ${artist}`);
        const searchUrl = `https://api.genius.com/search?q=${searchQuery}`;
        const searchRes = await axios.get(searchUrl, {
            headers: { Authorization: `Bearer ${geniusKey}` },
            timeout: 15000
        });

        const hits = searchRes.data?.response?.hits;
        if (!hits || hits.length === 0) throw new Error('No Genius results');

        const song = hits[0].result;
        const songUrl = song.url;
        const title = song.title;
        const artistName = song.primary_artist.name;
        const album = song.album?.name || 'Single';
        const duration = song.duration || 0;

        // Scrape lyrics
        const pageRes = await axios.get(songUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        const html = pageRes.data;

        let lyrics = null;
        let match = html.match(/<div class="lyrics"[^>]*>([\s\S]*?)<\/div>/);
        if (match) {
            lyrics = match[1];
        } else {
            match = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/);
            if (match) lyrics = match[1];
        }

        if (!lyrics) throw new Error('Could not extract lyrics');

        lyrics = lyrics
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

        if (lyrics.length < 20) throw new Error('Lyrics too short');

        return {
            lyrics,
            title,
            artist: artistName,
            album,
            duration,
            synced: null,
            source: 'Genius'
        };
    } catch (err) {
        throw new Error('Genius failed: ' + err.message);
    }
}

// ---------- API 2: LRCLIB (synced & plain, no key) ----------
async function getLyricsFromLRCLIB(songTitle, artist) {
    try {
        const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(songTitle)}`;
        const res = await axios.get(url, { timeout: 15000 });
        if (res.data?.syncedLyrics || res.data?.plainLyrics) {
            const lyrics = res.data.plainLyrics || res.data.syncedLyrics;
            if (lyrics && lyrics.length > 20) {
                return {
                    lyrics,
                    title: songTitle,
                    artist: artist,
                    album: res.data.albumName || 'Unknown',
                    duration: res.data.duration || 0,
                    synced: res.data.syncedLyrics || null,
                    source: 'LRCLIB'
                };
            }
        }
        throw new Error('LRCLIB failed');
    } catch (err) {
        throw new Error('LRCLIB failed');
    }
}

// ---------- API 3: Lyrics.ovh (free, no key) ----------
async function getLyricsFromLyricsOvh(songTitle, artist) {
    try {
        const artistEnc = encodeURIComponent(artist);
        const titleEnc = encodeURIComponent(songTitle);
        const url = `https://api.lyrics.ovh/v1/${artistEnc}/${titleEnc}`;
        const res = await axios.get(url, { timeout: 15000 });
        if (res.data?.lyrics) {
            const lyrics = res.data.lyrics.trim();
            if (lyrics.length > 20) {
                return {
                    lyrics,
                    title: songTitle,
                    artist: artist,
                    album: 'Unknown',
                    duration: 0,
                    synced: null,
                    source: 'Lyrics.ovh'
                };
            }
        }
        throw new Error('Lyrics.ovh failed');
    } catch (err) {
        throw new Error('Lyrics.ovh failed');
    }
}

// ---------- API 4: Some-Random-API (free) ----------
async function getLyricsFromSomeRandom(songTitle, artist) {
    try {
        const query = encodeURIComponent(`${artist} ${songTitle}`);
        const url = `https://some-random-api.com/lyrics?title=${query}`;
        const res = await axios.get(url, { timeout: 15000 });
        if (res.data?.lyrics) {
            const lyrics = res.data.lyrics.trim();
            if (lyrics.length > 20) {
                return {
                    lyrics,
                    title: res.data.title || songTitle,
                    artist: res.data.author || artist,
                    album: 'Unknown',
                    duration: res.data.duration || 0,
                    synced: null,
                    source: 'SomeRandom'
                };
            }
        }
        throw new Error('SomeRandom failed');
    } catch (err) {
        throw new Error('SomeRandom failed');
    }
}

// ---------- API 5: EliteProTech (your existing) ----------
async function getLyricsFromEliteProTech(songTitle, artist) {
    try {
        const query = artist && artist !== 'Unknown' ? `${artist} ${songTitle}` : songTitle;
        const url = `https://eliteprotech-apis.zone.id/lyrics?query=${encodeURIComponent(query)}`;
        const res = await axios.get(url, { timeout: 15000 });

        if (res.data?.success && res.data?.result && res.data.result.length > 0) {
            const song = res.data.result[0];
            if (song.instrumental === true || !song.plainLyrics) {
                throw new Error('Instrumental or no lyrics');
            }
            return {
                lyrics: song.plainLyrics,
                title: song.trackName || songTitle,
                artist: song.artistName || artist,
                album: song.albumName || 'Single',
                duration: song.duration || 0,
                synced: song.syncedLyrics || null,
                source: 'EliteProTech'
            };
        }
        throw new Error('No results from EliteProTech');
    } catch (err) {
        throw new Error('EliteProTech failed');
    }
}

// ========== MASTER FETCH FUNCTION ==========
async function fetchLyrics(songTitle, artist) {
    const apis = [
        getLyricsFromGenius,
        getLyricsFromLRCLIB,
        getLyricsFromLyricsOvh,
        getLyricsFromSomeRandom,
        getLyricsFromEliteProTech
    ];

    for (const api of apis) {
        try {
            console.log(`[LYRICS] Trying ${api.name}...`);
            const result = await api(songTitle, artist);
            if (result.lyrics && result.lyrics.length > 20) {
                return result;
            }
        } catch (err) {
            console.log(`[LYRICS] ${api.name} failed:`, err.message);
        }
    }

    throw new Error('No lyrics found from any API');
}

// ========== MAIN COMMAND ==========
async function lyricsCommand(sock, chatId, message) {
    let query = '';

    try {
        const text = message.message?.conversation ||
                     message.message?.extendedTextMessage?.text ||
                     '';
        query = text.split(' ').slice(1).join(' ').trim();

        if (!query) {
            const usageMsg = 
`└── ▢ 🎵 *LYRICS FINDER*

└── ▢ Usage  : .lyrics <song name>
└── ▢ Format : .lyrics artist - song

📌 Example: .lyrics Bohemian Rhapsody

${FOOTER}`;
            return sock.sendMessage(chatId, { text: usageMsg });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        // Parse artist and title
        let artist = '';
        let songTitle = query;

        if (query.includes(' - ')) {
            const parts = query.split(' - ');
            artist = parts[0].trim();
            songTitle = parts[1].trim();
        } else if (query.includes(' by ')) {
            const parts = query.split(' by ');
            songTitle = parts[0].trim();
            artist = parts[1].trim();
        } else {
            try {
                const searchResults = await yts(query);
                if (searchResults?.videos?.length > 0) {
                    const info = searchResults.videos[0];
                    songTitle = info.title || query;
                    artist = extractArtist(info);
                } else {
                    artist = 'Unknown';
                }
            } catch (ytErr) {
                artist = 'Unknown';
            }
        }

        // Heuristic: if artist is Unknown and query has spaces, last word = artist
        if (artist === 'Unknown' && query.includes(' ')) {
            const words = query.split(' ');
            if (words.length > 1) {
                const lastWord = words.pop();
                artist = lastWord;
                songTitle = words.join(' ');
            }
        }

        // Send initial "searching" message
        const initialText = 
`└── ▢ 🎵 *LYRICS SEARCH*

└── ▢ Song     : ${songTitle}
└── ▢ Artist   : ${artist}
└── ▢ Album    : Searching...
└── ▢ Duration : Searching...
└── ▢ API      : Fetching...
└── ▢ Status   : ⏳ Searching...

📌 Please wait...

${FOOTER}`;

        let sentMsg = await sock.sendMessage(chatId, { text: initialText });

        // Fetch lyrics
        const result = await fetchLyrics(songTitle, artist);
        const { lyrics, title, artist: artistName, album, duration, synced, source } = result;

        let displayLyrics = lyrics;
        if (lyrics.length > 3900) {
            displayLyrics = lyrics.substring(0, 3900) + '\n\n... (lyrics truncated)';
        }

        const updatedText = 
`└── ▢ 🎵 *LYRICS FOUND*

└── ▢ Song     : ${title}
└── ▢ Artist   : ${artistName}
└── ▢ Album    : ${album || 'Single'}
└── ▢ Duration : ${formatDuration(duration)}
└── ▢ API      : ${source}
└── ▢ Status   : ✅ Complete

${displayLyrics}

${FOOTER}`;

        try {
            await sock.sendMessage(chatId, { text: updatedText, edit: sentMsg.key });
        } catch (editErr) {
            await sock.sendMessage(chatId, { text: updatedText });
        }

        // Synced lyrics (only if available)
        if (synced) {
            const syncMsg = 
`└── ▢ 🎼 *SYNCED LYRICS*

└── ▢ Status : ✅ Available
└── ▢ Format : LRC

\`\`\`${synced.slice(0, 1500)}\`\`\`

${FOOTER}`;
            await sock.sendMessage(chatId, { text: syncMsg });
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (err) {
        console.error('[LYRICS] Error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });

        const searchTerm = query || 'the song';
        if (err.message.includes('No lyrics found') || err.message.includes('Instrumental')) {
            const errMsg = 
`└── ▢ ❌ *LYRICS NOT FOUND*

└── ▢ Song : ${searchTerm}
└── ▢ Status : ❌ Failed
└── ▢ Reason : No lyrics available

📌 Tips:
• Check spelling
• Use artist - song format
• Try a different song

${FOOTER}`;
            await sock.sendMessage(chatId, { text: errMsg });
        } else {
            const errMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ Status : ❌ Failed
└── ▢ Details : ${err.message || 'Unknown error'}

📌 Please try again later.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: errMsg });
        }
    }
}

module.exports = lyricsCommand;
