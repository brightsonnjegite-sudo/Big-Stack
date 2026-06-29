// commands/mute.js
const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');

const FOOTER = '© bigmanj tech ™ with ♥︎';

// ========== DATA STORAGE (kwa user mute pekee) ==========
const DATA_DIR = path.join(__dirname, '../data');
const MUTE_FILE = path.join(DATA_DIR, 'user_mute.json');

function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(MUTE_FILE)) {
        fs.writeFileSync(MUTE_FILE, JSON.stringify({}, null, 2));
    }
}

function loadData() {
    ensureFile();
    try {
        return JSON.parse(fs.readFileSync(MUTE_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveData(data) {
    ensureFile();
    fs.writeFileSync(MUTE_FILE, JSON.stringify(data, null, 2));
}

// ========== USER MUTE FUNCTIONS ==========
function muteUser(groupId, userId, durationMinutes = null) {
    const data = loadData();
    if (!data[groupId]) data[groupId] = {};
    let expiresAt = null;
    if (durationMinutes && durationMinutes > 0) {
        expiresAt = Date.now() + durationMinutes * 60 * 1000;
    }
    data[groupId][userId] = { muted: true, expiresAt };
    saveData(data);
    if (expiresAt) {
        setTimeout(() => unmuteUser(groupId, userId), durationMinutes * 60 * 1000);
    }
}

function unmuteUser(groupId, userId) {
    const data = loadData();
    if (data[groupId] && data[groupId][userId]) {
        delete data[groupId][userId];
        if (Object.keys(data[groupId]).length === 0) {
            delete data[groupId];
        }
        saveData(data);
    }
}

function isUserMuted(groupId, userId) {
    const data = loadData();
    if (!data[groupId] || !data[groupId][userId]) return false;
    if (data[groupId][userId].expiresAt && Date.now() > data[groupId][userId].expiresAt) {
        unmuteUser(groupId, userId);
        return false;
    }
    return data[groupId][userId].muted === true;
}

// ========== GROUP SETTINGS (WhatsApp native) ==========
async function setGroupSetting(sock, groupId, setting) {
    try {
        await sock.groupSettingUpdate(groupId, setting);
        return true;
    } catch (err) {
        console.error('Group setting update failed:', err);
        return false;
    }
}

// ========== MAIN MUTE COMMAND ==========
async function muteCommand(sock, chatId, senderId, message, args) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ This command only works in groups.\n\n${FOOTER}` 
            });
        }

        // Bot must be admin
        const botId = sock.user.id;
        const adminStatusBot = await isAdmin(sock, chatId, botId);
        if (!adminStatusBot.isBotAdmin) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ⚠️ *PERMISSION DENIED*\n\n└── ▢ I need to be a group admin to mute.\n\n${FOOTER}` 
            });
        }

        // Sender must be admin or owner
        const adminStatus = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminStatus.isSenderAdmin;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isSenderAdmin && !isOwner) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only admins or bot owner can mute.\n\n${FOOTER}` 
            });
        }

        // Parse arguments
        let durationMinutes = null;
        let targetUser = null;

        if (args.length > 0 && !isNaN(args[0]) && parseInt(args[0]) > 0) {
            durationMinutes = parseInt(args[0]);
            // Check for mention
            const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                targetUser = mentionedJids[0];
            } else {
                for (const arg of args) {
                    if (arg.startsWith('@')) {
                        const num = arg.replace('@', '');
                        targetUser = num + '@s.whatsapp.net';
                        break;
                    }
                }
            }
        } else {
            const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                targetUser = mentionedJids[0];
            } else {
                for (const arg of args) {
                    if (arg.startsWith('@')) {
                        const num = arg.replace('@', '');
                        targetUser = num + '@s.whatsapp.net';
                        break;
                    }
                }
            }
        }

        if (targetUser) {
            // === MUTE INDIVIDUAL USER (with deletion) ===
            if (isUserMuted(chatId, targetUser)) {
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ℹ️ *ALREADY MUTED*\n\n└── ▢ User : @${targetUser.split('@')[0]}\n└── ▢ Status : Already muted\n\n${FOOTER}`,
                    mentions: [targetUser] 
                });
            }
            muteUser(chatId, targetUser, durationMinutes);

            let reply = `└── ▢ 🔇 *USER MUTED*\n\n`;
            reply += `└── ▢ User : @${targetUser.split('@')[0]}\n`;
            reply += `└── ▢ Action : All messages will be deleted\n`;
            if (durationMinutes) {
                reply += `└── ▢ Duration : ${durationMinutes} minutes (auto-unmute)\n`;
            } else {
                reply += `└── ▢ Duration : PERMANENT (until manually unmuted)\n`;
            }
            reply += `\n└── ▢ 💡 Use .unmute @${targetUser.split('@')[0]} to unmute.\n\n${FOOTER}`;

            await sock.sendMessage(chatId, { text: reply, mentions: [targetUser] });
        } else {
            // === MUTE GROUP (WhatsApp native: only admins can send) ===
            const success = await setGroupSetting(sock, chatId, 'announcement');
            if (!success) {
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to update group settings. Make sure I am admin.\n\n${FOOTER}` 
                });
            }
            let reply = `└── ▢ 🔇 *GROUP MUTED*\n\n`;
            reply += `└── ▢ Status : ✅ Success\n`;
            reply += `└── ▢ Setting : Only admins can send messages\n`;
            reply += `└── ▢ Note : WhatsApp native restriction applied\n`;
            reply += `\n└── ▢ 💡 Use .unmute to allow all members to send.\n\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: reply });
        }
    } catch (err) {
        console.error('Mute command error:', err);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Details : ${err.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
}

// ========== EXPORT ==========
module.exports = {
    muteCommand,
    isUserMuted,
    unmuteUser,
    muteUser,
    setGroupSetting
};
