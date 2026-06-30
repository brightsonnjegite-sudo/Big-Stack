// commands/unban.js
const fs = require('fs');
const path = require('path');
const { channelInfo } = require('../lib/messageConfig');
const isAdmin = require('../lib/isAdmin');
const { isSudo } = require('../lib/index');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function unbanCommand(sock, chatId, message) {
    try {
        // ─── CHECK PERMISSIONS ───
        const isGroup = chatId.endsWith('@g.us');
        const senderId = message.key.participant || message.key.remoteJid;

        if (isGroup) {
            const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
            if (!isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Please make the bot an admin to use .unban\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
            if (!isSenderAdmin && !message.key.fromMe) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only group admins can use .unban\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
        } else {
            const senderIsSudo = await isSudo(senderId);
            if (!message.key.fromMe && !senderIsSudo) {
                await sock.sendMessage(chatId, { 
                    text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only owner/sudo can use .unban in private chat\n\n${FOOTER}` 
                }, { quoted: message });
                return;
            }
        }

        // ─── FIND TARGET USER ───
        let userToUnban;
        
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToUnban = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToUnban = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToUnban) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Please mention the user or reply to their message to unban!\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const userNum = userToUnban.split('@')[0];

        // ─── CHECK IF USER IS BANNED ───
        const dataDir = path.join(process.cwd(), 'data');
        const banFile = path.join(dataDir, 'banned.json');

        if (!fs.existsSync(banFile)) {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ 📋 *UNBAN*\n\n└── ▢ No users are currently banned.\n\n${FOOTER}` 
            }, { quoted: message });
            return;
        }

        const bannedUsers = JSON.parse(fs.readFileSync(banFile, 'utf8'));
        const index = bannedUsers.indexOf(userToUnban);

        if (index > -1) {
            // ─── REMOVE USER FROM BAN LIST ───
            bannedUsers.splice(index, 1);
            fs.writeFileSync(banFile, JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ✅ *UNBAN SUCCESSFUL*\n\n└── ▢ User    : @${userNum}\n└── ▢ Status  : ✅ Unbanned\n└── ▢ Note    : User can now use the bot again.\n\n${FOOTER}`,
                mentions: [userToUnban] 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `└── ▢ ℹ️ *USER NOT BANNED*\n\n└── ▢ User    : @${userNum}\n└── ▢ Status  : ❌ Not banned\n└── ▢ Note    : This user is already allowed to use the bot.\n\n${FOOTER}`,
                mentions: [userToUnban] 
            });
        }

    } catch (error) {
        console.error('Error in unban command:', error);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to unban user!\n└── ▢ Details : ${error.message || 'Unknown error'}\n\n${FOOTER}` 
        }, { quoted: message });
    }
}

module.exports = unbanCommand;
