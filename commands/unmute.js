// commands/unmute.js
const isAdmin = require('../lib/isAdmin');
const isOwnerOrSudo = require('../lib/isOwner');
const { isUserMuted, unmuteUser, setGroupSetting } = require('./mute');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function unmuteCommand(sock, chatId, senderId, message, args = []) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ This command only works in groups.\n\n${FOOTER}` 
            });
        }

        const botId = sock.user.id;
        const adminStatusBot = await isAdmin(sock, chatId, botId);
        if (!adminStatusBot.isBotAdmin) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ⚠️ *PERMISSION DENIED*\n\n└── ▢ I need to be a group admin to unmute.\n\n${FOOTER}` 
            });
        }

        const adminStatus = await isAdmin(sock, chatId, senderId);
        const isSenderAdmin = adminStatus.isSenderAdmin;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        if (!isSenderAdmin && !isOwner) {
            return sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only admins or bot owner can unmute.\n\n${FOOTER}` 
            });
        }

        // Parse target user from mentioned JIDs or @tag in text
        let targetUser = null;
        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length > 0) {
            targetUser = mentionedJids[0];
        } else {
            // Check if args is an array; if not, try to get from command text
            const argsArray = Array.isArray(args) ? args : [];
            for (const arg of argsArray) {
                if (typeof arg === 'string' && arg.startsWith('@')) {
                    const num = arg.replace('@', '');
                    targetUser = num + '@s.whatsapp.net';
                    break;
                }
            }
        }

        if (targetUser) {
            // === UNMUTE INDIVIDUAL USER ===
            if (!isUserMuted(chatId, targetUser)) {
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ℹ️ *NOT MUTED*\n\n└── ▢ User : @${targetUser.split('@')[0]}\n└── ▢ Status : Not muted\n\n${FOOTER}`,
                    mentions: [targetUser] 
                });
            }
            unmuteUser(chatId, targetUser);

            let reply = `└── ▢ 🔊 *USER UNMUTED*\n\n`;
            reply += `└── ▢ User : @${targetUser.split('@')[0]}\n`;
            reply += `└── ▢ Status : ✅ Unmuted\n`;
            reply += `└── ▢ Action : Messages will no longer be deleted\n\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: reply, mentions: [targetUser] });
        } else {
            // === UNMUTE GROUP (WhatsApp native: all members can send) ===
            const success = await setGroupSetting(sock, chatId, 'not_announcement');
            if (!success) {
                return sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to update group settings. Make sure I am admin.\n\n${FOOTER}` 
                });
            }
            let reply = `└── ▢ 🔊 *GROUP UNMUTED*\n\n`;
            reply += `└── ▢ Status : ✅ Success\n`;
            reply += `└── ▢ Setting : All members can send messages\n`;
            reply += `└── ▢ Note : WhatsApp native restriction removed\n\n${FOOTER}`;
            await sock.sendMessage(chatId, { text: reply });
        }
    } catch (err) {
        console.error('Unmute command error:', err);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Details : ${err.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
}

module.exports = unmuteCommand;
