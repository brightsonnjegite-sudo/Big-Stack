const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

// Safisha na pakia state
function loadState() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'antistatusmention.json'), 'utf8');
        const state = JSON.parse(raw);
        if (!state.perGroup) state.perGroup = {};
        return state;
    } catch (e) {
        return { perGroup: {} };
    }
}

function saveState(state) {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(path.join(dataDir, 'antistatusmention.json'), JSON.stringify(state, null, 2));
    } catch (e) {
        console.error('Failed to save state:', e?.message);
    }
}

function isEnabledForChat(state, chatId) {
    return !!state?.perGroup?.[chatId];
}

async function handleAntiStatusMention(sock, chatId, message) {
    try {
        if (!chatId?.endsWith('@g.us') || !message?.message || message.key?.fromMe) return;

        const state = loadState();
        if (!isEnabledForChat(state, chatId)) return;

        const rawBotId = sock.user?.id || '';
        const botNum = rawBotId.split('@')[0].split(':')[0];

        const msg = message.message || {};
        const text = (
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            ''
        ).toString();

        if (!text) return;

        // 1. NGUVU MPYA: Detect Hidden Mentions & Spam Patterns
        // Inatafuta maneno kama "Mentioned you", "Status", au tag feki za @everyone
        const spamPatterns = [
            /mention(ed)?\s+(you|this|group|in\s+status)/i,
            /status\s+mention/i,
            /view\s+status/i,
            /@everyone/i, // Baadhi ya status spam hutumia hii kudanganya watu
            /@\d+/ // Inatafuta namba zilizowekwa tag bila kuwa real mentions
        ];

        let isSpam = spamPatterns.some(pattern => pattern.test(text));

        // 2. NGUVU MPYA: Check invisible/zero-width characters (Mbinu mpya ya kuzuia bot)
        if (!isSpam) {
            const invisibleChars = /[\u200B-\u200D\uFEFF]/;
            if (invisibleChars.test(text) && text.includes(botNum)) isSpam = true;
        }

        // 3. NGUVU MPYA: Bot Number Detection (Heuristic)
        if (!isSpam && text.includes(botNum)) {
            // Ikiwa message ina namba ya bot na haina mentionedJid, ni 90% status mention
            const mentionedJids = msg.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length === 0) isSpam = true;
        }

        if (!isSpam) return;

        // 4. USALAMA: Check Admin Status
        const sender = message.key.participant || message.key.remoteJid;
        const senderAdminInfo = await isAdmin(sock, chatId, sender).catch(() => ({ isSenderAdmin: false }));
        if (senderAdminInfo.isSenderAdmin) return;

        const botAdminInfo = await isAdmin(sock, chatId, rawBotId).catch(() => ({ isBotAdmin: false }));
        if (!botAdminInfo.isBotAdmin) return;

        // 5. ACTION: Futa Message
        const messageId = message.key.id;
        try {
            await sock.sendMessage(chatId, { delete: message.key });
            
            // Tuma onyo fupi
            await sock.sendMessage(chatId, { 
                text: `🚫 *ANTI-STATUS SPAM*\n\nNimefuta ujumbe kutoka kwa @${sender.split('@')[0]} kwa sababu una dalili za Status Mention Spam.`,
                mentions: [sender]
            });
            
            console.log(`[AntiStatus] Deleted spam from ${sender} in ${chatId}`);
        } catch (err) {
            console.error('Failed to delete spam:', err.message);
        }

    } catch (err) {
        console.error('handleAntiStatusMention error:', err);
    }
}

async function groupAntiStatusToggleCommand(sock, chatId, message, args) {
    try {
        if (!chatId?.endsWith('@g.us')) return;

        const sender = message.key.participant || message.key.remoteJid;
        const adminInfo = await isAdmin(sock, chatId, sender);
        
        if (!adminInfo.isSenderAdmin && !message.key.fromMe) {
            return sock.sendMessage(chatId, { text: '❌ Amri hii ni kwa Admins tu.' }, { quoted: message });
        }

        const onoff = (args[0] || '').toLowerCase();
        if (!['on', 'off'].includes(onoff)) {
            return sock.sendMessage(chatId, { text: 'Matumizi: .antistatusmention on/off' }, { quoted: message });
        }

        const state = loadState();
        state.perGroup[chatId] = onoff === 'on';
        saveState(state);

        await sock.sendMessage(chatId, { react: { text: '🛡️', key: message.key } });
        return sock.sendMessage(chatId, { text: `🛡️ Anti-Status-Mention sasa ipo: *${onoff.toUpperCase()}*` }, { quoted: message });
    } catch (e) {
        console.error(e);
    }
}

module.exports = { handleAntiStatusMention, groupAntiStatusToggleCommand };
