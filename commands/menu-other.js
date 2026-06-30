// commands/menu-other.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuOther(sock, chatId, message) {
    const text = `
└─ ▢ ⚙️ *OTHER COMMANDS*

└─ ▢ ─ *CHATBOT* ─
└─ ▢ .bigmanj on/off - Toggle chatbot

└─ ▢ ─ *SERVICES* ─
└─ ▢ .halotel     - Halotel services

└─ ▢ ─ *REPORTS* ─
└─ ▢ .report      - Report user

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuOther;
