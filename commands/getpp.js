const axios = require('axios');

/**
 * Get Profile Picture Command - PRO VERSION
 * Inatumia Baileys + Fallback ya Web Scraping (Toolzin style)
 */
const getProfilePictureCommand = async (sock, m, args) => {
    if (!m || !m.key || !m.key.remoteJid) return;

    const chatId = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    try {
        let target = sender;

        // 1. Pata target (kama ni namba, mention, au reply)
        if (args && args.length > 0) {
            const phoneNumber = args[0].replace(/[^0-9]/g, '');
            if (phoneNumber.length >= 9) {
                target = phoneNumber + '@s.whatsapp.net';
            }
        } else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
            target = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
            target = m.message.extendedTextMessage.contextInfo.participant;
        }

        const targetNum = target.split('@')[0];
        let profileUrl = null;

        // --- NJIA YA 1: Baileys Official ---
        try {
            profileUrl = await sock.profilePictureUrl(target, 'image');
        } catch (e) {
            // --- NJIA YA 2: Web Scraping (Mbinu ya Toolzin) ---
            // Kama privacy ya mtumiaji ni "Everyone", picha inaonekana wa.me
            try {
                const waRes = await axios.get(`https://wa.me/${targetNum}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    timeout: 5000
                });

                if (waRes.data.includes('og:image')) {
                    const match = waRes.data.match(/property="og:image" content="([^"]+)"/);
                    if (match && match[1]) {
                        profileUrl = match[1].replace(/&amp;/g, '&');
                    }
                }
            } catch (scrapingError) {
                profileUrl = null;
            }
        }

        // Kama picha haijapatikana kote
        if (!profileUrl || profileUrl.includes('default-user')) {
            return await sock.sendMessage(chatId, {
                text: `❌ *Imeshindikana!*\n\nInawezekana namba *${targetNum}* imeweka privacy ya picha (Nobody/Contacts) au haina picha kabisa.`
            }, { quoted: m });
        }

        // 2. Download picha kwa kutumia Axios
        const response = await axios.get(profileUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.data) throw new Error('Data tupu');

        // 3. Tuma picha kwa mtumiaji
        await sock.sendMessage(chatId, {
            image: Buffer.from(response.data),
            caption: `✅ *Profile Picture*\n\n👤 *User:* @${targetNum}\n🔗 *Link:* ${profileUrl.substring(0, 30)}...`,
            mentions: [target]
        }, { quoted: m });

    } catch (error) {
        console.error('Error getpp:', error);
        await sock.sendMessage(chatId, { text: '❌ Hitilafu imetokea wakati wa kuchukua picha.' }, { quoted: m });
    }
};

module.exports = getProfilePictureCommand;
module.exports.name = 'getpp';
module.exports.category = 'UTILITY';
module.exports.description = 'Chukua picha ya wasifu ya mtu yeyote (DP)';
