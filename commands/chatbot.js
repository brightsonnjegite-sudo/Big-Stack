const fs = require('fs');
const path = require('path');

// ========== HARDCODED OWNER NUMBERS ==========
const OWNER_NUMBERS = [
    '255777580820@s.whatsapp.net',   // ← replace with your own number
];
// =============================================

const FOOTER = '© bigmanj tech ™ with ♥︎';

const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// ---------- LANGUAGE DETECTION ----------
function detectLanguage(text) {
    const swahiliWords = [
        'habari', 'jina', 'asante', 'tafadhali', 'sawa', 'ndio', 'hapana',
        'kwaheri', 'pole', 'nzuri', 'mbaya', 'leo', 'kesho', 'jana',
        'mimi', 'wewe', 'yeye', 'sisi', 'nyinyi', 'wao', 'ni', 'na', 'wa',
        'kwangu', 'kwako', 'kwake', 'kwetu', 'kwenu', 'kwao'
    ];
    const lower = text.toLowerCase();
    const count = swahiliWords.filter(w => lower.includes(w)).length;
    return count > 0 ? 'sw' : 'en';
}

// ---------- STATE & MEMORY MANAGEMENT ----------
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch { return { perGroup: {}, private: false }; }
}
function saveState(state) {
    const dir = path.dirname(STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        for (const id in data) {
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 600000)) {
                delete data[id];
                changed = true;
            }
        }
        if (changed) saveMemory(data);
        return data;
    } catch { return {}; }
}
function saveMemory(memory) {
    const dir = path.dirname(MEMORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
}

function isOwner(senderId) {
    return OWNER_NUMBERS.includes(senderId);
}

// ---------- MEDIA DETECTION ----------
function detectMediaAndText(m) {
    const msg = m.message;
    if (!msg) return { type: 'none', text: '', caption: '' };

    if (msg.stickerMessage) return { type: 'sticker', text: '[Sticker]', caption: '' };
    if (msg.videoMessage && msg.videoMessage.gifPlayback) {
        const caption = msg.videoMessage.caption || '';
        return { type: 'gif', text: caption || '[GIF]', caption, duration: msg.videoMessage.seconds || 0 };
    }
    if (msg.videoMessage && !msg.videoMessage.gifPlayback) {
        const caption = msg.videoMessage.caption || '';
        const seconds = msg.videoMessage.seconds || 0;
        return { type: 'video', text: caption || `[Video, ${Math.round(seconds)}s]`, caption, duration: seconds };
    }
    if (msg.audioMessage && msg.audioMessage.ptt === true) {
        const seconds = msg.audioMessage.seconds || 0;
        return { type: 'voice', text: `[Voice note, ${Math.round(seconds)}s]`, caption: '', duration: seconds };
    }
    if (msg.audioMessage && msg.audioMessage.ptt !== true) {
        const seconds = msg.audioMessage.seconds || 0;
        if (seconds >= 60 && seconds <= 120) {
            return { type: 'audio', text: `[Audio, ${Math.round(seconds)}s]`, caption: '', duration: seconds };
        } else {
            return { type: 'ignore', text: '', caption: '' };
        }
    }
    if (msg.imageMessage) {
        const caption = msg.imageMessage.caption || '';
        return { type: 'image', text: caption || '[Image]', caption };
    }
    const text = (msg.conversation || msg.extendedTextMessage?.text || '').trim();
    if (text) return { type: 'text', text, caption: '' };
    return { type: 'none', text: '', caption: '' };
}

// ---------- AI API CALL ----------
async function getAIReply(prompt) {
    try {
        const url = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(prompt)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data?.response || data?.result || data?.message || data?.data || "";
    } catch (err) {
        console.error('API error:', err);
        return "";
    }
}

// ---------- FALLBACK REPLIES (if API fails) ----------
function getFallbackReply(type, lang) {
    const replies = {
        sw: {
            sticker: "Stika nzuri mwanangu! 😂",
            gif: "Hiyo GIF inachekesha! 😄",
            video: "Video poa!",
            voice: "Nimeelewa sauti yako.",
            image: "Picha nzuri!",
            default: "Sawa, naendelea kusikiliza."
        },
        en: {
            sticker: "Nice sticker! 😂",
            gif: "That GIF is funny! 😄",
            video: "Cool video!",
            voice: "Got your voice note.",
            image: "Nice image!",
            default: "Okay, I'm listening."
        }
    };
    return replies[lang]?.[type] || replies[lang]?.default || "I'm here.";
}

// ---------- MAIN CHATBOT HANDLER ----------
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const { type, text, caption, duration } = detectMediaAndText(m);
        if (type === 'ignore') return;

        let finalText = text;
        if (type === 'text' && userText) finalText = userText;
        if (!finalText && type !== 'none') finalText = `[${type}]`;

        // Ignore commands (starts with ., !, /)
        if (type === 'text' && (finalText.startsWith('.') || finalText.startsWith('!') || finalText.startsWith('/'))) return;

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        sock.sendPresenceUpdate('composing', chatId).catch(() => {});

        const detectedLang = detectLanguage(finalText);
        const langInstruction = detectedLang === 'sw' ? 'Jibu kwa Kiswahili.' : 'Respond in English.';

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        const userName = m.pushName || 'Mshkaji';

        // Build a descriptive user message for non‑text media
        let userDisplay = finalText;
        if (type !== 'text') {
            if (type === 'sticker') userDisplay = "💠 alituma stika";
            else if (type === 'gif') userDisplay = `🎞️ alituma GIF: ${caption ? `"${caption}"` : 'bila caption'}`;
            else if (type === 'video') userDisplay = `📹 alituma video ya ${Math.round(duration)}s: ${caption ? `"${caption}"` : ''}`;
            else if (type === 'voice') userDisplay = `🎙️ alituma ujumbe wa sauti (${Math.round(duration)}s)`;
            else if (type === 'audio') userDisplay = `🎵 alituma wimbo wa WhatsApp (${Math.round(duration)}s)`;
            else if (type === 'image') userDisplay = `🖼️ alituma picha: ${caption ? `"${caption}"` : ''}`;
        }

        // Store in memory (limit to 6 messages)
        memory[chatId].chats.push({ role: "user", content: userDisplay, name: userName });
        memory[chatId].lastUpdate = Date.now();
        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats.map(msg => `${msg.role === 'user' ? msg.name : 'bigmanj'}: ${msg.content}`).join("\n");

        const systemPrompt = `[ROLE]: Wewe ni bigmanj, genius chatbot wa Kiswahili.
[TARGET]: Unaongea na "${userName}".
[LANGUAGE]: ${langInstruction}
[STRICT RULES]:
1. IDENTITY: Wewe si ChatGPT wala OpenAI. Wewe ni bigmanj.
2. PERSONALITY: Ongea kishkaji (Tanzanian Slang). Tumia 'Oya', 'Niaje', 'Mwanangu', 'Wadao', 'Fresh' (only if responding in Swahili).
3. CONTEXT: Mtaje "${userName}" inapofaa.
4. BREVITY: Majibu mafupi, moja kwa moja.
5. OWNER: Masuala ya kitalaamu mwelekeze kwa bigmanj tech.
6. FORMAT: Jibu kwa maandishi tu.
7. TOPICS: Unaweza kujibu mambo ya kijamii, chakula, burudani, na hasa masuala ya kiufundi kuhusu bot, codings, na teknolojia.`;

        const fullPrompt = `${systemPrompt}\n\nHISTORY:\n${history}\n\n${userName}: ${userDisplay}\nbigmanj:`;
        let reply = await getAIReply(fullPrompt);

        // Fallback if API returned empty
        if (!reply) {
            reply = getFallbackReply(type, detectedLang);
        }

        // Remove references to other AIs
        reply = reply.replace(/ChatGPT|OpenAI|GPT-3|GPT-4/gi, "bigmanj");

        // Save assistant reply to memory
        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        // Append footer
        const finalReply = `${reply}\n\n${FOOTER}`;

        await sock.sendMessage(chatId, { text: finalReply }, { quoted: m });
    } catch (err) {
        console.error('Chatbot Error:', err);
        const errMsg = detectLanguage(userText || '') === 'sw' 
            ? `Samahani, kuna hitilafu. Jaribu tena.\n\n${FOOTER}` 
            : `Sorry, an error occurred. Try again.\n\n${FOOTER}`;
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: m });
    }
}

