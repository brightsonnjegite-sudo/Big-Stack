const chalk = require('chalk');

/**
 * Handle Auto Status View & Reaction
 * Imeandaliwa kuzuia 'participant' undefined error
 */
async function handleAutoStatus(Mickey, chatUpdate) {
    try {
        const mek = chatUpdate.messages[0];
        if (!mek || !mek.key || mek.key.remoteJid !== 'status@broadcast') return null;

        // 1. View Status (Kusoma)
        await Mickey.readMessages([mek.key]);

        // 2. Auto Like / Reaction
        // Tunatumia JID ya mtumaji kwa usahihi (LID au S.WHATSAPP.NET)
        const senderJid = mek.key.participant || mek.participant || mek.key.remoteJid;
        
        try {
            await Mickey.sendMessage('status@broadcast', {
                react: { key: mek.key, text: '💚' }
            }, { statusJidList: [senderJid] });
        } catch (e) {
            // Haisitishi bot kama reaction ikifeli
        }

        console.log(chalk.green(`[STATUS] Viewed: ${mek.pushName || 'User'}`));
        return mek; // Tunarudisha mek ili itumiwe na forwarder kwenye main.js
    } catch (err) {
        if (!err.message.includes('participant')) {
            console.log(chalk.red(`[STATUS ERROR]: ${err.message}`));
        }
        return null;
    }
}

module.exports = { handleAutoStatus };
