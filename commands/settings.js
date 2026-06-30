const fs = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../lib/isOwner');
const settings = require('../settings'); // for owner number

const FOOTER = '© bigmanj tech ™ with ♥︎';

function readJsonSafe(filePath, fallback) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (_) {
        return fallback;
    }
}

async function settingsCommand(sock, chatId, message) {
    try {
        // 1. Authorization
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only bot owner can use this command!\n\n${FOOTER}`
            }, { quoted: message });
            return;
        }

        const isGroup = chatId.endsWith('@g.us');
        const dataDir = path.join(process.cwd(), 'data');

        // 2. Load all configs
        const mode = readJsonSafe(`${dataDir}/messageCount.json`, { isPublic: true });
        const autoStatus = readJsonSafe(`${dataDir}/autoStatus.json`, { enabled: false });
        const autoread = readJsonSafe(`${dataDir}/autoread.json`, { enabled: false });
        const autotyping = readJsonSafe(`${dataDir}/autotyping.json`, { enabled: false });
        const pmblocker = readJsonSafe(`${dataDir}/pmblocker.json`, { enabled: false });
        const anticall = readJsonSafe(`${dataDir}/anticall.json`, { enabled: false });
        const pinConfig = readJsonSafe(`${dataDir}/pinConfig.json`, { enabled: false });
        const userGroupData = readJsonSafe(`${dataDir}/userGroupData.json`, {
            antilink: {}, antibadword: {}, welcome: {}, goodbye: {}, chatbot: {}, antitag: {},
            autoReaction: false
        });

        // 3. Group-specific toggles
        const groupId = isGroup ? chatId : null;
        const antilinkOn = groupId ? Boolean(userGroupData.antilink && userGroupData.antilink[groupId]) : false;
        const antibadwordOn = groupId ? Boolean(userGroupData.antibadword && userGroupData.antibadword[groupId]) : false;
        const antitagCfg = groupId ? (userGroupData.antitag && userGroupData.antitag[groupId]) : null;
        const antitagOn = antitagCfg && antitagCfg.enabled === true;

        // 4. Build the message with └── ▢ style
        let lines = [];
        lines.push('└── ▢ ⚙️ *BOT SETTINGS*');
        lines.push('');
        lines.push('└── ▢ ──── *ACCESS* ────');
        lines.push(`└── ▢ Mode      : ${mode.isPublic ? 'Public  🟢' : 'Private 🔒'}`);
        lines.push(`└── ▢ Owner     : bigmanj tech`);
        lines.push(`└── ▢ Number    : ${settings.ownerNumber || '255777580820'}`);
        lines.push(`└── ▢ Sudo      : 1 user`);
        lines.push('');
        lines.push('└── ▢ ──── *TOGGLES* ────');
        lines.push(`└── ▢ Autoread   : ${autoread.enabled ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ Autotyping : ${autotyping.enabled ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ Antilink   : ${antilinkOn ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ Antitag    : ${antitagOn ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ Antibad    : ${antibadwordOn ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ PM Blocker : ${pmblocker.enabled ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ Anticall   : ${anticall.enabled ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ AutoReaction: ${userGroupData.autoReaction ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push(`└── ▢ PIN        : ${pinConfig.enabled ? 'ON  🟢' : 'OFF  🔴'}`);
        lines.push('');
        lines.push('└── ▢ ──── *SYSTEM* ────');
        lines.push(`└── ▢ Version : 3.0.0`);
        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        lines.push(`└── ▢ Uptime  : ${uptimeStr}`);
        lines.push(`└── ▢ Commands: 210`);
        lines.push('');
        lines.push('📌 *Quick Toggle:*');
        lines.push('└── ▢ .autoread on/off');
        lines.push('└── ▢ .autotyping on/off');
        lines.push('└── ▢ .antilink on/off');
        lines.push('└── ▢ .antitag on/off');
        lines.push('└── ▢ .antibadword on/off');
        lines.push('└── ▢ .pmblocker on/off');
        lines.push('└── ▢ .anticall on/off');
        lines.push('└── ▢ .autoreact on/off');
        lines.push('└── ▢ .pin on/off');
        lines.push('└── ▢ .mode public/private');
        lines.push('');
        lines.push(FOOTER);

        const messageText = lines.join('\n');

        // 5. Send the message
        await sock.sendMessage(chatId, { text: messageText }, { quoted: message });

    } catch (error) {
        console.error('Error in settings command:', error);
        await sock.sendMessage(chatId, {
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to read settings.\n└── ▢ ${error.message || 'Unknown error'}\n\n${FOOTER}`
        }, { quoted: message });
    }
}

module.exports = settingsCommand;
