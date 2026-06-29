const moment = require('moment-timezone');
const axios = require('axios');
const os = require('os');

// --------------------- Helper functions ---------------------
const getMessageText = (m) => {
    if (m.message?.conversation) return m.message.conversation;
    if (m.message?.extendedTextMessage?.text) return m.message.extendedTextMessage.text;
    return '';
};

const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
};

const getGreeting = () => {
    const hour = moment().tz('Africa/Dar_es_Salaam').hour();
    if (hour >= 5 && hour < 12) return '🌅 good morning';
    if (hour >= 12 && hour < 18) return '🌤️ good afternoon';
    return '🌙 good evening';
};

const getMentionNumber = (jid) => jid.split('@')[0];

const MENU_IMAGES = [
    'https://files.catbox.moe/uii8bi.jpg',
    'https://files.catbox.moe/69csjf.jpg',
    'https://files.catbox.moe/69csjf.jpg',
    'https://files.catbox.moe/wz28nv.jpg',
    'https://files.catbox.moe/07brl4.jpg',
    'https://files.catbox.moe/uii8bi.jpg',
    'https://files.catbox.moe/dhl8dp.jpg',
    'https://files.catbox.moe/n6adzs.jpg',
    'https://files.catbox.moe/gom02i.jpg',
    'https://files.catbox.moe/vvt57n.jpg',
    'https://files.catbox.moe/sp5pe9.jpg',
    'https://files.catbox.moe/x91kwx.jpg',
    'https://files.catbox.moe/8lz3ku.jpg',
    'https://files.catbox.moe/9yvg4v.jpg',
    'https://files.catbox.moe/1z5alt.jpg',
    'https://files.catbox.moe/5rsxjx.jpg',
    'https://files.catbox.moe/ke4n31.jpg',
    'https://files.catbox.moe/0s1yur.jpg',
    'https://files.catbox.moe/q01e2v.jpg',
    'https://files.catbox.moe/e0esva.jpg',
    'https://files.catbox.moe/x39ule.jpg'
];

const userImageIndex = new Map();
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getReadMoreTrigger() {
    return '\u200b'.repeat(10000) + '\n';
}

function getSmartMenuCaption(pushname, mention, ping, ramBar, ramPercent, runtime, version, totalCommands, isOwner) {
    const ownerNumber = "255777580820";
    const ownerName = "bigmanj tech";

    // Russian description
    const russianDescription = `🤖 BIGMANJ BOT V3 — быстрый и умный WhatsApp-бот с поддержкой нескольких устройств от © bigmanj tech ™. Включает ИИ, два языка (английский и суахили), управление группами, распознавание стикеров/GIF/голосовых сообщений, анализ фото/видео и плагины.`;

    // ========== VISIBLE PART with └── ▢ style ==========
    const visiblePart = 
`└── ▢ 🤖 *𝐁𝐈𝐆𝐌𝐀𝐍𝐉 𝐁𝐎𝐓 𝐕3*
└── ▢ *𝐦𝐚𝐢𝐧 𝐦𝐞𝐧𝐮*
└── ▢ ✦ ${getGreeting()} @${mention} ✦
└── ▢ 
└── ▢ ──── *𝐔𝐒𝐄𝐑 𝐈𝐍𝐅𝐎* ────
└── ▢ Status : ${isOwner ? "Owner" : "User"}
└── ▢ Name   : @${pushname}
└── ▢ Prefix : {.}
└── ▢ 
└── ▢ ──── *𝐁𝐎𝐓 𝐈𝐍𝐅𝐎* ────
└── ▢ Name    : 𝐁𝐈𝐆𝐌𝐀𝐍𝐉 𝐁𝐎𝐓 𝐕3`;

    // ========== HIDDEN PART with └── ▢ style ==========
    const hiddenPart = 
`
└── ▢ Version : ${version}
└── ▢ Library : Baileys
└── ▢ Uptime  : ${runtime}
└── ▢ Powered : bigmanj tech
└── ▢ Speed   : ${(ping / 1000).toFixed(2)}s
└── ▢ Ram     : [${ramBar}] ${ramPercent}%
└── ▢ 
└── ▢ ──── *𝐂𝐑𝐄𝐀𝐓𝐎𝐑𝐒* ────
└── ▢ bigmanj tech
└── ▢ ♥︎
└── ▢ 
└── ▢ ──── *𝐎𝐖𝐍𝐄𝐑 𝐈𝐍𝐅𝐎* ────
└── ▢ owner : ${ownerName}
└── ▢ phone : ${ownerNumber}
└── ▢ 
└── ▢ ──── *𝐀𝐁𝐎𝐔𝐓* ────
└── ▢ © bigmanj tech ™
└── ▢ main menu
└── ▢ mini menu
└── ▢ 
└── ▢ ──── *𝐌𝐄𝐍𝐔 𝐋𝐈𝐒𝐓* ────
└── ▢ ⚙️ .menu-general
└── ▢ 👥 .menu-group
└── ▢ 🛡️ .menu-security
└── ▢ 🧠 .menu-ai
└── ▢ 📥 .menu-download
└── ▢ ✨ .menu-effects
└── ▢ 👑 .menu-owner
└── ▢ ⚙️ .menu-settings
└── ▢ 🔧 .menu-tools
└── ▢ 🎮 .menu-fun
└── ▢ 🤖 .menu-automation
└── ▢ 📚 .menu-all

└── ▢ Usage: .menu
└── ▢ *𝐁𝐈𝐆𝐌𝐀𝐍𝐉 𝐁𝐎𝐓 𝐕3 Developed by bigmanj tech with ♥︎*
└── ▢ script is under construction 🚧
└── ▢ ${russianDescription}

© bigmanj tech ™ with ♥︎`;

    const readMore = getReadMoreTrigger();
    return `${visiblePart}${readMore}${hiddenPart}`;
}

