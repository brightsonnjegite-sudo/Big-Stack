// commands/buy.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function buyCommand(sock, chatId, message) {
    try {
        const productImage = 'https://x.xcute.workers.dev/f/images/abe592862f20.jpg';

        const msg = 
`└── ▢ 💎 *BUY BOT SCRIPT*

└── ▢ ──── *PRODUCT* ────
└── ▢ Name    : SC Zero-Tr4sh
└── ▢ Brand   : By Ghost King
└── ▢ Price   : Tsh 45.000
└── ▢ Sale    : Tsh 35.000 🎉

└── ▢ ──── *FEATURES* ────
└── ▢ ✅ Simple & Clean UI
└── ▢ ✅ Interactive Buttons
└── ▢ ✅ Fast Response
└── ▢ ✅ No Encryption
└── ▢ ✅ Easy to Customize
└── ▢ ✅ Free API Key

📌 *Contact the owner to purchase:*
🔗 https://wa.me/255719632816

${FOOTER}`;

        // Send product image with caption
        await sock.sendMessage(chatId, {
            image: { url: productImage },
            caption: msg
        }, { quoted: message });

    } catch (error) {
        console.error('Buy command error:', error);
        const errMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ Failed to load product info.
└── ▢ Contact owner directly: wa.me/255719632816

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
    }
}

module.exports = buyCommand;
