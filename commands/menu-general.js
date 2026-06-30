// commands/menu-general.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuGeneral(sock, chatId, message) {
    const text = `
└── ▢ 📋 *GENERAL COMMANDS*

└── ▢ ──── *INFO & UTILITIES* ────
└── ▢ .menu      - Show main menu
└── ▢ .ping      - Check bot latency
└── ▢ .alive     - Bot status
└── ▢ .owner     - Contact owner
└── ▢ .settings  - Bot settings
└── ▢ .stats     - System statistics
└── ▢ .repo      - Repository info
└── ▢ .jid       - Group JID

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuGeneral;
