// commands/menu-all.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuAll(sock, chatId, message) {
    const text = `
└─ ▢ 📚 *ALL COMMANDS*

└─ ▢ ─ *GENERAL* ─
└─ ▢ .menu .ping .alive .owner .settings .stats .repo .jid

└─ ▢ ─ *GROUP MANAGEMENT* ─
└─ ▢ .add .kick .promote .demote .mute .unmute .tagall .tagnotadmin
└─ ▢ .hidetag .tag .staff .resetlink .setgdesc .setgname .setgpp
└─ ▢ .gpstatus .topmembers

└─ ▢ ─*MODERATION* ─
└─ ▢ .ban .unban .warn .warnings .delete .clear .antilink .antitag
└─ ▢ .antibadword .antidelete .pmblocker .anticall .pin

└─ ▢ ─ *MEDIA DOWNLOAD* ─
└─ ▢ .play .video .instagram .facebook .tiktok .shazam .tourl
└─ ▢ .getlink .gdrive .imagine .blur .stickeralt .sticker .emojimix .take

└─ ▢ ─ *AI & UTILITIES* ─
└─ ▢ .gpt .aivoice .translate .lyrics .weather .report .character
└─ ▢ .waste .compliment .tts .autobio .crop .metallic .ice .snow
└─ ▢ .glitch .fire .hacker .neon .devil .purple .thunder .leaves

└─ ▢ ─ *OWNER* ─
└─ ▢ .mode .autostatus .autoread .autotyping .autoreact .clearsession
└─ ▢ .cleartmp .setpp .sudo .update .checkupdates .newgroup .mickey

└─ ▢ ─ *OTHER* ─
└─ ▢ .bigmanj .halotel .report

📌 *Total: 78+ commands*

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuAll;
