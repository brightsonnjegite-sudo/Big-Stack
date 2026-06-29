const { isAdmin } = require('../lib/isAdmin');

// Function to handle manual promotions via command
async function promoteCommand(sock, chatId, mentionedJids, message) {
    try {
        // First check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used in groups!'
            });
            return;
        }

        // Check admin status
        try {
            const adminStatus = await isAdmin(sock, chatId, message.key.participant || message.key.remoteJid);
            
            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Error: Please make the bot an admin first to use this command.'
                });
                return;
            }

            if (!adminStatus.isSenderAdmin) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Error: Only group admins can use the promote command.'
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, { 
                text: '❌ Error: Please make sure the bot is an admin of this group.'
            });
            return;
        }

        let userToPromote = [];
        
        // Check for mentioned users
        if (mentionedJids && mentionedJids.length > 0) {
            userToPromote = mentionedJids;
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToPromote = [message.message.extendedTextMessage.contextInfo.participant];
        }
        
        // If no user found through either method
        if (userToPromote.length === 0) {
            await sock.sendMessage(chatId, { 
                text: '❌ Error: Please mention the user or reply to their message to promote!'
            });
            return;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.groupParticipantsUpdate(chatId, userToPromote, "promote");
        
        // Get usernames for each promoted user
        const usernames = await Promise.all(userToPromote.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        // Get promoter's name
        const promoterJid = message.key.participant || message.key.remoteJid;
        const promoterName = `@${promoterJid.split('@')[0]}`;

        // Build message with └── ▢ style
        const promotionMessage = 
`└── ▢ 👑 *PROMOTION SUCCESSFUL*

└── ▢ Action    : Promote
└── ▢ Target    : ${usernames.join(', ')}
└── ▢ Status    : ✅ Success
└── ▢ Role      : Admin (was Member)
└── ▢ Performed : ${promoterName}

📌 ${usernames.join(', ')} ${userToPromote.length > 1 ? 'have' : 'has'} been promoted to admin.

© bigmanj tech ™ with ♥︎`;

        await sock.sendMessage(chatId, { 
            text: promotionMessage,
            mentions: [...userToPromote, promoterJid]
        });

    } catch (error) {
        console.error('Error in promote command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ Rate limit reached. Please try again in a few seconds.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: '❌ Failed to promote user(s). Make sure the bot is admin and has sufficient permissions.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

// Function to handle automatic promotion detection
async function handlePromotionEvent(sock, groupId, participants, author) {
    try {
        // Safety check for participants
        if (!Array.isArray(participants) || participants.length === 0) {
            return;
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get usernames for promoted participants
        const promotedUsernames = await Promise.all(participants.map(async jid => {
            const jidString = typeof jid === 'string' ? jid : (jid.id || jid.toString());
            return `@${jidString.split('@')[0]}`;
        }));

        let promotedBy;
        let mentionList = participants.map(jid => {
            return typeof jid === 'string' ? jid : (jid.id || jid.toString());
        });

        if (author && author.length > 0) {
            const authorJid = typeof author === 'string' ? author : (author.id || author.toString());
            promotedBy = `@${authorJid.split('@')[0]}`;
            mentionList.push(authorJid);
        } else {
            promotedBy = 'System';
        }

        const promotionMessage = 
`└── ▢ 👑 *PROMOTION SUCCESSFUL*

└── ▢ Action    : Promote
└── ▢ Target    : ${promotedUsernames.join(', ')}
└── ▢ Status    : ✅ Success
└── ▢ Role      : Admin (was Member)
└── ▢ Performed : ${promotedBy}

📌 ${promotedUsernames.join(', ')} ${participants.length > 1 ? 'have' : 'has'} been promoted to admin.

© bigmanj tech ™ with ♥︎`;

        await sock.sendMessage(groupId, {
            text: promotionMessage,
            mentions: mentionList
        });

    } catch (error) {
        console.error('Error handling promotion event:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

module.exports = { promoteCommand, handlePromotionEvent };
