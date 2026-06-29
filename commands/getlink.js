/**
 * getlink.js - Get group invite link
 */
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function getGroupLink(sock, chatId, message) {
    try {
        // Check if it's a group
        if (!chatId.endsWith('@g.us')) {
            return await sock.sendMessage(chatId, { 
                text: `❌ This command can only be used in groups!\n\n${FOOTER}` 
            }, { quoted: message });
        }

        const code = await sock.groupInviteCode(chatId);
        const link = `https://chat.whatsapp.com/${code}`;
        
        const resText = 
`└── ▢ 🔗 *GROUP INVITE LINK*

└── ▢ Status    : ✅ Success
└── ▢ Group ID  : ${chatId}
└── ▢ Link      : ${link}

📌 Share this link to invite new members.

${FOOTER}`;

        await sock.sendMessage(chatId, { 
            text: resText 
        }, { quoted: message });
        
    } catch (e) {
        console.error('GetGroupLink Error:', e);
        await sock.sendMessage(chatId, { 
            text: `❌ *Failed to get group link!*\n\n_Ensure the bot is an admin and has permission to generate invite links._\n\n${FOOTER}` 
        }, { quoted: message });
    }
}

module.exports = getGroupLink;
