const settings = require('../settings');

const FOOTER = '© bigmanj tech ™ with ♥︎';

/**
 * Create new WhatsApp group - BigStack Edition
 */
async function newgroupCommand(sock, chatId, message, args) {
    try {
        // 1. Basic Checks
        if (!sock?.user) return;
        const senderJid = message.sender || message.key?.participant || chatId;
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // 2. Group Name
        let groupName = (args && args.length > 0) ? args.join(' ').trim() : `Group ${Date.now()}`;
        groupName = groupName.substring(0, 25); // Limit 25 chars

        await sock.sendMessage(chatId, { react: { text: '🛠️', key: message.key } });

        // 3. Find Members (Clean List)
        let participants = [];
        
        if (chatId.endsWith('@g.us')) {
            try {
                const meta = await sock.groupMetadata(chatId);
                participants = meta.participants.map(p => p.id);
            } catch (e) {
                participants = [senderJid];
            }
        } else {
            participants = [senderJid];
        }

        // Clean list: remove bot, remove duplicates, ensure valid JIDs
        participants = [...new Set(participants)].filter(jid => 
            jid.includes('@s.whatsapp.net') && jid !== botJid
        );

        // 4. FIRST ATTEMPT: Create with all participants
        try {
            const group = await sock.groupCreate(groupName, participants);
            
            const successMsg = 
`└── ▢ ✅ *GROUP CREATED*

└── ▢ Name    : ${groupName}
└── ▢ Members : ${participants.length}
└── ▢ Status  : Success

📌 The group has been created successfully.

${FOOTER}`;

            await sock.sendMessage(chatId, { text: successMsg }, { quoted: message });

        } catch (err) {
            console.error('First attempt failed, trying fallback...');
            
            // 5. FALLBACK: Create with only the sender (some users have privacy restrictions)
            try {
                const fallbackGroup = await sock.groupCreate(groupName, [senderJid]);
                
                const fallbackMsg = 
`└── ▢ ⚠️ *GROUP CREATED (PARTIAL)*

└── ▢ Name    : ${groupName}
└── ▢ Members : Only you (${senderJid.split('@')[0]})
└── ▢ Status  : Partial Success
└── ▢ Reason  : Some members could not be added due to privacy settings.

📌 You can add other members manually via the group link.

${FOOTER}`;

                await sock.sendMessage(chatId, { text: fallbackMsg }, { quoted: message });
                
                // Welcome message to the new group
                await sock.sendMessage(fallbackGroup.id, { 
                    text: `👋 Welcome! You can add more members using the group link.` 
                });

            } catch (finalErr) {
                // Complete failure
                const errorMsg = 
`└── ▢ ❌ *GROUP CREATION FAILED*

└── ▢ Name    : ${groupName}
└── ▢ Status  : Failed
└── ▢ Reason  : ${finalErr.message || 'Unknown error'}

📌 Please try again later or contact support.

${FOOTER}`;

                await sock.sendMessage(chatId, { text: errorMsg }, { quoted: message });
            }
        }

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (e) {
        console.error('Critical Error:', e);
        await sock.sendMessage(chatId, { 
            text: `└── ▢ ❌ *CRITICAL ERROR*\n\n└── ▢ ${e.message || 'Unknown error'}\n\n${FOOTER}` 
        });
    }
}

module.exports = newgroupCommand;
