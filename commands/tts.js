// commands/tts.js
const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const FOOTER = '© bigmanj tech ™ with ♥︎';

// Function to detect language (Swahili or English)
function detectLanguage(text) {
    // Common Swahili words
    const swahiliWords = [
        'habari', 'jina', 'asante', 'tafadhali', 'sawa', 'ndio', 'hapana',
        'kwaheri', 'pole', 'nzuri', 'mbaya', 'leo', 'kesho', 'jana',
        'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao', 'ni', 'na', 'wa',
        'kwangu', 'kwako', 'kwake', 'kwetu', 'kwenu', 'kwao', 'mambo', 'vipi',
        'karibu', 'shukran', 'tafuta', 'pata', 'weza', 'fanya', 'enda',
        'kuja', 'ona', 'sikia', 'sema', 'jibu', 'uliza', 'jaribu',
        'kazi', 'nyumbani', 'shule', 'kazini', 'mgahawa', 'duka'
    ];
    
    const lower = text.toLowerCase();
    const count = swahiliWords.filter(w => lower.includes(w)).length;
    return count > 0 ? 'sw' : 'en';
}

async function ttsCommand(sock, chatId, text, message) {
    // Check if text is provided
    if (!text || text.trim() === '') {
        await sock.sendMessage(chatId, {
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please provide text for TTS.\n└── ▢ Example: .tts Hello world\n\n${FOOTER}`
        }, { quoted: message });
        return;
    }

    const fileName = `tts-${Date.now()}.mp3`;
    const dir = path.join(__dirname, '..', 'assets');
    const filePath = path.join(dir, fileName);

    try {
        // Ensure assets directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        // Detect language
        const lang = detectLanguage(text);
        const languageCode = lang === 'sw' ? 'sw' : 'en';

        // Generate speech using gTTS
        const gtts = new gTTS(text, languageCode);
        
        // Save the audio file
        await new Promise((resolve, reject) => {
            gtts.save(filePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Read the audio buffer
        const buffer = await fs.promises.readFile(filePath);
        if (!buffer || buffer.length === 0) {
            throw new Error('Generated audio is empty');
        }

        // Send ONLY the audio – no extra text, no caption
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false // Set to true if you want voice note style
        }, { quoted: message });

    } catch (err) {
        console.error('[TTS] Error:', err);
        // Only send error message if something fails
        await sock.sendMessage(chatId, {
            text: `└── ▢ ❌ *TTS ERROR*\n\n└── ▢ ${err.message || 'Unknown error'}\n\n${FOOTER}`
        }, { quoted: message });
    } finally {
        // Clean up temp file
        try {
            await fs.promises.unlink(filePath);
        } catch (e) {
            // Ignore cleanup errors
        }
    }
}

module.exports = ttsCommand;
