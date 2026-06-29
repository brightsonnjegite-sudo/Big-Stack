const fs = require('fs/promises');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');

const CONFIG_FILE = path.join(__dirname, '../data/autoStatus.json');
const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    viewEnabled: true,
    likeEnabled: true,
});

// 🎯 ONLY THESE THREE EMOJIS – serious reactions
const EMOJI_REACTIONS = ['💚', '🤍', '🖤'];

let configCache = null;
const processedStatusIds = new Set();

async function loadConfig() {
    if (configCache) return configCache;
    try {
        const data = await fs.readFile(CONFIG_FILE, 'utf8');
        configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch (err) {
        configCache = { ...DEFAULT_CONFIG };
        await saveConfig(configCache);
    }

    if (typeof configCache.enabled !== 'boolean') {
        configCache.enabled = true;
    }

    return configCache;
}

async function saveConfig(updates) {
    configCache = { ...configCache, ...updates };
    try {
        await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
        await fs.writeFile(CONFIG_FILE, JSON.stringify(configCache, null, 2), 'utf8');
    } catch (err) {
        console.error('[AutoStatus] Save failed:', err.message);
    }
}

function getRandomEmoji() {
    return EMOJI_REACTIONS[Math.floor(Math.random() * EMOJI_REACTIONS.length)];
}

// AUTO VIEW – Immediate
async function autoView(sock, statusKey) {
    if (!statusKey?.id) return;
    try {
        await sock.readMessages([statusKey]);
    } catch (err) {
        console.error(`[AutoView] Failed:`, err.message);
    }
}

// AUTO LIKE – Immediate (uses only 💚🤍🖤)
async function autoLike(sock, statusKey) {
    if (!statusKey?.id || !statusKey?.participant) return;

    const emoji = getRandomEmoji();
    const participantJid = statusKey.participant;

    try {
        await sock.sendMessage('status@broadcast', {
            react: {
                text: emoji,
                key: statusKey
            }
        }, {
            statusJidList: [participantJid]
        });
    } catch (err) {
        console.error(`[AutoLike] Failed:`, err.message || err);
    }
}

async function handleStatusUpdate(sock, ev) {
    const cfg = await loadConfig();
    if (!cfg.enabled) return;

    let statusKey = null;

    if (ev.messages?.[0]?.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.messages[0].key;
    } else if (ev.key?.remoteJid === 'status@broadcast') {
        statusKey = ev.key;
    }

    if (!statusKey?.id || processedStatusIds.has(statusKey.id)) return;
    
    processedStatusIds.add(statusKey.id);

    if (processedStatusIds.size > 1500) {
        const arr = Array.from(processedStatusIds);
        processedStatusIds.clear();
        arr.slice(-750).forEach(id => processedStatusIds.add(id));
    }

    const promises = [];
    if (cfg.viewEnabled) promises.push(autoView(sock, statusKey));
    if (cfg.likeEnabled) promises.push(autoLike(sock, statusKey));
    
    await Promise.allSettled(promises);
}

async function autoStatusCommand(sock, chatId, msg, args = []) {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const isAllowed = msg.key.fromMe || (await isOwnerOrSudo(sender, sock, chatId));
        if (!isAllowed) return;

        const sub = (args[0] || '').toLowerCase();
        const option = (args[1] || '').toLowerCase();

        // --- Global ON ---
        if (sub === 'on') {
            await saveConfig({ enabled: true, viewEnabled: true, likeEnabled: true });
            return sock.sendMessage(chatId, { text: '✅ *BIGMANJ BOT V3 will view +like and like all status to reduce jam*' });
        }

        // --- Global OFF ---
        if (sub === 'off') {
            await saveConfig({ enabled: false });
            return sock.sendMessage(chatId, { text: '❌ *Auto Status:* Disabled.' });
        }

        // --- VIEW toggle (also enables LIKE automatically when turning ON) ---
        if (sub === 'view') {
            if (option === 'on') {
                await saveConfig({ viewEnabled: true, likeEnabled: true, enabled: true });
                // 🎯 Custom reply as requested
                return sock.sendMessage(chatId, { text: '✅ *BigStack will view +like status to reduce jam*' });
            } else if (option === 'off') {
                await saveConfig({ viewEnabled: false });
                return sock.sendMessage(chatId, { text: '❌ *Auto Status View:* OFF (like still works if enabled separately).' });
            }
        }

        // --- LIKE toggle (independent) ---
        if (sub === 'like') {
            if (option === 'on') {
                await saveConfig({ likeEnabled: true, enabled: true });
                return sock.sendMessage(chatId, { text: '✅ *Auto Status Like:* ON (only likes, no view).' });
            } else if (option === 'off') {
                await saveConfig({ likeEnabled: false });
                return sock.sendMessage(chatId, { text: '❌ *Auto Status Like:* OFF.' });
            }
        }

        // --- Show current status ---
        const cfg = await loadConfig();
        const overall = cfg.enabled ? 'ON' : 'OFF';
        const view = cfg.viewEnabled ? 'ON' : 'OFF';
        const like = cfg.likeEnabled ? 'ON' : 'OFF';

        return sock.sendMessage(chatId, {
            text: `📊 *Auto Status Settings:*
• Status: ${overall}
• View: ${view}
• Like: ${like}

Commands:
• .autostatus on|off
• .autostatus view on|off   → view on also enables like
• .autostatus like on|off`,
        });

    } catch (err) {
        console.error('[AutoStatus] Command error', err.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleAutoStatus: handleStatusUpdate,
    autoLike,
    autoView
};
