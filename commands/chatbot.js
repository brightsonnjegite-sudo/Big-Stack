const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- MSAIDIZI WA DATA (HELPERS) ---
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
        return { perGroup: {}, private: false, ...data };
    } catch (e) { 
        return { perGroup: {}, private: false }; 
    }
}

function saveState(state) {
    try {
        const dir = path.dirname(STATE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) { console.error('❌ State Save Err:', e); }
}

function loadMemory() {
    try {
        if (!fs.existsSync(MEMORY_PATH)) return {};
        const data = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
        const now = Date.now();
        let changed = false;
        for (const id in data) {
            // Futa memory baada ya dk 10 za ukimya ili kuzuia kuchanganya mada
            if (data[id].lastUpdate && (now - data[id].lastUpdate > 600000)) {
                delete data[id];
                changed = true;
            }
        }
        if (changed) saveMemory(data);
        return data;
    } catch (e) { return {}; }
}

function saveMemory(memory) {
    try {
        const dir = path.dirname(MEMORY_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2));
    } catch (e) { console.error('❌ Memory Save Err:', e); }
}

// BORESHO KUBWA: Hii inakamata kila aina ya text (Conversations, Replies, Captions)
function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        
        // Inasoma message za kawaida, za kureply (extended), na captions za picha/video
        const text = msg.conversation || 
                     msg.extendedTextMessage?.text || 
                     msg.imageMessage?.caption || 
                     msg.videoMessage?.caption || 
                     msg.buttonsResponseMessage?.selectedButtonId ||
                     msg.listResponseMessage?.singleSelectReply?.selectedRowId || 
                     '';
        return text.trim();
    } catch (e) { return ''; }
}

// --- 1. MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        // Kama kuna text imetumwa moja kwa moja au itafute kwenye message
        const text = userText || extractText(m);
        
        // Kama hakuna maandishi, au ni command ya bot (mfano .menu), usijibu
        if (!text || text.startsWith('.') || text.startsWith('!') || text.startsWith('/')) return; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        
        // Check kama chatbot imewashwa
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;
        if (!enabled) return;

        console.log(`\x1b[36m🤖 [MICKEY AI]: Processing:\x1b[0m ${text}`);

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        // Tunatunza message 5 za mwisho ili AI iwe na kumbukumbu ya mazungumzo
        memory[chatId].chats.push({ role: "user", content: text });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 5) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? 'Mteja' : 'Mickey'}: ${msg.content}`)
            .join("\n");

        // Onyesha bot "inatype..."
        try { await sock.sendPresenceUpdate('composing', chatId); } catch (e) {}

        // --- SYSTEM PROMPT (Hapa ndipo tabia ya bot inatengenezwa) ---
        const systemPrompt = `Wewe unaitwa MICKEY, mshkaji wa karibu na Genius Support wa Mickey Glitch Bot. 
        TABIA: Ongea kishkaji cha Kitanzania (Sheng/Slang kama 'Niaje', 'Safi', 'Oya'). 
        MAJIBU: Jibu kwa ufasaha na maneno kamili. Usitumie emoji pekee. Kama hujui kitu, waambie wamcheki Mickdadi (Owner).
        IDENTITY: Wewe ni Mickey Glitch V3 Bot, iliyotengenezwa na Mickdadi Hamza.`;

        // Kuchanganya historia na swali jipya
        const fullPrompt = `Maelekezo: ${systemPrompt}\n\nHistoria ya Chati:\n${history}\n\nMteja: ${text}\nMickey:`;
        
        // Kutumia API (Yupra API)
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;

        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();
        
        // Kunasa jibu (Fallback kwenye keys mbalimbali za API)
        let reply = res?.response || res?.result || res?.message || res?.data;

        if (!reply || reply.length < 1) {
            console.log("⚠️ API haijatoa jibu kwa maandishi haya.");
            return;
        }

        // Hifadhi jibu la bot kwenye memory
        memory[chatId].chats.push({ role: "assistant", content: reply });
        saveMemory(memory);

        // Tuma jibu kwa mteja
        await sock.sendMessage(chatId, { text: reply }, { quoted: m });

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- 2. TOGGLE COMMAND (.chatbot on/off) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();

        if (sub === 'private') {
            const mode = args[1]?.toLowerCase();
            state.private = (mode === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot Private: *${state.private ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        if (sub === 'on' || sub === 'off') {
            const isEnable = (sub === 'on');
            if (chatId.endsWith('@g.us')) {
                if (!state.perGroup) state.perGroup = {};
                state.perGroup[chatId] = { enabled: isEnable };
            } else {
                state.private = isEnable;
            }
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ Chatbot imewekwa: *${isEnable ? 'ON' : 'OFF'}*` }, { quoted: m });
        }

        return await sock.sendMessage(chatId, { 
            text: `🤖 *MICKEY CHATBOT SETTINGS*\n\n.chatbot on (Washa hapa)\n.chatbot off (Zima hapa)\n.chatbot private on (Washa inbox)` 
        }, { quoted: m });

    } catch (e) { console.error('❌ Toggle Error:', e); }
}

module.exports = { 
    handleChatbotMessage, 
    groupChatbotToggleCommand,
    name: 'chatbot',
    category: 'main'
};
