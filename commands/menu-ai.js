// commands/menu-ai.js
const FOOTER = '© bigmanj tech ™ with ♥︎';

async function menuAI(sock, chatId, message) {
    const text = `
└── ▢ 🧠 *AI & UTILITIES*

└─ ▢ ─ *AI COMMANDS* ─
└─ ▢ .gpt         - AI Chat
└─ ▢ .aivoice     - Voice AI
└─ ▢ .translate   - Translate text
└─ ▢ .lyrics      - Song lyrics
└─ ▢ .weather     - Weather forecast
└─ ▢ .imagine     - AI Image generation

└─ ▢ ─ *FUN* ─
└─ ▢ .character   - Character analysis
└─ ▢ .waste       - Wasted effect
└─ ▢ .compliment  - Compliment user
└─ ▢ .tts         - Text to speech

└─ ▢ ─ *EFFECTS* ─
└─ ▢ .crop        - Crop sticker
└─ ▢ .metallic    - Text effect
└─ ▢ .ice         - Text effect
└─ ▢ .snow        - Text effect
└─ ▢ .glitch      - Text effect
└─ ▢ .fire        - Text effect
└─ ▢ And more text effects...

${FOOTER}`;

    await sock.sendMessage(chatId, { text }, { quoted: message });
}

module.exports = menuAI;
