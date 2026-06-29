const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

const FOOTER = '© bigmanj tech ™ with ♥︎';
const ADMIN_REQUIRED_MSG = 'Be an admin 😁 first 🥇 then antilink as security will perfect run to deal 🤝 with all links in groups send by not admin users!';

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        // Kama mtumiaji sio admin wa kikundi
        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: ADMIN_REQUIRED_MSG + '\n' + FOOTER }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = `\`\`\`ANTILINK SETUP

${prefix}antilink on
${prefix}antilink set delete   (quiet delete)
${prefix}antilink set warn     (delete + progressive warnings)
${prefix}antilink set remove   (delete + immediate kick)
${prefix}antilink off
\`\`\`
${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on':
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    await sock.sendMessage(chatId, { text: '*_Antilink is already ON💀_*\n' + FOOTER }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                await sock.sendMessage(chatId, { 
                    text: result ? '*_🔗 NO LINKS ALLOWED HERE 💀 (quiet delete mode)_*\n' + FOOTER : '*_Failed to turn ON Antilink_*\n' + FOOTER 
                }, { quoted: message });
                break;

            case 'off':
                await removeAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { text: '*_Antilink has been turned OFF_*\n' + FOOTER }, { quoted: message });
                break;

            case 'set':
                if (args.length < 2) {
                    await sock.sendMessage(chatId, { 
                        text: `*_Please specify an action: ${prefix}antilink set delete | warn | remove_*\n${FOOTER}` 
                    }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'warn', 'remove'].includes(setAction)) {
                    await sock.sendMessage(chatId, { 
                        text: '*_Invalid action. Choose delete, warn, or remove._*\n' + FOOTER 
                    }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                await sock.sendMessage(chatId, { 
                    text: setResult ? `*_Antilink action set to ${setAction}_*\n${FOOTER}` : '*_Failed to set Antilink action_*\n' + FOOTER 
                }, { quoted: message });
                break;

            case 'get':
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                await sock.sendMessage(chatId, { 
                    text: `*_Antilink Configuration:_*\nStatus: ${status ? 'ON' : 'OFF'}\nAction: ${actionConfig ? actionConfig.action : 'Not set'}\n${FOOTER}` 
                }, { quoted: message });
                break;

            default:
                await sock.sendMessage(chatId, { text: `*_Use ${prefix}antilink for usage._*\n${FOOTER}` }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        await sock.sendMessage(chatId, { text: '*_Error processing antilink command_*\n' + FOOTER }, { quoted: message });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const config = await getAntilink(chatId, 'on');
    if (!config?.enabled) return;

    const action = config.action || 'delete';
    const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;
    if (!linkPattern.test(userMessage)) return;

    // Futa ujumbe wenye link
    const quotedMessageId = message.key.id;
    const quotedParticipant = message.key.participant || senderId;
    try {
        await sock.sendMessage(chatId, {
            delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
        });
    } catch (err) {
        console.error('Failed to delete message:', err);
    }

    const mention = senderId.split('@')[0];

    if (action === 'delete') {
        return; // kimya
    }
    else if (action === 'warn') {
        // Ongeza warning count (kupitia incrementWarningCount)
        const { incrementWarningCount, resetWarningCount } = require('../lib/index');
        const WARN_COUNT = require('../config').WARN_COUNT || 3;
        const warningCount = await incrementWarningCount(chatId, senderId);
        if (warningCount >= WARN_COUNT) {
            const kickMsg = `💀 *YOU HAVE BEEN REMOVED* 💀\n\n` +
                `@${mention} you ignored ${WARN_COUNT} warnings and kept posting links.\n\n` +
                `😈 *Bigmanj Antilink* does not tolerate rule breaking.\n\n` +
                `You are now EXPELLED from this group.\n\n` +
                FOOTER;
            await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
            await resetWarningCount(chatId, senderId);
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            } catch (err) {
                await sock.sendMessage(chatId, { text: ADMIN_REQUIRED_MSG + '\n' + FOOTER });
            }
        } else {
            const warnMsg = `🚫 *🔥 ANTILINK WARNING ${warningCount}/${WARN_COUNT} 🔥*\n\n` +
                `@${mention} you have posted a forbidden link!\n\n` +
                `😨 *This is warning ${warningCount} of ${WARN_COUNT}.* Next violation will get you REMOVED.\n\n` +
                `*Bigmanj Security System* – ACTIVE and FEARFUL 🔪\n` +
                FOOTER;
            await sock.sendMessage(chatId, { text: warnMsg, mentions: [senderId] });
        }
    }
    else if (action === 'remove') {
        const kickMsg = `💀 *YOU HAVE BEEN REMOVED* 💀\n\n` +
            `@${mention} you posted a forbidden link.\n\n` +
            `😈 *Bigmanj Antilink* does not tolerate rule breaking.\n\n` +
            `You are now EXPELLED from this group.\n\n` +
            FOOTER;
        await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            // Reset warning count ikiwa ipo
            const { resetWarningCount } = require('../lib/index');
            await resetWarningCount(chatId, senderId);
        } catch (err) {
            await sock.sendMessage(chatId, { text: ADMIN_REQUIRED_MSG + '\n' + FOOTER });
        }
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
