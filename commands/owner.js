// commands/owner.js – Three cards, four buttons each (call, chat, join channel, join group)
const { generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const os = require('os');

const OWNER_NAME = "bigmanj tech";
const OWNER_PHONE = "255777580820";
const CHANNEL_LINK = "https://whatsapp.com/channel/0029Vb6B9xFCxoAseuG1g610";
const GROUP_LINK = "https://chat.whatsapp.com/EqShDJzCwQvLfWAsnQmIQi?s=cl&p=a&ilr=4";
const MICKEY_SIGNATURE = '\x20ᴄᴏᴅᴇ\x20ʙʏ\x20ʙɪɢᴍᴀɴᴊ\x20ᴛᴇᴄʜ\x20\x20•\x20𝟸𝟶𝟸𝟼\x20';
globalThis['MICKEY_SIGNATURE'] = MICKEY_SIGNATURE;

const OWNER_IMAGES = [
    'https://files.catbox.moe/uii8bi.jpg',
    'https://files.catbox.moe/69csjf.jpg',
    'https://files.catbox.moe/dhl8dp.jpg'
];

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

// Fallback text menu (unchanged)
async function sendTextFallback(sock, chatId, senderId) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);
    const ramBar = "█".repeat(Math.round(ramPercent / 10)) + "░".repeat(10 - Math.round(ramPercent / 10));

    const menu = `
╭━━━━━━━━━━━━━━━━━━━━╮
┃      👑 OWNER PANEL     ┃
╰━━━━━━━━━━━━━━━━━━━━╯

👤 *Name*: ${OWNER_NAME}
📞 *Phone*: wa.me/${OWNER_PHONE}
🤖 *Bot*: BIGMANJ BOT V3

💾 *RAM*: [${ramBar}] ${ramPercent}%
⏱️ *Uptime*: ${formatUptime(process.uptime())}
🖥️ *Node*: ${process.version}
📡 *Library*: Baileys

───────────── *Commands* ─────────────
🔄 .update
🔁 .restart
🧹 .clearsession
📊 .stats
📢 .broadcast
─────────────
${MICKEY_SIGNATURE}
    `.trim();
    await sock.sendMessage(chatId, { text: menu, mentions: senderId ? [senderId] : undefined });
}

async function ownerCommand(sock, chatId, message) {
    let senderId = null;
    try {
        if (message && message.key) {
            senderId = message.key.participant || message.key.remoteJid;
        }
        if (!senderId && chatId && !chatId.endsWith('@g.us')) {
            senderId = chatId;
        }

        // ----- CARD 1: Owner Contact (short) -----
        const card1Body = 
`👤 *Owner* : ${OWNER_NAME}
📞 *Phone* : wa.me/${OWNER_PHONE}
🤖 *Bot*   : BIGMANJ BOT V3
📌 *Need help?* Tap below.`;

        // ----- CARD 2: Developer Profile (short) -----
        const card2Body = 
`👨‍💻 *Developer*
Full‑stack engineer.
🔹 Node.js, Baileys, Python
🔹 WhatsApp automation
🔹 Clean code & security`;

        // ----- CARD 3: Skills & Support (short) -----
        const card3Body = 
`⚡ *Skills & Support*
• Anti‑spam / Anti‑link
• Multi‑device / 24/7
• Fast commands
🆘 *Contact* via buttons below.`;

        // Prepare cards
        const cards = [];

        // Card 1 – Four buttons
        const media1 = await prepareWAMessageMedia({ image: { url: OWNER_IMAGES[0] } }, { upload: sock.waUploadToServer });
        cards.push({
            header: { title: "👑 OWNER CONTACT", hasMediaAttachment: true, imageMessage: media1.imageMessage },
            body: { text: card1Body },
            footer: { text: MICKEY_SIGNATURE },
            nativeFlowMessage: {
                buttons: [
                    { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: '📞 CALL ME', phoneNumber: OWNER_PHONE }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '💬 CHAT WITH ME', url: `https://wa.me/${OWNER_PHONE}` }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '📢 JOIN CHANNEL', url: CHANNEL_LINK }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👥 JOIN GROUP', url: GROUP_LINK }) }
                ]
            }
        });

        // Card 2 – Four buttons
        const media2 = await prepareWAMessageMedia({ image: { url: OWNER_IMAGES[1] } }, { upload: sock.waUploadToServer });
        cards.push({
            header: { title: "👨‍💻 DEVELOPER PROFILE", hasMediaAttachment: true, imageMessage: media2.imageMessage },
            body: { text: card2Body },
            footer: { text: MICKEY_SIGNATURE },
            nativeFlowMessage: {
                buttons: [
                    { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: '📞 CALL ME', phoneNumber: OWNER_PHONE }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '💬 CHAT WITH ME', url: `https://wa.me/${OWNER_PHONE}` }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '📢 JOIN CHANNEL', url: CHANNEL_LINK }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👥 JOIN GROUP', url: GROUP_LINK }) }
                ]
            }
        });

        // Card 3 – Four buttons
        const media3 = await prepareWAMessageMedia({ image: { url: OWNER_IMAGES[2] } }, { upload: sock.waUploadToServer });
        cards.push({
            header: { title: "⚡ SKILLS & SUPPORT", hasMediaAttachment: true, imageMessage: media3.imageMessage },
            body: { text: card3Body },
            footer: { text: MICKEY_SIGNATURE },
            nativeFlowMessage: {
                buttons: [
                    { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: '📞 CALL ME', phoneNumber: OWNER_PHONE }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '💬 CHAT WITH ME', url: `https://wa.me/${OWNER_PHONE}` }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '📢 JOIN CHANNEL', url: CHANNEL_LINK }) },
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👥 JOIN GROUP', url: GROUP_LINK }) }
                ]
            }
        });

        // Send carousel
        const carouselMessage = {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: '👑 *BIGMANJ TECH CAROUSEL*\n\nSwipe left/right – each card has four action buttons.' },
                        footer: { text: `© ${OWNER_NAME.toUpperCase()} – Mainframe System` },
                        carouselMessage: { cards }
                    }
                }
            }
        };

        const msg = generateWAMessageFromContent(chatId, carouselMessage, { quoted: message });
        await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });

        if (message && message.key) {
            await sock.sendMessage(chatId, { react: { text: '👑', key: message.key } });
        }
    } catch (error) {
        console.error('Carousel failed, using fallback:', error.message);
        await sendTextFallback(sock, chatId, senderId);
    }
}

module.exports = ownerCommand;
