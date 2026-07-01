// commands/buy.js
const { sendButtons } = require('gifted-btns');
const FOOTER = '© bigmanj tech ™ with ♥︎';

// Maelezo ya mpokeaji wa malipo (Irene Laitoni - Halotel)
const PAYMENT_NAME = 'Irene Laitoni';
const PAYMENT_NUMBER = '0636657591';
const PAYMENT_NETWORK = 'Halotel';

// Namba yako (owner) kwa mawasiliano
const OWNER_NUMBER = '255636756591';

// ─── COMMAND: .buy ─────────────────────────────────────────────
async function buyCommand(sock, chatId, message) {
    try {
        const productImage = 'https://x.xcute.workers.dev/f/images/abe592862f20.jpg';

        const caption = 
`└─ ▢ 💎 *BUY BOT SCRIPT*

└─ ▢ ─*PRODUCT* ─
└─ ▢ Name    : BigStack
└─ ▢ Brand   : By bigmanj tech
└─ ▢ Price   : Tsh 45.000
└─ ▢ Sale    : Tsh 35.000 🎉

└─ ▢ ─ *FEATURES* ─
└─ ▢ ✅ Simple & Clean UI
└─ ▢ ✅ Interactive Buttons
└─ ▢ ✅ Fast Response
└─ ▢ ✅ No Encryption
└─ ▢ ✅ Easy to Customize
└─ ▢ ✅ Free API Key`;

        await sendButtons(sock, chatId, {
            title: '💎 BUY BOT SCRIPT',
            text: caption,
            footer: FOOTER,
            image: { url: productImage },
            buttons: [
                { id: '.buynow', text: '💰 Buy Now' },
                { id: '.contactowner', text: '📲 Contact Owner' }
            ]
        }, { quoted: message });

    } catch (error) {
        console.error('Buy command error:', error);
        const errMsg = 
`└─ ▢ ❌ *ERROR*

└─ ▢ Failed to load product info.
└─ ▢ Contact owner directly: [Click Here](https://wa.me/${OWNER_NUMBER})

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
    }
}

// ─── COMMAND: .buynow ──────────────────────────────────────────
async function buyNowCommand(sock, chatId, message) {
    const senderName = message.pushName || 'Customer';
    const senderNumber = (message.key.participant || message.key.remoteJid).split('@')[0];

    const msg = 
`└─ ▢ 💰 *PURCHASE REQUEST*

└─ ▢ ─ *INSTRUCTIONS* ─
└─ ▢ To purchase *BigStack* script:

📌 *Send payment of Tsh 35,000 to:*
└─ ▢ HALOTEL: ${PAYMENT_NUMBER}
└─ ▢ Name: ${PAYMENT_NAME}
└─ ▢ Network: ${PAYMENT_NETWORK}

📌 After payment, send screenshot to:
└─ ▢ [Click Here](https://wa.me/${OWNER_NUMBER})

📌 You will receive the script within 10 minutes.

👤 *Your Details:*
└─ ▢ Name: ${senderName}
└─ ▢ Number: ${senderNumber}

${FOOTER}`;
    await sock.sendMessage(chatId, { text: msg }, { quoted: message });
}

// ─── COMMAND: .contactowner ────────────────────────────────────
async function contactOwnerCommand(sock, chatId, message) {
    const senderName = message.pushName || 'Customer';
    const senderNumber = (message.key.participant || message.key.remoteJid).split('@')[0];

    const botInfo = 
`└─ ▢ 🤖 *BIGSTACK BOT INFO*

└─ ▢ ─ *ABOUT* ─
└─ ▢ Name      : BigStack Bot
└─ ▢ Version   : 3.0.0
└─ ▢ Owner     : bigmanj tech

└─ ▢ ─ *FEATURES* ─
└─ ▢ ✅ AI Chatbot (GPT)
└─ ▢ ✅ Media Downloader (IG, FB, TT, YT)
└─ ▢ ✅ Group Management
└─ ▢ ✅ Auto-Status & Auto-Read
└─ ▢ ✅ Security System (Antilink, Antitag)
└─ ▢ ✅ 210+ Commands
└─ ▢ ✅ 24/7 Uptime

└─ ▢ ─ *PRICE* ─
└─ ▢ Full Script: Tsh 35,000 (was 45,000)

📌 *Contact me directly:* [Click Here](https://wa.me/${OWNER_NUMBER})

${FOOTER}`;

    await sock.sendMessage(chatId, { text: botInfo }, { quoted: message });
}

// ─── BUTTON HANDLERS (zinaita commands) ──────────────────────
async function handleBuyNow(sock, chatId, message) {
    await buyNowCommand(sock, chatId, message);
}

async function handleContactOwner(sock, chatId, message) {
    await contactOwnerCommand(sock, chatId, message);
}

// ─── EXPORTS ──────────────────────────────────────────────────
module.exports = {
    buyCommand,
    buyNowCommand,
    contactOwnerCommand,
    buttonHandlers: {
        'buynow': handleBuyNow,
        'contactowner': handleContactOwner
    }
};