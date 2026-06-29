const isAdmin = require('../lib/isAdmin');

/**
 * kickCommand - BigStack Advanced Kick System
 * Uwezo: Kick kawaida & Kick All (Admins & Owner protected)
 */
async function kickCommand(sock, chatId, senderId, mentionedJids, m) {
    try {
        if (!sock || !chatId || !m) return;

        const isOwner = m.key.fromMe;
        const text = (m.message?.extendedTextMessage?.text || 
                     m.message?.conversation || '').toLowerCase().trim();

        // 1. Tambua kama ni Kick All au Kick ya kawaida
        const isKickAll = text.includes('kick all');

        // 2. Ruhusa (Permissions)
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            const msg = 
`└── ▢ ❌ *PERMISSION DENIED*

└── ▢ Action : Kick
└── ▢ Status : ❌ Failed
└── ▢ Reason : Bot is not admin

📌 Please make the bot an admin first.

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        if (!isOwner && !isSenderAdmin) {
            const msg = 
`└── ▢ ❌ *PERMISSION DENIED*

└── ▢ Action : Kick
└── ▢ Status : ❌ Failed
└── ▢ Reason : Only admins can use this command

📌 This command is restricted to group admins.

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        // 3. Fetch Group Info
        const metadata = await sock.groupMetadata(chatId);
        const participants = metadata.participants || [];
        const botId = sock.user?.id.split(':')[0] + '@s.whatsapp.net';
        const ownerNum = '255612130873@s.whatsapp.net'; // Namba yako (badilisha ikihitajika)

        let usersToKick = [];

        if (isKickAll) {
            // Mbinu ya Kick All: Chagua wasio ma-admin tu
            usersToKick = participants
                .filter(p => !p.admin) 
                .map(p => p.id)
                .filter(jid => jid !== botId && jid !== ownerNum);

            if (usersToKick.length === 0) {
                const msg = 
`└── ▢ 🧹 *KICK ALL*

└── ▢ Status : ✅ Done
└── ▢ Removed : 0 members

📌 Group already has only admins left.

© bigmanj tech ™ with ♥︎`;
                return await sock.sendMessage(chatId, { text: msg }, { quoted: m });
            }

            const processingMsg = 
`└── ▢ 🧹 *KICK ALL*

└── ▢ Status : ⏳ Processing...
└── ▢ Members : ${usersToKick.length}
└── ▢ Note : Batching to avoid rate limits

📌 Removing all non-admin members...

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: processingMsg }, { quoted: m });

        } else {
            // Mbinu ya Kick Kawaida (Mention au Reply)
            if (mentionedJids && mentionedJids.length > 0) {
                usersToKick = mentionedJids;
            } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
                usersToKick = [m.message.extendedTextMessage.contextInfo.participant];
            }

            if (usersToKick.length === 0) {
                const msg = 
`└── ▢ ❌ *KICK*

└── ▢ Status : ❌ Failed
└── ▢ Reason : No target specified

📌 Please mention a user or reply to their message.

© bigmanj tech ™ with ♥︎`;
                return await sock.sendMessage(chatId, { text: msg }, { quoted: m });
            }
        }

        // 4. USALAMA: Hakikisha bot au owner hawapo kwenye list
        usersToKick = usersToKick.filter(id => id !== botId && id !== ownerNum);
        if (usersToKick.length === 0) {
            const msg = 
`└── ▢ ❌ *KICK*

└── ▢ Status : ❌ Failed
└── ▢ Reason : Cannot remove bot or owner

📌 Bot and owner are protected.

© bigmanj tech ™ with ♥︎`;
            return await sock.sendMessage(chatId, { text: msg }, { quoted: m });
        }

        // 5. UTEKELEZAJI (Execution)
        if (isKickAll) {
            // Batching: Watu 5 kila baada ya sekunde 2 kuzuia "Rate Limit"
            const batchSize = 5;
            for (let i = 0; i < usersToKick.length; i += batchSize) {
                const batch = usersToKick.slice(i, i + batchSize);
                await sock.groupParticipantsUpdate(chatId, batch, "remove");
                // Delay fupi
                await new Promise(r => setTimeout(r, 2000));
            }
            
            const successMsg = 
`└── ▢ 🧹 *KICK ALL*

└── ▢ Status : ✅ Success
└── ▢ Removed : ${usersToKick.length} members

📌 Group is now clean! All non-admin members have been removed.

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { text: successMsg }, { quoted: m });
        } else {
            // Kick ya kawaida (Instant)
            await sock.groupParticipantsUpdate(chatId, usersToKick, "remove");
            const usernames = usersToKick.map(jid => `@${jid.split('@')[0]}`);
            const successMsg = 
`└── ▢ 👢 *KICK SUCCESSFUL*

└── ▢ Action : Kick
└── ▢ Target : ${usernames.join(', ')}
└── ▢ Status : ✅ Success

📌 ${usernames.join(', ')} ${usersToKick.length > 1 ? 'have' : 'has'} been removed from the group.

© bigmanj tech ™ with ♥︎`;
            await sock.sendMessage(chatId, { 
                text: successMsg,
                mentions: usersToKick 
            }, { quoted: m });
        }

        // React with 🧹
        await sock.sendMessage(chatId, { react: { text: '🧹', key: m.key } });

    } catch (e) {
        console.error('Kick Error:', e);
        const errorMsg = 
`└── ▢ ❌ *KICK ERROR*

└── ▢ Status : ❌ Failed
└── ▢ Details : ${e.message || 'Unknown error'}

📌 Please try again later.

© bigmanj tech ™ with ♥︎`;
        await sock.sendMessage(chatId, { text: errorMsg }).catch(() => null);
    }
}

module.exports = kickCommand;
