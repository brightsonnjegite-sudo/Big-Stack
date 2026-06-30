// commands/menu-group.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuGroup(sock, chatId, message) {
    const text = `
└── ▢ 👥 *GROUP MANAGEMENT*

└── ▢ ──── *MEMBERS* ────
└── ▢ .add        - Add member
└── ▢ .kick       - Remove member
└── ▢ .promote    - Make admin
└── ▢ .demote     - Remove admin
└── ▢ .tagall     - Mention all
└── ▢ .tagnotadmin - Mention non-admins
└── ▢ .hidetag    - Hidden tag
└── ▢ .tag        - Tag a user
└── ▢ .antilink   - safety

└── ▢ ──── *GROUP SETTINGS* ────
└── ▢ .staff      - List admins
└── ▢ .resetlink  - Reset invite link
└── ▢ .setgdesc   - Set group description
└── ▢ .setgname   - Set group name
└── ▢ .setgpp     - Set group photo
└── ▢ .gpstatus   - Group status
└── ▢ .topmembers - Top active members

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuGroup;
