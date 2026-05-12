
/**
 * halotel.js - Mickey Glitch Business AI (Full Automated Version)
 * Kazi: AI conversation, Auto-calculation, na Interactive Buttons.
 */

const { sendInteractiveMessage } = require('gifted-btns');
const axios = require('axios');

// ────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────
const CONFIG = {
    PRICE_PER_GB: 1000,
    SELLER_NUMBER: '255615944741@s.whatsapp.net',
    BANNER: 'https://files.catbox.moe/ljabyq.png',
    FOOTER: '🚀 Powered by Mickey Glitch Tech',
    PAYMENT_NO: '0615944741'
};

const PACKAGES = [
    { gb: 10, label: 'Standard Pack', id: 'h_pkg_10' },
    { gb: 15, label: 'Bronze Pack',   id: 'h_pkg_15' },
    { gb: 20, label: 'Silver Pack',   id: 'h_pkg_20' },
    { gb: 25, label: 'Gold Pack',     id: 'h_pkg_25' },
    { gb: 50, label: 'Business Pack', id: 'h_pkg_50' }
];

// ────────────────────────────────────────────────
// [BUSINESS AI FUNCTION]
// ────────────────────────────────────────────────
async function askMickeyBiz(query, userName, context = "") {
    try {
        const bizPrompt = `Wewe ni Mickey Biz AI, msaidizi wa Mickdadi. 
        Unauza bando la Halotel (1GB ni 1000 TSh). 
        Mteja anaitwa ${userName}. Jibu kishkaji kwa lugha ya mtaani (Bongo Slang).
        Sisitiza kuwa malipo ni kabla na screenshot ni lazima.
        Context ya sasa: ${context}`;

        const res = await axios.get(`https://apiskeith.top/ai/gpt?q=${encodeURIComponent(bizPrompt + query)}`);
        return res.data.data || res.data.result || "Oya mwanangu! Lipia bando chap tuwashe mitambo.";
    } catch (e) {
        return "Nipo hapa mwanangu! Andika .halotel uone vifurushi vyetu vikali.";
    }
}

// ────────────────────────────────────────────────
// [MAIN COMMAND HANDLER]
// ────────────────────────────────────────────────
async function halotelCommand(sock, chatId, m, body = '') {
    try {
        const userName = m.pushName || 'Mteja';
        const userJid = m.key.participant || m.key.remoteJid;

        // 1. TAMBUA INPUT
        const textMsg = (m.message?.conversation || m.message?.extendedTextMessage?.text || body || '').toLowerCase().trim();
        const selectedRowId = m.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

        // 2. [RESPONSE HANDLER] - Mteja akichagua bando (Calculation & Payment)
        if (selectedRowId && selectedRowId.startsWith('h_pkg_')) {
            const gbAmount = parseInt(selectedRowId.replace('h_pkg_', ''));
            const totalPrice = gbAmount * CONFIG.PRICE_PER_GB;

            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });

            // AI inatoa pongezi kwa kuchagua bando
            const aiComment = await askMickeyBiz(`Mteja amechagua bando la ${gbAmount}GB kwa TSh ${totalPrice}. Mpe maelekezo.`, userName, "Mteja ameshachagua bando tayari.");

            const paymentButtons = [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Namba (0615944741)",
                        copy_code: CONFIG.PAYMENT_NO
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                text: `✨ *MICKEY BIZ - MALIPO*\n\n${aiComment}\n\n📊 *MUHTASARI WA ODA:*\n📦 Kifurushi: ${gbAmount}GB\n💰 Kiasi: TSh ${totalPrice.toLocaleString()}\n\nBofya button hapa chini kunakili namba ya malipo. Ukishalipa, tuma screenshot hapa!`,
                footer: CONFIG.FOOTER,
                interactiveButtons: paymentButtons
            }, { quoted: m });
        }

        // 3. [MAIN MENU] - Inaitwa na .halotel
        if (textMsg.startsWith('.halotel')) {
            await sock.sendMessage(chatId, { react: { text: '🛒', key: m.key } });

            const sections = [{
                title: "VIFURUSHI VYA HALOTEL (1GB = 1,000)",
                rows: PACKAGES.map(p => ({
                    header: `${p.gb}GB`,
                    title: p.label,
                    description: `Bei: TSh ${(p.gb * CONFIG.PRICE_PER_GB).toLocaleString()}`,
                    id: p.id
                }))
            }];

            const menuButtons = [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "🛒 CHAGUA BANDO",
                        sections: sections
                    })
                }
            ];

            return await sendInteractiveMessage(sock, chatId, {
                image: { url: CONFIG.BANNER },
                text: `Mambo vipi *${userName}*! 👋\n\nKaribu *Mickey Infor Technology*. Tunauza bando za Halotel kwa bei ya kawaida (1GB = 1000 tu).\n\nChagua bando unalotaka hapa chini nikupe maelekezo ya malipo chap! 👇`,
                footer: CONFIG.FOOTER,
                interactiveButtons: menuButtons
            }, { quoted: m });
        }

        // 4. [AI CONVERSATION] - Maswali mengine (General Chat)
        if (textMsg.length > 2 && !textMsg.startsWith('.')) {
            await sock.sendMessage(chatId, { react: { text: '💼', key: m.key } });
            const aiReply = await askMickeyBiz(textMsg, userName, "Mteja anauliza maswali ya jumla kuhusu biashara.");
            return await sock.sendMessage(chatId, { text: `💼 *MICKEY BIZ:* ${aiReply}` }, { quoted: m });
        }

    } catch (e) {
        console.error("Halotel Error:", e);
    }
}

module.exports = halotelCommand;
