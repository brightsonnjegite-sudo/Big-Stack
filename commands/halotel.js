/**
 * halotel.js - Mickey Glitch Business Assistant (Bundle Sales)
 * Imeboreshwa: AI ya Biashara, Antibug, na Auto-Order System.
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741@s.whatsapp.net', // Namba ya kupokea oda
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
};

// Packages
const PACKAGES = [
    { gb: 10, price: 10000, label: 'Standard Pack',  id: 'h_pkg_10' },
    { gb: 15, price: 15000, label: 'Bronze Pack',    id: 'h_pkg_15' },
    { gb: 20, price: 20000, label: 'Premium Pack',   id: 'h_pkg_20' },
    { gb: 25, price: 25000, label: 'Gold Pack',      id: 'h_pkg_25' }
];

// ────────────────────────────────────────────────
// [BUSINESS AI LOGIC]
// ────────────────────────────────────────────────
async function getBusinessAIReply(query, userName) {
    const bizPrompt = `Weweni , msaidizi wa biashara wa Mickdadi Hamza.
    Kazi: Unasaidia kuuza bando la Halotel. Bei: 1GB = 1000/=.
    Vifurushi: 10GB(10k), 15GB(15k), 20GB(20k), 25GB(25k).
    Malipo: Halotel(0615944741) au AzamPesa(1615944741).
    Vibe: Ongea kishkaji (Bongo Slang), mkarimu, shawishi mteja alipe.`;

    const apis = [
        `https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`,
        `https://apiskeith.top/ai/copilot?q=${encodeURIComponent(bizPrompt + query)}`
    ];

    for (const url of apis) {
        try {
            const res = await axios.get(url, { timeout: 8000 });
            let reply = res.data.data || res.data.result || res.data.response;
            if (reply) return reply.replace(/ChatGPT|OpenAI|Microsoft/gi, "Mickey Biz AI");
        } catch (e) { continue; }
    }
    return "Nipo hapa kukusaidia kupata bando la Halotel chap chap. Chagua package hapa chini!";
}

// ────────────────────────────────────────────────
// [ORDER SYSTEM] - Tuma taarifa kwa muuzaji
// ────────────────────────────────────────────────
async function sendOrderNotification(sock, m, pkg, userNumber) {
    const orderText = `🔔 *ODA MPYA YAMEINGIA*\n\n` +
                     `👤 *Mteja:* @${userNumber.split('@')[0]}\n` +
                     `📦 *Kifurushi:* ${pkg.gb}GB (${pkg.label})\n` +
                     `💰 *Kiasi:* TSh ${pkg.price.toLocaleString()}\n\n` +
                     `_Mteja amepewa maelekezo ya malipo. Kagua muamala wake!_`;

    await sock.sendMessage(CONFIG.SELLER_NUMBER, { 
        text: orderText, 
        mentions: [userNumber] 
    });
}

// ────────────────────────────────────────────────
// HANDLE PACKAGE SELECTION
// ────────────────────────────────────────────────
async function handlePackageSelection(sock, chatId, m, packageId) {
    try {
        const cleanId = packageId.replace('.', '');
        const pkg = PACKAGES.find(p => p.id === cleanId);
        if (!pkg) return;

        // Tuma oda kwa muuzaji kimyakimya
        const mteja = m.key.participant || m.key.remoteJid;
        await sendOrderNotification(sock, m, pkg, mteja);

        const payMsg = `✅ *ODA YAKO IMEPOKELEWA*\n\n` +
                      `📦 *Package:* ${pkg.label}\n` +
                      `💾 *GB:* ${pkg.gb} GB\n` +
                      `💰 *Bei:* TSh ${pkg.price.toLocaleString()}/=\n\n` +
                      `*HATUA ZA MALIPO:*\n` +
                      `• Lipa TSh ${pkg.price.toLocaleString()} kwenda:\n` +
                      `  👉 *0615944741* (Halotel)\n` +
                      `  👉 *1615944741* (AzamPesa)\n\n` +
                      `• Tuma Screenshot ya muamala kwa @${CONFIG.SELLER_NUMBER.split('@')[0]}\n\n` +
                      `_Muuzaji ameshafahamishwa, atakupa bando lako punde tu baada ya kulipa!_`;

        const paymentButtons = [
            { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Nakili Namba (Halotel)", copy_code: "0615944741" }) },
            { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: "📞 Piga Simu", phone_number: "0615944741" }) }
        ];

        await sendInteractiveMessage(sock, chatId, {
            text: payMsg,
            interactiveButtons: paymentButtons,
            footer: CONFIG.FOOTER,
            contextInfo: { mentionedJid: [CONFIG.SELLER_NUMBER] }
        }, { quoted: m });

    } catch (error) {
        console.error('[HALOTEL Selection Error]', error);
    }
}

// ────────────────────────────────────────────────
// MAIN COMMAND
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const input = (body || '').toLowerCase().trim();
        const userName = m.pushName || 'Mteja';

        // 🛡️ ANTIBUG - Chuja urefu
        if (input.length > 5000) return;

        // 1. Handle package selection
        if (input.includes('h_pkg_')) {
            return await handlePackageSelection(sock, chatId, m, input);
        }

        // 2. Handle AI Questions (Kama sio command fupi ya .halotel)
        if (input.length > 10 && !input.startsWith('.')) {
            await sock.sendMessage(chatId, { react: { text: '👨‍💼', key: m.key } });
            const aiReply = await getBusinessAIReply(input, userName);
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

        // 3. Main Menu
        const adText = `🌟 *HALOTEL INTERNET MANAGER* 🌟\n\n` +
                      `Habari *${userName}*! Karibu upate bando la High-Speed.\n` +
                      `🔥 Bei Nafuu: GB 1 = TSh ${CONFIG.PRICE_PER_GB}/=\n\n` +
                      `Chagua package unayotaka hapa chini 👇`;

        const rows = PACKAGES.map(pkg => ({
            header: `${pkg.gb}GB`,
            title: pkg.label,
            description: `TSh ${pkg.price.toLocaleString()}/=`,
            id: `.${pkg.id}`
        }));

        await sendInteractiveMessage(sock, chatId, {
            image: { url: CONFIG.BANNER },
            text: adText,
            footer: CONFIG.FOOTER,
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: '📦 CHAGUA PACKAGE',
                        sections: [{ title: 'VIFURUSHI VYA HALOTEL', rows: rows }]
                    })
                }
            ]
        }, { quoted: m });

    } catch (error) {
        console.error('[HALOTEL Command Error]', error);
    }
}

// ────────────────────────────────────────────────
// EXPORT - Auto Registration (HAJAIBADILIKA)
// ────────────────────────────────────────────────
module.exports = halotelCommand;
module.exports.name = 'halotel';
module.exports.category = 'BUSINESS';
module.exports.description = 'Halotel Internet Packages and Business AI';
