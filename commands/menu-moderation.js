// commands/menu-moderation.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuModeration(sock, chatId, message) {
    const text = `
└── ▢ 🛡️ *MODERATION & SECURITY*

└── ▢ ──── *BANS & WARNINGS* ────
└── ▢ .ban        - Ban user
└── ▢ .unban      - Unban user
└── ▢ .warn       - Warn user
└── ▢ .warnings   - Check warnings
└── ▢ .delete     - Delete messages
└── ▢ .clear      - Clear chat

└── ▢ ──── *PROTECTION* ────
└── ▢ .antilink   - Anti-link system
└── ▢ .antitag    - Anti-tag system
└── ▢ .antibadword - Anti-badword system
└── ▢ .antidelete - Anti-delete system
└── ▢ .pmblocker  - PM blocker
└── ▢ .anticall   - Anti-call system
└── ▢ .pin        - PIN security

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuModeration;
