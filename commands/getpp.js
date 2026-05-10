const axios = require('axios');

/**
 * Get profile picture command - FAST VERSION
 * Works with text replies, mentions, and phone numbers
 * @param {Object} sock - Baileys socket instance
 * @param {Object} m - Message object  
 * @param {Array} args - Command arguments
 */
const getProfilePictureCommand = async (sock, m, args) => {
    // Fast validation
    if (!m || !m.key || !m.key.remoteJid) {
        return;
    }

    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    
    try {
        let target = sender; // Default: sender's own picture

        // Priority 1: Phone number in args
        if (args && args.length > 0 && args[0]) {
            const phoneNumber = args[0].replace(/[^0-9]/g, '');
            if (phoneNumber && phoneNumber.length >= 9) {
                target = phoneNumber + '@s.whatsapp.net';
            }
        }
        // Priority 2: Mentioned users
        else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Priority 3: Quoted/replied to message
        else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant;
        }

        // Fetch profile picture URL with timeout
        let profileUrl;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
            profileUrl = await Promise.race([
                sock.profilePictureUrl(target, 'image'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 7500))
            ]);
            clearTimeout(timeout);
        } catch (error) {
            clearTimeout(timeout);
            // Silent fail - user likely has privacy enabled
            await sock.sendMessage(chatId, {
                text: '❌ Profile picture not available\n_Privacy enabled or no picture set_'
            }, { quoted: m }).catch(() => {});
            return;
        }

        if (!profileUrl) {
            await sock.sendMessage(chatId, {
                text: '❌ Could not fetch profile picture'
            }, { quoted: m }).catch(() => {});
            return;
        }

        // Download with aggressive timeout
        const response = await axios.get(profileUrl, {
            responseType: 'arraybuffer',
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        }).catch(() => null);

        if (!response?.data || response.data.length === 0) {
            await sock.sendMessage(chatId, {
                text: '❌ Failed to download picture'
            }, { quoted: m }).catch(() => {});
            return;
        }

        // Send immediately without extra processing
        const targetNum = target.split('@')[0];
        const isOwn = target === sender;

        await sock.sendMessage(chatId, {
            image: Buffer.from(response.data),
            caption: `✅ *Profile Picture*${isOwn ? ' (Yours)' : ''}\n👤 @${targetNum}`
        }, { quoted: m }).catch(() => {});

    } catch (error) {
        // Fail silently or send minimal error
        try {
            await sock.sendMessage(chatId, {
                text: '❌ Error getting picture'
            }, { quoted: m }).catch(() => {});
        } catch (e) {
            // Silent fail
        }
    }
};

module.exports = getProfilePictureCommand;
module.exports.name = 'getpp';
module.exports.category = 'UTILITY';
module.exports.description = 'Get profile picture - fast & instant';
