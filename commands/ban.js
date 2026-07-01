// commands/ban.js
const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function banCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;

        // ─── CHECK PERMISSIONS ───
        if (isGroup) {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Please make the bot an admin to use .ban\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: `└ ▢ ❌ *PERMISSION DENIED*\n\n└ ▢ Only group admins can use .ban\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
        } else {
            const senderIsSudo = await isSudo(senderId);
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    text: `└ ▢ ❌ *PERMISSION DENIED*\n\n└ ▢ Only owner/sudo can use .ban in private chat\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
        }

        // ─ FIND TARGET USER ─
        let userToBan;
        
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToBan = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToBan) {
            await sock.sendMessage(chatId, { 
                text: `└ ▢ ❌ *ERROR*\n\n└ ▢ Please mention the user or reply to their message to ban!\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const userNum = userToBan.split('@')[0];

        // ─ PREVENT BANNING THE BOT ─
        try {
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (userToBan === botId || userToBan === botId.replace('@s.whatsapp.net', '@lid')) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *ACTION BLOCKED*\n\n└── ▢ You cannot ban the bot account.\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
        } catch {}

        // ─ CHECK IF USER IS ALREADY BANNED ─
        const dataDir = path.join(process.cwd(), 'data');
        const banFile = path.join(dataDir, 'banned.json');

        if (!fs.existsSync(banFile)) {
            await sock.sendMessage(chatId, { 
                text: `└ ▢ 📋 *BAN*\n\n└ ▢ No users are currently banned.\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const bannedUsers = JSON.parse(fs.readFileSync(banFile, 'utf8'));

        if (bannedUsers.includes(userToBan)) {
            await sock.sendMessage(chatId, { 
                text: `└ ▢ ℹ️ *ALREADY BANNED*\n\n└ ▢ User    : @${userNum}\n└ ▢ Status  : ❌ Already banned\n└ ▢ Note    : This user is already in the ban list.\n\n${FOOTER}`,
                mentions: [userToBan] 
            });
            return;
        }

        // ─ ADD USER TO BAN LIST ─
        bannedUsers.push(userToBan);
        fs.writeFileSync(banFile, JSON.stringify(bannedUsers, null, 2));

        await sock.sendMessage(chatId, { 
            text: `└ ▢ ✅ *BAN SUCCESSFUL*\n\n└ ▢ User    : @${userNum}\n└ ▢ Status  : ✅ Banned\n └ ▢ Note    : User can no longer use the bot.\n\n${FOOTER}`,
            mentions: [userToBan] 
        });

    } catch (error) {
        console.error('Error in ban command:', error);
        await sock.sendMessage(chatId, { 
            text: `└ ▢ ❌ *ERROR*\n\n└ ▢ Failed to ban user!\n└ ▢ Details : ${error.message || 'Unknown error'}\n\n${FOOTER}` 
        }, { quoted: message });
    }
}

module.exports = banCommand;
