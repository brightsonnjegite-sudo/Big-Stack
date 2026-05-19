const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
// Ku-import gifted-btns kwa ajili ya kutengeneza button za kisasa na rahisi
const { sendButtons } = require('gifted-btns');

// Paths za kuhifadhi data
const STATE_PATH = path.join(__dirname, '..', 'data', 'chatbot.json');
const MEMORY_PATH = path.join(__dirname, '..', 'data', 'chatbot_memory.json');

// --- HELPERS ---
function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) return { perGroup: {}, private: false };
        const data = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
        return { perGroup: {}, private: false, ...data };
    } catch (e) { return { perGroup: {}, private: false }; }
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

function extractText(m) {
    try {
        if (!m || !m.message) return '';
        const msg = m.message;
        
        // Inasoma text za kawaida, button za kisasa (gifted-btns), na button za kizamani (buttonsResponseMessage)
        return (
            msg.conversation || 
            msg.extendedTextMessage?.text || 
            msg.imageMessage?.caption || 
            msg.videoMessage?.caption || 
            msg.buttonsResponseMessage?.selectedButtonId || 
            msg.buttonsResponseMessage?.selectedDisplayText ||
            msg.templateButtonReplyMessage?.selectedId ||
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
            (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ? 
                JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : '') ||
            ''
        ).trim();
    } catch (e) { return ''; }
}

