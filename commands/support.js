// commands/support.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function supportCommand(sock, chatId, message) {
    try {
        const msg = 
`└── ▢ 👥 *TEAM SUPPORT*

└── ▢ ──── *AVAILABLE SUPPORT* ────
└── ▢ Status  : ✅ Available 24/7
└── ▢ Channel : BigStack Support

└── ▢ ──── *JOIN OUR COMMUNITY* ────
🔗 https://chat.whatsapp.com/GA4WrOFythU6g3BFVubYM7

└── ▢ ──── *CONTACT OWNER* ────
📱 wa.me/255777580820

${FOOTER}`;

        await sock.sendMessage(chatId, { text: msg }, { quoted: message });

    } catch (error) {
        console.error('Support command error:', error);
        const errMsg = 
`└── ▢ ❌ *ERROR*

└── ▢ Failed to load support info.
└── ▢ Contact owner: wa.me/255777580820

${FOOTER}`;
        await sock.sendMessage(chatId, { text: errMsg }, { quoted: message });
    }
}

module.exports = supportCommand;
