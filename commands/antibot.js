const { handleAntiBotCommand } = require('../lib/antibot');
const isAdminHelper = require('../lib/isAdmin');

async function antibotCommand(sock, chatId, message, senderId, isSenderAdmin) {
    try {
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: '```For Group Admins Only!```' }, { quoted: message });
            return;
        }

        // Extract match from message
        const text = message.message?.conversation ||
                    message.message?.extendedTextMessage?.text || '';
        const match = text.split(' ').slice(1).join(' ');

        await handleAntiBotCommand(sock, chatId, message, match);
    } catch (error) {
        console.error('Error in antibot command:', error);
        await sock.sendMessage(chatId, { text: '*Error processing antibot command*' }, { quoted: message });
    }
}

module.exports = antibotCommand;