// --- MAIN CHATBOT HANDLER ---
async function handleChatbotMessage(sock, chatId, m, userText = null) {
    try {
        if (!chatId || m.key?.fromMe) return;

        const text = userText || extractText(m);
        // Puuza kama ni command au text tupu
        if (!text || text.startsWith('.') || text.startsWith('!') || text.startsWith('/')) return; 

        const userName = m.pushName || 'Mshkaji'; 

        const state = loadState();
        const isGroup = chatId.endsWith('@g.us');
        const enabled = isGroup ? !!state.perGroup?.[chatId]?.enabled : !!state.private;

        if (!enabled) return;

        let memory = loadMemory();
        if (!memory[chatId]) memory[chatId] = { chats: [], lastUpdate: Date.now() };

        memory[chatId].chats.push({ role: "user", content: text, name: userName });
        memory[chatId].lastUpdate = Date.now();

        if (memory[chatId].chats.length > 6) memory[chatId].chats.shift();

        const history = memory[chatId].chats
            .map(msg => `${msg.role === 'user' ? msg.name : 'Mickey'}: ${msg.content}`)
            .join("\n");

        try { await sock.sendPresenceUpdate('composing', chatId); } catch (e) {}

        // --- FULLY OPTIMIZED PROMPT (IDENTITY, VIBE & BUTTON RULES) ---
        const systemPrompt = `[ROLE]: Wewe ni MICKEY GLITCH V3, genius chatbot uliyetengenezwa na Mickdadi Hamza (Quantum Code Dev).
[TARGET]: Unaongea na "${userName}".

[STRICT RULES]:
1. IDENTITY: Ukiulizwa wewe ni nani, kataa kabisa kuwa ChatGPT au OpenAI. Wewe ni Mickey Glitch pekee!
2. PERSONALITY: Ongea kishkaji sana kwa kutumia Sheng/Slang ya Tanzania. Tumia maneno kama 'Oya', 'Niaje', 'Mwanangu', 'Inakuwaje', 'Wadao'.
3. CONTEXT: Mtaje "${userName}" mara kwa mara hasa akisalimia au ukitaka kusisitiza jambo ili kuweka vibe la kirafiki.
4. BREVITY: Majibu yako yawe mafupi, straight to the point, changamka na weka michapo ya kijanja.
5. OWNER: Masuala yote makubwa ya kitalaamu mwelekeze kwa mtaalamu Mickdadi (255612130873).

[BUTTON GENERATION RULES]:
Wewe una uwezo wa kutengeneza button za kubonyeza kwenye WhatsApp ya mtumiaji. Kila unapoona inafaa kutoa machaguo (options), au kumkaribisha mtu, LAZIMA uandike button mwisho wa jibu lako kwa muundo huu maalum:
[BUTTON: Maandishi ya Kwenye Button | id_au_command]

MISINGI YA BUTTON:
- Usizidi button tatu (3) kwa jibu moja.
- ID ya button inaweza kuwa command kama (.menu, .owner) au neno fupi la kawaida (msaada, mambo).

MIFANO YA JINSI YA KUTENGENEZA BUTTON (Iige kabisa):
Mfano 1 (Mtu akisalimia):
"Oya niaje ${userName}! Inakuwaje mwanangu? Karibu kwenye Mickey Glitch V3. Nicheki hapa chini:
[BUTTON: Fungua Menu | .menu]
[BUTTON: Ongea na Boss | .owner]"

Mfano 2 (Mtu akiomba msaada au kuuliza maswali):
"Inatosha mwanangu, mambo ya system yamenyooka. Unataka msaada gani sasa hivi? Chagua hapa:
[BUTTON: Menu Kuu | .menu]
[BUTTON: Contact Mickdadi | .owner]
[BUTTON: Kimbia Group | .kick]"`;

        const fullPrompt = `INSTRUCTIONS:\n${systemPrompt}\n\n---\nCHAT_HISTORY:\n${history}\n\n---\nUSER: ${userName}\nINPUT: ${text}\nMICKEY:`;

        // API Call
        const apiUrl = `https://api.yupra.my.id/api/ai/gpt5?text=${encodeURIComponent(fullPrompt)}`;
        const fetchRes = await fetch(apiUrl);
        const res = await fetchRes.json();

        let reply = res?.response || res?.result || res?.message || res?.data || "";

        if (!reply) return;

        // Auto-cleaner ya majina ya AI nyingine
        reply = reply.replace(/Microsoft|Copilot|AI Assistant|OpenAI|GPT-3|GPT-4|ChatGPT/gi, "Mickey Glitch");

        // --- REGEX YA KUCHUJA BUTTONS ---
        const buttonRegex = /\[BUTTON:\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
        let match;
        let extractedButtons = [];

        // Kusanya button zote zilizoandikwa na AI
        while ((match = buttonRegex.exec(reply)) !== null) {
            extractedButtons.push({
                displayText: match[1].trim(),
                id: match[2].trim()
            });
        }

        // Safisha jibu ili visionekane vile vi-code vya [BUTTON: ...] kwenye chat ya mtumiaji
        let cleanReply = reply.replace(buttonRegex, '').trim();

        // Hifadhi jibu lililosafishwa kwenye memory
        memory[chatId].chats.push({ role: "assistant", content: cleanReply });
        saveMemory(memory);

        // --- TUMA MESSAGE KULINGANA NA KAMA KUNA BUTTONS ---
        if (extractedButtons.length > 0) {
            // Inatuma kwa npm ya gifted-btns
            // Muundo: sendButtons(sock, chatId, text, footer, buttonsArray, quoted)
            await sendButtons(sock, chatId, cleanReply, "🤖 Mickey Glitch V3", extractedButtons, m);
        } else {
            // Kama AI haikuweka button, inatuma kama text ya kawaida
            await sock.sendMessage(chatId, { text: cleanReply }, { quoted: m });
        }

    } catch (e) { 
        console.error('❌ Chatbot Error:', e); 
    }
}

// --- COMMAND HANDLER (ON/OFF) ---
async function groupChatbotToggleCommand(sock, chatId, m, body) {
    try {
        const state = loadState();
        const args = (body || '').trim().split(/\s+/);
        const sub = args[0]?.toLowerCase();

        if (sub === 'private') {
            state.private = (args[1]?.toLowerCase() === 'on');
            saveState(state);
            return await sock.sendMessage(chatId, { text: `✅ *Private Chatbot:* ${state.private ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
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
            return await sock.sendMessage(chatId, { text: `✅ *Chatbot:* ${isEnable ? 'ON 🟢' : 'OFF 🔴'}` }, { quoted: m });
        }

        const helpMsg = `🤖 *MICKEY CHATBOT*\n\n.chatbot on/off (Kwa group)\n.chatbot private on/off (Kwa DM)`;
        return await sock.sendMessage(chatId, { text: helpMsg }, { quoted: m });
    } catch (e) { console.error('❌ Toggle Error:', e); }
}

module.exports = { handleChatbotMessage, groupChatbotToggleCommand };