async function sendMp3Audio(sock, chatId, quotedMsg) {
    const audioUrl = 'https://files.catbox.moe/dvnn2a.mp3';
    try {
        await sock.sendMessage(chatId, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: quotedMsg });
    } catch (err) {
        console.error('MP3 audio send failed:', err.message);
        await sock.sendMessage(chatId, { text: '🔊 Audio guide: use .menu-ai for AI, .menu-download for media, etc.' }, { quoted: quotedMsg });
    }
}

// ========== BUTTON HANDLERS ==========
async function handleTeamSupport(sock, chatId, msg) {
    const supportMsg = 
`└── ▢ 👥 *TEAM SUPPORT*

└── ▢ Status  : ✅ Available
└── ▢ Channel : bigmanj tech Support

📌 *Join our support community:*
🔗 https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7

📌 *Contact Owner:*
📱 wa.me/255777580820

© bigmanj tech ™ with ♥︎`;

    await sock.sendMessage(chatId, { 
        text: supportMsg,
        mentions: [msg.key.participant || msg.key.remoteJid]
    }, { quoted: msg });
}

async function handleBuyBot(sock, chatId, msg) {
    try {
        const productImage = 'https://x.xcute.workers.dev/f/images/abe592862f20.jpg';
        
        const productMsg = 
`└── ▢ 💎 *BUY BOT SCRIPT*

└── ▢ Product  : SC Zero-Tr4sh
└── ▢ Brand    : By Ghost King
└── ▢ Price    : Tsh 45.000
└── ▢ Sale     : Tsh 35.000 🎉

📌 *Features you'll get:*
• Simple & Clean UI
• Interactive Buttons
• Fast Response
• No Encryption
• Easy to Customize
• Free API Key

📌 *Contact the owner to purchase:*
🔗 wa.me/255719632816

© bigmanj tech ™ with ♥︎`;

        // Send product image with caption
        await sock.sendMessage(chatId, {
            image: { url: productImage },
            caption: productMsg,
            mentions: [msg.key.participant || msg.key.remoteJid]
        }, { quoted: msg });

    } catch (err) {
        console.error('Buy bot handler error:', err);
        await sock.sendMessage(chatId, {
            text: `❌ Error loading product. Contact owner directly: wa.me/255719632816`
        }, { quoted: msg });
    }
}

// ========== MAIN MENU HANDLER ==========
const menuHandler = async (sock, chatId, m) => {
    const text = getMessageText(m).trim().toLowerCase();
    if (text !== '.menu') return;

    const senderId = m.key.participant || m.key.remoteJid;
    const pushname = m.pushName || "User";
    const start = Date.now();
    await sock.sendMessage(chatId, { react: { text: '🍁', key: m.key } });
    const ping = Date.now() - start;

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);
    const ramBar = "█".repeat(Math.round(ramPercent / 10)) + "░".repeat(10 - Math.round(ramPercent / 10));
    const runtime = formatUptime(process.uptime());
    const version = "3.0.0";
    const totalCommands = 210;
    const mention = getMentionNumber(senderId);
    const isOwner = (senderId.split('@')[0] === "255777580820");

    // Slide image
    let currentIndex = userImageIndex.get(senderId) || 0;
    const currentImageUrl = MENU_IMAGES[currentIndex];
    const nextIndex = (currentIndex + 1) % MENU_IMAGES.length;
    userImageIndex.set(senderId, nextIndex);

    const caption = getSmartMenuCaption(pushname, mention, ping, ramBar, ramPercent, runtime, version, totalCommands, isOwner);

    // ========== INTERACTIVE BUTTONS ==========
    const interactiveButtons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "👥 Team Support",
                id: "team_support"
            })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
                display_text: "💎 Buy Bot",
                id: "buy_bot"
            })
        }
    ];

    try {
        // Send menu with buttons
        await sock.sendMessage(chatId, {
            image: { url: currentImageUrl },
            caption: caption,
            footer: '© BIGMANJ BOT V3 – by bigmanj tech',
            interactiveButtons: interactiveButtons,
            headerType: 1,
            mentions: [senderId]
        }, { quoted: m });
    } catch (err) {
        console.error('Menu send failed:', err.message);
        // Fallback: send as text with commands
        await sock.sendMessage(chatId, { text: caption, mentions: [senderId] }, { quoted: m });
        await sock.sendMessage(chatId, {
            text: `👥 For support, type .support\n💎 To buy, type .buy`
        }, { quoted: m });
    }

    // Send audio after menu
    await sleep(100);
    await sendMp3Audio(sock, chatId, m);
};

// Export menuHandler and button handlers
module.exports = menuHandler;
module.exports.buttonHandlers = {
    team_support: handleTeamSupport,
    buy_bot: handleBuyBot
};
