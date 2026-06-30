// commands/getpp.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function getppCommand(sock, chatId, message) {
    try {
        // Check if user provided a target
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const args = text.split(' ').slice(1);
        const target = args[0] || '';

        let targetJid = null;
        let targetType = 'bot';

        // Determine target
        if (target === 'group' || target === 'g') {
            // Get group profile picture
            if (!chatId.endsWith('@g.us')) {
                const errorMsg = 
`└─ ▢ ❌ *ERROR*

└── ▢ This command can only be used in a group.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
                return;
            }
            targetJid = chatId;
            targetType = 'group';
        } else if (target && target.match(/^\d+$/)) {
            // User provided phone number
            targetJid = target + '@s.whatsapp.net';
            targetType = 'user';
        } else if (target.startsWith('@')) {
            // User provided mention with @
            const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentionedJids.length > 0) {
                targetJid = mentionedJids[0];
                targetType = 'user';
            } else {
                const errorMsg = 
`└─ ▢ ❌ *ERROR*

└─ ▢ User not found. Please mention the user.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
                return;
            }
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            // Check if replying to a message
            targetJid = message.message.extendedTextMessage.contextInfo.participant;
            targetType = 'user';
        } else {
            // No target specified, get bot's profile picture
            targetJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            targetType = 'bot';
        }

        // ─── Fetch Profile Picture ───
        let profilePicUrl;
        let displayName = '';

        try {
            if (targetType === 'group') {
                profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
                const metadata = await sock.groupMetadata(targetJid);
                displayName = metadata.subject || 'Group';
            } else {
                profilePicUrl = await sock.profilePictureUrl(targetJid, 'image');
                const contact = await sock.contactQuery(targetJid);
                displayName = contact?.name || contact?.notify || targetJid.split('@')[0];
            }
        } catch (err) {
            // No profile picture found
            const noPpMsg = 
`└─ ▢ 📷 *PROFILE PICTURE*

└─ ▢ ─ *INFO* ─
└─ ▢ Target : ${displayName || targetJid.split('@')[0]}
└─ ▢ Status : ❌ No profile picture found

📌 This ${targetType} has not set a profile picture.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: noPpMsg }, { quoted: message });
            return;
        }

        // ─── Download Image ───
        const response = await fetch(profilePicUrl);
        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // ─── Send Profile Picture ───
        const targetEmoji = targetType === 'group' ? '👥' : targetType === 'bot' ? '🤖' : '👤';
        const targetLabel = targetType === 'group' ? 'Group' : targetType === 'bot' ? 'Bot' : 'User';
        
        const caption = 
`└── ▢ 📷 *PROFILE PICTURE*

└─ ▢ ─*INFO* ─
└─ ▢ ${targetEmoji} Target : ${displayName || targetJid.split('@')[0]}
└─ ▢ 📌 Type   : ${targetLabel}
└─ ▢ ✅ Status : ✅ Found

${FOOTER}`;

        await sock.sendMessage(chatId, {
            image: imageBuffer,
            caption: caption
        }, { quoted: message });

    } catch (error) {
        console.error('Getpp error:', error);
        const errorMsg = 
`└─ ▢ ❌ *ERROR*

└─ ▢ ${error.message || 'Failed to get profile picture.'}

📌 Please try again later.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
    }
}

module.exports = getppCommand;
