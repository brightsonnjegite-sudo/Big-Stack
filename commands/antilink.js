// commands/antilink.js
const { setAntilink, getAntilink, removeAntilink } = require('../lib/index');
const isAdmin = require('../lib/isAdmin');

const FOOTER = '© bigmanj tech ™ with ♥︎';

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin, message) {
    try {
        if (!isSenderAdmin) {
            const msg = 
`└── ▢ ❌ *PERMISSION DENIED*

└─ ▢ ─ *REQUIREMENT* ─
└─ ▢ Be an admin first 🥇
└─ ▢ Then antilink security will run perfectly

📌 Only admins can configure antilink.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: msg }, { quoted: message });
            return;
        }

        const prefix = '.';
        const args = userMessage.slice(9).toLowerCase().trim().split(' ');
        const action = args[0];

        if (!action) {
            const usage = 
`└── ▢ 🔗 *ANTILINK SETUP*

└─ ▢ ─ *COMMANDS* ─
└─ ▢ .antilink on         - Enable antilink (delete mode)
└─ ▢ .antilink off        - Disable antilink
└─ ▢ .antilink set delete - Quiet delete mode
└─ ▢ .antilink set warn   - Delete + progressive warnings
└─ ▢ .antilink set remove - Delete + immediate kick

${FOOTER}`;
            await sock.sendMessage(chatId, { text: usage }, { quoted: message });
            return;
        }

        switch (action) {
            case 'on': {
                const existingConfig = await getAntilink(chatId, 'on');
                if (existingConfig?.enabled) {
                    const msg = 
`└─ ▢ ℹ️ *ALREADY ON*

└─ ▢ Antilink is already ON 💀

${FOOTER}`;
                    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                    return;
                }
                const result = await setAntilink(chatId, 'on', 'delete');
                const msg = result 
                    ? `└── ▢ 🔒 *ANTILINK ACTIVATED*

└─ ▢ ─ *STATUS* ─
└─ ▢ Status : 🟢 ON
└─ ▢ Action : Delete (quiet mode)

📌 NO LINKS ALLOWED HERE 💀

${FOOTER}`
                    : `└── ▢ ❌ *FAILED*\n\n└── ▢ Failed to turn ON Antilink\n\n${FOOTER}`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                break;
            }

            case 'off': {
                await removeAntilink(chatId, 'on');
                const msg = 
`└─ ▢ 🔓 *ANTILINK DEACTIVATED*

└─ ▢ ─ *STATUS* ─
└─ ▢ Status : 🔴 OFF
└─ ▢ Links : ✅ ALLOWED

📌 Antilink has been turned OFF.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                break;
            }

            case 'set': {
                if (args.length < 2) {
                    const msg = 
`└─ ▢ ❌ *INVALID ACTION*

└─ ▢ Usage : .antilink set delete | warn | remove

${FOOTER}`;
                    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                    return;
                }
                const setAction = args[1];
                if (!['delete', 'warn', 'remove'].includes(setAction)) {
                    const msg = 
`└─ ▢ ❌ *INVALID OPTION*

└─ ▢ Choose: delete, warn, or remove.

${FOOTER}`;
                    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                    return;
                }
                const setResult = await setAntilink(chatId, 'on', setAction);
                const actionEmoji = setAction === 'delete' ? '🔇' : setAction === 'warn' ? '⚠️' : '🚫';
                const actionDesc = setAction === 'delete' ? 'Quiet delete' : setAction === 'warn' ? 'Delete + warnings' : 'Delete + immediate kick';
                const msg = setResult 
                    ? `└── ▢ ✅ *ANTILINK UPDATED*

└─ ▢ ─ *CONFIGURATION* ─
└─ ▢ Action : ${actionEmoji} ${actionDesc}

📌 Antilink action set to ${setAction}.

${FOOTER}`
                    : `└── ▢ ❌ *FAILED*\n\n└── ▢ Failed to set Antilink action\n\n${FOOTER}`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                break;
            }

            case 'get': {
                const status = await getAntilink(chatId, 'on');
                const actionConfig = await getAntilink(chatId, 'on');
                const statusEmoji = status?.enabled ? '🟢 ON' : '🔴 OFF';
                const actionDisplay = actionConfig?.action || 'Not set';
                const msg = 
`└─ ▢ 📊 *ANTILINK CONFIGURATION*

└─ ▢ ─ *SETTINGS* ─
└─ ▢ Status : ${statusEmoji}
└─ ▢ Action : ${actionDisplay}

${FOOTER}`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
                break;
            }

            default: {
                const msg = 
`└─ ▢ ❌ *UNKNOWN COMMAND*

└─ ▢ Use .antilink for usage help.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: msg }, { quoted: message });
            }
        }
    } catch (error) {
        console.error('Error in antilink command:', error);
        const msg = 
`└─ ▢ ❌ *ERROR*

└─ ▢ Error processing antilink command.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: msg }, { quoted: message });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const config = await getAntilink(chatId, 'on');
    if (!config?.enabled) return;

    const action = config.action || 'delete';
    const linkPattern = /https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/i;
    if (!linkPattern.test(userMessage)) return;

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
        return;
    } else if (action === 'warn') {
        const { incrementWarningCount, resetWarningCount } = require('../lib/index');
        const WARN_COUNT = require('../config').WARN_COUNT || 3;
        const warningCount = await incrementWarningCount(chatId, senderId);
        if (warningCount >= WARN_COUNT) {
            const kickMsg = 
`└─ ▢ 💀 *YOU HAVE BEEN REMOVED*

└─ ▢ ─ *ACTION* ─
└─ ▢ User    : @${mention}
└─ ▢ Reason  : ${WARN_COUNT} warnings ignored
└─ ▢ Status  : 🚫 EXPELLED

📌 BigStack Antilink does not tolerate rule breaking.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
            await resetWarningCount(chatId, senderId);
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            } catch (err) {
                const adminMsg = 
`└─ ▢ ❌ *ADMIN REQUIRED*
└─ ▢ Please make the bot an admin to kick users.

${FOOTER}`;
                await sock.sendMessage(chatId, { text: adminMsg });
            }
        } else {
            const warnMsg = 
`└─ ▢ 🚫 *ANTILINK WARNING ${warningCount}/${WARN_COUNT}*

└─ ▢ ─*VIOLATION* ─
└─ ▢ User    : @${mention}
└─ ▢ Action  : Posted forbidden link
└─ ▢ Warning : ${warningCount}/${WARN_COUNT}

📌 Next violation will get you REMOVED.
🔪 BigStack Security System – ACTIVE

${FOOTER}`;
            await sock.sendMessage(chatId, { text: warnMsg, mentions: [senderId] });
        }
    } else if (action === 'remove') {
        const kickMsg = 
`└── ▢ 💀 *YOU HAVE BEEN REMOVED*

└─ ▢ ─ *ACTION* ─
└─ ▢ User    : @${mention}
└─ ▢ Reason  : Posted forbidden link
└─ ▢ Status  : 🚫 EXPELLED

📌 BigStack Antilink does not tolerate rule breaking.

${FOOTER}`;
        await sock.sendMessage(chatId, { text: kickMsg, mentions: [senderId] });
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            const { resetWarningCount } = require('../lib/index');
            await resetWarningCount(chatId, senderId);
        } catch (err) {
            const adminMsg = 
`└─ ▢ ❌ *ADMIN REQUIRED*

└─ ▢ Please make the bot an admin to kick users.

${FOOTER}`;
            await sock.sendMessage(chatId, { text: adminMsg });
        }
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};
