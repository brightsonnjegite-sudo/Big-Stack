// commands/menu-media.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuMedia(sock, chatId, message) {
    const text = `
└── ▢ 📥 *MEDIA DOWNLOAD*

└─ ▢ ─ *SOCIAL MEDIA* ─
└─▢ .instagram   - Download IG
└─ ▢ .facebook    - Download FB
└─ ▢ .tiktok      - Download TikTok
└─ ▢ .shazam      - Identify song

└─ ▢ ─ *YOUTUBE* ─
└─ ▢ .play        - Download audio
└─ ▢ .video       - Download video

└─ ▢ ─ *UTILITIES* ─
└─ ▢ .tourl       - Upload to Catbox
└─ ▢ .getlink     - Get group link
└─ ▢ .gdrive      - Google Drive
└─ ▢ .imagine     - Generate image (AI)
└─ ▢ .blur        - Blur image
└─ ▢ .stickeralt  - Alternative sticker
└─ ▢ .sticker     - Make sticker
└─ ▢ .emojimix    - Mix emojis
└─ ▢ .take        - Take media

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuMedia;