// ---------- TOGGLE COMMAND (owner only) ----------
async function toggleCommand(sock, chatId, m, body) {
    try {
        const senderId = m.key.participant || m.key.remoteJid;
        if (!isOwner(senderId) && !m.key.fromMe) {
            return await sock.sendMessage(chatId, { text: `❌ Amri hii ni kwa bot owner pekee.\n\n${FOOTER}` }, { quoted: m });
        }

        const state = loadState();
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();
        const isGroup = chatId.endsWith('@g.us');

        if (sub === 'on') {
            if (isGroup) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: true };
            } else {
                state.private = true;
            }
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *bigmanj* currently there 🟢\n\n${FOOTER}` }, { quoted: m });
        } else if (sub === 'off') {
            if (isGroup) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: false };
            } else {
                state.private = false;
            }
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *bigmnaj* rest now 🔴\n\n${FOOTER}` }, { quoted: m });
        }

        const helpMsg = `🤖 *BIGMANJ CHATBOT*\n\n.bigmanj on - Kuwasha\n.bigmanj off - Kuzima\n\n${FOOTER}`;
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });
    } catch (err) {
        console.error('Toggle Error:', err);
        await sock.sendMessage(chatId, { text: `❌ Kuna hitilafu.\n\n${FOOTER}` }, { quoted: m });
    }
}

module.exports = {
    handleChatbotMessage,
    bigmanjToggleCommand: toggleCommand,
    groupChatbotToggleCommand: toggleCommand
};
