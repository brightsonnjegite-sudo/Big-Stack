// commands/resetlink.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

/**
 * Reset group invite link
 * .resetlink - Reset WhatsApp group invite link
 * Only group admins and bot must be admin
 */
async function resetlinkCommand(sock, chatId, senderId, message) {
    try {
        // 1. Check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ This command can only be used in groups.\n\n${FOOTER}`
            }, { quoted: message });
            return;
        }

        // 2. Get group metadata
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(chatId);
        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *ERROR*\n\n└── ▢ Failed to fetch group info.\n└── ▢ Details: ${err.message || 'Unknown error'}\n\n${FOOTER}`
            }, { quoted: message });
            return;
        }

        // 3. Check if sender is admin
        const senderIsAdmin = groupMetadata.participants.some(p => p.id === senderId && p.admin);
        if (!senderIsAdmin) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *PERMISSION DENIED*\n\n└── ▢ Only group admins can reset the invite link.\n\n${FOOTER}`
            }, { quoted: message });
            return;
        }

        // 4. Check if bot is admin
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botIsAdmin = groupMetadata.participants.some(p => p.id === botJid && p.admin);
        if (!botIsAdmin) {
            await sock.sendMessage(chatId, {
                text: `└── ▢ ❌ *BOT NOT ADMIN*\n\n└── ▢ Please make the bot an admin first.\n\n${FOOTER}`
            }, { quoted: message });
            return;
        }

        // 5. Revoke existing invite and generate new one
        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        let newCode;
        try {
            newCode = await sock.groupRevokeInvite(chatId);
        } catch (err) {
            // Fallback: try to get invite code if revoke fails
            try {
                const inviteInfo = await sock.groupInviteCode(chatId);
                if (inviteInfo) {
                    newCode = inviteInfo;
                } else {
                    throw new Error('Could not generate invite code');
                }
            } catch (fallbackErr) {
                throw new Error('Failed to reset invite link: ' + (err.message || fallbackErr.message));
            }
        }

        if (!newCode) {
            throw new Error('No invite code returned');
        }

        // 6. Build new invite link
        const newLink = `https://chat.whatsapp.com/${newCode}`;

        // 7. Send success message with link
        const successMsg = 
`└── ▢ 🔗 *LINK RESET SUCCESSFUL*

└── ▢ Status  : ✅ Done
└── ▢ New Link: ${newLink}
└── ▢ Note    : Old link is now invalid

📌 Share the new link with members.

${FOOTER}`;

        await sock.sendMessage(chatId, {
            text: successMsg
        }, { quoted: message });

        // 8. React with success
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Resetlink error:', error);

        // Send error message
        const errorMsg = 
`└── ▢ ❌ *RESET FAILED*

└── ▢ Error : ${error.message || 'Unknown error'}
└── ▢ Tip   : Make sure bot has admin permissions.

${FOOTER}`;

        try {
            await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
        } catch (sendErr) {
            console.error('Failed to send error:', sendErr);
        }

        try {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        } catch (reactErr) {}
    }
}

module.exports = resetlinkCommand;
