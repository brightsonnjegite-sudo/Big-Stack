// commands/menu-owner.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuOwner(sock, chatId, message) {
    const text = `
└── ▢ 👑 *OWNER COMMANDS*

└─ ▢ ─ *SYSTEM* ─
└─ ▢ .mode         - Bot mode (public/private)
└─ ▢ .update       - Update bot
└─ ▢ .checkupdates - Check updates
└─ ▢ .clearsession - Clear session
└─ ▢ .cleartmp     - Clear temp files
└─ ▢ .setpp        - Set profile pic

└─ ▢ ─ *AUTO FEATURES* ─
└─ ▢ .autostatus   - Auto-status
└─ ▢ .autoread     - Auto-read
└─ ▢ .autotyping   - Auto-typing
└─ ▢ .autoreact    - Auto-reaction

└─ ▢ ─ *OTHER* ─
└─ ▢ .sudo         - Manage sudo users
└─ ▢ .newgroup     - Create group
└─ ▢ .mickey       - Mickey special

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuOwner;
